from typing import List, Optional, Tuple
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class Point(BaseModel):
    """Geographic point with latitude and longitude"""
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")


class BoundingBox(BaseModel):
    """Geographic bounding box"""
    min_lat: float = Field(..., ge=-90, le=90)
    max_lat: float = Field(..., ge=-90, le=90)
    min_lng: float = Field(..., ge=-180, le=180)
    max_lng: float = Field(..., ge=-180, le=180)


class Polygon(BaseModel):
    """Geographic polygon defined by a list of points"""
    points: List[Point] = Field(..., min_length=3, description="List of points forming the polygon")


class Circle(BaseModel):
    """Geographic circle defined by center and radius"""
    center: Point
    radius_km: float = Field(..., gt=0, description="Radius in kilometers")


class PropertyLocation(BaseModel):
    """Property location with geospatial data"""
    property_id: UUID
    location: Point
    address: str
    city: str
    state: str
    country: str
    postal_code: str
    geohash: Optional[str] = None
    h3_index: Optional[str] = None


class NearbySearchRequest(BaseModel):
    """Request for nearby property search"""
    center: Point
    radius_km: float = Field(..., gt=0, le=100, description="Search radius in kilometers")
    limit: int = Field(default=20, ge=1, le=100)
    property_type: Optional[str] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None


class PolygonSearchRequest(BaseModel):
    """Request for polygon-based property search"""
    polygon: Polygon
    limit: int = Field(default=20, ge=1, le=100)
    property_type: Optional[str] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None


class BoundingBoxSearchRequest(BaseModel):
    """Request for bounding box property search"""
    bbox: BoundingBox
    limit: int = Field(default=20, ge=1, le=100)
    property_type: Optional[str] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None


class RouteRequest(BaseModel):
    """Request for route calculation"""
    origin: Point
    destination: Point
    mode: str = Field(default="driving", description="Transportation mode: driving, walking, transit")


class RouteResponse(BaseModel):
    """Response for route calculation"""
    distance_km: float
    duration_minutes: float
    polyline: str
    steps: List[dict]


class HeatmapRequest(BaseModel):
    """Request for property heatmap generation"""
    bbox: BoundingBox
    metric: str = Field(default="price", description="Metric to visualize: price, density, appreciation")
    resolution: int = Field(default=8, ge=5, le=12, description="H3 resolution level")


class HeatmapCell(BaseModel):
    """Heatmap cell data"""
    h3_index: str
    value: float
    count: int
    center: Point


class HeatmapResponse(BaseModel):
    """Response for heatmap generation"""
    cells: List[HeatmapCell]
    min_value: float
    max_value: float
    total_properties: int


class ProximityAnalysisRequest(BaseModel):
    """Request for proximity analysis"""
    location: Point
    amenity_types: List[str] = Field(..., description="Types of amenities: school, hospital, park, etc.")
    radius_km: float = Field(default=5.0, gt=0, le=50)


class Amenity(BaseModel):
    """Amenity location"""
    name: str
    type: str
    location: Point
    distance_km: float


class ProximityAnalysisResponse(BaseModel):
    """Response for proximity analysis"""
    amenities: List[Amenity]
    total_count: int
    average_distance_km: float


class ClusterRequest(BaseModel):
    """Request for property clustering"""
    bbox: BoundingBox
    zoom_level: int = Field(default=10, ge=1, le=20)


class PropertyCluster(BaseModel):
    """Property cluster"""
    cluster_id: str
    center: Point
    property_count: int
    avg_price: Optional[float] = None
    properties: Optional[List[UUID]] = None


class ClusterResponse(BaseModel):
    """Response for property clustering"""
    clusters: List[PropertyCluster]
    total_properties: int


class GeocodeRequest(BaseModel):
    """Request for geocoding"""
    address: str


class GeocodeResponse(BaseModel):
    """Response for geocoding"""
    location: Point
    formatted_address: str
    address_components: dict


class ReverseGeocodeRequest(BaseModel):
    """Request for reverse geocoding"""
    location: Point


class ReverseGeocodeResponse(BaseModel):
    """Response for reverse geocoding"""
    formatted_address: str
    address_components: dict


class IsochroneRequest(BaseModel):
    """Request for isochrone generation"""
    center: Point
    time_minutes: int = Field(..., gt=0, le=120, description="Travel time in minutes")
    mode: str = Field(default="driving", description="Transportation mode")


class IsochroneResponse(BaseModel):
    """Response for isochrone generation"""
    polygon: Polygon
    time_minutes: int
    area_km2: float
