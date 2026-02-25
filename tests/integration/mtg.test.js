const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

/**
 * Integration Tests for MTG Price Tracker API
 * Tests all MTG card price tracking operations
 */

// Set test API key before importing app
const TEST_API_KEY = 'test-api-key-12345';
process.env.API_KEYS = TEST_API_KEY;

describe('MTG Price Tracker API Integration Tests', () => {
  let testCardName = 'Lightning Bolt';
  let createdCardId;

  // Helper to add API key header to requests
  const authHeader = { 'X-API-Key': TEST_API_KEY };

  // Setup: Ensure clean database state before tests
  beforeAll(async () => {
    // Wait for database connection
    await pool.query('SELECT NOW()');
  });

  // Cleanup: Close database connection after all tests
  afterAll(async () => {
    // Clean up test data (ignore errors if tables don't exist)
    try {
      if (createdCardId) {
        await pool.query('DELETE FROM mtg_price_history WHERE card_id = $1', [createdCardId]);
        await pool.query('DELETE FROM mtg_cards WHERE id = $1', [createdCardId]);
      }
    } catch (err) {
      // Ignore cleanup errors
    }
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

  // Get All Cards Tests
  describe('GET /api/v1/mtg/cards', () => {
    it('should get all cards with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/mtg/cards')
        .set(authHeader)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.metadata).toHaveProperty('page', 1);
      expect(res.body.metadata).toHaveProperty('limit', 10);
      expect(res.body.metadata).toHaveProperty('total');
      expect(res.body.metadata).toHaveProperty('totalPages');
    });

    it('should support sorting parameters', async () => {
      const res = await request(app)
        .get('/api/v1/mtg/cards')
        .set(authHeader)
        .query({ sort: 'card_name', order: 'ASC' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject invalid pagination parameters', async () => {
      const res = await request(app)
        .get('/api/v1/mtg/cards')
        .set(authHeader)
        .query({ page: -1, limit: 200 })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // Record Price Tests
  describe('POST /api/v1/mtg/cards/:cardName/prices', () => {
    it('should record a price for a card', async () => {
      const priceData = {
        price: 2.99,
        source: 'manual',
      };

      const res = await request(app)
        .post(`/api/v1/mtg/cards/${encodeURIComponent(testCardName)}/prices`)
        .set(authHeader)
        .send(priceData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('card');
      expect(res.body.data).toHaveProperty('price_record');
      expect(res.body.data.card).toHaveProperty('id');
      expect(res.body.data.price_record.price).toBe('2.99');
      expect(res.body.message).toBe('Price recorded successfully');

      // Save card ID for cleanup
      createdCardId = res.body.data.card.id;
    });

    it('should reject price without required price field', async () => {
      const res = await request(app)
        .post(`/api/v1/mtg/cards/${encodeURIComponent(testCardName)}/prices`)
        .set(authHeader)
        .send({ source: 'manual' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid price value', async () => {
      const res = await request(app)
        .post(`/api/v1/mtg/cards/${encodeURIComponent(testCardName)}/prices`)
        .set(authHeader)
        .send({ price: -5.00 })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid source value', async () => {
      const res = await request(app)
        .post(`/api/v1/mtg/cards/${encodeURIComponent(testCardName)}/prices`)
        .set(authHeader)
        .send({ price: 1.99, source: 'invalid_source' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // Get Price History Tests
  describe('GET /api/v1/mtg/cards/:cardName/prices', () => {
    it('should get price history for a card', async () => {
      const res = await request(app)
        .get(`/api/v1/mtg/cards/${encodeURIComponent(testCardName)}/prices`)
        .set(authHeader)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('card');
      expect(res.body.data).toHaveProperty('prices');
      expect(res.body.data).toHaveProperty('statistics');
      expect(Array.isArray(res.body.data.prices)).toBe(true);
      expect(res.body.metadata).toHaveProperty('page', 1);
      expect(res.body.metadata).toHaveProperty('limit', 10);
      expect(res.body.metadata).toHaveProperty('total');
      expect(res.body.metadata).toHaveProperty('totalPages');
    });

    it('should filter by source', async () => {
      const res = await request(app)
        .get(`/api/v1/mtg/cards/${encodeURIComponent(testCardName)}/prices`)
        .set(authHeader)
        .query({ source: 'manual' })
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.prices.forEach((price) => {
        expect(price.source).toBe('manual');
      });
    });

    it('should filter by date range', async () => {
      const startDate = '2020-01-01';
      const endDate = '2030-12-31';

      const res = await request(app)
        .get(`/api/v1/mtg/cards/${encodeURIComponent(testCardName)}/prices`)
        .set(authHeader)
        .query({ start_date: startDate, end_date: endDate })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent card', async () => {
      const res = await request(app)
        .get('/api/v1/mtg/cards/NonExistentCardXYZ123/prices')
        .set(authHeader)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CARD_NOT_FOUND');
    });

    it('should reject invalid pagination parameters', async () => {
      const res = await request(app)
        .get(`/api/v1/mtg/cards/${encodeURIComponent(testCardName)}/prices`)
        .set(authHeader)
        .query({ page: 0, limit: -5 })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // Fetch Price from Scryfall Tests
  describe('POST /api/v1/mtg/cards/:cardName/fetch-price', () => {
    it('should fetch price from Scryfall without auto-recording', async () => {
      const res = await request(app)
        .post(`/api/v1/mtg/cards/${encodeURIComponent(testCardName)}/fetch-price`)
        .set(authHeader)
        .send({ autoRecord: false })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('current_price');
      expect(res.body.data.saved).toBe(false);
      expect(res.body.data.saved_data).toBeNull();
    });

    it('should fetch price from Scryfall with auto-recording', async () => {
      const res = await request(app)
        .post(`/api/v1/mtg/cards/${encodeURIComponent(testCardName)}/fetch-price`)
        .set(authHeader)
        .send({ autoRecord: true })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('current_price');
      expect(res.body.data.saved).toBe(true);
      expect(res.body.data.saved_data).not.toBeNull();
      expect(res.body.data.saved_data).toHaveProperty('card');
      expect(res.body.data.saved_data).toHaveProperty('price_record');
    });

    it('should handle non-existent card on Scryfall', async () => {
      const res = await request(app)
        .post('/api/v1/mtg/cards/CompletelyFakeCardXYZ999/fetch-price')
        .set(authHeader)
        .send({ autoRecord: false })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // API Key Authentication Tests
  describe('API Key Authentication', () => {
    it('should reject requests without API key', async () => {
      const res = await request(app)
        .get('/api/v1/mtg/cards')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('API key is required');
    });

    it('should reject requests with invalid API key', async () => {
      const res = await request(app)
        .get('/api/v1/mtg/cards')
        .set({ 'X-API-Key': 'invalid-key' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid API key');
    });

    it('should allow requests with valid API key', async () => {
      const res = await request(app)
        .get('/api/v1/mtg/cards')
        .set(authHeader)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should allow health check without API key', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('API is healthy');
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

    it('should handle SQL injection attempts in card name', async () => {
      const maliciousName = "'; DROP TABLE cards; --";

      const res = await request(app)
        .get(`/api/v1/mtg/cards/${encodeURIComponent(maliciousName)}/prices`)
        .set(authHeader)
        .expect(404);

      // Should return 404 (card not found) not a database error
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CARD_NOT_FOUND');

      // Verify database is still intact
      const cardsRes = await request(app).get('/api/v1/mtg/cards').set(authHeader).expect(200);
      expect(cardsRes.body.success).toBe(true);
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should return 404 for undefined routes', async () => {
      const res = await request(app)
        .get('/api/v1/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('should return 404 for non-MTG API routes', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set(authHeader)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });
});
