# GNN Service Deployment Guide

Complete guide for deploying the Python GNN (Graph Neural Network) service for real-time property valuation and scoring.

## Overview

The GNN service provides AI-powered property analysis using Graph Neural Networks to:
- Score properties based on neighborhood influence
- Detect "hot deals" with investment potential
- Calculate network centrality and growth metrics
- Provide real-time property recommendations

## Prerequisites

### System Requirements
- Python 3.8 or higher
- 4GB RAM minimum (8GB recommended)
- Redis (optional, for caching)
- GPU support (optional, for faster inference)

### Dependencies
All dependencies are listed in `services/python/requirements-gnn.txt`:
- Flask & Gunicorn (web server)
- PyTorch & PyTorch Geometric (GNN models)
- NumPy & scikit-learn (data processing)
- Redis (caching layer)

## Quick Start

### 1. Deploy the Service

```bash
cd /home/ubuntu/realestate-platform
./services/python/deploy-gnn-service.sh
```

The script will:
- Create Python virtual environment
- Install all dependencies
- Start the service on port 5002
- Run health checks

### 2. Verify Deployment

Check service health:
```bash
curl http://localhost:5002/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "GNN Property Valuation",
  "version": "1.0.0",
  "cache_enabled": true
}
```

### 3. Configure Frontend Connection

The TypeScript frontend automatically connects to the GNN service via environment variable:

```bash
# In .env file
GNN_SERVICE_URL=http://localhost:5002
```

If not set, defaults to `http://localhost:5002`.

## API Endpoints

### Health Check
```
GET /health
```

### Score Single Property
```
POST /api/score-property
Content-Type: application/json

{
  "property_id": 123,
  "price": 500000,
  "bedrooms": 3,
  "bathrooms": 2,
  "sqft": 2000,
  "latitude": 6.4541,
  "longitude": 3.3947
}
```

Response:
```json
{
  "property_id": 123,
  "investment_score": 85.5,
  "growth_potential": 78.2,
  "network_centrality": 0.72,
  "neighborhood_influence": 0.68,
  "is_hot_deal": true,
  "confidence": 0.89
}
```

### Batch Score Properties
```
POST /api/batch-score
Content-Type: application/json

{
  "properties": [
    { "property_id": 123, "price": 500000, ... },
    { "property_id": 124, "price": 450000, ... }
  ]
}
```

## Service Management

### Start Service
```bash
./services/python/deploy-gnn-service.sh
```

### Stop Service
```bash
pkill -f gnn_service.py
```

### Restart Service
```bash
pkill -f gnn_service.py
./services/python/deploy-gnn-service.sh
```

### View Logs
```bash
# Real-time logs
tail -f services/python/logs/gnn-service.log

# Access logs (Gunicorn)
tail -f services/python/logs/access.log

# Error logs (Gunicorn)
tail -f services/python/logs/error.log
```

## Performance Optimization

### Enable Redis Caching

1. Install Redis:
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

2. Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

3. The GNN service automatically uses Redis if available

### GPU Acceleration

For faster inference with GPU:

1. Install CUDA toolkit (if not already installed)
2. Install GPU-enabled PyTorch:
```bash
source services/python/venv/bin/activate
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

3. Restart the service

## Integration with Frontend

The GNN service is automatically integrated with:

1. **Live Property Feed** (`/components/LivePropertyFeed.tsx`)
   - Real-time hot deal detection
   - Property scoring with GNN

2. **Advanced Search** (`/pages/AdvancedSearch.tsx`)
   - Investment potential filter
   - Neighborhood growth filter
   - Network centrality ranking

3. **Investment Dashboard** (`/pages/InvestmentDashboard.tsx`)
   - Top opportunities ranking
   - Market trends visualization
   - ROI projections

## Monitoring

### Health Monitoring

The frontend automatically monitors GNN service health via `gnnServiceClient.ts`:
- Automatic health checks every 30 seconds
- Graceful fallback to mock data if service unavailable
- Error logging and alerts

### Performance Metrics

Monitor service performance:
```bash
# Check response times
curl -w "@-" -o /dev/null -s http://localhost:5002/health <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF
```

## Troubleshooting

### Service Won't Start

1. Check if port 5002 is already in use:
```bash
lsof -i :5002
```

2. Check Python version:
```bash
python3 --version
# Should be 3.8 or higher
```

3. Check logs for errors:
```bash
cat services/python/logs/gnn-service.log
```

### Low Performance

1. Enable Redis caching (see above)
2. Consider GPU acceleration for large-scale inference
3. Increase Gunicorn workers:
```bash
# Edit deploy-gnn-service.sh
# Change: gunicorn -w 4 ...
# To: gunicorn -w 8 ...
```

### Connection Errors from Frontend

1. Verify service is running:
```bash
curl http://localhost:5002/health
```

2. Check firewall settings:
```bash
sudo ufw status
# Allow port 5002 if needed
sudo ufw allow 5002
```

3. Check environment variable in frontend:
```bash
echo $GNN_SERVICE_URL
```

## Production Deployment

### AWS/Cloud Deployment

1. **Use GPU instances** for better performance:
   - AWS: g4dn.xlarge (NVIDIA T4 GPU)
   - GCP: n1-standard-4 with T4 GPU
   - Azure: NC6 (NVIDIA K80)

2. **Configure load balancer** for high availability

3. **Enable HTTPS** with SSL certificate

4. **Set up monitoring** with CloudWatch/Stackdriver

### Docker Deployment

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY services/python/ /app/
RUN pip install -r requirements-gnn.txt

EXPOSE 5002
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5002", "gnn_service:app"]
```

Build and run:
```bash
docker build -t gnn-service .
docker run -d -p 5002:5002 gnn-service
```

## Model Training

For production use, train the GNN model with historical data:

1. Collect training data (see `docs/GPU_TRAINING_DEPLOYMENT.md`)
2. Train GraphSAGE model with PyTorch Geometric
3. Save model weights to `services/python/models/gnn_model.pth`
4. Restart service to load trained model

## Support

For issues or questions:
- Check logs: `services/python/logs/`
- Review API documentation above
- Consult GPU training guide: `docs/GPU_TRAINING_DEPLOYMENT.md`
