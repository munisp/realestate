# Monitoring Stack

Complete monitoring solution with Prometheus, Grafana, and Alertmanager.

## Components

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and notifications
- **Exporters**: Node, PostgreSQL, Redis, Kafka metrics

## Quick Start

### Docker Compose
```bash
cd monitoring
docker-compose up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- Alertmanager: http://localhost:9093

### Kubernetes
```bash
kubectl apply -f k8s-monitoring.yaml
```

## Dashboards

### Microservices Overview
- Service health status
- Request rate and error rate
- Response time percentiles
- Memory and CPU usage

### Infrastructure Metrics
- Database connections and performance
- ClickHouse query performance
- OpenSearch cluster health
- Redis memory usage
- Kafka consumer lag

## Alerts

### Critical Alerts
- Service down > 2 minutes
- Database down > 1 minute
- Disk space < 10%

### Warning Alerts
- High error rate > 5%
- High latency > 1s
- Memory usage > 90%
- CPU usage > 80%
- Disk space < 20%

## Configuration

Edit `prometheus/prometheus.yml` to add new scrape targets.
Edit `prometheus/alerts/*.yml` to modify alert rules.

## Grafana Dashboards

Pre-configured dashboards are in `grafana/dashboards/`:
- Microservices Overview
- Infrastructure Metrics

Import additional dashboards from https://grafana.com/grafana/dashboards/

## Alerting

Configure Alertmanager in `alertmanager/config.yml` to send alerts via:
- Email
- Slack
- PagerDuty
- Webhook
