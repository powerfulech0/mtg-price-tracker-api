const crypto = require('crypto');
const { AppError } = require('./errorHandler');

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Returns false if lengths differ (without leaking timing info).
 */
const safeCompare = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against itself to maintain constant time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    throw new AppError('API key is required', 401);
  }

  const validKeys = (process.env.API_KEYS || '').split(',').filter(Boolean);

  if (validKeys.length === 0) {
    throw new AppError('Server configuration error', 500);
  }

  const isValid = validKeys.some(validKey => safeCompare(apiKey, validKey.trim()));

  if (!isValid) {
    throw new AppError('Invalid API key', 401);
  }

  next();
};

module.exports = { apiKeyAuth };
