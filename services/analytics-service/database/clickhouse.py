from clickhouse_driver import Client
import os
import logging

logger = logging.getLogger(__name__)

class ClickHouseClient:
    def __init__(self):
        self.client = None
        self.host = os.getenv("CLICKHOUSE_HOST", "localhost")
        self.port = int(os.getenv("CLICKHOUSE_PORT", "9000"))
        self.database = os.getenv("CLICKHOUSE_DB", "analytics")
        self.user = os.getenv("CLICKHOUSE_USER", "default")
        self.password = os.getenv("CLICKHOUSE_PASSWORD", "")

    def connect(self):
        try:
            self.client = Client(
                host=self.host,
                port=self.port,
                database=self.database,
                user=self.user,
                password=self.password
            )
            logger.info(f"Connected to ClickHouse at {self.host}:{self.port}")
            self.create_tables()
        except Exception as e:
            logger.error(f"Failed to connect to ClickHouse: {e}")
            raise

    def disconnect(self):
        if self.client:
            self.client.disconnect()

    def create_tables(self):
        # Property views table
        self.client.execute("""
            CREATE TABLE IF NOT EXISTS property_views (
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
            ORDER BY (property_id, timestamp)
        """)

        # User events table
        self.client.execute("""
            CREATE TABLE IF NOT EXISTS user_events (
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
            ORDER BY (event_type, timestamp)
        """)

        # Market metrics table
        self.client.execute("""
            CREATE TABLE IF NOT EXISTS market_metrics (
                date Date,
                city String,
                property_type String,
                avg_price Float64,
                total_listings UInt32,
                total_views UInt32,
                total_transactions UInt32
            ) ENGINE = MergeTree()
            ORDER BY (date, city, property_type)
        """)

        logger.info("ClickHouse tables created successfully")

    def execute(self, query, params=None):
        return self.client.execute(query, params)

    def insert(self, table, data):
        if not data:
            return
        self.client.execute(f"INSERT INTO {table} VALUES", data)

clickhouse_client = ClickHouseClient()
