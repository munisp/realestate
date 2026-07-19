-- Add Geospatial Indexes and H3 Pre-computation
-- Production-ready database optimization for geospatial queries

-- Add H3 index column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS h3Index VARCHAR(20);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS h3Resolution INT DEFAULT 9;

-- Add spatial index on latitude/longitude
ALTER TABLE properties ADD INDEX idx_properties_lat_lng (latitude, longitude);

-- Add H3 index for fast neighborhood queries
ALTER TABLE properties ADD INDEX idx_properties_h3 (h3Index);

-- Add composite index for common geospatial queries
ALTER TABLE properties ADD INDEX idx_properties_geo_search (
  city, state, propertyType, listingType, price, latitude, longitude
);

-- Add index for price range queries
ALTER TABLE properties ADD INDEX idx_properties_price_range (
  propertyType, listingType, price, status
);

-- Add index for nearby properties queries
ALTER TABLE properties ADD INDEX idx_properties_nearby (
  latitude, longitude, propertyType, status
);

-- Shortlet bookings geospatial indexes
ALTER TABLE shortLetBookings ADD INDEX idx_shortlet_dates (
  propertyId, checkInDate, checkOutDate, status
);

ALTER TABLE shortLetBookings ADD INDEX idx_shortlet_availability (
  checkInDate, checkOutDate, status
);

-- Builder projects geospatial indexes
ALTER TABLE builderProjects ADD INDEX idx_builder_location (
  city, state, status
);

ALTER TABLE builderProjects ADD INDEX idx_builder_budget (
  estimatedBudget, status
);

-- Property views optimization
ALTER TABLE propertyViews ADD INDEX idx_views_property_date (
  propertyId, viewedAt
);

ALTER TABLE propertyViews ADD INDEX idx_views_user_date (
  userId, viewedAt
);

-- Valuations optimization
ALTER TABLE valuations ADD INDEX idx_valuations_property_date (
  propertyId, createdAt DESC
);

-- Transactions optimization
ALTER TABLE transactions ADD INDEX idx_transactions_property (
  propertyId, status, createdAt DESC
);

ALTER TABLE transactions ADD INDEX idx_transactions_user (
  buyerId, status, createdAt DESC
);

-- Payments optimization
ALTER TABLE payments ADD INDEX idx_payments_transaction (
  transactionId, status, createdAt DESC
);

ALTER TABLE payments ADD INDEX idx_payments_user (
  userId, status, createdAt DESC
);

-- Create materialized view for neighborhood statistics
-- Note: MySQL doesn't support materialized views natively, so we create a regular table
-- that will be refreshed periodically

CREATE TABLE IF NOT EXISTS neighborhood_stats (
  h3Index VARCHAR(20) PRIMARY KEY,
  propertyCount INT DEFAULT 0,
  averagePrice DECIMAL(15, 2) DEFAULT 0,
  medianPrice DECIMAL(15, 2) DEFAULT 0,
  minPrice DECIMAL(15, 2) DEFAULT 0,
  maxPrice DECIMAL(15, 2) DEFAULT 0,
  pricePerSqft DECIMAL(10, 2) DEFAULT 0,
  avgBedrooms DECIMAL(3, 1) DEFAULT 0,
  avgBathrooms DECIMAL(3, 1) DEFAULT 0,
  avgSquareFeet DECIMAL(10, 2) DEFAULT 0,
  lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_neighborhood_stats_updated (lastUpdated)
);

-- Create table for cached geospatial calculations
CREATE TABLE IF NOT EXISTS geospatial_cache (
  cacheKey VARCHAR(255) PRIMARY KEY,
  cacheValue TEXT,
  expiresAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_geospatial_cache_expires (expiresAt)
);

-- Create table for H3 cell metadata
CREATE TABLE IF NOT EXISTS h3_cells (
  h3Index VARCHAR(20) PRIMARY KEY,
  resolution INT NOT NULL,
  centerLat DECIMAL(10, 8),
  centerLng DECIMAL(11, 8),
  boundaryGeoJSON TEXT,
  propertyCount INT DEFAULT 0,
  lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_h3_cells_resolution (resolution),
  INDEX idx_h3_cells_center (centerLat, centerLng),
  INDEX idx_h3_cells_updated (lastUpdated)
);

-- Add full-text search indexes for property search
ALTER TABLE properties ADD FULLTEXT INDEX idx_properties_fulltext (
  title, description, addressLine1, city, state
);

-- Add index for featured/popular properties
ALTER TABLE properties ADD INDEX idx_properties_featured (
  status, viewCount DESC, favoriteCount DESC
);

-- Add index for recently updated properties
ALTER TABLE properties ADD INDEX idx_properties_recent (
  status, updatedAt DESC
);

-- Comments for documentation
COMMENT ON COLUMN properties.h3Index IS 'H3 hexagonal index for fast geospatial queries (resolution 9)';
COMMENT ON COLUMN properties.h3Resolution IS 'H3 resolution level used for indexing';
COMMENT ON TABLE neighborhood_stats IS 'Aggregated statistics by H3 neighborhood (refreshed hourly)';
COMMENT ON TABLE geospatial_cache IS 'Cache for expensive geospatial calculations (5min TTL)';
COMMENT ON TABLE h3_cells IS 'H3 cell metadata for neighborhood analysis';
