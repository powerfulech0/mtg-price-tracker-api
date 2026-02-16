# Tasks API - Secure CRUD Application

A production-ready Tasks/Todos CRUD API built with Node.js, Express, PostgreSQL, and Docker. Features comprehensive security implementations including input validation, rate limiting, SQL injection prevention, and XSS protection.

**NEW:** MTG Card Price History Tracking - Track Magic: The Gathering card prices with Scryfall API integration!

## Features

- **CRUD Operations**: Complete Create, Read, Update, Delete functionality for tasks
- **MTG Price Tracking**:
  - Fetch current card prices from Scryfall API
  - Track historical price data
  - Price statistics (average, min, max)
  - Support for multiple price sources (Scryfall, TCGPlayer, manual)
- **Advanced Filtering**: Filter by status, priority, price source, date ranges with pagination support
- **Security-First Design**:
  - Input validation & sanitization (XSS prevention)
  - Rate limiting (DDoS protection)
  - Helmet.js security headers (15+ headers)
  - SQL injection prevention (parameterized queries)
  - CORS configuration
- **External API Integration**: Scryfall API with caching and rate limiting
- **Containerized**: Docker + Docker Compose for easy deployment
- **Database**: PostgreSQL with proper indexing and constraints
- **Error Handling**: Centralized error handling with detailed logging
- **Testing**: Comprehensive integration tests with Jest

## Technology Stack

- **Runtime**: Node.js 25.1.0
- **Framework**: Express.js
- **Database**: PostgreSQL 18.1
- **Containerization**: Docker & Docker Compose
- **Security**: Helmet.js, express-rate-limit, express-validator
- **External APIs**: Axios (Scryfall API integration)
- **Testing**: Jest, Supertest

## Project Structure

```
tasks-api/
├── src/
│   ├── server.js              # Entry point
│   ├── app.js                 # Express configuration
│   ├── config/
│   │   ├── database.js        # PostgreSQL connection
│   │   └── security.js        # Security configurations
│   ├── routes/                # API routes
│   │   ├── tasks.js           # Tasks endpoints
│   │   └── mtg.js             # MTG card price endpoints
│   ├── controllers/           # Business logic
│   │   ├── tasks.controller.js
│   │   └── mtg.controller.js
│   ├── models/                # Data access layer
│   │   ├── tasks.model.js
│   │   └── mtg.model.js
│   ├── services/              # External API integrations
│   │   └── scryfall.service.js
│   ├── middleware/            # Custom middleware
│   ├── validators/            # Input validation
│   │   ├── tasks.validator.js
│   │   └── mtg.validator.js
│   └── utils/                 # Utilities
├── db/
│   └── init.sql               # Database schema (tasks + MTG tables)
├── tests/
│   └── integration/           # API tests
├── Dockerfile                 # Multi-stage build
└── docker-compose.yml         # Container orchestration
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**:
```bash
cd /home/grearden/Development/tasks-api
```

2. **Configure environment variables**:
```bash
cp .env.example .env
# Edit .env with your configurations
```

3. **Build and start containers**:
```bash
docker compose up -d --build
```

4. **Verify deployment**:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2026-02-16T12:00:00.000Z",
  "environment": "development"
}
```

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Endpoints

#### 1. Get All Tasks
```http
GET /api/v1/tasks
```

**Query Parameters**:
- `status` (optional): `pending` | `in_progress` | `completed`
- `priority` (optional): `low` | `medium` | `high`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Example**:
```bash
curl "http://localhost:3000/api/v1/tasks?status=pending&priority=high&page=1&limit=10"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Setup development environment",
      "description": "Install Node.js, PostgreSQL, and Docker",
      "status": "completed",
      "priority": "high",
      "due_date": "2026-02-10T10:00:00.000Z",
      "created_at": "2026-02-16T12:00:00.000Z",
      "updated_at": "2026-02-16T12:00:00.000Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

#### 2. Get Task by ID
```http
GET /api/v1/tasks/:id
```

**Example**:
```bash
curl http://localhost:3000/api/v1/tasks/1
```

#### 3. Create Task
```http
POST /api/v1/tasks
```

**Body**:
```json
{
  "title": "New Task",
  "description": "Task description",
  "status": "pending",
  "priority": "medium",
  "due_date": "2026-03-01T10:00:00Z"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project documentation",
    "description": "Write comprehensive README and API docs",
    "status": "pending",
    "priority": "high",
    "due_date": "2026-03-01T10:00:00Z"
  }'
```

#### 4. Update Task (Full)
```http
PUT /api/v1/tasks/:id
```

**Body**: All fields required
```json
{
  "title": "Updated Task",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high",
  "due_date": "2026-03-01T10:00:00Z"
}
```

#### 5. Update Task (Partial)
```http
PATCH /api/v1/tasks/:id
```

**Body**: At least one field required
```json
{
  "status": "completed"
}
```

**Example**:
```bash
curl -X PATCH http://localhost:3000/api/v1/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

#### 6. Delete Task
```http
DELETE /api/v1/tasks/:id
```

**Example**:
```bash
curl -X DELETE http://localhost:3000/api/v1/tasks/1
```

---

## MTG Card Price Tracking API

Track Magic: The Gathering card prices with automatic Scryfall API integration.

### MTG Endpoints

#### 1. Get All Cards
```http
GET /api/v1/mtg/cards
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sort` (optional): Sort field - `id` | `card_name` | `created_at` | `updated_at` (default: created_at)
- `order` (optional): Sort order - `ASC` | `DESC` (default: DESC)

**Example**:
```bash
curl "http://localhost:3000/api/v1/mtg/cards?sort=card_name&order=ASC&limit=20"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "card_name": "Lightning Bolt",
      "scryfall_id": "77c6fa74-5543-42ac-9ead-0e890b188e99",
      "created_at": "2026-02-16T16:27:51.561Z",
      "updated_at": "2026-02-16T16:27:51.561Z",
      "latest_price": "2.69",
      "latest_price_source": "scryfall",
      "latest_price_date": "2026-02-16T16:27:51.565Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### 2. Fetch Card Price from Scryfall
```http
POST /api/v1/mtg/cards/:cardName/fetch-price
```

Fetches the current price from Scryfall API. Optionally saves to database.

**Body**:
```json
{
  "autoRecord": true
}
```

**Example**:
```bash
curl -X POST "http://localhost:3000/api/v1/mtg/cards/Lightning%20Bolt/fetch-price" \
  -H "Content-Type: application/json" \
  -d '{"autoRecord": true}'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "current_price": {
      "cardName": "Lightning Bolt",
      "scryfallId": "77c6fa74-5543-42ac-9ead-0e890b188e99",
      "price": 2.69,
      "currency": "USD",
      "source": "scryfall",
      "fetchedAt": "2026-02-16T16:27:51.551Z"
    },
    "saved": true,
    "saved_data": {
      "card": { "id": 1, "card_name": "Lightning Bolt", ... },
      "price_record": { "id": 1, "card_id": 1, "price": "2.69", ... }
    }
  },
  "message": "Price fetched and recorded successfully"
}
```

#### 3. Record Manual Price
```http
POST /api/v1/mtg/cards/:cardName/prices
```

Record a price manually or from other sources. Auto-creates card if it doesn't exist.

**Body**:
```json
{
  "price": 25000.00,
  "source": "manual",
  "recorded_at": "2026-02-16T12:00:00Z"
}
```

**Example**:
```bash
curl -X POST "http://localhost:3000/api/v1/mtg/cards/Black%20Lotus/prices" \
  -H "Content-Type: application/json" \
  -d '{"price": 25000.00, "source": "manual"}'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "card": {
      "id": 2,
      "card_name": "Black Lotus",
      "scryfall_id": "bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd",
      "created_at": "2026-02-16T16:31:36.904Z",
      "updated_at": "2026-02-16T16:31:36.904Z"
    },
    "price_record": {
      "id": 2,
      "card_id": 2,
      "price": "25000.00",
      "source": "manual",
      "recorded_at": "2026-02-16T16:31:36.908Z",
      "created_at": "2026-02-16T16:31:36.908Z",
      "updated_at": "2026-02-16T16:31:36.908Z"
    }
  },
  "message": "Price recorded successfully"
}
```

#### 4. Get Price History
```http
GET /api/v1/mtg/cards/:cardName/prices
```

Get historical price data with statistics.

**Query Parameters**:
- `source` (optional): Filter by source - `scryfall` | `tcgplayer` | `manual`
- `start_date` (optional): ISO 8601 date - filter prices after this date
- `end_date` (optional): ISO 8601 date - filter prices before this date
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Example**:
```bash
curl "http://localhost:3000/api/v1/mtg/cards/Lightning%20Bolt/prices?source=scryfall&limit=20"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "card": {
      "id": 1,
      "card_name": "Lightning Bolt",
      "scryfall_id": "77c6fa74-5543-42ac-9ead-0e890b188e99",
      "created_at": "2026-02-16T16:27:51.561Z",
      "updated_at": "2026-02-16T16:27:51.561Z"
    },
    "prices": [
      {
        "id": 1,
        "card_id": 1,
        "price": "2.69",
        "source": "scryfall",
        "recorded_at": "2026-02-16T16:27:51.565Z",
        "created_at": "2026-02-16T16:27:51.565Z",
        "updated_at": "2026-02-16T16:27:51.565Z"
      }
    ],
    "statistics": {
      "average_price": 2.69,
      "min_price": 2.69,
      "max_price": 2.69,
      "total_records": 1
    }
  },
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### MTG Validation Rules

- **cardName**: 1-255 characters, auto-sanitized to prevent XSS
- **price**: 0.00 - 999999.99, required for price recording
- **source**: `scryfall` | `tcgplayer` | `manual` (default: manual)
- **recorded_at**: ISO 8601 format, cannot be in the future, optional (defaults to current time)
- **autoRecord**: boolean, optional (default: false)

### MTG Rate Limiting

- **Scryfall API requests**: 8 requests per second (fetch-price endpoint)
- **Standard mutation limits**: 50 requests / 15 minutes per IP
- **General API limits**: 100 requests / 15 minutes per IP

---

### Validation Rules

- **title**: 1-255 characters, required
- **description**: Max 5000 characters, optional
- **status**: `pending` | `in_progress` | `completed`
- **priority**: `low` | `medium` | `high`
- **due_date**: ISO 8601 format, optional

## Security Features

### 1. Input Validation & Sanitization
- All inputs validated using express-validator
- XSS prevention through input escaping
- Length constraints enforced
- Type validation

### 2. Rate Limiting
- General API: 100 requests / 15 minutes per IP
- Mutations (POST/PUT/PATCH/DELETE): 50 requests / 15 minutes
- Health check: 60 requests / minute
- Scryfall API: 8 requests / second (external API protection)

### 3. SQL Injection Prevention
- All queries use parameterized statements
- No string concatenation for SQL queries
- Database-level constraints as defense-in-depth

### 4. Security Headers (Helmet.js)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Removes X-Powered-By header

### 5. CORS Configuration
- Configurable allowed origins
- Credentials support
- Preflight caching

### 6. External API Security
- Scryfall API integration with rate limiting
- In-memory caching (1 hour for cards, 5 minutes for prices)
- Request timeout protection (10 seconds)
- Error handling for 404, 429, and network errors

## Testing

### Run Tests Locally
```bash
npm test
```

### Run Tests in Docker
```bash
docker compose exec app npm test
```

### Test Coverage
```bash
npm test -- --coverage
```

## Development

### Local Development (without Docker)

1. **Install PostgreSQL locally**

2. **Create database**:
```bash
psql -U postgres -f db/init.sql
```

3. **Update .env**:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=tasks_user
DB_PASSWORD=your_password
DB_NAME=tasks_db
```

4. **Install dependencies**:
```bash
npm install
```

5. **Start development server**:
```bash
npm run dev
```

### Docker Development

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f app

# Restart app service
docker compose restart app

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v
```

## Database Management

### Access PostgreSQL CLI
```bash
docker exec -it tasks_api_db psql -U tasks_user -d tasks_db
```

### Useful Commands
```sql
-- View all tables
\dt

-- Describe tasks table
\d tasks

-- Describe MTG tables
\d mtg_cards
\d mtg_price_history

-- View all tasks
SELECT * FROM tasks;

-- View all MTG cards with latest prices
SELECT
  c.card_name,
  p.price as latest_price,
  p.source,
  p.recorded_at
FROM mtg_cards c
LEFT JOIN LATERAL (
  SELECT price, source, recorded_at
  FROM mtg_price_history
  WHERE card_id = c.id
  ORDER BY recorded_at DESC
  LIMIT 1
) p ON true;

-- Get price statistics for a card
SELECT
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price,
  COUNT(*) as total_records
FROM mtg_price_history
WHERE card_id = 1;

-- Count tasks by status
SELECT status, COUNT(*) FROM tasks GROUP BY status;
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| PORT | Server port | 3000 |
| DB_HOST | Database host | postgres |
| DB_PORT | Database port | 5432 |
| DB_USER | Database user | tasks_user |
| DB_PASSWORD | Database password | (required) |
| DB_NAME | Database name | tasks_db |
| RATE_LIMIT_WINDOW_MS | Rate limit window | 900000 (15 min) |
| RATE_LIMIT_MAX_REQUESTS | Max requests | 100 |
| RATE_LIMIT_MUTATION_MAX | Max mutations | 50 |
| CORS_ORIGIN | Allowed origins | http://localhost:3000 |

## Security Testing

### Test Rate Limiting
```bash
# Send 150 requests rapidly
for i in {1..150}; do
  curl http://localhost:3000/api/v1/tasks &
done
```

### Test SQL Injection Prevention
```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Test OR 1=1--", "description": "DROP TABLE tasks--"}'
```

### Test XSS Sanitization
```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "<script>alert(\"XSS\")</script>"}'
```

### Verify Security Headers
```bash
curl -I http://localhost:3000/api/v1/tasks
```

### Test MTG Price Tracking

**Fetch card price from Scryfall**:
```bash
curl -X POST "http://localhost:3000/api/v1/mtg/cards/Lightning%20Bolt/fetch-price" \
  -H "Content-Type: application/json" \
  -d '{"autoRecord": true}'
```

**Record manual price**:
```bash
curl -X POST "http://localhost:3000/api/v1/mtg/cards/Black%20Lotus/prices" \
  -H "Content-Type: application/json" \
  -d '{"price": 25000.00, "source": "manual"}'
```

**Get price history**:
```bash
curl "http://localhost:3000/api/v1/mtg/cards/Lightning%20Bolt/prices?limit=10"
```

**Test Scryfall rate limiting** (should get 429 after 8 requests):
```bash
for i in {1..15}; do
  curl -X POST "http://localhost:3000/api/v1/mtg/cards/Test/fetch-price" \
    -H "Content-Type: application/json" \
    -d '{"autoRecord": false}' &
done
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker compose ps

# Check database logs
docker compose logs postgres

# Test database connection
docker compose exec postgres pg_isready -U tasks_user
```

### Application Not Starting
```bash
# Check application logs
docker compose logs app

# Verify environment variables
docker compose exec app env | grep DB_
```

### Port Already in Use
```bash
# Change PORT in .env file or stop conflicting service
lsof -ti:3000 | xargs kill -9
```

## Production Deployment

### Build Production Image
```bash
docker build --target production -t tasks-api:latest .
```

### Production Considerations
- Use strong database passwords
- Set NODE_ENV=production
- Configure HTTPS/TLS
- Use environment-specific CORS origins
- Set up database backups
- Configure logging to external service
- Use Redis for rate limiting (distributed systems)
- Set up monitoring and alerting

## License

ISC

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Support

For issues and questions, please open an issue on the repository.

---

**Built with security and scalability in mind**
