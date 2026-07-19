# Hybrid Valuation Model - Deployment Guide

## Overview

The Hybrid Valuation Model is designed for data-scarce markets (specifically Nigeria) and provides adaptive property valuations using three pathways:

1. **Data-Rich Pathway**: Traditional ML with comparable sales (for Lagos, Abuja)
2. **Data-Scarce Pathway**: Satellite imagery + alternative data + proxies
3. **Hybrid Pathway**: Weighted ensemble of both approaches

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  - HybridValuationDisplay component                         │
│  - Confidence metrics visualization                         │
│  - Uncertainty range display                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  TypeScript Backend (tRPC)                   │
│  - hybridValuationRouter                                    │
│  - Database persistence                                      │
│  - Client for Python service                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Python Valuation Service (FastAPI)              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Hybrid Model (hybrid_model.py)                     │   │
│  │  - Data availability detection                      │   │
│  │  - Pathway routing                                  │   │
│  │  - Ensemble weighting                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Satellite Analyzer (satellite_analyzer.py)         │   │
│  │  - Building detection                               │   │
│  │  - Height estimation                                │   │
│  │  - Roof classification                              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Alternative Data (alternative_data.py)             │   │
│  │  - Economic indicators                              │   │
│  │  - Market listings                                  │   │
│  │  - Neighborhood quality                             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Confidence Scorer (confidence_scorer.py)           │   │
│  │  - Data completeness                                │   │
│  │  - Uncertainty estimation                           │   │
│  │  - Quality flags                                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database (MySQL/TiDB)                      │
│  - hybridValuations                                         │
│  - confidenceScores                                         │
│  - valuationDataSources                                     │
│  - satelliteImageryAnalysis                                 │
│  - alternativeDataSources                                   │
│  - dataQualityMetrics                                       │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Tables

1. **hybridValuations**: Main hybrid valuation results
2. **confidenceScores**: Detailed confidence breakdown
3. **valuationDataSources**: Tracks data source contributions
4. **satelliteImageryAnalysis**: Cached satellite analysis results
5. **alternativeDataSources**: Economic and market data
6. **dataQualityMetrics**: Data quality tracking over time

See `drizzle/schema-hybrid-valuation.ts` for complete schema.

## Deployment Steps

### 1. Database Migration

```bash
cd /home/ubuntu/realestate-platform
pnpm db:push
```

This will create the new hybrid valuation tables.

### 2. Python Service Deployment

The Python valuation service includes the new hybrid model endpoints.

**Service Location**: `/home/ubuntu/realestate-platform/services/valuation-service`

**Start Service**:
```bash
cd services/valuation-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

**Docker Deployment** (recommended):
```bash
cd services/valuation-service
docker build -t valuation-service:hybrid .
docker run -d -p 8001:8001 \
  --name valuation-service \
  -e MODEL_PATH=/app/models \
  -e MODEL_VERSION=2.0-hybrid \
  valuation-service:hybrid
```

### 3. Environment Variables

Add to `.env`:

```bash
# Valuation Service
VALUATION_SERVICE_URL=http://localhost:8001

# Optional: For production satellite imagery
GOOGLE_EARTH_ENGINE_API_KEY=your_key_here
SENTINEL_HUB_API_KEY=your_key_here

# Optional: For production alternative data
WORLD_BANK_API_KEY=your_key_here
PROPERTY_PRO_SCRAPER_KEY=your_key_here
```

### 4. Frontend Build

```bash
cd /home/ubuntu/realestate-platform
pnpm build
```

### 5. Verification

**Health Check**:
```bash
curl http://localhost:8001/hybrid-valuation/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "hybrid-valuation",
  "version": "2.0"
}
```

**Test Valuation**:
```bash
curl -X POST http://localhost:8001/hybrid-valuation/value \
  -H "Content-Type: application/json" \
  -d '{
    "property_data": {
      "latitude": 6.5244,
      "longitude": 3.3792,
      "city": "Lagos",
      "state": "Lagos",
      "type": "house",
      "size_sqm": 150,
      "bedrooms": 3,
      "bathrooms": 2
    },
    "comparable_count": 5,
    "transaction_history_count": 2
  }'
```

## API Endpoints

### Python FastAPI Endpoints

**POST /hybrid-valuation/value**
- Request: `ValuationRequest`
- Response: `HybridValuationResponse`
- Description: Get hybrid valuation for a property

**GET /hybrid-valuation/health**
- Response: Health status
- Description: Service health check

### tRPC Procedures

**hybridValuation.getValuation**
- Input: Property data + context
- Output: Complete hybrid valuation result
- Description: Get valuation and store in database

**hybridValuation.getValuationHistory**
- Input: `{ propertyId: number, limit?: number }`
- Output: Array of past valuations
- Description: Get valuation history for a property

**hybridValuation.getConfidenceDetails**
- Input: `{ valuationId: number }`
- Output: Detailed confidence breakdown
- Description: Get confidence metrics for a valuation

**hybridValuation.getSatelliteAnalysis**
- Input: `{ propertyId: number }`
- Output: Latest satellite analysis
- Description: Get satellite imagery analysis

**hybridValuation.healthCheck**
- Output: Service health status
- Description: Check if Python service is running

## Usage Examples

### Frontend Integration

```typescript
import { trpc } from '@/lib/trpc';
import { HybridValuationDisplay } from '@/components/HybridValuationDisplay';

function PropertyValuation({ propertyId }: { propertyId: number }) {
  const { data: property } = trpc.properties.getById.useQuery({ id: propertyId });
  
  const valuationMutation = trpc.hybridValuation.getValuation.useMutation();
  
  const handleGetValuation = async () => {
    if (!property) return;
    
    const result = await valuationMutation.mutateAsync({
      property_data: {
        id: propertyId.toString(),
        latitude: parseFloat(property.latitude),
        longitude: parseFloat(property.longitude),
        city: property.city,
        state: property.state,
        type: property.propertyType,
        size_sqm: property.squareFeet ? property.squareFeet * 0.092903 : undefined,
        bedrooms: property.bedrooms || undefined,
        bathrooms: property.bathrooms || undefined,
      },
      comparable_count: 5, // From your database
      transaction_history_count: 2, // From your database
      market_volatility: 0.15, // Default or from market data
    });
    
    return result;
  };
  
  return (
    <div>
      <button onClick={handleGetValuation}>
        Get Hybrid Valuation
      </button>
      
      {valuationMutation.data && (
        <HybridValuationDisplay result={valuationMutation.data} />
      )}
    </div>
  );
}
```

## Model Pathways

### Data-Rich Pathway

**Triggers when**:
- Data availability score > 0.7
- Comparable count >= 5
- Good transaction history

**Components**:
1. Comparable sales analysis (60% weight)
2. Hedonic pricing model (25% weight)
3. Satellite adjustment (15% weight)

**Typical confidence**: 75-90%

### Data-Scarce Pathway

**Triggers when**:
- Data availability score < 0.3
- Limited comparables (< 5)
- Poor transaction history

**Components**:
1. Satellite-based valuation (40% weight)
2. Market listing proxy (35% weight)
3. Neighborhood quality proxy (25% weight)

**Typical confidence**: 50-70%

### Hybrid Pathway

**Triggers when**:
- Data availability score between 0.3-0.7
- Mixed data quality

**Components**:
- Dynamic weighting based on data availability
- Combines data-rich and data-scarce methods
- Adaptive ensemble

**Typical confidence**: 60-80%

## Confidence Scoring

### Confidence Levels

- **Very High (85-100%)**: Excellent data, high model accuracy
- **High (70-85%)**: Good data, reliable model
- **Medium (55-70%)**: Moderate data, acceptable accuracy
- **Low (40-55%)**: Limited data, use with caution
- **Very Low (0-40%)**: Insufficient data, not recommended

### Confidence Components

1. **Data Completeness (35%)**: Availability of comparables, transactions, satellite, alternative data
2. **Model Accuracy (25%)**: Historical model performance
3. **Comparable Quality (20%)**: Recency and similarity
4. **Satellite Confidence (10%)**: Quality of satellite analysis
5. **Market Stability (10%)**: Market volatility

## Data Sources

### Current Implementation (MVP)

All data sources are **simulated** for MVP:

- **Satellite Imagery**: Simulated building detection and feature extraction
- **Economic Indicators**: Approximate 2024 Nigerian economic data
- **Market Listings**: Simulated based on known market conditions
- **Neighborhood Quality**: Simulated proximity scores

### Production Integration Roadmap

1. **Satellite Imagery**:
   - Google Earth Engine API
   - Sentinel Hub API
   - Planet Labs API

2. **Economic Indicators**:
   - World Bank API
   - Central Bank of Nigeria (CBN) API
   - National Bureau of Statistics (NBS)

3. **Market Listings**:
   - PropertyPro.ng web scraping
   - Jiji.ng API integration
   - Nigeria Property Centre data feed

4. **Neighborhood Quality**:
   - Google Places API
   - OpenStreetMap Overpass API
   - Crime statistics APIs

## Performance Optimization

### Caching Strategy

1. **Satellite Analysis**: Cache for 30 days per property
2. **Alternative Data**: Cache for 24 hours per city/state
3. **Economic Indicators**: Cache for 7 days per state

### Database Indexing

```sql
CREATE INDEX idx_hybrid_valuations_property ON hybridValuations(propertyId);
CREATE INDEX idx_confidence_scores_valuation ON confidenceScores(valuationId);
CREATE INDEX idx_satellite_analysis_property ON satelliteImageryAnalysis(propertyId);
CREATE INDEX idx_alternative_data_location ON alternativeDataSources(city, state);
```

## Monitoring

### Key Metrics

1. **Valuation Success Rate**: % of successful valuations
2. **Average Confidence Score**: Mean confidence across valuations
3. **Pathway Distribution**: % using each pathway
4. **Data Availability**: Average data availability score
5. **Response Time**: P50, P95, P99 latency

### Logging

All components log to stdout with structured JSON:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "hybrid-valuation",
  "property_id": "12345",
  "pathway": "hybrid",
  "confidence": 0.72,
  "valuation": 45000000,
  "duration_ms": 1234
}
```

## Troubleshooting

### Common Issues

**1. Python service not responding**

```bash
# Check service status
curl http://localhost:8001/hybrid-valuation/health

# Check logs
docker logs valuation-service

# Restart service
docker restart valuation-service
```

**2. Low confidence scores**

- Check comparable count (increase if possible)
- Verify transaction history data
- Review data quality flags in response
- Follow recommendations in response

**3. High uncertainty ranges**

- Indicates data quality issues
- Review limiting factors in confidence breakdown
- Consider professional appraisal for high-value transactions

**4. Database connection errors**

```bash
# Verify database is running
mysql -h localhost -u user -p -e "SHOW DATABASES;"

# Check connection string
echo $DATABASE_URL

# Test connection from Python service
docker exec valuation-service python -c "from app.core.config import settings; print(settings.database_url)"
```

## Future Enhancements

### Phase 1 (Q1 2025)
- [ ] Integrate real satellite imagery APIs
- [ ] Connect to World Bank API for economic data
- [ ] Implement PropertyPro.ng web scraping

### Phase 2 (Q2 2025)
- [ ] Add computer vision models for building detection
- [ ] Implement shadow analysis for height estimation
- [ ] Add spectral analysis for roof material classification

### Phase 3 (Q3 2025)
- [ ] Multi-model ensemble (XGBoost, LightGBM, Neural Networks)
- [ ] Transfer learning for data-scarce regions
- [ ] Automated model retraining pipeline

### Phase 4 (Q4 2025)
- [ ] Expand to other African markets (Kenya, Ghana, South Africa)
- [ ] Add commercial property valuation
- [ ] Implement real-time market trend analysis

## Support

For issues or questions:
- Technical: Create issue in project repository
- Business: Contact product team
- Urgent: Escalate to on-call engineer

## References

- [Hybrid Valuation Model Paper](docs/hybrid_model_whitepaper.pdf)
- [API Documentation](docs/api_reference.md)
- [Database Schema](drizzle/schema-hybrid-valuation.ts)
- [Python Service README](services/valuation-service/README.md)
