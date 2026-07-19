"""
Hybrid Valuation Model with Adaptive Architecture
Switches between data-rich and data-scarce pathways based on data availability
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

from .satellite_analyzer import get_satellite_analyzer, SatelliteAnalysisResult
from .alternative_data import get_alternative_data_enricher, AlternativeDataResult

logger = logging.getLogger(__name__)


class ModelPathway(Enum):
    """Model pathway selection"""
    DATA_RICH = "data_rich"  # Traditional ML with sufficient comparables
    DATA_SCARCE = "data_scarce"  # Satellite + alternative data
    HYBRID = "hybrid"  # Ensemble of both


@dataclass
class DataAvailabilityScore:
    """Scores for different data dimensions"""
    comparable_density: float  # 0-1, based on number of comparables
    transaction_history: float  # 0-1, based on historical transactions
    market_data_quality: float  # 0-1, quality of market listing data
    satellite_data_quality: float  # 0-1, quality of satellite imagery
    alternative_data_quality: float  # 0-1, quality of alternative data
    overall_score: float  # 0-1, weighted average
    recommended_pathway: ModelPathway


@dataclass
class ValuationComponent:
    """Individual valuation component from a specific method"""
    value: float
    confidence: float
    method: str
    weight: float  # Weight in ensemble
    data_sources: List[str]


@dataclass
class HybridValuationResult:
    """Complete hybrid valuation result"""
    final_valuation: float
    confidence_score: float
    uncertainty_range: Tuple[float, float]  # (min, max)
    pathway_used: ModelPathway
    components: List[ValuationComponent]
    data_availability: DataAvailabilityScore
    satellite_analysis: Optional[SatelliteAnalysisResult]
    alternative_data: Optional[AlternativeDataResult]
    metadata: Dict[str, any]


class HybridValuationModel:
    """
    Adaptive hybrid model for property valuation
    
    Pathways:
    1. Data-Rich: Traditional ML (comparable sales, hedonic pricing)
    2. Data-Scarce: Satellite imagery + alternative data + proxies
    3. Hybrid: Weighted ensemble of both
    """
    
    def __init__(self):
        self.satellite_analyzer = get_satellite_analyzer()
        self.alternative_data_enricher = get_alternative_data_enricher()
        
        # Thresholds for pathway selection
        self.data_rich_threshold = 0.7  # Use data-rich if score > 0.7
        self.data_scarce_threshold = 0.3  # Use data-scarce if score < 0.3
        # Between 0.3-0.7: Use hybrid ensemble
        
        # Minimum comparables for data-rich pathway
        self.min_comparables = 5
    
    async def value_property(
        self,
        property_data: Dict,
        comparable_count: int = 0,
        transaction_history_count: int = 0
    ) -> HybridValuationResult:
        """
        Value property using adaptive hybrid model
        
        Args:
            property_data: Property details (location, size, type, etc.)
            comparable_count: Number of comparable properties available
            transaction_history_count: Number of historical transactions
            
        Returns:
            HybridValuationResult with final valuation and metadata
        """
        logger.info(f"Starting hybrid valuation for property: {property_data.get('id', 'unknown')}")
        
        # Step 1: Assess data availability
        data_availability = self._assess_data_availability(
            property_data,
            comparable_count,
            transaction_history_count
        )
        
        logger.info(f"Data availability score: {data_availability.overall_score:.2f}, "
                   f"Pathway: {data_availability.recommended_pathway.value}")
        
        # Step 2: Fetch satellite and alternative data (always, for metadata)
        satellite_result = await self._get_satellite_analysis(property_data)
        alternative_data = await self._get_alternative_data(property_data)
        
        # Step 3: Route to appropriate pathway
        components = []
        
        if data_availability.recommended_pathway == ModelPathway.DATA_RICH:
            components = await self._data_rich_pathway(
                property_data, comparable_count, satellite_result, alternative_data
            )
        elif data_availability.recommended_pathway == ModelPathway.DATA_SCARCE:
            components = await self._data_scarce_pathway(
                property_data, satellite_result, alternative_data
            )
        else:  # HYBRID
            components = await self._hybrid_pathway(
                property_data, comparable_count, satellite_result, alternative_data,
                data_availability.overall_score
            )
        
        # Step 4: Ensemble components
        final_valuation, confidence = self._ensemble_valuations(components)
        
        # Step 5: Calculate uncertainty range
        uncertainty_range = self._calculate_uncertainty_range(
            final_valuation, confidence, components
        )
        
        # Step 6: Build metadata
        metadata = self._build_metadata(
            property_data, data_availability, components, satellite_result, alternative_data
        )
        
        return HybridValuationResult(
            final_valuation=final_valuation,
            confidence_score=confidence,
            uncertainty_range=uncertainty_range,
            pathway_used=data_availability.recommended_pathway,
            components=components,
            data_availability=data_availability,
            satellite_analysis=satellite_result,
            alternative_data=alternative_data,
            metadata=metadata
        )
    
    def _assess_data_availability(
        self,
        property_data: Dict,
        comparable_count: int,
        transaction_history_count: int
    ) -> DataAvailabilityScore:
        """Assess data availability to determine pathway"""
        
        # Comparable density score (0-1)
        # 0 comparables = 0, 20+ comparables = 1
        comparable_density = min(1.0, comparable_count / 20.0)
        
        # Transaction history score (0-1)
        # 0 transactions = 0, 10+ transactions = 1
        transaction_history = min(1.0, transaction_history_count / 10.0)
        
        # Market data quality (from alternative data, estimated)
        # Major cities have better market data
        city = property_data.get('city', '').lower()
        major_cities = ['lagos', 'abuja', 'port harcourt', 'kano', 'ibadan']
        market_data_quality = 0.8 if city in major_cities else 0.5
        
        # Satellite data quality (always available, quality varies)
        satellite_data_quality = 0.75  # Moderate quality for Nigeria
        
        # Alternative data quality (economic indicators, listings)
        alternative_data_quality = 0.7  # Good for major cities, moderate elsewhere
        
        # Overall score (weighted average)
        weights = {
            'comparable': 0.35,
            'transaction': 0.25,
            'market': 0.20,
            'satellite': 0.10,
            'alternative': 0.10
        }
        
        overall = (
            comparable_density * weights['comparable'] +
            transaction_history * weights['transaction'] +
            market_data_quality * weights['market'] +
            satellite_data_quality * weights['satellite'] +
            alternative_data_quality * weights['alternative']
        )
        
        # Determine pathway
        if overall >= self.data_rich_threshold and comparable_count >= self.min_comparables:
            pathway = ModelPathway.DATA_RICH
        elif overall <= self.data_scarce_threshold:
            pathway = ModelPathway.DATA_SCARCE
        else:
            pathway = ModelPathway.HYBRID
        
        return DataAvailabilityScore(
            comparable_density=comparable_density,
            transaction_history=transaction_history,
            market_data_quality=market_data_quality,
            satellite_data_quality=satellite_data_quality,
            alternative_data_quality=alternative_data_quality,
            overall_score=overall,
            recommended_pathway=pathway
        )
    
    async def _get_satellite_analysis(
        self,
        property_data: Dict
    ) -> Optional[SatelliteAnalysisResult]:
        """Get satellite imagery analysis"""
        try:
            return await self.satellite_analyzer.analyze_property(
                latitude=property_data.get('latitude', 0),
                longitude=property_data.get('longitude', 0),
                property_type=property_data.get('type', 'house'),
                stated_size_sqm=property_data.get('size_sqm')
            )
        except Exception as e:
            logger.error(f"Satellite analysis failed: {e}")
            return None
    
    async def _get_alternative_data(
        self,
        property_data: Dict
    ) -> Optional[AlternativeDataResult]:
        """Get alternative data enrichment"""
        try:
            return await self.alternative_data_enricher.enrich_property_data(
                latitude=property_data.get('latitude', 0),
                longitude=property_data.get('longitude', 0),
                city=property_data.get('city', ''),
                state=property_data.get('state', ''),
                property_type=property_data.get('type', 'house')
            )
        except Exception as e:
            logger.error(f"Alternative data enrichment failed: {e}")
            return None
    
    async def _data_rich_pathway(
        self,
        property_data: Dict,
        comparable_count: int,
        satellite_result: Optional[SatelliteAnalysisResult],
        alternative_data: Optional[AlternativeDataResult]
    ) -> List[ValuationComponent]:
        """Data-rich pathway: Traditional ML with comparables"""
        
        components = []
        
        # Component 1: Comparable sales analysis (primary)
        comp_value = self._comparable_sales_valuation(property_data, comparable_count)
        components.append(ValuationComponent(
            value=comp_value,
            confidence=0.85,
            method='comparable_sales',
            weight=0.60,
            data_sources=['comparable_sales_database']
        ))
        
        # Component 2: Hedonic pricing model
        hedonic_value = self._hedonic_pricing_valuation(property_data)
        components.append(ValuationComponent(
            value=hedonic_value,
            confidence=0.75,
            method='hedonic_pricing',
            weight=0.25,
            data_sources=['property_attributes', 'market_data']
        ))
        
        # Component 3: Satellite-based adjustment (minor)
        if satellite_result:
            satellite_multiplier = self.satellite_analyzer.get_valuation_multiplier(
                satellite_result.building_features
            )
            satellite_value = comp_value * satellite_multiplier
            components.append(ValuationComponent(
                value=satellite_value,
                confidence=satellite_result.building_features.confidence_score,
                method='satellite_adjustment',
                weight=0.15,
                data_sources=['satellite_imagery']
            ))
        
        return components
    
    async def _data_scarce_pathway(
        self,
        property_data: Dict,
        satellite_result: Optional[SatelliteAnalysisResult],
        alternative_data: Optional[AlternativeDataResult]
    ) -> List[ValuationComponent]:
        """Data-scarce pathway: Satellite + alternative data + proxies"""
        
        components = []
        
        # Component 1: Satellite-based valuation (primary)
        if satellite_result:
            satellite_value = self._satellite_based_valuation(
                property_data, satellite_result
            )
            components.append(ValuationComponent(
                value=satellite_value,
                confidence=satellite_result.building_features.confidence_score,
                method='satellite_valuation',
                weight=0.40,
                data_sources=['satellite_imagery', 'building_detection']
            ))
        
        # Component 2: Market listing proxy
        if alternative_data and alternative_data.market_listing_data:
            listing_value = self._market_listing_valuation(
                property_data, alternative_data.market_listing_data
            )
            components.append(ValuationComponent(
                value=listing_value,
                confidence=alternative_data.market_listing_data.confidence,
                method='market_listing_proxy',
                weight=0.35,
                data_sources=['property_listings', 'market_data']
            ))
        
        # Component 3: Neighborhood quality proxy
        if alternative_data and alternative_data.neighborhood_quality:
            neighborhood_value = self._neighborhood_proxy_valuation(
                property_data, alternative_data.neighborhood_quality
            )
            components.append(ValuationComponent(
                value=neighborhood_value,
                confidence=alternative_data.neighborhood_quality.confidence,
                method='neighborhood_proxy',
                weight=0.25,
                data_sources=['openstreetmap', 'amenity_data']
            ))
        
        # Fallback: Use basic cost approach if no other data
        if not components:
            cost_value = self._cost_approach_valuation(property_data)
            components.append(ValuationComponent(
                value=cost_value,
                confidence=0.50,
                method='cost_approach_fallback',
                weight=1.0,
                data_sources=['construction_costs', 'land_values']
            ))
        
        return components
    
    async def _hybrid_pathway(
        self,
        property_data: Dict,
        comparable_count: int,
        satellite_result: Optional[SatelliteAnalysisResult],
        alternative_data: Optional[AlternativeDataResult],
        data_score: float
    ) -> List[ValuationComponent]:
        """Hybrid pathway: Ensemble of data-rich and data-scarce methods"""
        
        # Get components from both pathways
        data_rich_components = await self._data_rich_pathway(
            property_data, comparable_count, satellite_result, alternative_data
        )
        data_scarce_components = await self._data_scarce_pathway(
            property_data, satellite_result, alternative_data
        )
        
        # Adjust weights based on data availability score
        # Higher score = more weight on data-rich methods
        data_rich_weight = data_score
        data_scarce_weight = 1.0 - data_score
        
        # Reweight components
        for comp in data_rich_components:
            comp.weight *= data_rich_weight
        
        for comp in data_scarce_components:
            comp.weight *= data_scarce_weight
        
        # Combine and normalize weights
        all_components = data_rich_components + data_scarce_components
        total_weight = sum(c.weight for c in all_components)
        
        for comp in all_components:
            comp.weight /= total_weight
        
        return all_components
    
    def _ensemble_valuations(
        self,
        components: List[ValuationComponent]
    ) -> Tuple[float, float]:
        """Ensemble multiple valuation components"""
        
        if not components:
            return 0.0, 0.0
        
        # Weighted average of valuations
        total_value = sum(c.value * c.weight for c in components)
        
        # Weighted average of confidences
        total_confidence = sum(c.confidence * c.weight for c in components)
        
        return total_value, total_confidence
    
    def _calculate_uncertainty_range(
        self,
        valuation: float,
        confidence: float,
        components: List[ValuationComponent]
    ) -> Tuple[float, float]:
        """Calculate uncertainty range (prediction interval)"""
        
        # Uncertainty increases as confidence decreases
        # High confidence (0.9): ±10%
        # Medium confidence (0.7): ±20%
        # Low confidence (0.5): ±30%
        
        base_uncertainty = 0.10  # 10% base
        confidence_factor = (1.0 - confidence) * 0.20  # Up to 20% additional
        total_uncertainty = base_uncertainty + confidence_factor
        
        # Also consider variance among components
        if len(components) > 1:
            values = [c.value for c in components]
            std_dev = np.std(values)
            cv = std_dev / np.mean(values) if np.mean(values) > 0 else 0
            total_uncertainty = max(total_uncertainty, cv)
        
        # Cap uncertainty at 40%
        total_uncertainty = min(0.40, total_uncertainty)
        
        min_value = valuation * (1.0 - total_uncertainty)
        max_value = valuation * (1.0 + total_uncertainty)
        
        return (min_value, max_value)
    
    def _build_metadata(
        self,
        property_data: Dict,
        data_availability: DataAvailabilityScore,
        components: List[ValuationComponent],
        satellite_result: Optional[SatelliteAnalysisResult],
        alternative_data: Optional[AlternativeDataResult]
    ) -> Dict:
        """Build metadata for valuation result"""
        
        metadata = {
            'property_id': property_data.get('id'),
            'valuation_date': self._get_timestamp(),
            'model_version': '2.0-hybrid',
            'pathway': data_availability.recommended_pathway.value,
            'data_availability_score': data_availability.overall_score,
            'num_components': len(components),
            'component_methods': [c.method for c in components],
            'all_data_sources': list(set(
                source for c in components for source in c.data_sources
            ))
        }
        
        # Add satellite metadata if available
        if satellite_result:
            metadata['satellite_confidence'] = satellite_result.building_features.confidence_score
            metadata['building_footprint_sqm'] = satellite_result.building_features.building_footprint_sqm
        
        # Add alternative data metadata if available
        if alternative_data:
            metadata['alternative_data_completeness'] = alternative_data.data_completeness_score
            metadata['alternative_data_sources'] = alternative_data.sources_used
        
        return metadata
    
    # Valuation method implementations
    
    def _comparable_sales_valuation(self, property_data: Dict, comparable_count: int) -> float:
        """Traditional comparable sales analysis"""
        # Simulated for MVP - in production, use actual comparable sales
        base_price_per_sqm = property_data.get('base_price_per_sqm', 200000)  # NGN
        size_sqm = property_data.get('size_sqm', 100)
        adjustment_factor = 1.0 + (comparable_count / 100)  # More comparables = higher confidence
        return base_price_per_sqm * size_sqm * adjustment_factor
    
    def _hedonic_pricing_valuation(self, property_data: Dict) -> float:
        """Hedonic pricing model based on attributes"""
        base_price_per_sqm = property_data.get('base_price_per_sqm', 200000)
        size_sqm = property_data.get('size_sqm', 100)
        bedrooms = property_data.get('bedrooms', 3)
        bathrooms = property_data.get('bathrooms', 2)
        
        # Attribute premiums
        bedroom_premium = bedrooms * 0.05
        bathroom_premium = bathrooms * 0.03
        
        multiplier = 1.0 + bedroom_premium + bathroom_premium
        return base_price_per_sqm * size_sqm * multiplier
    
    def _satellite_based_valuation(
        self,
        property_data: Dict,
        satellite_result: SatelliteAnalysisResult
    ) -> float:
        """Valuation based on satellite imagery analysis"""
        # Use detected building footprint and features
        footprint = satellite_result.building_features.building_footprint_sqm
        base_price_per_sqm = property_data.get('base_price_per_sqm', 200000)
        
        # Apply satellite-derived multipliers
        multiplier = self.satellite_analyzer.get_valuation_multiplier(
            satellite_result.building_features
        )
        
        return footprint * base_price_per_sqm * multiplier
    
    def _market_listing_valuation(self, property_data: Dict, listing_data) -> float:
        """Valuation based on market listing data"""
        size_sqm = property_data.get('size_sqm', 100)
        avg_price_per_sqm = listing_data.avg_price_per_sqm
        
        # Adjust for price trend
        trend_multiplier = 1.0 + (listing_data.price_trend_30d / 100)
        
        return size_sqm * avg_price_per_sqm * trend_multiplier
    
    def _neighborhood_proxy_valuation(self, property_data: Dict, neighborhood_quality) -> float:
        """Valuation based on neighborhood quality proxies"""
        base_price_per_sqm = property_data.get('base_price_per_sqm', 200000)
        size_sqm = property_data.get('size_sqm', 100)
        
        # Apply neighborhood quality multiplier (0-10% boost)
        quality_multiplier = 1.0 + (neighborhood_quality.overall_score * 0.10)
        
        return base_price_per_sqm * size_sqm * quality_multiplier
    
    def _cost_approach_valuation(self, property_data: Dict) -> float:
        """Fallback cost approach valuation"""
        size_sqm = property_data.get('size_sqm', 100)
        construction_cost_per_sqm = 150000  # NGN, typical for Nigeria
        land_value = 5000000  # NGN, typical plot
        
        building_value = size_sqm * construction_cost_per_sqm
        depreciation = 0.90  # 10% depreciation
        
        return (building_value * depreciation) + land_value
    
    @staticmethod
    def _get_timestamp() -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'


# Singleton instance
_hybrid_model: Optional[HybridValuationModel] = None


def get_hybrid_model() -> HybridValuationModel:
    """Get or create hybrid model instance"""
    global _hybrid_model
    if _hybrid_model is None:
        _hybrid_model = HybridValuationModel()
    return _hybrid_model
