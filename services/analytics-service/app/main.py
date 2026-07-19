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
