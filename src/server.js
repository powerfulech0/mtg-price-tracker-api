const app = require('./app');
const { pool, closePool } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

let server;

/**
 * Start Server
 */
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('Database connection verified');

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
};

/**
 * Graceful Shutdown Handler
 */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connection pool
        await closePool();
        logger.info('Database connections closed');
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { error: err.message });
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();

module.exports = { server };
