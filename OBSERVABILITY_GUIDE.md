# Observability & Resilience Guide

Complete guide for monitoring, alerting, and ensuring resilience of the Real Estate Platform payment services.

## Table of Contents

1. [Prometheus Metrics](#prometheus-metrics)
2. [Grafana Dashboards](#grafana-dashboards)
3. [Circuit Breakers](#circuit-breakers)
4. [Redis Backups](#redis-backups)
5. [Alerting](#alerting)
6. [Troubleshooting](#troubleshooting)

---

## Prometheus Metrics

### Overview

All Go payment services (Escrow, Mojaloop, TigerBeetle) expose Prometheus metrics at `/metrics` endpoint.

### Metrics Endpoints

```bash
# Escrow Service
curl http://localhost:5000/metrics

# Mojaloop Service
curl http://localhost:5010/metrics

# TigerBeetle Service
curl http://localhost:5011/metrics
```

### Key Metrics

#### Escrow Service

| Metric | Type | Description |
|--------|------|-------------|
| `escrow_http_requests_total` | Counter | Total HTTP requests by method, endpoint, status |
| `escrow_http_request_duration_seconds` | Histogram | HTTP request duration |
| `escrow_created_total` | Counter | Total escrows created |
| `escrow_released_total` | Counter | Total escrows released |
| `escrow_refunded_total` | Counter | Total escrows refunded |
| `escrow_by_status` | Gauge | Number of escrows by status |
| `escrow_redis_operations_total` | Counter | Total Redis operations |
| `escrow_redis_operation_duration_seconds` | Histogram | Redis operation duration |
| `escrow_events_logged_total` | Counter | Total events logged by type |
| `escrow_errors_total` | Counter | Total errors by type and operation |

#### Mojaloop Service

| Metric | Type | Description |
|--------|------|-------------|
| `mojaloop_http_requests_total` | Counter | Total HTTP requests |
| `mojaloop_quotes_created_total` | Counter | Total quotes created |
| `mojaloop_transfers_created_total` | Counter | Total transfers created |
| `mojaloop_transfers_committed_total` | Counter | Total transfers committed |
| `mojaloop_transfers_aborted_total` | Counter | Total transfers aborted |
| `mojaloop_webhooks_received_total` | Counter | Total webhooks received by event type |
| `mojaloop_fsp_api_calls_total` | Counter | Total FSP API calls |
| `mojaloop_fsp_api_call_duration_seconds` | Histogram | FSP API call duration |

#### TigerBeetle Service

| Metric | Type | Description |
|--------|------|-------------|
| `tigerbeetle_http_requests_total` | Counter | Total HTTP requests |
| `tigerbeetle_accounts_created_total` | Counter | Total accounts created |
| `tigerbeetle_transfers_created_total` | Counter | Total transfers created |
| `tigerbeetle_transfers_success_total` | Counter | Total successful transfers |
| `tigerbeetle_transfers_failed_total` | Counter | Total failed transfers |
| `tigerbeetle_ledger_operation_duration_seconds` | Histogram | Ledger operation duration |
| `tigerbeetle_cluster_nodes_healthy` | Gauge | Number of healthy cluster nodes |
| `tigerbeetle_throughput_ops_per_second` | Gauge | Operations per second throughput |

### Example Queries

```promql
# Request rate per service
rate(escrow_http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(escrow_http_request_duration_seconds_bucket[5m]))

# Error rate
rate(escrow_errors_total[5m])

# Escrow status distribution
sum by (status) (escrow_by_status)

# TigerBeetle throughput
tigerbeetle_throughput_ops_per_second

# Mojaloop webhook processing time
histogram_quantile(0.99, rate(mojaloop_webhook_processing_duration_seconds_bucket[5m]))
```

---

## Grafana Dashboards

### Setup

1. **Start Monitoring Stack**

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

2. **Access Grafana**

- URL: http://localhost:3001
- Username: `admin`
- Password: `admin` (change on first login)

3. **Import Dashboards**

Dashboards are located in `monitoring/grafana/dashboards/`:
- `escrow-service.json` - Escrow Service Monitoring
- `mojaloop-service.json` - Mojaloop Service Monitoring
- `tigerbeetle-service.json` - TigerBeetle Service Monitoring

### Dashboard Features

#### Escrow Service Dashboard

- HTTP request rate and duration
- Escrow operations (created, released, refunded)
- Escrow status distribution
- Redis operation performance
- Event logging metrics
- Error rates by type

#### Key Panels

1. **HTTP Request Rate** - Real-time request throughput
2. **Request Duration (p95)** - 95th percentile latency
3. **Escrows by Status** - Status distribution over time
4. **Redis Operation Duration** - Database performance
5. **Error Rate** - Error tracking with thresholds

### Creating Custom Dashboards

```json
{
  "dashboard": {
    "title": "Custom Dashboard",
    "panels": [
      {
        "type": "graph",
        "title": "Custom Metric",
        "targets": [
          {
            "expr": "your_metric_name",
            "legendFormat": "{{label}}"
          }
        ]
      }
    ]
  }
}
```

---

## Circuit Breakers

### Overview

Circuit breakers protect services from cascading failures by stopping requests to failing dependencies.

### Implementation

Located in `services/go/common/circuitbreaker.go`.

### States

1. **Closed** - Normal operation, requests pass through
2. **Open** - Failure threshold exceeded, requests blocked
3. **Half-Open** - Testing if service recovered

### Configuration

```go
import "github.com/realestate-platform/common"

// Create circuit breaker
breaker := common.NewCircuitBreaker(
    "mojaloop-api",     // Name
    5,                  // Max failures
    10*time.Second,     // Timeout
    30*time.Second,     // Reset timeout
)

// Use circuit breaker
err := breaker.Execute(func() error {
    return callExternalAPI()
})

if err == common.ErrCircuitOpen {
    // Circuit is open, handle gracefully
    return fallbackResponse()
}
```

### Best Practices

1. **Set appropriate thresholds**
   - Max failures: 3-5 for critical services
   - Timeout: 5-10 seconds
   - Reset timeout: 30-60 seconds

2. **Implement fallbacks**
   - Return cached data
   - Use default values
   - Degrade gracefully

3. **Monitor circuit state**
   - Log state transitions
   - Alert on open circuits
   - Track failure rates

### Example: Mojaloop API with Circuit Breaker

```go
var mojalooBreaker = common.NewCircuitBreaker("mojaloop", 5, 10*time.Second, 30*time.Second)

func callMojalooAPI(endpoint string, data interface{}) error {
    return mojalooBreaker.Execute(func() error {
        resp, err := http.Post(endpoint, "application/json", marshalData(data))
        if err != nil {
            return err
        }
        defer resp.Body.Close()
        
        if resp.StatusCode >= 500 {
            return fmt.Errorf("server error: %d", resp.StatusCode)
        }
        
        return nil
    })
}
```

---

## Redis Backups

### Automated Backup System

Script: `scripts/redis-backup.sh`

### Features

- **Automated backups** with BGSAVE
- **S3 integration** for remote storage
- **Compression** with gzip
- **Integrity verification**
- **Retention management** (default: 30 days)
- **Error handling** and notifications

### Setup

1. **Configure Environment Variables**

```bash
export REDIS_CONTAINER=escrow-redis
export BACKUP_DIR=/backups/redis
export S3_BUCKET=realestate-platform-backups
export S3_PREFIX=redis
export RETENTION_DAYS=30
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

2. **Test Manual Backup**

```bash
./scripts/redis-backup.sh
```

3. **Setup Automated Backups**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/realestate-platform/scripts/redis-backup.sh >> /var/log/redis-backup.log 2>&1
```

### Backup Schedule Options

```bash
# Daily at 2 AM
0 2 * * * /path/to/redis-backup.sh

# Every 6 hours
0 */6 * * * /path/to/redis-backup.sh

# Weekly on Sunday at 3 AM
0 3 * * 0 /path/to/redis-backup.sh

# Hourly (for high-frequency changes)
0 * * * * /path/to/redis-backup.sh
```

### Restore from Backup

```bash
# 1. Stop Redis container
docker stop escrow-redis

# 2. Extract backup
gunzip -c /backups/redis/redis_backup_20240115_020000.rdb.gz > /tmp/dump.rdb

# 3. Copy to Redis data directory
docker cp /tmp/dump.rdb escrow-redis:/data/dump.rdb

# 4. Start Redis container
docker start escrow-redis

# 5. Verify data
docker exec escrow-redis redis-cli DBSIZE
```

### S3 Backup Management

```bash
# List backups
aws s3 ls s3://realestate-platform-backups/redis/

# Download specific backup
aws s3 cp s3://realestate-platform-backups/redis/redis_backup_20240115_020000.rdb.gz ./

# Delete old backups manually
aws s3 rm s3://realestate-platform-backups/redis/redis_backup_20240101_020000.rdb.gz
```

### Monitoring Backups

```bash
# View backup logs
tail -f /var/log/redis-backup.log

# Check backup status
ls -lh /backups/redis/

# Verify last backup time
docker exec escrow-redis redis-cli LASTSAVE
```

---

## Alerting

### Alert Rules

Create `monitoring/prometheus/alerts/payment-services.yml`:

```yaml
groups:
  - name: payment_services
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(escrow_errors_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in Escrow service"
          description: "Error rate is {{ $value }} errors/sec"

      # Circuit breaker open
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state{state="open"} == 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker {{ $labels.name }} is open"

      # Redis backup failed
      - alert: RedisBackupFailed
        expr: time() - redis_last_backup_timestamp > 86400
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Redis backup has not run in 24 hours"

      # High latency
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(escrow_http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s"

      # TigerBeetle cluster unhealthy
      - alert: TigerBeetleClusterUnhealthy
        expr: tigerbeetle_cluster_nodes_healthy < 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "TigerBeetle cluster has less than 2 healthy nodes"
```

### Alertmanager Configuration

`monitoring/alertmanager/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@realestate-platform.com'
        from: 'alerts@realestate-platform.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@realestate-platform.com'
        auth_password: 'your_password'
```

---

## Troubleshooting

### High Error Rate

```bash
# Check error metrics
curl http://localhost:5000/metrics | grep escrow_errors_total

# View service logs
docker logs escrow-service --tail=100

# Check circuit breaker state
curl http://localhost:5000/health
```

### High Latency

```bash
# Check Redis performance
docker exec escrow-redis redis-cli --latency

# Check database connections
docker exec escrow-redis redis-cli INFO clients

# Review slow queries
docker exec escrow-redis redis-cli SLOWLOG GET 10
```

### Circuit Breaker Open

```bash
# Check external service health
curl http://mojaloop-api/health

# Review recent errors
docker logs mojaloop-service | grep ERROR

# Manually reset circuit breaker (if needed)
# Implement admin endpoint to reset
```

### Backup Failures

```bash
# Check backup logs
tail -100 /var/log/redis-backup.log

# Verify Redis is running
docker ps | grep redis

# Test manual backup
./scripts/redis-backup.sh

# Check S3 permissions
aws s3 ls s3://realestate-platform-backups/
```

### Prometheus Not Scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify service metrics endpoint
curl http://localhost:5000/metrics

# Check network connectivity
docker exec prometheus ping escrow-service
```

---

## Performance Tuning

### Prometheus

```yaml
# Increase retention
--storage.tsdb.retention.time=90d

# Increase memory
--storage.tsdb.retention.size=50GB

# Adjust scrape interval
scrape_interval: 10s  # More frequent
scrape_interval: 30s  # Less frequent
```

### Grafana

```ini
# grafana.ini
[dashboards]
min_refresh_interval = 5s

[metrics]
enabled = true
interval_seconds = 10
```

### Redis

```bash
# Optimize for backups
CONFIG SET save "900 1 300 10 60 10000"

# Enable AOF for durability
CONFIG SET appendonly yes
CONFIG SET appendfsync everysec
```

---

## Best Practices

1. **Monitor continuously** - Set up dashboards and alerts
2. **Test backups regularly** - Verify restore procedures
3. **Use circuit breakers** - Protect against cascading failures
4. **Set appropriate thresholds** - Balance sensitivity and noise
5. **Document incidents** - Learn from failures
6. **Automate responses** - Reduce manual intervention
7. **Review metrics weekly** - Identify trends early
8. **Update dashboards** - Keep visualizations relevant

---

## Support

For issues or questions:
1. Check service logs
2. Review metrics and dashboards
3. Consult this guide
4. Contact platform team

## License

Proprietary - Real Estate Platform
