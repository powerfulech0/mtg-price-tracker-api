const mtgModel = require("../models/mtg.model");
const scryfallService = require("../services/scryfall.service");
const { AppError } = require("../middleware/errorHandler");

/**
 * MTG Controller
 * Business logic for MTG card price tracking operations
 */

/**
 * Record a card price
 * Creates the card if it doesn't exist (fetches from Scryfall)
 * POST /api/v1/mtg/cards/:cardName/prices
 */
const recordCardPrice = async (req, res) => {
  const { cardName } = req.params;
  const { price, source = "manual", recorded_at } = req.body;

  // Check if card exists
  let card = await mtgModel.getCardByName(cardName);

  // If card doesn't exist, fetch from Scryfall and create it
  if (!card) {
    const scryfallCard = await scryfallService.fetchCardByName(cardName);

    card = await mtgModel.createCard({
      card_name: scryfallCard.name,
      scryfall_id: scryfallCard.id,
    });
  }

  // Create price record
  const priceRecord = await mtgModel.createPriceRecord({
    card_id: card.id,
    price,
    source,
    recorded_at: recorded_at || new Date(),
  });

  res.status(201).json({
    success: true,
    data: {
      card,
      price_record: priceRecord,
    },
    message: "Price recorded successfully",
  });
};

/**
 * Fetch current price from Scryfall
 * Optionally save to database if autoRecord is true
 * POST /api/v1/mtg/cards/:cardName/fetch-price
 */
const fetchCardPriceFromScryfall = async (req, res) => {
  const { cardName } = req.params;
  const { autoRecord = false } = req.body;

  // Fetch price from Scryfall
  const priceData = await scryfallService.getCardPrice(cardName);

  let savedData = null;

  // Optionally save to database
  if (autoRecord) {
    // Check if card exists
    let card = await mtgModel.getCardByName(priceData.cardName);

    // If card doesn't exist, create it
    if (!card) {
      card = await mtgModel.createCard({
        card_name: priceData.cardName,
        scryfall_id: priceData.scryfallId,
      });
    }

    // Create price record
    const priceRecord = await mtgModel.createPriceRecord({
      card_id: card.id,
      price: priceData.price,
      source: "scryfall",
      recorded_at: new Date(),
    });

    savedData = {
      card,
      price_record: priceRecord,
    };
  }

  res.json({
    success: true,
    data: {
      current_price: priceData,
      saved: autoRecord,
      saved_data: savedData,
    },
    message: autoRecord
      ? "Price fetched and recorded successfully"
      : "Price fetched successfully",
  });
};

/**
 * Get price history for a card
 * GET /api/v1/mtg/cards/:cardName/prices
 */
const getPriceHistory = async (req, res) => {
  const { cardName } = req.params;
  const { source, start_date, end_date, page = 1, limit = 10 } = req.query;

  // Get card by name
  const card = await mtgModel.getCardByName(cardName);

  if (!card) {
    throw new AppError("Card not found", 404, "CARD_NOT_FOUND");
  }

  // Build filters object
  const filters = {};
  if (source) filters.source = source;
  if (start_date) filters.start_date = start_date;
  if (end_date) filters.end_date = end_date;

  // Calculate pagination
  const offset = (page - 1) * limit;

  // Fetch price history, count, and statistics in parallel
  const [priceHistory, totalCount, statistics] = await Promise.all([
    mtgModel.getPriceHistory(card.id, filters, limit, offset),
    mtgModel.getPriceHistoryCount(card.id, filters),
    mtgModel.getPriceStatistics(card.id, filters),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  res.json({
    success: true,
    data: {
      card,
      prices: priceHistory,
      statistics,
    },
    metadata: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: totalCount,
      totalPages,
    },
  });
};

/**
 * Get all cards with latest prices
 * GET /api/v1/mtg/cards
 */
const getAllCards = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = "created_at",
    order = "DESC",
  } = req.query;

  // Calculate pagination
  const offset = (page - 1) * limit;

  // Fetch cards with latest prices and total count
  const [cards, totalCount] = await Promise.all([
    mtgModel.getAllCards({}, limit, offset, sort, order),
    mtgModel.getCardsCount(),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  res.json({
    success: true,
    data: cards,
    metadata: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: totalCount,
      totalPages,
    },
  });
};

module.exports = {
  recordCardPrice,
  fetchCardPriceFromScryfall,
  getPriceHistory,
  getAllCards,
};
