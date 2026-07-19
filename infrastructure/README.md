# Real Estate Platform Infrastructure

This directory contains deployment configurations for all infrastructure components.

## Components

### 1. ClickHouse (Analytics Database)
- **Purpose**: Real-time analytics, time-series data, aggregations
- **Deployment**: StatefulSet with 3 replicas
- **Storage**: 100Gi per node
- **Ports**: 8123 (HTTP), 9000 (Native)

**Deploy**:
```bash
# Docker Compose
cd clickhouse && docker-compose up -d

# Kubernetes
kubectl apply -f clickhouse/k8s-deployment.yaml
```

### 2. OpenSearch (Search Engine)
- **Purpose**: Full-text search, geospatial queries, autocomplete
- **Deployment**: StatefulSet with 3 nodes
- **Storage**: 100Gi per node
- **Ports**: 9200 (HTTP), 9300 (Transport), 5601 (Dashboards)

**Deploy**:
```bash
# Docker Compose
cd opensearch && docker-compose up -d

# Kubernetes
kubectl apply -f opensearch/k8s-deployment.yaml
```

### 3. Fluvio (Streaming Platform)
- **Purpose**: Event streaming, real-time data pipelines
- **Topics**: property-events, user-events, transaction-events, notification-events

**Deploy**:
```bash
# Install Fluvio
curl -fsS https://hub.infinyon.cloud/install/install.sh | bash

# Start cluster
fluvio cluster start

# Create topics
fluvio topic create property-events
fluvio topic create user-events
fluvio topic create transaction-events
fluvio topic create notification-events
```

## Architecture

```
┌─────────────────┐
│   Microservices │
└────────┬────────┘
         │
    ┌────┴────┐
    │  Fluvio │ (Event Streaming)
    └────┬────┘
         │
    ┌────┴─────────────────┐
    │                      │
┌───▼────┐          ┌─────▼──────┐
│ClickHouse│        │ OpenSearch │
│(Analytics)│        │  (Search)  │
└──────────┘        └────────────┘
```

## Monitoring

All components expose metrics for Prometheus:
- ClickHouse: `:9363/metrics`
- OpenSearch: `:9200/_prometheus/metrics`
- Fluvio: Built-in metrics via CLI

## Backup & Recovery

### ClickHouse
```bash
# Backup
clickhouse-backup create backup_name

# Restore
clickhouse-backup restore backup_name
```

### OpenSearch
```bash
# Create snapshot repository
curl -X PUT "localhost:9200/_snapshot/backup_repo" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/mnt/backups"
  }
}'

# Create snapshot
curl -X PUT "localhost:9200/_snapshot/backup_repo/snapshot_1"
```

## Scaling

All components are designed for horizontal scaling:
- ClickHouse: Add more replicas to StatefulSet
- OpenSearch: Increase replica count
- Fluvio: Add more partitions to topics

## Security

- Enable authentication for all components
- Use TLS for inter-node communication
- Configure network policies in Kubernetes
- Implement RBAC for access control
