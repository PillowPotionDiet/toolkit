/**
 * RateLimiter - Rate limiting middleware to prevent API abuse
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

class RateLimiter {
  /**
   * Create general rate limiter
   * @returns {function} Rate limiter middleware
   */
  static createGeneralLimiter() {
    return rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per minute
      message: {
        error: true,
        message: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.security('Rate limit exceeded', `IP: ${req.ip}, Path: ${req.originalUrl}`, req.ip);
        res.status(429).json({
          error: true,
          message: 'Too many requests. Please slow down and try again later.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  /**
   * Create strict rate limiter for API endpoints
   * @returns {function} Rate limiter middleware
   */
  static createAPILimiter() {
    return rateLimit({
      windowMs: 60000, // 1 minute
      max: 30, // 30 requests per minute for API
      message: {
        error: true,
        message: 'API rate limit exceeded. Please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      handler: (req, res) => {
        logger.security('API rate limit exceeded', `IP: ${req.ip}, Path: ${req.originalUrl}`, req.ip);
        res.status(429).json({
          error: true,
          message: 'API rate limit exceeded. Please wait before making more requests.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  /**
   * Create authentication rate limiter (stricter)
   * @returns {function} Rate limiter middleware
   */
  static createAuthLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per 15 minutes
      skipSuccessfulRequests: true, // Don't count successful logins
      message: {
        error: true,
        message: 'Too many authentication attempts. Please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.security('Auth rate limit exceeded', `IP: ${req.ip}, Path: ${req.originalUrl}`, req.ip);
        res.status(429).json({
          error: true,
          message: 'Too many authentication attempts. Your IP has been temporarily blocked for security.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
          blockedFor: '15 minutes'
        });
      }
    });
  }

  /**
   * Create download rate limiter
   * @returns {function} Rate limiter middleware
   */
  static createDownloadLimiter() {
    return rateLimit({
      windowMs: 60000, // 1 minute
      max: 10, // 10 downloads per minute
      message: {
        error: true,
        message: 'Download rate limit exceeded.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.security('Download rate limit exceeded', `IP: ${req.ip}`, req.ip);
        res.status(429).json({
          error: true,
          message: 'Too many download requests. Please wait before downloading more files.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  /**
   * Create migration start rate limiter
   * @returns {function} Rate limiter middleware
   */
  static createMigrationLimiter() {
    return rateLimit({
      windowMs: 60000, // 1 minute
      max: 3, // 3 migration starts per minute
      message: {
        error: true,
        message: 'Migration rate limit exceeded.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.security('Migration rate limit exceeded', `IP: ${req.ip}`, req.ip);
        res.status(429).json({
          error: true,
          message: 'You are starting migrations too quickly. Please wait before starting another migration.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  /**
   * Custom rate limiter based on provider limits
   * @param {string} providerId - Provider ID
   * @returns {function} Rate limiter middleware
   */
  static createProviderLimiter(providerId) {
    const ProviderFactory = require('../adapters/ProviderFactory');
    const rateLimits = ProviderFactory.getRateLimits(providerId);

    return rateLimit({
      windowMs: 60000, // 1 minute
      max: rateLimits.requestsPerMinute || 60,
      message: {
        error: true,
        message: `Rate limit for ${providerId} exceeded.`
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.api(providerId, 'rate-limit', 'EXCEEDED', false);
        res.status(429).json({
          error: true,
          message: `Provider API rate limit exceeded. Please wait before making more requests to ${providerId}.`,
          provider: providerId,
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }
}

module.exports = RateLimiter;
