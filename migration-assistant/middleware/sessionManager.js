/**
 * SessionManager - Session management and persistence
 */

const session = require('express-session');
const path = require('path');
const fs = require('fs');

class SessionManager {
  /**
   * Create Express session middleware
   * @returns {function} Express middleware
   */
  static createSessionMiddleware() {
    // Ensure sessions directory exists
    const sessionsDir = path.join(__dirname, '..', 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }

    const sessionConfig = {
      secret: process.env.SESSION_SECRET || 'migration-assistant-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_TIMEOUT) || 3600000, // 1 hour default
        sameSite: 'strict'
      },
      name: 'migration.sid', // Custom session cookie name
      rolling: true // Reset expiry on each request
    };

    // Use file store in development, consider memory store or Redis in production
    if (process.env.NODE_ENV !== 'production') {
      const FileStore = require('session-file-store')(session);
      sessionConfig.store = new FileStore({
        path: sessionsDir,
        ttl: 3600, // 1 hour
        retries: 2
      });
    }

    return session(sessionConfig);
  }

  /**
   * Validate session middleware
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Next middleware
   */
  static validateSession(req, res, next) {
    if (!req.session || !req.session.id) {
      return res.status(401).json({
        error: 'No active session',
        message: 'Please start a new migration session'
      });
    }

    next();
  }

  /**
   * Initialize migration session
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Next middleware
   */
  static initializeMigrationSession(req, res, next) {
    if (!req.session.migration) {
      req.session.migration = {
        id: SessionManager.generateSessionId(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
        step: 1,
        oldProvider: null,
        newProvider: null,
        selectedSites: [],
        migrationState: {},
        progress: {}
      };
    }

    // Update last activity
    req.session.migration.lastActivity = Date.now();

    next();
  }

  /**
   * Check session timeout
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Next middleware
   */
  static checkTimeout(req, res, next) {
    if (req.session.migration) {
      const timeout = parseInt(process.env.SESSION_TIMEOUT) || 3600000;
      const elapsed = Date.now() - req.session.migration.lastActivity;

      if (elapsed > timeout) {
        req.session.destroy();
        return res.status(408).json({
          error: 'Session timeout',
          message: 'Your session has expired due to inactivity'
        });
      }
    }

    next();
  }

  /**
   * Save migration state
   * @param {object} req - Express request
   * @param {string} key - State key
   * @param {any} value - State value
   */
  static saveState(req, key, value) {
    if (!req.session.migration) {
      throw new Error('No migration session initialized');
    }

    req.session.migration.migrationState[key] = value;
    req.session.migration.lastActivity = Date.now();
  }

  /**
   * Get migration state
   * @param {object} req - Express request
   * @param {string} key - State key
   * @returns {any} State value
   */
  static getState(req, key) {
    if (!req.session.migration) {
      return null;
    }

    return req.session.migration.migrationState[key] || null;
  }

  /**
   * Clear migration session
   * @param {object} req - Express request
   */
  static clearSession(req) {
    if (req.session) {
      req.session.destroy();
    }
  }

  /**
   * Export session state
   * @param {object} req - Express request
   * @returns {object} Session state for export
   */
  static exportSession(req) {
    if (!req.session.migration) {
      return null;
    }

    return {
      id: req.session.migration.id,
      step: req.session.migration.step,
      createdAt: req.session.migration.createdAt,
      oldProvider: req.session.migration.oldProvider,
      newProvider: req.session.migration.newProvider,
      selectedSites: req.session.migration.selectedSites,
      migrationState: req.session.migration.migrationState
    };
  }

  /**
   * Import session state
   * @param {object} req - Express request
   * @param {object} sessionData - Session data to import
   */
  static importSession(req, sessionData) {
    req.session.migration = {
      id: sessionData.id || SessionManager.generateSessionId(),
      createdAt: sessionData.createdAt || Date.now(),
      lastActivity: Date.now(),
      step: sessionData.step || 1,
      oldProvider: sessionData.oldProvider || null,
      newProvider: sessionData.newProvider || null,
      selectedSites: sessionData.selectedSites || [],
      migrationState: sessionData.migrationState || {},
      progress: {}
    };
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  static generateSessionId() {
    return `mig_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get session info
   * @param {object} req - Express request
   * @returns {object} Session information
   */
  static getSessionInfo(req) {
    if (!req.session.migration) {
      return null;
    }

    return {
      id: req.session.migration.id,
      step: req.session.migration.step,
      createdAt: req.session.migration.createdAt,
      lastActivity: req.session.migration.lastActivity,
      duration: Date.now() - req.session.migration.createdAt,
      oldProvider: req.session.migration.oldProvider?.name || null,
      newProvider: req.session.migration.newProvider?.name || null,
      sitesSelected: req.session.migration.selectedSites.length
    };
  }
}

module.exports = SessionManager;
