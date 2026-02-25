const { query } = require('../config/database');

/**
 * MTG Model
 * Data access layer for MTG cards and price history
 * All queries use parameterized statements to prevent SQL injection
 */

// =============================================================================
// Card Operations
// =============================================================================

/**
 * Create a new MTG card
 * @param {Object} cardData - Card data
 * @returns {Promise<Object>} Created card
 */
const createCard = async (cardData) => {
  const { card_name, scryfall_id } = cardData;

  const queryText = `
    INSERT INTO mtg_cards (card_name, scryfall_id)
    VALUES ($1, $2)
    RETURNING *
  `;

  const params = [card_name, scryfall_id || null];

  const result = await query(queryText, params);
  return result.rows[0];
};

/**
 * Get card by name (case-insensitive)
 * @param {String} cardName - Card name to search for
 * @returns {Promise<Object|null>} Card object or null if not found
 */
const getCardByName = async (cardName) => {
  const queryText = 'SELECT * FROM mtg_cards WHERE LOWER(card_name) = LOWER($1)';
  const result = await query(queryText, [cardName]);
  return result.rows[0] || null;
};

/**
 * Get card by ID
 * @param {Number} id - Card ID
 * @returns {Promise<Object|null>} Card object or null if not found
 */
const getCardById = async (id) => {
  const queryText = 'SELECT * FROM mtg_cards WHERE id = $1';
  const result = await query(queryText, [id]);
  return result.rows[0] || null;
};

/**
 * Get all cards with optional filtering and pagination
 * @param {Object} filters - Filter criteria
 * @param {Number} limit - Number of items per page
 * @param {Number} offset - Number of items to skip
 * @param {String} sortBy - Field to sort by (default: created_at)
 * @param {String} order - Sort order (ASC or DESC)
 * @returns {Promise<Array>} Array of cards with latest prices
 */
const getAllCards = async (
  _filters = {},
  limit = 10,
  offset = 0,
  sortBy = 'created_at',
  order = 'DESC'
) => {
  // Validate sort field to prevent SQL injection
  const allowedSortFields = ['id', 'card_name', 'created_at', 'updated_at'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const queryText = `
    SELECT
      c.*,
      p.price as latest_price,
      p.source as latest_price_source,
      p.recorded_at as latest_price_date
    FROM mtg_cards c
    LEFT JOIN LATERAL (
      SELECT price, source, recorded_at
      FROM mtg_price_history
      WHERE card_id = c.id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) p ON true
    ORDER BY c.${sortField} ${sortOrder}
    LIMIT $1 OFFSET $2
  `;

  const result = await query(queryText, [limit, offset]);
  return result.rows;
};

/**
 * Get total count of cards
 * @returns {Promise<Number>} Total count
 */
const getCardsCount = async () => {
  const queryText = 'SELECT COUNT(*) FROM mtg_cards';
  const result = await query(queryText);
  return parseInt(result.rows[0].count, 10);
};

// =============================================================================
// Price History Operations
// =============================================================================

/**
 * Create a new price history record
 * @param {Object} priceData - Price data
 * @returns {Promise<Object>} Created price record
 */
const createPriceRecord = async (priceData) => {
  const { card_id, price, source, recorded_at } = priceData;

  const queryText = `
    INSERT INTO mtg_price_history (card_id, price, source, recorded_at)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const params = [card_id, price, source || 'manual', recorded_at || new Date()];

  const result = await query(queryText, params);
  return result.rows[0];
};

/**
 * Get price history for a card with optional filtering and pagination
 * @param {Number} cardId - Card ID
 * @param {Object} filters - Filter criteria (source, start_date, end_date)
 * @param {Number} limit - Number of items per page
 * @param {Number} offset - Number of items to skip
 * @returns {Promise<Array>} Array of price records
 */
const getPriceHistory = async (cardId, filters = {}, limit = 10, offset = 0) => {
  let queryText = 'SELECT * FROM mtg_price_history WHERE card_id = $1';
  const params = [cardId];
  let paramIndex = 2;

  // Add filters using parameterized queries
  if (filters.source) {
    queryText += ` AND source = $${paramIndex}`;
    params.push(filters.source);
    paramIndex++;
  }

  if (filters.start_date) {
    queryText += ` AND recorded_at >= $${paramIndex}`;
    params.push(filters.start_date);
    paramIndex++;
  }

  if (filters.end_date) {
    queryText += ` AND recorded_at <= $${paramIndex}`;
    params.push(filters.end_date);
    paramIndex++;
  }

  // Add ordering and pagination
  queryText += ` ORDER BY recorded_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Get count of price history records for a card with optional filtering
 * @param {Number} cardId - Card ID
 * @param {Object} filters - Filter criteria (source, start_date, end_date)
 * @returns {Promise<Number>} Total count
 */
const getPriceHistoryCount = async (cardId, filters = {}) => {
  let queryText = 'SELECT COUNT(*) FROM mtg_price_history WHERE card_id = $1';
  const params = [cardId];
  let paramIndex = 2;

  if (filters.source) {
    queryText += ` AND source = $${paramIndex}`;
    params.push(filters.source);
    paramIndex++;
  }

  if (filters.start_date) {
    queryText += ` AND recorded_at >= $${paramIndex}`;
    params.push(filters.start_date);
    paramIndex++;
  }

  if (filters.end_date) {
    queryText += ` AND recorded_at <= $${paramIndex}`;
    params.push(filters.end_date);
    paramIndex++;
  }

  const result = await query(queryText, params);
  return parseInt(result.rows[0].count, 10);
};

/**
 * Get latest price for a card
 * @param {Number} cardId - Card ID
 * @returns {Promise<Object|null>} Latest price record or null
 */
const getLatestPrice = async (cardId) => {
  const queryText = `
    SELECT * FROM mtg_price_history
    WHERE card_id = $1
    ORDER BY recorded_at DESC
    LIMIT 1
  `;

  const result = await query(queryText, [cardId]);
  return result.rows[0] || null;
};

/**
 * Get price statistics for a card
 * @param {Number} cardId - Card ID
 * @param {Object} filters - Filter criteria (source, start_date, end_date)
 * @returns {Promise<Object>} Price statistics (avg, min, max)
 */
const getPriceStatistics = async (cardId, filters = {}) => {
  let queryText = `
    SELECT
      AVG(price) as average_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      COUNT(*) as total_records
    FROM mtg_price_history
    WHERE card_id = $1
  `;

  const params = [cardId];
  let paramIndex = 2;

  if (filters.source) {
    queryText += ` AND source = $${paramIndex}`;
    params.push(filters.source);
    paramIndex++;
  }

  if (filters.start_date) {
    queryText += ` AND recorded_at >= $${paramIndex}`;
    params.push(filters.start_date);
    paramIndex++;
  }

  if (filters.end_date) {
    queryText += ` AND recorded_at <= $${paramIndex}`;
    params.push(filters.end_date);
    paramIndex++;
  }

  const result = await query(queryText, params);
  const stats = result.rows[0];

  return {
    average_price: stats.average_price ? parseFloat(stats.average_price) : null,
    min_price: stats.min_price ? parseFloat(stats.min_price) : null,
    max_price: stats.max_price ? parseFloat(stats.max_price) : null,
    total_records: parseInt(stats.total_records, 10),
  };
};

module.exports = {
  // Card operations
  createCard,
  getCardByName,
  getCardById,
  getAllCards,
  getCardsCount,

  // Price operations
  createPriceRecord,
  getPriceHistory,
  getPriceHistoryCount,
  getLatestPrice,
  getPriceStatistics,
};
