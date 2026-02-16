const { body, param, query, validationResult } = require('express-validator');

/**
 * Input Validation and Sanitization Rules
 * Using express-validator to prevent XSS and ensure data integrity
 */

// Reusable validation chains
const titleValidation = body('title')
  .trim()
  .notEmpty()
  .withMessage('Title is required')
  .isLength({ min: 1, max: 255 })
  .withMessage('Title must be between 1 and 255 characters')
  .escape(); // Prevent XSS attacks

const descriptionValidation = body('description')
  .optional()
  .trim()
  .isLength({ max: 5000 })
  .withMessage('Description must not exceed 5000 characters')
  .escape(); // Prevent XSS attacks

const statusValidation = body('status')
  .optional()
  .trim()
  .isIn(['pending', 'in_progress', 'completed'])
  .withMessage('Status must be one of: pending, in_progress, completed');

const priorityValidation = body('priority')
  .optional()
  .trim()
  .isIn(['low', 'medium', 'high'])
  .withMessage('Priority must be one of: low, medium, high');

const dueDateValidation = body('due_date')
  .optional()
  .trim()
  .isISO8601()
  .withMessage('Due date must be a valid ISO 8601 date')
  .toDate(); // Convert to JavaScript Date object

const idParamValidation = param('id')
  .trim()
  .isInt({ min: 1 })
  .withMessage('Task ID must be a positive integer')
  .toInt(); // Convert to integer

// Query parameter validations for filtering and pagination
const statusQueryValidation = query('status')
  .optional()
  .trim()
  .isIn(['pending', 'in_progress', 'completed'])
  .withMessage('Status must be one of: pending, in_progress, completed');

const priorityQueryValidation = query('priority')
  .optional()
  .trim()
  .isIn(['low', 'medium', 'high'])
  .withMessage('Priority must be one of: low, medium, high');

const pageValidation = query('page')
  .optional()
  .trim()
  .isInt({ min: 1 })
  .withMessage('Page must be a positive integer')
  .toInt();

const limitValidation = query('limit')
  .optional()
  .trim()
  .isInt({ min: 1, max: 100 })
  .withMessage('Limit must be between 1 and 100')
  .toInt();

/**
 * Validation rule sets for different endpoints
 */

const createTaskValidation = [
  titleValidation,
  descriptionValidation,
  statusValidation,
  priorityValidation,
  dueDateValidation,
];

const updateTaskValidation = [
  idParamValidation,
  titleValidation,
  descriptionValidation,
  statusValidation,
  priorityValidation,
  dueDateValidation,
];

const partialUpdateTaskValidation = [
  idParamValidation,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty if provided')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters')
    .escape(),
  descriptionValidation,
  statusValidation,
  priorityValidation,
  dueDateValidation,
  // Ensure at least one field is provided for PATCH
  body().custom((value, { req }) => {
    const fields = ['title', 'description', 'status', 'priority', 'due_date'];
    const hasAtLeastOneField = fields.some(field => req.body[field] !== undefined);

    if (!hasAtLeastOneField) {
      throw new Error('At least one field must be provided for update');
    }

    return true;
  }),
];

const getTaskByIdValidation = [idParamValidation];

const deleteTaskValidation = [idParamValidation];

const listTasksValidation = [
  statusQueryValidation,
  priorityQueryValidation,
  pageValidation,
  limitValidation,
];

module.exports = {
  createTaskValidation,
  updateTaskValidation,
  partialUpdateTaskValidation,
  getTaskByIdValidation,
  deleteTaskValidation,
  listTasksValidation,
};
