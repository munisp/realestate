# API Contracts & Integration Points

This document defines the API contracts and integration points between microservices in the Real Estate Platform.

## Table of Contents

1. [Service Overview](#service-overview)
2. [Property Service API](#property-service-api)
3. [Valuation Service API](#valuation-service-api)
4. [Event Schemas](#event-schemas)
5. [Service Communication](#service-communication)
6. [Error Handling](#error-handling)

---

## Service Overview

### Microservices Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                          │
│                   (APISIX / Nginx Ingress)                  │
└───────┬─────────────────────────────────────────┬───────────┘
        │                                         │
┌───────▼──────────┐                    ┌────────▼────────────┐
│ Property Service │                    │ Valuation Service   │
│      (Go)        │                    │     (Python)        │
│                  │                    │                     │
│ - CRUD Ops       │                    │ - ML Inference      │
│ - Geospatial     │                    │ - CMA Analysis      │
│ - Search         │                    │ - Market Trends     │
└───────┬──────────┘                    └────────┬────────────┘
        │                                        │
        │          ┌─────────────┐              │
        └──────────►    Kafka    ◄──────────────┘
                   │   Events    │
                   └─────────────┘
```

### Service Responsibilities

| Service | Technology | Responsibilities |
|---------|-----------|------------------|
| Property Service | Go + Gin | Property CRUD, geospatial queries, search, caching |
| Valuation Service | Python + FastAPI | ML valuation, CMA, market analysis |
| Frontend | React + tRPC | User interface, authentication |

---

## Property Service API

**Base URL:** `http://property-service:8080/api/v1`

### Endpoints

#### Create Property

```http
POST /properties
Content-Type: application/json
X-User-ID: {user_id}

{
  "title": "Beautiful Family Home",
  "description": "Spacious 3-bedroom home in quiet neighborhood",
  "property_type": "house",
  "listing_type": "sale",
  "price": 450000,
  "currency": "USD",
  "address_line1": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "postal_code": "94102",
  "country": "USA",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "bedrooms": 3,
  "bathrooms": 2,
  "square_feet": 2000,
  "lot_size": 5000,
  "year_built": 1995,
  "parking": 2,
  "features": ["hardwood_floors", "updated_kitchen"],
  "amenities": ["pool", "gym"]
}
```

**Response:** `201 Created`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Beautiful Family Home",
  "status": "draft",
  "created_at": "2024-11-17T00:00:00Z",
  ...
}
```

#### Get Property

```http
GET /properties/{id}
```

**Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Beautiful Family Home",
  "status": "active",
  "price": 450000,
  "view_count": 42,
  ...
}
```

#### List Properties

```http
GET /properties?limit=20&offset=0
```

**Response:** `200 OK`
```json
{
  "properties": [...],
  "limit": 20,
  "offset": 0
}
```

#### Update Property

```http
PUT /properties/{id}
Content-Type: application/json
X-User-ID: {user_id}

{
  "title": "Updated Title",
  "price": 475000,
  "status": "active"
}
```

**Response:** `200 OK`

#### Delete Property

```http
DELETE /properties/{id}
X-User-ID: {user_id}
```

**Response:** `200 OK`
```json
{
  "message": "property deleted successfully"
}
```

#### Get Nearby Properties

```http
GET /properties/nearby?lat=37.7749&lon=-122.4194&radius=10&limit=20
```

**Response:** `200 OK`
```json
{
  "properties": [...],
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radius_km": 10
}
```

### Health Checks

```http
GET /health
GET /ready
```

---

## Valuation Service API

**Base URL:** `http://valuation-service:8000/api/v1`

### Endpoints

#### Valuate Property

```http
POST /valuations
Content-Type: application/json

{
  "property_id": "123e4567-e89b-12d3-a456-426614174000",
  "property_type": "house",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "city": "San Francisco",
    "state": "CA",
    "postal_code": "94102",
    "country": "USA"
  },
  "features": {
    "bedrooms": 3,
    "bathrooms": 2,
    "square_feet": 2000,
    "lot_size": 5000,
    "year_built": 1995,
    "parking": 2,
    "features": ["hardwood_floors", "updated_kitchen"],
    "amenities": ["pool", "gym"]
  }
}
```

**Response:** `200 OK`
```json
{
  "property_id": "123e4567-e89b-12d3-a456-426614174000",
  "estimated_value": 1250000,
  "confidence_score": 0.87,
  "value_range_low": 1162500,
  "value_range_high": 1337500,
  "comparable_sales": [
    {
      "property_id": "...",
      "address": "123 Main St",
      "sale_price": 1200000,
      "sale_date": "2024-10-15T00:00:00Z",
      "distance_km": 0.8,
      "similarity_score": 0.92,
      "bedrooms": 3,
      "bathrooms": 2,
      "square_feet": 2000
    }
  ],
  "market_trends": {
    "area": "San Francisco, CA",
    "median_price": 1300000,
    "price_change_1m": 1.2,
    "price_change_3m": 3.5,
    "price_change_1y": 8.7,
    "inventory_level": "low",
    "days_on_market": 18,
    "price_per_sqft": 625
  },
  "valuation_date": "2024-11-17T00:00:00Z",
  "model_version": "v1.0.0"
}
```

#### Batch Valuate

```http
POST /valuations/batch
Content-Type: application/json

[
  { /* valuation request 1 */ },
  { /* valuation request 2 */ },
  ...
]
```

**Response:** `200 OK`
```json
[
  { /* valuation result 1 */ },
  { /* valuation result 2 */ },
  ...
]
```

### Health Checks

```http
GET /api/v1/valuations/health
GET /api/v1/valuations/ready
```

---

## Event Schemas

### Kafka Topics

| Topic | Producer | Consumers | Purpose |
|-------|----------|-----------|---------|
| `property-events` | Property Service | Valuation Service, Analytics | Property lifecycle events |
| `valuation-events` | Valuation Service | Property Service, Analytics | Valuation completion events |

### Property Events

#### property.created

```json
{
  "event_type": "property.created",
  "property_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-11-17T00:00:00Z",
  "user_id": "user-uuid",
  "data": {
    /* full property object */
  }
}
```

#### property.updated

```json
{
  "event_type": "property.updated",
  "property_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-11-17T00:00:00Z",
  "user_id": "user-uuid",
  "data": {
    /* updated property object */
  }
}
```

#### property.deleted

```json
{
  "event_type": "property.deleted",
  "property_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-11-17T00:00:00Z",
  "user_id": "user-uuid",
  "data": null
}
```

#### property.viewed

```json
{
  "event_type": "property.viewed",
  "property_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-11-17T00:00:00Z",
  "user_id": "user-uuid",
  "data": null
}
```

### Valuation Events

#### valuation.completed

```json
{
  "event_type": "valuation.completed",
  "property_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-11-17T00:00:00Z",
  "data": {
    "estimated_value": 1250000,
    "confidence_score": 0.87,
    "model_version": "v1.0.0"
  }
}
```

---

## Service Communication

### Synchronous Communication (HTTP)

Services communicate via HTTP for request-response patterns:

1. **Frontend → Property Service**: Property CRUD operations
2. **Frontend → Valuation Service**: Valuation requests
3. **Property Service → Valuation Service**: Automatic valuation on property creation

### Asynchronous Communication (Kafka)

Services publish events for:

1. **Property Lifecycle**: Created, updated, deleted, viewed
2. **Valuation Completion**: ML inference results
3. **Analytics**: All events consumed by analytics service

### Service Discovery

- **Kubernetes**: Services discovered via DNS (e.g., `property-service:8080`)
- **Dapr** (optional): Service invocation via Dapr sidecar

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service down |

### Retry Strategy

- **Transient Errors**: Exponential backoff (1s, 2s, 4s, 8s)
- **Circuit Breaker**: Open after 5 consecutive failures
- **Timeout**: 30s for HTTP requests, 5s for health checks

---

## Authentication & Authorization

### JWT Tokens

```http
Authorization: Bearer {jwt_token}
```

### User Context Header

```http
X-User-ID: {user_uuid}
```

### Service-to-Service Auth

- **mTLS**: Mutual TLS for service communication
- **Dapr**: Automatic mTLS via Dapr sidecar

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Property CRUD | 100 req/min | Per user |
| Property Search | 50 req/min | Per user |
| Valuation | 10 req/min | Per user |
| Batch Valuation | 2 req/min | Per user |

---

## Versioning

- **URL Versioning**: `/api/v1/`, `/api/v2/`
- **Header Versioning**: `Accept: application/vnd.realestate.v1+json`
- **Backward Compatibility**: Maintain v1 for 6 months after v2 release

---

## Monitoring & Observability

### Metrics

- **Request Rate**: Requests per second
- **Error Rate**: Errors per second
- **Latency**: P50, P95, P99 response times
- **Saturation**: CPU, memory, disk usage

### Tracing

- **Distributed Tracing**: Jaeger/Zipkin
- **Trace ID**: `X-Trace-ID` header propagated across services

### Logging

- **Structured Logging**: JSON format
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Correlation ID**: `X-Request-ID` for request tracking

---

## SLA & Performance

| Service | Availability | P95 Latency | Throughput |
|---------|-------------|-------------|------------|
| Property Service | 99.9% | < 100ms | 1000 req/s |
| Valuation Service | 99.5% | < 500ms | 100 req/s |

---

## Contact

For API questions or integration support:
- **Slack**: #platform-api
- **Email**: api-support@realestate.example.com
- **Docs**: https://docs.realestate.example.com
