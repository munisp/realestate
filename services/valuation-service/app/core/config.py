from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    app_name: str = "Valuation Service"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/realestate"
    
    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0
    
    # Kafka
    kafka_brokers: List[str] = ["localhost:9092"]
    kafka_topic: str = "valuation-events"
    kafka_group_id: str = "valuation-service"
    
    # Ray
    ray_address: str = "auto"
    ray_namespace: str = "valuation"
    
    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"
    mlflow_experiment_name: str = "property-valuation"
    
    # Model
    model_path: str = "./models"
    model_version: str = "v1.0.0"
    
    # Valuation
    max_comparable_distance_km: float = 10.0
    min_comparable_properties: int = 3
    max_comparable_properties: int = 10
    confidence_threshold: float = 0.7
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
