-- PostGIS Spatial Database Initialization Script
-- Real Estate Platform - Property Spatial Data

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create spatial schema
CREATE SCHEMA IF NOT EXISTS spatial;

-- Set search path
SET search_path TO spatial, public;

-- Create properties_spatial table
CREATE TABLE IF NOT EXISTS spatial.properties_spatial (
    -- Primary key (synced from TiDB)
    id INTEGER PRIMARY KEY,
    
    -- Spatial geometry (Point with SRID 4326 - WGS 84)
    geom GEOMETRY(Point, 4326) NOT NULL,
    
    -- Property details (denormalized for performance)
    title TEXT,
    price BIGINT,
    property_type VARCHAR(50),
    listing_type VARCHAR(20),
    bedrooms INTEGER,
    bathrooms INTEGER,
    square_feet INTEGER,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    status VARCHAR(20),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_bedrooms CHECK (bedrooms >= 0),
    CONSTRAINT valid_bathrooms CHECK (bathrooms >= 0)
);

-- Create spatial index on geometry column (GIST index)
CREATE INDEX IF NOT EXISTS idx_properties_spatial_geom 
ON spatial.properties_spatial USING GIST(geom);

-- Create additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_properties_spatial_price 
ON spatial.properties_spatial(price);

CREATE INDEX IF NOT EXISTS idx_properties_spatial_property_type 
ON spatial.properties_spatial(property_type);

CREATE INDEX IF NOT EXISTS idx_properties_spatial_status 
ON spatial.properties_spatial(status);

CREATE INDEX IF NOT EXISTS idx_properties_spatial_city 
ON spatial.properties_spatial(city);

-- Create composite index for filtered spatial queries
CREATE INDEX IF NOT EXISTS idx_properties_spatial_status_geom 
ON spatial.properties_spatial(status, geom);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION spatial.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_properties_spatial_updated_at
    BEFORE UPDATE ON spatial.properties_spatial
    FOR EACH ROW
    EXECUTE FUNCTION spatial.update_updated_at_column();

-- Create view for active properties
CREATE OR REPLACE VIEW spatial.active_properties AS
SELECT *
FROM spatial.properties_spatial
WHERE status = 'active';

-- Create materialized view for property density by city
CREATE MATERIALIZED VIEW IF NOT EXISTS spatial.property_density_by_city AS
SELECT 
    city,
    COUNT(*) as property_count,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    ST_Centroid(ST_Collect(geom)) as center_point
FROM spatial.properties_spatial
WHERE status = 'active'
GROUP BY city;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_property_density_city 
ON spatial.property_density_by_city(city);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION spatial.refresh_property_density()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW spatial.property_density_by_city;
END;
$$ LANGUAGE plpgsql;

-- Create helper function: Find properties within radius
CREATE OR REPLACE FUNCTION spatial.find_properties_within_radius(
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION,
    max_results INTEGER DEFAULT 100
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    price BIGINT,
    property_type VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.price,
        p.property_type,
        ST_Y(p.geom) as latitude,
        ST_X(p.geom) as longitude,
        ST_Distance(
            p.geom::geography,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
        ) as distance_meters
    FROM spatial.properties_spatial p
    WHERE 
        p.status = 'active'
        AND ST_DWithin(
            p.geom::geography,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
            radius_meters
        )
    ORDER BY distance_meters
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Create helper function: Find properties within polygon
CREATE OR REPLACE FUNCTION spatial.find_properties_within_polygon(
    polygon_geojson JSON,
    max_results INTEGER DEFAULT 1000
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    price BIGINT,
    property_type VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.price,
        p.property_type,
        ST_Y(p.geom) as latitude,
        ST_X(p.geom) as longitude
    FROM spatial.properties_spatial p
    WHERE 
        p.status = 'active'
        AND ST_Within(
            p.geom,
            ST_GeomFromGeoJSON(polygon_geojson::text)
        )
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Create helper function: Find nearest properties
CREATE OR REPLACE FUNCTION spatial.find_nearest_properties(
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    max_count INTEGER DEFAULT 10,
    max_radius_meters DOUBLE PRECISION DEFAULT 50000
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    price BIGINT,
    property_type VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.price,
        p.property_type,
        ST_Y(p.geom) as latitude,
        ST_X(p.geom) as longitude,
        ST_Distance(
            p.geom::geography,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
        ) as distance_meters
    FROM spatial.properties_spatial p
    WHERE 
        p.status = 'active'
        AND ST_DWithin(
            p.geom::geography,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
            max_radius_meters
        )
    ORDER BY distance_meters
    LIMIT max_count;
END;
$$ LANGUAGE plpgsql;

-- Create helper function: Buffer analysis (find properties near a point of interest)
CREATE OR REPLACE FUNCTION spatial.find_properties_near_poi(
    poi_lat DOUBLE PRECISION,
    poi_lng DOUBLE PRECISION,
    buffer_meters DOUBLE PRECISION,
    max_results INTEGER DEFAULT 100
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    price BIGINT,
    property_type VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.price,
        p.property_type,
        ST_Y(p.geom) as latitude,
        ST_X(p.geom) as longitude,
        ST_Distance(
            p.geom::geography,
            ST_SetSRID(ST_MakePoint(poi_lng, poi_lat), 4326)::geography
        ) as distance_meters
    FROM spatial.properties_spatial p
    WHERE 
        p.status = 'active'
        AND ST_Within(
            p.geom,
            ST_Buffer(
                ST_SetSRID(ST_MakePoint(poi_lng, poi_lat), 4326)::geography,
                buffer_meters
            )::geometry
        )
    ORDER BY distance_meters
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA spatial TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA spatial TO PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA spatial TO PUBLIC;

-- Create statistics for query optimization
ANALYZE spatial.properties_spatial;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'PostGIS spatial database initialized successfully';
    RAISE NOTICE 'Schema: spatial';
    RAISE NOTICE 'Main table: spatial.properties_spatial';
    RAISE NOTICE 'Spatial index: idx_properties_spatial_geom (GIST)';
    RAISE NOTICE 'Helper functions: find_properties_within_radius, find_properties_within_polygon, find_nearest_properties, find_properties_near_poi';
END $$;
