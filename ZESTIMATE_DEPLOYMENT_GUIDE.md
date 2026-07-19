# Zestimate ML Services - Deployment & Training Guide

Complete guide for deploying Zestimate ML services outside of Manus platform with external Google Maps API.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Google Maps API Configuration](#google-maps-api-configuration)
4. [ML Services Deployment](#ml-services-deployment)
5. [Database Setup](#database-setup)
6. [Model Training](#model-training)
7. [Testing & Validation](#testing--validation)
8. [Production Deployment](#production-deployment)

---

## Prerequisites

### Required Software
- **Python 3.11+** with pip
- **Node.js 22+** with pnpm
- **MySQL 8.0+** (or TiDB Cloud)
- **Redis** (optional, for caching)

### Required API Keys
- **Google Maps API Key** with the following APIs enabled:
  - Maps Static API
  - Street View Static API
  - Places API
  - Geocoding API

---

## Environment Setup

### 1. Copy Environment Template

```bash
cp .env.zestimate.example .env
```

### 2. Configure Environment Variables

Edit `.env` and add your Google Maps API key:

```bash
# Google Maps API (REQUIRED for production)
GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here

# ML Service URLs (adjust for your deployment)
GNN_SERVICE_URL=http://localhost:5003
CV_SERVICE_URL=http://localhost:5004
ALTDATA_SERVICE_URL=http://localhost:5005
ENSEMBLE_SERVICE_URL=http://localhost:5006
BIAS_SERVICE_URL=http://localhost:5007

# Optional: Use OpenStreetMap instead of Google Maps for aerial imagery
USE_OSM=false

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false
```

### 3. Install Python Dependencies

```bash
cd services/python
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install flask flask-cors requests numpy
```

---

## Google Maps API Configuration

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable billing for the project

### 2. Enable Required APIs

Navigate to **APIs & Services > Library** and enable:

- ✅ **Maps Static API** - For aerial imagery
- ✅ **Street View Static API** - For street-level photos
- ✅ **Places API** - For POI data (restaurants, schools, etc.)
- ✅ **Geocoding API** - For address lookups

### 3. Create API Key

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > API Key**
3. Copy the API key
4. **Restrict the API key** (recommended):
   - Application restrictions: HTTP referrers or IP addresses
   - API restrictions: Select the 4 APIs listed above

### 4. Set API Key Quotas (Optional)

To control costs, set daily quotas:
- Maps Static API: 25,000 requests/day (free tier)
- Street View Static API: 25,000 requests/day (free tier)
- Places API: Varies by usage
- Geocoding API: Varies by usage

### 5. Pricing Estimates

**Free tier (per month):**
- Maps Static API: $200 credit (~28,500 requests)
- Street View Static API: $200 credit (~28,500 requests)
- Places API: $200 credit (~varies)

**Estimated costs for 1,000 property valuations:**
- Aerial imagery: ~$7 (1,000 requests × $0.007)
- Street view: ~$7 (1,000 requests × $0.007)
- POI data: ~$17 (5,000 requests × $0.0035)
- **Total: ~$31/1,000 valuations**

---

## ML Services Deployment

### Option 1: Local Development

Start all services locally:

```bash
cd services/python
source venv/bin/activate

# Start all services (separate terminals)
PORT=5003 python zestimate_gnn_service.py &
PORT=5004 python zestimate_cv_service.py &
PORT=5005 python zestimate_altdata_service.py &
PORT=5006 python zestimate_ensemble_service.py &
PORT=5007 python zestimate_bias_service.py &
```

### Option 2: Production Deployment

For production, deploy each service separately using your preferred method:

**Cloud Platforms:**
- **AWS**: ECS/Fargate, Lambda
- **GCP**: Cloud Run, Cloud Functions  
- **Azure**: Container Instances, Azure Functions
- **Heroku**: Container deployment

**Self-Hosted:**
- Docker containers with systemd
- PM2 for process management
- Nginx reverse proxy

---

## Database Setup

### 1. Run Migrations

The valuation tables are already created via Drizzle. Verify:

```bash
pnpm db:push
```

### 2. Verify Tables

Check that these tables exist:
- `property_valuations`
- `valuation_history`
- `visual_assessments`
- `alternative_data_cache`
- `neighborhood_graph`
- `fairness_metrics`

---

## Model Training

### Data Collection

#### 1. Historical Transaction Data

Collect historical property sales data:

```sql
-- Export historical sales for training
SELECT 
  p.id,
  p.price as actual_price,
  p.squareFeet,
  p.bedrooms,
  p.bathrooms,
  p.yearBuilt,
  p.latitude,
  p.longitude,
  p.zipCode,
  p.soldDate
FROM properties p
WHERE p.status = 'sold'
  AND p.soldDate IS NOT NULL
  AND p.soldDate >= DATE_SUB(NOW(), INTERVAL 2 YEAR)
ORDER BY p.soldDate DESC;
```

Save to `data/training/historical_sales.csv`

#### 2. Neighborhood Data

Build neighborhood graphs using the GNN service or SQL:

```sql
-- Find k-nearest neighbors for each property
SELECT 
  p1.id as property_id,
  p2.id as neighbor_id,
  (
    6371 * acos(
      cos(radians(CAST(p1.latitude AS DECIMAL(10,8)))) * 
      cos(radians(CAST(p2.latitude AS DECIMAL(10,8)))) * 
      cos(radians(CAST(p2.longitude AS DECIMAL(11,8))) - radians(CAST(p1.longitude AS DECIMAL(11,8)))) + 
      sin(radians(CAST(p1.latitude AS DECIMAL(10,8)))) * 
      sin(radians(CAST(p2.latitude AS DECIMAL(10,8))))
    ) * 0.621371
  ) as distance_miles,
  p2.price as neighbor_price
FROM properties p1
CROSS JOIN properties p2
WHERE p1.id != p2.id
  AND p1.status = 'sold'
  AND p2.status = 'sold'
HAVING distance_miles < 2.0
ORDER BY p1.id, distance_miles;
```

### Training Process

The current ML services use **mock models** that return realistic predictions based on input data. To train real models:

1. **Collect Data**: Gather 2+ years of historical sales
2. **Feature Engineering**: Extract features from property data
3. **Train Models**: Use scikit-learn, XGBoost, LightGBM, PyTorch
4. **Evaluate**: Calculate MAPE on test set (target < 5%)
5. **Deploy**: Replace mock prediction logic with trained models
6. **Monitor**: Track prediction accuracy over time

---

## Testing & Validation

### 1. Health Checks

Verify all services are running:

```bash
curl http://localhost:5003/health  # GNN
curl http://localhost:5004/health  # CV
curl http://localhost:5005/health  # AltData
curl http://localhost:5006/health  # Ensemble
curl http://localhost:5007/health  # Bias
```

### 2. End-to-End Test

Test complete valuation flow via tRPC:

```typescript
// Frontend test
const valuation = await trpc.zestimate.getValuation.query({ 
  propertyId: 30001 
});
console.log(valuation);
```

### 3. Model Evaluation

Calculate MAPE (Mean Absolute Percentage Error):

```sql
SELECT 
  AVG(ABS((CAST(estimatedValue AS DECIMAL) - p.price) / p.price)) * 100 as mape_percentage
FROM property_valuations pv
JOIN properties p ON pv.propertyId = p.id
WHERE p.status = 'sold' AND p.price IS NOT NULL;
```

Target: **< 5% MAPE** for high-quality valuations

---

## Production Deployment

### 1. Security Checklist

- ✅ API keys stored in environment variables (not in code)
- ✅ HTTPS/TLS enabled for all services
- ✅ Rate limiting on API endpoints
- ✅ Input validation on all endpoints
- ✅ CORS configured properly

### 2. Monitoring

Set up monitoring for:
- Service health (uptime)
- Response times
- Error rates
- API quota usage (Google Maps)
- Model prediction accuracy

### 3. Scaling

**Horizontal Scaling:**
- Deploy multiple instances of each service
- Use load balancer (nginx, AWS ALB, etc.)

**Caching:**
- Enable Redis for caching valuations (24-hour TTL)
- Cache POI data (7-day TTL)
- Cache visual assessments (30-day TTL)

### 4. Cost Optimization

**Google Maps API:**
- Cache results aggressively
- Use batch requests where possible
- Set daily quotas to prevent overages
- Consider OpenStreetMap for aerial imagery (free)

**Compute:**
- Use auto-scaling for services
- Consider serverless for low-traffic deployments
- Use spot instances for training jobs

---

## Troubleshooting

### Services Won't Start

**Error: "ModuleNotFoundError: No module named 'flask_cors'"**

Solution:
```bash
cd services/python
source venv/bin/activate
pip install flask flask-cors requests numpy
```

### Google Maps API Errors

**Error: "REQUEST_DENIED"**

Solutions:
- Verify API key is correct in `.env`
- Check that required APIs are enabled in Google Cloud Console
- Verify API key restrictions allow your server IP/domain

**Error: "OVER_QUERY_LIMIT"**

Solutions:
- Check daily quota in Google Cloud Console
- Implement rate limiting
- Enable caching to reduce API calls

### Database Connection Issues

**Error: "Database not available"**

Solutions:
- Verify `DATABASE_URL` is set correctly
- Check database is running and accessible
- Run `pnpm db:push` to ensure schema is up to date

---

## API Usage

### Frontend Integration

```typescript
import { trpc } from '@/lib/trpc';

// Get comprehensive valuation
const { data } = trpc.zestimate.getValuation.useQuery({ 
  propertyId: 123 
});

// Get visual assessment
const { data: assessment } = trpc.zestimate.getVisualAssessment.useQuery({
  propertyId: 123
});

// Get alternative data
const { data: altData } = trpc.zestimate.getAlternativeData.useQuery({
  propertyId: 123
});

// Get all insights at once
const { data: insights } = trpc.zestimate.getComprehensiveInsights.useQuery({
  propertyId: 123
});
```

---

## Next Steps

1. ✅ Deploy ML services
2. ✅ Configure Google Maps API
3. ✅ Run database migrations
4. ⏳ Collect historical transaction data
5. ⏳ Train models with real data
6. ⏳ Calibrate bias correction
7. ⏳ Deploy to production
8. ⏳ Monitor and optimize

---

**Last Updated:** 2025-11-20
