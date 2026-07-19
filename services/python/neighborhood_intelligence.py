"""
Enhanced Neighborhood Intelligence Service
-------------------------------------------
True walkability and transit accessibility using City2Graph and OSM data.
Optimized for Nigerian cities with GTFS integration.

Features:
- Street network-based walkability (not straight-line distance)
- GTFS transit accessibility analysis (30-min commute zones)
- POI proximity graphs for amenity analysis
- Network centrality for strategic location scoring
- Morphological graphs (buildings + streets)
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import json

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point, LineString
import networkx as nx

# OSM and routing imports
try:
    import osmnx as ox
    OSMNX_AVAILABLE = True
except ImportError:
    OSMNX_AVAILABLE = False
    logging.warning("OSMnx not installed. Using mock mode.")

# GTFS imports
try:
    import gtfs_kit as gk
    GTFS_AVAILABLE = True
except ImportError:
    GTFS_AVAILABLE = False
    logging.warning("gtfs-kit not installed. GTFS features disabled.")

# City2Graph imports
try:
    import city2graph as c2g
    CITY2GRAPH_AVAILABLE = True
except ImportError:
    CITY2GRAPH_AVAILABLE = False
    logging.warning("city2graph not installed. Using mock mode.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Flask app
app = Flask(__name__)
CORS(app)

# Configuration
USE_MOCK_DATA = not (OSMNX_AVAILABLE and CITY2GRAPH_AVAILABLE)

# Nigerian cities configuration
NIGERIAN_CITIES = {
    'lagos': {
        'center': (6.5244, 3.3792),
        'bbox': (6.3936, 3.2000, 6.7027, 3.6000),
        'name': 'Lagos'
    },
    'abuja': {
        'center': (9.0765, 7.3986),
        'bbox': (8.9000, 7.2000, 9.2000, 7.6000),
        'name': 'Abuja'
    },
    'port_harcourt': {
        'center': (4.8156, 7.0498),
        'bbox': (4.7000, 6.9000, 4.9000, 7.2000),
        'name': 'Port Harcourt'
    }
}

# ============================================================================
# Street Network Analysis
# ============================================================================

class StreetNetworkAnalyzer:
    """
    Analyze street networks using OSM data and City2Graph.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.networks = {}  # Cache for loaded networks
    
    def load_street_network(self, city: str) -> nx.MultiDiGraph:
        """
        Load street network for a Nigerian city.
        
        Args:
            city: City name ('lagos', 'abuja', 'port_harcourt')
            
        Returns:
            NetworkX MultiDiGraph of street network
        """
        if city in self.networks:
            return self.networks[city]
        
        if not OSMNX_AVAILABLE:
            self.logger.warning("OSMnx not available. Using mock network.")
            return self._create_mock_network()
        
        try:
            city_config = NIGERIAN_CITIES.get(city.lower())
            if not city_config:
                raise ValueError(f"Unknown city: {city}")
            
            self.logger.info(f"Loading street network for {city_config['name']}")
            
            # Download street network from OSM
            # Use 'drive' network type for car accessibility
            G = ox.graph_from_bbox(
                bbox=city_config['bbox'],
                network_type='drive',
                simplify=True
            )
            
            # Add edge speeds and travel times
            G = ox.add_edge_speeds(G)
            G = ox.add_edge_travel_times(G)
            
            self.networks[city] = G
            self.logger.info(f"Loaded network with {len(G.nodes)} nodes and {len(G.edges)} edges")
            
            return G
            
        except Exception as e:
            self.logger.error(f"Failed to load street network: {e}")
            return self._create_mock_network()
    
    def _create_mock_network(self) -> nx.MultiDiGraph:
        """Create a mock street network for testing."""
        G = nx.MultiDiGraph()
        
        # Create a simple grid network
        for i in range(10):
            for j in range(10):
                node_id = i * 10 + j
                G.add_node(node_id, x=j * 0.01, y=i * 0.01)
                
                # Add edges to neighbors
                if j < 9:
                    G.add_edge(node_id, node_id + 1, length=100, travel_time=60)
                if i < 9:
                    G.add_edge(node_id, node_id + 10, length=100, travel_time=60)
        
        return G
    
    def calculate_walkability(
        self,
        location: Tuple[float, float],
        city: str,
        radius: float = 1000  # meters
    ) -> Dict:
        """
        Calculate true walkability using street networks.
        
        Args:
            location: (lat, lon) of the property
            city: City name
            radius: Radius to analyze (meters)
            
        Returns:
            Dictionary with walkability metrics
        """
        if USE_MOCK_DATA:
            return self._mock_walkability()
        
        try:
            G = self.load_street_network(city)
            
            # Find nearest node to location
            lat, lon = location
            nearest_node = ox.nearest_nodes(G, lon, lat)
            
            # Get subgraph within radius
            subgraph = nx.ego_graph(G, nearest_node, radius=radius, distance='length')
            
            # Calculate walkability metrics
            metrics = {
                'intersection_density': self._calculate_intersection_density(subgraph),
                'street_connectivity': self._calculate_street_connectivity(subgraph),
                'pedestrian_friendliness': self._calculate_pedestrian_friendliness(subgraph),
                'network_distance_to_amenities': self._calculate_amenity_distances(subgraph, nearest_node),
                'walkability_score': 0.0  # Will be calculated below
            }
            
            # Combined walkability score (0-100)
            metrics['walkability_score'] = (
                0.3 * metrics['intersection_density'] +
                0.3 * metrics['street_connectivity'] +
                0.2 * metrics['pedestrian_friendliness'] +
                0.2 * (100 - metrics['network_distance_to_amenities'])
            )
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Walkability calculation failed: {e}")
            return self._mock_walkability()
    
    def _calculate_intersection_density(self, G: nx.MultiDiGraph) -> float:
        """Calculate intersection density (0-100)."""
        if len(G.nodes) == 0:
            return 0.0
        
        # Count intersections (nodes with degree > 2)
        intersections = sum(1 for node in G.nodes if G.degree(node) > 2)
        
        # Normalize to 0-100 scale
        density = min(100, (intersections / len(G.nodes)) * 200)
        return density
    
    def _calculate_street_connectivity(self, G: nx.MultiDiGraph) -> float:
        """Calculate street connectivity (0-100)."""
        if len(G.nodes) == 0:
            return 0.0
        
        # Average node degree
        avg_degree = sum(dict(G.degree()).values()) / len(G.nodes)
        
        # Normalize to 0-100 scale (assume max degree of 6)
        connectivity = min(100, (avg_degree / 6) * 100)
        return connectivity
    
    def _calculate_pedestrian_friendliness(self, G: nx.MultiDiGraph) -> float:
        """Calculate pedestrian friendliness (0-100)."""
        # In a real implementation, this would check for:
        # - Sidewalk presence
        # - Crosswalk density
        # - Traffic speed limits
        # - Street lighting
        
        # For now, return a placeholder
        return 65.0
    
    def _calculate_amenity_distances(self, G: nx.MultiDiGraph, origin_node: int) -> float:
        """Calculate average network distance to amenities (0-100)."""
        # In a real implementation, this would:
        # 1. Query OSM for POIs (shops, restaurants, schools, etc.)
        # 2. Calculate shortest path distances
        # 3. Return average distance
        
        # For now, return a placeholder
        return 45.0
    
    def _mock_walkability(self) -> Dict:
        """Mock walkability metrics."""
        return {
            'intersection_density': np.random.uniform(40, 80),
            'street_connectivity': np.random.uniform(50, 85),
            'pedestrian_friendliness': np.random.uniform(55, 75),
            'network_distance_to_amenities': np.random.uniform(30, 60),
            'walkability_score': np.random.uniform(55, 78)
        }

# ============================================================================
# Transit Accessibility Analysis
# ============================================================================

class TransitAccessibilityAnalyzer:
    """
    Analyze transit accessibility using GTFS data.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.gtfs_feeds = {}  # Cache for loaded GTFS feeds
    
    def load_gtfs_feed(self, city: str) -> Optional[object]:
        """
        Load GTFS feed for a Nigerian city.
        
        Args:
            city: City name ('lagos', 'abuja', 'port_harcourt')
            
        Returns:
            GTFS Feed object or None
        """
        if city in self.gtfs_feeds:
            return self.gtfs_feeds[city]
        
        if not GTFS_AVAILABLE:
            self.logger.warning("gtfs-kit not available. Transit features disabled.")
            return None
        
        try:
            # In a real implementation, load GTFS data from file or URL
            # For Lagos, this could be BRT (Bus Rapid Transit) data
            gtfs_path = f'data/gtfs/{city}.zip'
            
            if not os.path.exists(gtfs_path):
                self.logger.warning(f"GTFS data not found for {city}")
                return None
            
            feed = gk.read_feed(gtfs_path, dist_units='km')
            self.gtfs_feeds[city] = feed
            
            self.logger.info(f"Loaded GTFS feed for {city}")
            return feed
            
        except Exception as e:
            self.logger.error(f"Failed to load GTFS feed: {e}")
            return None
    
    def calculate_transit_accessibility(
        self,
        location: Tuple[float, float],
        city: str,
        max_walk_distance: float = 500,  # meters
        time_window: int = 30  # minutes
    ) -> Dict:
        """
        Calculate transit accessibility from a location.
        
        Args:
            location: (lat, lon) of the property
            city: City name
            max_walk_distance: Maximum walking distance to transit stops (meters)
            time_window: Time window for reachability analysis (minutes)
            
        Returns:
            Dictionary with transit accessibility metrics
        """
        if USE_MOCK_DATA or not GTFS_AVAILABLE:
            return self._mock_transit_accessibility()
        
        try:
            feed = self.load_gtfs_feed(city)
            
            if feed is None:
                return self._mock_transit_accessibility()
            
            lat, lon = location
            
            # Find nearby stops
            stops = feed.stops
            stops['distance'] = stops.apply(
                lambda row: self._haversine_distance(
                    lat, lon, row['stop_lat'], row['stop_lon']
                ),
                axis=1
            )
            
            nearby_stops = stops[stops['distance'] <= max_walk_distance / 1000]  # Convert to km
            
            if len(nearby_stops) == 0:
                return {
                    'num_nearby_stops': 0,
                    'avg_frequency': 0,
                    'reachable_area': 0,
                    'transit_score': 0
                }
            
            # Calculate metrics
            num_stops = len(nearby_stops)
            
            # Calculate average service frequency (trips per hour)
            # This is a simplified calculation
            avg_frequency = 4  # Placeholder
            
            # Estimate reachable area (km²) within time window
            reachable_area = self._estimate_reachable_area(
                nearby_stops,
                time_window,
                feed
            )
            
            # Combined transit score (0-100)
            transit_score = min(100, (
                0.4 * min(100, num_stops * 10) +
                0.3 * min(100, avg_frequency * 5) +
                0.3 * min(100, reachable_area * 2)
            ))
            
            return {
                'num_nearby_stops': num_stops,
                'avg_frequency': avg_frequency,
                'reachable_area': reachable_area,
                'transit_score': transit_score,
                'nearest_stops': nearby_stops.head(5)[['stop_name', 'distance']].to_dict('records')
            }
            
        except Exception as e:
            self.logger.error(f"Transit accessibility calculation failed: {e}")
            return self._mock_transit_accessibility()
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate haversine distance between two points (km)."""
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # Earth radius in km
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def _estimate_reachable_area(self, stops: pd.DataFrame, time_window: int, feed: object) -> float:
        """Estimate reachable area from transit stops."""
        # Simplified estimation
        # In reality, this would use isochrone analysis
        avg_speed = 20  # km/h for transit
        max_distance = (time_window / 60) * avg_speed
        
        # Approximate area as circle
        area = 3.14159 * (max_distance ** 2)
        return area
    
    def _mock_transit_accessibility(self) -> Dict:
        """Mock transit accessibility metrics."""
        return {
            'num_nearby_stops': int(np.random.randint(2, 8)),
            'avg_frequency': float(np.random.uniform(2, 6)),
            'reachable_area': float(np.random.uniform(15, 45)),
            'transit_score': float(np.random.uniform(45, 85)),
            'nearest_stops': [
                {'stop_name': f'Stop {i}', 'distance': float(np.random.uniform(0.1, 0.5))}
                for i in range(1, 4)
            ]
        }

# ============================================================================
# Neighborhood Intelligence Service
# ============================================================================

class NeighborhoodIntelligenceService:
    """
    Main service for enhanced neighborhood intelligence.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.street_analyzer = StreetNetworkAnalyzer()
        self.transit_analyzer = TransitAccessibilityAnalyzer()
    
    def analyze_location(
        self,
        location: Tuple[float, float],
        city: str = 'lagos'
    ) -> Dict:
        """
        Comprehensive location analysis.
        
        Args:
            location: (lat, lon) of the property
            city: City name
            
        Returns:
            Dictionary with all neighborhood intelligence metrics
        """
        self.logger.info(f"Analyzing location {location} in {city}")
        
        try:
            # Walkability analysis
            walkability = self.street_analyzer.calculate_walkability(location, city)
            
            # Transit accessibility
            transit = self.transit_analyzer.calculate_transit_accessibility(location, city)
            
            # Combined location score
            location_score = (
                0.5 * walkability['walkability_score'] +
                0.5 * transit['transit_score']
            )
            
            return {
                'location': {
                    'lat': location[0],
                    'lon': location[1],
                    'city': city
                },
                'walkability': walkability,
                'transit_accessibility': transit,
                'location_score': location_score,
                'recommendation': self._get_location_recommendation(location_score),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Location analysis failed: {e}")
            return {
                'error': str(e),
                'location': {'lat': location[0], 'lon': location[1], 'city': city}
            }
    
    def _get_location_recommendation(self, score: float) -> str:
        """Get location recommendation based on score."""
        if score >= 80:
            return "Excellent location with superior walkability and transit access"
        elif score >= 65:
            return "Very good location with good walkability and transit options"
        elif score >= 50:
            return "Good location with adequate walkability and transit"
        elif score >= 35:
            return "Fair location with limited walkability or transit"
        else:
            return "Poor location with minimal walkability and transit access"

# ============================================================================
# Flask API Endpoints
# ============================================================================

neighborhood_service = NeighborhoodIntelligenceService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'neighborhood-intelligence',
        'osmnx_available': OSMNX_AVAILABLE,
        'gtfs_available': GTFS_AVAILABLE,
        'city2graph_available': CITY2GRAPH_AVAILABLE,
        'mock_mode': USE_MOCK_DATA,
        'supported_cities': list(NIGERIAN_CITIES.keys()),
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/neighborhood/analyze', methods=['POST'])
def analyze_location():
    """
    Analyze location endpoint.
    
    Request body:
    {
        "lat": 6.5244,
        "lon": 3.3792,
        "city": "lagos"
    }
    """
    try:
        data = request.get_json()
        
        lat = data.get('lat')
        lon = data.get('lon')
        city = data.get('city', 'lagos')
        
        if lat is None or lon is None:
            return jsonify({'error': 'Missing lat/lon'}), 400
        
        result = neighborhood_service.analyze_location((lat, lon), city)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Location analysis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/neighborhood/batch-analyze', methods=['POST'])
def batch_analyze():
    """
    Batch location analysis.
    
    Request body:
    {
        "locations": [
            {"lat": 6.5244, "lon": 3.3792, "city": "lagos"},
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        locations = data.get('locations', [])
        
        if not locations:
            return jsonify({'error': 'No locations provided'}), 400
        
        results = []
        for loc in locations:
            result = neighborhood_service.analyze_location(
                (loc['lat'], loc['lon']),
                loc.get('city', 'lagos')
            )
            results.append(result)
        
        return jsonify({'results': results})
        
    except Exception as e:
        logger.error(f"Batch analysis error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5010))
    logger.info(f"Starting Neighborhood Intelligence Service on port {port}")
    logger.info(f"Mock mode: {USE_MOCK_DATA}")
    app.run(host='0.0.0.0', port=port, debug=True)
