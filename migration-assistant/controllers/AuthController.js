/**
 * AuthController - Handles provider authentication and connection
 */

const ProviderFactory = require('../adapters/ProviderFactory');
const SessionManager = require('../middleware/sessionManager');
const logger = require('../utils/logger');
const ErrorHandler = require('../middleware/errorHandler');

class AuthController {
  /**
   * Connect to old hosting account (Step 1)
   * POST /api/connect-old
   */
  static async connectOldAccount(req, res) {
    try {
      const { providerId, credentials } = req.body;

      // Validate credentials format
      const validation = ProviderFactory.validateCredentials(providerId, credentials);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
          missing: validation.missing
        });
      }

      // Get provider config
      const providerConfig = ProviderFactory.getProviderConfig(providerId);
      if (!providerConfig) {
        return res.status(400).json({
          success: false,
          message: `Unknown provider: ${providerId}`
        });
      }

      // Create adapter
      const adapter = ProviderFactory.createAdapter(providerId, credentials, providerConfig);

      // Test connection
      logger.info(`Testing connection to ${providerConfig.name}...`);
      const connectionResult = await adapter.testConnection();

      if (!connectionResult.success) {
        logger.error(`Failed to connect to ${providerConfig.name}: ${connectionResult.message}`);
        return res.status(401).json({
          success: false,
          message: connectionResult.message,
          provider: providerConfig.name
        });
      }

      // Save provider info and adapter to session
      SessionManager.saveState(req, 'oldProvider', {
        id: providerId,
        name: providerConfig.name,
        config: providerConfig
      });
      SessionManager.saveState(req, 'oldCredentials', credentials);

      logger.migration(req.session.migration.id, 'Old account connected', {
        provider: providerConfig.name
      });

      res.json({
        success: true,
        message: `Successfully connected to ${providerConfig.name}`,
        provider: providerConfig.name,
        serverInfo: connectionResult.serverInfo
      });
    } catch (error) {
      logger.error(`Error connecting to old account: ${error.message}`);
      const formattedError = ErrorHandler.handleAPIError(
        error,
        req.body.providerId,
        'connect to old account'
      );
      res.status(500).json(formattedError);
    }
  }

  /**
   * Connect to new hosting account (Step 3)
   * POST /api/connect-new
   */
  static async connectNewAccount(req, res) {
    try {
      const { providerId, credentials } = req.body;

      // Validate credentials format
      const validation = ProviderFactory.validateCredentials(providerId, credentials);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
          missing: validation.missing
        });
      }

      // Get provider config
      const providerConfig = ProviderFactory.getProviderConfig(providerId);
      if (!providerConfig) {
        return res.status(400).json({
          success: false,
          message: `Unknown provider: ${providerId}`
        });
      }

      // Create adapter
      const adapter = ProviderFactory.createAdapter(providerId, credentials, providerConfig);

      // Test connection
      logger.info(`Testing connection to new account ${providerConfig.name}...`);
      const connectionResult = await adapter.testConnection();

      if (!connectionResult.success) {
        logger.error(`Failed to connect to ${providerConfig.name}: ${connectionResult.message}`);
        return res.status(401).json({
          success: false,
          message: connectionResult.message,
          provider: providerConfig.name
        });
      }

      // Save provider info to session
      SessionManager.saveState(req, 'newProvider', {
        id: providerId,
        name: providerConfig.name,
        config: providerConfig
      });
      SessionManager.saveState(req, 'newCredentials', credentials);

      // Get server IP for new host
      const serverIP = await adapter.getServerIP().catch(() => 'Unknown');
      SessionManager.saveState(req, 'newServerIP', serverIP);

      // Get old provider for comparison
      const oldProvider = SessionManager.getState(req, 'oldProvider');

      logger.migration(req.session.migration.id, 'New account connected', {
        provider: providerConfig.name,
        serverIP: serverIP
      });

      res.json({
        success: true,
        message: `Successfully connected to ${providerConfig.name}`,
        provider: providerConfig.name,
        serverInfo: connectionResult.serverInfo,
        serverIP: serverIP,
        compatibility: {
          oldProvider: oldProvider?.name,
          newProvider: providerConfig.name,
          note: `Migrating from ${oldProvider?.name || 'unknown'} to ${providerConfig.name}`
        }
      });
    } catch (error) {
      logger.error(`Error connecting to new account: ${error.message}`);
      const formattedError = ErrorHandler.handleAPIError(
        error,
        req.body.providerId,
        'connect to new account'
      );
      res.status(500).json(formattedError);
    }
  }

  /**
   * Get all available providers
   * GET /api/providers
   */
  static async getProviders(req, res) {
    try {
      const providers = ProviderFactory.getAllProviders();

      res.json({
        success: true,
        providers: providers
      });
    } catch (error) {
      logger.error(`Error fetching providers: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch providers list'
      });
    }
  }

  /**
   * Get provider details
   * GET /api/providers/:providerId
   */
  static async getProviderDetails(req, res) {
    try {
      const { providerId } = req.params;

      const providerConfig = ProviderFactory.getProviderConfig(providerId);

      if (!providerConfig) {
        return res.status(404).json({
          success: false,
          message: `Provider not found: ${providerId}`
        });
      }

      res.json({
        success: true,
        provider: {
          id: providerId,
          ...providerConfig
        }
      });
    } catch (error) {
      logger.error(`Error fetching provider details: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch provider details'
      });
    }
  }

  /**
   * Test provider connection (without saving to session)
   * POST /api/test-connection
   */
  static async testConnection(req, res) {
    try {
      const { providerId, credentials } = req.body;

      // Validate credentials format
      const validation = ProviderFactory.validateCredentials(providerId, credentials);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
          missing: validation.missing
        });
      }

      // Get provider config
      const providerConfig = ProviderFactory.getProviderConfig(providerId);
      if (!providerConfig) {
        return res.status(400).json({
          success: false,
          message: `Unknown provider: ${providerId}`
        });
      }

      // Create adapter
      const adapter = ProviderFactory.createAdapter(providerId, credentials, providerConfig);

      // Test connection
      const connectionResult = await adapter.testConnection();

      res.json({
        success: connectionResult.success,
        message: connectionResult.message,
        provider: providerConfig.name,
        serverInfo: connectionResult.serverInfo
      });
    } catch (error) {
      logger.error(`Error testing connection: ${error.message}`);
      const formattedError = ErrorHandler.handleAPIError(
        error,
        req.body.providerId,
        'test connection'
      );
      res.status(500).json(formattedError);
    }
  }

  /**
   * Disconnect provider (clear from session)
   * POST /api/disconnect
   */
  static async disconnect(req, res) {
    try {
      const { type } = req.body; // 'old' or 'new'

      if (type === 'old') {
        SessionManager.saveState(req, 'oldProvider', null);
        SessionManager.saveState(req, 'oldCredentials', null);
        logger.info('Disconnected from old provider');
      } else if (type === 'new') {
        SessionManager.saveState(req, 'newProvider', null);
        SessionManager.saveState(req, 'newCredentials', null);
        logger.info('Disconnected from new provider');
      }

      res.json({
        success: true,
        message: `Disconnected from ${type} provider`
      });
    } catch (error) {
      logger.error(`Error disconnecting: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect'
      });
    }
  }

  /**
   * Get connection status
   * GET /api/connection-status
   */
  static async getConnectionStatus(req, res) {
    try {
      const oldProvider = SessionManager.getState(req, 'oldProvider');
      const newProvider = SessionManager.getState(req, 'newProvider');

      res.json({
        success: true,
        oldProvider: oldProvider ? {
          id: oldProvider.id,
          name: oldProvider.name,
          connected: true
        } : null,
        newProvider: newProvider ? {
          id: newProvider.id,
          name: newProvider.name,
          connected: true
        } : null
      });
    } catch (error) {
      logger.error(`Error getting connection status: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to get connection status'
      });
    }
  }
}

module.exports = AuthController;
