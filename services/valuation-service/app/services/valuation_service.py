import logging
from datetime import datetime
from typing import List, Dict, Optional
from uuid import UUID

from app.models.property import (
    ValuationRequest,
    ValuationResult,
    ComparableProperty,
    MarketTrends
)
from app.ml.valuation_model import ValuationPredictor, ComparablePropertyMatcher
from app.core.config import settings

logger = logging.getLogger(__name__)


class ValuationService:
    """
    Service for property valuation using ML models and comparative market analysis
    """
    
    def __init__(self):
        self.predictor = ValuationPredictor(
            model_path=f"{settings.model_path}/valuation_model.pth",
            device="cpu"
        )
        self.comparable_matcher = ComparablePropertyMatcher(
            max_distance_km=settings.max_comparable_distance_km
        )
    
    async def valuate_property(self, request: ValuationRequest) -> ValuationResult:
        """
        Perform comprehensive property valuation
        
        Args:
            request: Valuation request with property details
        
        Returns:
            ValuationResult with estimated value and analysis
        """
        logger.info(f"Starting valuation for property {request.property_id}")
        
        # Prepare property data for ML model
        property_data = {
            'property_type': request.property_type,
            'latitude': request.location.latitude,
            'longitude': request.location.longitude,
            'city': request.location.city,
            'state': request.location.state,
            'bedrooms': request.features.bedrooms,
            'bathrooms': request.features.bathrooms,
            'square_feet': request.features.square_feet,
            'lot_size': request.features.lot_size,
            'year_built': request.features.year_built,
            'parking': request.features.parking,
        }
        
        # Get ML prediction
        ml_prediction = self.predictor.predict(property_data)
        
        # Get comparable properties (mock data for now)
        comparable_sales = await self._get_comparable_sales(request)
        
        # Get market trends
        market_trends = await self._get_market_trends(request.location)
        
        # Adjust ML prediction based on comparables and market trends
        adjusted_value = self._adjust_valuation(
            ml_prediction['estimated_value'],
            comparable_sales,
            market_trends
        )
        
        # Calculate final confidence score
        final_confidence = self._calculate_confidence(
            ml_prediction['confidence_score'],
            len(comparable_sales),
            market_trends
        )
        
        # Calculate value range
        uncertainty = (1.0 - final_confidence) * 0.15
        value_range_low = adjusted_value * (1.0 - uncertainty)
        value_range_high = adjusted_value * (1.0 + uncertainty)
        
        result = ValuationResult(
            property_id=request.property_id,
            estimated_value=adjusted_value,
            confidence_score=final_confidence,
            value_range_low=value_range_low,
            value_range_high=value_range_high,
            comparable_sales=[comp.dict() for comp in comparable_sales],
            market_trends=market_trends,
            valuation_date=datetime.utcnow(),
            model_version=settings.model_version
        )
        
        logger.info(f"Valuation complete: ${adjusted_value:,.2f} (confidence: {final_confidence:.2%})")
        
        return result
    
    async def _get_comparable_sales(self, request: ValuationRequest) -> List[ComparableProperty]:
        """
        Get comparable property sales for CMA
        
        In production, this would query the database for recent sales
        of similar properties in the area
        """
        # Mock comparable properties
        comparables = [
            ComparableProperty(
                property_id=UUID('12345678-1234-5678-1234-567812345678'),
                address="123 Main St",
                sale_price=450000,
                sale_date=datetime(2024, 10, 15),
                distance_km=0.8,
                similarity_score=0.92,
                bedrooms=request.features.bedrooms,
                bathrooms=request.features.bathrooms,
                square_feet=request.features.square_feet
            ),
            ComparableProperty(
                property_id=UUID('87654321-4321-8765-4321-876543218765'),
                address="456 Oak Ave",
                sale_price=475000,
                sale_date=datetime(2024, 11, 1),
                distance_km=1.2,
                similarity_score=0.88,
                bedrooms=request.features.bedrooms,
                bathrooms=request.features.bathrooms,
                square_feet=(request.features.square_feet or 2000) + 100
            ),
            ComparableProperty(
                property_id=UUID('11111111-2222-3333-4444-555555555555'),
                address="789 Elm St",
                sale_price=460000,
                sale_date=datetime(2024, 10, 20),
                distance_km=1.5,
                similarity_score=0.85,
                bedrooms=request.features.bedrooms,
                bathrooms=request.features.bathrooms,
                square_feet=(request.features.square_feet or 2000) - 50
            )
        ]
        
        return comparables
    
    async def _get_market_trends(self, location) -> Dict:
        """
        Get market trends for the area
        
        In production, this would query analytics database
        """
        # Mock market trends
        return {
            'area': f"{location.city}, {location.state}",
            'median_price': 465000,
            'price_change_1m': 1.2,
            'price_change_3m': 3.5,
            'price_change_1y': 8.7,
            'inventory_level': 'balanced',
            'days_on_market': 28,
            'price_per_sqft': 225
        }
    
    def _adjust_valuation(
        self,
        ml_value: float,
        comparables: List[ComparableProperty],
        market_trends: Dict
    ) -> float:
        """
        Adjust ML valuation based on comparable sales and market trends
        """
        if not comparables:
            return ml_value
        
        # Calculate weighted average of comparable sales
        total_weight = sum(comp.similarity_score for comp in comparables)
        comparable_value = sum(
            comp.sale_price * comp.similarity_score for comp in comparables
        ) / total_weight if total_weight > 0 else ml_value
        
        # Blend ML prediction with comparable sales (70% ML, 30% comparables)
        blended_value = ml_value * 0.7 + comparable_value * 0.3
        
        # Adjust for market trends
        trend_adjustment = 1.0 + (market_trends.get('price_change_3m', 0) / 100.0)
        adjusted_value = blended_value * trend_adjustment
        
        return adjusted_value
    
    def _calculate_confidence(
        self,
        ml_confidence: float,
        num_comparables: int,
        market_trends: Dict
    ) -> float:
        """
        Calculate final confidence score
        """
        # Base confidence from ML model
        confidence = ml_confidence
        
        # Boost confidence if we have good comparables
        if num_comparables >= settings.min_comparable_properties:
            comparable_boost = min(0.1, num_comparables * 0.02)
            confidence = min(1.0, confidence + comparable_boost)
        
        # Reduce confidence in volatile markets
        if abs(market_trends.get('price_change_1m', 0)) > 5:
            confidence *= 0.95
        
        return confidence
    
    async def batch_valuate(self, requests: List[ValuationRequest]) -> List[ValuationResult]:
        """
        Valuate multiple properties in batch
        
        In production, this would use Ray for distributed processing
        """
        results = []
        for request in requests:
            result = await self.valuate_property(request)
            results.append(result)
        return results
