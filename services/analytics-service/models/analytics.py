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
