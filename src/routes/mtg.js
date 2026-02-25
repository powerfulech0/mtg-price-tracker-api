const express = require('express');
const router = express.Router();
const mtgController = require('../controllers/mtg.controller');
const handleValidationErrors = require('../middleware/validation');
const { scryfallLimiter } = require('../middleware/rateLimiter');
const {
  recordPriceValidation,
  fetchPriceValidation,
  getPriceHistoryValidation,
  getAllCardsValidation,
} = require('../validators/mtg.validator');

/**
 * MTG Card Price Tracking Routes
 * All routes are prefixed with /api/v1/mtg
 */

/**
 * @route   GET /api/v1/mtg/cards
 * @desc    Get all cards with latest prices
 * @access  Public
 * @query   page, limit, sort, order
 */
router.get('/cards', getAllCardsValidation, handleValidationErrors, mtgController.getAllCards);

/**
 * @route   GET /api/v1/mtg/cards/:cardName/prices
 * @desc    Get price history for a card
 * @access  Public
 * @query   source, start_date, end_date, page, limit
 */
router.get(
  '/cards/:cardName/prices',
  getPriceHistoryValidation,
  handleValidationErrors,
  mtgController.getPriceHistory
);

/**
 * @route   POST /api/v1/mtg/cards/:cardName/prices
 * @desc    Record a price for a card (creates card if doesn't exist)
 * @access  Public
 */
router.post(
  '/cards/:cardName/prices',
  recordPriceValidation,
  handleValidationErrors,
  mtgController.recordCardPrice
);

/**
 * @route   POST /api/v1/mtg/cards/:cardName/fetch-price
 * @desc    Fetch current price from Scryfall API
 * @access  Public
 * @body    autoRecord (optional boolean)
 */
router.post(
  '/cards/:cardName/fetch-price',
  scryfallLimiter, // Apply Scryfall-specific rate limiter
  fetchPriceValidation,
  handleValidationErrors,
  mtgController.fetchCardPriceFromScryfall
);

module.exports = router;
