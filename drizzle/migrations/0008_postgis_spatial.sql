-- ============================================================
-- Migration 0008: PostGIS Spatial Columns and Indexes
-- Enables PostGIS extension, adds proper geometry columns,
-- creates spatial indexes, and migrates VARCHAR lat/lng to NUMERIC.
-- ============================================================

-- 1. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS h3 CASCADE;  -- H3 hexagonal indexing (requires pg_h3)

-- 2. Add NUMERIC lat/lng columns (replacing VARCHAR)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Migrate existing VARCHAR data
UPDATE properties
  SET lat = CAST(NULLIF(TRIM(latitude), '') AS DOUBLE PRECISION),
      lng = CAST(NULLIF(TRIM(longitude), '') AS DOUBLE PRECISION)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Add PostGIS geometry column (EPSG:4326 = WGS84)
SELECT AddGeometryColumn('properties', 'geom', 4326, 'POINT', 2);

-- Populate geom from lat/lng
UPDATE properties
  SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- 4. Create spatial index (GiST — optimal for ST_DWithin, ST_Within)
CREATE INDEX IF NOT EXISTS idx_properties_geom
  ON properties USING GIST (geom);

-- 5. Create KNN index for nearest-neighbour queries
CREATE INDEX IF NOT EXISTS idx_properties_geom_knn
  ON properties USING GIST (geom gist_geometry_ops_nd);

-- 6. Composite index for filtered spatial queries
CREATE INDEX IF NOT EXISTS idx_properties_geom_status
  ON properties USING GIST (geom)
  WHERE status = 'active';

-- 7. Add spatial columns to shortlet_bookings
ALTER TABLE shortlet_bookings
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

SELECT AddGeometryColumn('shortlet_bookings', 'geom', 4326, 'POINT', 2);
CREATE INDEX IF NOT EXISTS idx_shortlet_geom ON shortlet_bookings USING GIST (geom);

-- 8. Create Nigerian administrative boundaries table
CREATE TABLE IF NOT EXISTS nigerian_boundaries (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  type          VARCHAR(50)  NOT NULL,  -- 'state', 'lga', 'ward', 'neighbourhood'
  state         VARCHAR(100),
  lga           VARCHAR(100),
  population    INTEGER,
  area_sqkm     DOUBLE PRECISION,
  geom          GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
  properties    JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nigerian_boundaries_geom
  ON nigerian_boundaries USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_nigerian_boundaries_type
  ON nigerian_boundaries (type);
CREATE INDEX IF NOT EXISTS idx_nigerian_boundaries_state
  ON nigerian_boundaries (state);

-- 9. Create isochrone cache table
CREATE TABLE IF NOT EXISTS isochrone_cache (
  id              SERIAL PRIMARY KEY,
  origin_lat      DOUBLE PRECISION NOT NULL,
  origin_lng      DOUBLE PRECISION NOT NULL,
  travel_mode     VARCHAR(20) NOT NULL,  -- 'driving', 'walking', 'cycling', 'transit'
  duration_mins   INTEGER NOT NULL,
  geom            GEOMETRY(POLYGON, 4326),
  provider        VARCHAR(50) DEFAULT 'osrm',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_isochrone_cache_origin
  ON isochrone_cache (origin_lat, origin_lng, travel_mode, duration_mins);
CREATE INDEX IF NOT EXISTS idx_isochrone_cache_geom
  ON isochrone_cache USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_isochrone_cache_expires
  ON isochrone_cache (expires_at);

-- 10. Create geocoding cache table
CREATE TABLE IF NOT EXISTS geocoding_cache (
  id            SERIAL PRIMARY KEY,
  query         TEXT NOT NULL UNIQUE,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  formatted     TEXT,
  components    JSONB DEFAULT '{}',
  provider      VARCHAR(50) DEFAULT 'nominatim',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_geocoding_cache_query
  ON geocoding_cache (query);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_expires
  ON geocoding_cache (expires_at);

-- 11. Create price heatmap materialized view (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS property_price_heatmap AS
SELECT
  ST_SnapToGrid(geom, 0.01) AS grid_point,  -- ~1km grid
  AVG(price)::BIGINT         AS avg_price,
  COUNT(*)                   AS property_count,
  MIN(price)                 AS min_price,
  MAX(price)                 AS max_price,
  STDDEV(price)::BIGINT      AS price_stddev,
  ST_X(ST_SnapToGrid(geom, 0.01)) AS lng,
  ST_Y(ST_SnapToGrid(geom, 0.01)) AS lat
FROM properties
WHERE geom IS NOT NULL
  AND price > 0
  AND status = 'active'
GROUP BY ST_SnapToGrid(geom, 0.01);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_heatmap_point
  ON property_price_heatmap (grid_point);

-- 12. Trigger to auto-update geom when lat/lng changes
CREATE OR REPLACE FUNCTION update_property_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_property_geom ON properties;
CREATE TRIGGER trg_update_property_geom
  BEFORE INSERT OR UPDATE OF lat, lng ON properties
  FOR EACH ROW EXECUTE FUNCTION update_property_geom();

-- 13. Function: find properties within radius (metres)
CREATE OR REPLACE FUNCTION find_properties_within_radius(
  p_lat    DOUBLE PRECISION,
  p_lng    DOUBLE PRECISION,
  p_radius INTEGER,  -- metres
  p_limit  INTEGER DEFAULT 50
)
RETURNS TABLE (
  id          UUID,
  title       TEXT,
  price       BIGINT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  distance_m  DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title::TEXT,
    p.price,
    p.lat,
    p.lng,
    ST_Distance(
      p.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_m
  FROM properties p
  WHERE ST_DWithin(
    p.geom::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radius
  )
  AND p.status = 'active'
  ORDER BY distance_m
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 14. Function: find properties within polygon (GeoJSON)
CREATE OR REPLACE FUNCTION find_properties_within_polygon(
  p_geojson TEXT,
  p_limit   INTEGER DEFAULT 100
)
RETURNS TABLE (
  id    UUID,
  title TEXT,
  price BIGINT,
  lat   DOUBLE PRECISION,
  lng   DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.title::TEXT, p.price, p.lat, p.lng
  FROM properties p
  WHERE ST_Within(p.geom, ST_GeomFromGeoJSON(p_geojson))
  AND p.status = 'active'
  ORDER BY p.price
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 15. Comment on new columns
COMMENT ON COLUMN properties.lat  IS 'Latitude as DOUBLE PRECISION (replaces VARCHAR latitude)';
COMMENT ON COLUMN properties.lng  IS 'Longitude as DOUBLE PRECISION (replaces VARCHAR longitude)';
COMMENT ON COLUMN properties.geom IS 'PostGIS POINT geometry (EPSG:4326) — auto-updated by trigger';
