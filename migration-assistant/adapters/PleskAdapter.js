/**
 * PleskAdapter - Adapter for Plesk-based hosting providers
 * TO BE IMPLEMENTED IN PHASE 8
 */

const BaseAdapter = require('./BaseAdapter');

class PleskAdapter extends BaseAdapter {
  constructor(credentials, providerConfig) {
    super(credentials, providerConfig);

    this.baseUrl = credentials.serverUrl.replace(/\/$/, '');
    this.apiKey = credentials.apiKey;
  }

  async testConnection() {
    return {
      success: false,
      message: 'Plesk adapter is not yet implemented. Coming in Phase 8!'
    };
  }

  async authenticate(credentials) {
    return await this.testConnection();
  }

  async listSites() {
    throw new Error('Plesk adapter not yet implemented');
  }

  async getSiteDetails(siteName) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async createDomain(domainName, settings = {}) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async deleteDomain(domainName) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async downloadFiles(siteName, destination, progressCallback = null) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async uploadFiles(source, destination, progressCallback = null) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async getFileSize(siteName) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async compressFiles(siteName) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async listDatabases(siteName) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async exportDatabase(siteName, dbName) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async importDatabase(databaseFile, dbName) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async createDatabase(dbName, dbUser, dbPassword) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async listEmails(domain) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async createEmail(email, password, quota = 0) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async deleteEmail(email) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async getEmailQuota(domain) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async getServerIP() {
    throw new Error('Plesk adapter not yet implemented');
  }

  async getServerInfo() {
    throw new Error('Plesk adapter not yet implemented');
  }

  async getPHPVersion(siteName) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async setPHPVersion(siteName, version) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async detectCMS(siteName) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async checkGitStatus(siteName) {
    throw new Error('Plesk adapter not yet implemented');
  }

  async getProviderLimits() {
    throw new Error('Plesk adapter not yet implemented');
  }
}

module.exports = PleskAdapter;
