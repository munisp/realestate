-- ============================================================================
-- REAL ESTATE PLATFORM - POSTGRESQL SCHEMA (Clean Build)
-- Generated: 2025-01-21
-- PostgreSQL 15+ with PostGIS Extension Required
-- ============================================================================

-- Enable PostGIS extension for geospatial features
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'agent', 'builder', 'inspector');
CREATE TYPE property_type AS ENUM ('single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial');
CREATE TYPE listing_type AS ENUM ('sale', 'rent', 'sold', 'off_market');
CREATE TYPE property_status AS ENUM ('active', 'pending', 'sold', 'off_market', 'archived');
CREATE TYPE transaction_type AS ENUM ('sale', 'rent', 'lease');
CREATE TYPE transaction_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_type AS ENUM ('deposit', 'down_payment', 'installment', 'full_payment', 'refund');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'escrow', 'released');
CREATE TYPE alert_frequency AS ENUM ('instant', 'daily', 'weekly');
CREATE TYPE notification_type AS ENUM ('property_alert', 'new_message', 'offer_update', 'showing_reminder', 'document_ready', 'price_change', 'new_listing', 'system');
CREATE TYPE verification_status AS ENUM ('pending', 'in_review', 'verified', 'rejected');
CREATE TYPE construction_status AS ENUM ('pre_construction', 'under_construction', 'completed');
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired');
CREATE TYPE escrow_status AS ENUM ('created', 'funded', 'partial_release', 'completed', 'disputed', 'refunded', 'cancelled');
CREATE TYPE document_category AS ENUM ('deed', 'inspection_report', 'contract', 'disclosure', 'appraisal', 'insurance', 'tax_document', 'id_verification', 'title', 'other');

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    open_id VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(320),
    name TEXT,
    phone_number VARCHAR(20),
    login_method VARCHAR(64),
    role user_role DEFAULT 'user' NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_signed_in TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_users_open_id ON users(open_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- PROPERTY TABLES
-- ============================================================================

CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(100) UNIQUE,
    
    -- Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Nigeria' NOT NULL,
    
    -- Geospatial
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location GEOGRAPHY(POINT, 4326),
    h3_index VARCHAR(20),
    
    -- Property Details
    property_type property_type NOT NULL,
    listing_type listing_type NOT NULL,
    status property_status DEFAULT 'active' NOT NULL,
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1),
    square_feet INTEGER,
    lot_size INTEGER,
    year_built INTEGER,
    
    -- Pricing
    price DECIMAL(15, 2) NOT NULL,
    price_per_sqft DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'NGN',
    
    -- Listing Info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    features JSONB,
    amenities TEXT[],
    
    -- Media
    primary_image TEXT,
    images TEXT[],
    virtual_tour_url TEXT,
    video_tour_url TEXT,
    
    -- Metadata
    list_date TIMESTAMP DEFAULT NOW(),
    sold_date TIMESTAMP,
    days_on_market INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- Relationships
    owner_id INTEGER REFERENCES users(id),
    agent_id INTEGER REFERENCES users(id),
    
    -- Blockchain
    blockchain_verified BOOLEAN DEFAULT FALSE,
    blockchain_tx_hash VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_property_type ON properties(property_type);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_location ON properties USING GIST(location);
CREATE INDEX idx_properties_h3_index ON properties(h3_index);
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_agent_id ON properties(agent_id);

-- ============================================================================
-- PROPERTY VALUATIONS (Zestimate-style)
-- ============================================================================

CREATE TABLE property_valuations (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Valuation Results
    estimated_value DECIMAL(15, 2) NOT NULL,
    confidence_score DECIMAL(5, 4), -- 0.0000 to 1.0000
    value_range_low DECIMAL(15, 2),
    value_range_high DECIMAL(15, 2),
    
    -- Model Information
    model_version VARCHAR(50),
    model_type VARCHAR(50), -- 'gnn', 'ensemble', 'hybrid', 'cv', 'altdata'
    
    -- Feature Contributions
    comparable_sales_weight DECIMAL(5, 4),
    location_weight DECIMAL(5, 4),
    property_features_weight DECIMAL(5, 4),
    market_trends_weight DECIMAL(5, 4),
    visual_assessment_weight DECIMAL(5, 4),
    
    -- Metadata
    valuation_date TIMESTAMP DEFAULT NOW() NOT NULL,
    data_sources JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_valuations_property_id ON property_valuations(property_id);
CREATE INDEX idx_valuations_date ON property_valuations(valuation_date);

-- ============================================================================
-- GNN (Graph Neural Network) TABLES
-- ============================================================================

CREATE TABLE gnn_property_nodes (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Node Features
    feature_vector DECIMAL(10, 6)[],
    embedding_vector DECIMAL(10, 6)[],
    
    -- Graph Metrics
    degree_centrality DECIMAL(10, 6),
    betweenness_centrality DECIMAL(10, 6),
    pagerank_score DECIMAL(10, 6),
    
    -- Neighborhood Context
    avg_neighbor_price DECIMAL(15, 2),
    neighbor_count INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE gnn_property_edges (
    id SERIAL PRIMARY KEY,
    source_property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    target_property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Edge Features
    distance_meters DECIMAL(10, 2),
    similarity_score DECIMAL(5, 4),
    edge_weight DECIMAL(10, 6),
    edge_type VARCHAR(50), -- 'spatial', 'feature_similar', 'price_similar'
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    UNIQUE(source_property_id, target_property_id)
);

CREATE INDEX idx_gnn_edges_source ON gnn_property_edges(source_property_id);
CREATE INDEX idx_gnn_edges_target ON gnn_property_edges(target_property_id);

-- ============================================================================
-- TRANSACTIONS & PAYMENTS
-- ============================================================================

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    buyer_id INTEGER REFERENCES users(id),
    seller_id INTEGER REFERENCES users(id),
    agent_id INTEGER REFERENCES users(id),
    
    transaction_type transaction_type NOT NULL,
    status transaction_status DEFAULT 'pending' NOT NULL,
    
    -- Financial Details
    sale_price DECIMAL(15, 2) NOT NULL,
    deposit_amount DECIMAL(15, 2),
    commission_rate DECIMAL(5, 4),
    commission_amount DECIMAL(15, 2),
    
    -- Dates
    offer_date TIMESTAMP,
    acceptance_date TIMESTAMP,
    closing_date TIMESTAMP,
    completion_date TIMESTAMP,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id),
    
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    payment_type payment_type NOT NULL,
    status payment_status DEFAULT 'pending' NOT NULL,
    
    -- Payment Gateway
    stripe_payment_id VARCHAR(255),
    flutterwave_tx_ref VARCHAR(255),
    paystack_reference VARCHAR(255),
    
    payment_method VARCHAR(50),
    payment_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- ESCROW SYSTEM
-- ============================================================================

CREATE TABLE escrow_accounts (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id),
    project_id INTEGER, -- For builder projects
    
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    status escrow_status DEFAULT 'created' NOT NULL,
    
    -- Parties
    buyer_id INTEGER REFERENCES users(id),
    seller_id INTEGER REFERENCES users(id),
    
    -- Milestones
    total_milestones INTEGER,
    completed_milestones INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE escrow_transactions (
    id SERIAL PRIMARY KEY,
    escrow_account_id INTEGER REFERENCES escrow_accounts(id),
    
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type VARCHAR(50), -- 'deposit', 'release', 'refund'
    description TEXT,
    
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- SAVED SEARCHES & ALERTS
-- ============================================================================

CREATE TABLE saved_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    search_criteria JSONB NOT NULL,
    
    -- Alert Settings
    alerts_enabled BOOLEAN DEFAULT TRUE,
    alert_frequency alert_frequency DEFAULT 'daily',
    last_alert_sent TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE property_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    
    alert_type notification_type NOT NULL,
    message TEXT,
    
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- FAVORITES & COMPARISONS
-- ============================================================================

CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id, property_id)
);

CREATE TABLE property_comparisons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    property_ids INTEGER[] NOT NULL,
    comparison_data JSONB,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- APPOINTMENTS & TOURS
-- ============================================================================

CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    user_id INTEGER REFERENCES users(id),
    agent_id INTEGER REFERENCES users(id),
    
    appointment_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    tour_type VARCHAR(20), -- 'in_person', 'virtual'
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
    
    notes TEXT,
    meeting_link TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_agent_id ON appointments(agent_id);

-- ============================================================================
-- OFFERS
-- ============================================================================

CREATE TABLE offers (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    buyer_id INTEGER REFERENCES users(id),
    
    offer_amount DECIMAL(15, 2) NOT NULL,
    down_payment_percent DECIMAL(5, 2),
    closing_date DATE,
    
    contingencies TEXT[],
    additional_terms TEXT,
    
    status offer_status DEFAULT 'pending' NOT NULL,
    
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE offer_counteroffers (
    id SERIAL PRIMARY KEY,
    offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
    
    counter_amount DECIMAL(15, 2) NOT NULL,
    counter_terms TEXT,
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    transaction_id INTEGER REFERENCES transactions(id),
    uploaded_by INTEGER REFERENCES users(id),
    
    title VARCHAR(255) NOT NULL,
    category document_category NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    is_public BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- REVIEWS & RATINGS
-- ============================================================================

CREATE TABLE property_reviews (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,
    
    pros TEXT,
    cons TEXT,
    
    is_verified_buyer BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE agent_reviews (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES users(id),
    
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- BUILDER PLATFORM
-- ============================================================================

CREATE TABLE builders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    company_name VARCHAR(255) NOT NULL,
    company_logo TEXT,
    description TEXT,
    
    years_in_business INTEGER,
    license_number VARCHAR(100),
    verification_status verification_status DEFAULT 'pending',
    
    website TEXT,
    phone VARCHAR(20),
    email VARCHAR(320),
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE builder_projects (
    id SERIAL PRIMARY KEY,
    builder_id INTEGER REFERENCES builders(id) ON DELETE CASCADE,
    
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    
    property_type property_type NOT NULL,
    construction_status construction_status DEFAULT 'pre_construction',
    
    total_units INTEGER,
    available_units INTEGER,
    
    starting_price DECIMAL(15, 2),
    completion_date DATE,
    
    images TEXT[],
    floor_plans TEXT[],
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE project_milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES builder_projects(id) ON DELETE CASCADE,
    
    milestone_name VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    completion_date DATE,
    
    percentage_complete INTEGER DEFAULT 0,
    amount DECIMAL(15, 2),
    
    status VARCHAR(20) DEFAULT 'pending',
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- SHORTLET PLATFORM
-- ============================================================================

CREATE TABLE shortlet_properties (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    host_id INTEGER REFERENCES users(id),
    
    nightly_rate DECIMAL(10, 2) NOT NULL,
    weekly_discount_percent DECIMAL(5, 2),
    monthly_discount_percent DECIMAL(5, 2),
    
    min_nights INTEGER DEFAULT 1,
    max_nights INTEGER,
    
    check_in_time TIME,
    check_out_time TIME,
    
    house_rules TEXT,
    cancellation_policy TEXT,
    
    instant_booking BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE shortlet_bookings (
    id SERIAL PRIMARY KEY,
    shortlet_property_id INTEGER REFERENCES shortlet_properties(id),
    guest_id INTEGER REFERENCES users(id),
    
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_guests INTEGER NOT NULL,
    
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
    
    special_requests TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- ANALYTICS & TRACKING
-- ============================================================================

CREATE TABLE property_views (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    
    view_duration_seconds INTEGER,
    
    viewed_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE user_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    notification_type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    link TEXT,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================================
-- EMAIL DELIVERY TRACKING
-- ============================================================================

CREATE TABLE email_delivery_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    
    email_to VARCHAR(320) NOT NULL,
    subject VARCHAR(500),
    template_name VARCHAR(100),
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'bounced', 'failed'
    
    provider VARCHAR(50), -- 'resend', 'sendgrid', 'mock'
    provider_message_id VARCHAR(255),
    
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- MONITORING & HEALTH
-- ============================================================================

CREATE TABLE service_health_checks (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    
    status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'down'
    response_time_ms INTEGER,
    
    error_message TEXT,
    
    checked_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update property location from lat/lng
CREATE OR REPLACE FUNCTION update_property_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_location_trigger BEFORE INSERT OR UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_property_location();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Full-text search indexes
CREATE INDEX idx_properties_title_search ON properties USING gin(to_tsvector('english', title));
CREATE INDEX idx_properties_description_search ON properties USING gin(to_tsvector('english', description));

-- JSONB indexes
CREATE INDEX idx_properties_features ON properties USING gin(features);
CREATE INDEX idx_saved_searches_criteria ON saved_searches USING gin(search_criteria);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active listings with agent info
CREATE VIEW active_listings AS
SELECT 
    p.*,
    u.name as agent_name,
    u.email as agent_email,
    u.phone_number as agent_phone
FROM properties p
LEFT JOIN users u ON p.agent_id = u.id
WHERE p.status = 'active';

-- Property stats by city
CREATE VIEW property_stats_by_city AS
SELECT 
    city,
    COUNT(*) as total_properties,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    AVG(square_feet) as avg_sqft
FROM properties
WHERE status = 'active'
GROUP BY city;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE properties IS 'Core property listings table with geospatial support';
COMMENT ON TABLE property_valuations IS 'Zestimate-style ML property valuations';
COMMENT ON TABLE gnn_property_nodes IS 'Graph Neural Network node features for properties';
COMMENT ON TABLE gnn_property_edges IS 'Spatial relationships between properties for GNN';
COMMENT ON COLUMN properties.h3_index IS 'Uber H3 hexagonal index for spatial clustering';
COMMENT ON COLUMN properties.location IS 'PostGIS geography point for spatial queries';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
