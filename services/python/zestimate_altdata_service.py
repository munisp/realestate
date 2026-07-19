"""
Zestimate Alternative Data Service
POI, economic indicators, and behavioral signals enrichment
Supports Manus Google Maps proxy for Places API
"""

import os
import logging
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
PORT = int(os.getenv('PORT', 5005))

# API Keys - prioritize external Google Maps API for production deployment
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

# Manus proxy fallback (only when running inside Manus platform)
MANUS_FORGE_API_KEY = os.getenv('BUILT_IN_FORGE_API_KEY', '')
MANUS_FORGE_API_URL = os.getenv('BUILT_IN_FORGE_API_URL', '')

def get_poi_data(latitude: float, longitude: float, radius: int = 500, poi_type: str = 'restaurant') -> dict:
    """Get POI data from Google Places API"""
    if GOOGLE_MAPS_API_KEY:
        # Direct Google Places API (production)
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            'location': f'{latitude},{longitude}',
            'radius': radius,
            'type': poi_type,
            'key': GOOGLE_MAPS_API_KEY
        }
    elif MANUS_FORGE_API_KEY and MANUS_FORGE_API_URL:
        # Manus proxy fallback
        url = f"{MANUS_FORGE_API_URL}/v1/maps/proxy/maps/api/place/nearbysearch/json"
        params = {
            'location': f'{latitude},{longitude}',
            'radius': radius,
            'type': poi_type,
            'key': MANUS_FORGE_API_KEY
        }
    else:
        # Return mock data
        logger.warning("No Google Maps credentials, returning mock POI data")
        return {
            'count': np.random.randint(10, 30),
            'avg_rating': round(3.5 + np.random.random(), 2),
            'types': [poi_type]
        }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = data.get('results', [])
        ratings = [r.get('rating', 0) for r in results if 'rating' in r]
        
        return {
            'count': len(results),
            'avg_rating': round(sum(ratings) / len(ratings), 2) if ratings else 0,
            'types': list(set([t for r in results for t in r.get('types', [])]))
        }
    except Exception as e:
        logger.error(f"Error fetching POI data: {e}")
        return {'count': 0, 'avg_rating': 0, 'types': []}

def get_economic_indicators(zip_code: str) -> dict:
    """Get economic indicators for a zip code (mock implementation)"""
    # In production, integrate with BLS, Census, or other data sources
    return {
        'unemployment_rate': round(3.0 + np.random.random() * 3.0, 2),
        'wage_growth_yoy': round(1.0 + np.random.random() * 4.0, 2),
        'price_growth_yoy': round(2.0 + np.random.random() * 8.0, 2),
        'median_income': 50000 + np.random.randint(0, 100000)
    }

def get_behavioral_signals(latitude: float, longitude: float) -> dict:
    """Get behavioral signals (mock implementation)"""
    # In production, integrate with search trends, social media, etc.
    return {
        'search_interest_index': 50 + np.random.randint(0, 50),
        'buyer_urgency_score': 40 + np.random.randint(0, 50),
        'market_heat_index': 60 + np.random.randint(0, 35)
    }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    has_maps_api = bool(GOOGLE_MAPS_API_KEY or MANUS_FORGE_API_KEY)
    return jsonify({
        'status': 'healthy',
        'service': 'zestimate-altdata',
        'version': '1.0.0',
        'has_maps_api': has_maps_api,
        'map_source': 'Google Maps' if GOOGLE_MAPS_API_KEY else 'Manus Proxy' if MANUS_FORGE_API_KEY else 'Mock'
    })

@app.route('/enrich-property', methods=['POST'])
def enrich_property():
    """
    Enrich property with alternative data
    
    Request body:
    {
        "id": 1,
        "latitude": 37.7749,
        "longitude": -122.4194,
        "zip_code": "94102"
    }
    """
    try:
        data = request.json
        property_id = data.get('id')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        zip_code = data.get('zip_code', '')
        
        if not all([property_id, latitude, longitude]):
            return jsonify({'error': 'id, latitude, and longitude are required'}), 400
        
        # Get POI data for different categories
        poi_categories = ['restaurant', 'school', 'park', 'transit_station']
        poi_data = {}
        
        for category in poi_categories:
            poi_data[category] = get_poi_data(latitude, longitude, radius=1600, poi_type=category)  # 1 mile
        
        # Calculate amenity density
        amenity_density_025mi = sum(get_poi_data(latitude, longitude, radius=400, poi_type=cat)['count'] for cat in poi_categories)
        amenity_density_05mi = sum(get_poi_data(latitude, longitude, radius=800, poi_type=cat)['count'] for cat in poi_categories)
        amenity_density_1mi = sum(poi_data[cat]['count'] for cat in poi_categories)
        
        # Get economic indicators
        economic_data = get_economic_indicators(zip_code)
        
        # Get behavioral signals
        behavioral_data = get_behavioral_signals(latitude, longitude)
        
        # Calculate walkability score
        walkability = min(100, 50 + amenity_density_025mi * 2)
        
        return jsonify({
            'property_id': property_id,
            'walkability_score': walkability,
            'amenity_density_025mi': amenity_density_025mi,
            'amenity_density_05mi': amenity_density_05mi,
            'amenity_density_1mi': amenity_density_1mi,
            'restaurant_quality_avg': poi_data['restaurant']['avg_rating'],
            'school_quality_proxy': min(100, poi_data['school']['count'] * 10),
            'retail_accessibility': min(100, poi_data['restaurant']['count'] * 3),
            **economic_data,
            **behavioral_data,
            'poi_breakdown': poi_data
        })
        
    except Exception as e:
        logger.error(f"Enrichment error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info(f"Starting Zestimate Alternative Data Service on port {PORT}")
    map_source = 'Google Maps' if GOOGLE_MAPS_API_KEY else 'Manus Proxy' if MANUS_FORGE_API_KEY else 'Mock'
    logger.info(f"Maps API: {map_source}")
    if not (GOOGLE_MAPS_API_KEY or MANUS_FORGE_API_KEY):
        logger.warning("No Google Maps API key configured. Using mock POI data. Set GOOGLE_MAPS_API_KEY environment variable.")
    app.run(host='0.0.0.0', port=PORT, debug=False)
