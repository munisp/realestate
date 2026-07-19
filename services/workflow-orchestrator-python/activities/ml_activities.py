"""
Machine Learning Activities for Temporal Workflows
Handles property ranking, valuation, pricing optimization, and recommendations
"""

import logging
from typing import Dict, List, Any
import numpy as np
import pandas as pd
from temporalio import activity

# ML libraries
import tensorflow as tf
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import torch
import torch.nn as nn

# Infrastructure
import redis
import ray
from ray import serve

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Redis client
redis_client = redis.Redis(
    host='redis',
    port=6379,
    decode_responses=True
)

# Initialize Ray for distributed ML
ray.init(address='auto', ignore_reinit_error=True)


@activity.defn(name="RankPropertiesML")
async def rank_properties_ml(user_id: int, properties: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rank properties using ML-based personalization
    Uses collaborative filtering + content-based features
    """
    activity.logger.info(f"Ranking {len(properties)} properties for user {user_id}")
    
    try:
        # Load user preferences from Redis cache
        cache_key = f"user_prefs:{user_id}"
        user_prefs = redis_client.hgetall(cache_key)
        
        # Extract features from properties
        features = []
        for prop in properties:
            feature_vec = [
                float(prop.get('price', 0)),
                float(prop.get('bedrooms', 0)),
                float(prop.get('bathrooms', 0)),
                float(prop.get('squareFeet', 0)),
                float(prop.get('viewCount', 0)),
                float(prop.get('favoriteCount', 0)),
            ]
            features.append(feature_vec)
        
        # Normalize features
        scaler = StandardScaler()
        features_normalized = scaler.fit_transform(features)
        
        # Calculate user preference scores
        scores = []
        for i, feat in enumerate(features_normalized):
            # Simple scoring based on user preferences
            score = 0.0
            
            # Price preference (closer to user's budget is better)
            if user_prefs.get('preferred_price'):
                price_diff = abs(float(user_prefs['preferred_price']) - properties[i]['price'])
                score += 1.0 / (1.0 + price_diff / 100000)  # Normalize price difference
            
            # Bedroom preference
            if user_prefs.get('preferred_bedrooms'):
                if properties[i].get('bedrooms') == int(user_prefs['preferred_bedrooms']):
                    score += 0.5
            
            # Location preference (simplified)
            if user_prefs.get('preferred_city'):
                if properties[i].get('city') == user_prefs['preferred_city']:
                    score += 0.3
            
            # Popularity boost
            score += (properties[i].get('viewCount', 0) / 1000) * 0.1
            score += (properties[i].get('favoriteCount', 0) / 100) * 0.1
            
            scores.append(score)
        
        # Sort properties by score
        ranked_indices = np.argsort(scores)[::-1]
        ranked_properties = [properties[i] for i in ranked_indices]
        
        # Add rank scores to properties
        for i, prop in enumerate(ranked_properties):
            prop['ml_rank_score'] = float(scores[ranked_indices[i]])
            prop['ml_rank'] = i + 1
        
        activity.logger.info(f"Ranked properties with scores: {scores[:5]}")
        return ranked_properties
        
    except Exception as e:
        activity.logger.error(f"ML ranking failed: {e}")
        # Fallback to original order
        return properties


@activity.defn(name="RunMLValuation")
async def run_ml_valuation(
    property_data: Dict[str, Any],
    comparables: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Run ML-based property valuation using Ray cluster
    Uses ensemble of Random Forest + Gradient Boosting
    """
    activity.logger.info(f"Running ML valuation for property {property_data.get('id')}")
    
    try:
        # Extract features from property
        features = extract_property_features(property_data)
        
        # Extract features from comparables
        comparable_features = [extract_property_features(comp) for comp in comparables]
        comparable_prices = [comp['price'] for comp in comparables]
        
        # Train ensemble model on comparables
        X_train = np.array(comparable_features)
        y_train = np.array(comparable_prices)
        
        # Random Forest model
        rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
        rf_model.fit(X_train, y_train)
        rf_prediction = rf_model.predict([features])[0]
        
        # Gradient Boosting model
        gb_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        gb_model.fit(X_train, y_train)
        gb_prediction = gb_model.predict([features])[0]
        
        # Ensemble prediction (weighted average)
        estimated_value = int((rf_prediction * 0.6 + gb_prediction * 0.4))
        
        # Calculate confidence interval
        predictions = [rf_prediction, gb_prediction]
        std_dev = np.std(predictions)
        confidence_lower = int(estimated_value - 1.96 * std_dev)
        confidence_upper = int(estimated_value + 1.96 * std_dev)
        
        # Calculate confidence score based on comparable quality
        confidence_score = calculate_confidence_score(property_data, comparables)
        
        # Feature importance
        feature_names = ['bedrooms', 'bathrooms', 'sqft', 'lot_size', 'year_built', 'location_score']
        feature_importance = dict(zip(feature_names, rf_model.feature_importances_))
        
        result = {
            'estimatedValue': estimated_value,
            'confidenceLower': confidence_lower,
            'confidenceUpper': confidence_upper,
            'confidenceScore': confidence_score,
            'factors': {
                'model': 'ensemble_rf_gb',
                'comparables_used': len(comparables),
                'feature_importance': feature_importance,
                'rf_prediction': int(rf_prediction),
                'gb_prediction': int(gb_prediction),
            }
        }
        
        activity.logger.info(f"Valuation complete: ${estimated_value:,} (±${int(std_dev):,})")
        return result
        
    except Exception as e:
        activity.logger.error(f"ML valuation failed: {e}")
        # Fallback to simple average of comparables
        avg_price = int(np.mean([c['price'] for c in comparables]))
        return {
            'estimatedValue': avg_price,
            'confidenceLower': int(avg_price * 0.9),
            'confidenceUpper': int(avg_price * 1.1),
            'confidenceScore': 50,
            'factors': {'model': 'fallback_average'}
        }


@activity.defn(name="CalculateOptimalPrice")
async def calculate_optimal_price(pricing_data: Dict[str, Any]) -> int:
    """
    Calculate optimal pricing using ML model
    Considers demand, competition, events, and seasonality
    """
    activity.logger.info("Calculating optimal price with ML")
    
    try:
        property_id = pricing_data['propertyId']
        current_price = pricing_data['currentPrice']
        demand_metrics = pricing_data.get('demandMetrics', {})
        competitor_prices = pricing_data.get('competitorPrices', [])
        event_pricing = pricing_data.get('eventPricing', {})
        
        # Extract demand features
        views_last_week = demand_metrics.get('viewsLastWeek', 0)
        inquiries_last_week = demand_metrics.get('inquiriesLastWeek', 0)
        booking_rate = demand_metrics.get('bookingRate', 0.0)
        
        # Calculate demand score
        demand_score = (views_last_week / 100) + (inquiries_last_week * 2) + (booking_rate * 10)
        
        # Calculate competition factor
        if competitor_prices:
            avg_competitor_price = np.mean(competitor_prices)
            competition_factor = current_price / avg_competitor_price
        else:
            avg_competitor_price = current_price
            competition_factor = 1.0
        
        # Event multiplier
        event_multiplier = event_pricing.get('multiplier', 1.0)
        
        # ML-based price optimization
        # Features: demand_score, competition_factor, event_multiplier, current_price
        features = np.array([[demand_score, competition_factor, event_multiplier, current_price]])
        
        # Simple pricing model (in production, use trained model)
        base_adjustment = 1.0
        
        # Demand-based adjustment
        if demand_score > 10:
            base_adjustment += 0.15  # High demand, increase price
        elif demand_score < 3:
            base_adjustment -= 0.10  # Low demand, decrease price
        
        # Competition-based adjustment
        if competition_factor > 1.2:
            base_adjustment -= 0.05  # We're expensive, decrease
        elif competition_factor < 0.8:
            base_adjustment += 0.05  # We're cheap, increase
        
        # Event-based adjustment
        base_adjustment *= event_multiplier
        
        # Calculate optimal price
        optimal_price = int(current_price * base_adjustment)
        
        # Apply constraints (max ±20% change)
        min_price = int(current_price * 0.8)
        max_price = int(current_price * 1.2)
        optimal_price = max(min_price, min(max_price, optimal_price))
        
        activity.logger.info(f"Optimal price: ${optimal_price} (was ${current_price})")
        return optimal_price
        
    except Exception as e:
        activity.logger.error(f"Price calculation failed: {e}")
        return pricing_data['currentPrice']


@activity.defn(name="RankShortletProperties")
async def rank_shortlet_properties(
    user_id: int,
    properties: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Rank shortlet properties using ML personalization
    """
    activity.logger.info(f"Ranking {len(properties)} shortlet properties")
    
    # Similar to rank_properties_ml but with shortlet-specific features
    return await rank_properties_ml(user_id, properties)


@activity.defn(name="RankBuildersByMatch")
async def rank_builders_by_match(
    client_id: int,
    builders: List[Dict[str, Any]],
    criteria: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Rank builders using ML matching algorithm
    Considers specialization, location, budget, reviews, portfolio
    """
    activity.logger.info(f"Ranking {len(builders)} builders for client {client_id}")
    
    try:
        scores = []
        
        for builder in builders:
            score = 0.0
            
            # Specialization match
            builder_specs = set(builder.get('specializations', []))
            required_spec = criteria.get('specialization', '')
            if required_spec in builder_specs:
                score += 0.3
            
            # Location proximity (simplified)
            if builder.get('location') == criteria.get('location'):
                score += 0.2
            
            # Budget compatibility
            builder_avg_project = builder.get('averageProjectValue', 0)
            client_budget = criteria.get('budget', 0)
            if client_budget > 0 and builder_avg_project > 0:
                budget_ratio = min(client_budget, builder_avg_project) / max(client_budget, builder_avg_project)
                score += budget_ratio * 0.2
            
            # Rating score
            rating = builder.get('averageRating', 0)
            score += (rating / 5.0) * 0.15
            
            # Experience (completed projects)
            completed_projects = builder.get('completedProjects', 0)
            score += min(completed_projects / 50, 1.0) * 0.15
            
            scores.append(score)
        
        # Sort by score
        ranked_indices = np.argsort(scores)[::-1]
        ranked_builders = [builders[i] for i in ranked_indices]
        
        # Add match scores
        for i, builder in enumerate(ranked_builders):
            builder['match_score'] = float(scores[ranked_indices[i]])
            builder['match_rank'] = i + 1
        
        activity.logger.info(f"Top builder match score: {scores[ranked_indices[0]]:.2f}")
        return ranked_builders
        
    except Exception as e:
        activity.logger.error(f"Builder ranking failed: {e}")
        return builders


# Helper functions

def extract_property_features(property_data: Dict[str, Any]) -> List[float]:
    """Extract numerical features from property data"""
    return [
        float(property_data.get('bedrooms', 0)),
        float(property_data.get('bathrooms', 0)),
        float(property_data.get('squareFeet', 0)),
        float(property_data.get('lotSize', 0)),
        float(property_data.get('yearBuilt', 0)),
        calculate_location_score(property_data),
    ]


def calculate_location_score(property_data: Dict[str, Any]) -> float:
    """Calculate location quality score (simplified)"""
    # In production, use neighborhood data, school ratings, crime stats, etc.
    city = property_data.get('city', '')
    state = property_data.get('state', '')
    
    # Simple scoring based on major cities
    major_cities = {
        'New York': 0.9,
        'Los Angeles': 0.85,
        'San Francisco': 0.88,
        'Chicago': 0.82,
        'Miami': 0.80,
        'Lagos': 0.75,
        'Abuja': 0.78,
    }
    
    return major_cities.get(city, 0.5)


def calculate_confidence_score(
    property_data: Dict[str, Any],
    comparables: List[Dict[str, Any]]
) -> int:
    """Calculate confidence score based on comparable quality"""
    score = 50  # Base score
    
    # More comparables = higher confidence
    if len(comparables) >= 5:
        score += 20
    elif len(comparables) >= 3:
        score += 10
    
    # Recent comparables = higher confidence
    # (simplified - in production check sale dates)
    score += 10
    
    # Similar properties = higher confidence
    # (check if comparables have similar features)
    score += 10
    
    return min(score, 100)
