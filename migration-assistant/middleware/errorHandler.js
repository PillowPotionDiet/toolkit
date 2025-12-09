/**
 * ErrorHandler - Global error handling middleware
 */

const logger = require('../utils/logger');

class ErrorHandler {
  /**
   * Handle 404 Not Found errors
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Next middleware
   */
  static notFound(req, res, next) {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
  }

  /**
   * Global error handler
   * @param {Error} err - Error object
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Next middleware
   */
  static handleError(err, req, res, next) {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log error
    logger.error(`[${status}] ${message}`, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      stack: err.stack
    });

    // Don't expose stack trace in production
    const errorResponse = {
      error: true,
      status: status,
      message: message,
      path: req.originalUrl
    };

    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.stack = err.stack;
    }

    // Send error response
    res.status(status).json(errorResponse);
  }

  /**
   * Async error wrapper
   * Wraps async route handlers to catch errors
   * @param {function} fn - Async function
   * @returns {function} Wrapped function
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Validation error handler
   * @param {Array} errors - Validation errors
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  static validationError(errors, req, res) {
    logger.warn('Validation errors', {
      url: req.originalUrl,
      errors: errors
    });

    res.status(400).json({
      error: true,
      status: 400,
      message: 'Validation failed',
      errors: errors
    });
  }

  /**
   * API error handler (for external API calls)
   * @param {Error} error - Error object
   * @param {string} provider - Provider name
   * @param {string} operation - Operation name
   * @returns {object} Formatted error
   */
  static handleAPIError(error, provider, operation) {
    let message = `Failed to ${operation}`;
    let details = error.message;

    if (error.response) {
      // API returned error response
      if (error.response.data && error.response.data.errors) {
        details = Array.isArray(error.response.data.errors)
          ? error.response.data.errors.join(', ')
          : error.response.data.errors;
      } else if (error.response.data && error.response.data.message) {
        details = error.response.data.message;
      }

      message = `${provider} API error: ${details}`;
    } else if (error.request) {
      // No response received
      message = `No response from ${provider} server. Please check your connection and credentials.`;
    }

    logger.api(provider, operation, 'ERROR', false);

    return {
      error: true,
      provider: provider,
      operation: operation,
      message: message,
      details: details
    };
  }

  /**
   * Database error handler
   * @param {Error} error - Error object
   * @param {string} operation - Operation name
   * @returns {object} Formatted error
   */
  static handleDatabaseError(error, operation) {
    let message = `Database operation failed: ${operation}`;
    let details = error.message;

    // Common MySQL error codes
    const errorCodes = {
      'ER_ACCESS_DENIED_ERROR': 'Access denied. Check database credentials.',
      'ER_BAD_DB_ERROR': 'Database does not exist.',
      'ER_DUP_ENTRY': 'Duplicate entry. Record already exists.',
      'ER_NO_SUCH_TABLE': 'Table does not exist.',
      'ECONNREFUSED': 'Connection refused. Check if database server is running.',
      'ETIMEDOUT': 'Connection timeout. Database server is not responding.'
    };

    if (error.code && errorCodes[error.code]) {
      details = errorCodes[error.code];
    }

    logger.dbOp(operation, 'unknown', false);

    return {
      error: true,
      operation: operation,
      message: message,
      details: details
    };
  }

  /**
   * File operation error handler
   * @param {Error} error - Error object
   * @param {string} operation - Operation name
   * @param {string} filePath - File path
   * @returns {object} Formatted error
   */
  static handleFileError(error, operation, filePath) {
    let message = `File operation failed: ${operation}`;
    let details = error.message;

    const errorCodes = {
      'ENOENT': 'File or directory not found.',
      'EACCES': 'Permission denied.',
      'EEXIST': 'File or directory already exists.',
      'ENOSPC': 'No space left on device.',
      'EMFILE': 'Too many open files.'
    };

    if (error.code && errorCodes[error.code]) {
      details = errorCodes[error.code];
    }

    logger.fileOp(operation, filePath || 'unknown', 0, false);

    return {
      error: true,
      operation: operation,
      filePath: filePath,
      message: message,
      details: details
    };
  }

  /**
   * Create custom error
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @returns {Error} Error object
   */
  static createError(message, status = 500) {
    const error = new Error(message);
    error.status = status;
    return error;
  }
}

module.exports = ErrorHandler;
