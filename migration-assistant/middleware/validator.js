/**
 * Validator - Input validation middleware
 */

const { body, param, query, validationResult } = require('express-validator');
const ErrorHandler = require('./errorHandler');

class Validator {
  /**
   * Validate results and return errors if any
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Next middleware
   */
  static validate(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return ErrorHandler.validationError(
        errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        })),
        req,
        res
      );
    }

    next();
  }

  /**
   * Validate provider connection
   */
  static validateProviderConnection() {
    return [
      body('providerId')
        .notEmpty()
        .withMessage('Provider ID is required')
        .isString()
        .withMessage('Provider ID must be a string'),
      body('credentials')
        .notEmpty()
        .withMessage('Credentials are required')
        .isObject()
        .withMessage('Credentials must be an object'),
      this.validate
    ];
  }

  /**
   * Validate site selection
   */
  static validateSiteSelection() {
    return [
      body('sites')
        .notEmpty()
        .withMessage('Sites selection is required')
        .isArray()
        .withMessage('Sites must be an array')
        .custom((sites) => sites.length > 0)
        .withMessage('At least one site must be selected'),
      this.validate
    ];
  }

  /**
   * Validate domain name
   */
  static validateDomain() {
    return [
      body('domain')
        .notEmpty()
        .withMessage('Domain is required')
        .matches(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i)
        .withMessage('Invalid domain format'),
      this.validate
    ];
  }

  /**
   * Validate email address
   */
  static validateEmail() {
    return [
      body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
      body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
      this.validate
    ];
  }

  /**
   * Validate Cloudflare API credentials
   */
  static validateCloudflare() {
    return [
      body('apiToken')
        .notEmpty()
        .withMessage('Cloudflare API token is required')
        .isString()
        .withMessage('API token must be a string'),
      body('zoneId')
        .optional()
        .isString()
        .withMessage('Zone ID must be a string'),
      this.validate
    ];
  }

  /**
   * Validate migration start
   */
  static validateMigrationStart() {
    return [
      body('sites')
        .notEmpty()
        .withMessage('Sites are required')
        .isArray()
        .withMessage('Sites must be an array')
        .custom((sites) => sites.length > 0)
        .withMessage('At least one site must be selected'),
      this.validate
    ];
  }

  /**
   * Validate database credentials
   */
  static validateDatabaseCredentials() {
    return [
      body('host')
        .optional()
        .isString()
        .withMessage('Host must be a string'),
      body('database')
        .notEmpty()
        .withMessage('Database name is required')
        .isString()
        .withMessage('Database name must be a string')
        .isLength({ min: 1, max: 64 })
        .withMessage('Database name must be 1-64 characters'),
      body('user')
        .notEmpty()
        .withMessage('Database user is required')
        .isString()
        .withMessage('Database user must be a string'),
      body('password')
        .notEmpty()
        .withMessage('Database password is required')
        .isString()
        .withMessage('Database password must be a string'),
      this.validate
    ];
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9._-]/gi, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Sanitize domain name
   */
  static sanitizeDomain(domain) {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  }

  /**
   * Validate IP address
   */
  static isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Validate URL
   */
  static isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check for SQL injection patterns
   */
  static containsSQLInjection(str) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
      /(--|;|\/\*|\*\/|xp_|sp_)/i,
      /('|(\\')|(--)|(%27)|(%23)|(#))/i
    ];

    return sqlPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Check for XSS patterns
   */
  static containsXSS(str) {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi
    ];

    return xssPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Check for path traversal
   */
  static containsPathTraversal(str) {
    const pathPatterns = [
      /\.\.\//g,
      /\.\.\\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi
    ];

    return pathPatterns.some(pattern => pattern.test(str));
  }
}

module.exports = Validator;
