const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

/**
 * Integration Tests for Tasks API
 * Tests all CRUD operations and security features
 */

describe('Tasks API Integration Tests', () => {
  let createdTaskId;

  // Setup: Ensure clean database state before tests
  beforeAll(async () => {
    // Wait for database connection
    await pool.query('SELECT NOW()');
  });

  // Cleanup: Close database connection after all tests
  afterAll(async () => {
    await pool.end();
  });

  // Health Check Tests
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'API is healthy');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // Create Task Tests
  describe('POST /api/v1/tasks', () => {
    it('should create a new task with valid data', async () => {
      const taskData = {
        title: 'Test Task from Jest',
        description: 'This is a test task created during integration testing',
        status: 'pending',
        priority: 'high',
        due_date: '2026-03-01T10:00:00Z',
      };

      const res = await request(app)
        .post('/api/v1/tasks')
        .send(taskData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(taskData.title);
      expect(res.body.data.status).toBe(taskData.status);
      expect(res.body.data.priority).toBe(taskData.priority);

      // Save task ID for later tests
      createdTaskId = res.body.data.id;
    });

    it('should reject task with missing title', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({ description: 'No title provided' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject task with invalid status', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Invalid Status',
          status: 'invalid_status',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize XSS attempts in title', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: '<script>alert("XSS")</script>',
          status: 'pending',
        })
        .expect(201);

      expect(res.body.data.title).not.toContain('<script>');
      expect(res.body.data.title).not.toContain('</script>');
    });
  });

  // Get All Tasks Tests
  describe('GET /api/v1/tasks', () => {
    it('should get all tasks with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.metadata).toHaveProperty('page', 1);
      expect(res.body.metadata).toHaveProperty('limit', 10);
      expect(res.body.metadata).toHaveProperty('total');
      expect(res.body.metadata).toHaveProperty('totalPages');
    });

    it('should filter tasks by status', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .query({ status: 'pending' })
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach((task) => {
        expect(task.status).toBe('pending');
      });
    });

    it('should filter tasks by priority', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .query({ priority: 'high' })
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach((task) => {
        expect(task.priority).toBe('high');
      });
    });

    it('should reject invalid pagination parameters', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .query({ page: -1, limit: 200 })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // Get Task by ID Tests
  describe('GET /api/v1/tasks/:id', () => {
    it('should get a task by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${createdTaskId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdTaskId);
      expect(res.body.data).toHaveProperty('title');
      expect(res.body.data).toHaveProperty('status');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .get('/api/v1/tasks/999999')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('should reject invalid task ID', async () => {
      const res = await request(app)
        .get('/api/v1/tasks/invalid')
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // Update Task Tests (PUT)
  describe('PUT /api/v1/tasks/:id', () => {
    it('should fully update a task', async () => {
      const updateData = {
        title: 'Updated Test Task',
        description: 'Updated description',
        status: 'in_progress',
        priority: 'medium',
      };

      const res = await request(app)
        .put(`/api/v1/tasks/${createdTaskId}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.title);
      expect(res.body.data.status).toBe(updateData.status);
      expect(res.body.data.priority).toBe(updateData.priority);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/api/v1/tasks/999999')
        .send({ title: 'Update non-existent' })
        .expect(404);

      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });

  // Partial Update Task Tests (PATCH)
  describe('PATCH /api/v1/tasks/:id', () => {
    it('should partially update a task', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');
    });

    it('should reject PATCH with no fields', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .send({})
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .patch('/api/v1/tasks/999999')
        .send({ status: 'completed' })
        .expect(404);

      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });

  // Delete Task Tests
  describe('DELETE /api/v1/tasks/:id', () => {
    it('should delete a task', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${createdTaskId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Task deleted successfully');

      // Verify task is deleted
      const getRes = await request(app)
        .get(`/api/v1/tasks/${createdTaskId}`)
        .expect(404);

      expect(getRes.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('should return 404 when deleting non-existent task', async () => {
      const res = await request(app)
        .delete('/api/v1/tasks/999999')
        .expect(404);

      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });

  // Security Tests
  describe('Security Features', () => {
    it('should have security headers from Helmet', async () => {
      const res = await request(app).get('/health');

      expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(res.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(res.headers).not.toHaveProperty('x-powered-by');
    });

    it('should handle SQL injection attempts', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: "'; DROP TABLE tasks; --",
          description: "1' OR '1'='1",
        })
        .expect(201);

      // Task should be created with sanitized input
      expect(res.body.success).toBe(true);

      // Verify database is still intact
      const tasksRes = await request(app).get('/api/v1/tasks').expect(200);
      expect(tasksRes.body.success).toBe(true);
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should return 404 for undefined routes', async () => {
      const res = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });
});
