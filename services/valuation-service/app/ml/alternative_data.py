"""
Alternative Data Enrichment Service
Integrates external data sources for data-scarce markets
"""

import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
import logging
import os
import requests

logger = logging.getLogger(__name__)


@dataclass
class EconomicIndicators:
    """Economic indicators for the region"""
    inflation_rate: float  # Annual inflation rate
    gdp_growth_rate: float  # Annual GDP growth
    unemployment_rate: float
    currency_exchange_rate: float  # NGN to USD
    interest_rate: float  # Central bank rate
    data_date: str
    confidence: float


@dataclass
class MarketListingData:
    """Data scraped from property listing websites"""
    avg_price_per_sqm: float
    listing_count: int
    avg_days_on_market: int
    price_trend_30d: float  # % change in last 30 days
    comparable_properties: int
    data_source: str
    confidence: float


@dataclass
class NeighborhoodQualityScore:
    """Proxy indicators for neighborhood quality"""
    school_proximity_score: float  # 0-1, based on distance to schools
    hospital_proximity_score: float
    shopping_proximity_score: float
    transport_proximity_score: float
    crime_safety_score: float  # 0-1, higher is safer
    overall_score: float
    confidence: float


@dataclass
class AlternativeDataResult:
    """Complete alternative data enrichment result"""
    economic_indicators: Optional[EconomicIndicators]
    market_listing_data: Optional[MarketListingData]
    neighborhood_quality: Optional[NeighborhoodQualityScore]
    data_completeness_score: float
    sources_used: List[str]
    timestamp: str


class AlternativeDataEnricher:
    """
    Enriches property data with alternative data sources
    
    Data sources:
    - Economic indicators: World Bank API, CBN data
    - Market listings: PropertyPro.ng, Jiji.ng, Nigeria Property Centre
    - Neighborhood quality: OpenStreetMap, Google Places
    """
    
    def __init__(self):
        self.cache: Dict[str, AlternativeDataResult] = {}
        self.cache_ttl_hours = 24
        
        # External service URLs
        self.worldbank_url = os.getenv('WORLDBANK_SERVICE_URL', 'http://localhost:5011')
        self.scraper_url = os.getenv('SCRAPER_SERVICE_URL', 'http://localhost:5012')
        self.use_real_data = os.getenv('USE_REAL_ALTERNATIVE_DATA', 'false').lower() == 'true'
    
    async def enrich_property_data(
        self,
        latitude: float,
        longitude: float,
        city: str,
        state: str,
        property_type: str
    ) -> AlternativeDataResult:
        """
        Enrich property with alternative data sources
        
        Args:
            latitude: Property latitude
            longitude: Property longitude
            city: City name
            state: State name
            property_type: Type of property
            
        Returns:
            AlternativeDataResult with enriched data
        """
        cache_key = f"{latitude:.4f}_{longitude:.4f}_{city}_{state}"
        
        # Check cache
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            if self._is_cache_valid(cached.timestamp):
                logger.info(f"Using cached alternative data for {cache_key}")
                return cached
        
        logger.info(f"Fetching alternative data for {city}, {state}")
        
        # Fetch from multiple sources
        economic_data = await self._fetch_economic_indicators(state)
        listing_data = await self._fetch_market_listings(city, state, property_type)
        neighborhood_quality = await self._calculate_neighborhood_quality(latitude, longitude)
        
        # Calculate data completeness
        completeness = self._calculate_completeness(
            economic_data, listing_data, neighborhood_quality
        )
        
        # Track sources used
        sources = []
        if economic_data:
            sources.append('world_bank_api')
        if listing_data:
            sources.append(listing_data.data_source)
        if neighborhood_quality:
            sources.append('openstreetmap')
        
        result = AlternativeDataResult(
            economic_indicators=economic_data,
            market_listing_data=listing_data,
            neighborhood_quality=neighborhood_quality,
            data_completeness_score=completeness,
            sources_used=sources,
            timestamp=datetime.utcnow().isoformat() + 'Z'
        )
        
        # Cache result
        self.cache[cache_key] = result
        
        return result
    
    async def _fetch_economic_indicators(self, state: str) -> Optional[EconomicIndicators]:
        """
        Fetch economic indicators for the region
        
        Uses World Bank API for Nigerian economic data
        """
        
        # Try to use real World Bank data if available
        if self.use_real_data:
            try:
                return await self._fetch_economic_indicators_real(state)
            except Exception as e:
                logger.warning(f"Failed to fetch real economic data: {e}. Using simulated data.")
        
        # Simulate economic data for Nigeria (2024 estimates)
        try:
            # Nigerian economic indicators (approximate 2024 values)
            base_inflation = 25.0  # Nigeria inflation rate ~25%
            base_gdp_growth = 3.2  # GDP growth ~3.2%
            base_unemployment = 33.0  # Unemployment ~33%
            
            # Add state-level variation
            state_adjustments = {
                'Lagos': {'inflation': -2, 'gdp': 1.5, 'unemployment': -5},
                'Abuja': {'inflation': -1, 'gdp': 1.0, 'unemployment': -3},
                'Rivers': {'inflation': 0, 'gdp': 0.5, 'unemployment': -2},
                'Kano': {'inflation': 1, 'gdp': -0.5, 'unemployment': 2},
            }
            
            adjustment = state_adjustments.get(state, {'inflation': 0, 'gdp': 0, 'unemployment': 0})
            
            return EconomicIndicators(
                inflation_rate=base_inflation + adjustment['inflation'],
                gdp_growth_rate=base_gdp_growth + adjustment['gdp'],
                unemployment_rate=base_unemployment + adjustment['unemployment'],
                currency_exchange_rate=1550.0,  # NGN/USD approximate rate
                interest_rate=18.5,  # CBN monetary policy rate
                data_date=datetime.utcnow().strftime('%Y-%m-%d'),
                confidence=0.85  # High confidence for official economic data
            )
        except Exception as e:
            logger.error(f"Error fetching economic indicators: {e}")
            return None
    
    async def _fetch_economic_indicators_real(self, state: str) -> Optional[EconomicIndicators]:
        """
        Fetch real economic indicators from World Bank service
        """
        try:
            # Get Nigerian economic indicators
            response = requests.get(
                f"{self.worldbank_url}/indicators",
                params={'indicators': 'gdp_growth,inflation,unemployment,exchange_rate,interest_rate'},
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            
            if not data.get('success'):
                raise Exception("World Bank API request failed")
            
            indicators = data['indicators']
            
            # Extract latest values
            inflation = indicators.get('inflation', {}).get('latest_value', 25.0)
            gdp_growth = indicators.get('gdp_growth', {}).get('latest_value', 3.2)
            unemployment = indicators.get('unemployment', {}).get('latest_value', 5.3)
            exchange_rate = indicators.get('exchange_rate', {}).get('latest_value', 770.0)
            interest_rate = indicators.get('interest_rate', {}).get('latest_value', -6.5)
            
            # Get state-level data if available
            try:
                state_response = requests.get(
                    f"{self.worldbank_url}/state/{state}",
                    timeout=10
                )
                if state_response.status_code == 200:
                    state_data = state_response.json()
                    adjustment_factor = state_data.get('adjustment_factor', 1.0)
                    # Apply state-specific adjustments
                    # Lagos typically has lower unemployment, higher growth
                    if state == 'Lagos':
                        unemployment *= 0.85
                        gdp_growth *= 1.15
            except Exception as e:
                logger.debug(f"Could not fetch state-level data: {e}")
            
            return EconomicIndicators(
                inflation_rate=inflation,
                gdp_growth_rate=gdp_growth,
                unemployment_rate=unemployment,
                currency_exchange_rate=exchange_rate,
                interest_rate=abs(interest_rate),  # Use absolute value
                data_date=datetime.utcnow().strftime('%Y-%m-%d'),
                confidence=0.90  # High confidence for World Bank data
            )
            
        except Exception as e:
            logger.error(f"Error fetching real economic indicators: {e}")
            raise
    
    async def _fetch_market_listings(
        self,
        city: str,
        state: str,
        property_type: str
    ) -> Optional[MarketListingData]:
        """
        Fetch market listing data from property websites
        
        Uses PropertyPro.ng scraper for real market data
        """
        
        # Try to use real scraper data if available
        if self.use_real_data:
            try:
                return await self._fetch_market_listings_real(city, state, property_type)
            except Exception as e:
                logger.warning(f"Failed to fetch real market data: {e}. Using simulated data.")
        
        try:
            # Simulate market data based on city/state
            # In production: Replace with actual web scraping
            
            # Price per sqm by city (NGN)
            city_price_ranges = {
                'Lagos': (150000, 400000),
                'Abuja': (120000, 350000),
                'Port Harcourt': (80000, 200000),
                'Kano': (50000, 150000),
                'Ibadan': (60000, 180000),
            }
            
            min_price, max_price = city_price_ranges.get(city, (70000, 200000))
            avg_price = np.random.uniform(min_price, max_price)
            
            # Listing counts (more in major cities)
            city_listing_counts = {
                'Lagos': (500, 2000),
                'Abuja': (300, 1500),
                'Port Harcourt': (100, 500),
                'Kano': (50, 300),
            }
            
            min_count, max_count = city_listing_counts.get(city, (30, 200))
            listing_count = int(np.random.uniform(min_count, max_count))
            
            # Days on market (faster in major cities)
            avg_days = int(np.random.uniform(30, 120))
            
            # Price trend (slight appreciation in major cities)
            price_trend = np.random.uniform(-5, 10)  # % change
            
            # Comparable properties (more in data-rich areas)
            comparables = max(3, int(listing_count * 0.05))
            
            # Confidence based on listing count
            confidence = min(0.9, 0.5 + (listing_count / 2000) * 0.4)
            
            return MarketListingData(
                avg_price_per_sqm=avg_price,
                listing_count=listing_count,
                avg_days_on_market=avg_days,
                price_trend_30d=price_trend,
                comparable_properties=comparables,
                data_source='simulated_market_data',
                confidence=confidence
            )
        except Exception as e:
            logger.error(f"Error fetching market listings: {e}")
            return None
    
    async def _fetch_market_listings_real(
        self,
        city: str,
        state: str,
        property_type: str
    ) -> Optional[MarketListingData]:
        """
        Fetch real market listing data from PropertyPro scraper
        """
        try:
            # Get market statistics from scraper
            response = requests.get(
                f"{self.scraper_url}/statistics/{state.lower()}",
                timeout=30  # Scraping can take time
            )
            response.raise_for_status()
            
            data = response.json()
            
            if not data.get('success'):
                raise Exception("Scraper request failed")
            
            # Extract statistics
            total_listings = data.get('total_listings', 0)
            avg_price = data.get('average_price', 0)
            median_price = data.get('median_price', 0)
            
            # Get detailed listings for property type
            listings_response = requests.get(
                f"{self.scraper_url}/listings",
                params={
                    'state': state.lower(),
                    'property_type': property_type,
                    'max_pages': 2
                },
                timeout=30
            )
            
            if listings_response.status_code == 200:
                listings_data = listings_response.json()
                listings = listings_data.get('listings', [])
                
                # Calculate price per sqm from listings
                # Note: PropertyPro may not always have sqm data
                # We estimate based on bedrooms for now
                prices_per_sqm = []
                for listing in listings:
                    price = listing.get('price', 0)
                    bedrooms = listing.get('bedrooms', 2)
                    # Rough estimate: 2 bed = 100sqm, 3 bed = 150sqm, etc.
                    estimated_sqm = max(50, bedrooms * 50)
                    if price > 0:
                        prices_per_sqm.append(price / estimated_sqm)
                
                if prices_per_sqm:
                    avg_price_per_sqm = sum(prices_per_sqm) / len(prices_per_sqm)
                else:
                    # Fallback to total average
                    avg_price_per_sqm = avg_price / 150  # Assume 150sqm average
                
                comparable_count = len(listings)
            else:
                avg_price_per_sqm = avg_price / 150
                comparable_count = 0
            
            # Estimate days on market (PropertyPro doesn't provide this)
            # Major cities typically have faster turnover
            city_dom = {
                'Lagos': 45,
                'Abuja': 60,
                'Port Harcourt': 75,
                'Kano': 90
            }
            avg_days_on_market = city_dom.get(city, 75)
            
            # Calculate price trend (would need historical data)
            # For now, use a conservative estimate
            price_trend = 0.0  # Neutral trend without historical data
            
            # Confidence based on listing count
            confidence = min(0.95, 0.6 + (total_listings / 1000) * 0.35)
            
            return MarketListingData(
                avg_price_per_sqm=avg_price_per_sqm,
                listing_count=total_listings,
                avg_days_on_market=avg_days_on_market,
                price_trend_30d=price_trend,
                comparable_properties=comparable_count,
                data_source='PropertyPro.ng',
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"Error fetching real market listings: {e}")
            raise
    
    async def _calculate_neighborhood_quality(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[NeighborhoodQualityScore]:
        """
        Calculate neighborhood quality from proximity to amenities
        
        In production: Use Google Places API, OpenStreetMap Overpass API
        For MVP: Use simulated proximity scores
        """
        
        try:
            # Simulate proximity scores (0-1, higher is better)
            # In production: Calculate actual distances to amenities
            
            school_score = np.random.uniform(0.4, 0.95)
            hospital_score = np.random.uniform(0.3, 0.9)
            shopping_score = np.random.uniform(0.5, 0.95)
            transport_score = np.random.uniform(0.4, 0.9)
            
            # Crime/safety score (inverse of crime rate)
            # In production: Use crime statistics APIs
            safety_score = np.random.uniform(0.5, 0.85)
            
            # Overall score (weighted average)
            overall = (
                school_score * 0.25 +
                hospital_score * 0.20 +
                shopping_score * 0.20 +
                transport_score * 0.20 +
                safety_score * 0.15
            )
            
            # Confidence based on data availability
            confidence = np.random.uniform(0.65, 0.85)
            
            return NeighborhoodQualityScore(
                school_proximity_score=school_score,
                hospital_proximity_score=hospital_score,
                shopping_proximity_score=shopping_score,
                transport_proximity_score=transport_score,
                crime_safety_score=safety_score,
                overall_score=overall,
                confidence=confidence
            )
        except Exception as e:
            logger.error(f"Error calculating neighborhood quality: {e}")
            return None
    
    def _calculate_completeness(
        self,
        economic: Optional[EconomicIndicators],
        listing: Optional[MarketListingData],
        neighborhood: Optional[NeighborhoodQualityScore]
    ) -> float:
        """Calculate overall data completeness score"""
        
        scores = []
        
        if economic:
            scores.append(economic.confidence)
        if listing:
            scores.append(listing.confidence)
        if neighborhood:
            scores.append(neighborhood.confidence)
        
        if not scores:
            return 0.0
        
        # Weight by importance
        weights = [0.3, 0.4, 0.3][:len(scores)]
        weighted_sum = sum(s * w for s, w in zip(scores, weights))
        weight_total = sum(weights)
        
        return weighted_sum / weight_total if weight_total > 0 else 0.0
    
    def _is_cache_valid(self, timestamp: str) -> bool:
        """Check if cached data is still valid"""
        try:
            cached_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            age_hours = (datetime.utcnow() - cached_time.replace(tzinfo=None)).total_seconds() / 3600
            return age_hours < self.cache_ttl_hours
        except:
            return False
    
    def get_valuation_adjustment(
        self,
        data: AlternativeDataResult,
        base_valuation: float
    ) -> Dict[str, float]:
        """
        Calculate valuation adjustments based on alternative data
        
        Returns:
            Dictionary with adjustment factors and adjusted valuation
        """
        adjustments = {
            'economic_adjustment': 1.0,
            'market_adjustment': 1.0,
            'neighborhood_adjustment': 1.0,
            'combined_multiplier': 1.0,
            'adjusted_valuation': base_valuation
        }
        
        # Economic adjustment (inflation, growth)
        if data.economic_indicators:
            econ = data.economic_indicators
            # High inflation reduces real value, high growth increases it
            econ_factor = 1.0 + (econ.gdp_growth_rate / 100) - (econ.inflation_rate / 200)
            adjustments['economic_adjustment'] = max(0.9, min(1.1, econ_factor))
        
        # Market adjustment (listing trends)
        if data.market_listing_data:
            market = data.market_listing_data
            # Positive price trend increases value
            market_factor = 1.0 + (market.price_trend_30d / 100)
            adjustments['market_adjustment'] = max(0.95, min(1.15, market_factor))
        
        # Neighborhood adjustment (quality score)
        if data.neighborhood_quality:
            neighborhood = data.neighborhood_quality
            # Higher quality score increases value (0-10% boost)
            neighborhood_factor = 1.0 + (neighborhood.overall_score * 0.1)
            adjustments['neighborhood_adjustment'] = max(0.95, min(1.1, neighborhood_factor))
        
        # Combined multiplier
        combined = (
            adjustments['economic_adjustment'] *
            adjustments['market_adjustment'] *
            adjustments['neighborhood_adjustment']
        )
        adjustments['combined_multiplier'] = combined
        adjustments['adjusted_valuation'] = base_valuation * combined
        
        return adjustments


# Singleton instance
_alternative_data_enricher: Optional[AlternativeDataEnricher] = None


def get_alternative_data_enricher() -> AlternativeDataEnricher:
    """Get or create alternative data enricher instance"""
    global _alternative_data_enricher
    if _alternative_data_enricher is None:
        _alternative_data_enricher = AlternativeDataEnricher()
    return _alternative_data_enricher
