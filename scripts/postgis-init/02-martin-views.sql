-- Additional views and tables for Martin tile server
-- This script creates optimized structures for vector tile generation

-- ============================================================================
-- H3 Property Clusters for Tile Generation
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial.property_clusters_h3 (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution INTEGER NOT NULL,
    property_count INTEGER NOT NULL DEFAULT 0,
    avg_price NUMERIC(12, 2),
    min_price NUMERIC(12, 2),
    max_price NUMERIC(12, 2),
    city VARCHAR(100),
    geom GEOMETRY(Polygon, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index for H3 clusters
CREATE INDEX IF NOT EXISTS idx_property_clusters_h3_geom 
ON spatial.property_clusters_h3 USING GIST(geom);

-- Index for filtering by resolution
CREATE INDEX IF NOT EXISTS idx_property_clusters_h3_resolution 
ON spatial.property_clusters_h3(resolution);

COMMENT ON TABLE spatial.property_clusters_h3 IS 
'Pre-aggregated property clusters using H3 hexagonal indexing for efficient tile generation';

-- ============================================================================
-- Neighborhood Boundaries for Vector Tiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial.neighborhood_boundaries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tier VARCHAR(20),
    zone VARCHAR(50),
    median_price NUMERIC(12, 2),
    property_count INTEGER DEFAULT 0,
    walkability_score INTEGER,
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_neighborhood_boundaries_geom 
ON spatial.neighborhood_boundaries USING GIST(geom);

-- Index for name lookups
CREATE INDEX IF NOT EXISTS idx_neighborhood_boundaries_name 
ON spatial.neighborhood_boundaries(name);

COMMENT ON TABLE spatial.neighborhood_boundaries IS 
'Neighborhood polygon boundaries with aggregated statistics for map visualization';

-- ============================================================================
-- Function: Get Property Heatmap Data
-- ============================================================================

CREATE OR REPLACE FUNCTION spatial.get_property_heatmap(
    bbox GEOMETRY DEFAULT NULL,
    zoom_level INTEGER DEFAULT 10
)
RETURNS TABLE (
    geom GEOMETRY,
    weight NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.geom,
        CASE 
            WHEN zoom_level < 8 THEN 1.0
            WHEN zoom_level < 12 THEN (p.price / 1000000.0)::NUMERIC
            ELSE (p.price / 100000.0)::NUMERIC
        END as weight
    FROM spatial.properties_spatial p
    WHERE 
        (bbox IS NULL OR ST_Intersects(p.geom, bbox))
        AND p.status = 'active';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION spatial.get_property_heatmap IS 
'Returns property points with weights for heatmap visualization';

-- ============================================================================
-- Function: Refresh H3 Clusters
-- ============================================================================

CREATE OR REPLACE FUNCTION spatial.refresh_h3_clusters(
    target_resolution INTEGER DEFAULT 7
)
RETURNS INTEGER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    -- Delete existing clusters at this resolution
    DELETE FROM spatial.property_clusters_h3 
    WHERE resolution = target_resolution;
    
    -- Insert new clusters
    INSERT INTO spatial.property_clusters_h3 
        (h3_index, resolution, property_count, avg_price, min_price, max_price, city, geom)
    SELECT 
        h3_index,
        target_resolution as resolution,
        COUNT(*) as property_count,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        MAX(city) as city,  -- Dominant city in cluster
        ST_SetSRID(
            ST_GeomFromText(
                'POLYGON((' || 
                STRING_AGG(
                    DISTINCT ST_X(geom)::TEXT || ' ' || ST_Y(geom)::TEXT, 
                    ','
                ) || 
                '))'
            ),
            4326
        ) as geom
    FROM spatial.properties_spatial
    WHERE h3_index IS NOT NULL
    GROUP BY h3_index
    HAVING COUNT(*) > 0;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION spatial.refresh_h3_clusters IS 
'Refreshes H3 cluster aggregations for a given resolution (5-9 recommended)';

-- ============================================================================
-- Seed Lagos Neighborhood Boundaries
-- ============================================================================

INSERT INTO spatial.neighborhood_boundaries 
    (name, tier, zone, median_price, property_count, walkability_score, geom)
VALUES
    -- Victoria Island
    ('Victoria Island', 'Premium', 'Island', 250000000, 0, 75,
     ST_GeomFromText('POLYGON((3.42 6.42, 3.45 6.42, 3.45 6.44, 3.42 6.44, 3.42 6.42))', 4326)),
    
    -- Ikoyi
    ('Ikoyi', 'Luxury', 'Island', 300000000, 0, 70,
     ST_GeomFromText('POLYGON((3.43 6.45, 3.46 6.45, 3.46 6.47, 3.43 6.47, 3.43 6.45))', 4326)),
    
    -- Lekki Phase 1
    ('Lekki Phase 1', 'Premium', 'Lekki', 150000000, 0, 65,
     ST_GeomFromText('POLYGON((3.47 6.43, 3.50 6.43, 3.50 6.45, 3.47 6.45, 3.47 6.43))', 4326)),
    
    -- Ikeja GRA
    ('Ikeja GRA', 'Premium', 'Mainland', 120000000, 0, 68,
     ST_GeomFromText('POLYGON((3.34 6.59, 3.37 6.59, 3.37 6.61, 3.34 6.61, 3.34 6.59))', 4326)),
    
    -- Yaba
    ('Yaba', 'Mid-Range', 'Mainland', 80000000, 0, 72,
     ST_GeomFromText('POLYGON((3.37 6.50, 3.40 6.50, 3.40 6.52, 3.37 6.52, 3.37 6.50))', 4326)),
    
    -- Surulere
    ('Surulere', 'Mid-Range', 'Mainland', 75000000, 0, 70,
     ST_GeomFromText('POLYGON((3.35 6.49, 3.38 6.49, 3.38 6.51, 3.35 6.51, 3.35 6.49))', 4326)),
    
    -- Ajah
    ('Ajah', 'Affordable', 'Lekki', 50000000, 0, 55,
     ST_GeomFromText('POLYGON((3.56 6.46, 3.59 6.46, 3.59 6.48, 3.56 6.48, 3.56 6.46))', 4326)),
    
    -- Festac Town
    ('Festac Town', 'Mid-Range', 'Mainland', 70000000, 0, 65,
     ST_GeomFromText('POLYGON((3.28 6.46, 3.31 6.46, 3.31 6.48, 3.28 6.48, 3.28 6.46))', 4326))
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Refresh Materialized Views
-- ============================================================================

-- Refresh property density view (from previous script)
REFRESH MATERIALIZED VIEW IF EXISTS spatial.property_density_by_city;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant read access to Martin user (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'martin') THEN
        GRANT USAGE ON SCHEMA spatial TO martin;
        GRANT SELECT ON ALL TABLES IN SCHEMA spatial TO martin;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA spatial TO martin;
    END IF;
END $$;

-- ============================================================================
-- Completion Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Martin tile server views and tables created successfully';
    RAISE NOTICE '📊 Run: SELECT spatial.refresh_h3_clusters(7); to populate clusters';
    RAISE NOTICE '🗺️  Neighborhood boundaries seeded for Lagos';
END $$;
