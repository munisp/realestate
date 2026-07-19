# Go Payment Services

High-performance payment provider services implemented in Go for the Real Estate Platform.

## Services

### 1. Escrow Service (Port 5000)
Core escrow management service handling state transitions and business logic.

**Features:**
- Escrow creation and lifecycle management
- Fund holding, release, and refund operations
- State machine for escrow status transitions
- In-memory state storage (use Redis in production)

**Endpoints:**
- `POST /escrows` - Create new escrow
- `GET /escrows/{id}` - Get escrow details
- `POST /escrows/{id}/hold` - Mark funds as held
- `POST /escrows/{id}/release` - Release funds to seller
- `POST /escrows/{id}/refund` - Refund funds to buyer
- `GET /projects/{project_id}/escrows` - List project escrows
- `GET /health` - Health check

### 2. Mojaloop Payment Provider (Port 5010)
Mojaloop integration for mobile money and cross-border payments in Africa.

**Features:**
- ILP (Interledger Protocol) support
- Quote and transfer management
- Conditional transfers with fulfillment
- FSP (Financial Service Provider) integration
- Support for KES, UGX, TZS, RWF, NGN, ZAR, GHS

**Endpoints:**
- `POST /escrow/create` - Create escrow with Mojaloop
- `POST /escrow/release` - Release funds (fulfill transfer)
- `POST /escrow/refund` - Refund funds (abort transfer)
- `GET /escrow/status/{provider_escrow_id}` - Get escrow status
- `GET /info` - Provider information
- `GET /health` - Health check

**Environment Variables:**
```bash
MOJALOOP_API_URL=http://localhost:4001
MOJALOOP_API_KEY=your_api_key
MOJALOOP_FSP_ID=escrow_fsp
MOJALOOP_WEBHOOK_SECRET=your_webhook_secret
PORT=5010
```

### 3. TigerBeetle Payment Provider (Port 5011)
TigerBeetle integration for high-performance double-entry accounting.

**Features:**
- Microsecond latency transfers
- Strict serializability
- Double-entry accounting
- Account-based ledger system
- Support for USD, EUR, GBP, NGN, KES, ZAR

**Endpoints:**
- `POST /escrow/create` - Create escrow with TigerBeetle
- `POST /escrow/release` - Release funds to seller
- `POST /escrow/refund` - Refund funds to buyer
- `GET /escrow/status/{provider_escrow_id}` - Get escrow status
- `GET /info` - Provider information
- `GET /health` - Health check

**Environment Variables:**
```bash
TIGERBEETLE_CLUSTER_ID=0
TIGERBEETLE_ADDRESSES=127.0.0.1:3000
PORT=5011
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TypeScript Backend                       │
│                  (Express + tRPC + Drizzle)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Escrow Service  │  │    Mojaloop     │  │  TigerBeetle    │
│   (Go:5000)     │  │   Service       │  │    Service      │
│                 │  │   (Go:5010)     │  │   (Go:5011)     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   In-Memory     │  │  Mojaloop Hub   │  │  TigerBeetle    │
│     Store       │  │   (External)    │  │    Cluster      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Development

### Prerequisites
- Go 1.21+
- Docker & Docker Compose (optional)

### Local Development

**Build and run individual services:**

```bash
# Escrow Service
cd services/go/escrow
go mod download
go run main.go

# Mojaloop Service
cd services/go/mojaloop
go mod download
go run main.go

# TigerBeetle Service
cd services/go/tigerbeetle
go mod download
go run main.go
```

### Docker Deployment

**Build and run all services:**

```bash
# From project root
docker-compose -f docker-compose.go-services.yml up --build
```

**Run specific service:**

```bash
docker-compose -f docker-compose.go-services.yml up escrow-service
docker-compose -f docker-compose.go-services.yml up mojaloop-service
docker-compose -f docker-compose.go-services.yml up tigerbeetle-service
```

## Integration with TypeScript Backend

The TypeScript backend connects to these Go services via HTTP clients:

```typescript
// server/payments/providers/MojalooProvider.ts
const response = await fetch('http://localhost:5010/escrow/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    escrow_id: escrowId,
    amount: amount,
    currency: currency,
    buyer_id: buyerId,
    seller_id: sellerId,
  }),
});
```

## Performance Characteristics

| Service | Latency | Throughput | Consistency |
|---------|---------|------------|-------------|
| Escrow Service | < 1ms | 10K+ req/s | Eventually consistent |
| Mojaloop Service | 50-200ms | 1K+ req/s | ILP atomic |
| TigerBeetle Service | < 1ms | 1M+ TPS | Strictly serializable |

## Production Considerations

### Escrow Service
- Replace in-memory store with Redis or distributed cache
- Add persistent storage for audit trail
- Implement event sourcing for state changes
- Add webhook notifications for state transitions

### Mojaloop Service
- Configure production Mojaloop Hub endpoints
- Implement webhook handlers for async notifications
- Add retry logic with exponential backoff
- Monitor FSP availability and failover

### TigerBeetle Service
- Deploy TigerBeetle cluster (3+ replicas)
- Configure cluster addresses in environment
- Implement connection pooling
- Monitor ledger consistency

## Monitoring

All services expose `/health` endpoints for health checks:

```bash
curl http://localhost:5000/health  # Escrow
curl http://localhost:5010/health  # Mojaloop
curl http://localhost:5011/health  # TigerBeetle
```

## Testing

```bash
# Unit tests
cd services/go/escrow && go test ./...
cd services/go/mojaloop && go test ./...
cd services/go/tigerbeetle && go test ./...

# Integration tests (requires running services)
curl -X POST http://localhost:5010/escrow/create \
  -H "Content-Type: application/json" \
  -d '{
    "escrow_id": "test_123",
    "amount": 100000,
    "currency": "KES",
    "buyer_id": "254712345678",
    "seller_id": "254787654321"
  }'
```

## Security

- All services use CORS middleware for cross-origin requests
- API authentication should be added for production
- Use HTTPS/TLS in production
- Validate all input parameters
- Implement rate limiting
- Log all transactions for audit

## Troubleshooting

**Service won't start:**
- Check port availability: `lsof -i :5000`
- Verify environment variables are set
- Check logs for specific errors

**TigerBeetle connection fails:**
- Ensure TigerBeetle cluster is running
- Verify `TIGERBEETLE_ADDRESSES` is correct
- Check network connectivity

**Mojaloop API errors:**
- Verify `MOJALOOP_API_URL` is accessible
- Check API key validity
- Review Mojaloop Hub logs

## Contributing

1. Follow Go best practices and conventions
2. Add tests for new features
3. Update documentation
4. Use meaningful commit messages
5. Ensure all tests pass before submitting PR

## License

Proprietary - Real Estate Platform
