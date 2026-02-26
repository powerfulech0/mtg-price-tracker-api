#!/bin/bash
set -euo pipefail

# Log all output
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting user-data script at $(date)"

# Update system
dnf update -y

# Install Docker
dnf install -y docker
systemctl enable docker
systemctl start docker

# Install Docker Compose
DOCKER_COMPOSE_VERSION="v2.24.5"
curl -L "https://github.com/docker/compose/releases/download/$${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Add ec2-user to docker group
usermod -aG docker ec2-user

# Create application directory
APP_DIR="/opt/mtg-price-tracker"
mkdir -p "$APP_DIR/db"
cd "$APP_DIR"

# Create database initialization script
cat > "$APP_DIR/db/init.sql" << 'INITSQL'
-- MTG Card Price Tracking Database Initialization Script
-- PostgreSQL Schema, Indexes, Triggers, and Functions

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    description TEXT DEFAULT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT price_range CHECK (price >= 0 AND price <= 999999.99)
);

-- Create indexes for mtg_price_history performance optimization
CREATE INDEX idx_mtg_price_history_card_id ON mtg_price_history(card_id);
CREATE INDEX idx_mtg_price_history_recorded_at ON mtg_price_history(recorded_at DESC);
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
INITSQL

# Create environment file
cat > "$APP_DIR/.env" << EOF
DOCKER_IMAGE=${docker_image}
DB_PASSWORD=${db_password}
API_KEYS=${api_keys}
EOF

# Create docker-compose file
cat > "$APP_DIR/docker-compose.yml" << 'COMPOSEFILE'
services:
  postgres:
    image: postgres:18-alpine
    container_name: mtg-postgres
    environment:
      POSTGRES_USER: mtg_user
      POSTGRES_PASSWORD: $${DB_PASSWORD}
      POSTGRES_DB: mtg_price_tracker
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mtg_user -d mtg_price_tracker"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - mtg_network

  app:
    image: $${DOCKER_IMAGE}
    container_name: mtg-app
    ports:
      - "80:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: mtg_user
      DB_PASSWORD: $${DB_PASSWORD}
      DB_NAME: mtg_price_tracker
      API_KEYS: $${API_KEYS}
      CORS_ORIGIN: "*"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - mtg_network

volumes:
  postgres_data:
    driver: local

networks:
  mtg_network:
    driver: bridge
COMPOSEFILE

# Create deployment script for future updates
cat > "$APP_DIR/deploy.sh" << 'DEPLOYSCRIPT'
#!/bin/bash
set -euo pipefail
cd /opt/mtg-price-tracker
docker-compose pull app
docker-compose up -d --no-deps app
docker image prune -f
DEPLOYSCRIPT
chmod +x "$APP_DIR/deploy.sh"

# Set ownership
chown -R ec2-user:ec2-user "$APP_DIR"

# Start containers
cd "$APP_DIR"
docker-compose up -d

# Enable automatic security updates
dnf install -y dnf-automatic
systemctl enable dnf-automatic-install.timer
systemctl start dnf-automatic-install.timer

echo "User-data script completed at $(date)"
