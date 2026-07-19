# Microservices Architecture Inventory
**Platform**: Next-Generation Real Estate Platform  
**Date**: November 18, 2025

## Existing Microservices & Infrastructure

### Go Services (Production-Ready)
1. **property-service** - Property CRUD, geospatial queries, PostgreSQL + PostGIS
2. **user-service** - User management, Keycloak integration, JWT auth
3. **transaction-service** - Transaction orchestration with Temporal workflows
4. **developer-service** - Developer/builder management
5. **payment-service** - Payment processing (port 8081, gRPC 50051)
6. **notification-service** - Multi-channel notifications (port 8082)
7. **image-service** - Image processing and optimization (port 8083)
8. **tigerbeetle-service** - Ledger and accounting
9. **ipfs-service** - Decentralized document storage
10. **mojaloop-integration** - Cross-border payments

### Python Services (ML & AI)
1. **ml-valuation** - ML-based property valuation (port 5000)
2. **ocr-service** - Document OCR with GPU support (port 5001)
3. **fraud-detection** - Fraud detection ML models (port 5002)
4. **analytics-service** - Real-time analytics with ClickHouse
5. **geospatial-service** - Apache Sedona spatial queries
6. **valuation-service** - Ray cluster distributed inference
7. **recommendation-service** - Property recommendations

### Node.js/TypeScript Services
1. **booking-service** - Shortlet booking management
2. **crm-service** - Customer relationship management
3. **notification-service** - Email, SMS, push notifications
4. **search-service** - Elasticsearch integration
5. **tenant-service** - Multi-tenancy management
6. **verification-service** - KYC/KYB verification
7. **whatsapp-service** - WhatsApp Business API integration
8. **kyb-service** - Know Your Business workflows

### Infrastructure Components
1. **APISIX** - API Gateway (`/infrastructure/apisix`)
2. **Dapr** - Service mesh (`/infrastructure/dapr`)
3. **Fluvio** - Real-time streaming (`/infrastructure/fluvio`)
4. **ClickHouse** - Analytics database (`/infrastructure/clickhouse`)
5. **OpenSearch** - Search engine (`/infrastructure/opensearch`)
6. **TigerBeetle** - High-performance ledger (`/infrastructure/tigerbeetle`)
7. **Mojaloop** - Payment gateway (`/infrastructure/mojaloop`)
8. **GPU Clusters** - ML inference (`/infrastructure/gpu-clusters`)
9. **Security Stack** - Openappsec, Wazuh, OpenCTI (`/infrastructure/security`)

### Middleware & Messaging
1. **Kafka** - Event streaming (integrated in multiple services)
2. **Redis** - Caching and session management
3. **Temporal** - Workflow orchestration (`transaction-service/pkg/temporal`)
4. **Keycloak** - Identity and access management (`user-service/pkg/keycloak`)

### Existing Workflows (Temporal)
1. **Transaction Workflow** (`transaction-service/workflows/transaction_workflow.go`)
   - Property validation
   - Offer creation and acceptance
   - Escrow management
   - Document generation
   - Title transfer
   - Payment processing

### Docker Compose Services
- payment-service (8081, gRPC 50051)
- notification-service (8082)
- image-service (8083)
- ml-valuation (5000)
- ocr-service (5001)
- fraud-detection (5002)

## Service Communication Patterns

### Event-Driven (Kafka)
- Property updates → Analytics
- Bookings → Notifications
- Payments → Ledger updates
- Transactions → CRM

### Request-Response (gRPC)
- Payment processing
- User authentication
- Property queries

### Pub/Sub (Dapr)
- Cross-service notifications
- State management
- Secrets management

## Data Stores
1. **PostgreSQL** - Primary database (properties, users, transactions)
2. **PostGIS** - Geospatial data
3. **Redis** - Caching, sessions
4. **ClickHouse** - Analytics
5. **OpenSearch** - Full-text search
6. **TigerBeetle** - Financial ledger
7. **IPFS** - Document storage
8. **Delta Lake** - Data lakehouse

## Authentication & Authorization
1. **Keycloak** - OAuth2/OIDC provider
2. **Permify** - Fine-grained authorization
3. **JWT** - Token-based auth
4. **Manus OAuth** - Platform authentication

## Monitoring & Observability
1. **Jaeger** - Distributed tracing (Dapr integration)
2. **Prometheus** - Metrics collection
3. **Wazuh** - Security monitoring
4. **OpenCTI** - Threat intelligence

## Deployment Infrastructure
- Kubernetes manifests (`k8s/` in each service)
- Docker Compose for local development
- Production deployment scripts (`/deployment`)
- Staging environment (`/deployment/staging`)

## Integration Points

### Frontend → Backend
- tRPC API (monolith)
- REST APIs (microservices)
- WebSocket (real-time updates)

### Backend → Backend
- Kafka events
- gRPC calls
- Dapr service invocation
- Temporal workflows

### External Integrations
- Stripe (payments)
- WhatsApp Business API
- Google Maps API
- Mojaloop (payments)
- IPFS (storage)

## Service Mesh (Dapr)
- Service-to-service communication
- State management with Redis
- Pub/sub with Kafka
- Secrets management
- Resilience patterns (retry, circuit breaker)
- Observability with Jaeger

## API Gateway (APISIX)
- Routing rules for all microservices
- Rate limiting and throttling
- JWT authentication middleware
- CORS policies
- API versioning
- Request/response logging
- Health checks

## Ledger System (TigerBeetle)
- Double-entry accounting
- Payment tracking
- Escrow account management
- Transaction reconciliation
- Real-time balance queries
- Audit trail

## Streaming Analytics
- Kafka → Flink → ClickHouse pipeline
- Real-time property views
- Price change detection
- Market trend analysis
- User behavior analytics

## Security Stack
- **Openappsec** - Application security
- **Wazuh SIEM** - Security monitoring
- **OpenCTI** - Threat intelligence
- **OPA** - Policy enforcement
- **Kubecost** - Cost management

## Summary
- **23 Microservices** (10 Go, 7 Python, 6 Node.js)
- **9 Infrastructure Components**
- **4 Middleware Systems** (Kafka, Dapr, Temporal, Keycloak)
- **8 Data Stores**
- **Full observability stack**
- **Production-ready deployment**

All services have:
- ✅ Dockerfiles
- ✅ Kubernetes manifests
- ✅ Health checks
- ✅ Logging
- ✅ Metrics
- ✅ Tests
