# Property Service (Go)

Microservice for managing real estate properties with PostgreSQL, Redis caching, and Kafka event streaming.

## Features

- **Property CRUD Operations** - Create, read, update, delete properties
- **Geospatial Queries** - Find nearby properties using PostGIS
- **Caching Layer** - Redis caching for improved performance
- **Event Streaming** - Kafka events for property lifecycle
- **Service Mesh** - Dapr integration for inter-service communication
- **Health Checks** - Kubernetes-ready health and readiness endpoints

## Architecture

```
┌─────────────┐
│   Gin HTTP  │
│   Server    │
└──────┬──────┘
       │
┌──────▼──────────────────────────────┐
│         Handler Layer                │
│  (HTTP Request/Response)             │
└──────┬──────────────────────────────┘
       │
┌──────▼──────────────────────────────┐
│        Service Layer                 │
│  (Business Logic + Events)           │
└──┬────┬────┬────────────────────────┘
   │    │    │
   │    │    └──────────┐
   │    │               │
┌──▼────▼──┐  ┌────────▼────┐  ┌─────▼─────┐
│PostgreSQL│  │    Redis    │  │   Kafka   │
│ +PostGIS │  │   (Cache)   │  │ (Events)  │
└──────────┘  └─────────────┘  └───────────┘
```

## Technology Stack

- **Language:** Go 1.21
- **Web Framework:** Gin
- **Database:** PostgreSQL with PostGIS
- **Cache:** Redis
- **Messaging:** Apache Kafka (Sarama client)
- **Service Mesh:** Dapr
- **Logging:** Uber Zap
- **Configuration:** Viper

## API Endpoints

### Properties

```
POST   /api/v1/properties          Create property
GET    /api/v1/properties          List properties (paginated)
GET    /api/v1/properties/:id      Get property by ID
PUT    /api/v1/properties/:id      Update property
DELETE /api/v1/properties/:id      Delete property (soft delete)
GET    /api/v1/properties/nearby   Get nearby properties (geospatial)
```

### Health Checks

```
GET    /health                     Health check
GET    /ready                      Readiness check
```

## Configuration

Environment variables:

```bash
# Server
PROPERTY_SERVER_PORT=:8080
PROPERTY_SERVER_MODE=release

# Database
PROPERTY_DATABASE_HOST=localhost
PROPERTY_DATABASE_PORT=5432
PROPERTY_DATABASE_USER=postgres
PROPERTY_DATABASE_PASSWORD=password
PROPERTY_DATABASE_DBNAME=realestate
PROPERTY_DATABASE_SSLMODE=disable

# Redis
PROPERTY_REDIS_HOST=localhost
PROPERTY_REDIS_PORT=6379
PROPERTY_REDIS_PASSWORD=
PROPERTY_REDIS_DB=0

# Kafka
PROPERTY_KAFKA_BROKERS=localhost:9092
PROPERTY_KAFKA_TOPIC=property-events
PROPERTY_KAFKA_GROUPID=property-service

# Dapr
PROPERTY_DAPR_HTTPPORT=3500
PROPERTY_DAPR_GRPCPORT=50001
```

## Running Locally

### Prerequisites

- Go 1.21+
- PostgreSQL with PostGIS extension
- Redis
- Kafka (optional for local development)

### Setup

1. Install dependencies:
```bash
go mod download
```

2. Set up PostgreSQL with PostGIS:
```sql
CREATE DATABASE realestate;
\c realestate
CREATE EXTENSION postgis;

CREATE TABLE properties (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(50) NOT NULL,
    listing_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    price BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    square_feet INTEGER,
    lot_size INTEGER,
    year_built INTEGER,
    parking INTEGER,
    features JSONB,
    amenities JSONB,
    images JSONB,
    virtual_tour_url VARCHAR(500),
    owner_id UUID NOT NULL,
    agent_id UUID,
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP
);

CREATE INDEX idx_properties_location ON properties USING GIST (ST_MakePoint(longitude, latitude));
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_owner ON properties(owner_id);
```

3. Run the service:
```bash
go run cmd/server/main.go
```

## Building

### Local Build
```bash
go build -o property-service ./cmd/server
```

### Docker Build
```bash
docker build -t property-service:latest .
```

## Testing

Run tests:
```bash
go test ./...
```

Run tests with coverage:
```bash
go test -cover ./...
```

## Kafka Events

The service publishes the following events to Kafka:

### property.created
```json
{
  "event_type": "property.created",
  "property_id": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "user_id": "uuid",
  "data": { /* property object */ }
}
```

### property.updated
```json
{
  "event_type": "property.updated",
  "property_id": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "user_id": "uuid",
  "data": { /* updated property object */ }
}
```

### property.deleted
```json
{
  "event_type": "property.deleted",
  "property_id": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "user_id": "uuid",
  "data": null
}
```

### property.viewed
```json
{
  "event_type": "property.viewed",
  "property_id": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "user_id": "uuid",
  "data": null
}
```

## Deployment

See `deployments/kubernetes/` for Kubernetes manifests.

## License

Proprietary - Real Estate Platform
