/**
 * HostingerAdapter - Adapter for Hostinger's hPanel API
 *
 * Hostinger uses a custom hPanel control panel with its own API.
 * API Documentation: https://developers.hostinger.com
 */

const BaseAdapter = require('./BaseAdapter');
const axios = require('axios');
const https = require('https');

class HostingerAdapter extends BaseAdapter {
  constructor(credentials, providerConfig) {
    super(credentials, providerConfig);

    this.apiKey = credentials.apiKey;
    this.baseUrl = 'https://api.hostinger.com/v1';

    // Create axios instance with Hostinger API configuration
    this.axios = axios.create({
      baseURL: this.baseUrl,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Test connection to Hostinger API
   * @returns {Promise<{success: boolean, message: string, data?: object}>}
   */
  async testConnection() {
    try {
      // Try to get account/user information
      // Common Hostinger API endpoints: /user, /account, /websites
      const response = await this.axios.get('/user');

      return {
        success: true,
        message: 'Successfully connected to Hostinger!',
        data: {
          user: response.data
        }
      };
    } catch (error) {
      // If /user endpoint doesn't work, try alternative endpoints
      if (error.response?.status === 404) {
        try {
          // Try /websites endpoint as alternative
          const response = await this.axios.get('/websites');
          return {
            success: true,
            message: 'Successfully connected to Hostinger!',
            data: {
              websites: response.data
            }
          };
        } catch (altError) {
          return this.handleConnectionError(altError);
        }
      }

      return this.handleConnectionError(error);
    }
  }

  /**
   * Handle connection errors with meaningful messages
   * @private
   */
  handleConnectionError(error) {
    if (error.response) {
      // API responded with error
      const status = error.response.status;
      const message = error.response.data?.message || error.response.data?.error;

      if (status === 401 || status === 403) {
        return {
          success: false,
          message: 'Authentication failed. Please check your Hostinger API key is correct and has proper permissions.'
        };
      } else if (status === 404) {
        return {
          success: false,
          message: 'Hostinger API endpoint not found. The API structure may have changed. Please contact support.'
        };
      } else {
        return {
          success: false,
          message: `Hostinger API error (${status}): ${message || 'Unknown error'}`
        };
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        success: false,
        message: 'Cannot reach Hostinger API servers. Please check your internet connection.'
      };
    } else if (error.code === 'ETIMEDOUT') {
      return {
        success: false,
        message: 'Connection to Hostinger API timed out. Please try again.'
      };
    } else {
      return {
        success: false,
        message: `Connection error: ${error.message || 'Unknown error occurred'}`
      };
    }
  }

  async authenticate(credentials) {
    return await this.testConnection();
  }

  async listSites() {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async getSiteDetails(siteName) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async createDomain(domainName, settings = {}) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async deleteDomain(domainName) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async downloadFiles(siteName, destination, progressCallback = null) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async uploadFiles(source, destination, progressCallback = null) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async getFileSize(siteName) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async compressFiles(siteName) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async listDatabases(siteName) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async exportDatabase(siteName, dbName) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async importDatabase(databaseFile, dbName) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async createDatabase(dbName, dbUser, dbPassword) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async listEmails(domain) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async createEmail(email, password, quota = 0) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async deleteEmail(email) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async getEmailQuota(domain) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async getServerIP() {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async getServerInfo() {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async getPHPVersion(siteName) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async setPHPVersion(siteName, version) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async detectCMS(siteName) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async checkGitStatus(siteName) {
    throw new Error('Hostinger adapter not yet implemented');
  }

  async getProviderLimits() {
    throw new Error('Hostinger adapter not yet implemented');
  }
}

module.exports = HostingerAdapter;
