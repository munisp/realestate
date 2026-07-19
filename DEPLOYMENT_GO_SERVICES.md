# Deployment Guide: Go Payment Services

Complete guide for deploying Escrow, Mojaloop, and TigerBeetle payment services.

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Build and start all Go services
docker-compose -f docker-compose.go-services.yml up --build -d

# Check service status
docker-compose -f docker-compose.go-services.yml ps

# View logs
docker-compose -f docker-compose.go-services.yml logs -f

# Stop services
docker-compose -f docker-compose.go-services.yml down
```

### Option 2: Manual Build

```bash
# Install Go 1.21+ first
# https://go.dev/doc/install

# Build Escrow Service
cd services/go/escrow
go mod download
go build -o escrow-service main.go
./escrow-service

# Build Mojaloop Service
cd services/go/mojaloop
go mod download
go build -o mojaloop-service main.go
./mojaloop-service

# Build TigerBeetle Service
cd services/go/tigerbeetle
go mod download
go build -o tigerbeetle-service main.go
./tigerbeetle-service
```

## Environment Configuration

### Escrow Service (.env)
```bash
PORT=5000
```

### Mojaloop Service (.env)
```bash
PORT=5010
MOJALOOP_API_URL=https://mojaloop-hub.example.com
MOJALOOP_API_KEY=your_api_key_here
MOJALOOP_FSP_ID=your_fsp_id
MOJALOOP_WEBHOOK_SECRET=your_webhook_secret
```

### TigerBeetle Service (.env)
```bash
PORT=5011
TIGERBEETLE_CLUSTER_ID=0
TIGERBEETLE_ADDRESSES=tigerbeetle-1:3000,tigerbeetle-2:3000,tigerbeetle-3:3000
```

## TypeScript Backend Integration

### Update Environment Variables

Add to your `.env` file:

```bash
# Go Service URLs
ESCROW_SERVICE_URL=http://localhost:5000
MOJALOOP_SERVICE_URL=http://localhost:5010
TIGERBEETLE_SERVICE_URL=http://localhost:5011
```

### Enable Providers in PaymentProviderFactory

The providers are already registered in `server/services/paymentProviders/PaymentProviderFactory.ts`:

```typescript
{
  name: 'mojaloop',
  enabled: !!process.env.MOJALOOP_SERVICE_URL,
  priority: 90,
  config: {
    serviceUrl: process.env.MOJALOOP_SERVICE_URL || 'http://localhost:5010',
  },
},
{
  name: 'tigerbeetle',
  enabled: !!process.env.TIGERBEETLE_SERVICE_URL,
  priority: 80,
  config: {
    serviceUrl: process.env.TIGERBEETLE_SERVICE_URL || 'http://localhost:5011',
  },
},
```

## Production Deployment

### 1. Build Production Images

```bash
# Build optimized Docker images
docker build -t realestate/escrow-service:latest services/go/escrow
docker build -t realestate/mojaloop-service:latest services/go/mojaloop
docker build -t realestate/tigerbeetle-service:latest services/go/tigerbeetle

# Push to registry
docker push realestate/escrow-service:latest
docker push realestate/mojaloop-service:latest
docker push realestate/tigerbeetle-service:latest
```

### 2. Deploy to Kubernetes

```yaml
# escrow-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: escrow-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: escrow-service
  template:
    metadata:
      labels:
        app: escrow-service
    spec:
      containers:
      - name: escrow-service
        image: realestate/escrow-service:latest
        ports:
        - containerPort: 5000
        env:
        - name: PORT
          value: "5000"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: escrow-service
spec:
  selector:
    app: escrow-service
  ports:
  - port: 5000
    targetPort: 5000
  type: ClusterIP
```

Apply similar configurations for Mojaloop and TigerBeetle services.

### 3. Configure Load Balancer

```nginx
# nginx.conf
upstream escrow_backend {
    least_conn;
    server escrow-service-1:5000;
    server escrow-service-2:5000;
    server escrow-service-3:5000;
}

upstream mojaloop_backend {
    least_conn;
    server mojaloop-service-1:5010;
    server mojaloop-service-2:5010;
}

upstream tigerbeetle_backend {
    least_conn;
    server tigerbeetle-service-1:5011;
    server tigerbeetle-service-2:5011;
}

server {
    listen 80;
    
    location /api/escrow/ {
        proxy_pass http://escrow_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/mojaloop/ {
        proxy_pass http://mojaloop_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/tigerbeetle/ {
        proxy_pass http://tigerbeetle_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring & Observability

### Health Checks

```bash
# Check all services
curl http://localhost:5000/health
curl http://localhost:5010/health
curl http://localhost:5011/health
```

### Prometheus Metrics (Future Enhancement)

Add Prometheus metrics to each service:

```go
import "github.com/prometheus/client_golang/prometheus/promhttp"

// Add to main()
http.Handle("/metrics", promhttp.Handler())
```

### Logging

All services log to stdout. Configure log aggregation:

```yaml
# docker-compose.yml
services:
  escrow-service:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Performance Tuning

### Escrow Service
```bash
# Increase Go max procs
GOMAXPROCS=8 ./escrow-service

# Enable profiling
ENABLE_PPROF=true ./escrow-service
# Access at http://localhost:5000/debug/pprof
```

### TigerBeetle Service
```bash
# Configure connection pool
TIGERBEETLE_MAX_CONNECTIONS=100

# Set batch size
TIGERBEETLE_BATCH_SIZE=1000
```

## Security Hardening

### 1. Enable TLS

```go
// main.go
server := &http.Server{
    Addr:      ":5000",
    Handler:   router,
    TLSConfig: &tls.Config{
        MinVersion: tls.VersionTLS13,
    },
}

log.Fatal(server.ListenAndServeTLS("cert.pem", "key.pem"))
```

### 2. Add API Authentication

```go
func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        apiKey := r.Header.Get("X-API-Key")
        if apiKey != os.Getenv("API_KEY") {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

### 3. Rate Limiting

```go
import "golang.org/x/time/rate"

var limiter = rate.NewLimiter(100, 200) // 100 req/s, burst 200

func rateLimitMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !limiter.Allow() {
            http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

## Troubleshooting

### Service Won't Start

```bash
# Check port availability
lsof -i :5000
lsof -i :5010
lsof -i :5011

# Check logs
docker-compose -f docker-compose.go-services.yml logs escrow-service
docker-compose -f docker-compose.go-services.yml logs mojaloop-service
docker-compose -f docker-compose.go-services.yml logs tigerbeetle-service
```

### High Memory Usage

```bash
# Enable memory profiling
curl http://localhost:5000/debug/pprof/heap > heap.prof
go tool pprof heap.prof
```

### Connection Timeouts

```bash
# Increase timeouts in code
server := &http.Server{
    ReadTimeout:  30 * time.Second,
    WriteTimeout: 30 * time.Second,
    IdleTimeout:  120 * time.Second,
}
```

## Backup & Recovery

### Escrow Service
- State is in-memory by default
- For production, use Redis with AOF persistence
- Backup Redis snapshots regularly

### TigerBeetle Service
- TigerBeetle handles persistence automatically
- Backup data files from cluster nodes
- Test restore procedures regularly

## Rollback Procedure

```bash
# Stop current version
docker-compose -f docker-compose.go-services.yml down

# Pull previous version
docker pull realestate/escrow-service:v1.0.0
docker pull realestate/mojaloop-service:v1.0.0
docker pull realestate/tigerbeetle-service:v1.0.0

# Start previous version
docker-compose -f docker-compose.go-services.yml up -d
```

## Support

For issues or questions:
1. Check service logs
2. Review health check endpoints
3. Consult PAYMENT_SERVICES.md for API documentation
4. Contact platform team

## License

Proprietary - Real Estate Platform
