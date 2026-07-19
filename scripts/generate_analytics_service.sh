#!/bin/bash

set -e

BASE="/home/ubuntu/realestate-platform/services/analytics-service"
mkdir -p "$BASE"/{app,models,database,analytics,streaming,api,config,k8s,clickhouse/schemas}

cd "$BASE"

echo "Generating Analytics Service..."

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
clickhouse-driver==0.2.6
kafka-python==2.0.2
redis==5.0.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
pandas==2.1.3
numpy==1.26.2
httpx==0.25.2
prometheus-client==0.19.0
EOF

# Create main application
cat > app/main.py << 'EOFMAIN'
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .database import clickhouse_client
from .api import analytics_router
from .streaming import kafka_consumer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Analytics Service starting up...")
    # Initialize ClickHouse connection
    clickhouse_client.connect()
    # Start Kafka consumer in background
    # kafka_consumer.start()
    yield
    logger.info("Analytics Service shutting down...")
    clickhouse_client.disconnect()

app = FastAPI(
    title="Real Estate Analytics Service",
    description="Advanced analytics with ClickHouse",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["analytics"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analytics"}
EOFMAIN

# Create models
cat > models/__init__.py << 'EOF'
from .analytics import *
EOF

cat > models/analytics.py << 'EOFMODELS'
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class PropertyView(BaseModel):
    property_id: str
    user_id: Optional[str] = None
    session_id: str
    timestamp: datetime
    duration_seconds: int
    source: str
    device_type: str

class UserEvent(BaseModel):
    event_type: str
    user_id: Optional[str] = None
    session_id: str
    timestamp: datetime
    properties: dict
    page_url: str
    referrer: Optional[str] = None

class PropertyViewAnalytics(BaseModel):
    property_id: str
    total_views: int
    unique_users: int
    avg_duration: float
    conversion_rate: float

class MarketTrend(BaseModel):
    date: str
    avg_price: float
    total_listings: int
    total_views: int
    total_transactions: int

class ConversionFunnel(BaseModel):
    stage: str
    count: int
    conversion_rate: float
EOFMODELS

# Create ClickHouse database module
cat > database/__init__.py << 'EOF'
from .clickhouse import clickhouse_client
EOF

cat > database/clickhouse.py << 'EOFCH'
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
EOFCH

# Create analytics module
cat > analytics/__init__.py << 'EOF'
from .property_analytics import PropertyAnalytics
from .market_analytics import MarketAnalytics
from .user_analytics import UserAnalytics
EOF

cat > analytics/property_analytics.py << 'EOFPROP'
from database import clickhouse_client
from datetime import datetime, timedelta
from typing import List

class PropertyAnalytics:
    @staticmethod
    def get_property_views(property_id: str, days: int = 30):
        query = """
            SELECT
                count(*) as total_views,
                uniq(user_id) as unique_users,
                avg(duration_seconds) as avg_duration
            FROM property_views
            WHERE property_id = %(property_id)s
            AND date >= today() - %(days)s
        """
        result = clickhouse_client.execute(query, {
            'property_id': property_id,
            'days': days
        })
        return result[0] if result else (0, 0, 0)

    @staticmethod
    def get_top_properties(limit: int = 10, days: int = 7):
        query = """
            SELECT
                property_id,
                count(*) as view_count,
                uniq(user_id) as unique_users
            FROM property_views
            WHERE date >= today() - %(days)s
            GROUP BY property_id
            ORDER BY view_count DESC
            LIMIT %(limit)s
        """
        return clickhouse_client.execute(query, {
            'days': days,
            'limit': limit
        })

    @staticmethod
    def get_property_trends(property_id: str, days: int = 30):
        query = """
            SELECT
                toDate(timestamp) as date,
                count(*) as views,
                uniq(user_id) as unique_users
            FROM property_views
            WHERE property_id = %(property_id)s
            AND date >= today() - %(days)s
            GROUP BY date
            ORDER BY date
        """
        return clickhouse_client.execute(query, {
            'property_id': property_id,
            'days': days
        })
EOFPROP

cat > analytics/market_analytics.py << 'EOFMARKET'
from database import clickhouse_client

class MarketAnalytics:
    @staticmethod
    def get_market_trends(city: str = None, days: int = 30):
        query = """
            SELECT
                date,
                avg(avg_price) as avg_price,
                sum(total_listings) as total_listings,
                sum(total_views) as total_views,
                sum(total_transactions) as total_transactions
            FROM market_metrics
            WHERE date >= today() - %(days)s
        """
        params = {'days': days}
        
        if city:
            query += " AND city = %(city)s"
            params['city'] = city
            
        query += " GROUP BY date ORDER BY date"
        
        return clickhouse_client.execute(query, params)

    @staticmethod
    def get_price_distribution(property_type: str = None):
        query = """
            SELECT
                quantile(0.25)(avg_price) as q25,
                quantile(0.50)(avg_price) as median,
                quantile(0.75)(avg_price) as q75,
                avg(avg_price) as mean
            FROM market_metrics
            WHERE date >= today() - 30
        """
        params = {}
        
        if property_type:
            query += " AND property_type = %(property_type)s"
            params['property_type'] = property_type
            
        result = clickhouse_client.execute(query, params)
        return result[0] if result else (0, 0, 0, 0)
EOFMARKET

cat > analytics/user_analytics.py << 'EOFUSER'
from database import clickhouse_client

class UserAnalytics:
    @staticmethod
    def get_user_journey(user_id: str, days: int = 30):
        query = """
            SELECT
                event_type,
                timestamp,
                page_url,
                properties
            FROM user_events
            WHERE user_id = %(user_id)s
            AND date >= today() - %(days)s
            ORDER BY timestamp
        """
        return clickhouse_client.execute(query, {
            'user_id': user_id,
            'days': days
        })

    @staticmethod
    def get_conversion_funnel(days: int = 30):
        query = """
            SELECT
                event_type,
                count(*) as count
            FROM user_events
            WHERE date >= today() - %(days)s
            AND event_type IN ('page_view', 'property_view', 'inquiry', 'application', 'transaction')
            GROUP BY event_type
        """
        return clickhouse_client.execute(query, {'days': days})
EOFUSER

# Create API endpoints
cat > api/__init__.py << 'EOF'
from .analytics_api import router as analytics_router
EOF

cat > api/analytics_api.py << 'EOFAPI'
from fastapi import APIRouter, Query
from typing import Optional
from analytics import PropertyAnalytics, MarketAnalytics, UserAnalytics

router = APIRouter()

@router.get("/properties/{property_id}/views")
async def get_property_views(
    property_id: str,
    days: int = Query(30, ge=1, le=365)
):
    total_views, unique_users, avg_duration = PropertyAnalytics.get_property_views(property_id, days)
    return {
        "property_id": property_id,
        "total_views": total_views,
        "unique_users": unique_users,
        "avg_duration": avg_duration
    }

@router.get("/properties/top")
async def get_top_properties(
    limit: int = Query(10, ge=1, le=100),
    days: int = Query(7, ge=1, le=365)
):
    results = PropertyAnalytics.get_top_properties(limit, days)
    return [
        {
            "property_id": row[0],
            "view_count": row[1],
            "unique_users": row[2]
        }
        for row in results
    ]

@router.get("/market/trends")
async def get_market_trends(
    city: Optional[str] = None,
    days: int = Query(30, ge=1, le=365)
):
    results = MarketAnalytics.get_market_trends(city, days)
    return [
        {
            "date": str(row[0]),
            "avg_price": row[1],
            "total_listings": row[2],
            "total_views": row[3],
            "total_transactions": row[4]
        }
        for row in results
    ]

@router.get("/users/{user_id}/journey")
async def get_user_journey(
    user_id: str,
    days: int = Query(30, ge=1, le=365)
):
    results = UserAnalytics.get_user_journey(user_id, days)
    return [
        {
            "event_type": row[0],
            "timestamp": str(row[1]),
            "page_url": row[2],
            "properties": row[3]
        }
        for row in results
    ]

@router.get("/conversion/funnel")
async def get_conversion_funnel(days: int = Query(30, ge=1, le=365)):
    results = UserAnalytics.get_conversion_funnel(days)
    total = sum(row[1] for row in results) if results else 1
    
    return [
        {
            "stage": row[0],
            "count": row[1],
            "conversion_rate": (row[1] / total) * 100
        }
        for row in results
    ]
EOFAPI

# Create streaming module
cat > streaming/__init__.py << 'EOF'
from .kafka_consumer import KafkaConsumer
EOF

cat > streaming/kafka_consumer.py << 'EOFKAFKA'
from kafka import KafkaConsumer as Consumer
import json
import os
import logging
from database import clickhouse_client

logger = logging.getLogger(__name__)

class KafkaConsumer:
    def __init__(self):
        self.brokers = os.getenv("KAFKA_BROKERS", "localhost:9092").split(",")
        self.consumer = None

    def start(self):
        self.consumer = Consumer(
            'property.views',
            'user.events',
            bootstrap_servers=self.brokers,
            group_id='analytics-service',
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )

        logger.info("Kafka consumer started")

        for message in self.consumer:
            try:
                self.process_message(message)
            except Exception as e:
                logger.error(f"Error processing message: {e}")

    def process_message(self, message):
        topic = message.topic
        data = message.value

        if topic == 'property.views':
            self.process_property_view(data)
        elif topic == 'user.events':
            self.process_user_event(data)

    def process_property_view(self, data):
        clickhouse_client.insert('property_views', [(
            data['property_id'],
            data.get('user_id'),
            data['session_id'],
            data['timestamp'],
            data['duration_seconds'],
            data['source'],
            data['device_type']
        )])

    def process_user_event(self, data):
        clickhouse_client.insert('user_events', [(
            data['event_type'],
            data.get('user_id'),
            data['session_id'],
            data['timestamp'],
            json.dumps(data.get('properties', {})),
            data['page_url'],
            data.get('referrer')
        )])

kafka_consumer = KafkaConsumer()
EOFKAFKA

# Create Dockerfile
cat > Dockerfile << 'EOFDOCKER'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
EOFDOCKER

# Create docker-compose.yml
cat > docker-compose.yml << 'EOFCOMPOSE'
version: '3.8'

services:
  analytics-service:
    build: .
    ports:
      - "8001:8001"
    environment:
      - CLICKHOUSE_HOST=clickhouse
      - CLICKHOUSE_PORT=9000
      - CLICKHOUSE_DB=analytics
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - clickhouse
      - kafka
    networks:
      - analytics-network

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"
      - "9000:9000"
    environment:
      - CLICKHOUSE_DB=analytics
      - CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1
    volumes:
      - clickhouse-data:/var/lib/clickhouse
    networks:
      - analytics-network

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    networks:
      - analytics-network

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9096:9096"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:9096
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    networks:
      - analytics-network

networks:
  analytics-network:
    driver: bridge

volumes:
  clickhouse-data:
EOFCOMPOSE

# Create Kubernetes deployment
mkdir -p k8s
cat > k8s/deployment.yaml << 'EOFK8S'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-service
  namespace: realestate
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics-service
  template:
    metadata:
      labels:
        app: analytics-service
    spec:
      containers:
      - name: analytics-service
        image: realestate/analytics-service:latest
        ports:
        - containerPort: 8001
        env:
        - name: CLICKHOUSE_HOST
          value: "clickhouse-service"
        - name: CLICKHOUSE_PORT
          value: "9000"
        - name: CLICKHOUSE_DB
          value: "analytics"
        - name: KAFKA_BROKERS
          value: "kafka-service:9092"
        resources:
          requests:
            memory: "512Mi"
            cpu: "300m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-service
  namespace: realestate
spec:
  type: ClusterIP
  ports:
  - port: 8001
    targetPort: 8001
  selector:
    app: analytics-service
EOFK8S

echo "✓ Analytics Service complete"
echo "Files created:"
echo "  - FastAPI application"
echo "  - ClickHouse integration"
echo "  - Property analytics"
echo "  - Market analytics"
echo "  - User analytics"
echo "  - Kafka consumer"
echo "  - API endpoints"
echo "  - Docker & Kubernetes configs"

