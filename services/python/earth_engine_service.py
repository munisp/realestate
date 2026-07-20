"""
Google Earth Engine Integration Service
Provides satellite imagery analysis for property valuation using Sentinel-2 data
"""

import os
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import requests

# Note: earthengine-api requires authentication setup
# For production: pip install earthengine-api
# For development: using mock data

from shared.logger import get_logger
logger = get_logger("earth-engine-service")


class EarthEngineService:
    """Service for fetching and analyzing satellite imagery from Google Earth Engine"""
    
    def __init__(self):
        self.use_mock = os.getenv('USE_MOCK_EARTH_ENGINE', 'true').lower() == 'true'
        self.project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'your-project-id')
        self.initialized = False
        
        if not self.use_mock:
            try:
                import ee
                self.ee = ee
                # Initialize Earth Engine with service account or user credentials
                credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
                if credentials_path and os.path.exists(credentials_path):
                    # Service account authentication
                    credentials = ee.ServiceAccountCredentials(
                        email=None,  # Will be read from credentials file
                        key_file=credentials_path
                    )
                    ee.Initialize(credentials=credentials, project=self.project_id)
                else:
                    # User authentication (requires prior ee.Authenticate())
                    ee.Initialize(project=self.project_id)
                
                self.initialized = True
                logger.info("Earth Engine initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Earth Engine: {e}. Using mock data.")
                self.use_mock = True
        else:
            logger.info("Using mock Earth Engine data (set USE_MOCK_EARTH_ENGINE=false for production)")
    
    def get_satellite_imagery(
        self,
        latitude: float,
        longitude: float,
        buffer_meters: int = 100,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict:
        """
        Fetch satellite imagery for a property location
        
        Args:
            latitude: Property latitude
            longitude: Property longitude
            buffer_meters: Buffer around point (default 100m for property)
            start_date: Start date for imagery (YYYY-MM-DD)
            end_date: End date for imagery (YYYY-MM-DD)
        
        Returns:
            Dict with imagery data and metadata
        """
        if self.use_mock:
            return self._get_mock_imagery(latitude, longitude, buffer_meters)
        
        try:
            # Default to last 6 months
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            if not start_date:
                start_date = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
            
            # Create point geometry
            point = self.ee.Geometry.Point([longitude, latitude])
            region = point.buffer(buffer_meters).bounds()
            
            # Get Sentinel-2 imagery
            collection = (self.ee.ImageCollection('COPERNICUS/S2_SR')
                         .filterBounds(point)
                         .filterDate(start_date, end_date)
                         .filter(self.ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                         .sort('CLOUDY_PIXEL_PERCENTAGE'))
            
            # Get the least cloudy image
            image = collection.first()
            
            if image is None:
                logger.warning(f"No imagery found for {latitude}, {longitude}")
                return self._get_mock_imagery(latitude, longitude, buffer_meters)
            
            # Get image metadata
            info = image.getInfo()
            
            # Calculate spectral indices
            ndvi = self._calculate_ndvi(image)
            ndbi = self._calculate_ndbi(image)
            
            # Get pixel values for the region
            ndvi_stats = ndvi.reduceRegion(
                reducer=self.ee.Reducer.mean(),
                geometry=region,
                scale=10
            ).getInfo()
            
            ndbi_stats = ndbi.reduceRegion(
                reducer=self.ee.Reducer.mean(),
                geometry=region,
                scale=10
            ).getInfo()
            
            return {
                'success': True,
                'latitude': latitude,
                'longitude': longitude,
                'buffer_meters': buffer_meters,
                'acquisition_date': info['properties'].get('system:time_start'),
                'cloud_coverage': info['properties'].get('CLOUDY_PIXEL_PERCENTAGE', 0),
                'satellite': 'Sentinel-2',
                'resolution_meters': 10,
                'indices': {
                    'ndvi': ndvi_stats.get('NDVI', 0),
                    'ndbi': ndbi_stats.get('NDBI', 0)
                },
                'bands': {
                    'red': 'B4',
                    'green': 'B3',
                    'blue': 'B2',
                    'nir': 'B8',
                    'swir1': 'B11',
                    'swir2': 'B12'
                }
            }
            
        except Exception as e:
            logger.error(f"Error fetching satellite imagery: {e}")
            return self._get_mock_imagery(latitude, longitude, buffer_meters)
    
    def _calculate_ndvi(self, image):
        """Calculate Normalized Difference Vegetation Index"""
        nir = image.select('B8')
        red = image.select('B4')
        ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
        return ndvi
    
    def _calculate_ndbi(self, image):
        """Calculate Normalized Difference Built-up Index"""
        swir = image.select('B11')
        nir = image.select('B8')
        ndbi = swir.subtract(nir).divide(swir.add(nir)).rename('NDBI')
        return ndbi
    
    def analyze_building_features(
        self,
        latitude: float,
        longitude: float,
        buffer_meters: int = 100
    ) -> Dict:
        """
        Analyze building features from satellite imagery
        
        Returns:
            Dict with building detection, height estimation, roof classification
        """
        if self.use_mock:
            return self._get_mock_building_analysis(latitude, longitude)
        
        try:
            imagery = self.get_satellite_imagery(latitude, longitude, buffer_meters)
            
            if not imagery.get('success'):
                return self._get_mock_building_analysis(latitude, longitude)
            
            ndvi = imagery['indices']['ndvi']
            ndbi = imagery['indices']['ndbi']
            
            # Building detection using NDBI
            # NDBI > 0 typically indicates built-up areas
            building_detected = ndbi > 0
            building_confidence = min(abs(ndbi) * 100, 100) if building_detected else 0
            
            # Estimate building height from shadow analysis
            # This is simplified - production would use more sophisticated methods
            estimated_height = self._estimate_height_from_shadow(
                latitude, longitude, buffer_meters
            )
            
            # Classify roof material from spectral signature
            roof_type = self._classify_roof_material(imagery)
            
            return {
                'success': True,
                'building_detected': building_detected,
                'detection_confidence': building_confidence,
                'estimated_height_meters': estimated_height,
                'roof_material': roof_type,
                'vegetation_index': ndvi,
                'built_up_index': ndbi,
                'analysis_date': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing building features: {e}")
            return self._get_mock_building_analysis(latitude, longitude)
    
    def _estimate_height_from_shadow(
        self,
        latitude: float,
        longitude: float,
        buffer_meters: int
    ) -> float:
        """
        Estimate building height from shadow analysis
        Simplified version - production would use DEM and solar angle calculations
        """
        # Mock implementation
        # In production, this would:
        # 1. Get solar angle at acquisition time
        # 2. Measure shadow length
        # 3. Calculate height: height = shadow_length * tan(solar_elevation)
        
        # Return mock value based on location (Lagos properties typically 1-3 stories)
        import random
        return random.uniform(3.0, 12.0)  # 3-12 meters (1-4 stories)
    
    def _classify_roof_material(self, imagery: Dict) -> str:
        """
        Classify roof material from spectral signature
        Simplified version - production would use ML model
        """
        # Mock implementation
        # In production, this would analyze:
        # - Reflectance patterns across bands
        # - Texture from high-res imagery
        # - Thermal properties if available
        
        ndbi = imagery['indices']['ndbi']
        
        # Simple heuristic based on NDBI
        if ndbi > 0.3:
            return 'metal'  # High reflectance
        elif ndbi > 0.1:
            return 'concrete'
        else:
            return 'tile'
    
    def _get_mock_imagery(
        self,
        latitude: float,
        longitude: float,
        buffer_meters: int
    ) -> Dict:
        """Return mock satellite imagery data for development"""
        return {
            'success': True,
            'latitude': latitude,
            'longitude': longitude,
            'buffer_meters': buffer_meters,
            'acquisition_date': int(datetime.now().timestamp() * 1000),
            'cloud_coverage': 5.2,
            'satellite': 'Sentinel-2 (Mock)',
            'resolution_meters': 10,
            'indices': {
                'ndvi': 0.15,  # Low vegetation (urban area)
                'ndbi': 0.35   # High built-up index
            },
            'bands': {
                'red': 'B4',
                'green': 'B3',
                'blue': 'B2',
                'nir': 'B8',
                'swir1': 'B11',
                'swir2': 'B12'
            },
            'mock': True
        }
    
    def _get_mock_building_analysis(
        self,
        latitude: float,
        longitude: float
    ) -> Dict:
        """Return mock building analysis for development"""
        import random
        
        return {
            'success': True,
            'building_detected': True,
            'detection_confidence': 85.0,
            'estimated_height_meters': random.uniform(3.0, 12.0),
            'roof_material': random.choice(['metal', 'concrete', 'tile']),
            'vegetation_index': 0.15,
            'built_up_index': 0.35,
            'analysis_date': datetime.now().isoformat(),
            'mock': True
        }


# Flask API endpoints
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Initialize service
earth_engine_service = EarthEngineService()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'earth-engine',
        'initialized': earth_engine_service.initialized,
        'mock_mode': earth_engine_service.use_mock
    })


@app.route('/imagery', methods=['POST'])
def get_imagery():
    """Get satellite imagery for a location"""
    data = request.json
    
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    buffer_meters = data.get('buffer_meters', 100)
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if latitude is None or longitude is None:
        return jsonify({'error': 'latitude and longitude are required'}), 400
    
    result = earth_engine_service.get_satellite_imagery(
        latitude=latitude,
        longitude=longitude,
        buffer_meters=buffer_meters,
        start_date=start_date,
        end_date=end_date
    )
    
    return jsonify(result)


@app.route('/building-analysis', methods=['POST'])
def analyze_building():
    """Analyze building features from satellite imagery"""
    data = request.json
    
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    buffer_meters = data.get('buffer_meters', 100)
    
    if latitude is None or longitude is None:
        return jsonify({'error': 'latitude and longitude are required'}), 400
    
    result = earth_engine_service.analyze_building_features(
        latitude=latitude,
        longitude=longitude,
        buffer_meters=buffer_meters
    )
    
    return jsonify(result)


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5010))
    app.run(host='0.0.0.0', port=port, debug=True)
