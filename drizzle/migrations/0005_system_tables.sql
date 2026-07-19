-- Migration: Add system tables (audit_logs, fluvio_events, app_versions)
-- Created: 2025-11-23

-- ==================== AUDIT LOGS ====================
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY,
  "userId" varchar(255),
  "action" varchar(100) NOT NULL,
  "resource" varchar(100) NOT NULL,
  "resourceId" varchar(255),
  "ipAddress" varchar(45),
  "userAgent" text,
  "metadata" jsonb,
  "success" boolean NOT NULL DEFAULT true,
  "errorMessage" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "audit_logs_user_idx" ON "audit_logs" ("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource");
CREATE INDEX IF NOT EXISTS "audit_logs_created_idx" ON "audit_logs" ("createdAt");

-- ==================== FLUVIO EVENTS ====================
CREATE TABLE IF NOT EXISTS "fluvio_events" (
  "id" serial PRIMARY KEY,
  "eventId" varchar(255) NOT NULL UNIQUE,
  "topic" varchar(255) NOT NULL,
  "partition" integer NOT NULL DEFAULT 0,
  "offset" integer,
  "payload" jsonb NOT NULL,
  "source" varchar(100),
  "status" varchar(50) NOT NULL DEFAULT 'published',
  "processedAt" timestamp,
  "errorMessage" text,
  "retryCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "fluvio_events_topic_idx" ON "fluvio_events" ("topic");
CREATE INDEX IF NOT EXISTS "fluvio_events_status_idx" ON "fluvio_events" ("status");
CREATE INDEX IF NOT EXISTS "fluvio_events_created_idx" ON "fluvio_events" ("createdAt");
CREATE INDEX IF NOT EXISTS "fluvio_events_event_id_idx" ON "fluvio_events" ("eventId");

-- ==================== APP VERSIONS ====================
CREATE TABLE IF NOT EXISTS "app_versions" (
  "id" serial PRIMARY KEY,
  "version" varchar(50) NOT NULL,
  "buildHash" varchar(64) NOT NULL,
  "environment" varchar(50) NOT NULL DEFAULT 'production',
  "deployedAt" timestamp DEFAULT now() NOT NULL,
  "deployedBy" varchar(255),
  "changelog" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "rollbackVersion" varchar(50),
  "metadata" jsonb,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "app_versions_version_idx" ON "app_versions" ("version");
CREATE INDEX IF NOT EXISTS "app_versions_active_idx" ON "app_versions" ("isActive");
CREATE INDEX IF NOT EXISTS "app_versions_deployed_idx" ON "app_versions" ("deployedAt");

-- ==================== GO SERVICE TABLES ====================
-- TigerBeetle escrow metadata
CREATE TABLE IF NOT EXISTS "go_tigerbeetle_escrows" (
  "escrow_id"            TEXT PRIMARY KEY,
  "escrow_account_id_lo" BIGINT NOT NULL DEFAULT 0,
  "escrow_account_id_hi" BIGINT NOT NULL DEFAULT 0,
  "buyer_id"             TEXT NOT NULL DEFAULT '',
  "buyer_account_id_lo"  BIGINT NOT NULL DEFAULT 0,
  "buyer_account_id_hi"  BIGINT NOT NULL DEFAULT 0,
  "seller_id"            TEXT NOT NULL DEFAULT '',
  "seller_account_id_lo" BIGINT NOT NULL DEFAULT 0,
  "seller_account_id_hi" BIGINT NOT NULL DEFAULT 0,
  "amount"               BIGINT NOT NULL DEFAULT 0,
  "currency"             TEXT NOT NULL DEFAULT 'NGN',
  "status"               TEXT NOT NULL DEFAULT 'pending',
  "hold_transfer_id_lo"  BIGINT NOT NULL DEFAULT 0,
  "hold_transfer_id_hi"  BIGINT NOT NULL DEFAULT 0,
  "metadata"             JSONB,
  "held_amount"          BIGINT NOT NULL DEFAULT 0,
  "released_amount"      BIGINT NOT NULL DEFAULT 0,
  "refunded_amount"      BIGINT NOT NULL DEFAULT 0,
  "held_at"              TIMESTAMPTZ,
  "released_at"          TIMESTAMPTZ,
  "refunded_at"          TIMESTAMPTZ,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_tb_escrow_buyer"   ON "go_tigerbeetle_escrows" ("buyer_id");
CREATE INDEX IF NOT EXISTS "idx_tb_escrow_seller"  ON "go_tigerbeetle_escrows" ("seller_id");
CREATE INDEX IF NOT EXISTS "idx_tb_escrow_status"  ON "go_tigerbeetle_escrows" ("status");

-- Mojaloop escrow metadata
CREATE TABLE IF NOT EXISTS "go_mojaloop_escrows" (
  "escrow_id"          TEXT PRIMARY KEY,
  "provider_escrow_id" TEXT NOT NULL DEFAULT '',
  "quote_id"           TEXT NOT NULL DEFAULT '',
  "transaction_id"     TEXT NOT NULL DEFAULT '',
  "transfer_id"        TEXT NOT NULL DEFAULT '',
  "amount"             BIGINT NOT NULL DEFAULT 0,
  "currency"           TEXT NOT NULL DEFAULT 'NGN',
  "buyer_id"           TEXT NOT NULL DEFAULT '',
  "seller_id"          TEXT NOT NULL DEFAULT '',
  "status"             TEXT NOT NULL DEFAULT 'pending',
  "condition"          TEXT NOT NULL DEFAULT '',
  "ilp_packet"         TEXT NOT NULL DEFAULT '',
  "metadata"           JSONB,
  "held_amount"        BIGINT NOT NULL DEFAULT 0,
  "released_amount"    BIGINT NOT NULL DEFAULT 0,
  "refunded_amount"    BIGINT NOT NULL DEFAULT 0,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_mojaloop_transfer"  ON "go_mojaloop_escrows" ("transfer_id");
CREATE INDEX IF NOT EXISTS "idx_mojaloop_buyer"     ON "go_mojaloop_escrows" ("buyer_id");
CREATE INDEX IF NOT EXISTS "idx_mojaloop_status"    ON "go_mojaloop_escrows" ("status");

-- Analytics tables
CREATE TABLE IF NOT EXISTS "go_property_analytics" (
  "id"           SERIAL PRIMARY KEY,
  "property_id"  TEXT NOT NULL,
  "event_type"   TEXT NOT NULL,
  "user_id"      TEXT,
  "session_id"   TEXT,
  "metadata"     JSONB,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_analytics_property" ON "go_property_analytics" ("property_id");
CREATE INDEX IF NOT EXISTS "idx_analytics_event"    ON "go_property_analytics" ("event_type");
CREATE INDEX IF NOT EXISTS "idx_analytics_created"  ON "go_property_analytics" ("created_at");

CREATE TABLE IF NOT EXISTS "go_market_trends" (
  "id"           SERIAL PRIMARY KEY,
  "location"     TEXT NOT NULL,
  "metric"       TEXT NOT NULL,
  "value"        DOUBLE PRECISION NOT NULL,
  "period"       TEXT NOT NULL,
  "metadata"     JSONB,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_market_trends_location" ON "go_market_trends" ("location");
CREATE INDEX IF NOT EXISTS "idx_market_trends_metric"   ON "go_market_trends" ("metric");
