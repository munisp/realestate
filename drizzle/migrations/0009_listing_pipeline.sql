-- Migration: 0009_listing_pipeline.sql
-- Adds tables for the real listing data pipeline:
--   pipeline_state, listing_features, data_quality_log

-- ── Pipeline state KV store ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_state (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Enriched listing features ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_features (
    id                      SERIAL PRIMARY KEY,
    property_id             INTEGER NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
    price_per_sqm           NUMERIC(12, 2),
    market_price_per_sqm    NUMERIC(12, 2),
    price_deviation_pct     NUMERIC(8, 2),   -- % above/below market benchmark
    estate_name             TEXT,
    lga                     TEXT,
    geospatial_zone         TEXT,            -- e.g. "South West", "North Central"
    usd_price               NUMERIC(14, 2),
    completeness_score      NUMERIC(5, 3),   -- 0.000 – 1.000
    days_on_market          INTEGER DEFAULT 0,
    comparable_count        INTEGER DEFAULT 0,
    enriched_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_features_property ON listing_features(property_id);
CREATE INDEX IF NOT EXISTS idx_listing_features_lga ON listing_features(lga);
CREATE INDEX IF NOT EXISTS idx_listing_features_zone ON listing_features(geospatial_zone);

-- ── Data quality log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_quality_log (
    id              SERIAL PRIMARY KEY,
    property_id     INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    score           NUMERIC(5, 1) NOT NULL,
    flags           JSONB NOT NULL DEFAULT '[]',
    scored_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dq_log_property ON data_quality_log(property_id);
CREATE INDEX IF NOT EXISTS idx_dq_log_score ON data_quality_log(score);

-- ── Add quality score columns to properties ───────────────────────────────────
ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS "dataQualityScore" NUMERIC(5, 1),
    ADD COLUMN IF NOT EXISTS "qualityFlags"     JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS "enrichedAt"       TIMESTAMPTZ;

-- ── Seed pipeline state ───────────────────────────────────────────────────────
INSERT INTO pipeline_state (key, value) VALUES
    ('last_ingest_at',          'null'),
    ('last_retrain_at',         'null'),
    ('listings_since_retrain',  '0'),
    ('total_real_listings',     '0'),
    ('baseline_price_by_city',  '{}')
ON CONFLICT (key) DO NOTHING;

-- ── Agent verification registry ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_verification (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    nin                 TEXT,                          -- National Identification Number
    bvn                 TEXT,                          -- Bank Verification Number
    cac_number          TEXT,                          -- Corporate Affairs Commission (for agencies)
    niesv_number        TEXT,                          -- Nigerian Institution of Estate Surveyors & Valuers
    verification_status TEXT NOT NULL DEFAULT 'pending'
                            CHECK (verification_status IN ('pending','in_review','verified','rejected','suspended')),
    verified_at         TIMESTAMPTZ,
    verified_by         INTEGER REFERENCES users(id),
    rejection_reason    TEXT,
    badge_tier          TEXT DEFAULT 'unverified'
                            CHECK (badge_tier IN ('unverified','basic','verified','premium','elite')),
    listing_limit       INTEGER DEFAULT 5,             -- Max active listings per tier
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_verification_user ON agent_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_verification_status ON agent_verification(verification_status);

-- ── Diaspora buyer profiles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diaspora_profiles (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    country_of_residence TEXT NOT NULL,
    preferred_currency  TEXT NOT NULL DEFAULT 'USD',
    investment_budget_usd NUMERIC(14, 2),
    preferred_cities    JSONB DEFAULT '[]',
    preferred_property_types JSONB DEFAULT '[]',
    kyc_status          TEXT NOT NULL DEFAULT 'pending'
                            CHECK (kyc_status IN ('pending','submitted','verified','rejected')),
    escrow_enabled      BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Listing verification badges ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_verification (
    id                  SERIAL PRIMARY KEY,
    property_id         INTEGER NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
    title_verified      BOOLEAN DEFAULT FALSE,
    agent_verified      BOOLEAN DEFAULT FALSE,
    photos_verified     BOOLEAN DEFAULT FALSE,
    price_verified      BOOLEAN DEFAULT FALSE,
    address_verified    BOOLEAN DEFAULT FALSE,
    overall_badge       TEXT NOT NULL DEFAULT 'unverified'
                            CHECK (overall_badge IN ('unverified','partial','verified','premium')),
    verified_at         TIMESTAMPTZ,
    verified_by         INTEGER REFERENCES users(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_verification_property ON listing_verification(property_id);
CREATE INDEX IF NOT EXISTS idx_listing_verification_badge ON listing_verification(overall_badge);
