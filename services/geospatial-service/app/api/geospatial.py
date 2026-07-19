from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.models.geospatial import (
    NearbySearchRequest, PolygonSearchRequest, BoundingBoxSearchRequest,
    PropertyLocation, HeatmapRequest, HeatmapResponse,
    ClusterRequest, ClusterResponse,
    ProximityAnalysisRequest, ProximityAnalysisResponse,
    GeocodeRequest, GeocodeResponse,
    ReverseGeocodeRequest, ReverseGeocodeResponse,
    Point
)
from app.services.geospatial_service import GeospatialService

router = APIRouter(prefix="/api/v1/geospatial", tags=["geospatial"])

def get_geospatial_service() -> GeospatialService:
    return GeospatialService()


@router.post("/search/nearby", response_model=List[PropertyLocation])
async def search_nearby(
    request: NearbySearchRequest,
    service: GeospatialService = Depends(get_geospatial_service)
):
    """
    Search for properties within a radius of a point.
    
    - **center**: Center point for the search
    - **radius_km**: Search radius in kilometers (max 100km)
    - **limit**: Maximum number of results (max 100)
    """
    try:
        return await service.search_nearby(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/polygon", response_model=List[PropertyLocation])
async def search_polygon(
    request: PolygonSearchRequest,
    service: GeospatialService = Depends(get_geospatial_service)
):
    """
    Search for properties within a custom polygon.
    
    - **polygon**: Polygon defined by a list of points
    - **limit**: Maximum number of results
    """
    try:
        return await service.search_polygon(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/bbox", response_model=List[PropertyLocation])
async def search_bbox(
    request: BoundingBoxSearchRequest,
    service: GeospatialService = Depends(get_geospatial_service)
):
    """
    Search for properties within a bounding box.
    
    - **bbox**: Bounding box coordinates
    - **limit**: Maximum number of results
    """
    try:
        return await service.search_bbox(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/heatmap", response_model=HeatmapResponse)
async def generate_heatmap(
    request: HeatmapRequest,
    service: GeospatialService = Depends(get_geospatial_service)
):
    """
    Generate property heatmap using H3 hexagons.
    
    - **bbox**: Bounding box for the heatmap
    - **metric**: Metric to visualize (price, density, appreciation)
    - **resolution**: H3 resolution level (5-12)
    """
    try:
        return await service.generate_heatmap(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cluster", response_model=ClusterResponse)
async def cluster_properties(
    request: ClusterRequest,
    service: GeospatialService = Depends(get_geospatial_service)
):
    """
    Cluster properties for map visualization.
    
    - **bbox**: Bounding box for clustering
    - **zoom_level**: Map zoom level (affects cluster size)
    """
    try:
        return await service.cluster_properties(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/h3/{lat}/{lng}/{resolution}", response_model=dict)
async def get_h3_index(
    lat: float,
    lng: float,
    resolution: int = 9,
    service: GeospatialService = Depends(get_geospatial_service)
):
    """
    Get H3 index for a location.
    
    - **lat**: Latitude
    - **lng**: Longitude
    - **resolution**: H3 resolution level (default: 9)
    """
    try:
        point = Point(lat=lat, lng=lng)
        h3_index = service.calculate_h3_index(point, resolution)
        neighbors = service.get_h3_neighbors(h3_index, k=1)
        
        return {
            "h3_index": h3_index,
            "resolution": resolution,
            "neighbors": neighbors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "geospatial"}


@router.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    return {"status": "ready", "service": "geospatial"}
