# City2Graph GNN Integration Documentation

## Overview

This document describes the comprehensive City2Graph integration with Graph Neural Networks (GNN) for advanced property valuation, market predictions, and spatial intelligence. The system is specifically optimized for developing countries like Nigeria where data may be scarce.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ GNN Valuation│  │Market Trends │  │Neighborhood  │      │
│  │   Display    │  │  Dashboard   │  │Intelligence  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          │ tRPC
┌─────────────────────────────────────────────────────────────┐
│                 Backend (TypeScript/Node.js)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              GNN Service Client                       │   │
│  │  (TypeScript client with type-safe interfaces)       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│              Python Microservices (Flask)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ GNN Valuation│  │Market Trends │  │Neighborhood  │      │
│  │   Service    │  │  Prediction  │  │Intelligence  │      │
│  │  (Port 5008) │  │ (Port 5009)  │  │ (Port 5010)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│    ┌────┴──────────────────┴──────────────────┴────┐        │
│    │    PyTorch Geometric + City2Graph + OSMnx     │        │
│    └───────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────────┐
│                    Data Sources                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ OSM Street   │  │ GTFS Transit │  │  Property    │      │
│  │  Networks    │  │     Data     │  │   Database   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. GNN-Based Property Valuation

**Service**: `services/python/city2graph_gnn_service.py`

#### Key Capabilities

- **GraphSAGE Model**: 3-layer GraphSAGE architecture with attention mechanism
- **Spatial Dependencies**: Models neighborhood effects through graph structure
- **Confidence Scoring**: Provides uncertainty estimates for data-scarce areas
- **Comparable Properties**: Finds similar properties using graph structure

#### Model Architecture

```python
PropertyGraphSAGE:
  - Input: Property features (price, bedrooms, bathrooms, sqft, lat, lon, ...)
  - Layer 1: GraphSAGE (features → 128 hidden)
  - Layer 2: GraphSAGE (128 → 128) with skip connections
  - Layer 3: GraphSAGE (128 → 128) with skip connections
  - Attention: GAT (128 → 128) for confidence scoring
  - Output: 
    * Value prediction (regression)
    * Confidence score (0-1)
```

#### API Endpoints

**POST `/api/gnn/valuate`**

Request:
```json
{
  "property_id": 123,
  "property_features": {
    "price": 50000000,
    "bedrooms": 3,
    "bathrooms": 2,
    "sqft": 1500,
    "lat": 6.5244,
    "lon": 3.3792
  },
  "neighborhood_properties": [
    {
      "id": 124,
      "price": 48000000,
      "bedrooms": 3,
      "bathrooms": 2,
      "sqft": 1450,
      "lat": 6.5250,
      "lon": 3.3800
    }
  ]
}
```

Response:
```json
{
  "estimated_value": 52000000,
  "confidence_score": 0.85,
  "value_range": {
    "min": 49400000,
    "max": 54600000
  },
  "spatial_factors": {
    "neighborhood_effect": 51000000,
    "location_premium": 0.75,
    "accessibility_score": 68
  },
  "comparable_properties": [
    {
      "id": 124,
      "price": 48000000,
      "bedrooms": 3,
      "bathrooms": 2,
      "sqft": 1450,
      "distance": 150.5
    }
  ],
  "model_version": "1.0.0",
  "timestamp": "2025-11-21T15:30:00Z"
}
```

**POST `/api/gnn/batch-valuate`**

Batch valuation for multiple properties.

### 2. Market Trend Prediction

**Service**: `services/python/market_trend_prediction.py`

#### Key Capabilities

- **Temporal-GCN (T-GCN)**: Combines GRU for temporal + GCN for spatial
- **Spatial Diffusion Model**: Models price trend propagation through networks
- **Investment Opportunity Detection**: Network centrality-based scoring
- **Hotspot Identification**: Detects emerging high-growth neighborhoods

#### Model Architecture

```python
TemporalGCN:
  - Input: Time series of property features [num_nodes, num_timesteps, features]
  - Temporal Layer: GRU (features → 64 hidden)
  - Spatial Layer 1: GCN (64 → 64)
  - Spatial Layer 2: GCN (64 → 64)
  - Attention: Multi-head attention (4 heads)
  - Output:
    * Trend classification (up/down/stable)
    * Magnitude prediction (% change)
```

#### API Endpoints

**POST `/api/market/predict-trends`**

Request:
```json
{
  "property_data": [
    {
      "id": 1,
      "price": 50000000,
      "bedrooms": 3,
      "bathrooms": 2,
      "sqft": 1500,
      "lat": 6.5244,
      "lon": 3.3792
    }
  ],
  "graph": {
    "1": [2, 3, 4],
    "2": [1, 3],
    "3": [1, 2, 4],
    "4": [1, 3]
  },
  "forecast_months": 6
}
```

Response:
```json
{
  "forecast_months": 6,
  "hotspots": [1, 3, 5],
  "trend_predictions": {
    "1": 0.75,
    "2": 0.45,
    "3": 0.82
  },
  "investment_opportunities": [
    {
      "property_id": 1,
      "investment_score": 85.5,
      "centrality_score": 78.2,
      "trend_score": 88.0,
      "undervaluation_score": 45.3,
      "recommendation": "Strong Buy"
    }
  ],
  "insights": [
    {
      "type": "growth_areas",
      "title": "Top Growth Areas",
      "description": "5 neighborhoods showing strong growth potential",
      "properties": [1, 3, 5, 7, 9]
    }
  ],
  "model_version": "1.0.0",
  "timestamp": "2025-11-21T15:30:00Z"
}
```

### 3. Enhanced Neighborhood Intelligence

**Service**: `services/python/neighborhood_intelligence.py`

#### Key Capabilities

- **True Walkability**: Street network-based (not straight-line distance)
- **Transit Accessibility**: GTFS-based 30-minute commute zones
- **POI Proximity**: Network distance to amenities
- **Network Centrality**: Strategic location scoring

#### Supported Nigerian Cities

- **Lagos**: BRT network integration
- **Abuja**: Planned transit routes
- **Port Harcourt**: Road network analysis

#### API Endpoints

**POST `/api/neighborhood/analyze`**

Request:
```json
{
  "lat": 6.5244,
  "lon": 3.3792,
  "city": "lagos"
}
```

Response:
```json
{
  "location": {
    "lat": 6.5244,
    "lon": 3.3792,
    "city": "lagos"
  },
  "walkability": {
    "intersection_density": 65.5,
    "street_connectivity": 72.3,
    "pedestrian_friendliness": 68.0,
    "network_distance_to_amenities": 45.2,
    "walkability_score": 67.8
  },
  "transit_accessibility": {
    "num_nearby_stops": 5,
    "avg_frequency": 4.2,
    "reachable_area": 32.5,
    "transit_score": 72.0,
    "nearest_stops": [
      {
        "stop_name": "Ikeja BRT Station",
        "distance": 0.35
      }
    ]
  },
  "location_score": 69.9,
  "recommendation": "Very good location with good walkability and transit options",
  "timestamp": "2025-11-21T15:30:00Z"
}
```

**POST `/api/neighborhood/batch-analyze`**

Batch analysis for multiple locations.

## TypeScript Integration

### GNN Service Client

**File**: `server/gnnServiceClient.ts`

Type-safe TypeScript client for all GNN services:

```typescript
import { getGNNServiceClient } from './server/gnnServiceClient';

const client = getGNNServiceClient();

// GNN Valuation
const valuation = await client.valuateProperty({
  property_id: 123,
  property_features: { /* ... */ },
  neighborhood_properties: [/* ... */]
});

// Market Trends
const trends = await client.predictMarketTrends({
  property_data: [/* ... */],
  graph: { /* ... */ },
  forecast_months: 6
});

// Neighborhood Intelligence
const neighborhood = await client.analyzeNeighborhood({
  lat: 6.5244,
  lon: 3.3792,
  city: 'lagos'
});

// Health Checks
const health = await client.checkAllServicesHealth();
```

### tRPC Router

**File**: `server/routers/gnn.ts`

Integrated into main tRPC router:

```typescript
import { trpc } from '@/lib/trpc';

// Frontend usage
const { data, isLoading } = trpc.gnn.valuateProperty.useMutation();
const { data: trends } = trpc.gnn.predictMarketTrends.useQuery({ /* ... */ });
const { data: neighborhood } = trpc.gnn.analyzeNeighborhood.useQuery({ /* ... */ });

// Comprehensive analysis (all services at once)
const { data: comprehensive } = trpc.gnn.comprehensiveAnalysis.useQuery({
  property_id: 123,
  property_features: { /* ... */ },
  neighborhood_properties: [/* ... */],
  city: 'lagos',
  forecast_months: 6
});
```

## Frontend UI Components

### GNNValuationDisplay

**File**: `client/src/components/GNNValuationDisplay.tsx`

Displays GNN valuation results with:
- Estimated value with confidence range
- Confidence score visualization
- Spatial factors breakdown
- Comparable properties list
- Methodology explanation

Usage:
```tsx
import { GNNValuationDisplay } from '@/components/GNNValuationDisplay';

<GNNValuationDisplay
  data={valuationData}
  currency="₦"
  showComparables={true}
/>
```

## Optimization for Nigerian Markets

### Data Scarcity Handling

1. **Confidence Scoring**: Explicit uncertainty quantification
2. **Spatial Interpolation**: Use neighborhood effects to fill gaps
3. **Mock Mode**: Graceful degradation when services unavailable
4. **Progressive Enhancement**: Works with minimal data, improves with more

### Nigerian-Specific Features

1. **Currency**: Naira (₦) formatting
2. **Cities**: Lagos, Abuja, Port Harcourt preconfigured
3. **Transit**: BRT integration for Lagos
4. **Street Networks**: OSM data for Nigerian cities
5. **Cultural Context**: Neighborhood effects weighted appropriately

## Installation & Setup

### 1. Install Python Dependencies

```bash
cd /home/ubuntu/realestate-platform/services/python
pip3 install -r requirements.txt
```

Key dependencies:
- `torch==2.1.0` - PyTorch
- `torch-geometric==2.4.0` - PyTorch Geometric
- `geopandas==0.14.0` - Geospatial data
- `osmnx==1.6.0` - OpenStreetMap networks
- `gtfs-kit==5.2.0` - Transit data
- `mlflow==2.8.0` - Model versioning

### 2. Download OSM Data

```bash
# Lagos
python3 -c "import osmnx as ox; ox.graph_from_place('Lagos, Nigeria', network_type='drive').save_graphml('data/osm/lagos.graphml')"

# Abuja
python3 -c "import osmnx as ox; ox.graph_from_place('Abuja, Nigeria', network_type='drive').save_graphml('data/osm/abuja.graphml')"

# Port Harcourt
python3 -c "import osmnx as ox; ox.graph_from_place('Port Harcourt, Nigeria', network_type='drive').save_graphml('data/osm/port_harcourt.graphml')"
```

### 3. (Optional) Download GTFS Data

For Lagos BRT:
```bash
# Download GTFS feed for Lagos BRT
# Place in: data/gtfs/lagos.zip
```

### 4. Start Python Services

```bash
# GNN Valuation Service
python3 services/python/city2graph_gnn_service.py

# Market Trend Prediction Service
python3 services/python/market_trend_prediction.py

# Neighborhood Intelligence Service
python3 services/python/neighborhood_intelligence.py
```

### 5. Configure Environment Variables

Add to `.env`:
```bash
GNN_VALUATION_SERVICE_URL=http://localhost:5008
MARKET_TREND_SERVICE_URL=http://localhost:5009
NEIGHBORHOOD_SERVICE_URL=http://localhost:5010
```

### 6. Start Main Application

```bash
pnpm dev
```

## Testing

### Health Checks

```bash
# GNN Valuation Service
curl http://localhost:5008/health

# Market Trend Service
curl http://localhost:5009/health

# Neighborhood Intelligence Service
curl http://localhost:5010/health
```

### Sample Requests

**GNN Valuation**:
```bash
curl -X POST http://localhost:5008/api/gnn/valuate \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": 1,
    "property_features": {
      "price": 50000000,
      "bedrooms": 3,
      "bathrooms": 2,
      "sqft": 1500,
      "lat": 6.5244,
      "lon": 3.3792
    },
    "neighborhood_properties": []
  }'
```

## Performance Considerations

### Inference Times

- **GNN Valuation**: ~100-500ms per property
- **Market Trends**: ~500-2000ms for 100 properties
- **Neighborhood Analysis**: ~200-800ms per location

### Scaling

1. **Batch Processing**: Use batch endpoints for multiple properties
2. **Caching**: Cache neighborhood intelligence results
3. **Async Processing**: Use background jobs for large-scale predictions
4. **Model Optimization**: Quantization and pruning for production

## Future Enhancements

### Phase 2 (Planned)

1. **Real-time Model Updates**: Continuous learning from new data
2. **Multi-city Models**: City-specific model fine-tuning
3. **Advanced Visualizations**: Interactive spatial graphs
4. **Mobile Optimization**: Lightweight models for mobile apps
5. **Blockchain Integration**: Immutable valuation records

### Phase 3 (Planned)

1. **Federated Learning**: Privacy-preserving model training
2. **Explainable AI**: SHAP values for valuation factors
3. **3D Building Models**: Integration with 3D city models
4. **Satellite Imagery**: CNN-based feature extraction
5. **Social Network Effects**: Incorporate social graph data

## Troubleshooting

### Common Issues

**Issue**: `city2graph not found`
- **Solution**: Install from source or use mock mode

**Issue**: `OSM data download fails`
- **Solution**: Check internet connection, use cached data

**Issue**: `GTFS data not available`
- **Solution**: Service falls back to mock transit data

**Issue**: `GPU not available`
- **Solution**: Models work on CPU, just slower

### Debug Mode

Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## References

1. **City2Graph**: [GitHub Repository](https://github.com/city2graph/city2graph)
2. **PyTorch Geometric**: [Documentation](https://pytorch-geometric.readthedocs.io/)
3. **GraphSAGE**: Hamilton et al., "Inductive Representation Learning on Large Graphs"
4. **T-GCN**: Zhao et al., "T-GCN: A Temporal Graph Convolutional Network"
5. **OSMnx**: Boeing, "OSMnx: New Methods for Acquiring, Constructing, Analyzing, and Visualizing Complex Street Networks"

## Support

For issues or questions:
- Check logs in Python services
- Verify health endpoints
- Review TypeScript client errors
- Consult this documentation

## License

This integration is part of the Real Estate Platform project.
