# Load Testing Guide

## Overview

This guide explains how to perform load testing on the Real Estate Platform to verify it can handle production traffic levels.

## Prerequisites

### Install k6
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Load Test Scenarios

### 1. Baseline Performance Test
Tests system under normal load (100 concurrent users)

```bash
API_URL=https://staging.realestate.com k6 run deployment/load-test.js
```

**Expected Results:**
- Response time (p95): < 500ms
- Error rate: < 0.1%
- Requests/sec: > 500

### 2. Stress Test
Tests system limits (increasing load to 1000 users)

```bash
k6 run --vus 1000 --duration 10m deployment/load-test.js
```

**Expected Results:**
- System remains stable
- Auto-scaling triggers
- No crashes or data loss

### 3. Spike Test
Tests sudden traffic spikes

```bash
k6 run --stage 0s:0 --stage 10s:1000 --stage 3m:1000 --stage 10s:0 deployment/load-test.js
```

**Expected Results:**
- System handles spike gracefully
- Recovery within 30 seconds

### 4. Endurance Test
Tests system stability over time (4 hours)

```bash
k6 run --vus 200 --duration 4h deployment/load-test.js
```

**Expected Results:**
- No memory leaks
- Consistent performance
- No degradation over time

## Performance Benchmarks

### API Endpoints

| Endpoint | Target p95 | Target p99 | Max Error Rate |
|----------|------------|------------|----------------|
| GET /properties | 200ms | 500ms | 0.1% |
| POST /properties | 300ms | 800ms | 0.1% |
| GET /search | 500ms | 1000ms | 0.5% |
| POST /transactions | 400ms | 1000ms | 0.01% |
| GET /analytics | 1000ms | 2000ms | 1% |

### Database Performance

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Read Query | < 50ms | < 100ms |
| Write Query | < 100ms | < 200ms |
| Complex Join | < 200ms | < 500ms |

### Infrastructure

| Metric | Target | Max |
|--------|--------|-----|
| CPU Usage | < 70% | < 85% |
| Memory Usage | < 80% | < 90% |
| Disk I/O | < 70% | < 85% |
| Network | < 60% | < 80% |

## Monitoring During Load Tests

### 1. Grafana Dashboards
```bash
# Open Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring
# Visit http://localhost:3000
```

Watch:
- Request rate
- Error rate
- Response times (p50, p95, p99)
- Resource usage (CPU, memory)
- Database connections

### 2. Prometheus Metrics
```bash
# Open Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# Visit http://localhost:9090
```

Key queries:
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response time p95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Pod CPU usage
rate(container_cpu_usage_seconds_total[5m])
```

### 3. Application Logs
```bash
# Watch service logs
kubectl logs -f deployment/property-service -n realestate-production

# Watch all services
kubectl logs -f -l app -n realestate-production
```

## Load Test Results Interpretation

### Good Results ✅
- All response times within targets
- Error rate < 0.1%
- Auto-scaling works smoothly
- No service crashes
- Memory usage stable

### Warning Signs ⚠️
- Response times approaching limits
- Error rate 0.1% - 1%
- Slow auto-scaling response
- Memory usage increasing
- Database connection pool exhausted

### Critical Issues ❌
- Response times exceed targets
- Error rate > 1%
- Service crashes
- Memory leaks detected
- Database overload
- Network saturation

## Optimization Tips

### If Response Times Are High
1. Check database query performance
2. Review caching strategy
3. Optimize slow endpoints
4. Add database indexes
5. Increase resource limits

### If Error Rate Is High
1. Check application logs
2. Review database connection pool
3. Check external service dependencies
4. Verify rate limiting configuration
5. Review error handling

### If Auto-Scaling Is Slow
1. Reduce HPA stabilization window
2. Adjust scaling thresholds
3. Pre-warm instances
4. Review resource requests/limits

### If Memory Usage Increases
1. Check for memory leaks
2. Review caching configuration
3. Optimize data structures
4. Increase memory limits
5. Add memory profiling

## Production Load Estimation

### Expected Traffic
- **Daily Active Users**: 10,000
- **Peak Concurrent Users**: 1,000
- **Requests per Second**: 500-1,000
- **Data Transfer**: 100 GB/day

### Scaling Strategy
- **Minimum Replicas**: 3 per service
- **Maximum Replicas**: 20 per service
- **Scale Up Threshold**: 70% CPU
- **Scale Down Threshold**: 30% CPU

## Post-Test Actions

### 1. Review Results
- Analyze k6 output
- Check Grafana dashboards
- Review application logs
- Document findings

### 2. Optimize
- Fix identified bottlenecks
- Tune configuration
- Adjust resource limits
- Update scaling policies

### 3. Re-Test
- Run tests again after optimization
- Verify improvements
- Document new baseline

### 4. Document
- Update performance benchmarks
- Record optimization steps
- Share results with team

## Troubleshooting

### Load Test Fails to Start
- Check k6 installation
- Verify API URL is accessible
- Check network connectivity
- Review test script syntax

### High Error Rates
- Check service health
- Review rate limiting
- Verify database connectivity
- Check external dependencies

### Inconsistent Results
- Run tests multiple times
- Check for background jobs
- Verify test environment isolation
- Review caching effects

## Best Practices

1. **Test in Staging First**: Never run load tests in production
2. **Gradual Increase**: Start small and increase load gradually
3. **Monitor Everything**: Watch all metrics during tests
4. **Document Results**: Keep records of all test runs
5. **Test Regularly**: Run load tests before each major release
6. **Simulate Reality**: Use realistic user scenarios
7. **Clean Up**: Reset test data after tests

## Checklist

Before production deployment:

- [ ] Baseline performance test passed
- [ ] Stress test passed
- [ ] Spike test passed
- [ ] Endurance test passed (4 hours)
- [ ] All endpoints meet performance targets
- [ ] Auto-scaling verified
- [ ] No memory leaks detected
- [ ] Database performance acceptable
- [ ] Results documented
- [ ] Team reviewed results

---

**Status**: Load testing framework ready. Execute tests before production deployment.
