"""
Zestimate Computer Vision Service
Property assessment using aerial and street view imagery
Supports both Manus Google Maps proxy and OpenStreetMap fallback
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
PORT = int(os.getenv('PORT', 5004))

# API Keys - prioritize external Google Maps API for production deployment
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

# Manus proxy fallback (only when running inside Manus platform)
MANUS_FORGE_API_KEY = os.getenv('BUILT_IN_FORGE_API_KEY', '')
MANUS_FORGE_API_URL = os.getenv('BUILT_IN_FORGE_API_URL', '')

# OpenStreetMap fallback
USE_OSM = os.getenv('USE_OSM', 'false').lower() == 'true'

def get_aerial_image_url(latitude: float, longitude: float) -> str:
    """Get aerial imagery URL from Google Maps or OSM"""
    if not USE_OSM and GOOGLE_MAPS_API_KEY:
        # Direct Google Maps API (production)
        base_url = "https://maps.googleapis.com/maps/api/staticmap"
        return f"{base_url}?center={latitude},{longitude}&zoom=18&size=640x640&maptype=satellite&key={GOOGLE_MAPS_API_KEY}"
    elif not USE_OSM and MANUS_FORGE_API_KEY and MANUS_FORGE_API_URL:
        # Manus proxy fallback (when running inside Manus)
        base_url = f"{MANUS_FORGE_API_URL}/v1/maps/proxy/maps/api/staticmap"
        return f"{base_url}?center={latitude},{longitude}&zoom=18&size=640x640&maptype=satellite&key={MANUS_FORGE_API_KEY}"
    else:
        # OpenStreetMap fallback
        zoom = 18
        n = 2.0 ** zoom
        xtile = int((longitude + 180.0) / 360.0 * n)
        ytile = int((1.0 - np.log(np.tan(np.radians(latitude)) + (1 / np.cos(np.radians(latitude)))) / np.pi) / 2.0 * n)
        return f"https://tile.openstreetmap.org/{zoom}/{xtile}/{ytile}.png"

def get_street_view_url(latitude: float, longitude: float) -> str:
    """Get street view imagery URL (Google Maps only)"""
    if GOOGLE_MAPS_API_KEY:
        # Direct Google Maps API (production)
        base_url = "https://maps.googleapis.com/maps/api/streetview"
        return f"{base_url}?size=640x640&location={latitude},{longitude}&key={GOOGLE_MAPS_API_KEY}"
    elif MANUS_FORGE_API_KEY and MANUS_FORGE_API_URL:
        # Manus proxy fallback
        base_url = f"{MANUS_FORGE_API_URL}/v1/maps/proxy/maps/api/streetview"
        return f"{base_url}?size=640x640&location={latitude},{longitude}&key={MANUS_FORGE_API_KEY}"
    else:
        return None

def analyze_aerial_image(image_url: str) -> dict:
    """Analyze aerial imagery (mock implementation)"""
    # In production, use OpenCV/PIL to analyze actual image
    # For now, return mock analysis
    return {
        'roof_condition': np.random.choice(['excellent', 'good', 'fair', 'poor'], p=[0.3, 0.4, 0.2, 0.1]),
        'has_pool': np.random.random() > 0.8,
        'has_solar_panels': np.random.random() > 0.7,
        'has_deck': np.random.random() > 0.6,
        'vegetation_index': round(0.3 + np.random.random() * 0.4, 4),
        'lot_size_estimate': round(3000 + np.random.random() * 2000, 2)
    }

def analyze_street_view(image_url: str) -> dict:
    """Analyze street view imagery (mock implementation)"""
    if not image_url:
        return {
            'curb_appeal': 50,
            'exterior_condition': 'unknown',
            'parking_spaces': 0,
            'walkability_score': 50
        }
    
    return {
        'curb_appeal': 60 + np.random.randint(0, 35),
        'exterior_condition': np.random.choice(['excellent', 'good', 'fair'], p=[0.3, 0.5, 0.2]),
        'parking_spaces': np.random.randint(1, 4),
        'walkability_score': 70 + np.random.randint(0, 25)
    }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    map_source = 'OpenStreetMap' if USE_OSM else 'Google Maps' if GOOGLE_MAPS_API_KEY else 'Google Maps (Manus Proxy)' if MANUS_FORGE_API_KEY else 'None'
    return jsonify({
        'status': 'healthy',
        'service': 'zestimate-cv',
        'version': '1.0.0',
        'map_source': map_source,
        'has_street_view': bool(GOOGLE_MAPS_API_KEY or MANUS_FORGE_API_KEY)
    })

@app.route('/assess-property', methods=['POST'])
def assess_property():
    """
    Assess property using computer vision
    
    Request body:
    {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "include_street_view": true
    }
    """
    try:
        data = request.json
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        include_street_view = data.get('include_street_view', True)
        
        if not all([latitude, longitude]):
            return jsonify({'error': 'latitude and longitude are required'}), 400
        
        # Get image URLs
        aerial_url = get_aerial_image_url(latitude, longitude)
        street_url = get_street_view_url(latitude, longitude) if include_street_view else None
        
        # Analyze images
        aerial_analysis = analyze_aerial_image(aerial_url)
        street_analysis = analyze_street_view(street_url) if street_url else {}
        
        # Calculate overall condition score
        condition_scores = {
            'excellent': 95,
            'good': 80,
            'fair': 65,
            'poor': 40,
            'unknown': 50
        }
        
        roof_score = condition_scores.get(aerial_analysis['roof_condition'], 50)
        exterior_score = condition_scores.get(street_analysis.get('exterior_condition', 'unknown'), 50)
        overall_score = int((roof_score + exterior_score) / 2)
        
        # Determine overall condition
        if overall_score >= 85:
            overall_condition = 'excellent'
        elif overall_score >= 70:
            overall_condition = 'good'
        else:
            overall_condition = 'fair'
        
        return jsonify({
            'aerial_image_url': aerial_url,
            'street_view_url': street_url,
            'aerial_analysis': aerial_analysis,
            'street_analysis': street_analysis,
            'overall_condition': overall_condition,
            'condition_score': overall_score,
            'map_source': 'OpenStreetMap' if USE_OSM else 'Google Maps'
        })
        
    except Exception as e:
        logger.error(f"Assessment error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info(f"Starting Zestimate CV Service on port {PORT}")
    map_source = 'OpenStreetMap' if USE_OSM else 'Google Maps' if GOOGLE_MAPS_API_KEY else 'Google Maps (Manus Proxy)' if MANUS_FORGE_API_KEY else 'No API Key'
    logger.info(f"Map source: {map_source}")
    if not (GOOGLE_MAPS_API_KEY or MANUS_FORGE_API_KEY or USE_OSM):
        logger.warning("No Google Maps API key configured. Set GOOGLE_MAPS_API_KEY environment variable.")
    app.run(host='0.0.0.0', port=PORT, debug=False)
