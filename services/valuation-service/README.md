# Valuation Service (Python)

ML-powered property valuation service using PyTorch neural networks, comparative market analysis, and Ray for distributed inference.

## Features

- **ML-Based Valuation** - Neural network model for property value prediction
- **Comparative Market Analysis** - Find and analyze comparable property sales
- **Confidence Scoring** - Confidence intervals for valuation estimates
- **Market Trends** - Real-time market trend analysis
- **Batch Processing** - Valuate multiple properties in parallel
- **Ray Integration** - Distributed ML inference at scale
- **MLflow Tracking** - Model versioning and experiment tracking

## Architecture

```
┌──────────────┐
│   FastAPI    │
│   Server     │
└──────┬───────┘
       │
┌──────▼──────────────────────────────┐
│       Valuation Service              │
│  (Business Logic + ML Inference)     │
└──┬────┬────┬────────────────────────┘
   │    │    │
   │    │    └──────────┐
   │    │               │
┌──▼────▼──┐  ┌────────▼────┐  ┌─────▼─────┐
│ PyTorch  │  │     Ray     │  │  MLflow   │
│  Model   │  │(Distributed)│  │ (Registry)│
└──────────┘  └─────────────┘  └───────────┘
```

## Technology Stack

- **Language:** Python 3.11
- **Web Framework:** FastAPI
- **ML Framework:** PyTorch
- **Distributed Computing:** Ray
- **Model Registry:** MLflow
- **Async:** AsyncIO, AIOHTTP
- **Database:** AsyncPG (PostgreSQL)
- **Cache:** Redis
- **Messaging:** Kafka (aiokafka)

## API Endpoints

### Valuations

```
POST   /api/v1/valuations          Valuate single property
POST   /api/v1/valuations/batch    Valuate multiple properties
GET    /api/v1/valuations/health   Health check
GET    /api/v1/valuations/ready    Readiness check
```

## Request/Response Examples

### Single Valuation

**Request:**
```json
{
  "property_id": "123e4567-e89b-12d3-a456-426614174000",
  "property_type": "house",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "city": "San Francisco",
    "state": "CA",
    "postal_code": "94102",
    "country": "USA"
  },
  "features": {
    "bedrooms": 3,
    "bathrooms": 2,
    "square_feet": 2000,
    "lot_size": 5000,
    "year_built": 1995,
    "parking": 2,
    "features": ["hardwood_floors", "updated_kitchen"],
    "amenities": ["pool", "gym"]
  }
}
```

**Response:**
```json
{
  "property_id": "123e4567-e89b-12d3-a456-426614174000",
  "estimated_value": 1250000,
  "confidence_score": 0.87,
  "value_range_low": 1162500,
  "value_range_high": 1337500,
  "comparable_sales": [
    {
      "property_id": "...",
      "address": "123 Main St",
      "sale_price": 1200000,
      "sale_date": "2024-10-15T00:00:00Z",
      "distance_km": 0.8,
      "similarity_score": 0.92,
      "bedrooms": 3,
      "bathrooms": 2,
      "square_feet": 2000
    }
  ],
  "market_trends": {
    "area": "San Francisco, CA",
    "median_price": 1300000,
    "price_change_1m": 1.2,
    "price_change_3m": 3.5,
    "price_change_1y": 8.7,
    "inventory_level": "low",
    "days_on_market": 18,
    "price_per_sqft": 625
  },
  "valuation_date": "2024-11-17T00:00:00Z",
  "model_version": "v1.0.0"
}
```

## ML Model

### Architecture

The valuation model uses a multi-input neural network:

1. **Feature Encoder** - Processes property features (bedrooms, bathrooms, size, etc.)
2. **Location Encoder** - Processes geospatial features (lat/lon, neighborhood embeddings)
3. **Combined Network** - Fuses encoded features
4. **Dual Heads** - Predicts both value and confidence

### Training

```python
# Train the model
python scripts/train_model.py \
    --data data/properties.csv \
    --epochs 100 \
    --batch-size 32 \
    --learning-rate 0.001
```

### Inference

The model performs inference in two modes:

1. **Single Prediction** - Fast inference for individual properties
2. **Batch Prediction** - Distributed inference using Ray for multiple properties

## Configuration

Environment variables:

```bash
# Application
APP_NAME=Valuation Service
APP_VERSION=1.0.0
DEBUG=false

# Server
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/realestate

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=valuation-events
KAFKA_GROUP_ID=valuation-service

# Ray
RAY_ADDRESS=auto
RAY_NAMESPACE=valuation

# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000
MLFLOW_EXPERIMENT_NAME=property-valuation

# Model
MODEL_PATH=./models
MODEL_VERSION=v1.0.0

# Valuation
MAX_COMPARABLE_DISTANCE_KM=10.0
MIN_COMPARABLE_PROPERTIES=3
MAX_COMPARABLE_PROPERTIES=10
CONFIDENCE_THRESHOLD=0.7
```

## Running Locally

### Prerequisites

- Python 3.11+
- PostgreSQL
- Redis
- Ray cluster (optional)
- MLflow server (optional)

### Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the service:
```bash
python -m app.main
```

Or with uvicorn:
```bash
uvicorn app.main:app --reload --port 8000
```

## Building

### Local Build
```bash
pip install -r requirements.txt
```

### Docker Build
```bash
docker build -t valuation-service:latest .
```

### Docker Run
```bash
docker run -p 8000:8000 \
    -e DATABASE_URL=postgresql+asyncpg://postgres:password@host.docker.internal:5432/realestate \
    -e REDIS_HOST=host.docker.internal \
    valuation-service:latest
```

## Testing

Run tests:
```bash
pytest tests/
```

Run tests with coverage:
```bash
pytest --cov=app tests/
```

## Ray Integration

For distributed inference at scale:

1. Start Ray cluster:
```bash
ray start --head
```

2. Configure Ray address:
```bash
export RAY_ADDRESS=auto
```

3. The service will automatically use Ray for batch predictions

## MLflow Integration

Track experiments and models:

1. Start MLflow server:
```bash
mlflow server --host 0.0.0.0 --port 5000
```

2. Configure MLflow URI:
```bash
export MLFLOW_TRACKING_URI=http://localhost:5000
```

3. View experiments at http://localhost:5000

## Performance

- **Single Valuation:** ~50ms (CPU), ~10ms (GPU)
- **Batch Valuation (100 properties):** ~500ms (CPU), ~100ms (GPU)
- **With Ray (10 workers):** ~100ms for 100 properties

## License

Proprietary - Real Estate Platform
