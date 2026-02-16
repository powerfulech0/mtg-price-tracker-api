const { Pool } = require('pg');
const logger = require('../utils/logger');

// PostgreSQL connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'tasks_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'tasks_db',

  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout if connection cannot be established
});

// Test database connection
pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
  process.exit(-1);
});

// Graceful shutdown function
const closePool = async () => {
  try {
    await pool.end();
    logger.info('Database connection pool closed');
  } catch (err) {
    logger.error('Error closing database pool', { error: err.message });
    throw err;
  }
};

// Query helper with error logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 100ms)
    if (duration > 100) {
      logger.warn('Slow query detected', {
        duration: `${duration}ms`,
        query: text,
        rows: res.rowCount
      });
    }

    return res;
  } catch (err) {
    logger.error('Database query error', {
      error: err.message,
      query: text,
      params
    });
    throw err;
  }
};

module.exports = {
  pool,
  query,
  closePool
};
