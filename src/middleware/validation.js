const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Validation Error Handler Middleware
 * Processes validation errors from express-validator and returns formatted response
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    logger.warn('Validation error', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      errors: formattedErrors,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: formattedErrors,
      },
    });
  }

  next();
};

module.exports = handleValidationErrors;
