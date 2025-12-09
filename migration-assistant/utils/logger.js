/**
 * Logger - Winston-based logging system for migration operations
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    // Write migration-specific logs
    new winston.transports.File({
      filename: path.join(logsDir, 'migration.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Log migration event
 * @param {string} sessionId - Session ID
 * @param {string} event - Event type
 * @param {object} data - Event data
 */
logger.migration = (sessionId, event, data = {}) => {
  logger.info(`[Migration ${sessionId}] ${event}`, {
    sessionId,
    event,
    ...data
  });
};

/**
 * Log API call
 * @param {string} provider - Provider name
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {boolean} success - Whether call was successful
 */
logger.api = (provider, endpoint, method, success) => {
  const level = success ? 'info' : 'error';
  logger.log(level, `[API ${provider}] ${method} ${endpoint} - ${success ? 'SUCCESS' : 'FAILED'}`);
};

/**
 * Log file operation
 * @param {string} operation - Operation type (download, upload, compress)
 * @param {string} file - File path
 * @param {number} size - File size in bytes
 * @param {boolean} success - Whether operation was successful
 */
logger.fileOp = (operation, file, size, success) => {
  const level = success ? 'info' : 'error';
  logger.log(level, `[FileOp] ${operation} ${file} (${formatBytes(size)}) - ${success ? 'SUCCESS' : 'FAILED'}`);
};

/**
 * Log database operation
 * @param {string} operation - Operation type (export, import, create)
 * @param {string} database - Database name
 * @param {boolean} success - Whether operation was successful
 */
logger.dbOp = (operation, database, success) => {
  const level = success ? 'info' : 'error';
  logger.log(level, `[DBOp] ${operation} ${database} - ${success ? 'SUCCESS' : 'FAILED'}`);
};

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {string} details - Event details
 * @param {string} ip - IP address if applicable
 */
logger.security = (event, details, ip = null) => {
  logger.warn(`[Security] ${event}: ${details}${ip ? ` from ${ip}` : ''}`);
};

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = logger;
