# Search Service

TypeScript-based property search service with OpenSearch integration.

## Features

- Full-text search with fuzzy matching
- Geospatial search (radius and polygon)
- Advanced filtering (price, bedrooms, bathrooms, etc.)
- Autocomplete suggestions
- Search aggregations and facets
- Redis caching for performance
- Bulk indexing support

## API Endpoints

### POST /api/search
Search properties with filters

Query Parameters:
- `q`: Search query
- `propertyType`: Property types (comma-separated)
- `status`: Status values (comma-separated)
- `minPrice`, `maxPrice`: Price range
- `minBedrooms`, `maxBedrooms`: Bedroom range
- `minBathrooms`, `maxBathrooms`: Bathroom range
- `minSquareFeet`, `maxSquareFeet`: Square feet range
- `city`, `state`: Location filters
- `features`, `amenities`: Feature filters
- `lat`, `lon`, `radius`: Geospatial radius search
- `sortBy`: Sort field (price, createdAt, viewCount, relevance)
- `sortOrder`: Sort order (asc, desc)
- `page`, `pageSize`: Pagination

### GET /api/autocomplete
Get autocomplete suggestions

Query Parameters:
- `q`: Query string
- `field`: Field to autocomplete on (default: title)

### POST /api/index
Index a single property

### PUT /api/index/:id
Update indexed property

### DELETE /api/index/:id
Delete indexed property

### POST /api/bulk-index
Bulk index properties

## Environment Variables

```
PORT=3003
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin
REDIS_HOST=localhost
REDIS_PORT=6379
LOG_LEVEL=info
```

## Running

```bash
npm install
npm run dev
```

## Docker

```bash
docker build -t search-service .
docker run -p 3003:3003 search-service
```
