-- Migration 0006: Innovation feature tables
-- Covers: maintenance scores, document notarization, price drop events,
--         AR staging, livability scores, contract risk analyses,
--         carbon footprint cache, identity wallet (DIDs + VCs + presentations)

-- ── Maintenance Scoring ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS property_maintenance_scores (
  property_id    TEXT        PRIMARY KEY,
  overall_score  INTEGER     NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  score_data     JSONB       NOT NULL,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_scores_generated_at ON property_maintenance_scores (generated_at);

CREATE TABLE IF NOT EXISTS property_inspection_reports (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       TEXT        NOT NULL,
  submitted_by      TEXT        NOT NULL,
  inspector_name    TEXT        NOT NULL,
  inspection_date   DATE        NOT NULL,
  findings          JSONB       NOT NULL DEFAULT '{}',
  overall_condition TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspection_reports_property ON property_inspection_reports (property_id);

-- ── Document Notarization ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_notarizations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_hash       TEXT        NOT NULL UNIQUE,
  document_title      TEXT        NOT NULL,
  document_type       TEXT        NOT NULL,
  property_id         TEXT,
  description         TEXT,
  notarized_by        TEXT        NOT NULL,
  notarized_by_name   TEXT,
  blockchain_tx       TEXT,
  blockchain_network  TEXT,
  block_number        BIGINT,
  merkle_root         TEXT,
  batch_id            UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notarizations_hash        ON document_notarizations (document_hash);
CREATE INDEX IF NOT EXISTS idx_notarizations_property    ON document_notarizations (property_id);
CREATE INDEX IF NOT EXISTS idx_notarizations_notarized_by ON document_notarizations (notarized_by);

CREATE TABLE IF NOT EXISTS notarization_batches (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merkle_root  TEXT        NOT NULL,
  hash_count   INTEGER     NOT NULL,
  anchored_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Smart Price Alerts ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_drop_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    TEXT        NOT NULL,
  old_price      BIGINT      NOT NULL,
  new_price      BIGINT      NOT NULL,
  drop_percent   NUMERIC(5,2) NOT NULL,
  urgency_score  INTEGER     NOT NULL CHECK (urgency_score BETWEEN 0 AND 100),
  tier           TEXT        NOT NULL,
  score_data     JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_drop_property   ON price_drop_events (property_id);
CREATE INDEX IF NOT EXISTS idx_price_drop_score      ON price_drop_events (urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_price_drop_created_at ON price_drop_events (created_at DESC);

CREATE TABLE IF NOT EXISTS smart_price_alert_subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                TEXT        NOT NULL,
  saved_search_id        TEXT,
  property_id            TEXT,
  min_urgency_score      INTEGER     NOT NULL DEFAULT 60,
  notification_channels  JSONB       NOT NULL DEFAULT '["push","email"]',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, COALESCE(saved_search_id, ''), COALESCE(property_id, ''))
);

CREATE INDEX IF NOT EXISTS idx_price_alert_subs_user ON smart_price_alert_subscriptions (user_id);

-- ── AR Virtual Staging ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_staging_scenes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT        NOT NULL,
  created_by  TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  rooms       JSONB       NOT NULL DEFAULT '[]',
  is_public   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_scenes_property   ON ar_staging_scenes (property_id);
CREATE INDEX IF NOT EXISTS idx_ar_scenes_created_by ON ar_staging_scenes (created_by);
CREATE INDEX IF NOT EXISTS idx_ar_scenes_public     ON ar_staging_scenes (is_public) WHERE is_public = TRUE;

-- ── Livability Scores ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS livability_scores (
  cache_key     TEXT        PRIMARY KEY,
  lat           NUMERIC(10,7) NOT NULL,
  lng           NUMERIC(10,7) NOT NULL,
  city          TEXT,
  state         TEXT,
  overall_score INTEGER     NOT NULL,
  score_data    JSONB       NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livability_generated_at ON livability_scores (generated_at);

CREATE TABLE IF NOT EXISTS neighbourhood_ratings (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 TEXT        NOT NULL,
  lat                     NUMERIC(10,7) NOT NULL,
  lng                     NUMERIC(10,7) NOT NULL,
  neighbourhood           TEXT        NOT NULL,
  city                    TEXT        NOT NULL,
  safety_rating           SMALLINT    NOT NULL CHECK (safety_rating BETWEEN 1 AND 5),
  infrastructure_rating   SMALLINT    NOT NULL CHECK (infrastructure_rating BETWEEN 1 AND 5),
  noise_rating            SMALLINT    NOT NULL CHECK (noise_rating BETWEEN 1 AND 5),
  review                  TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, neighbourhood, city)
);

CREATE INDEX IF NOT EXISTS idx_neighbourhood_ratings_city ON neighbourhood_ratings (city);

-- ── Contract Risk Analysis ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contract_risk_analyses (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT        NOT NULL,
  property_id         TEXT,
  document_type       TEXT        NOT NULL,
  overall_risk_score  INTEGER     NOT NULL CHECK (overall_risk_score BETWEEN 0 AND 100),
  risk_grade          TEXT        NOT NULL,
  report_data         JSONB       NOT NULL,
  analysed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_analyses_user ON contract_risk_analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_contract_analyses_property ON contract_risk_analyses (property_id);

-- ── Identity Wallet ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_dids (
  user_id     TEXT        PRIMARY KEY,
  did         TEXT        NOT NULL UNIQUE,
  public_key  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_credentials (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT        NOT NULL,
  credential_type       TEXT        NOT NULL,
  issuer_did            TEXT        NOT NULL,
  subject_did           TEXT        NOT NULL,
  credential_data       JSONB       NOT NULL,
  issued_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,
  is_revoked            BOOLEAN     NOT NULL DEFAULT FALSE,
  revoked_at            TIMESTAMPTZ,
  related_property_id   TEXT,
  UNIQUE (user_id, credential_type) WHERE NOT is_revoked
);

CREATE INDEX IF NOT EXISTS idx_user_credentials_user   ON user_credentials (user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_type   ON user_credentials (credential_type);
CREATE INDEX IF NOT EXISTS idx_user_credentials_active ON user_credentials (user_id, is_revoked) WHERE NOT is_revoked;

CREATE TABLE IF NOT EXISTS verifiable_presentations (
  id                  TEXT        PRIMARY KEY,
  user_id             TEXT        NOT NULL,
  presentation_data   JSONB       NOT NULL,
  purpose             TEXT        NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presentations_user    ON verifiable_presentations (user_id);
CREATE INDEX IF NOT EXISTS idx_presentations_expires ON verifiable_presentations (expires_at);

-- Auto-cleanup expired presentations (run via pg_cron or application scheduler)
-- DELETE FROM verifiable_presentations WHERE expires_at < NOW() - INTERVAL '1 day';
