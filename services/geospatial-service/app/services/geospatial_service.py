from typing import List, Optional, Tuple
import h3
from shapely.geometry import Point as ShapelyPoint, Polygon as ShapelyPolygon, box
from shapely import wkt
from geopandas import GeoDataFrame
import pandas as pd
from sqlalchemy import create_engine, text
from redis import Redis
import json

from app.models.geospatial import (
    Point, Polygon, BoundingBox, PropertyLocation,
    NearbySearchRequest, PolygonSearchRequest, BoundingBoxSearchRequest,
    HeatmapRequest, HeatmapCell, HeatmapResponse,
    ProximityAnalysisRequest, Amenity, ProximityAnalysisResponse,
    ClusterRequest, PropertyCluster, ClusterResponse,
    GeocodeRequest, GeocodeResponse,
    ReverseGeocodeRequest, ReverseGeocodeResponse
)
from app.core.config import settings


class GeospatialService:
    def __init__(self):
        self.engine = create_engine(settings.DATABASE_URL)
        self.redis = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
            db=settings.REDIS_DB,
            decode_responses=True
        )
    
    def _point_to_shapely(self, point: Point) -> ShapelyPoint:
        """Convert Point model to Shapely Point"""
        return ShapelyPoint(point.lng, point.lat)
    
    def _polygon_to_shapely(self, polygon: Polygon) -> ShapelyPolygon:
        """Convert Polygon model to Shapely Polygon"""
        coords = [(p.lng, p.lat) for p in polygon.points]
        return ShapelyPolygon(coords)
    
    def _shapely_to_point(self, point: ShapelyPoint) -> Point:
        """Convert Shapely Point to Point model"""
        return Point(lat=point.y, lng=point.x)
    
    def calculate_h3_index(self, point: Point, resolution: int = None) -> str:
        """Calculate H3 index for a point"""
        res = resolution or settings.H3_RESOLUTION
        return h3.geo_to_h3(point.lat, point.lng, res)
    
    def get_h3_neighbors(self, h3_index: str, k: int = 1) -> List[str]:
        """Get neighboring H3 cells"""
        return list(h3.k_ring(h3_index, k))
    
    async def search_nearby(self, request: NearbySearchRequest) -> List[PropertyLocation]:
        """Search for properties within a radius"""
        # Check cache
        cache_key = f"nearby:{request.center.lat}:{request.center.lng}:{request.radius_km}"
        cached = self.redis.get(cache_key)
        if cached:
            return [PropertyLocation(**p) for p in json.loads(cached)]
        
        # Query database using PostGIS
        query = text("""
            SELECT 
                p.id as property_id,
                ST_Y(p.location::geometry) as lat,
                ST_X(p.location::geometry) as lng,
                p.address,
                p.city,
                p.state,
                p.country,
                p.postal_code,
                ST_Distance(
                    p.location::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                ) / 1000 as distance_km
            FROM properties p
            WHERE ST_DWithin(
                p.location::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius_m
            )
            AND p.status = 'active'
            ORDER BY distance_km
            LIMIT :limit
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(
                query,
                {
                    "lat": request.center.lat,
                    "lng": request.center.lng,
                    "radius_m": request.radius_km * 1000,
                    "limit": request.limit
                }
            )
            
            properties = []
            for row in result:
                prop = PropertyLocation(
                    property_id=row.property_id,
                    location=Point(lat=row.lat, lng=row.lng),
                    address=row.address,
                    city=row.city,
                    state=row.state,
                    country=row.country,
                    postal_code=row.postal_code,
                    h3_index=self.calculate_h3_index(Point(lat=row.lat, lng=row.lng))
                )
                properties.append(prop)
        
        # Cache results
        self.redis.setex(cache_key, 300, json.dumps([p.dict() for p in properties]))
        
        return properties
    
    async def search_polygon(self, request: PolygonSearchRequest) -> List[PropertyLocation]:
        """Search for properties within a polygon"""
        polygon = self._polygon_to_shapely(request.polygon)
        wkt_polygon = polygon.wkt
        
        query = text("""
            SELECT 
                p.id as property_id,
                ST_Y(p.location::geometry) as lat,
                ST_X(p.location::geometry) as lng,
                p.address,
                p.city,
                p.state,
                p.country,
                p.postal_code
            FROM properties p
            WHERE ST_Within(
                p.location::geometry,
                ST_GeomFromText(:polygon, 4326)
            )
            AND p.status = 'active'
            LIMIT :limit
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(
                query,
                {"polygon": wkt_polygon, "limit": request.limit}
            )
            
            properties = []
            for row in result:
                prop = PropertyLocation(
                    property_id=row.property_id,
                    location=Point(lat=row.lat, lng=row.lng),
                    address=row.address,
                    city=row.city,
                    state=row.state,
                    country=row.country,
                    postal_code=row.postal_code,
                    h3_index=self.calculate_h3_index(Point(lat=row.lat, lng=row.lng))
                )
                properties.append(prop)
        
        return properties
    
    async def search_bbox(self, request: BoundingBoxSearchRequest) -> List[PropertyLocation]:
        """Search for properties within a bounding box"""
        query = text("""
            SELECT 
                p.id as property_id,
                ST_Y(p.location::geometry) as lat,
                ST_X(p.location::geometry) as lng,
                p.address,
                p.city,
                p.state,
                p.country,
                p.postal_code
            FROM properties p
            WHERE p.location::geometry && ST_MakeEnvelope(
                :min_lng, :min_lat, :max_lng, :max_lat, 4326
            )
            AND p.status = 'active'
            LIMIT :limit
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(
                query,
                {
                    "min_lat": request.bbox.min_lat,
                    "max_lat": request.bbox.max_lat,
                    "min_lng": request.bbox.min_lng,
                    "max_lng": request.bbox.max_lng,
                    "limit": request.limit
                }
            )
            
            properties = []
            for row in result:
                prop = PropertyLocation(
                    property_id=row.property_id,
                    location=Point(lat=row.lat, lng=row.lng),
                    address=row.address,
                    city=row.city,
                    state=row.state,
                    country=row.country,
                    postal_code=row.postal_code,
                    h3_index=self.calculate_h3_index(Point(lat=row.lat, lng=row.lng))
                )
                properties.append(prop)
        
        return properties
    
    async def generate_heatmap(self, request: HeatmapRequest) -> HeatmapResponse:
        """Generate property heatmap using H3 hexagons"""
        query = text("""
            SELECT 
                ST_Y(p.location::geometry) as lat,
                ST_X(p.location::geometry) as lng,
                p.price
            FROM properties p
            WHERE p.location::geometry && ST_MakeEnvelope(
                :min_lng, :min_lat, :max_lng, :max_lat, 4326
            )
            AND p.status = 'active'
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(
                query,
                {
                    "min_lat": request.bbox.min_lat,
                    "max_lat": request.bbox.max_lat,
                    "min_lng": request.bbox.min_lng,
                    "max_lng": request.bbox.max_lng
                }
            )
            
            # Group properties by H3 index
            h3_data = {}
            for row in result:
                h3_index = h3.geo_to_h3(row.lat, row.lng, request.resolution)
                if h3_index not in h3_data:
                    h3_data[h3_index] = {"prices": [], "count": 0}
                h3_data[h3_index]["prices"].append(row.price)
                h3_data[h3_index]["count"] += 1
            
            # Calculate metrics for each cell
            cells = []
            all_values = []
            
            for h3_index, data in h3_data.items():
                if request.metric == "price":
                    value = sum(data["prices"]) / len(data["prices"])
                elif request.metric == "density":
                    value = data["count"]
                else:
                    value = data["count"]
                
                all_values.append(value)
                
                # Get cell center
                lat, lng = h3.h3_to_geo(h3_index)
                
                cell = HeatmapCell(
                    h3_index=h3_index,
                    value=value,
                    count=data["count"],
                    center=Point(lat=lat, lng=lng)
                )
                cells.append(cell)
        
        return HeatmapResponse(
            cells=cells,
            min_value=min(all_values) if all_values else 0,
            max_value=max(all_values) if all_values else 0,
            total_properties=sum(c.count for c in cells)
        )
    
    async def cluster_properties(self, request: ClusterRequest) -> ClusterResponse:
        """Cluster properties using H3 hexagons"""
        # Determine H3 resolution based on zoom level
        resolution = min(15, max(0, request.zoom_level - 5))
        
        query = text("""
            SELECT 
                p.id as property_id,
                ST_Y(p.location::geometry) as lat,
                ST_X(p.location::geometry) as lng,
                p.price
            FROM properties p
            WHERE p.location::geometry && ST_MakeEnvelope(
                :min_lng, :min_lat, :max_lng, :max_lat, 4326
            )
            AND p.status = 'active'
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(
                query,
                {
                    "min_lat": request.bbox.min_lat,
                    "max_lat": request.bbox.max_lat,
                    "min_lng": request.bbox.min_lng,
                    "max_lng": request.bbox.max_lng
                }
            )
            
            # Group by H3 index
            clusters_data = {}
            total_properties = 0
            
            for row in result:
                h3_index = h3.geo_to_h3(row.lat, row.lng, resolution)
                if h3_index not in clusters_data:
                    clusters_data[h3_index] = {
                        "properties": [],
                        "prices": []
                    }
                clusters_data[h3_index]["properties"].append(row.property_id)
                clusters_data[h3_index]["prices"].append(row.price)
                total_properties += 1
            
            # Create cluster objects
            clusters = []
            for h3_index, data in clusters_data.items():
                lat, lng = h3.h3_to_geo(h3_index)
                avg_price = sum(data["prices"]) / len(data["prices"]) if data["prices"] else None
                
                cluster = PropertyCluster(
                    cluster_id=h3_index,
                    center=Point(lat=lat, lng=lng),
                    property_count=len(data["properties"]),
                    avg_price=avg_price,
                    properties=data["properties"][:10]  # Limit to first 10
                )
                clusters.append(cluster)
        
        return ClusterResponse(
            clusters=clusters,
            total_properties=total_properties
        )
