const tasksModel = require('../models/tasks.model');
const { AppError } = require('../middleware/errorHandler');

/**
 * Tasks Controller
 * Business logic for task operations
 */

/**
 * Get all tasks with filtering and pagination
 */
const getAllTasks = async (req, res) => {
  const { status, priority, page = 1, limit = 10 } = req.query;

  // Build filters object
  const filters = {};
  if (status) filters.status = status;
  if (priority) filters.priority = priority;

  // Calculate pagination
  const offset = (page - 1) * limit;

  // Fetch tasks and total count
  const [tasks, totalCount] = await Promise.all([
    tasksModel.getAllTasks(filters, limit, offset),
    tasksModel.getTasksCount(filters),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  res.json({
    success: true,
    data: tasks,
    metadata: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: totalCount,
      totalPages,
    },
  });
};

/**
 * Get a single task by ID
 */
const getTaskById = async (req, res) => {
  const { id } = req.params;

  const task = await tasksModel.getTaskById(id);

  if (!task) {
    throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  }

  res.json({
    success: true,
    data: task,
  });
};

/**
 * Create a new task
 */
const createTask = async (req, res) => {
  const taskData = req.body;

  const newTask = await tasksModel.createTask(taskData);

  res.status(201).json({
    success: true,
    data: newTask,
    message: 'Task created successfully',
  });
};

/**
 * Update a task (full update - PUT)
 */
const updateTask = async (req, res) => {
  const { id } = req.params;
  const taskData = req.body;

  // Check if task exists
  const existingTask = await tasksModel.getTaskById(id);
  if (!existingTask) {
    throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  }

  const updatedTask = await tasksModel.updateTask(id, taskData);

  res.json({
    success: true,
    data: updatedTask,
    message: 'Task updated successfully',
  });
};

/**
 * Partial update a task (PATCH)
 */
const partialUpdateTask = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updatedTask = await tasksModel.partialUpdateTask(id, updates);

  if (!updatedTask) {
    throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  }

  res.json({
    success: true,
    data: updatedTask,
    message: 'Task updated successfully',
  });
};

/**
 * Delete a task
 */
const deleteTask = async (req, res) => {
  const { id } = req.params;

  const deleted = await tasksModel.deleteTask(id);

  if (!deleted) {
    throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  partialUpdateTask,
  deleteTask,
};
