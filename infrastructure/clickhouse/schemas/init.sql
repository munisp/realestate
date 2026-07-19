-- Analytics tables
CREATE DATABASE IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.property_views (
    property_id String,
    user_id Nullable(String),
    session_id String,
    timestamp DateTime,
    duration_seconds UInt32,
    source String,
    device_type String,
    date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (property_id, timestamp);

CREATE TABLE IF NOT EXISTS analytics.user_events (
    event_type String,
    user_id Nullable(String),
    session_id String,
    timestamp DateTime,
    properties String,
    page_url String,
    referrer Nullable(String),
    date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (event_type, timestamp);

CREATE TABLE IF NOT EXISTS analytics.market_metrics (
    date Date,
    city String,
    property_type String,
    avg_price Float64,
    total_listings UInt32,
    total_views UInt32,
    total_transactions UInt32
) ENGINE = MergeTree()
ORDER BY (date, city, property_type);
