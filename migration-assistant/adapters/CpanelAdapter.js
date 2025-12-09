/**
 * CpanelAdapter - Adapter for cPanel-based hosting providers
 * Supports: Hostinger, Bluehost, SiteGround, GoDaddy, HostGator, Namecheap, A2, InMotion, etc.
 * Uses cPanel UAPI (Universal API) and API2 for legacy support
 */

const BaseAdapter = require('./BaseAdapter');
const axios = require('axios');
const https = require('https');
const path = require('path');
const fs = require('fs').promises;

class CpanelAdapter extends BaseAdapter {
  constructor(credentials, providerConfig) {
    super(credentials, providerConfig);

    // Build the base URL for API requests
    this.baseUrl = credentials.serverUrl
      ? credentials.serverUrl.replace(/\/$/, '')
      : `https://${credentials.domain || 'localhost'}:${providerConfig.defaultPort || 2083}`;

    this.username = credentials.username;
    this.apiToken = credentials.apiToken || credentials.apiKey;

    // Create axios instance with custom config
    this.axios = axios.create({
      baseURL: this.baseUrl,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Accept self-signed SSL certificates (common in hosting)
      }),
      headers: {
        'Authorization': `cpanel ${this.username}:${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 seconds timeout
    });
  }

  // ========== Connection & Authentication ==========

  async testConnection() {
    try {
      // Test connection with a simple API call
      const response = await this.axios.get('/execute/Variables/get_user_information');

      if (response.data && response.data.data) {
        this.isConnected = true;
        return {
          success: true,
          message: 'Successfully connected to cPanel',
          serverInfo: {
            username: response.data.data.user,
            email: response.data.data.email,
            homedir: response.data.data.homedir,
            diskUsed: response.data.data.diskused,
            diskLimit: response.data.data.disklimit
          }
        };
      }

      throw new Error('Invalid response from cPanel API');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  async authenticate(credentials) {
    this.credentials = credentials;
    return await this.testConnection();
  }

  // ========== Site Management ==========

  async listSites() {
    try {
      // Get all domains (main, addon, subdomains, parked)
      const [domainsResponse, diskUsageResponse] = await Promise.all([
        this.axios.get('/execute/DomainInfo/list_domains'),
        this.axios.get('/execute/Quota/get_quota_info')
      ]);

      if (!domainsResponse.data || !domainsResponse.data.data) {
        throw new Error('Failed to fetch domains list');
      }

      const domains = domainsResponse.data.data;
      const sites = [];

      // Process each domain type
      for (const domain of domains.main_domain ? [domains.main_domain] : []) {
        const siteInfo = await this._getSiteInfo(domain.domain, 'Main Domain');
        sites.push(siteInfo);
      }

      for (const domain of domains.addon_domains || []) {
        const siteInfo = await this._getSiteInfo(domain.domain, 'Addon Domain');
        sites.push(siteInfo);
      }

      for (const domain of domains.sub_domains || []) {
        const siteInfo = await this._getSiteInfo(domain.domain, 'Subdomain');
        sites.push(siteInfo);
      }

      return sites;
    } catch (error) {
      throw new Error(`Failed to list sites: ${this._formatError(error)}`);
    }
  }

  async _getSiteInfo(domainName, domainType) {
    try {
      // Get CMS detection, size, and email count in parallel
      const [cms, size, emailCount, isGit] = await Promise.all([
        this.detectCMS(domainName).catch(() => ({ cms: 'Unknown', version: null })),
        this.getFileSize(domainName).catch(() => 0),
        this._getEmailCount(domainName).catch(() => 0),
        this.checkGitStatus(domainName).catch(() => false)
      ]);

      return {
        domain: domainName,
        type: cms.cms !== 'Unknown' ? cms.cms : 'Custom Site',
        cmsVersion: cms.version,
        size: size,
        sizeFormatted: this.formatBytes(size),
        emailCount: emailCount,
        isGit: isGit,
        domainType: domainType,
        provider: this.providerConfig.name
      };
    } catch (error) {
      return {
        domain: domainName,
        type: 'Unknown',
        cmsVersion: null,
        size: 0,
        sizeFormatted: '0 Bytes',
        emailCount: 0,
        isGit: false,
        domainType: domainType,
        provider: this.providerConfig.name,
        error: this._formatError(error)
      };
    }
  }

  async _getEmailCount(domain) {
    try {
      const response = await this.axios.get('/execute/Email/list_pops', {
        params: { domain: domain }
      });

      return response.data && response.data.data ? response.data.data.length : 0;
    } catch (error) {
      return 0;
    }
  }

  async getSiteDetails(siteName) {
    try {
      const [domainInfo, databases, phpVersion] = await Promise.all([
        this.axios.get('/execute/DomainInfo/single_domain_data', {
          params: { domain: siteName }
        }),
        this.listDatabases(siteName).catch(() => []),
        this.getPHPVersion(siteName).catch(() => 'Unknown')
      ]);

      return {
        domain: siteName,
        documentRoot: domainInfo.data?.data?.documentroot,
        homeDir: domainInfo.data?.data?.homedir,
        phpVersion: phpVersion,
        databases: databases,
        serverIP: await this.getServerIP().catch(() => 'Unknown')
      };
    } catch (error) {
      throw new Error(`Failed to get site details: ${this._formatError(error)}`);
    }
  }

  async createDomain(domainName, settings = {}) {
    try {
      const params = {
        domain: domainName,
        subdomain: settings.subdomain || domainName,
        dir: settings.documentRoot || `/public_html/${domainName}`
      };

      const response = await this.axios.post('/execute/DomainInfo/add_domain', null, { params });

      if (response.data && response.data.status === 1) {
        return {
          success: true,
          message: `Domain ${domainName} created successfully`
        };
      }

      throw new Error(response.data?.errors?.[0] || 'Failed to create domain');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  async deleteDomain(domainName) {
    try {
      const response = await this.axios.post('/execute/DomainInfo/remove_domain', null, {
        params: { domain: domainName }
      });

      if (response.data && response.data.status === 1) {
        return {
          success: true,
          message: `Domain ${domainName} deleted successfully`
        };
      }

      throw new Error(response.data?.errors?.[0] || 'Failed to delete domain');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  // ========== File Operations ==========

  async downloadFiles(siteName, destination, progressCallback = null) {
    try {
      // First, compress the site files on the server
      const archiveResult = await this.compressFiles(siteName);

      if (!archiveResult.success) {
        throw new Error('Failed to compress files on server');
      }

      // Download the compressed file
      const response = await this.axios.get('/execute/Fileman/download_file', {
        params: {
          file: archiveResult.archivePath
        },
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
          if (progressCallback && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            progressCallback({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: percentage
            });
          }
        }
      });

      // Save to destination
      const fileName = path.basename(archiveResult.archivePath);
      const localPath = path.join(destination, fileName);

      await fs.mkdir(destination, { recursive: true });
      const writer = require('fs').createWriteStream(localPath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          resolve({
            success: true,
            path: localPath,
            size: require('fs').statSync(localPath).size
          });
        });
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download files: ${this._formatError(error)}`);
    }
  }

  async uploadFiles(source, destination, progressCallback = null) {
    try {
      // Upload file using cPanel File Manager
      const formData = new FormData();
      formData.append('file', require('fs').createReadStream(source));
      formData.append('dir', destination);

      const response = await this.axios.post('/execute/Fileman/upload_files', formData, {
        headers: {
          ...formData.getHeaders()
        },
        onUploadProgress: (progressEvent) => {
          if (progressCallback && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            progressCallback({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: percentage
            });
          }
        }
      });

      if (response.data && response.data.status === 1) {
        return {
          success: true,
          message: 'Files uploaded successfully'
        };
      }

      throw new Error(response.data?.errors?.[0] || 'Failed to upload files');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  async getFileSize(siteName) {
    try {
      // Get domain document root
      const domainInfo = await this.axios.get('/execute/DomainInfo/single_domain_data', {
        params: { domain: siteName }
      });

      const documentRoot = domainInfo.data?.data?.documentroot;
      if (!documentRoot) {
        throw new Error('Could not determine document root');
      }

      // Get directory size
      const sizeResponse = await this.axios.get('/execute/Fileman/get_disk_usage', {
        params: { dir: documentRoot }
      });

      return parseInt(sizeResponse.data?.data?.size || 0);
    } catch (error) {
      return 0;
    }
  }

  async compressFiles(siteName) {
    try {
      // Get domain document root
      const domainInfo = await this.axios.get('/execute/DomainInfo/single_domain_data', {
        params: { domain: siteName }
      });

      const documentRoot = domainInfo.data?.data?.documentroot;
      if (!documentRoot) {
        throw new Error('Could not determine document root');
      }

      // Create archive name
      const archiveName = `${siteName.replace(/\./g, '_')}_backup_${Date.now()}.tar.gz`;
      const archivePath = `/home/${this.username}/${archiveName}`;

      // Compress using cPanel File Manager
      const response = await this.axios.post('/execute/Fileman/compress_files', null, {
        params: {
          dir: documentRoot,
          files: '.',
          archive: archivePath,
          type: 'tar.gz'
        }
      });

      if (response.data && response.data.status === 1) {
        return {
          success: true,
          archivePath: archivePath
        };
      }

      throw new Error(response.data?.errors?.[0] || 'Failed to compress files');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  // ========== Database Operations ==========

  async listDatabases(siteName) {
    try {
      const response = await this.axios.get('/execute/Mysql/list_databases');

      if (!response.data || !response.data.data) {
        return [];
      }

      const databases = [];
      for (const db of response.data.data) {
        const sizeResponse = await this.axios.get('/execute/Mysql/get_database_size', {
          params: { database: db }
        }).catch(() => null);

        databases.push({
          name: db,
          size: sizeResponse?.data?.data?.size || 0,
          sizeFormatted: this.formatBytes(sizeResponse?.data?.data?.size || 0),
          tables: 0 // Would need separate query to count tables
        });
      }

      return databases;
    } catch (error) {
      return [];
    }
  }

  async exportDatabase(siteName, dbName) {
    try {
      // Create database backup using cPanel
      const response = await this.axios.post('/execute/Mysql/dump_database', null, {
        params: {
          database: dbName
        }
      });

      if (response.data && response.data.data) {
        const sqlContent = response.data.data;
        const fileName = `${dbName}_${Date.now()}.sql`;

        return {
          success: true,
          sqlFile: fileName,
          sqlContent: sqlContent
        };
      }

      throw new Error('Failed to export database');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  async importDatabase(databaseFile, dbName) {
    try {
      // Read SQL file
      const sqlContent = await fs.readFile(databaseFile, 'utf8');

      // Import database using cPanel
      const response = await this.axios.post('/execute/Mysql/restore_database', {
        database: dbName,
        sql: sqlContent
      });

      if (response.data && response.data.status === 1) {
        return {
          success: true,
          message: `Database ${dbName} imported successfully`
        };
      }

      throw new Error(response.data?.errors?.[0] || 'Failed to import database');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  async createDatabase(dbName, dbUser, dbPassword) {
    try {
      // Create database
      const dbResponse = await this.axios.post('/execute/Mysql/create_database', null, {
        params: { name: dbName }
      });

      if (!dbResponse.data || dbResponse.data.status !== 1) {
        throw new Error(dbResponse.data?.errors?.[0] || 'Failed to create database');
      }

      // Create user
      const userResponse = await this.axios.post('/execute/Mysql/create_user', null, {
        params: {
          name: dbUser,
          password: dbPassword
        }
      });

      if (!userResponse.data || userResponse.data.status !== 1) {
        throw new Error(userResponse.data?.errors?.[0] || 'Failed to create database user');
      }

      // Grant privileges
      const grantResponse = await this.axios.post('/execute/Mysql/set_privileges_on_database', null, {
        params: {
          user: dbUser,
          database: dbName,
          privileges: 'ALL PRIVILEGES'
        }
      });

      if (grantResponse.data && grantResponse.data.status === 1) {
        return {
          success: true,
          message: `Database ${dbName} created successfully`,
          dbDetails: {
            database: dbName,
            user: dbUser,
            host: 'localhost'
          }
        };
      }

      throw new Error('Failed to grant database privileges');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  // ========== Email Operations ==========

  async listEmails(domain) {
    try {
      const response = await this.axios.get('/execute/Email/list_pops', {
        params: { domain: domain }
      });

      if (!response.data || !response.data.data) {
        return [];
      }

      return response.data.data.map(email => ({
        email: email.email,
        quota: parseInt(email.diskquota || 0),
        used: parseInt(email.diskused || 0),
        usedFormatted: this.formatBytes(parseInt(email.diskused || 0) * 1024 * 1024)
      }));
    } catch (error) {
      return [];
    }
  }

  async createEmail(email, password, quota = 0) {
    try {
      const [localPart, domain] = email.split('@');

      const response = await this.axios.post('/execute/Email/add_pop', null, {
        params: {
          email: localPart,
          domain: domain,
          password: password,
          quota: quota || 0
        }
      });

      if (response.data && response.data.status === 1) {
        return {
          success: true,
          message: `Email account ${email} created successfully`
        };
      }

      throw new Error(response.data?.errors?.[0] || 'Failed to create email account');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  async deleteEmail(email) {
    try {
      const [localPart, domain] = email.split('@');

      const response = await this.axios.post('/execute/Email/delete_pop', null, {
        params: {
          email: localPart,
          domain: domain
        }
      });

      if (response.data && response.data.status === 1) {
        return {
          success: true,
          message: `Email account ${email} deleted successfully`
        };
      }

      throw new Error(response.data?.errors?.[0] || 'Failed to delete email account');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  async getEmailQuota(domain) {
    try {
      const emails = await this.listEmails(domain);

      const total = emails.reduce((sum, email) => sum + email.quota, 0);
      const used = emails.reduce((sum, email) => sum + email.used, 0);

      return {
        total: total,
        used: used,
        available: total - used
      };
    } catch (error) {
      return { total: 0, used: 0, available: 0 };
    }
  }

  // ========== Server Information ==========

  async getServerIP() {
    try {
      const response = await this.axios.get('/execute/Variables/get_user_information');

      if (response.data && response.data.data && response.data.data.ip) {
        return response.data.data.ip;
      }

      // Fallback: try to get from domain info
      const domains = await this.axios.get('/execute/DomainInfo/list_domains');
      if (domains.data?.data?.main_domain?.ip) {
        return domains.data.data.main_domain.ip;
      }

      throw new Error('Could not determine server IP');
    } catch (error) {
      throw new Error(`Failed to get server IP: ${this._formatError(error)}`);
    }
  }

  async getServerInfo() {
    try {
      const [userInfo, phpInfo] = await Promise.all([
        this.axios.get('/execute/Variables/get_user_information'),
        this.axios.get('/execute/LangPHP/php_get_installed_versions').catch(() => null)
      ]);

      return {
        os: 'Linux', // cPanel runs on Linux
        phpVersions: phpInfo?.data?.data || [],
        mysqlVersion: 'Unknown', // Would need separate query
        diskUsed: userInfo.data?.data?.diskused,
        diskLimit: userInfo.data?.data?.disklimit,
        controlPanel: 'cPanel',
        provider: this.providerConfig.name
      };
    } catch (error) {
      return {
        os: 'Unknown',
        phpVersions: [],
        mysqlVersion: 'Unknown',
        controlPanel: 'cPanel',
        provider: this.providerConfig.name
      };
    }
  }

  async getPHPVersion(siteName) {
    try {
      const response = await this.axios.get('/execute/LangPHP/php_get_vhost_versions', {
        params: { vhost: siteName }
      });

      if (response.data && response.data.data && response.data.data[siteName]) {
        return response.data.data[siteName];
      }

      return 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  async setPHPVersion(siteName, version) {
    try {
      const response = await this.axios.post('/execute/LangPHP/php_set_vhost_versions', null, {
        params: {
          vhost: siteName,
          version: version
        }
      });

      if (response.data && response.data.status === 1) {
        return {
          success: true,
          message: `PHP version set to ${version} for ${siteName}`
        };
      }

      throw new Error(response.data?.errors?.[0] || 'Failed to set PHP version');
    } catch (error) {
      return {
        success: false,
        message: this._formatError(error)
      };
    }
  }

  // ========== Utilities ==========

  async detectCMS(siteName) {
    try {
      // Get document root
      const domainInfo = await this.axios.get('/execute/DomainInfo/single_domain_data', {
        params: { domain: siteName }
      });

      const documentRoot = domainInfo.data?.data?.documentroot;
      if (!documentRoot) {
        return { cms: 'Unknown', version: null };
      }

      // Check for WordPress
      const wpConfigExists = await this._fileExists(`${documentRoot}/wp-config.php`);
      if (wpConfigExists) {
        const version = await this._getWordPressVersion(documentRoot);
        return { cms: 'WordPress', version: version };
      }

      // Check for Joomla
      const joomlaConfigExists = await this._fileExists(`${documentRoot}/configuration.php`);
      if (joomlaConfigExists) {
        return { cms: 'Joomla', version: null };
      }

      // Check for Drupal
      const drupalExists = await this._fileExists(`${documentRoot}/sites/default/settings.php`);
      if (drupalExists) {
        return { cms: 'Drupal', version: null };
      }

      // Check for Magento
      const magentoExists = await this._fileExists(`${documentRoot}/app/etc/env.php`);
      if (magentoExists) {
        return { cms: 'Magento', version: null };
      }

      return { cms: 'Custom Site', version: null };
    } catch (error) {
      return { cms: 'Unknown', version: null };
    }
  }

  async _fileExists(filePath) {
    try {
      const response = await this.axios.get('/execute/Fileman/stat_files', {
        params: { file: filePath }
      });

      return response.data && response.data.status === 1;
    } catch (error) {
      return false;
    }
  }

  async _getWordPressVersion(documentRoot) {
    try {
      const response = await this.axios.get('/execute/Fileman/get_file_content', {
        params: { file: `${documentRoot}/wp-includes/version.php` }
      });

      if (response.data && response.data.data && response.data.data.content) {
        const match = response.data.data.content.match(/\$wp_version\s*=\s*'([^']+)'/);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async checkGitStatus(siteName) {
    try {
      // Get document root
      const domainInfo = await this.axios.get('/execute/DomainInfo/single_domain_data', {
        params: { domain: siteName }
      });

      const documentRoot = domainInfo.data?.data?.documentroot;
      if (!documentRoot) {
        return false;
      }

      // Check if .git directory exists
      return await this._fileExists(`${documentRoot}/.git`);
    } catch (error) {
      return false;
    }
  }

  async getProviderLimits() {
    try {
      const limits = require('../config/limits.json');
      const providerLimits = limits.providerLimits[this.providerConfig.id] || {};

      return {
        maxEmailAccounts: providerLimits.maxEmailAccounts || 'unlimited',
        maxDatabases: providerLimits.maxDatabases || 'unlimited',
        maxSubdomains: providerLimits.maxSubdomains || 'unlimited',
        diskSpace: providerLimits.diskSpace || 'varies by plan'
      };
    } catch (error) {
      return {
        maxEmailAccounts: 'unknown',
        maxDatabases: 'unknown',
        maxSubdomains: 'unknown',
        diskSpace: 'unknown'
      };
    }
  }

  // ========== Helper Methods ==========

  _formatError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.data && error.response.data.errors) {
        return error.response.data.errors.join(', ');
      }
      if (error.response.data && error.response.data.message) {
        return error.response.data.message;
      }
      return `HTTP ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      return 'No response from server. Please check your connection and server URL.';
    } else {
      // Something happened in setting up the request that triggered an Error
      return error.message || 'Unknown error occurred';
    }
  }
}

module.exports = CpanelAdapter;
