"""
Confidence Scoring and Data Quality Tracking System
Provides transparent confidence metrics for hybrid valuations
"""

import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ConfidenceLevel(Enum):
    """Confidence level categories"""
    VERY_HIGH = "very_high"  # 0.85-1.0
    HIGH = "high"  # 0.70-0.85
    MEDIUM = "medium"  # 0.55-0.70
    LOW = "low"  # 0.40-0.55
    VERY_LOW = "very_low"  # 0.0-0.40


class DataQualityFlag(Enum):
    """Data quality flags"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    INSUFFICIENT = "insufficient"


@dataclass
class DataCompletenessMetrics:
    """Metrics for data completeness"""
    comparable_sales_count: int
    comparable_sales_score: float  # 0-1
    transaction_history_count: int
    transaction_history_score: float  # 0-1
    satellite_data_available: bool
    satellite_data_score: float  # 0-1
    alternative_data_sources: int
    alternative_data_score: float  # 0-1
    overall_completeness: float  # 0-1
    quality_flag: DataQualityFlag


@dataclass
class ConfidenceBreakdown:
    """Detailed confidence breakdown"""
    data_completeness_contribution: float  # 0-1
    model_accuracy_contribution: float  # 0-1
    comparable_quality_contribution: float  # 0-1
    satellite_confidence_contribution: float  # 0-1
    market_stability_contribution: float  # 0-1
    overall_confidence: float  # 0-1
    confidence_level: ConfidenceLevel
    limiting_factors: List[str]  # What's reducing confidence


@dataclass
class UncertaintyMetrics:
    """Uncertainty and prediction interval metrics"""
    prediction_interval_lower: float
    prediction_interval_upper: float
    interval_width_percent: float
    standard_error: float
    coefficient_of_variation: float
    uncertainty_sources: Dict[str, float]  # Source -> contribution


@dataclass
class DataSourceContribution:
    """Contribution of each data source to final valuation"""
    source_name: str
    weight: float  # 0-1
    confidence: float  # 0-1
    value_contribution: float  # Actual value contributed
    importance_rank: int


@dataclass
class ConfidenceScoreResult:
    """Complete confidence scoring result"""
    overall_confidence: float
    confidence_level: ConfidenceLevel
    data_completeness: DataCompletenessMetrics
    confidence_breakdown: ConfidenceBreakdown
    uncertainty_metrics: UncertaintyMetrics
    data_source_contributions: List[DataSourceContribution]
    quality_flags: List[str]
    recommendations: List[str]


class ConfidenceScorer:
    """
    Calculates comprehensive confidence scores for hybrid valuations
    
    Considers:
    - Data completeness (comparables, transactions, satellite, alternative)
    - Model accuracy (historical performance)
    - Comparable quality (recency, similarity)
    - Market stability (volatility, trends)
    """
    
    def __init__(self):
        # Weights for confidence components
        self.confidence_weights = {
            'data_completeness': 0.35,
            'model_accuracy': 0.25,
            'comparable_quality': 0.20,
            'satellite_confidence': 0.10,
            'market_stability': 0.10
        }
        
        # Thresholds for confidence levels
        self.confidence_thresholds = {
            ConfidenceLevel.VERY_HIGH: 0.85,
            ConfidenceLevel.HIGH: 0.70,
            ConfidenceLevel.MEDIUM: 0.55,
            ConfidenceLevel.LOW: 0.40,
            ConfidenceLevel.VERY_LOW: 0.0
        }
    
    def calculate_confidence(
        self,
        valuation_result,  # HybridValuationResult
        comparable_count: int = 0,
        transaction_count: int = 0,
        market_volatility: float = 0.15  # Default 15% volatility
    ) -> ConfidenceScoreResult:
        """
        Calculate comprehensive confidence score
        
        Args:
            valuation_result: HybridValuationResult from hybrid model
            comparable_count: Number of comparable properties
            transaction_count: Number of historical transactions
            market_volatility: Market volatility (0-1)
            
        Returns:
            ConfidenceScoreResult with detailed metrics
        """
        logger.info("Calculating confidence scores")
        
        # Step 1: Calculate data completeness metrics
        data_completeness = self._calculate_data_completeness(
            valuation_result,
            comparable_count,
            transaction_count
        )
        
        # Step 2: Calculate confidence breakdown
        confidence_breakdown = self._calculate_confidence_breakdown(
            valuation_result,
            data_completeness,
            market_volatility
        )
        
        # Step 3: Calculate uncertainty metrics
        uncertainty_metrics = self._calculate_uncertainty_metrics(
            valuation_result,
            confidence_breakdown.overall_confidence
        )
        
        # Step 4: Calculate data source contributions
        data_source_contributions = self._calculate_data_source_contributions(
            valuation_result.components
        )
        
        # Step 5: Determine quality flags
        quality_flags = self._determine_quality_flags(
            data_completeness,
            confidence_breakdown,
            uncertainty_metrics
        )
        
        # Step 6: Generate recommendations
        recommendations = self._generate_recommendations(
            data_completeness,
            confidence_breakdown,
            quality_flags
        )
        
        return ConfidenceScoreResult(
            overall_confidence=confidence_breakdown.overall_confidence,
            confidence_level=confidence_breakdown.confidence_level,
            data_completeness=data_completeness,
            confidence_breakdown=confidence_breakdown,
            uncertainty_metrics=uncertainty_metrics,
            data_source_contributions=data_source_contributions,
            quality_flags=quality_flags,
            recommendations=recommendations
        )
    
    def _calculate_data_completeness(
        self,
        valuation_result,
        comparable_count: int,
        transaction_count: int
    ) -> DataCompletenessMetrics:
        """Calculate data completeness metrics"""
        
        # Comparable sales score (0-20 comparables = 0-1)
        comp_score = min(1.0, comparable_count / 20.0)
        
        # Transaction history score (0-10 transactions = 0-1)
        trans_score = min(1.0, transaction_count / 10.0)
        
        # Satellite data score
        satellite_available = valuation_result.satellite_analysis is not None
        satellite_score = 0.0
        if satellite_available:
            satellite_score = valuation_result.satellite_analysis.building_features.confidence_score
        
        # Alternative data score
        alt_data_sources = 0
        alt_data_score = 0.0
        if valuation_result.alternative_data:
            alt_data_sources = len(valuation_result.alternative_data.sources_used)
            alt_data_score = valuation_result.alternative_data.data_completeness_score
        
        # Overall completeness (weighted average)
        overall = (
            comp_score * 0.35 +
            trans_score * 0.25 +
            satellite_score * 0.20 +
            alt_data_score * 0.20
        )
        
        # Determine quality flag
        if overall >= 0.80:
            quality_flag = DataQualityFlag.EXCELLENT
        elif overall >= 0.65:
            quality_flag = DataQualityFlag.GOOD
        elif overall >= 0.45:
            quality_flag = DataQualityFlag.FAIR
        elif overall >= 0.25:
            quality_flag = DataQualityFlag.POOR
        else:
            quality_flag = DataQualityFlag.INSUFFICIENT
        
        return DataCompletenessMetrics(
            comparable_sales_count=comparable_count,
            comparable_sales_score=comp_score,
            transaction_history_count=transaction_count,
            transaction_history_score=trans_score,
            satellite_data_available=satellite_available,
            satellite_data_score=satellite_score,
            alternative_data_sources=alt_data_sources,
            alternative_data_score=alt_data_score,
            overall_completeness=overall,
            quality_flag=quality_flag
        )
    
    def _calculate_confidence_breakdown(
        self,
        valuation_result,
        data_completeness: DataCompletenessMetrics,
        market_volatility: float
    ) -> ConfidenceBreakdown:
        """Calculate detailed confidence breakdown"""
        
        # 1. Data completeness contribution
        data_comp_contrib = data_completeness.overall_completeness
        
        # 2. Model accuracy contribution (from pathway and components)
        model_accuracy = self._estimate_model_accuracy(valuation_result)
        
        # 3. Comparable quality contribution
        comparable_quality = self._estimate_comparable_quality(
            data_completeness.comparable_sales_count,
            data_completeness.transaction_history_count
        )
        
        # 4. Satellite confidence contribution
        satellite_contrib = 0.0
        if valuation_result.satellite_analysis:
            satellite_contrib = valuation_result.satellite_analysis.building_features.confidence_score
        
        # 5. Market stability contribution (inverse of volatility)
        market_stability = max(0.0, 1.0 - market_volatility)
        
        # Calculate overall confidence (weighted sum)
        overall = (
            data_comp_contrib * self.confidence_weights['data_completeness'] +
            model_accuracy * self.confidence_weights['model_accuracy'] +
            comparable_quality * self.confidence_weights['comparable_quality'] +
            satellite_contrib * self.confidence_weights['satellite_confidence'] +
            market_stability * self.confidence_weights['market_stability']
        )
        
        # Determine confidence level
        confidence_level = self._get_confidence_level(overall)
        
        # Identify limiting factors
        limiting_factors = self._identify_limiting_factors(
            data_comp_contrib, model_accuracy, comparable_quality,
            satellite_contrib, market_stability
        )
        
        return ConfidenceBreakdown(
            data_completeness_contribution=data_comp_contrib,
            model_accuracy_contribution=model_accuracy,
            comparable_quality_contribution=comparable_quality,
            satellite_confidence_contribution=satellite_contrib,
            market_stability_contribution=market_stability,
            overall_confidence=overall,
            confidence_level=confidence_level,
            limiting_factors=limiting_factors
        )
    
    def _calculate_uncertainty_metrics(
        self,
        valuation_result,
        confidence: float
    ) -> UncertaintyMetrics:
        """Calculate uncertainty and prediction interval metrics"""
        
        final_val = valuation_result.final_valuation
        lower, upper = valuation_result.uncertainty_range
        
        # Interval width as percentage
        interval_width = ((upper - lower) / final_val) * 100 if final_val > 0 else 0
        
        # Standard error (approximate)
        std_error = (upper - lower) / 4  # Assuming ~95% CI
        
        # Coefficient of variation
        cv = (std_error / final_val) if final_val > 0 else 0
        
        # Uncertainty sources (what contributes to uncertainty)
        uncertainty_sources = self._identify_uncertainty_sources(
            valuation_result, confidence
        )
        
        return UncertaintyMetrics(
            prediction_interval_lower=lower,
            prediction_interval_upper=upper,
            interval_width_percent=interval_width,
            standard_error=std_error,
            coefficient_of_variation=cv,
            uncertainty_sources=uncertainty_sources
        )
    
    def _calculate_data_source_contributions(
        self,
        components: List
    ) -> List[DataSourceContribution]:
        """Calculate contribution of each data source"""
        
        contributions = []
        
        for i, comp in enumerate(components):
            # Aggregate sources for this component
            source_name = comp.method
            
            contrib = DataSourceContribution(
                source_name=source_name,
                weight=comp.weight,
                confidence=comp.confidence,
                value_contribution=comp.value * comp.weight,
                importance_rank=i + 1
            )
            contributions.append(contrib)
        
        # Sort by weight (most important first)
        contributions.sort(key=lambda x: x.weight, reverse=True)
        
        # Update ranks
        for i, contrib in enumerate(contributions):
            contrib.importance_rank = i + 1
        
        return contributions
    
    def _determine_quality_flags(
        self,
        data_completeness: DataCompletenessMetrics,
        confidence_breakdown: ConfidenceBreakdown,
        uncertainty_metrics: UncertaintyMetrics
    ) -> List[str]:
        """Determine quality flags for the valuation"""
        
        flags = []
        
        # Data quality flags
        if data_completeness.comparable_sales_count < 3:
            flags.append("limited_comparables")
        
        if data_completeness.transaction_history_count < 2:
            flags.append("limited_transaction_history")
        
        if not data_completeness.satellite_data_available:
            flags.append("no_satellite_data")
        
        if data_completeness.alternative_data_sources < 2:
            flags.append("limited_alternative_data")
        
        # Confidence flags
        if confidence_breakdown.overall_confidence < 0.55:
            flags.append("low_confidence")
        
        # Uncertainty flags
        if uncertainty_metrics.interval_width_percent > 30:
            flags.append("high_uncertainty")
        
        if uncertainty_metrics.coefficient_of_variation > 0.25:
            flags.append("high_variability")
        
        return flags
    
    def _generate_recommendations(
        self,
        data_completeness: DataCompletenessMetrics,
        confidence_breakdown: ConfidenceBreakdown,
        quality_flags: List[str]
    ) -> List[str]:
        """Generate recommendations to improve confidence"""
        
        recommendations = []
        
        # Data collection recommendations
        if "limited_comparables" in quality_flags:
            recommendations.append(
                "Collect more comparable sales data to improve valuation accuracy"
            )
        
        if "limited_transaction_history" in quality_flags:
            recommendations.append(
                "Obtain historical transaction data for this property or neighborhood"
            )
        
        if "no_satellite_data" in quality_flags:
            recommendations.append(
                "Acquire satellite imagery to validate property features"
            )
        
        # Confidence improvement recommendations
        if confidence_breakdown.overall_confidence < 0.70:
            recommendations.append(
                "Consider professional appraisal for high-value transactions"
            )
        
        if "high_uncertainty" in quality_flags:
            recommendations.append(
                "Wide uncertainty range - recommend physical property inspection"
            )
        
        # Market recommendations
        if confidence_breakdown.market_stability_contribution < 0.60:
            recommendations.append(
                "High market volatility detected - monitor recent sales closely"
            )
        
        return recommendations
    
    # Helper methods
    
    def _estimate_model_accuracy(self, valuation_result) -> float:
        """Estimate model accuracy based on pathway and components"""
        
        # Different pathways have different typical accuracies
        pathway_accuracy = {
            'data_rich': 0.85,
            'data_scarce': 0.65,
            'hybrid': 0.75
        }
        
        base_accuracy = pathway_accuracy.get(
            valuation_result.pathway_used.value,
            0.70
        )
        
        # Adjust based on number of components (more = better)
        component_bonus = min(0.10, len(valuation_result.components) * 0.02)
        
        return min(0.95, base_accuracy + component_bonus)
    
    def _estimate_comparable_quality(
        self,
        comparable_count: int,
        transaction_count: int
    ) -> float:
        """Estimate quality of comparable data"""
        
        if comparable_count == 0:
            return 0.0
        
        # More comparables = higher quality
        count_score = min(1.0, comparable_count / 15.0)
        
        # Recent transactions boost quality
        recency_score = min(1.0, transaction_count / 8.0)
        
        return (count_score * 0.7 + recency_score * 0.3)
    
    def _get_confidence_level(self, confidence: float) -> ConfidenceLevel:
        """Map confidence score to confidence level"""
        
        if confidence >= self.confidence_thresholds[ConfidenceLevel.VERY_HIGH]:
            return ConfidenceLevel.VERY_HIGH
        elif confidence >= self.confidence_thresholds[ConfidenceLevel.HIGH]:
            return ConfidenceLevel.HIGH
        elif confidence >= self.confidence_thresholds[ConfidenceLevel.MEDIUM]:
            return ConfidenceLevel.MEDIUM
        elif confidence >= self.confidence_thresholds[ConfidenceLevel.LOW]:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW
    
    def _identify_limiting_factors(
        self,
        data_comp: float,
        model_acc: float,
        comp_qual: float,
        satellite: float,
        market_stab: float
    ) -> List[str]:
        """Identify what's limiting confidence"""
        
        factors = []
        threshold = 0.60  # Below this is considered limiting
        
        if data_comp < threshold:
            factors.append("Insufficient data completeness")
        if model_acc < threshold:
            factors.append("Limited model accuracy")
        if comp_qual < threshold:
            factors.append("Poor comparable quality")
        if satellite < threshold:
            factors.append("Low satellite data confidence")
        if market_stab < threshold:
            factors.append("High market volatility")
        
        return factors
    
    def _identify_uncertainty_sources(
        self,
        valuation_result,
        confidence: float
    ) -> Dict[str, float]:
        """Identify sources of uncertainty"""
        
        sources = {}
        
        # Model uncertainty (inverse of confidence)
        sources['model_uncertainty'] = (1.0 - confidence) * 0.40
        
        # Data uncertainty (from data availability)
        data_score = valuation_result.data_availability.overall_score
        sources['data_uncertainty'] = (1.0 - data_score) * 0.30
        
        # Component variance (if multiple components disagree)
        if len(valuation_result.components) > 1:
            values = [c.value for c in valuation_result.components]
            cv = np.std(values) / np.mean(values) if np.mean(values) > 0 else 0
            sources['component_variance'] = min(0.20, cv)
        else:
            sources['component_variance'] = 0.0
        
        # Market uncertainty (always some)
        sources['market_uncertainty'] = 0.10
        
        # Normalize to sum to 1.0
        total = sum(sources.values())
        if total > 0:
            sources = {k: v / total for k, v in sources.items()}
        
        return sources


# Singleton instance
_confidence_scorer: Optional[ConfidenceScorer] = None


def get_confidence_scorer() -> ConfidenceScorer:
    """Get or create confidence scorer instance"""
    global _confidence_scorer
    if _confidence_scorer is None:
        _confidence_scorer = ConfidenceScorer()
    return _confidence_scorer
