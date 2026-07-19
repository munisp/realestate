# Production Infrastructure - Critical Priority Implementation

Complete enterprise-grade infrastructure for the Next-Generation Real Estate Platform with Keycloak, APISIX, OpenAppSec, Permify, PgBouncer, Redis, and microservices.

## Architecture Overview

The production infrastructure implements all Critical Priority improvements with enterprise-grade security, authentication, authorization, caching, and monitoring.

### Components

**Authentication & Identity Management**
- **Keycloak** - Enterprise SSO, OAuth2/OIDC, 2FA, social login
- **Auth Service (Go)** - Custom authentication microservice with session management

**API Gateway & Traffic Management**
- **APISIX** - High-performance API gateway with rate limiting, caching, load balancing
- **Etcd** - Distributed configuration store for APISIX

**Security & Protection**
- **OpenAppSec** - Web Application Firewall (WAF), DDoS protection, bot detection
- **Security Scanner (Python)** - Automated vulnerability scanning and compliance checking
- **Elasticsearch + Kibana** - Security event logging and analysis

**Authorization & Access Control**
- **Permify** - Fine-grained authorization with RBAC/ABAC
- **Authorization Schema** - Comprehensive permission model for all platform entities

**Database Optimization**
- **PgBouncer** - Connection pooling (1000 max connections, 25 pool size)
- **Read Replicas** - Configured for analytics and reporting queries

**Caching & Session Management**
- **Redis Cluster** - Master + 2 replicas with Sentinel for high availability
- **Redis Commander** - Web UI for cache management

**Monitoring & Observability**
- **Prometheus** - Metrics collection from all services
- **Grafana** - Visualization dashboards

## Quick Start

### Prerequisites

- Docker 24.0+ and Docker Compose 2.20+
- 16GB RAM minimum (32GB recommended)
- 100GB disk space

### Environment Variables

Create `.env` file in `infrastructure/` directory:

```bash
# Keycloak
KEYCLOAK_HOSTNAME=auth.yourdomain.com
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<strong-password>
KEYCLOAK_DB_PASSWORD=<strong-password>

# APISIX
APISIX_ADMIN_KEY=<generate-key>

# OpenAppSec
OPENAPPSEC_TOKEN=<get-from-openappsec.io>

# Permify
PERMIFY_DB_PASSWORD=<strong-password>

# Redis
REDIS_PASSWORD=<strong-password>

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Monitoring
GRAFANA_PASSWORD=<strong-password>
```

### Deployment

```bash
cd infrastructure/
docker-compose -f docker-compose.production.yml up -d
```

### Service Endpoints

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Keycloak | 8080 | http://localhost:8080 | Authentication & SSO |
| APISIX Gateway | 9080 | http://localhost:9080 | API Gateway |
| OpenAppSec | 80/443 | http://localhost | WAF & Security |
| Permify HTTP | 3476 | http://localhost:3476 | Authorization API |
| PgBouncer | 6432 | - | Database Pool |
| Redis Master | 6379 | - | Cache Master |
| Auth Service | 8081 | http://localhost:8081 | Custom Auth |
| Security Scanner | 8082 | http://localhost:8082 | Vulnerability Scanning |
| Prometheus | 9090 | http://localhost:9090 | Metrics |
| Grafana | 3001 | http://localhost:3001 | Dashboards |

## Go Microservices

### Authentication Service

Enterprise authentication service with Keycloak integration.

**Features**
- User registration and login
- OAuth2/OIDC integration
- 2FA (TOTP) support
- Session management
- Role-based access control

**API Endpoints**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/2fa/enable` - Enable 2FA
- `GET /api/v1/user/me` - Get current user

## Python Microservices

### Security Scanner Service

Automated security scanning and vulnerability detection.

**Features**
- Web application security scanning
- SQL injection detection
- XSS vulnerability detection
- CSRF protection checking
- SSL/TLS configuration checking
- Compliance checking (PCI-DSS, GDPR, HIPAA)

**API Endpoints**
- `POST /api/v1/scan` - Initiate security scan
- `POST /api/v1/compliance` - Check compliance
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## Security Configuration

### OpenAppSec WAF Rules

**Protection Features**
- OWASP Top 10 protection
- SQL injection blocking
- XSS prevention
- DDoS mitigation
- Bot detection
- Rate limiting (100 req/s, burst 200)

### Permify Authorization

Fine-grained authorization with comprehensive entity permissions.

**Supported Entities**
- Properties, Listings, Transactions
- Documents, Payments, Reviews
- Messages, Conversations
- Shortlets, Builder Projects

**Permission Types**
- View, Edit, Delete
- Create, Approve, Reject
- Share, Comment, Moderate

## Performance Optimization

### Database Connection Pooling

- **Max Client Connections**: 1000
- **Default Pool Size**: 25
- **Pool Mode**: Transaction

### Redis Caching Strategy

- **Max Memory**: 2GB per instance
- **Eviction Policy**: allkeys-lru
- **Replication**: 1 master + 2 replicas

### APISIX Rate Limiting

- **tRPC API**: 100 req/s, burst 50
- **Properties API**: 200 req/s, burst 100
- **Search API**: 50 req/s, burst 25

## Monitoring and Alerting

### Prometheus Metrics

**Key Metrics**
- Request rate and latency
- Error rates by endpoint
- Database connection pool usage
- Cache hit/miss ratios
- Security events and blocks

### Grafana Dashboards

- **System Overview**: CPU, memory, disk, network
- **API Gateway**: Request rates, latency, errors
- **Security**: WAF blocks, vulnerability scans
- **Database**: Connection pool, query performance
- **Cache**: Redis operations, memory usage

## Troubleshooting

### Check Service Health

```bash
# Check all services
docker-compose -f docker-compose.production.yml ps

# Check specific service logs
docker-compose -f docker-compose.production.yml logs -f keycloak
```

### Common Issues

**Keycloak not starting**
- Check database connection
- Verify KEYCLOAK_DB_PASSWORD
- Ensure port 8080 is available

**Redis connection refused**
- Verify REDIS_PASSWORD
- Check Redis master is running

## Security Best Practices

1. Change all default passwords
2. Enable HTTPS for all services
3. Rotate secrets regularly
4. Monitor security logs daily
5. Run security scans weekly
6. Update images monthly
7. Backup databases daily

## Cost Optimization

### Resource Requirements

**Minimum Production Setup**
- 4 CPU cores
- 16GB RAM
- 100GB SSD storage
- $150-200/month

**Recommended Production Setup**
- 8 CPU cores
- 32GB RAM
- 500GB SSD storage
- $300-400/month
