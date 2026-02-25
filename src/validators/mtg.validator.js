const { body, param, query } = require('express-validator');

/**
 * MTG Card Price Tracking - Input Validation and Sanitization
 * Using express-validator to prevent XSS and ensure data integrity
 */

// =============================================================================
// Reusable Validation Chains
// =============================================================================

const cardNameValidation = param('cardName')
  .trim()
  .notEmpty()
  .withMessage('Card name is required')
  .isLength({ min: 1, max: 255 })
  .withMessage('Card name must be between 1 and 255 characters')
  .escape(); // Prevent XSS attacks

const priceValidation = body('price')
  .trim()
  .notEmpty()
  .withMessage('Price is required')
  .isFloat({ min: 0, max: 999999.99 })
  .withMessage('Price must be a number between 0 and 999999.99')
  .toFloat();

const sourceValidation = body('source')
  .optional()
  .trim()
  .isIn(['scryfall', 'tcgplayer', 'manual'])
  .withMessage('Source must be one of: scryfall, tcgplayer, manual');

const recordedAtValidation = body('recorded_at')
  .optional()
  .trim()
  .isISO8601()
  .withMessage('recorded_at must be a valid ISO 8601 date')
  .toDate()
  .custom((value) => {
    if (value > new Date()) {
      throw new Error('recorded_at cannot be in the future');
    }
    return true;
  });

const autoRecordValidation = body('autoRecord')
  .optional()
  .isBoolean()
  .withMessage('autoRecord must be a boolean')
  .toBoolean();

// Query parameter validations for filtering
const sourceQueryValidation = query('source')
  .optional()
  .trim()
  .isIn(['scryfall', 'tcgplayer', 'manual'])
  .withMessage('Source must be one of: scryfall, tcgplayer, manual');

const startDateValidation = query('start_date')
  .optional()
  .trim()
  .isISO8601()
  .withMessage('start_date must be a valid ISO 8601 date')
  .toDate();

const endDateValidation = query('end_date')
  .optional()
  .trim()
  .isISO8601()
  .withMessage('end_date must be a valid ISO 8601 date')
  .toDate();

// Date range validation
const dateRangeValidation = query().custom((value, { req }) => {
  if (req.query.start_date && req.query.end_date) {
    const startDate = new Date(req.query.start_date);
    const endDate = new Date(req.query.end_date);

    if (startDate > endDate) {
      throw new Error('start_date cannot be after end_date');
    }
  }
  return true;
});

// Pagination validations
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

// Sort validations
const sortValidation = query('sort')
  .optional()
  .trim()
  .isIn(['id', 'card_name', 'created_at', 'updated_at'])
  .withMessage('Sort must be one of: id, card_name, created_at, updated_at');

const orderValidation = query('order')
  .optional()
  .trim()
  .isIn(['ASC', 'DESC', 'asc', 'desc'])
  .withMessage('Order must be either ASC or DESC');

// =============================================================================
// Validation Rule Sets for Different Endpoints
// =============================================================================

/**
 * POST /api/v1/mtg/cards/:cardName/prices
 * Record a price for a card (creates card if doesn't exist)
 */
const recordPriceValidation = [
  cardNameValidation,
  priceValidation,
  sourceValidation,
  recordedAtValidation,
];

/**
 * POST /api/v1/mtg/cards/:cardName/fetch-price
 * Fetch current price from Scryfall
 */
const fetchPriceValidation = [cardNameValidation, autoRecordValidation];

/**
 * GET /api/v1/mtg/cards/:cardName/prices
 * Get price history for a card
 */
const getPriceHistoryValidation = [
  cardNameValidation,
  sourceQueryValidation,
  startDateValidation,
  endDateValidation,
  dateRangeValidation,
  pageValidation,
  limitValidation,
];

/**
 * GET /api/v1/mtg/cards
 * Get all cards with latest prices
 */
const getAllCardsValidation = [pageValidation, limitValidation, sortValidation, orderValidation];

module.exports = {
  recordPriceValidation,
  fetchPriceValidation,
  getPriceHistoryValidation,
  getAllCardsValidation,
};
