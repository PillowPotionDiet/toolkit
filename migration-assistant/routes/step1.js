/**
 * Step 1 Routes - Old Account Connection
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const RateLimiter = require('../middleware/rateLimiter');
const SessionManager = require('../middleware/sessionManager');
const ErrorHandler = require('../middleware/errorHandler');

// Initialize migration session for all routes
router.use(SessionManager.initializeMigrationSession);

// Connect to old hosting account
router.post(
  '/connect-old',
  RateLimiter.createAuthLimiter(),
  ErrorHandler.asyncHandler(AuthController.connectOldAccount)
);

// Get all providers
router.get(
  '/providers',
  ErrorHandler.asyncHandler(AuthController.getProviders)
);

// Get provider details
router.get(
  '/providers/:providerId',
  ErrorHandler.asyncHandler(AuthController.getProviderDetails)
);

// Test connection (without saving)
router.post(
  '/test-connection',
  RateLimiter.createAuthLimiter(),
  ErrorHandler.asyncHandler(AuthController.testConnection)
);

// Get connection status
router.get(
  '/connection-status',
  ErrorHandler.asyncHandler(AuthController.getConnectionStatus)
);

module.exports = router;
