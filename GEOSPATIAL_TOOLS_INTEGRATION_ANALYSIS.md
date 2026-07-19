# Geospatial Tools Integration Analysis
## Open-Source Enhancements for Real Estate Platform

**Date:** November 20, 2025  
**Platform:** Next-Generation Real Estate Platform  
**Current Stack:** Google Maps API, MySQL, tRPC, React

---

## Executive Summary

This document analyzes 11 open-source geospatial tools and their potential to enhance the platform's mapping capabilities. Each tool is evaluated for integration complexity, value proposition, and compatibility with the existing architecture.

**Recommendation Priority:**
- 🟢 **High Priority (Immediate):** H3, Turf.js, Deck.gl
- 🟡 **Medium Priority (Phase 2):** MapLibre GL JS, PostGIS, Martin
- 🔵 **Low Priority (Future):** GeoParquet, Tippecanoe, Kepler.gl, GeoServer, STAC

---

## Current Platform Architecture

### Existing Geospatial Stack

**Database:** MySQL (TiDB)
- Latitude/longitude stored as VARCHAR(20)
- No native spatial indexing
- Haversine formula for distance calculations

**Frontend:** Google Maps JavaScript API
- Marker clustering (MarkerClusterer)
- Heatmap layer (google.maps.visualization.HeatmapLayer)
- Custom overlays

**Backend:** Node.js + tRPC
- Server-side clustering with H3 (already implemented!)
- Redis caching for cluster tiles
- Real-time updates via Socket.IO

**Limitations:**
- ❌ No spatial database (PostGIS)
- ❌ Vendor lock-in (Google Maps)
- ❌ Limited offline capabilities
- ❌ No vector tile pipeline
- ❌ Basic geospatial analysis

---

## Tool-by-Tool Analysis

### 1. PostGIS - Spatial Database Extension
**Type:** PostgreSQL extension for spatial data  
**License:** GPL v2  
**Priority:** 🟡 Medium

#### What It Does
PostGIS extends PostgreSQL with spatial data types (geometry, geography) and hundreds of spatial functions for querying, analyzing, and manipulating geographic data.

#### Value Proposition

**Spatial Indexing:**
```sql
-- Current: Slow bounding box queries
SELECT * FROM properties 
WHERE CAST(latitude AS DECIMAL) BETWEEN 6.4 AND 6.6
  AND CAST(longitude AS DECIMAL) BETWEEN 3.2 AND 3.5;

-- With PostGIS: Fast spatial index (R-tree)
SELECT * FROM properties 
WHERE ST_Within(
  geom, 
  ST_MakeEnvelope(3.2, 6.4, 3.5, 6.6, 4326)
);
-- Uses spatial index, 10-100x faster
```

**Advanced Spatial Operations:**
```sql
-- Find properties within polygon (neighborhood boundary)
SELECT * FROM properties 
WHERE ST_Within(geom, ST_GeomFromGeoJSON('{"type":"Polygon",...}'));

-- Find properties within 5km radius
SELECT * FROM properties 
WHERE ST_DWithin(
  geom::geography, 
  ST_MakePoint(3.3792, 6.5244)::geography, 
  5000
);

-- Calculate actual distance (not Haversine approximation)
SELECT ST_Distance(
  geom::geography, 
  ST_MakePoint(3.3792, 6.5244)::geography
) AS distance_meters;

-- Buffer zones (e.g., 1km around property)
SELECT ST_Buffer(geom::geography, 1000) AS buffer_zone;

-- Intersection analysis (properties in flood zones)
SELECT p.* FROM properties p
JOIN flood_zones f ON ST_Intersects(p.geom, f.geom);
```

#### Integration Plan

**Migration Strategy:**
```typescript
// 1. Add PostGIS extension to existing database
// Since platform uses TiDB (MySQL-compatible), PostGIS won't work directly
// Options:
// A. Migrate to PostgreSQL + PostGIS (major change)
// B. Use PostGIS in separate PostgreSQL instance for spatial queries only
// C. Stay with MySQL + spatial extensions (limited features)

// Recommended: Option B - Hybrid approach
// Keep TiDB for transactional data, use PostgreSQL+PostGIS for spatial queries

// 2. Add geometry column to properties table
ALTER TABLE properties ADD COLUMN geom GEOMETRY(Point, 4326);

// 3. Populate from existing lat/lng
UPDATE properties 
SET geom = ST_SetSRID(ST_MakePoint(
  CAST(longitude AS DECIMAL), 
  CAST(latitude AS DECIMAL)
), 4326);

// 4. Create spatial index
CREATE INDEX idx_properties_geom ON properties USING GIST(geom);
```

**tRPC Integration:**
```typescript
// server/routers/spatial.ts
import { router, publicProcedure } from '../_core/trpc';
import { Pool } from 'pg';

const pgPool = new Pool({
  connectionString: process.env.POSTGIS_DATABASE_URL,
});

export const spatialRouter = router({
  findWithinPolygon: publicProcedure
    .input(z.object({
      polygon: z.object({
        type: z.literal('Polygon'),
        coordinates: z.array(z.array(z.array(z.number()))),
      }),
    }))
    .query(async ({ input }) => {
      const result = await pgPool.query(`
        SELECT id, title, price, 
               ST_X(geom) as longitude, 
               ST_Y(geom) as latitude
        FROM properties
        WHERE ST_Within(geom, ST_GeomFromGeoJSON($1))
      `, [JSON.stringify(input.polygon)]);
      
      return result.rows;
    }),

  findNearby: publicProcedure
    .input(z.object({
      lat: z.number(),
      lng: z.number(),
      radiusMeters: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await pgPool.query(`
        SELECT id, title, price,
               ST_Distance(
                 geom::geography, 
                 ST_MakePoint($2, $1)::geography
               ) as distance_meters
        FROM properties
        WHERE ST_DWithin(
          geom::geography,
          ST_MakePoint($2, $1)::geography,
          $3
        )
        ORDER BY distance_meters
      `, [input.lat, input.lng, input.radiusMeters]);
      
      return result.rows;
    }),
});
```

**Benefits:**
- ✅ 10-100x faster spatial queries
- ✅ Advanced spatial operations (buffer, intersection, union)
- ✅ Industry-standard spatial database
- ✅ Supports complex geometries (polygons, multipolygons)
- ✅ Spatial indexing (R-tree, GIST)

**Challenges:**
- ❌ Platform uses TiDB (MySQL), not PostgreSQL
- ❌ Requires database migration or hybrid setup
- ❌ Learning curve for spatial SQL
- ❌ Additional infrastructure complexity

**Recommendation:** Medium priority. Consider hybrid approach with separate PostGIS instance for spatial queries while keeping TiDB for transactional data.

---

### 2. GeoParquet - Cloud-Native Geospatial Storage
**Type:** Columnar storage format for geospatial data  
**License:** Apache 2.0  
**Priority:** 🔵 Low

#### What It Does
GeoParquet extends Apache Parquet with geospatial metadata, enabling efficient storage and querying of large geospatial datasets in cloud object storage (S3, GCS).

#### Value Proposition

**Efficient Storage:**
```
Traditional CSV/GeoJSON:
- 1M properties × 50 columns = 500MB-2GB
- Row-based storage
- No compression
- Slow queries (full scan)

GeoParquet:
- Same data = 50-100MB (10-20x smaller)
- Columnar storage (query only needed columns)
- Built-in compression (Snappy, GZIP)
- Predicate pushdown (filter before loading)
```

**Cloud-Native Querying:**
```python
# Read only properties in Lagos from S3
import geopandas as gpd

df = gpd.read_parquet(
    's3://bucket/properties.parquet',
    filters=[
        ('city', '==', 'Lagos'),
        ('price', '>', 10000000),
    ],
    columns=['id', 'title', 'price', 'geometry']
)
# Only downloads ~5MB instead of 500MB
```

#### Integration Plan

**Use Cases:**
1. **Historical Data Archive:** Store property snapshots in S3 as GeoParquet
2. **Analytics Pipeline:** Export data for analysis in Python/R
3. **Data Lake:** Build geospatial data warehouse

**Implementation:**
```typescript
// server/services/geoparquetExport.ts
import { writeParquet } from 'parquet-wasm';
import { storagePut } from '../storage';

export async function exportPropertiesToParquet(
  startDate: Date,
  endDate: Date
) {
  // 1. Fetch properties from database
  const properties = await db.select().from(properties)
    .where(
      and(
        gte(properties.createdAt, startDate),
        lte(properties.createdAt, endDate)
      )
    );

  // 2. Convert to GeoParquet format
  const geoData = properties.map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    geometry: {
      type: 'Point',
      coordinates: [parseFloat(p.longitude), parseFloat(p.latitude)]
    },
    properties: {
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      squareFeet: p.squareFeet,
    }
  }));

  // 3. Write to Parquet
  const parquetBuffer = await writeParquet(geoData);

  // 4. Upload to S3
  const { url } = await storagePut(
    `exports/properties-${startDate.toISOString()}.parquet`,
    parquetBuffer,
    'application/octet-stream'
  );

  return { url, recordCount: properties.length };
}
```

**Benefits:**
- ✅ 10-20x storage reduction
- ✅ Fast cloud-native queries
- ✅ Interoperable with analytics tools (Python, R, Spark)
- ✅ Ideal for historical data archival

**Challenges:**
- ❌ Not a replacement for operational database
- ❌ Read-only format (not for transactional data)
- ❌ Limited browser support (mainly server-side)
- ❌ Overkill for current data volume

**Recommendation:** Low priority. Useful for future data lake/analytics pipeline, but not critical for current operational needs.

---

### 3. H3 - Uber's Hexagonal Hierarchical Spatial Index
**Type:** Spatial indexing system  
**License:** Apache 2.0  
**Priority:** 🟢 **HIGH (Already Implemented!)**

#### What It Does
H3 divides the world into hexagonal cells at 16 resolutions (0-15), enabling efficient spatial indexing, aggregation, and analysis.

#### Value Proposition

**Current Implementation:**
```typescript
// Already implemented in server/routers/serverSideClustering.ts
import { latLngToCell, cellToBoundary } from 'h3-js';

// Convert property location to H3 cell
const h3Index = latLngToCell(6.5244, 3.3792, 9); // Resolution 9 (~0.1km²)
// Returns: "89283082003ffff"

// Get hexagon boundary
const boundary = cellToBoundary(h3Index);
// Returns: [[6.524, 3.379], [6.525, 3.380], ...]
```

**Clustering Algorithm:**
```typescript
// Group properties by H3 cell
const clusters = new Map<string, Property[]>();

properties.forEach(property => {
  const h3Index = latLngToCell(
    parseFloat(property.latitude),
    parseFloat(property.longitude),
    resolution // 7-12 based on zoom level
  );
  
  if (!clusters.has(h3Index)) {
    clusters.set(h3Index, []);
  }
  clusters.get(h3Index)!.push(property);
});

// Return cluster centroids
return Array.from(clusters.entries()).map(([h3Index, props]) => ({
  h3Index,
  count: props.length,
  avgPrice: props.reduce((sum, p) => sum + p.price, 0) / props.length,
  center: cellToLatLng(h3Index),
  boundary: cellToBoundary(h3Index),
}));
```

**Enhanced Use Cases:**

1. **Neighborhood Analysis:**
```typescript
// Get all H3 cells in neighborhood
import { gridDisk } from 'h3-js';

const centerCell = latLngToCell(6.5244, 3.3792, 9);
const neighborhoodCells = gridDisk(centerCell, 3); // 3-ring radius
// Returns: 37 hexagonal cells covering ~1km² area

// Aggregate properties in neighborhood
const neighborhoodStats = neighborhoodCells.map(cell => {
  const properties = getPropertiesInCell(cell);
  return {
    cell,
    count: properties.length,
    avgPrice: calculateAvg(properties.map(p => p.price)),
    density: properties.length / getCellArea(cell),
  };
});
```

2. **Heatmap Generation:**
```typescript
// Generate density heatmap
const heatmapData = properties.reduce((acc, prop) => {
  const h3Index = latLngToCell(
    parseFloat(prop.latitude),
    parseFloat(prop.longitude),
    9
  );
  acc[h3Index] = (acc[h3Index] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

// Convert to visualization format
const heatmapCells = Object.entries(heatmapData).map(([cell, count]) => ({
  cell,
  count,
  boundary: cellToBoundary(cell),
  intensity: count / maxCount, // 0-1 scale
}));
```

3. **Spatial Joins:**
```typescript
// Find properties in same H3 cell as point of interest
const poiCell = latLngToCell(6.5244, 3.3792, 9);

const nearbyProperties = properties.filter(prop => {
  const propCell = latLngToCell(
    parseFloat(prop.latitude),
    parseFloat(prop.longitude),
    9
  );
  return propCell === poiCell;
});
```

**Benefits:**
- ✅ **Already implemented** in server-side clustering
- ✅ Uniform hexagonal grid (better than squares)
- ✅ Multi-resolution (zoom-adaptive clustering)
- ✅ Fast spatial indexing
- ✅ Efficient aggregation

**Enhancements:**
```typescript
// Store H3 index in database for faster queries
ALTER TABLE properties ADD COLUMN h3_index_9 VARCHAR(16);
UPDATE properties SET h3_index_9 = latLngToCell(latitude, longitude, 9);
CREATE INDEX idx_h3_index_9 ON properties(h3_index_9);

// Query by H3 index (much faster)
SELECT * FROM properties WHERE h3_index_9 = '89283082003ffff';
```

**Recommendation:** Already implemented! Continue using H3 for clustering. Consider storing H3 indexes in database for faster queries.

---

### 4. MapLibre GL JS - Open-Source Map Renderer
**Type:** Frontend mapping library  
**License:** BSD 3-Clause  
**Priority:** 🟡 Medium

#### What It Does
MapLibre GL JS is a fork of Mapbox GL JS v1 (before it went proprietary), providing vector tile rendering, WebGL-powered maps, and extensive customization.

#### Value Proposition

**vs. Google Maps:**
```
Google Maps:
- ✅ Easy to use
- ✅ Comprehensive features
- ❌ Expensive ($7/1000 loads)
- ❌ Vendor lock-in
- ❌ Limited customization
- ❌ Raster tiles (larger, slower)

MapLibre GL JS:
- ✅ Free and open-source
- ✅ Vector tiles (smaller, faster)
- ✅ Full customization (styles, layers)
- ✅ WebGL-powered (60fps)
- ✅ Offline support
- ❌ Requires tile server
- ❌ No built-in geocoding/routing
```

**Migration Example:**
```typescript
// Before: Google Maps
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  version: 'weekly',
});

const map = await loader.load().then(() => {
  return new google.maps.Map(document.getElementById('map'), {
    center: { lat: 6.5244, lng: 3.3792 },
    zoom: 12,
  });
});

// After: MapLibre GL JS
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json', // Free tiles
  center: [3.3792, 6.5244], // [lng, lat] - note order!
  zoom: 12,
});

// Add property markers
map.on('load', () => {
  map.addSource('properties', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: properties.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(p.longitude), parseFloat(p.latitude)]
        },
        properties: {
          id: p.id,
          price: p.price,
          title: p.title,
        }
      }))
    }
  });

  map.addLayer({
    id: 'properties',
    type: 'circle',
    source: 'properties',
    paint: {
      'circle-radius': 8,
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'price'],
        1000000, '#00ff00',    // Green for low prices
        50000000, '#ff0000'    // Red for high prices
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  });
});
```

**Advanced Features:**
```typescript
// 1. Heatmap layer (built-in)
map.addLayer({
  id: 'property-heatmap',
  type: 'heatmap',
  source: 'properties',
  paint: {
    'heatmap-weight': ['get', 'price'],
    'heatmap-intensity': 1,
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0, 0, 255, 0)',
      0.5, 'rgb(0, 255, 0)',
      1, 'rgb(255, 0, 0)'
    ],
    'heatmap-radius': 25,
  }
});

// 2. Clustering (built-in)
map.addSource('properties', {
  type: 'geojson',
  data: propertiesGeoJSON,
  cluster: true,
  clusterMaxZoom: 14,
  clusterRadius: 50,
});

map.addLayer({
  id: 'clusters',
  type: 'circle',
  source: 'properties',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#51bbd6', 100,
      '#f1f075', 500,
      '#f28cb1'
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20, 100,
      30, 500,
      40
    ]
  }
});

// 3. 3D buildings
map.addLayer({
  id: '3d-buildings',
  source: 'composite',
  'source-layer': 'building',
  filter: ['==', 'extrude', 'true'],
  type: 'fill-extrusion',
  paint: {
    'fill-extrusion-color': '#aaa',
    'fill-extrusion-height': ['get', 'height'],
    'fill-extrusion-base': ['get', 'min_height'],
    'fill-extrusion-opacity': 0.6
  }
});
```

**Integration Plan:**
```typescript
// client/src/components/MapLibreMap.tsx
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export function MapLibreMap({ properties }: { properties: Property[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm'
        }]
      },
      center: [3.3792, 6.5244],
      zoom: 12,
    });

    map.current.on('load', () => {
      // Add properties as GeoJSON source
      map.current!.addSource('properties', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: properties.map(p => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(p.longitude), parseFloat(p.latitude)]
            },
            properties: p,
          }))
        },
        cluster: true,
        clusterRadius: 50,
      });

      // Add cluster circles
      map.current!.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'properties',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#11b4da',
          'circle-radius': 20,
        }
      });

      // Add cluster count labels
      map.current!.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'properties',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12
        }
      });

      // Add unclustered points
      map.current!.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'properties',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#11b4da',
          'circle-radius': 8,
        }
      });
    });

    return () => map.current?.remove();
  }, [properties]);

  return <div ref={mapContainer} style={{ width: '100%', height: '600px' }} />;
}
```

**Benefits:**
- ✅ Free and open-source (no API costs)
- ✅ Vector tiles (smaller, faster, scalable)
- ✅ WebGL rendering (60fps, smooth)
- ✅ Full style customization
- ✅ Built-in clustering and heatmaps
- ✅ Offline support
- ✅ 3D terrain and buildings

**Challenges:**
- ❌ Requires tile server (see Martin below)
- ❌ No built-in geocoding (need separate service)
- ❌ No built-in routing (need separate service)
- ❌ Migration effort from Google Maps
- ❌ Different API (learning curve)

**Recommendation:** Medium priority. Consider for Phase 2 to reduce Google Maps costs and gain more control. Requires tile server infrastructure.

---

### 5. Tippecanoe - Vector Tile Generator
**Type:** Command-line tool for creating vector tiles  
**License:** BSD 2-Clause  
**Priority:** 🔵 Low

#### What It Does
Tippecanoe converts GeoJSON data into Mapbox Vector Tiles (MVT), optimizing for web display with automatic simplification and zoom-level generation.

#### Value Proposition

**Vector Tiles vs. Raster Tiles:**
```
Raster Tiles (PNG/JPG):
- Pre-rendered images
- Large file size (~50KB per tile)
- Fixed styling
- Pixelated when zoomed

Vector Tiles (MVT):
- Geometric data (points, lines, polygons)
- Small file size (~5-20KB per tile)
- Client-side styling
- Sharp at any zoom level
- Interactive (click, hover)
```

**Workflow:**
```bash
# 1. Export properties to GeoJSON
node scripts/export-geojson.js > properties.geojson

# 2. Generate vector tiles with Tippecanoe
tippecanoe \
  -o properties.mbtiles \
  -z 14 \                    # Max zoom level
  -Z 5 \                     # Min zoom level
  -r 1 \                     # Drop rate (simplification)
  -pk \                      # Keep all properties
  -l properties \            # Layer name
  properties.geojson

# 3. Serve tiles with Martin (see below)
martin properties.mbtiles
```

**Integration Example:**
```typescript
// scripts/generate-tiles.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';

const execAsync = promisify(exec);

async function generateVectorTiles() {
  // 1. Fetch all properties
  const properties = await db.select().from(properties);

  // 2. Convert to GeoJSON
  const geojson = {
    type: 'FeatureCollection',
    features: properties.map(p => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(p.longitude), parseFloat(p.latitude)]
      },
      properties: {
        id: p.id,
        title: p.title,
        price: p.price,
        bedrooms: p.bedrooms,
        propertyType: p.propertyType,
      }
    }))
  };

  // 3. Write to file
  await writeFile('properties.geojson', JSON.stringify(geojson));

  // 4. Generate tiles
  await execAsync(`
    tippecanoe \
      -o public/tiles/properties.mbtiles \
      -z 14 -Z 5 \
      -r 1 -pk \
      -l properties \
      properties.geojson
  `);

  console.log('Vector tiles generated successfully');
}

// Run daily via cron
generateVectorTiles();
```

**Benefits:**
- ✅ Optimized vector tiles for web
- ✅ Automatic simplification (reduces file size)
- ✅ Multi-zoom level generation
- ✅ Efficient for large datasets (100K+ properties)

**Challenges:**
- ❌ Requires MapLibre GL JS (not Google Maps)
- ❌ Command-line tool (not JavaScript library)
- ❌ Batch processing (not real-time)
- ❌ Additional build step

**Recommendation:** Low priority. Only needed if migrating to MapLibre GL JS and serving 100K+ properties. Current Google Maps setup is sufficient for now.

---

### 6. Martin - Tile Server
**Type:** PostGIS vector tile server  
**License:** Apache 2.0  
**Priority:** 🟡 Medium

#### What It Does
Martin is a lightweight tile server that serves vector tiles directly from PostGIS or MBTiles files, with automatic caching and optimization.

#### Value Proposition

**Dynamic Tile Generation:**
```sql
-- Martin queries PostGIS on-the-fly
SELECT ST_AsMVT(tile, 'properties', 4096, 'geom') FROM (
  SELECT
    id,
    title,
    price,
    ST_AsMVTGeom(
      geom,
      ST_TileEnvelope(9, 256, 128), -- Tile bounds
      4096,                          -- Tile extent
      0,                             -- Buffer
      true                           -- Clip geometry
    ) AS geom
  FROM properties
  WHERE geom && ST_TileEnvelope(9, 256, 128)
) AS tile;
```

**Setup:**
```bash
# 1. Install Martin
cargo install martin

# 2. Configure Martin
cat > martin.yaml <<EOF
postgres:
  connection_string: "postgresql://user:pass@localhost/db"
  
  # Auto-detect tables with geometry columns
  auto_publish:
    tables:
      from_schemas: public
    functions: true

  # Custom tile sources
  tables:
    properties:
      schema: public
      table: properties
      srid: 4326
      geometry_column: geom
      id_column: id
      properties:
        - id
        - title
        - price
        - bedrooms
EOF

# 3. Run Martin
martin --config martin.yaml
# Tiles available at: http://localhost:3000/properties/{z}/{x}/{y}.pbf
```

**Frontend Integration:**
```typescript
// client/src/components/MartinMap.tsx
import maplibregl from 'maplibre-gl';

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      'properties': {
        type: 'vector',
        tiles: ['http://localhost:3000/properties/{z}/{x}/{y}.pbf'],
        minzoom: 5,
        maxzoom: 14,
      }
    },
    layers: [{
      id: 'properties',
      type: 'circle',
      source: 'properties',
      'source-layer': 'properties',
      paint: {
        'circle-radius': 8,
        'circle-color': '#11b4da',
      }
    }]
  },
  center: [3.3792, 6.5244],
  zoom: 12,
});
```

**Benefits:**
- ✅ Dynamic tile generation (always up-to-date)
- ✅ Automatic caching
- ✅ Lightweight (Rust-based, fast)
- ✅ Works with PostGIS or MBTiles
- ✅ No pre-processing required

**Challenges:**
- ❌ Requires PostGIS or MBTiles
- ❌ Requires MapLibre GL JS
- ❌ Additional infrastructure (tile server)
- ❌ Not needed with Google Maps

**Recommendation:** Medium priority. Pair with PostGIS + MapLibre GL JS for full open-source stack. Not needed if staying with Google Maps.

---

### 7. Turf.js - Client-Side Geospatial Analysis
**Type:** JavaScript geospatial library  
**License:** MIT  
**Priority:** 🟢 **HIGH**

#### What It Does
Turf.js provides 100+ geospatial functions for analysis, measurement, and transformation directly in the browser or Node.js.

#### Value Proposition

**Common Operations:**
```typescript
import * as turf from '@turf/turf';

// 1. Distance calculation
const from = turf.point([3.3792, 6.5244]); // Lagos
const to = turf.point([3.3567, 6.6018]);   // Ikeja
const distance = turf.distance(from, to, { units: 'kilometers' });
// Returns: 8.7 km

// 2. Buffer (create circle around point)
const property = turf.point([3.3792, 6.5244]);
const buffer = turf.buffer(property, 5, { units: 'kilometers' });
// Returns: Polygon representing 5km radius

// 3. Point in polygon (is property in neighborhood?)
const property = turf.point([3.3792, 6.5244]);
const neighborhood = turf.polygon([[
  [3.35, 6.50],
  [3.40, 6.50],
  [3.40, 6.55],
  [3.35, 6.55],
  [3.35, 6.50]
]]);
const isInside = turf.booleanPointInPolygon(property, neighborhood);
// Returns: true/false

// 4. Nearest point
const properties = turf.featureCollection([
  turf.point([3.3792, 6.5244], { id: 1 }),
  turf.point([3.3567, 6.6018], { id: 2 }),
  turf.point([3.3891, 6.4543], { id: 3 }),
]);
const target = turf.point([3.3800, 6.5300]);
const nearest = turf.nearestPoint(target, properties);
// Returns: Property with id: 1

// 5. Centroid (center of polygon)
const neighborhood = turf.polygon([[...]]);
const center = turf.centroid(neighborhood);
// Returns: Point at geometric center

// 6. Area calculation
const polygon = turf.polygon([[...]]);
const area = turf.area(polygon);
// Returns: Area in square meters

// 7. Bounding box
const properties = turf.featureCollection([...]);
const bbox = turf.bbox(properties);
// Returns: [minLng, minLat, maxLng, maxLat]

// 8. Convex hull (smallest polygon containing all points)
const properties = turf.featureCollection([...]);
const hull = turf.convex(properties);
// Returns: Polygon

// 9. Interpolate (heatmap generation)
const properties = turf.featureCollection([
  turf.point([3.3792, 6.5244], { price: 10000000 }),
  turf.point([3.3567, 6.6018], { price: 50000000 }),
]);
const grid = turf.interpolate(properties, 0.5, { gridType: 'hex', property: 'price' });
// Returns: Hexagonal grid with interpolated prices
```

**Real-World Use Cases:**

**1. "Find properties within 5km":**
```typescript
// Current implementation (Haversine formula)
function getPropertiesWithinRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  properties: Property[]
) {
  return properties.filter(p => {
    const distance = haversineDistance(
      centerLat, centerLng,
      parseFloat(p.latitude), parseFloat(p.longitude)
    );
    return distance <= radiusKm;
  });
}

// With Turf.js (more accurate, handles edge cases)
function getPropertiesWithinRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  properties: Property[]
) {
  const center = turf.point([centerLng, centerLat]);
  const buffer = turf.buffer(center, radiusKm, { units: 'kilometers' });
  
  return properties.filter(p => {
    const point = turf.point([parseFloat(p.longitude), parseFloat(p.latitude)]);
    return turf.booleanPointInPolygon(point, buffer);
  });
}
```

**2. "Draw search area on map":**
```typescript
// User draws polygon on map
const drawnPolygon = turf.polygon(userDrawnCoordinates);

// Find properties inside polygon
const propertiesInArea = properties.filter(p => {
  const point = turf.point([parseFloat(p.longitude), parseFloat(p.latitude)]);
  return turf.booleanPointInPolygon(point, drawnPolygon);
});

// Calculate area
const areaKm2 = turf.area(drawnPolygon) / 1_000_000;
console.log(`Search area: ${areaKm2.toFixed(2)} km²`);
```

**3. "Find properties along route":**
```typescript
// Route from A to B
const route = turf.lineString([
  [3.3792, 6.5244], // Start
  [3.3567, 6.6018], // End
]);

// Buffer route (e.g., 1km on each side)
const buffer = turf.buffer(route, 1, { units: 'kilometers' });

// Find properties along route
const propertiesAlongRoute = properties.filter(p => {
  const point = turf.point([parseFloat(p.longitude), parseFloat(p.latitude)]);
  return turf.booleanPointInPolygon(point, buffer);
});
```

**4. "Commute time analysis":**
```typescript
// Calculate isochrones (areas reachable within time)
import { isochrone } from '@turf/turf';

// Properties within 30min commute of office
const office = turf.point([3.3792, 6.5244]);
const walkingSpeed = 5; // km/h
const maxTime = 0.5; // 30 minutes = 0.5 hours
const maxDistance = walkingSpeed * maxTime; // 2.5 km

const reachableArea = turf.buffer(office, maxDistance, { units: 'kilometers' });

const propertiesWithinCommute = properties.filter(p => {
  const point = turf.point([parseFloat(p.longitude), parseFloat(p.latitude)]);
  return turf.booleanPointInPolygon(point, reachableArea);
});
```

**5. "Neighborhood statistics":**
```typescript
// Calculate neighborhood metrics
function analyzeNeighborhood(neighborhoodPolygon: turf.Feature, properties: Property[]) {
  // Filter properties in neighborhood
  const propertiesInNeighborhood = properties.filter(p => {
    const point = turf.point([parseFloat(p.longitude), parseFloat(p.latitude)]);
    return turf.booleanPointInPolygon(point, neighborhoodPolygon);
  });

  // Calculate statistics
  const avgPrice = propertiesInNeighborhood.reduce((sum, p) => sum + p.price, 0) / propertiesInNeighborhood.length;
  const area = turf.area(neighborhoodPolygon) / 1_000_000; // km²
  const density = propertiesInNeighborhood.length / area; // properties per km²
  const center = turf.centroid(neighborhoodPolygon);

  return {
    propertyCount: propertiesInNeighborhood.length,
    avgPrice,
    area,
    density,
    center: center.geometry.coordinates,
  };
}
```

**Integration:**
```bash
npm install @turf/turf
```

```typescript
// client/src/lib/spatial.ts
import * as turf from '@turf/turf';

export const spatial = {
  // Distance between two points
  distance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const from = turf.point([lng1, lat1]);
    const to = turf.point([lng2, lat2]);
    return turf.distance(from, to, { units: 'kilometers' });
  },

  // Properties within radius
  withinRadius(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    properties: Property[]
  ) {
    const center = turf.point([centerLng, centerLat]);
    const buffer = turf.buffer(center, radiusKm, { units: 'kilometers' });
    
    return properties.filter(p => {
      const point = turf.point([parseFloat(p.longitude), parseFloat(p.latitude)]);
      return turf.booleanPointInPolygon(point, buffer);
    });
  },

  // Properties within polygon
  withinPolygon(polygon: number[][][], properties: Property[]) {
    const turfPolygon = turf.polygon(polygon);
    
    return properties.filter(p => {
      const point = turf.point([parseFloat(p.longitude), parseFloat(p.latitude)]);
      return turf.booleanPointInPolygon(point, turfPolygon);
    });
  },

  // Nearest property to point
  nearest(lat: number, lng: number, properties: Property[]) {
    const target = turf.point([lng, lat]);
    const points = turf.featureCollection(
      properties.map(p => turf.point(
        [parseFloat(p.longitude), parseFloat(p.latitude)],
        p
      ))
    );
    
    const nearest = turf.nearestPoint(target, points);
    return nearest.properties as Property;
  },

  // Calculate bounding box
  bbox(properties: Property[]) {
    const points = turf.featureCollection(
      properties.map(p => turf.point([parseFloat(p.longitude), parseFloat(p.latitude)]))
    );
    return turf.bbox(points); // [minLng, minLat, maxLng, maxLat]
  },
};
```

**Benefits:**
- ✅ 100+ geospatial functions
- ✅ Works in browser and Node.js
- ✅ No external dependencies
- ✅ Well-documented
- ✅ Active community
- ✅ Modular (import only what you need)

**Recommendation:** **HIGH PRIORITY**. Install immediately. Turf.js enhances existing Google Maps implementation with powerful analysis capabilities. No infrastructure changes required.

---

### 8. Deck.gl - High-Performance Visualization
**Type:** WebGL-powered data visualization framework  
**License:** MIT  
**Priority:** 🟢 **HIGH**

#### What It Does
Deck.gl renders large datasets (millions of points) at 60fps using WebGL, with built-in layers for heatmaps, hexagons, arcs, and 3D visualizations.

#### Value Proposition

**Performance:**
```
Google Maps Heatmap:
- Max ~10,000 points
- Laggy with 5,000+ points
- CPU-based rendering

Deck.gl Heatmap:
- Handles 1,000,000+ points
- Smooth 60fps
- GPU-based rendering (WebGL)
```

**Visualization Layers:**

**1. Hexagon Layer (3D density visualization):**
```typescript
import { Deck } from '@deck.gl/core';
import { HexagonLayer } from '@deck.gl/aggregation-layers';

const deck = new Deck({
  container: 'map',
  initialViewState: {
    longitude: 3.3792,
    latitude: 6.5244,
    zoom: 12,
    pitch: 45, // 3D tilt
  },
  layers: [
    new HexagonLayer({
      id: 'hexagon-layer',
      data: properties,
      getPosition: (d) => [parseFloat(d.longitude), parseFloat(d.latitude)],
      getElevationWeight: (d) => d.price,
      elevationScale: 100,
      extruded: true, // 3D hexagons
      radius: 500, // 500m hexagons
      coverage: 0.9,
      pickable: true,
      onClick: (info) => console.log(info.object),
    })
  ]
});
```

**2. Heatmap Layer:**
```typescript
import { HeatmapLayer } from '@deck.gl/aggregation-layers';

new HeatmapLayer({
  id: 'heatmap',
  data: properties,
  getPosition: (d) => [parseFloat(d.longitude), parseFloat(d.latitude)],
  getWeight: (d) => d.price / 1000000, // Weight by price
  radiusPixels: 60,
  intensity: 1,
  threshold: 0.05,
  colorRange: [
    [0, 255, 0],     // Green (low)
    [255, 255, 0],   // Yellow
    [255, 0, 0],     // Red (high)
  ],
})
```

**3. Scatterplot Layer (property markers):**
```typescript
import { ScatterplotLayer } from '@deck.gl/layers';

new ScatterplotLayer({
  id: 'properties',
  data: properties,
  getPosition: (d) => [parseFloat(d.longitude), parseFloat(d.latitude)],
  getRadius: (d) => Math.sqrt(d.price) / 100,
  getFillColor: (d) => {
    // Color by property type
    const colors = {
      single_family: [0, 128, 255],
      condo: [255, 128, 0],
      townhouse: [128, 255, 0],
    };
    return colors[d.propertyType] || [128, 128, 128];
  },
  pickable: true,
  onClick: (info) => showPropertyDetails(info.object),
})
```

**4. Arc Layer (commute visualization):**
```typescript
import { ArcLayer } from '@deck.gl/layers';

// Visualize commutes from properties to downtown
new ArcLayer({
  id: 'commutes',
  data: properties,
  getSourcePosition: (d) => [parseFloat(d.longitude), parseFloat(d.latitude)],
  getTargetPosition: () => [3.3792, 6.5244], // Downtown Lagos
  getSourceColor: [0, 128, 255],
  getTargetColor: [255, 0, 0],
  getWidth: 2,
})
```

**5. H3 Hexagon Layer (integrate with existing H3 clustering):**
```typescript
import { H3HexagonLayer } from '@deck.gl/geo-layers';

// Visualize H3 clusters
new H3HexagonLayer({
  id: 'h3-layer',
  data: h3Clusters, // From server-side clustering
  getHexagon: (d) => d.h3Index,
  getFillColor: (d) => {
    const intensity = d.count / maxCount;
    return [255 * intensity, 0, 255 * (1 - intensity)];
  },
  getElevation: (d) => d.avgPrice / 10000,
  elevationScale: 100,
  extruded: true,
  pickable: true,
})
```

**Integration with Google Maps:**
```typescript
// client/src/components/DeckGLOverlay.tsx
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { HexagonLayer } from '@deck.gl/aggregation-layers';

export function PropertyMapWithDeckGL({ properties }: { properties: Property[] }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!map) return;

    const overlay = new GoogleMapsOverlay({
      layers: [
        new HexagonLayer({
          id: 'hexagon-layer',
          data: properties,
          getPosition: (d) => [parseFloat(d.longitude), parseFloat(d.latitude)],
          getElevationWeight: (d) => d.price,
          elevationScale: 100,
          extruded: true,
          radius: 500,
          pickable: true,
        })
      ]
    });

    overlay.setMap(map);

    return () => overlay.setMap(null);
  }, [map, properties]);

  return <MapView onMapReady={setMap} />;
}
```

**Benefits:**
- ✅ Handles 1M+ points smoothly
- ✅ 60fps GPU rendering
- ✅ Beautiful 3D visualizations
- ✅ Works with Google Maps or MapLibre
- ✅ Built-in layers (hexagon, heatmap, arc, etc.)
- ✅ Highly customizable

**Use Cases:**
- 📊 3D hexagon density maps
- 🔥 High-performance heatmaps
- 🌐 Large dataset visualization (100K+ properties)
- 🎨 Advanced visualizations (arcs, trips, contours)

**Recommendation:** **HIGH PRIORITY**. Install for enhanced visualizations. Works alongside existing Google Maps implementation. Dramatically improves performance for large datasets.

---

### 9. Kepler.gl - Analytics Interface
**Type:** Geospatial data visualization tool  
**License:** MIT  
**Priority:** 🔵 Low

#### What It Does
Kepler.gl is a powerful browser-based tool for exploring and visualizing large-scale geospatial datasets, with built-in filtering, aggregation, and time-series playback.

#### Value Proposition

**Features:**
- Drag-and-drop data loading (CSV, GeoJSON)
- Multiple visualization layers
- Time-series animation
- Filter and aggregation UI
- Export to HTML/PNG

**Use Cases:**
- Internal analytics dashboard
- Market research tool
- Demo/presentation tool

**Integration:**
```typescript
// client/src/pages/Analytics.tsx
import KeplerGl from 'kepler.gl';
import { addDataToMap } from 'kepler.gl/actions';

export function AnalyticsDashboard() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Load properties data
    const data = {
      fields: [
        { name: 'id', type: 'integer' },
        { name: 'latitude', type: 'real' },
        { name: 'longitude', type: 'real' },
        { name: 'price', type: 'integer' },
        { name: 'createdAt', type: 'timestamp' },
      ],
      rows: properties.map(p => [
        p.id,
        parseFloat(p.latitude),
        parseFloat(p.longitude),
        p.price,
        new Date(p.createdAt).getTime(),
      ])
    };

    dispatch(addDataToMap({
      datasets: {
        info: { label: 'Properties', id: 'properties' },
        data,
      },
      config: {
        mapStyle: { styleType: 'dark' },
      }
    }));
  }, []);

  return <KeplerGl id="map" width={window.innerWidth} height={window.innerHeight} />;
}
```

**Benefits:**
- ✅ Powerful analytics interface
- ✅ No coding required (for end users)
- ✅ Beautiful visualizations
- ✅ Time-series playback

**Challenges:**
- ❌ Heavy library (large bundle size)
- ❌ Overkill for most use cases
- ❌ Better as standalone tool, not embedded

**Recommendation:** Low priority. Better suited as internal analytics tool rather than embedded in customer-facing app. Consider for admin dashboard.

---

### 10. GeoServer - Enterprise Map Server
**Type:** Java-based OGC-compliant map server  
**License:** GPL v2  
**Priority:** 🔵 Low

#### What It Does
GeoServer publishes spatial data from various sources (PostGIS, Shapefiles, GeoTIFF) as OGC web services (WMS, WFS, WCS).

#### Value Proposition

**Enterprise Features:**
- OGC standards compliance (WMS, WFS, WCS, WPS)
- Layer styling (SLD)
- Security and access control
- Tile caching (GeoWebCache)
- REST API

**Use Cases:**
- Enterprise GIS infrastructure
- Government/institutional deployments
- Multi-tenant map services

**Challenges:**
- ❌ Java-based (heavyweight)
- ❌ Complex setup and configuration
- ❌ Overkill for single-tenant app
- ❌ Better alternatives exist (Martin)

**Recommendation:** Low priority. GeoServer is enterprise-grade but overkill for this platform. Martin is lighter and more suitable.

---

### 11. STAC - SpatioTemporal Asset Catalog
**Type:** Metadata specification for geospatial assets  
**License:** Apache 2.0  
**Priority:** 🔵 Low

#### What It Does
STAC provides a standardized way to catalog and discover geospatial data (satellite imagery, aerial photos, etc.) with temporal and spatial metadata.

#### Value Proposition

**Use Cases:**
- Satellite imagery catalogs
- Aerial photo archives
- Environmental monitoring data

**Example:**
```json
{
  "type": "Feature",
  "stac_version": "1.0.0",
  "id": "property-aerial-2024",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[...]]
  },
  "properties": {
    "datetime": "2024-01-15T00:00:00Z",
    "platform": "Drone",
    "instruments": ["RGB Camera"],
  },
  "assets": {
    "thumbnail": {
      "href": "https://example.com/thumbnail.jpg",
      "type": "image/jpeg"
    },
    "ortho": {
      "href": "https://example.com/ortho.tif",
      "type": "image/tiff"
    }
  }
}
```

**Recommendation:** Low priority. Only relevant if platform manages satellite/aerial imagery. Not applicable to current property listing use case.

---

## 🎯 Recommended Implementation Roadmap

### Phase 1: Quick Wins (Week 1-2)
**Tools:** Turf.js, Deck.gl  
**Effort:** Low  
**Impact:** High

**Actions:**
1. Install Turf.js
   ```bash
   npm install @turf/turf
   ```

2. Install Deck.gl
   ```bash
   npm install @deck.gl/core @deck.gl/layers @deck.gl/aggregation-layers @deck.gl/google-maps
   ```

3. Implement Turf.js spatial functions
   - Distance calculations
   - Polygon search
   - Nearest property finder

4. Add Deck.gl hexagon layer overlay
   - 3D density visualization
   - High-performance heatmaps

**Expected Results:**
- Enhanced spatial analysis capabilities
- Dramatic performance improvement for large datasets
- Beautiful 3D visualizations
- No infrastructure changes required

---

### Phase 2: Database Enhancement (Month 2-3)
**Tools:** PostGIS, Martin  
**Effort:** Medium  
**Impact:** High

**Actions:**
1. Set up PostgreSQL + PostGIS instance
   ```bash
   docker run -d \
     --name postgis \
     -e POSTGRES_PASSWORD=secret \
     -p 5432:5432 \
     postgis/postgis:15-3.3
   ```

2. Migrate spatial data to PostGIS
   - Keep TiDB for transactional data
   - Sync property locations to PostGIS
   - Add spatial indexes

3. Deploy Martin tile server
   ```bash
   docker run -d \
     --name martin \
     -p 3000:3000 \
     -e DATABASE_URL=postgresql://... \
     ghcr.io/maplibre/martin
   ```

4. Update tRPC routers to use PostGIS for spatial queries

**Expected Results:**
- 10-100x faster spatial queries
- Advanced spatial operations (buffer, intersection)
- Dynamic vector tile generation
- Scalable to millions of properties

---

### Phase 3: Frontend Migration (Month 4-6)
**Tools:** MapLibre GL JS, Tippecanoe  
**Effort:** High  
**Impact:** High

**Actions:**
1. Implement MapLibre GL JS alongside Google Maps
   - A/B test performance and UX
   - Gradual migration

2. Set up vector tile pipeline
   - Tippecanoe for tile generation
   - Martin for tile serving

3. Migrate custom overlays to MapLibre
   - Heatmaps
   - Clustering
   - Custom markers

4. Deprecate Google Maps (optional)

**Expected Results:**
- Zero API costs (vs. $7/1000 loads)
- Full control over map styling
- Offline support
- Vector tiles (smaller, faster)

---

## 📊 Cost-Benefit Analysis

### Current Stack (Google Maps)

**Costs:**
- Google Maps API: $7 per 1,000 map loads
- Estimated monthly loads: 100,000
- **Monthly cost: $700**

**Benefits:**
- Easy to use
- Comprehensive features
- No infrastructure management

---

### Recommended Stack (Hybrid)

**Phase 1: Turf.js + Deck.gl**
- Additional cost: $0 (open-source)
- Infrastructure: None (client-side libraries)
- **Monthly savings: $0** (but enhanced capabilities)

**Phase 2: PostGIS + Martin**
- Infrastructure: PostgreSQL + Martin server
- Estimated cost: $50/month (managed PostgreSQL)
- **Monthly savings: $0** (but 10-100x faster queries)

**Phase 3: MapLibre GL JS**
- Infrastructure: Tile server (Martin)
- Estimated cost: $50/month (already running from Phase 2)
- Google Maps API savings: $700/month
- **Monthly savings: $650**

**Total Annual Savings (Phase 3):** $7,800

---

## 🏆 Final Recommendations

### Immediate Actions (This Week)
1. ✅ Install Turf.js - Enhance spatial analysis
2. ✅ Install Deck.gl - Add 3D visualizations
3. ✅ Continue using H3 - Already implemented!

### Short-Term (Next Month)
4. 🟡 Evaluate PostGIS - Set up test instance
5. 🟡 Test Martin - Prototype tile server

### Long-Term (Next Quarter)
6. 🔵 Consider MapLibre GL JS - Reduce Google Maps dependency
7. 🔵 Implement vector tile pipeline - Tippecanoe + Martin

### Not Recommended
- ❌ GeoParquet - Overkill for current data volume
- ❌ Kepler.gl - Better as standalone tool
- ❌ GeoServer - Too heavyweight
- ❌ STAC - Not applicable to property listings

---

## 📞 Next Steps

1. **Install Turf.js and Deck.gl** (1-2 days)
   - Immediate value, zero infrastructure changes
   - Enhance existing Google Maps implementation

2. **Prototype PostGIS + Martin** (1 week)
   - Set up test environment
   - Benchmark query performance
   - Evaluate migration effort

3. **Plan MapLibre GL JS migration** (2-4 weeks)
   - A/B test with Google Maps
   - Gradual rollout
   - Cost savings analysis

**Questions?** Let me know which tools you'd like to prioritize!
