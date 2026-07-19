# Advanced Observability Guide

Complete guide for distributed tracing, SLO/SLI tracking, and centralized logging in the Real Estate Platform.

## Table of Contents

1. [Distributed Tracing with Jaeger](#distributed-tracing-with-jaeger)
2. [SLO/SLI Tracking & Error Budgets](#slosli-tracking--error-budgets)
3. [Centralized Logging with Loki](#centralized-logging-with-loki)
4. [Integration & Correlation](#integration--correlation)
5. [Best Practices](#best-practices)

---

## Distributed Tracing with Jaeger

### Overview

Distributed tracing tracks requests as they flow through multiple services, providing end-to-end visibility into system behavior.

### Architecture

```
Client Request → Escrow Service → Mojaloop/TigerBeetle → External APIs
                      ↓                    ↓                    ↓
                  OpenTelemetry      OpenTelemetry      OpenTelemetry
                      ↓                    ↓                    ↓
                  Jaeger Collector  ←  OTel Collector  ←  Jaeger Agent
                      ↓
                  Jaeger Storage (Badger)
                      ↓
                  Jaeger UI (Port 16686)
```

### Setup

1. **Start Jaeger Stack**

```bash
docker-compose -f docker-compose.tracing.yml up -d
```

2. **Access Jaeger UI**

- URL: http://localhost:16686
- No authentication required (development)

3. **Verify Services**

```bash
# Check Jaeger health
curl http://localhost:14269/

# Check OTel Collector health
curl http://localhost:13133/
```

### Trace Instrumentation

#### Go Services

All Go services use the common tracing package (`services/go/common/tracing.go`).

**Initialize Tracing:**

```go
import "github.com/realestate-platform/common"

func main() {
    // Initialize tracer
    shutdown, err := common.InitTracer(common.TracingConfig{
        ServiceName:    "escrow-service",
        ServiceVersion: "1.0.0",
        Environment:    "production",
        JaegerEndpoint: "http://jaeger:14268/api/traces",
        SamplingRate:   1.0,  // Sample all traces
    })
    if err != nil {
        log.Fatalf("Failed to initialize tracer: %v", err)
    }
    defer shutdown(context.Background())
    
    // Rest of application...
}
```

**Create Spans:**

```go
// Start a span
ctx, span := common.StartSpan(ctx, "create-escrow")
defer span.End()

// Add attributes
common.AddSpanAttributes(ctx,
    attribute.String("escrow.id", escrowID),
    attribute.Int64("escrow.amount", amount),
    attribute.String("escrow.currency", currency),
)

// Add events
common.AddSpanEvent(ctx, "funds-held",
    attribute.String("provider", "stripe"),
)

// Record errors
if err != nil {
    common.RecordError(ctx, err)
    common.SetSpanStatus(ctx, trace.StatusCodeError, err.Error())
}
```

**Wrap Operations:**

```go
err := common.TraceOperation(ctx, "redis.get", func(ctx context.Context) error {
    return redisClient.Get(ctx, key).Err()
}, 
    attribute.String("key", key),
)
```

### Trace Analysis

#### Finding Traces

1. **By Service**: Select service from dropdown
2. **By Operation**: Filter by operation name
3. **By Tags**: Search by custom attributes
4. **By Duration**: Find slow requests
5. **By Error**: Filter failed traces

#### Key Metrics

- **Latency Distribution**: P50, P95, P99 latencies
- **Error Rate**: Failed traces percentage
- **Service Dependencies**: Service call graph
- **Critical Path**: Slowest operations in trace

#### Example Queries

```
# Find slow escrow creations
service=escrow-service operation=create-escrow minDuration=1s

# Find failed transfers
service=mojaloop-service tags={"error":"true"}

# Find traces with specific escrow ID
service=escrow-service tags={"escrow.id":"esc_123"}

# Find traces between services
service=escrow-service AND service=tigerbeetle-service
```

### Trace Sampling

**Production Sampling Strategy:**

```go
// Sample 10% of successful requests
// Sample 100% of errors
sampler := sdktrace.ParentBased(
    sdktrace.TraceIDRatioBased(0.1),
    sdktrace.WithRemoteParentSampled(sdktrace.AlwaysSample()),
    sdktrace.WithRemoteParentNotSampled(sdktrace.TraceIDRatioBased(0.1)),
)
```

---

## SLO/SLI Tracking & Error Budgets

### Overview

Service Level Objectives (SLOs) define reliability targets. Error budgets quantify acceptable unreliability.

### Defined SLOs

#### Escrow Service

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| Availability | 99.9% | 30d | 0.1% (43.2 min/month) |
| Latency (P95) | < 500ms | 30d | 5% can exceed |
| Throughput | > 1000 req/s | 5m | N/A |

#### Mojaloop Service

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| Availability | 99.5% | 30d | 0.5% (3.6 hours/month) |
| Transfer Success | 99% | 24h | 1% can fail |
| Webhook Processing | < 2s (P95) | 1h | 5% can exceed |

#### TigerBeetle Service

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| Availability | 99.99% | 30d | 0.01% (4.32 min/month) |
| Latency (P99) | < 10ms | 5m | 1% can exceed |
| Cluster Health | 100% | 5m | 0 nodes can fail |

### Error Budget Calculation

**Formula:**

```
Error Budget Remaining = 1 - (Actual Error Rate / Allowed Error Rate)
```

**Example (Escrow Availability):**

```
Target: 99.9% (0.1% error budget)
Actual: 99.95% (0.05% error rate)
Budget Remaining: 1 - (0.05 / 0.1) = 50%
```

### Burn Rate Alerts

**Fast Burn (1 hour window):**
- Threshold: 14.4x normal burn rate
- Severity: Critical
- Action: Immediate investigation

**Slow Burn (6 hour window):**
- Threshold: 6x normal burn rate
- Severity: Warning
- Action: Schedule investigation

**Very Slow Burn (24 hour window):**
- Threshold: 3x normal burn rate
- Severity: Info
- Action: Monitor trend

### SLO Dashboard

Access: http://localhost:3001/d/slo-dashboard

**Key Panels:**

1. **Availability Gauges**: Current SLO compliance
2. **Error Budget Remaining**: Visual budget indicators
3. **Burn Rate Graph**: Real-time burn rate tracking
4. **Latency vs SLO**: Performance against targets
5. **Compliance Summary**: Tabular SLO overview

### Error Budget Policy

**When Budget Exhausted:**

1. **Stop Feature Development**: Focus on reliability
2. **Root Cause Analysis**: Identify systemic issues
3. **Implement Fixes**: Address reliability gaps
4. **Gradual Rollout**: Careful feature releases
5. **Budget Recovery**: Monitor until budget restored

**When Budget Healthy (>50%):**

- Continue feature development
- Experiment with new technologies
- Optimize for performance
- Plan capacity increases

### PromQL Queries

```promql
# Escrow availability
sum(rate(escrow_http_requests_total{status=~"2.."}[5m])) 
/ 
sum(rate(escrow_http_requests_total[5m]))

# Error budget remaining
1 - (
  (1 - (sum(rate(escrow_http_requests_total{status=~"2.."}[30d])) / sum(rate(escrow_http_requests_total[30d]))))
  /
  0.001  # 0.1% error budget
)

# Burn rate (1h window)
(1 - (sum(rate(escrow_http_requests_total{status=~"2.."}[1h])) / sum(rate(escrow_http_requests_total[1h]))))
/
0.001  # Normalized to error budget
```

---

## Centralized Logging with Loki

### Overview

Loki aggregates logs from all services, providing unified search and correlation with traces and metrics.

### Architecture

```
Services → Docker Logs → Promtail → Loki → Grafana
                              ↓
                         Fluent Bit (optional)
```

### Setup

1. **Start Logging Stack**

```bash
docker-compose -f docker-compose.logging.yml up -d
```

2. **Verify Loki**

```bash
# Check Loki health
curl http://localhost:3100/ready

# Check ingestion
curl http://localhost:3100/metrics | grep loki_ingester_streams_created_total
```

3. **Add Loki to Grafana**

- Navigate to Configuration → Data Sources
- Add Loki
- URL: `http://loki:3100`
- Save & Test

### Log Structure

**Structured JSON Logs:**

```json
{
  "level": "info",
  "ts": "2024-01-15T10:30:45.123Z",
  "msg": "Escrow created successfully",
  "trace_id": "abc123",
  "span_id": "def456",
  "escrow_id": "esc_789",
  "amount": 100000,
  "currency": "USD",
  "operation": "create"
}
```

**Required Fields:**

- `level`: Log level (debug, info, warn, error)
- `ts`: Timestamp (RFC3339)
- `msg`: Human-readable message
- `trace_id`: Trace ID for correlation (optional)
- `span_id`: Span ID for correlation (optional)

### LogQL Queries

**Basic Queries:**

```logql
# All logs from escrow service
{service="escrow"}

# Error logs only
{service="escrow"} |= "level=error"

# Logs for specific escrow
{service="escrow"} | json | escrow_id="esc_123"

# Logs with trace correlation
{service="escrow"} | json | trace_id="abc123"
```

**Advanced Queries:**

```logql
# Error rate per minute
sum(rate({service="escrow"} |= "level=error" [5m])) by (service)

# Top 10 slowest operations
topk(10,
  sum by (operation) (
    rate({service="escrow"} | json | __error__="" [5m])
  )
)

# Logs during incident window
{service="escrow"} 
  | json 
  | line_format "{{.ts}} {{.level}} {{.msg}}"
  | ts >= "2024-01-15T10:00:00Z" 
  | ts <= "2024-01-15T11:00:00Z"
```

### Log Retention

- **Default**: 30 days
- **Configuration**: `monitoring/loki/loki-config.yaml`
- **Adjust**: Modify `retention_period` value

```yaml
table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days
```

---

## Integration & Correlation

### Trace-Metrics-Logs Correlation

**Unified View:**

1. **Start with Metrics**: Identify anomaly in dashboard
2. **Find Traces**: Filter traces during anomaly window
3. **Examine Logs**: Use trace ID to find related logs
4. **Root Cause**: Correlate across all signals

**Example Workflow:**

```
1. Grafana Alert: High error rate in Escrow service
   ↓
2. Check SLO Dashboard: Error budget burning fast
   ↓
3. Open Jaeger: Find failed traces
   ↓
4. Extract trace_id: abc123def456
   ↓
5. Query Loki: {service="escrow"} | json | trace_id="abc123def456"
   ↓
6. Analyze Logs: Find root cause error message
```

### Grafana Explore

**Unified Query Interface:**

- **Metrics**: Prometheus queries
- **Traces**: Jaeger integration
- **Logs**: Loki queries

**Correlation Features:**

- Click trace ID in logs → Jump to Jaeger
- Click timestamp in trace → View logs at that time
- Overlay metrics on trace timeline

### Automated Correlation

**Trace Context Propagation:**

```go
// Extract trace context from incoming request
ctx := otel.GetTextMapPropagator().Extract(r.Context(), 
    propagation.HeaderCarrier(r.Header))

// Inject trace context into outgoing request
otel.GetTextMapPropagator().Inject(ctx, 
    propagation.HeaderCarrier(req.Header))

// Add trace ID to logs
traceID := common.GetTraceID(ctx)
log.WithField("trace_id", traceID).Info("Processing request")
```

---

## Best Practices

### Tracing

1. **Span Naming**: Use consistent, descriptive names
2. **Attribute Selection**: Add business-relevant attributes
3. **Error Recording**: Always record errors in spans
4. **Sampling**: Use intelligent sampling in production
5. **Context Propagation**: Maintain trace context across services

### SLO/SLI

1. **User-Centric**: Define SLOs based on user experience
2. **Realistic Targets**: Set achievable targets based on data
3. **Regular Review**: Adjust SLOs quarterly
4. **Budget Discipline**: Respect error budget policy
5. **Multi-Window**: Use multiple time windows for alerts

### Logging

1. **Structured Logs**: Always use JSON format
2. **Consistent Fields**: Maintain standard field names
3. **Appropriate Levels**: Use correct log levels
4. **Sensitive Data**: Never log passwords or tokens
5. **Trace Correlation**: Include trace IDs in logs

### General

1. **Unified Dashboards**: Create cross-signal dashboards
2. **Runbooks**: Document investigation procedures
3. **Automated Alerts**: Alert on SLO violations
4. **Regular Reviews**: Weekly observability reviews
5. **Continuous Improvement**: Iterate based on incidents

---

## Troubleshooting

### Jaeger Issues

```bash
# Check Jaeger logs
docker logs jaeger

# Verify trace ingestion
curl http://localhost:14269/metrics | grep jaeger_collector_spans_received

# Test trace submission
curl -X POST http://localhost:14268/api/traces \
  -H "Content-Type: application/json" \
  -d '{"data":[{"traceID":"test"}]}'
```

### Loki Issues

```bash
# Check Loki logs
docker logs loki

# Verify log ingestion
curl http://localhost:3100/metrics | grep loki_distributor_lines_received_total

# Test log query
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={service="escrow"}' \
  | jq .
```

### SLO Dashboard Issues

```bash
# Verify Prometheus scraping
curl http://localhost:9090/api/v1/targets

# Test SLO query
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=sum(rate(escrow_http_requests_total[5m]))'
```

---

## Quick Start

```bash
# Start all observability stacks
docker-compose -f docker-compose.monitoring.yml up -d
docker-compose -f docker-compose.tracing.yml up -d
docker-compose -f docker-compose.logging.yml up -d

# Start payment services
docker-compose -f docker-compose.go-services.yml up -d

# Access UIs
open http://localhost:3001      # Grafana
open http://localhost:16686     # Jaeger
open http://localhost:9090      # Prometheus

# Generate test traffic
./scripts/generate-test-traffic.sh

# View traces
open http://localhost:16686/search?service=escrow-service

# View logs
# In Grafana → Explore → Loki → {service="escrow"}

# Check SLOs
open http://localhost:3001/d/slo-dashboard
```

---

## Support

For issues or questions:
1. Check service health endpoints
2. Review logs in Loki
3. Examine traces in Jaeger
4. Consult this guide
5. Contact platform team

## License

Proprietary - Real Estate Platform
