/**
 * ProviderFactory - Creates appropriate adapter based on provider selection
 * Maps provider names to adapter classes
 */

const CpanelAdapter = require('./CpanelAdapter');
const PleskAdapter = require('./PleskAdapter');
const CloudwaysAdapter = require('./CloudwaysAdapter');
const DirectAdminAdapter = require('./DirectAdminAdapter');
const HostingerAdapter = require('./HostingerAdapter');

class ProviderFactory {
  /**
   * Create an adapter instance for a specific provider
   * @param {string} providerId - Provider ID from providers.json
   * @param {object} credentials - Provider-specific credentials
   * @param {object} providerConfig - Provider configuration from providers.json
   * @returns {BaseAdapter} Appropriate adapter instance
   */
  static createAdapter(providerId, credentials, providerConfig) {
    const adapterMap = {
      // Hostinger (custom hPanel API - Phase 8)
      'hostinger': HostingerAdapter,

      // cPanel-based providers (all use CpanelAdapter)
      'bluehost': CpanelAdapter,
      'siteground': CpanelAdapter,
      'godaddy-cpanel': CpanelAdapter,
      'hostgator': CpanelAdapter,
      'namecheap-cpanel': CpanelAdapter,
      'a2hosting': CpanelAdapter,
      'inmotion': CpanelAdapter,
      'dreamhost': CpanelAdapter,
      'ipage': CpanelAdapter,
      'greengeeks': CpanelAdapter,
      'hostwinds': CpanelAdapter,
      'interserver': CpanelAdapter,
      'cpanel-generic': CpanelAdapter,

      // Other control panels
      'plesk': PleskAdapter,
      'godaddy-plesk': PleskAdapter,
      'cloudways': CloudwaysAdapter,
      'directadmin': DirectAdminAdapter,
      'namecheap-directadmin': DirectAdminAdapter
    };

    const AdapterClass = adapterMap[providerId];

    if (!AdapterClass) {
      throw new Error(`Unknown provider: ${providerId}. No adapter available.`);
    }

    // Create and return adapter instance
    return new AdapterClass(credentials, providerConfig);
  }

  /**
   * Validate credentials format for a specific provider
   * @param {string} providerId - Provider ID
   * @param {object} credentials - Credentials to validate
   * @returns {{valid: boolean, missing: Array<string>, message: string}}
   */
  static validateCredentials(providerId, credentials) {
    const providers = require('../config/providers.json').providers;
    const providerConfig = providers[providerId];

    if (!providerConfig) {
      return {
        valid: false,
        missing: [],
        message: `Unknown provider: ${providerId}`
      };
    }

    const missing = [];
    const requiredFields = providerConfig.credentialFields.filter(field => field.required);

    for (const field of requiredFields) {
      if (!credentials[field.name] || credentials[field.name].trim() === '') {
        missing.push(field.label);
      }
    }

    if (missing.length > 0) {
      return {
        valid: false,
        missing: missing,
        message: `Missing required fields: ${missing.join(', ')}`
      };
    }

    return {
      valid: true,
      missing: [],
      message: 'Credentials are valid'
    };
  }

  /**
   * Get provider metadata
   * @param {string} providerId - Provider ID
   * @returns {object} Provider configuration
   */
  static getProviderConfig(providerId) {
    const providers = require('../config/providers.json').providers;
    return providers[providerId] || null;
  }

  /**
   * Get all available providers grouped by category
   * @returns {object} Providers grouped by category
   */
  static getAllProviders() {
    const providersData = require('../config/providers.json').providers;

    const grouped = {
      cpanel: [],
      other: []
    };

    for (const [id, config] of Object.entries(providersData)) {
      grouped[config.category].push({
        id: id,
        ...config
      });
    }

    return grouped;
  }

  /**
   * Get rate limits for a provider
   * @param {string} providerId - Provider ID
   * @returns {object} Rate limit configuration
   */
  static getRateLimits(providerId) {
    const limits = require('../config/limits.json');
    const providerConfig = this.getProviderConfig(providerId);

    if (!providerConfig) {
      return limits.rateLimits.cpanel; // Default to cPanel limits
    }

    // Map adapter type to rate limits
    const adapterType = providerConfig.adapter.toLowerCase().replace('adapter', '');
    return limits.rateLimits[adapterType] || limits.rateLimits.cpanel;
  }

  /**
   * Check if a provider is supported
   * @param {string} providerId - Provider ID
   * @returns {boolean}
   */
  static isProviderSupported(providerId) {
    const providers = require('../config/providers.json').providers;
    return !!providers[providerId];
  }

  /**
   * Get adapter type for a provider
   * @param {string} providerId - Provider ID
   * @returns {string} Adapter type (CpanelAdapter, PleskAdapter, etc.)
   */
  static getAdapterType(providerId) {
    const providerConfig = this.getProviderConfig(providerId);
    return providerConfig ? providerConfig.adapter : null;
  }
}

module.exports = ProviderFactory;
