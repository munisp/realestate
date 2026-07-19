"""
Hybrid Valuation API Endpoints
Exposes hybrid valuation model via FastAPI
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import logging

from app.ml.hybrid_model import get_hybrid_model, ModelPathway
from app.ml.confidence_scorer import get_confidence_scorer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hybrid-valuation", tags=["hybrid-valuation"])


# Request/Response Models

class PropertyDataRequest(BaseModel):
    """Property data for valuation"""
    id: Optional[str] = None
    latitude: float = Field(..., description="Property latitude")
    longitude: float = Field(..., description="Property longitude")
    city: str = Field(..., description="City name")
    state: str = Field(..., description="State name")
    type: str = Field(..., description="Property type (house, apartment, etc.)")
    size_sqm: Optional[float] = Field(None, description="Property size in square meters")
    bedrooms: Optional[int] = Field(None, description="Number of bedrooms")
    bathrooms: Optional[int] = Field(None, description="Number of bathrooms")
    base_price_per_sqm: Optional[float] = Field(200000, description="Base price per sqm in NGN")


class ValuationRequest(BaseModel):
    """Request for hybrid valuation"""
    property_data: PropertyDataRequest
    comparable_count: int = Field(0, description="Number of comparable properties available")
    transaction_history_count: int = Field(0, description="Number of historical transactions")
    market_volatility: float = Field(0.15, description="Market volatility (0-1)")


class DataSourceContributionResponse(BaseModel):
    """Data source contribution details"""
    source_name: str
    weight: float
    confidence: float
    value_contribution: float
    importance_rank: int


class ConfidenceBreakdownResponse(BaseModel):
    """Confidence breakdown details"""
    data_completeness_contribution: float
    model_accuracy_contribution: float
    comparable_quality_contribution: float
    satellite_confidence_contribution: float
    market_stability_contribution: float
    overall_confidence: float
    confidence_level: str
    limiting_factors: List[str]


class UncertaintyMetricsResponse(BaseModel):
    """Uncertainty metrics"""
    prediction_interval_lower: float
    prediction_interval_upper: float
    interval_width_percent: float
    standard_error: float
    coefficient_of_variation: float
    uncertainty_sources: Dict[str, float]


class DataCompletenessResponse(BaseModel):
    """Data completeness metrics"""
    comparable_sales_count: int
    comparable_sales_score: float
    transaction_history_count: int
    transaction_history_score: float
    satellite_data_available: bool
    satellite_data_score: float
    alternative_data_sources: int
    alternative_data_score: float
    overall_completeness: float
    quality_flag: str


class ConfidenceScoreResponse(BaseModel):
    """Complete confidence score result"""
    overall_confidence: float
    confidence_level: str
    data_completeness: DataCompletenessResponse
    confidence_breakdown: ConfidenceBreakdownResponse
    uncertainty_metrics: UncertaintyMetricsResponse
    data_source_contributions: List[DataSourceContributionResponse]
    quality_flags: List[str]
    recommendations: List[str]


class SatelliteAnalysisResponse(BaseModel):
    """Satellite analysis summary"""
    building_footprint_sqm: float
    estimated_height_m: float
    num_floors: int
    roof_material: str
    roof_condition: str
    building_density: float
    green_space_ratio: float
    road_access_quality: str
    confidence_score: float


class AlternativeDataResponse(BaseModel):
    """Alternative data summary"""
    data_completeness_score: float
    sources_used: List[str]
    has_economic_indicators: bool
    has_market_listing_data: bool
    has_neighborhood_quality: bool


class HybridValuationResponse(BaseModel):
    """Complete hybrid valuation response"""
    final_valuation: float
    confidence_score: float
    uncertainty_range: tuple[float, float]
    pathway_used: str
    data_availability_score: float
    
    # Detailed metrics
    confidence_details: ConfidenceScoreResponse
    satellite_analysis: Optional[SatelliteAnalysisResponse]
    alternative_data: Optional[AlternativeDataResponse]
    
    # Metadata
    model_version: str
    valuation_timestamp: str
    num_components: int
    component_methods: List[str]


# API Endpoints

@router.post("/value", response_model=HybridValuationResponse)
async def value_property(request: ValuationRequest):
    """
    Value a property using the hybrid valuation model
    
    This endpoint automatically selects the best valuation pathway based on
    data availability:
    - Data-Rich: Traditional ML with sufficient comparables
    - Data-Scarce: Satellite imagery + alternative data
    - Hybrid: Ensemble of both approaches
    """
    try:
        logger.info(f"Hybrid valuation request for property in {request.property_data.city}, {request.property_data.state}")
        
        # Get hybrid model
        hybrid_model = get_hybrid_model()
        
        # Convert request to property data dict
        property_data = request.property_data.model_dump()
        
        # Perform hybrid valuation
        valuation_result = await hybrid_model.value_property(
            property_data=property_data,
            comparable_count=request.comparable_count,
            transaction_history_count=request.transaction_history_count
        )
        
        # Calculate detailed confidence scores
        confidence_scorer = get_confidence_scorer()
        confidence_result = confidence_scorer.calculate_confidence(
            valuation_result=valuation_result,
            comparable_count=request.comparable_count,
            transaction_count=request.transaction_history_count,
            market_volatility=request.market_volatility
        )
        
        # Build response
        response = HybridValuationResponse(
            final_valuation=valuation_result.final_valuation,
            confidence_score=valuation_result.confidence_score,
            uncertainty_range=valuation_result.uncertainty_range,
            pathway_used=valuation_result.pathway_used.value,
            data_availability_score=valuation_result.data_availability.overall_score,
            
            # Confidence details
            confidence_details=ConfidenceScoreResponse(
                overall_confidence=confidence_result.overall_confidence,
                confidence_level=confidence_result.confidence_level.value,
                data_completeness=DataCompletenessResponse(
                    comparable_sales_count=confidence_result.data_completeness.comparable_sales_count,
                    comparable_sales_score=confidence_result.data_completeness.comparable_sales_score,
                    transaction_history_count=confidence_result.data_completeness.transaction_history_count,
                    transaction_history_score=confidence_result.data_completeness.transaction_history_score,
                    satellite_data_available=confidence_result.data_completeness.satellite_data_available,
                    satellite_data_score=confidence_result.data_completeness.satellite_data_score,
                    alternative_data_sources=confidence_result.data_completeness.alternative_data_sources,
                    alternative_data_score=confidence_result.data_completeness.alternative_data_score,
                    overall_completeness=confidence_result.data_completeness.overall_completeness,
                    quality_flag=confidence_result.data_completeness.quality_flag.value
                ),
                confidence_breakdown=ConfidenceBreakdownResponse(
                    data_completeness_contribution=confidence_result.confidence_breakdown.data_completeness_contribution,
                    model_accuracy_contribution=confidence_result.confidence_breakdown.model_accuracy_contribution,
                    comparable_quality_contribution=confidence_result.confidence_breakdown.comparable_quality_contribution,
                    satellite_confidence_contribution=confidence_result.confidence_breakdown.satellite_confidence_contribution,
                    market_stability_contribution=confidence_result.confidence_breakdown.market_stability_contribution,
                    overall_confidence=confidence_result.confidence_breakdown.overall_confidence,
                    confidence_level=confidence_result.confidence_breakdown.confidence_level.value,
                    limiting_factors=confidence_result.confidence_breakdown.limiting_factors
                ),
                uncertainty_metrics=UncertaintyMetricsResponse(
                    prediction_interval_lower=confidence_result.uncertainty_metrics.prediction_interval_lower,
                    prediction_interval_upper=confidence_result.uncertainty_metrics.prediction_interval_upper,
                    interval_width_percent=confidence_result.uncertainty_metrics.interval_width_percent,
                    standard_error=confidence_result.uncertainty_metrics.standard_error,
                    coefficient_of_variation=confidence_result.uncertainty_metrics.coefficient_of_variation,
                    uncertainty_sources=confidence_result.uncertainty_metrics.uncertainty_sources
                ),
                data_source_contributions=[
                    DataSourceContributionResponse(
                        source_name=contrib.source_name,
                        weight=contrib.weight,
                        confidence=contrib.confidence,
                        value_contribution=contrib.value_contribution,
                        importance_rank=contrib.importance_rank
                    )
                    for contrib in confidence_result.data_source_contributions
                ],
                quality_flags=confidence_result.quality_flags,
                recommendations=confidence_result.recommendations
            ),
            
            # Satellite analysis summary
            satellite_analysis=SatelliteAnalysisResponse(
                building_footprint_sqm=valuation_result.satellite_analysis.building_features.building_footprint_sqm,
                estimated_height_m=valuation_result.satellite_analysis.building_features.estimated_height_m,
                num_floors=valuation_result.satellite_analysis.building_features.num_floors,
                roof_material=valuation_result.satellite_analysis.building_features.roof_material,
                roof_condition=valuation_result.satellite_analysis.building_features.roof_condition,
                building_density=valuation_result.satellite_analysis.building_features.building_density,
                green_space_ratio=valuation_result.satellite_analysis.building_features.green_space_ratio,
                road_access_quality=valuation_result.satellite_analysis.building_features.road_access_quality,
                confidence_score=valuation_result.satellite_analysis.building_features.confidence_score
            ) if valuation_result.satellite_analysis else None,
            
            # Alternative data summary
            alternative_data=AlternativeDataResponse(
                data_completeness_score=valuation_result.alternative_data.data_completeness_score,
                sources_used=valuation_result.alternative_data.sources_used,
                has_economic_indicators=valuation_result.alternative_data.economic_indicators is not None,
                has_market_listing_data=valuation_result.alternative_data.market_listing_data is not None,
                has_neighborhood_quality=valuation_result.alternative_data.neighborhood_quality is not None
            ) if valuation_result.alternative_data else None,
            
            # Metadata
            model_version=valuation_result.metadata.get('model_version', '2.0-hybrid'),
            valuation_timestamp=valuation_result.metadata.get('valuation_date', ''),
            num_components=valuation_result.metadata.get('num_components', 0),
            component_methods=valuation_result.metadata.get('component_methods', [])
        )
        
        logger.info(f"Hybrid valuation completed: NGN {response.final_valuation:,.0f} "
                   f"(confidence: {response.confidence_score:.2%}, pathway: {response.pathway_used})")
        
        return response
        
    except Exception as e:
        logger.error(f"Hybrid valuation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Valuation failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "hybrid-valuation",
        "version": "2.0"
    }
