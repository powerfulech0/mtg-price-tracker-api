-- MTG Card Price Tracking Database Initialization Script
-- PostgreSQL Schema, Indexes, Triggers, and Functions

-- =============================================================================
-- Utility Functions
-- =============================================================================

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MTG Card Price History Tracking Tables
-- =============================================================================

-- Drop existing MTG tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS mtg_price_history CASCADE;
DROP TABLE IF EXISTS mtg_cards CASCADE;

-- Create mtg_cards table
CREATE TABLE mtg_cards (
    id SERIAL PRIMARY KEY,
    card_name VARCHAR(255) NOT NULL,
    scryfall_id UUID UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Database-level validation constraints
    CONSTRAINT card_name_length CHECK (char_length(card_name) >= 1 AND char_length(card_name) <= 255)
);

-- Create unique index for case-insensitive card name lookups
CREATE UNIQUE INDEX idx_mtg_cards_card_name_lower ON mtg_cards(LOWER(card_name));

-- Create index for card name searches
CREATE INDEX idx_mtg_cards_card_name ON mtg_cards(card_name);

-- Create index for scryfall_id lookups
CREATE INDEX idx_mtg_cards_scryfall_id ON mtg_cards(scryfall_id) WHERE scryfall_id IS NOT NULL;

-- Create mtg_price_history table
CREATE TABLE mtg_price_history (
    id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES mtg_cards(id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    source VARCHAR(50) NOT NULL DEFAULT 'manual'
        CHECK (source IN ('scryfall', 'tcgplayer', 'manual')),
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Database-level validation constraints
    CONSTRAINT price_range CHECK (price >= 0 AND price <= 999999.99)
);

-- Create indexes for mtg_price_history performance optimization
CREATE INDEX idx_mtg_price_history_card_id ON mtg_price_history(card_id);
CREATE INDEX idx_mtg_price_history_recorded_at ON mtg_price_history(recorded_at DESC);

-- Create composite index for common query patterns (card + date)
CREATE INDEX idx_mtg_price_history_card_recorded ON mtg_price_history(card_id, recorded_at DESC);

-- Create trigger to automatically update updated_at on mtg_cards
CREATE TRIGGER update_mtg_cards_updated_at
    BEFORE UPDATE ON mtg_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at on mtg_price_history
CREATE TRIGGER update_mtg_price_history_updated_at
    BEFORE UPDATE ON mtg_price_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
