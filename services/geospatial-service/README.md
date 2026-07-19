# Geospatial Service

Advanced geospatial service for the real estate platform using Apache Sedona, PostGIS, and H3 hexagonal indexing.

## Features

- **Spatial Search**
  - Nearby search (radius-based)
  - Polygon search (custom area selection)
  - Bounding box search

- **Heatmap Generation**
  - Price heatmaps
  - Density heatmaps
  - H3 hexagonal aggregation

- **Property Clustering**
  - Zoom-level adaptive clustering
  - H3-based clustering
  - Cluster statistics

- **Geospatial Analysis**
  - H3 index calculation
  - Neighbor cell discovery
  - Distance calculations

## Technology Stack

- **FastAPI**: Modern async web framework
- **Apache Sedona**: Distributed geospatial processing
- **PostGIS**: Spatial database extension for PostgreSQL
- **H3**: Uber's hexagonal hierarchical geospatial indexing system
- **GeoPandas**: Geospatial data manipulation
- **Shapely**: Geometric operations
- **Redis**: Caching layer

## API Endpoints

### Search
- `POST /api/v1/geospatial/search/nearby` - Radius-based search
- `POST /api/v1/geospatial/search/polygon` - Polygon-based search
- `POST /api/v1/geospatial/search/bbox` - Bounding box search

### Visualization
- `POST /api/v1/geospatial/heatmap` - Generate heatmap
- `POST /api/v1/geospatial/cluster` - Cluster properties

### Utilities
- `GET /api/v1/geospatial/h3/{lat}/{lng}/{resolution}` - Get H3 index

### Health
- `GET /health` - Health check
- `GET /ready` - Readiness check

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/realestate"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"

# Run the service
uvicorn app.main:app --host 0.0.0.0 --port 8083 --reload
```

## Docker

```bash
# Build image
docker build -t geospatial-service .

# Run container
docker run -p 8083:8083 \
  -e DATABASE_URL="postgresql://user:pass@db:5432/realestate" \
  -e REDIS_HOST="redis" \
  geospatial-service
```

## Configuration

Environment variables:

- `DATABASE_URL`: PostgreSQL connection string with PostGIS
- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port (default: 6379)
- `H3_RESOLUTION`: Default H3 resolution (default: 9)
- `MAX_SEARCH_RADIUS_KM`: Maximum search radius (default: 100)

## H3 Resolution Guide

| Resolution | Avg Hexagon Edge Length | Avg Hexagon Area |
|------------|-------------------------|------------------|
| 5          | 8.54 km                 | 252.9 km²        |
| 6          | 3.23 km                 | 36.1 km²         |
| 7          | 1.22 km                 | 5.2 km²          |
| 8          | 461.35 m                | 0.74 km²         |
| 9          | 174.38 m                | 0.11 km²         |
| 10         | 65.91 m                 | 0.015 km²        |

## Performance

- Redis caching for frequently accessed queries
- PostGIS spatial indexing for fast queries
- H3 indexing for efficient aggregation
- Connection pooling for database access

## Future Enhancements

- Isochrone generation (travel time polygons)
- Route optimization
- Proximity analysis to amenities
- Geocoding and reverse geocoding
- Real-time property tracking
