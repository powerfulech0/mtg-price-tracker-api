const logger = require('../utils/logger');

/**
 * Custom Application Error Class
 * Used for operational errors that we can predict and handle
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized Error Handler Middleware
 * Handles all errors thrown in the application
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 Internal Server Error
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Log error details
  logger.error('Error occurred', {
    errorCode,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    body: req.body,
  });

  // Handle specific error types

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        statusCode = 409;
        errorCode = 'DUPLICATE_RESOURCE';
        message = 'Resource already exists';
        break;

      case '23503': // Foreign key violation
        statusCode = 400;
        errorCode = 'INVALID_REFERENCE';
        message = 'Referenced resource does not exist';
        break;

      case '23502': // Not null violation
        statusCode = 400;
        errorCode = 'MISSING_REQUIRED_FIELD';
        message = 'Required field is missing';
        break;

      case '23514': // Check constraint violation
        statusCode = 400;
        errorCode = 'CONSTRAINT_VIOLATION';
        message = 'Data does not meet validation constraints';
        break;

      case '42P01': // Undefined table
        statusCode = 500;
        errorCode = 'DATABASE_ERROR';
        message = 'Database configuration error';
        break;

      default:
        statusCode = 500;
        errorCode = 'DATABASE_ERROR';
        message = 'Database operation failed';
    }
  }

  // Handle validation errors from express-validator
  if (err.array && typeof err.array === 'function') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Input validation failed';
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
  };

  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Not Found Handler Middleware
 * Handles requests to undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Cannot ${req.method} ${req.path}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
};
