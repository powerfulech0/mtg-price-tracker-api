/**
 * Simple logging utility
 * In production, consider using Winston or Pino for structured logging
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const shouldLog = (level) => {
  if (process.env.NODE_ENV === 'test') {
    return false; // Suppress logs during testing
  }

  if (process.env.NODE_ENV === 'production' && level === LOG_LEVELS.DEBUG) {
    return false; // No debug logs in production
  }

  return true;
};

const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level}: ${message}${metaStr}`;
};

const logger = {
  error: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error(formatLog(LOG_LEVELS.ERROR, message, meta));
    }
  },

  warn: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(formatLog(LOG_LEVELS.WARN, message, meta));
    }
  },

  info: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.info(formatLog(LOG_LEVELS.INFO, message, meta));
    }
  },

  debug: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(formatLog(LOG_LEVELS.DEBUG, message, meta));
    }
  }
};

module.exports = logger;
