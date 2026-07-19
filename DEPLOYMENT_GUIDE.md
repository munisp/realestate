# Deployment Guide

Complete guide for deploying the Next-Generation Real Estate Platform with all microservices, middleware, and infrastructure components.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Service Architecture](#service-architecture)
5. [Configuration](#configuration)
6. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
7. [Scaling](#scaling)

---

## Prerequisites

### Required Software

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Python** >= 3.9 (for migration scripts)
- **Node.js** >= 18 (for TypeScript app)
- **pnpm** >= 8.0

### System Requirements

- **CPU**: 8+ cores recommended
- **RAM**: 16GB+ recommended
- **Disk**: 50GB+ free space
- **Network**: Open ports 3000-9180

---

## Quick Start

```bash
# 1. Clone and navigate to project
cd /home/ubuntu/realestate-platform

# 2. Deploy all infrastructure
./scripts/deploy-infrastructure.sh

# 3. Migrate geospatial data
python3 ./scripts/migrate-geospatial.py

# 4. Deploy APIsix gateway
docker-compose up -d apisix etcd
./scripts/configure-apisix.sh

# 5. Start TypeScript app
pnpm install
pnpm dev
```

Your platform is now running at:
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:9080
- **Admin API**: http://localhost:9180

---

## Step-by-Step Deployment

### Step 1: Infrastructure Deployment

Deploy core services (MySQL, PostgreSQL, Redis, Kafka) and all microservices.

```bash
cd /home/ubuntu/realestate-platform
./scripts/deploy-infrastructure.sh
```

**What this does:**
1. Starts MySQL database
2. Starts PostgreSQL with PostGIS extension
3. Starts Redis cache
4. Starts Kafka + Zookeeper
5. Deploys Python AI services (ML valuation, OCR, fraud detection)
6. Deploys Go microservices (payment, notification, image)
7. Verifies all services are healthy

**Expected output:**
```
=========================================
✓ All services deployed successfully!
=========================================

Service Endpoints:
  MySQL:                localhost:3306
  PostgreSQL (PostGIS): localhost:5432
  Redis:                localhost:6379
  Kafka:                localhost:9092
  ML Valuation:         http://localhost:5000
  OCR Service:          http://localhost:5001
  Fraud Detection:      http://localhost:5002
  ...
```

**Verify deployment:**
```bash
docker-compose ps
```

All services should show status "Up" or "healthy".

---

### Step 2: Geospatial Data Migration

Migrate property data from MySQL to PostGIS with H3 spatial indexing.

```bash
# Install Python dependencies
pip3 install mysql-connector-python psycopg2-binary h3 requests

# Run migration
python3 ./scripts/migrate-geospatial.py
```

**What this does:**
1. Connects to MySQL and PostgreSQL
2. Enables PostGIS extensions
3. Creates spatial tables with indexes
4. Fetches all properties from MySQL
5. Calculates H3 indexes for each property
6. Bulk inserts into PostGIS
7. Indexes properties in geospatial service
8. Generates migration statistics

**Expected output:**
```
==================================================
Geospatial Data Migration
==================================================

✓ Connected to MySQL
✓ Connected to PostgreSQL
✓ PostGIS extensions enabled
✓ Properties table created
✓ Spatial indexes created
✓ Fetched 1,234 properties
✓ Migrated 1,234 properties
✓ Indexed 1,234 properties

==================================================
Migration Statistics
==================================================
Total properties: 1,234

Top 10 cities:
  San Francisco: 456
  Los Angeles: 321
  ...
```

---

### Step 3: APIsix Gateway Deployment

Deploy and configure the API gateway to route all traffic.

```bash
# Start APIsix and etcd
docker-compose up -d apisix etcd

# Wait for services to be ready
sleep 10

# Configure routes
./scripts/configure-apisix.sh
```

**What this does:**
1. Starts APIsix gateway
2. Starts etcd (configuration store)
3. Creates upstreams for all services
4. Configures routes with rate limiting
5. Sets up CORS policies
6. Enables Prometheus metrics

**Expected output:**
```
=========================================
✓ APIsix Gateway Configured Successfully
=========================================

Gateway Endpoints:
  Gateway:          http://localhost:9080
  Admin API:        http://localhost:9180
  Prometheus:       http://localhost:9091/apisix/prometheus/metrics

Route Examples:
  TypeScript API:   http://localhost:9080/api/...
  ML Valuation:     http://localhost:9080/ml/valuate
  OCR:              http://localhost:9080/ocr/process
  Geospatial:       http://localhost:9080/geo/search/nearby
```

---

### Step 4: TypeScript Application

Start the main TypeScript application.

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Or build for production
pnpm build
pnpm start
```

**Access the application:**
- Frontend: http://localhost:3000
- Via Gateway: http://localhost:9080

---

## Service Architecture

### Layer 1: API Gateway (APIsix)

**Port**: 9080  
**Purpose**: Unified entry point for all traffic

- Routes requests to appropriate services
- Rate limiting (100 req/min per route, 1000 req/min global)
- CORS handling
- Request ID tracking
- Prometheus metrics

### Layer 2: TypeScript Backend

**Port**: 3000  
**Stack**: Express + tRPC + TypeScript

- Main application logic
- tRPC API endpoints
- OAuth authentication
- Database operations (MySQL)
- Service orchestration

### Layer 3: Python AI Services

| Service | Port | Purpose |
|---------|------|---------|
| ML Valuation | 5000 | Property price prediction using ML models |
| OCR Service | 5001 | Document OCR and face verification |
| Fraud Detection | 5002 | Transaction fraud risk scoring |
| Geospatial Service | 5003 | Spatial queries, H3 indexing, heatmaps |

### Layer 4: Go Microservices

| Service | HTTP Port | gRPC Port | Purpose |
|---------|-----------|-----------|---------|
| Payment Service | 8080 | 50051 | Payment processing (Stripe, Flutterwave, Paystack) |
| Notification Service | 8081 | 50052 | Email/SMS notifications |
| Image Service | 8082 | 50053 | Image upload, processing, optimization |

### Layer 5: Data Layer

| Service | Port | Purpose |
|---------|------|---------|
| MySQL | 3306 | Primary database |
| PostgreSQL (PostGIS) | 5432 | Geospatial data |
| Redis | 6379 | Caching, sessions |
| Kafka | 9092 | Event streaming to lakehouse |

### Layer 6: Lakehouse (Optional)

| Component | Port | Purpose |
|-----------|------|---------|
| MinIO | 9000 | Object storage (S3-compatible) |
| Trino | 8080 | SQL query engine |
| Flink | 8081 | Real-time stream processing |
| Spark | 8080 | Batch processing |

---

## Configuration

### Environment Variables

Create `.env` file in project root:

```bash
# Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=realestate_user
MYSQL_PASSWORD=realestate_pass
MYSQL_DATABASE=realestate

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DATABASE=geospatial

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=realestate-platform

# Python Services
ML_VALUATION_SERVICE_URL=http://localhost:5000
OCR_SERVICE_URL=http://localhost:5001
FRAUD_DETECTION_SERVICE_URL=http://localhost:5002
GEOSPATIAL_SERVICE_URL=http://localhost:5003

# Go Services
PAYMENT_SERVICE_HOST=localhost
PAYMENT_SERVICE_PORT=50051
PAYMENT_SERVICE_HTTP_PORT=8080

# Lakehouse
LAKEHOUSE_API_URL=http://localhost:8000
TRINO_URL=http://localhost:8080

# Payment Providers
STRIPE_SECRET_KEY=sk_test_...
FLUTTERWAVE_SECRET_KEY=...
PAYSTACK_SECRET_KEY=...

# Email
SENDGRID_API_KEY=SG....
FROM_EMAIL=noreply@example.com
```

### Service-Specific Configuration

Each service has its own configuration file:

- **APIsix**: `apisix/config.yaml`
- **Kafka**: `kafka/server.properties`
- **Python Services**: `services/*/config.py`
- **Go Services**: `services/*/config.yaml`

---

## Monitoring & Troubleshooting

### Health Checks

```bash
# Check all services
docker-compose ps

# Check specific service
docker-compose ps ml-valuation-service

# View logs
docker-compose logs -f ml-valuation-service

# View all logs
docker-compose logs -f
```

### Prometheus Metrics

Access metrics at:
- **APIsix**: http://localhost:9091/apisix/prometheus/metrics
- **Application**: http://localhost:3000/metrics

### Common Issues

#### Service won't start

```bash
# Check logs
docker-compose logs <service-name>

# Restart service
docker-compose restart <service-name>

# Rebuild and restart
docker-compose up -d --build <service-name>
```

#### Database connection errors

```bash
# Check if database is running
docker-compose ps mysql postgres

# Test connection
docker-compose exec mysql mysql -u root -p
docker-compose exec postgres psql -U postgres
```

#### Kafka connection errors

```bash
# Check Kafka is running
docker-compose ps kafka zookeeper

# List topics
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# View consumer groups
docker-compose exec kafka kafka-consumer-groups --list --bootstrap-server localhost:9092
```

#### Geospatial queries failing

```bash
# Check PostGIS extension
docker-compose exec postgres psql -U postgres -d geospatial -c "SELECT PostGIS_version();"

# Check spatial indexes
docker-compose exec postgres psql -U postgres -d geospatial -c "\d properties"
```

---

## Scaling

### Horizontal Scaling

Scale individual services:

```bash
# Scale Python services
docker-compose up -d --scale ml-valuation-service=3

# Scale Go services
docker-compose up -d --scale payment-service=2
```

### Load Balancing

APIsix automatically load balances across multiple instances using round-robin.

### Database Scaling

- **Read Replicas**: Add MySQL read replicas for read-heavy workloads
- **Sharding**: Partition data by region or property type
- **Connection Pooling**: Configure in `server/db.ts`

### Caching Strategy

- **Redis**: Cache frequently accessed data (property listings, user sessions)
- **CDN**: Serve static assets through CDN
- **APIsix Cache**: Enable proxy-cache plugin for API responses

---

## Production Checklist

- [ ] Change all default passwords
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure log aggregation (ELK stack)
- [ ] Set up automated backups
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up CI/CD pipeline
- [ ] Configure secrets management
- [ ] Enable audit logging
- [ ] Set up alerting
- [ ] Configure auto-scaling
- [ ] Load test all endpoints
- [ ] Security audit
- [ ] Disaster recovery plan

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review documentation: `INFRASTRUCTURE_AUDIT.md`, `MICROSERVICES_INTEGRATION_GUIDE.md`
3. Check service health: `docker-compose ps`

---

**Last Updated**: November 17, 2025  
**Version**: 1.0
