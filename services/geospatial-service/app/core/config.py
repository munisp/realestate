from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Geospatial Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8083
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/realestate"
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    
    # Kafka
    KAFKA_BROKERS: List[str] = ["localhost:9092"]
    KAFKA_TOPIC: str = "geospatial-events"
    KAFKA_GROUP_ID: str = "geospatial-service"
    
    # Geospatial
    DEFAULT_SRID: int = 4326  # WGS84
    H3_RESOLUTION: int = 9
    MAX_SEARCH_RADIUS_KM: float = 100.0
    MAX_SEARCH_RESULTS: int = 1000
    
    # External APIs
    MAPBOX_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
