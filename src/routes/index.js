const express = require('express');
const router = express.Router();
const tasksRoutes = require('./tasks');
const mtgRoutes = require('./mtg');
const { mutationLimiter } = require('../middleware/rateLimiter');

/**
 * API Routes Aggregator
 * Combines all route modules
 */

// Apply mutation rate limiter to all routes (will skip GET requests)
router.use(mutationLimiter);

// Mount tasks routes
router.use('/tasks', tasksRoutes);

// Mount MTG routes
router.use('/mtg', mtgRoutes);

module.exports = router;
