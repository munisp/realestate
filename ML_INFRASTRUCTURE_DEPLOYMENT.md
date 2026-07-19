# ML Infrastructure Deployment Guide

This guide explains how to deploy and integrate the complete ML infrastructure stack for the real estate platform.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TypeScript/Node.js Application                   │
│                     (tRPC + Express + React)                         │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ├─────────────► Kafka Events ─────────────┐
               │                                          │
               ├─────────────► HTTP/REST ────────────┐   │
               │                                      │   │
               └─────────────► gRPC ─────────────┐   │   │
                                                  │   │   │
┌─────────────────────────────────────────────────┼───┼───┼──────────┐
│                    ML Infrastructure Layer      │   │   │          │
├─────────────────────────────────────────────────┴───┴───┴──────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │    Kafka     │  │    MinIO     │  │   MLflow     │             │
│  │  (Events)    │  │  (Storage)   │  │  (Models)    │             │
│  └──────┬───────┘  └──────────────┘  └──────────────┘             │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────────────────────────────────────────────┐          │
│  │         Lakehouse (Delta Lake)                        │          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │          │
│  │  │ Bronze  │─▶│ Silver  │─▶│  Gold   │              │          │
│  │  │  (Raw)  │  │(Cleaned)│  │(Features)│             │          │
│  │  └─────────┘  └─────────┘  └─────────┘              │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │    Spark     │  │     Ray      │  │   Jupyter    │             │
│  │  (Batch ETL) │  │ (ML Training)│  │  (Analysis)  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Python ML Services (HTTP/REST)                    │
├─────────────────────────────────────────────────────────────────────┤
│  • ML Valuation (port 5000)                                         │
│  • Fraud Detection (port 5002) - PyTorch GNN                        │
│  • Geospatial Service (port 5003) - PostGIS + H3                    │
│  • OCR Service (port 5001) - Tesseract                              │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Go Microservices (gRPC/HTTP)                      │
├─────────────────────────────────────────────────────────────────────┤
│  • Payment Service (gRPC 50051, HTTP 8080)                          │
│  • Notification Service (gRPC 50052, HTTP 8081)                     │
│  • Image Service (gRPC 50053, HTTP 8082)                            │
│  • Developer Service (HTTP 3005)                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- Docker & Docker Compose installed
- At least 8GB RAM available
- 20GB free disk space
- Ports available: 2181, 9092, 29092, 9000, 9001, 5050, 6379, 7077, 8090, 8265, 8888

---

## Step 1: Start ML Infrastructure

### 1.1 Start Core Services

```bash
cd /path/to/realestate-platform

# Start Kafka, MinIO, Spark, Ray, MLflow
docker-compose -f docker-compose.ml-infra.yml up -d

# Check status
docker-compose -f docker-compose.ml-infra.yml ps

# View logs
docker-compose -f docker-compose.ml-infra.yml logs -f
```

### 1.2 Verify Services

**Kafka**: `localhost:29092` (external) / `kafka:9092` (internal)
```bash
# Test Kafka connection
docker exec -it ml-kafka kafka-topics --list --bootstrap-server localhost:9092
```

**MinIO**: http://localhost:9001 (Console)
- Username: `admin`
- Password: `admin123456`
- Buckets: bronze, silver, gold, mlflow, checkpoints, models

**Spark Master**: http://localhost:8090
- Workers: 2 (2GB RAM, 2 cores each)

**MLflow**: http://localhost:5050
- Tracking UI for model experiments
- Model registry

**Ray Dashboard**: http://localhost:8265
- Distributed ML training cluster
- 1 head node + 2 worker nodes

**Jupyter**: http://localhost:8888
- PySpark notebook environment
- Access token in logs: `docker logs ml-jupyter | grep token`

---

## Step 2: Configure TypeScript Application

### 2.1 Environment Variables

Add to `.env`:

```bash
# Kafka Configuration
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:29092
KAFKA_CLIENT_ID=realestate-platform

# MinIO/S3 Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin123456
MINIO_USE_SSL=false

# MLflow Configuration
MLFLOW_TRACKING_URI=http://localhost:5050

# Ray Configuration
RAY_ADDRESS=localhost:10001

# Lakehouse Configuration
LAKEHOUSE_API_URL=http://localhost:8000
TRINO_URL=http://localhost:8082

# Python ML Services
ML_VALUATION_SERVICE_URL=http://localhost:5000
FRAUD_DETECTION_SERVICE_URL=http://localhost:5002
GEOSPATIAL_SERVICE_URL=http://localhost:5003
OCR_SERVICE_URL=http://localhost:5001

# Go Services (gRPC)
PAYMENT_SERVICE_HOST=localhost
PAYMENT_SERVICE_PORT=50051
PAYMENT_SERVICE_HTTP_PORT=8080

NOTIFICATION_SERVICE_HOST=localhost
NOTIFICATION_SERVICE_PORT=50052
NOTIFICATION_SERVICE_HTTP_PORT=8081

IMAGE_SERVICE_HOST=localhost
IMAGE_SERVICE_PORT=50053
IMAGE_SERVICE_HTTP_PORT=8082
```

### 2.2 Restart Application

```bash
pnpm dev
```

The application will now:
- Publish events to Kafka when `KAFKA_ENABLED=true`
- Connect to ML services when available
- Use gRPC clients for Go services

---

## Step 3: Deploy Python ML Services

### 3.1 Fraud Detection Service

```bash
cd services/fraud-detection

# Install dependencies
pip install -r requirements.txt

# Start service
python -m app.main
# Runs on http://localhost:5002
```

**Endpoints**:
- `POST /check` - Check transaction for fraud
- `GET /user/{userId}/risk-profile` - Get user risk profile

### 3.2 ML Valuation Service

```bash
cd services/ml-valuation

# Install dependencies
pip install -r requirements.txt

# Start service
python -m app.main
# Runs on http://localhost:5000
```

**Endpoints**:
- `POST /valuate` - Get property valuation
- `POST /valuate/batch` - Batch valuations
- `GET /trends` - Market trends

### 3.3 Geospatial Service

```bash
cd services/geospatial-service

# Install dependencies
pip install -r requirements.txt

# Start service
python -m app.main
# Runs on http://localhost:5003
```

**Endpoints**:
- `POST /search/nearby` - Radius search
- `POST /search/polygon` - Polygon search
- `POST /heatmap` - Generate heatmap
- `GET /neighborhood/{h3Index}/stats` - Neighborhood stats

### 3.4 OCR Service

```bash
cd services/ocr-service

# Install dependencies
pip install -r requirements.txt

# Start service
python main.py
# Runs on http://localhost:5001
```

**Endpoints**:
- `POST /process` - Process document
- `POST /verify-face` - Verify face match

---

## Step 4: Deploy Go Microservices

### 4.1 Developer Service (HTTP)

```bash
cd services/developer-service

# Build
go build -o bin/developer-service cmd/server/main.go

# Run
PORT=3005 ./bin/developer-service
```

### 4.2 Payment Service (gRPC + HTTP)

```bash
cd services/go/payment-service

# Build
go build -o bin/payment-service cmd/server/main.go

# Run
./bin/payment-service
# gRPC: localhost:50051
# HTTP: localhost:8080
```

### 4.3 Notification Service (gRPC + HTTP)

```bash
cd services/go/notification-service

# Build
go build -o bin/notification-service cmd/server/main.go

# Run
./bin/notification-service
# gRPC: localhost:50052
# HTTP: localhost:8081
```

### 4.4 Image Service (gRPC + HTTP)

```bash
cd services/go/image-service

# Build
go build -o bin/image-service cmd/server/main.go

# Run
./bin/image-service
# gRPC: localhost:50053
# HTTP: localhost:8082
```

---

## Step 5: Test End-to-End ML Pipeline

### 5.1 Test Event Flow

```typescript
// In TypeScript application
import { kafkaPublisher, TOPICS } from './server/_core/kafkaPublisher';

// Publish recommendation event
await kafkaPublisher.publishRecommendationEvent({
  userId: 123,
  propertyId: 456,
  action: 'view',
  score: 0.85,
  metadata: { source: 'smart_recommendations' }
});
```

### 5.2 Verify Kafka Topic

```bash
# List topics
docker exec -it ml-kafka kafka-topics --list --bootstrap-server localhost:9092

# Consume events
docker exec -it ml-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic recommendations \
  --from-beginning
```

### 5.3 Run Lakehouse ETL

```bash
# Bronze layer ingestion (Kafka → MinIO)
docker exec -it ml-spark-master spark-submit \
  --master spark://spark-master:7077 \
  /opt/spark-apps/bronze_ingestion.py

# Silver layer transformation
docker exec -it ml-spark-master spark-submit \
  --master spark://spark-master:7077 \
  /opt/spark-apps/silver_transformation.py

# Gold layer aggregation
docker exec -it ml-spark-master spark-submit \
  --master spark://spark-master:7077 \
  /opt/spark-apps/gold_aggregation.py
```

### 5.4 Train ML Model

```python
# In Jupyter notebook (http://localhost:8888)
import ray
from ray import train
import mlflow

# Connect to Ray cluster
ray.init(address="ray://ray-head:10001")

# Load training data from Gold layer
# Train model using Ray
# Log to MLflow
# Deploy model
```

### 5.5 Test Python ML Service

```bash
# Test fraud detection
curl -X POST http://localhost:5002/check \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123",
    "transactionId": "txn_456",
    "amount": 50000,
    "transactionType": "purchase",
    "metadata": {"ipAddress": "1.2.3.4"}
  }'

# Test ML valuation
curl -X POST http://localhost:5000/valuate \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prop_123",
    "features": {
      "bedrooms": 3,
      "bathrooms": 2,
      "sqft": 1500,
      "location": {"lat": 37.7749, "lng": -122.4194},
      "propertyType": "single_family"
    }
  }'
```

### 5.6 Test Go Service (gRPC)

```bash
# Install grpcurl
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# Test payment service
grpcurl -plaintext \
  -d '{"userId":"123","amount":1000,"currency":"USD","paymentMethod":"card"}' \
  localhost:50051 \
  payment.PaymentService/ProcessPayment
```

---

## Step 6: Monitor & Troubleshoot

### 6.1 Check Service Health

```bash
# ML Infrastructure
docker-compose -f docker-compose.ml-infra.yml ps

# Python services
curl http://localhost:5000/health  # ML Valuation
curl http://localhost:5002/health  # Fraud Detection
curl http://localhost:5003/health  # Geospatial

# Go services
curl http://localhost:8080/health  # Payment
curl http://localhost:8081/health  # Notification
curl http://localhost:8082/health  # Image
curl http://localhost:3005/health  # Developer
```

### 6.2 View Logs

```bash
# ML Infrastructure
docker-compose -f docker-compose.ml-infra.yml logs -f kafka
docker-compose -f docker-compose.ml-infra.yml logs -f spark-master
docker-compose -f docker-compose.ml-infra.yml logs -f ray-head
docker-compose -f docker-compose.ml-infra.yml logs -f mlflow

# Python services
tail -f services/fraud-detection/logs/app.log
tail -f services/ml-valuation/logs/app.log

# TypeScript application
pnpm dev  # Shows Kafka connection logs
```

### 6.3 Common Issues

**Kafka Connection Failed**:
- Ensure `KAFKA_ENABLED=true` in `.env`
- Check Kafka is running: `docker ps | grep kafka`
- Verify broker address: `localhost:29092` for external, `kafka:9092` for internal

**Python Service Not Responding**:
- Check service is running: `ps aux | grep python`
- Verify port not in use: `lsof -i :5000`
- Check dependencies: `pip list`

**gRPC Connection Failed**:
- Ensure `.proto` files are generated
- Check service is running on correct port
- Verify firewall allows gRPC ports

---

## Step 7: Production Deployment

### 7.1 Kubernetes Deployment

```bash
# Deploy ML infrastructure
kubectl apply -f deployments/kubernetes/ml-infrastructure/

# Deploy Python services
kubectl apply -f deployments/kubernetes/python-services/

# Deploy Go services
kubectl apply -f deployments/kubernetes/go-services/
```

### 7.2 Environment-Specific Configuration

**Development**:
- `KAFKA_ENABLED=false` (optional, for faster dev)
- Local Docker Compose for services

**Staging**:
- `KAFKA_ENABLED=true`
- Kubernetes cluster with 3 Kafka brokers
- Managed MinIO or S3

**Production**:
- `KAFKA_ENABLED=true`
- Confluent Cloud or AWS MSK for Kafka
- AWS S3 for lakehouse storage
- Managed Ray cluster (Anyscale)
- MLflow on dedicated server

---

## Architecture Benefits

✅ **Scalability**: Ray cluster scales ML training across multiple nodes  
✅ **Reliability**: Kafka ensures event delivery, Delta Lake provides ACID transactions  
✅ **Observability**: MLflow tracks all model experiments and versions  
✅ **Performance**: Spark handles batch ETL, Flink for real-time processing  
✅ **Flexibility**: Python for ML, Go for high-performance services, TypeScript for application logic  

---

## Next Steps

1. **Set up monitoring**: Prometheus + Grafana for metrics
2. **Configure alerts**: Alertmanager for service failures
3. **Implement CI/CD**: Automated model retraining pipeline
4. **Add feature store**: Feast for ML feature management
5. **Enable A/B testing**: Experiment framework for model comparison

---

## Support

For issues or questions:
- Check logs in `docker-compose.ml-infra.yml logs`
- Review TypeScript application logs for Kafka connection status
- Consult `INFRASTRUCTURE_AUDIT.md` for service details
