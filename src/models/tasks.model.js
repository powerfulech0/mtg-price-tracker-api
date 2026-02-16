const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

/**
 * Tasks Model
 * Data access layer with parameterized queries to prevent SQL injection
 */

/**
 * Get all tasks with optional filtering and pagination
 * @param {Object} filters - Filter criteria (status, priority)
 * @param {Number} limit - Number of items per page
 * @param {Number} offset - Number of items to skip
 * @returns {Promise<Array>} Array of tasks
 */
const getAllTasks = async (filters = {}, limit = 10, offset = 0) => {
  let queryText = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  // Add filters using parameterized queries
  if (filters.status) {
    queryText += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.priority) {
    queryText += ` AND priority = $${paramIndex}`;
    params.push(filters.priority);
    paramIndex++;
  }

  // Add ordering and pagination
  queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Get total count of tasks with optional filtering
 * @param {Object} filters - Filter criteria (status, priority)
 * @returns {Promise<Number>} Total count
 */
const getTasksCount = async (filters = {}) => {
  let queryText = 'SELECT COUNT(*) FROM tasks WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (filters.status) {
    queryText += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.priority) {
    queryText += ` AND priority = $${paramIndex}`;
    params.push(filters.priority);
    paramIndex++;
  }

  const result = await query(queryText, params);
  return parseInt(result.rows[0].count, 10);
};

/**
 * Get a single task by ID
 * @param {Number} id - Task ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
const getTaskById = async (id) => {
  const queryText = 'SELECT * FROM tasks WHERE id = $1';
  const result = await query(queryText, [id]);
  return result.rows[0] || null;
};

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task
 */
const createTask = async (taskData) => {
  const { title, description, status, priority, due_date } = taskData;

  const queryText = `
    INSERT INTO tasks (title, description, status, priority, due_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const params = [
    title,
    description || null,
    status || 'pending',
    priority || 'medium',
    due_date || null,
  ];

  const result = await query(queryText, params);
  return result.rows[0];
};

/**
 * Update a task (full update)
 * @param {Number} id - Task ID
 * @param {Object} taskData - Updated task data
 * @returns {Promise<Object|null>} Updated task or null if not found
 */
const updateTask = async (id, taskData) => {
  const { title, description, status, priority, due_date } = taskData;

  const queryText = `
    UPDATE tasks
    SET
      title = $1,
      description = $2,
      status = $3,
      priority = $4,
      due_date = $5
    WHERE id = $6
    RETURNING *
  `;

  const params = [
    title,
    description || null,
    status || 'pending',
    priority || 'medium',
    due_date || null,
    id,
  ];

  const result = await query(queryText, params);
  return result.rows[0] || null;
};

/**
 * Partial update a task (PATCH)
 * @param {Number} id - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated task or null if not found
 */
const partialUpdateTask = async (id, updates) => {
  // Get current task data
  const currentTask = await getTaskById(id);
  if (!currentTask) {
    return null;
  }

  // Build dynamic update query
  const fields = [];
  const params = [];
  let paramIndex = 1;

  const allowedFields = ['title', 'description', 'status', 'priority', 'due_date'];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      params.push(updates[field]);
      paramIndex++;
    }
  });

  // If no fields to update, return current task
  if (fields.length === 0) {
    return currentTask;
  }

  // Add task ID as last parameter
  params.push(id);

  const queryText = `
    UPDATE tasks
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(queryText, params);
  return result.rows[0] || null;
};

/**
 * Delete a task
 * @param {Number} id - Task ID
 * @returns {Promise<Boolean>} True if deleted, false if not found
 */
const deleteTask = async (id) => {
  const queryText = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
  const result = await query(queryText, [id]);
  return result.rowCount > 0;
};

module.exports = {
  getAllTasks,
  getTasksCount,
  getTaskById,
  createTask,
  updateTask,
  partialUpdateTask,
  deleteTask,
};
