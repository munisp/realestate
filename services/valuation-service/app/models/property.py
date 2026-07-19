from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID


class PropertyFeatures(BaseModel):
    """Property features for valuation"""
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    square_feet: Optional[int] = None
    lot_size: Optional[int] = None
    year_built: Optional[int] = None
    parking: Optional[int] = None
    features: Optional[List[str]] = []
    amenities: Optional[List[str]] = []


class PropertyLocation(BaseModel):
    """Property location information"""
    latitude: float
    longitude: float
    city: str
    state: str
    postal_code: str
    country: str


class ValuationRequest(BaseModel):
    """Request for property valuation"""
    property_id: Optional[UUID] = None
    property_type: str
    location: PropertyLocation
    features: PropertyFeatures
    comparable_properties: Optional[List[UUID]] = []


class ValuationResult(BaseModel):
    """Valuation result"""
    property_id: Optional[UUID] = None
    estimated_value: float
    confidence_score: float
    value_range_low: float
    value_range_high: float
    comparable_sales: List[dict] = []
    market_trends: dict = {}
    valuation_date: datetime = Field(default_factory=datetime.utcnow)
    model_version: str


class ComparableProperty(BaseModel):
    """Comparable property for CMA"""
    property_id: UUID
    address: str
    sale_price: float
    sale_date: datetime
    distance_km: float
    similarity_score: float
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    square_feet: Optional[int]


class MarketTrends(BaseModel):
    """Market trends analysis"""
    area: str
    median_price: float
    price_change_1m: float
    price_change_3m: float
    price_change_1y: float
    inventory_level: str
    days_on_market: int
    price_per_sqft: float
