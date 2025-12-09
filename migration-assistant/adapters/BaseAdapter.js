/**
 * BaseAdapter - Abstract base class for all hosting provider adapters
 * All provider-specific adapters must extend this class and implement all methods
 */

class BaseAdapter {
  constructor(credentials, providerConfig) {
    if (this.constructor === BaseAdapter) {
      throw new Error('BaseAdapter is an abstract class and cannot be instantiated directly');
    }
    this.credentials = credentials;
    this.providerConfig = providerConfig;
    this.isConnected = false;
  }

  // ========== Connection & Authentication ==========

  /**
   * Test connection to the hosting provider
   * @returns {Promise<{success: boolean, message: string, serverInfo?: object}>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Authenticate with the hosting provider
   * @param {object} credentials - Provider-specific credentials
   * @returns {Promise<{success: boolean, message: string, token?: string}>}
   */
  async authenticate(credentials) {
    throw new Error('authenticate() must be implemented by subclass');
  }

  // ========== Site Management ==========

  /**
   * List all sites/domains in the hosting account
   * @returns {Promise<Array<{domain: string, type: string, size: number, emailCount: number, isGit: boolean}>>}
   */
  async listSites() {
    throw new Error('listSites() must be implemented by subclass');
  }

  /**
   * Get detailed information about a specific site
   * @param {string} siteName - Domain or subdomain name
   * @returns {Promise<object>} Site details including paths, databases, etc.
   */
  async getSiteDetails(siteName) {
    throw new Error('getSiteDetails() must be implemented by subclass');
  }

  /**
   * Create a new domain or subdomain
   * @param {string} domainName - Domain name to create
   * @param {object} settings - Domain settings (document root, PHP version, etc.)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async createDomain(domainName, settings = {}) {
    throw new Error('createDomain() must be implemented by subclass');
  }

  /**
   * Delete a domain or subdomain
   * @param {string} domainName - Domain name to delete
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteDomain(domainName) {
    throw new Error('deleteDomain() must be implemented by subclass');
  }

  // ========== File Operations ==========

  /**
   * Download all files from a site
   * @param {string} siteName - Site domain name
   * @param {string} destination - Local destination path
   * @param {function} progressCallback - Callback for progress updates
   * @returns {Promise<{success: boolean, path: string, size: number}>}
   */
  async downloadFiles(siteName, destination, progressCallback = null) {
    throw new Error('downloadFiles() must be implemented by subclass');
  }

  /**
   * Upload files to a site
   * @param {string} source - Local source path
   * @param {string} destination - Remote destination path
   * @param {function} progressCallback - Callback for progress updates
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async uploadFiles(source, destination, progressCallback = null) {
    throw new Error('uploadFiles() must be implemented by subclass');
  }

  /**
   * Get total size of a site's files
   * @param {string} siteName - Site domain name
   * @returns {Promise<number>} Size in bytes
   */
  async getFileSize(siteName) {
    throw new Error('getFileSize() must be implemented by subclass');
  }

  /**
   * Compress site files into a zip/tar.gz archive
   * @param {string} siteName - Site domain name
   * @returns {Promise<{success: boolean, archivePath: string}>}
   */
  async compressFiles(siteName) {
    throw new Error('compressFiles() must be implemented by subclass');
  }

  // ========== Database Operations ==========

  /**
   * List all databases for a site
   * @param {string} siteName - Site domain name
   * @returns {Promise<Array<{name: string, size: number, tables: number}>>}
   */
  async listDatabases(siteName) {
    throw new Error('listDatabases() must be implemented by subclass');
  }

  /**
   * Export a database to SQL file
   * @param {string} siteName - Site domain name
   * @param {string} dbName - Database name
   * @returns {Promise<{success: boolean, sqlFile: string}>}
   */
  async exportDatabase(siteName, dbName) {
    throw new Error('exportDatabase() must be implemented by subclass');
  }

  /**
   * Import a database from SQL file
   * @param {string} databaseFile - Path to SQL file
   * @param {string} dbName - Target database name
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async importDatabase(databaseFile, dbName) {
    throw new Error('importDatabase() must be implemented by subclass');
  }

  /**
   * Create a new database with user
   * @param {string} dbName - Database name
   * @param {string} dbUser - Database username
   * @param {string} dbPassword - Database password
   * @returns {Promise<{success: boolean, message: string, dbDetails: object}>}
   */
  async createDatabase(dbName, dbUser, dbPassword) {
    throw new Error('createDatabase() must be implemented by subclass');
  }

  // ========== Email Operations ==========

  /**
   * List all email accounts for a domain
   * @param {string} domain - Domain name
   * @returns {Promise<Array<{email: string, quota: number, used: number}>>}
   */
  async listEmails(domain) {
    throw new Error('listEmails() must be implemented by subclass');
  }

  /**
   * Create a new email account
   * @param {string} email - Full email address
   * @param {string} password - Email password
   * @param {number} quota - Quota in MB (0 = unlimited)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async createEmail(email, password, quota = 0) {
    throw new Error('createEmail() must be implemented by subclass');
  }

  /**
   * Delete an email account
   * @param {string} email - Full email address
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteEmail(email) {
    throw new Error('deleteEmail() must be implemented by subclass');
  }

  /**
   * Get email quota for a domain
   * @param {string} domain - Domain name
   * @returns {Promise<{total: number, used: number, available: number}>}
   */
  async getEmailQuota(domain) {
    throw new Error('getEmailQuota() must be implemented by subclass');
  }

  // ========== Server Information ==========

  /**
   * Get server IP address
   * @returns {Promise<string>} IP address
   */
  async getServerIP() {
    throw new Error('getServerIP() must be implemented by subclass');
  }

  /**
   * Get general server information
   * @returns {Promise<object>} Server details (OS, PHP version, MySQL version, etc.)
   */
  async getServerInfo() {
    throw new Error('getServerInfo() must be implemented by subclass');
  }

  /**
   * Get PHP version for a specific site
   * @param {string} siteName - Site domain name
   * @returns {Promise<string>} PHP version (e.g., "8.1")
   */
  async getPHPVersion(siteName) {
    throw new Error('getPHPVersion() must be implemented by subclass');
  }

  /**
   * Set PHP version for a specific site
   * @param {string} siteName - Site domain name
   * @param {string} version - PHP version to set (e.g., "8.1")
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async setPHPVersion(siteName, version) {
    throw new Error('setPHPVersion() must be implemented by subclass');
  }

  // ========== Utilities ==========

  /**
   * Detect CMS type for a site (WordPress, Joomla, Drupal, etc.)
   * @param {string} siteName - Site domain name
   * @returns {Promise<{cms: string, version: string|null}>}
   */
  async detectCMS(siteName) {
    throw new Error('detectCMS() must be implemented by subclass');
  }

  /**
   * Check if a site is Git-based
   * @param {string} siteName - Site domain name
   * @returns {Promise<boolean>}
   */
  async checkGitStatus(siteName) {
    throw new Error('checkGitStatus() must be implemented by subclass');
  }

  /**
   * Get provider-specific information
   * @returns {object} Provider name, category, features, etc.
   */
  getProviderInfo() {
    return this.providerConfig;
  }

  /**
   * Get provider-specific limits
   * @returns {object} Email limits, database limits, etc.
   */
  async getProviderLimits() {
    throw new Error('getProviderLimits() must be implemented by subclass');
  }

  // ========== Helper Methods ==========

  /**
   * Format bytes to human-readable size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size (e.g., "1.5 GB")
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Sleep for specified milliseconds (for rate limiting)
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   * @param {function} fn - Function to retry
   * @param {number} maxAttempts - Maximum retry attempts
   * @param {number} initialDelay - Initial delay in ms
   * @returns {Promise<any>} Function result
   */
  async retryWithBackoff(fn, maxAttempts = 3, initialDelay = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    throw lastError;
  }
}

module.exports = BaseAdapter;
