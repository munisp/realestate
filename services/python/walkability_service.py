"""
Walkability & Amenity Density Service
======================================
Calculates walkability scores and amenity density using OSM street networks
and POI data for Nigerian neighborhoods.
"""

import networkx as nx
import osmnx as ox
from geopy.distance import geodesic
import json
import os
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class WalkabilityScore:
    """Walkability score breakdown"""
    overall_score: float
    street_connectivity: float
    intersection_density: float
    amenity_access: float
    transit_access: float
    pedestrian_infrastructure: float

@dataclass
class AmenityDensity:
    """Amenity density metrics"""
    overall_density: float
    essential_services: int  # hospitals, schools, banks
    retail: int  # shops, restaurants, cafes
    recreation: int  # parks, gyms, entertainment
    density_per_sqkm: float
    nearest_amenities: Dict[str, float]  # category -> distance in meters

class WalkabilityAnalyzer:
    """Analyzes walkability and amenity density for neighborhoods"""
    
    def __init__(self, osm_data_path: str = '/home/ubuntu/realestate-platform/services/python/osm_data'):
        self.osm_data_path = osm_data_path
        self.graphs = {}
        self.pois = {}
        
    def load_city_data(self, city: str) -> bool:
        """Load street network and POI data for a city"""
        try:
            # Load street network
            network_path = f"{self.osm_data_path}/{city}/street_network.graphml"
            if os.path.exists(network_path):
                self.graphs[city] = ox.load_graphml(network_path)
            
            # Load POIs
            pois_path = f"{self.osm_data_path}/{city}/pois.json"
            if os.path.exists(pois_path):
                with open(pois_path, 'r') as f:
                    self.pois[city] = json.load(f)
            
            return city in self.graphs and city in self.pois
        except Exception as e:
            print(f"Error loading data for {city}: {e}")
            return False
    
    def calculate_walkability(
        self,
        city: str,
        latitude: float,
        longitude: float,
        radius_meters: int = 1000
    ) -> WalkabilityScore:
        """
        Calculate walkability score for a location
        
        Args:
            city: City name (lagos, abuja, port_harcourt)
            latitude: Location latitude
            longitude: Location longitude
            radius_meters: Analysis radius in meters
        
        Returns:
            WalkabilityScore with breakdown
        """
        # Ensure city data is loaded
        if city not in self.graphs:
            self.load_city_data(city)
        
        if city not in self.graphs:
            # Return default scores if no data
            return WalkabilityScore(
                overall_score=50.0,
                street_connectivity=50.0,
                intersection_density=50.0,
                amenity_access=50.0,
                transit_access=50.0,
                pedestrian_infrastructure=50.0
            )
        
        G = self.graphs[city]
        center_point = (latitude, longitude)
        
        # 1. Street Connectivity (30% weight)
        # Find nearest node
        try:
            center_node = ox.distance.nearest_nodes(G, longitude, latitude)
            
            # Get subgraph within radius
            subgraph = nx.ego_graph(G, center_node, radius=radius_meters, distance='length')
            
            # Calculate connectivity metrics
            num_nodes = len(subgraph.nodes())
            num_edges = len(subgraph.edges())
            
            if num_nodes > 1:
                avg_degree = sum(dict(subgraph.degree()).values()) / num_nodes
                connectivity_score = min(100, (avg_degree / 4) * 100)  # Normalize to 0-100
            else:
                connectivity_score = 0
        except:
            connectivity_score = 50.0
        
        # 2. Intersection Density (20% weight)
        try:
            # Count intersections (nodes with degree > 2)
            intersections = [n for n in subgraph.nodes() if subgraph.degree(n) > 2]
            area_sqkm = (radius_meters / 1000) ** 2 * 3.14159
            intersection_density = len(intersections) / area_sqkm
            
            # Normalize: 50+ intersections/sqkm = 100 score
            intersection_score = min(100, (intersection_density / 50) * 100)
        except:
            intersection_score = 50.0
        
        # 3. Amenity Access (30% weight)
        amenity_score = self._calculate_amenity_access(city, center_point, radius_meters)
        
        # 4. Transit Access (10% weight)
        transit_score = self._calculate_transit_access(city, center_point, radius_meters)
        
        # 5. Pedestrian Infrastructure (10% weight)
        # Estimate based on street network quality
        try:
            # Check for sidewalks, footpaths in network
            pedestrian_edges = [e for e in subgraph.edges(data=True) 
                               if e[2].get('highway') in ['footway', 'pedestrian', 'path']]
            pedestrian_ratio = len(pedestrian_edges) / max(1, num_edges)
            pedestrian_score = pedestrian_ratio * 100
        except:
            pedestrian_score = 40.0  # Default moderate score
        
        # Calculate weighted overall score
        overall_score = (
            connectivity_score * 0.30 +
            intersection_score * 0.20 +
            amenity_score * 0.30 +
            transit_score * 0.10 +
            pedestrian_score * 0.10
        )
        
        return WalkabilityScore(
            overall_score=round(overall_score, 1),
            street_connectivity=round(connectivity_score, 1),
            intersection_density=round(intersection_score, 1),
            amenity_access=round(amenity_score, 1),
            transit_access=round(transit_score, 1),
            pedestrian_infrastructure=round(pedestrian_score, 1)
        )
    
    def _calculate_amenity_access(
        self,
        city: str,
        center_point: Tuple[float, float],
        radius_meters: int
    ) -> float:
        """Calculate amenity accessibility score"""
        if city not in self.pois:
            return 50.0
        
        pois = self.pois[city]
        nearby_amenities = []
        
        # Count amenities within radius
        for poi in pois:
            if poi.get('lat') and poi.get('lon'):
                poi_point = (poi['lat'], poi['lon'])
                distance = geodesic(center_point, poi_point).meters
                
                if distance <= radius_meters:
                    nearby_amenities.append(poi)
        
        # Score based on amenity count and diversity
        amenity_count = len(nearby_amenities)
        
        # Count unique categories
        categories = set(poi.get('category', 'unknown') for poi in nearby_amenities)
        category_diversity = len(categories)
        
        # Normalize: 20+ amenities = 100 score
        count_score = min(100, (amenity_count / 20) * 100)
        
        # Diversity bonus: 5+ categories = 100 score
        diversity_score = min(100, (category_diversity / 5) * 100)
        
        # Weighted average
        return (count_score * 0.7 + diversity_score * 0.3)
    
    def _calculate_transit_access(
        self,
        city: str,
        center_point: Tuple[float, float],
        radius_meters: int
    ) -> float:
        """Calculate public transit accessibility score"""
        transit_path = f"{self.osm_data_path}/{city}/transit.json"
        
        if not os.path.exists(transit_path):
            return 50.0
        
        try:
            with open(transit_path, 'r') as f:
                transit_stops = json.load(f)
            
            # Count transit stops within radius
            nearby_stops = []
            for stop in transit_stops:
                if stop.get('lat') and stop.get('lon'):
                    stop_point = (stop['lat'], stop['lon'])
                    distance = geodesic(center_point, stop_point).meters
                    
                    if distance <= radius_meters:
                        nearby_stops.append(distance)
            
            if not nearby_stops:
                return 20.0
            
            # Score based on number of stops and proximity
            stop_count_score = min(100, (len(nearby_stops) / 5) * 100)
            
            # Proximity bonus: nearest stop within 500m
            nearest_distance = min(nearby_stops)
            proximity_score = max(0, 100 - (nearest_distance / 500) * 100)
            
            return (stop_count_score * 0.6 + proximity_score * 0.4)
        except:
            return 50.0
    
    def calculate_amenity_density(
        self,
        city: str,
        latitude: float,
        longitude: float,
        radius_meters: int = 1000
    ) -> AmenityDensity:
        """
        Calculate amenity density metrics for a location
        
        Args:
            city: City name
            latitude: Location latitude
            longitude: Location longitude
            radius_meters: Analysis radius in meters
        
        Returns:
            AmenityDensity with breakdown
        """
        # Ensure city data is loaded
        if city not in self.pois:
            self.load_city_data(city)
        
        if city not in self.pois:
            return AmenityDensity(
                overall_density=0.0,
                essential_services=0,
                retail=0,
                recreation=0,
                density_per_sqkm=0.0,
                nearest_amenities={}
            )
        
        pois = self.pois[city]
        center_point = (latitude, longitude)
        
        # Categorize amenities
        essential_services = ['hospital', 'school', 'bank', 'pharmacy', 'police']
        retail_categories = ['supermarket', 'mall', 'restaurant', 'cafe', 'shop']
        recreation_categories = ['park', 'playground', 'sports_centre', 'cinema']
        
        essential_count = 0
        retail_count = 0
        recreation_count = 0
        nearest_by_category = {}
        
        for poi in pois:
            if poi.get('lat') and poi.get('lon'):
                poi_point = (poi['lat'], poi['lon'])
                distance = geodesic(center_point, poi_point).meters
                
                if distance <= radius_meters:
                    poi_type = poi.get('type', '').lower()
                    
                    # Categorize
                    if poi_type in essential_services:
                        essential_count += 1
                    elif poi_type in retail_categories:
                        retail_count += 1
                    elif poi_type in recreation_categories:
                        recreation_count += 1
                    
                    # Track nearest of each type
                    if poi_type not in nearest_by_category or distance < nearest_by_category[poi_type]:
                        nearest_by_category[poi_type] = distance
        
        # Calculate density
        area_sqkm = (radius_meters / 1000) ** 2 * 3.14159
        total_amenities = essential_count + retail_count + recreation_count
        density_per_sqkm = total_amenities / area_sqkm
        
        # Overall density score (normalized)
        overall_density = min(100, (density_per_sqkm / 50) * 100)
        
        return AmenityDensity(
            overall_density=round(overall_density, 1),
            essential_services=essential_count,
            retail=retail_count,
            recreation=recreation_count,
            density_per_sqkm=round(density_per_sqkm, 1),
            nearest_amenities=nearest_by_category
        )


# Example usage
if __name__ == '__main__':
    analyzer = WalkabilityAnalyzer()
    
    # Test with Lagos coordinates
    lagos_coords = (6.5244, 3.3792)
    
    print("Calculating walkability for Lagos...")
    walkability = analyzer.calculate_walkability('lagos', *lagos_coords, radius_meters=1000)
    
    print(f"\nWalkability Score: {walkability.overall_score}/100")
    print(f"  - Street Connectivity: {walkability.street_connectivity}/100")
    print(f"  - Intersection Density: {walkability.intersection_density}/100")
    print(f"  - Amenity Access: {walkability.amenity_access}/100")
    print(f"  - Transit Access: {walkability.transit_access}/100")
    print(f"  - Pedestrian Infrastructure: {walkability.pedestrian_infrastructure}/100")
    
    print("\nCalculating amenity density...")
    amenities = analyzer.calculate_amenity_density('lagos', *lagos_coords, radius_meters=1000)
    
    print(f"\nAmenity Density: {amenities.overall_density}/100")
    print(f"  - Essential Services: {amenities.essential_services}")
    print(f"  - Retail: {amenities.retail}")
    print(f"  - Recreation: {amenities.recreation}")
    print(f"  - Density per km²: {amenities.density_per_sqkm}")
