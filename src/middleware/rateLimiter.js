const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate Limiting Configuration
 * Protects against DDoS attacks and brute force attempts
 */

// Standard error response for rate limit exceeded
const standardResponse = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method
  });

  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  });
};

/**
 * General API Rate Limiter
 * Applied to all API routes (GET requests)
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  },
  handler: standardResponse,
});

/**
 * Mutation Rate Limiter
 * Stricter limits for write operations (POST, PUT, PATCH, DELETE)
 */
const mutationLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MUTATION_MAX, 10) || 50, // 50 requests per window
  message: 'Too many write operations from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to mutation methods
    return !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  },
  handler: standardResponse,
});

/**
 * Health Check Limiter (very lenient)
 * Allows frequent health checks for monitoring
 */
const healthCheckLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardResponse,
});

module.exports = {
  generalLimiter,
  mutationLimiter,
  healthCheckLimiter,
};
