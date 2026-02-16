const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasks.controller');
const handleValidationErrors = require('../middleware/validation');
const {
  createTaskValidation,
  updateTaskValidation,
  partialUpdateTaskValidation,
  getTaskByIdValidation,
  deleteTaskValidation,
  listTasksValidation,
} = require('../validators/tasks.validator');

/**
 * Tasks Routes
 * All routes are prefixed with /api/v1/tasks
 */

/**
 * @route   GET /api/v1/tasks
 * @desc    Get all tasks with optional filtering and pagination
 * @access  Public
 * @query   status, priority, page, limit
 */
router.get(
  '/',
  listTasksValidation,
  handleValidationErrors,
  tasksController.getAllTasks
);

/**
 * @route   GET /api/v1/tasks/:id
 * @desc    Get a single task by ID
 * @access  Public
 */
router.get(
  '/:id',
  getTaskByIdValidation,
  handleValidationErrors,
  tasksController.getTaskById
);

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new task
 * @access  Public
 */
router.post(
  '/',
  createTaskValidation,
  handleValidationErrors,
  tasksController.createTask
);

/**
 * @route   PUT /api/v1/tasks/:id
 * @desc    Full update of a task
 * @access  Public
 */
router.put(
  '/:id',
  updateTaskValidation,
  handleValidationErrors,
  tasksController.updateTask
);

/**
 * @route   PATCH /api/v1/tasks/:id
 * @desc    Partial update of a task
 * @access  Public
 */
router.patch(
  '/:id',
  partialUpdateTaskValidation,
  handleValidationErrors,
  tasksController.partialUpdateTask
);

/**
 * @route   DELETE /api/v1/tasks/:id
 * @desc    Delete a task
 * @access  Public
 */
router.delete(
  '/:id',
  deleteTaskValidation,
  handleValidationErrors,
  tasksController.deleteTask
);

module.exports = router;
