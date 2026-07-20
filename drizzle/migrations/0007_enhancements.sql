-- Migration 0007: Enhancement tables
-- Covers: idempotency records, image CDN metadata, cursor pagination helpers

-- ── Idempotency Records ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idempotency_records (
  key          TEXT        PRIMARY KEY,
  result       JSONB       NOT NULL,
  status_code  SMALLINT    NOT NULL DEFAULT 200,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_created_at ON idempotency_records (created_at);

-- Auto-cleanup: delete records older than 24 hours
-- This can be run via pg_cron:
--   SELECT cron.schedule('cleanup-idempotency', '0 * * * *',
--     'DELETE FROM idempotency_records WHERE created_at < NOW() - INTERVAL ''24 hours''');

-- ── Image CDN Metadata ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS image_cdn_metadata (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_key    TEXT        NOT NULL UNIQUE,
  cloudflare_id   TEXT,
  width           INTEGER,
  height          INTEGER,
  format          TEXT,
  file_size_bytes BIGINT,
  blurhash        TEXT,
  dominant_color  TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_cdn_original_key ON image_cdn_metadata (original_key);
CREATE INDEX IF NOT EXISTS idx_image_cdn_cloudflare_id ON image_cdn_metadata (cloudflare_id);

-- ── Property Image Ordering ───────────────────────────────────────────────
-- Allows drag-and-drop reordering of property images

ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS image_order JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS primary_image_key TEXT;

-- ── Cursor Pagination Helpers ─────────────────────────────────────────────
-- Add created_at indexes to all major tables for efficient cursor pagination

CREATE INDEX IF NOT EXISTS idx_properties_created_at   ON properties (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at         ON users (created_at DESC);
