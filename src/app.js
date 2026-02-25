require('dotenv').config();
require('express-async-errors'); // Automatically handle async errors in Express
const express = require('express');
const morgan = require('morgan');
const compression = require('compression');

const { helmetConfig, corsConfig } = require('./config/security');
const { generalLimiter, healthCheckLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const logger = require('./utils/logger');
const { version } = require('../package.json');

/**
 * Express Application Configuration
 */

const app = express();

// Trust proxy (important for rate limiting and logging when behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmetConfig); // Security headers via Helmet.js
app.use(corsConfig); // CORS configuration

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Compression middleware (gzip)
app.use(compression());

// HTTP request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint (with lenient rate limiting)
app.get('/health', healthCheckLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    version: version,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Apply general rate limiter to all API routes
app.use('/api', generalLimiter);

// Mount API routes
app.use('/api/v1', apiRoutes);

// Handle 404 - Route not found
app.use(notFoundHandler);

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;
