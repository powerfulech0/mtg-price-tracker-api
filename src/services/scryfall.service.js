/**
 * Scryfall API Service
 * Handles integration with Scryfall API for MTG card data and pricing
 * Implements rate limiting (125ms delay between requests) and in-memory caching
 */

const axios = require('axios');
const { AppError } = require('../middleware/errorHandler');

// Scryfall API configuration
const SCRYFALL_API_BASE = 'https://api.scryfall.com';
const RATE_LIMIT_DELAY = 125; // 125ms = ~8 requests per second
const CACHE_TTL_CARD = 60 * 60 * 1000; // 1 hour for card data
const CACHE_TTL_PRICE = 5 * 60 * 1000; // 5 minutes for prices

// In-memory cache
const cache = new Map();
let lastRequestTime = 0;

/**
 * Rate limiter - ensures we don't exceed Scryfall's rate limit
 * Implements a simple delay-based rate limiting strategy
 */
async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const delay = RATE_LIMIT_DELAY - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
}

/**
 * Cache management utilities
 */
function getCached(key) {
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  // Check if cache entry has expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

function setCache(key, data, ttl) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Fetch card data from Scryfall API by name
 * @param {string} cardName - The name of the card to fetch
 * @returns {Promise<Object>} Card data from Scryfall
 * @throws {AppError} If card not found or API error occurs
 */
async function fetchCardByName(cardName) {
  if (!cardName || typeof cardName !== 'string' || cardName.trim().length === 0) {
    throw new AppError('Card name is required', 400, 'INVALID_CARD_NAME');
  }

  const trimmedName = cardName.trim();
  const cacheKey = `card:${trimmedName.toLowerCase()}`;

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Apply rate limiting
  await rateLimit();

  try {
    const response = await axios.get(`${SCRYFALL_API_BASE}/cards/named`, {
      params: {
        fuzzy: trimmedName,
      },
      timeout: 10000, // 10 second timeout
    });

    const cardData = response.data;

    // Cache the result
    setCache(cacheKey, cardData, CACHE_TTL_CARD);

    return cardData;
  } catch (error) {
    // Handle Scryfall-specific errors
    if (error.response) {
      const status = error.response.status;
      const scryfallError = error.response.data;

      if (status === 404) {
        throw new AppError(`Card "${trimmedName}" not found`, 404, 'CARD_NOT_FOUND');
      }

      if (status === 429) {
        throw new AppError(
          'Rate limit exceeded for Scryfall API. Please try again later.',
          429,
          'RATE_LIMIT_EXCEEDED'
        );
      }

      throw new AppError(
        scryfallError.details || 'Error fetching card from Scryfall',
        status,
        'SCRYFALL_API_ERROR'
      );
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      throw new AppError('Request to Scryfall API timed out', 504, 'SCRYFALL_TIMEOUT');
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new AppError('Unable to connect to Scryfall API', 503, 'SCRYFALL_UNAVAILABLE');
    }

    // Re-throw AppErrors
    if (error instanceof AppError) {
      throw error;
    }

    // Generic error
    throw new AppError(
      'Unexpected error while fetching card data',
      500,
      'SCRYFALL_ERROR',
      error.message
    );
  }
}

/**
 * Get current USD price for a card
 * @param {string} cardName - The name of the card
 * @returns {Promise<Object>} Object containing card info and price
 * @throws {AppError} If card not found or price unavailable
 */
async function getCardPrice(cardName) {
  const cacheKey = `price:${cardName.toLowerCase()}`;

  // Check cache first (prices cached for shorter duration)
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch card data
  const cardData = await fetchCardByName(cardName);

  // Extract USD price
  const usdPrice = cardData.prices?.usd;

  if (!usdPrice) {
    throw new AppError(`Price not available for "${cardName}"`, 404, 'PRICE_NOT_AVAILABLE');
  }

  const result = {
    cardName: cardData.name,
    scryfallId: cardData.id,
    price: parseFloat(usdPrice),
    currency: 'USD',
    source: 'scryfall',
    fetchedAt: new Date().toISOString(),
  };

  // Cache the price
  setCache(cacheKey, result, CACHE_TTL_PRICE);

  return result;
}

/**
 * Clear all cached data (useful for testing)
 */
function clearCache() {
  cache.clear();
}

/**
 * Get cache statistics (useful for monitoring)
 */
function getCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.keys()),
  };
}

module.exports = {
  fetchCardByName,
  getCardPrice,
  clearCache,
  getCacheStats,
};
