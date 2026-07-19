# ML Services Deployment Guide

This directory contains the 5 microservices for the Zestimate ML system.

---

## Services Overview

| Service | Port | Purpose | Technology |
|---------|------|---------|------------|
| **GNN Valuation** | 5003 | Neighborhood influence analysis | PyTorch Geometric |
| **Computer Vision** | 5004 | Aerial + street view assessment | ResNet, Google Maps API |
| **Alternative Data** | 5005 | POI, economic indicators | Google Places API |
| **Ensemble** | 5006 | XGBoost, LightGBM, CatBoost, NN | Scikit-learn |
| **Bias Correction** | 5007 | Fairness monitoring | Fairlearn |
| **MLflow** | 5001 | Model versioning | MLflow |
| **Redis** | 6380 | Caching layer | Redis |

---

## Quick Start

### 1. Prerequisites

```bash
# Install Docker and Docker Compose
docker --version
docker-compose --version

# Set environment variables
cp .env.example .env
# Edit .env and add:
# - DATABASE_URL
# - GOOGLE_MAPS_API_KEY
# - USE_OSM=false
```

### 2. Build and Start Services

```bash
# Build all services
docker-compose -f docker-compose.ml.yml build

# Start all services
docker-compose -f docker-compose.ml.yml up -d

# View logs
docker-compose -f docker-compose.ml.yml logs -f

# Check service health
docker-compose -f docker-compose.ml.yml ps
```

### 3. Verify Services

```bash
# Check GNN service
curl http://localhost:5003/health

# Check CV service
curl http://localhost:5004/health

# Check AltData service
curl http://localhost:5005/health

# Check Ensemble service
curl http://localhost:5006/health

# Check Bias service
curl http://localhost:5007/health

# Check MLflow
curl http://localhost:5001/health
```

---

## Service Details

### GNN Valuation Service (Port 5003)

**Endpoints:**
- `GET /health` - Health check
- `POST /valuation` - Get GNN-based valuation
- `GET /metrics` - Service metrics

**Request:**
```json
{
  "property_id": 123,
  "latitude": 6.5244,
  "longitude": 3.3792,
  "square_feet": 2500,
  "bedrooms": 3,
  "bathrooms": 2,
  "year_built": 2015
}
```

**Response:**
```json
{
  "property_id": 123,
  "estimated_value": 125000000,
  "confidence": 0.85,
  "neighborhood_score": 8.5,
  "comparable_sales": 24,
  "market_trend": 0.05,
  "factors": {
    "location_premium": 0.12,
    "neighborhood_quality": 0.08
  },
  "neighbors": [...],
  "timestamp": "2025-11-20T12:00:00Z"
}
```

### Computer Vision Service (Port 5004)

**Endpoints:**
- `GET /health` - Health check
- `POST /assess` - Analyze property images
- `GET /metrics` - Service metrics

**Request:**
```json
{
  "property_id": 123,
  "latitude": 6.5244,
  "longitude": 3.3792
}
```

**Response:**
```json
{
  "property_id": 123,
  "aerial_image_url": "https://...",
  "street_image_url": "https://...",
  "overall_condition": "excellent",
  "roof_condition": "good",
  "exterior_quality": "good",
  "landscaping": "average",
  "curb_appeal": "high",
  "confidence": 0.82,
  "timestamp": "2025-11-20T12:00:00Z"
}
```

### Alternative Data Service (Port 5005)

**Endpoints:**
- `GET /health` - Health check
- `POST /analyze` - Get POI and economic data
- `GET /metrics` - Service metrics

**Request:**
```json
{
  "property_id": 123,
  "latitude": 6.5244,
  "longitude": 3.3792
}
```

**Response:**
```json
{
  "property_id": 123,
  "poi_counts": {
    "schools": 5,
    "restaurants": 12,
    "shopping": 8,
    "healthcare": 3
  },
  "poi_distances": {
    "schools": 0.8,
    "restaurants": 0.5
  },
  "economic_indicators": {
    "employment_rate": 0.92,
    "income_growth": 0.08
  },
  "timestamp": "2025-11-20T12:00:00Z"
}
```

### Ensemble Service (Port 5006)

**Endpoints:**
- `GET /health` - Health check
- `POST /predict` - Get ensemble prediction
- `GET /metrics` - Service metrics

**Request:**
```json
{
  "property_id": 123,
  "features": {
    "square_feet": 2500,
    "bedrooms": 3,
    "bathrooms": 2,
    "year_built": 2015,
    "latitude": 6.5244,
    "longitude": 3.3792
  }
}
```

**Response:**
```json
{
  "property_id": 123,
  "estimated_value": 125000000,
  "model_predictions": {
    "xgboost": 123000000,
    "lightgbm": 126000000,
    "catboost": 124000000,
    "neural_network": 127000000
  },
  "confidence": 0.88,
  "timestamp": "2025-11-20T12:00:00Z"
}
```

### Bias Correction Service (Port 5007)

**Endpoints:**
- `GET /health` - Health check
- `POST /calibrate` - Apply bias correction
- `GET /metrics` - Service metrics

**Request:**
```json
{
  "property_id": 123,
  "raw_valuation": 125000000,
  "property_features": {
    "location": "Lekki",
    "property_type": "apartment"
  }
}
```

**Response:**
```json
{
  "property_id": 123,
  "raw_valuation": 125000000,
  "calibrated_valuation": 123500000,
  "bias_adjustment": -0.012,
  "fairness_score": 0.95,
  "timestamp": "2025-11-20T12:00:00Z"
}
```

---

## Model Training

### 1. Collect Training Data

```bash
# Run data collection script
cd /home/ubuntu/realestate-platform
node scripts/collect-training-data.mjs

# Verify data
ls -lh data/training/
```

### 2. Train GNN Model

```bash
# Enter GNN service container
docker-compose -f docker-compose.ml.yml exec gnn-service bash

# Run training script
python train_gnn.py --data /data/neighborhood_graph.csv --epochs 100

# Model will be saved to /models/gnn_model.pt
```

### 3. Train Ensemble Models

```bash
# Enter ensemble service container
docker-compose -f docker-compose.ml.yml exec ensemble-service bash

# Run training script
python train_ensemble.py --data /data/train.csv

# Models will be saved to /models/
```

### 4. Train Computer Vision Model

```bash
# Enter CV service container
docker-compose -f docker-compose.ml.yml exec cv-service bash

# Run training script
python train_cv.py --aerial-images /images/aerial --street-images /images/street

# Model will be saved to /models/resnet_model.pt
```

### 5. Calibrate Bias Correction

```bash
# Enter bias service container
docker-compose -f docker-compose.ml.yml exec bias-service bash

# Run calibration script
python calibrate_bias.py --data /data/train.csv

# Model will be saved to /models/bias_calibration.pkl
```

---

## Monitoring

### MLflow UI

Access MLflow at http://localhost:5001

- View model versions
- Compare experiments
- Track metrics

### Service Logs

```bash
# View all logs
docker-compose -f docker-compose.ml.yml logs -f

# View specific service
docker-compose -f docker-compose.ml.yml logs -f gnn-service
```

### Redis CLI

```bash
# Connect to Redis
docker-compose -f docker-compose.ml.yml exec redis redis-cli

# Check cached keys
KEYS gnn:valuation:*
KEYS cv:assessment:*
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.ml.yml logs <service-name>

# Rebuild service
docker-compose -f docker-compose.ml.yml build --no-cache <service-name>
docker-compose -f docker-compose.ml.yml up -d <service-name>
```

### Model Not Found

```bash
# Check model files
docker-compose -f docker-compose.ml.yml exec gnn-service ls -lh /models/

# Train model if missing (see Model Training section)
```

### Redis Connection Failed

```bash
# Check Redis status
docker-compose -f docker-compose.ml.yml ps redis

# Restart Redis
docker-compose -f docker-compose.ml.yml restart redis
```

---

## Production Deployment

### Kubernetes

```bash
# Convert Docker Compose to Kubernetes
kompose convert -f docker-compose.ml.yml

# Apply to cluster
kubectl apply -f .
```

### Scaling

```bash
# Scale specific service
docker-compose -f docker-compose.ml.yml up -d --scale gnn-service=3
```

---

## Cost Optimization

### Enable Caching

All services use Redis caching by default:
- GNN valuations: 24 hours
- CV assessments: 30 days
- POI data: 7 days

### Use OpenStreetMap

Set `USE_OSM=true` to use free OpenStreetMap instead of Google Maps:

```bash
# In .env
USE_OSM=true
GOOGLE_MAPS_API_KEY=  # Leave empty
```

**Savings:** ~$7 per 1,000 valuations

---

## Next Steps

1. ✅ Deploy services with Docker Compose
2. ✅ Collect training data
3. ⏳ Train all 5 models
4. ⏳ Integrate with main application
5. ⏳ Monitor performance and retrain as needed

---

**Last Updated:** 2025-11-20
