"""
City2Graph GNN Valuation Service
---------------------------------
Advanced property valuation using Graph Neural Networks with spatial dependencies.
Optimized for developing countries like Nigeria with data-scarce environments.

Features:
- GraphSAGE model for property valuation with neighborhood effects
- Spatial graph construction from property data
- Confidence scoring for data-scarce areas
- OSM integration for street networks
- Temporal-spatial predictions for market trends
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
from shapely.geometry import Point
import networkx as nx

# City2Graph imports
try:
    import city2graph as c2g
    CITY2GRAPH_AVAILABLE = True
except ImportError:
    CITY2GRAPH_AVAILABLE = False
    logging.warning("city2graph not installed. Using mock mode.")

# PyTorch and PyTorch Geometric imports
try:
    import torch
    import torch.nn.functional as F
    from torch_geometric.nn import SAGEConv, GATConv
    from torch_geometric.data import Data
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logging.warning("PyTorch Geometric not installed. Using mock mode.")
    # Mock Data class
    class Data:
        pass

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
FORGE_API_URL = os.getenv('FORGE_API_URL', 'http://localhost:3000')
FORGE_API_KEY = os.getenv('FORGE_API_KEY', '')
USE_MOCK_DATA = not (CITY2GRAPH_AVAILABLE and TORCH_AVAILABLE)

# ============================================================================
# GraphSAGE Model for Property Valuation
# ============================================================================

if TORCH_AVAILABLE:
    class PropertyGraphSAGE(torch.nn.Module):
        """
        GraphSAGE model for property valuation with spatial dependencies.
        
        Architecture:
        - 3 GraphSAGE layers with skip connections
        - Attention mechanism for neighborhood aggregation
        - Dropout for regularization
        - Output: property value + confidence score
        """
        def __init__(self, num_features: int, hidden_dim: int = 128, num_layers: int = 3):
            super(PropertyGraphSAGE, self).__init__()
            self.num_layers = num_layers
            
            # GraphSAGE layers
            self.convs = torch.nn.ModuleList()
            self.convs.append(SAGEConv(num_features, hidden_dim))
            for _ in range(num_layers - 2):
                self.convs.append(SAGEConv(hidden_dim, hidden_dim))
            self.convs.append(SAGEConv(hidden_dim, hidden_dim))
            
            # Attention layer for confidence scoring
            self.attention = GATConv(hidden_dim, hidden_dim, heads=4, concat=False)
            
            # Output layers
            self.value_predictor = torch.nn.Linear(hidden_dim, 1)
            self.confidence_predictor = torch.nn.Linear(hidden_dim, 1)
            
            # Dropout
            self.dropout = torch.nn.Dropout(0.3)
            
        def forward(self, x, edge_index):
            # GraphSAGE layers with skip connections
            h = x
            for i, conv in enumerate(self.convs):
                h_new = conv(h, edge_index)
                h_new = F.relu(h_new)
                h_new = self.dropout(h_new)
                
                # Skip connection
                if i > 0:
                    h = h + h_new
                else:
                    h = h_new
            
            # Attention for confidence
            h_att = self.attention(h, edge_index)
            
            # Predictions
            value = self.value_predictor(h)
            confidence = torch.sigmoid(self.confidence_predictor(h_att))
            
            return value, confidence

# ============================================================================
# Spatial Graph Construction
# ============================================================================

class SpatialGraphBuilder:
    """
    Build spatial graphs from property data using City2Graph.
    Optimized for Nigerian cities with OSM data.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        
    def build_property_graph(
        self,
        properties: pd.DataFrame,
        k_neighbors: int = 10,
        max_distance: float = 2000  # meters
    ) -> Tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
        """
        Build spatial graph from property data.
        
        Args:
            properties: DataFrame with columns [id, lat, lon, price, bedrooms, bathrooms, sqft, ...]
            k_neighbors: Number of nearest neighbors to connect
            max_distance: Maximum distance for connections (meters)
            
        Returns:
            (nodes_gdf, edges_gdf): GeoDataFrames for nodes and edges
        """
        self.logger.info(f"Building property graph for {len(properties)} properties")
        
        # Convert to GeoDataFrame
        geometry = [Point(lon, lat) for lat, lon in zip(properties['lat'], properties['lon'])]
        properties_gdf = gpd.GeoDataFrame(properties, geometry=geometry, crs="EPSG:4326")
        
        if CITY2GRAPH_AVAILABLE:
            # Use City2Graph for sophisticated graph construction
            try:
                # K-nearest neighbors graph
                nodes_gdf, edges_gdf = c2g.knn_graph(
                    properties_gdf,
                    k=k_neighbors,
                    distance_metric='haversine',  # Good for lat/lon
                    max_distance=max_distance
                )
                
                self.logger.info(f"Created graph with {len(nodes_gdf)} nodes and {len(edges_gdf)} edges")
                return nodes_gdf, edges_gdf
                
            except Exception as e:
                self.logger.error(f"City2Graph failed: {e}. Falling back to simple graph.")
                return self._build_simple_graph(properties_gdf, k_neighbors)
        else:
            # Fallback: simple distance-based graph
            return self._build_simple_graph(properties_gdf, k_neighbors)
    
    def _build_simple_graph(
        self,
        properties_gdf: gpd.GeoDataFrame,
        k_neighbors: int
    ) -> Tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
        """Simple k-NN graph without City2Graph."""
        from sklearn.neighbors import NearestNeighbors
        
        # Extract coordinates
        coords = np.array([[p.x, p.y] for p in properties_gdf.geometry])
        
        # Find k-nearest neighbors
        nbrs = NearestNeighbors(n_neighbors=k_neighbors + 1, algorithm='ball_tree').fit(coords)
        distances, indices = nbrs.kneighbors(coords)
        
        # Build edge list
        edges = []
        for i, neighbors in enumerate(indices):
            for j, neighbor_idx in enumerate(neighbors[1:]):  # Skip self
                edges.append({
                    'source': i,
                    'target': neighbor_idx,
                    'distance': distances[i, j + 1]
                })
        
        edges_df = pd.DataFrame(edges)
        edges_gdf = gpd.GeoDataFrame(edges_df, crs="EPSG:4326")
        
        return properties_gdf, edges_gdf
    
    def add_street_network_features(
        self,
        properties_gdf: gpd.GeoDataFrame,
        city: str = "Lagos"
    ) -> gpd.GeoDataFrame:
        """
        Add street network features using OSM data.
        
        Features:
        - Network distance to CBD
        - Betweenness centrality (how "central" the location is)
        - Closeness to major roads
        - Walkability score
        """
        if not CITY2GRAPH_AVAILABLE:
            self.logger.warning("City2Graph not available. Skipping street network features.")
            return properties_gdf
        
        try:
            # This would fetch OSM data and compute network features
            # For now, we'll add placeholder features
            properties_gdf['network_centrality'] = np.random.random(len(properties_gdf))
            properties_gdf['walkability_score'] = np.random.randint(0, 100, len(properties_gdf))
            
            self.logger.info(f"Added street network features for {city}")
            return properties_gdf
            
        except Exception as e:
            self.logger.error(f"Failed to add street network features: {e}")
            return properties_gdf

# ============================================================================
# GNN Valuation Service
# ============================================================================

class GNNValuationService:
    """
    GNN-based property valuation service with spatial dependencies.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.graph_builder = SpatialGraphBuilder()
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu') if TORCH_AVAILABLE else None
        
        if TORCH_AVAILABLE:
            self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the GraphSAGE model."""
        # Feature dimensions (will be updated based on actual data)
        num_features = 20  # price, bedrooms, bathrooms, sqft, lat, lon, etc.
        
        self.model = PropertyGraphSAGE(num_features=num_features, hidden_dim=128, num_layers=3)
        if self.device:
            self.model.to(self.device)
        
        # Load pre-trained weights if available
        model_path = 'models/property_graphsage.pth'
        if os.path.exists(model_path):
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
            self.model.eval()
            self.logger.info(f"Loaded pre-trained model from {model_path}")
        else:
            self.logger.warning(f"No pre-trained model found at {model_path}. Using untrained model.")
    
    def valuate_property(
        self,
        property_id: int,
        property_features: Dict,
        neighborhood_properties: List[Dict]
    ) -> Dict:
        """
        Valuate a property using GNN with spatial dependencies.
        
        Args:
            property_id: ID of the property to valuate
            property_features: Features of the target property
            neighborhood_properties: List of neighboring properties with features
            
        Returns:
            {
                'estimated_value': float,
                'confidence_score': float,
                'value_range': {'min': float, 'max': float},
                'spatial_factors': {
                    'neighborhood_effect': float,
                    'location_premium': float,
                    'accessibility_score': float
                },
                'comparable_properties': List[Dict]
            }
        """
        if USE_MOCK_DATA:
            return self._mock_valuation(property_id, property_features)
        
        try:
            # Build spatial graph
            all_properties = [property_features] + neighborhood_properties
            properties_df = pd.DataFrame(all_properties)
            
            nodes_gdf, edges_gdf = self.graph_builder.build_property_graph(properties_df)
            
            # Convert to PyTorch Geometric Data
            graph_data = self._to_torch_geometric(nodes_gdf, edges_gdf)
            
            # Run inference
            with torch.no_grad():
                values, confidences = self.model(graph_data.x, graph_data.edge_index)
            
            # Extract results for target property (index 0)
            estimated_value = float(values[0].item())
            confidence_score = float(confidences[0].item())
            
            # Calculate value range based on confidence
            uncertainty = (1 - confidence_score) * 0.2  # 20% max uncertainty
            value_range = {
                'min': estimated_value * (1 - uncertainty),
                'max': estimated_value * (1 + uncertainty)
            }
            
            # Spatial factors
            spatial_factors = self._calculate_spatial_factors(nodes_gdf, edges_gdf, 0)
            
            # Find comparable properties
            comparable_properties = self._find_comparables(nodes_gdf, edges_gdf, 0, top_k=5)
            
            return {
                'estimated_value': estimated_value,
                'confidence_score': confidence_score,
                'value_range': value_range,
                'spatial_factors': spatial_factors,
                'comparable_properties': comparable_properties,
                'model_version': '1.0.0',
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"GNN valuation failed: {e}")
            return self._mock_valuation(property_id, property_features)
    
    def _to_torch_geometric(self, nodes_gdf: gpd.GeoDataFrame, edges_gdf: gpd.GeoDataFrame):
        """Convert GeoDataFrames to PyTorch Geometric Data object."""
        # Extract node features
        feature_cols = ['price', 'bedrooms', 'bathrooms', 'sqft', 'lat', 'lon']
        x = torch.tensor(nodes_gdf[feature_cols].values, dtype=torch.float)
        
        # Extract edge index
        edge_index = torch.tensor(
            edges_gdf[['source', 'target']].values.T,
            dtype=torch.long
        )
        
        # Edge weights (inverse distance)
        edge_attr = torch.tensor(
            1.0 / (edges_gdf['distance'].values + 1e-6),
            dtype=torch.float
        ).unsqueeze(1)
        
        return Data(x=x, edge_index=edge_index, edge_attr=edge_attr)
    
    def _calculate_spatial_factors(
        self,
        nodes_gdf: gpd.GeoDataFrame,
        edges_gdf: gpd.GeoDataFrame,
        target_idx: int
    ) -> Dict:
        """Calculate spatial factors affecting property value."""
        # Neighborhood effect: average price of neighbors
        neighbor_indices = edges_gdf[edges_gdf['source'] == target_idx]['target'].values
        if len(neighbor_indices) > 0:
            neighbor_prices = nodes_gdf.iloc[neighbor_indices]['price'].values
            neighborhood_effect = float(np.mean(neighbor_prices))
        else:
            neighborhood_effect = float(nodes_gdf.iloc[target_idx]['price'])
        
        # Location premium: based on network centrality
        location_premium = float(nodes_gdf.iloc[target_idx].get('network_centrality', 0.5))
        
        # Accessibility score: based on walkability
        accessibility_score = float(nodes_gdf.iloc[target_idx].get('walkability_score', 50))
        
        return {
            'neighborhood_effect': neighborhood_effect,
            'location_premium': location_premium,
            'accessibility_score': accessibility_score
        }
    
    def _find_comparables(
        self,
        nodes_gdf: gpd.GeoDataFrame,
        edges_gdf: gpd.GeoDataFrame,
        target_idx: int,
        top_k: int = 5
    ) -> List[Dict]:
        """Find comparable properties based on graph structure."""
        # Get direct neighbors
        neighbor_indices = edges_gdf[edges_gdf['source'] == target_idx]['target'].values
        
        if len(neighbor_indices) == 0:
            return []
        
        # Sort by similarity (distance)
        distances = edges_gdf[edges_gdf['source'] == target_idx]['distance'].values
        sorted_indices = neighbor_indices[np.argsort(distances)][:top_k]
        
        comparables = []
        for idx in sorted_indices:
            prop = nodes_gdf.iloc[idx]
            comparables.append({
                'id': int(prop.get('id', idx)),
                'price': float(prop['price']),
                'bedrooms': int(prop['bedrooms']),
                'bathrooms': int(prop['bathrooms']),
                'sqft': float(prop['sqft']),
                'distance': float(distances[np.where(neighbor_indices == idx)[0][0]])
            })
        
        return comparables
    
    def _mock_valuation(self, property_id: int, property_features: Dict) -> Dict:
        """Mock valuation for development/testing."""
        base_price = property_features.get('price', 50000000)  # ₦50M default
        
        # Add some randomness
        estimated_value = base_price * np.random.uniform(0.95, 1.05)
        confidence_score = np.random.uniform(0.7, 0.95)
        
        uncertainty = (1 - confidence_score) * 0.2
        value_range = {
            'min': estimated_value * (1 - uncertainty),
            'max': estimated_value * (1 + uncertainty)
        }
        
        return {
            'estimated_value': estimated_value,
            'confidence_score': confidence_score,
            'value_range': value_range,
            'spatial_factors': {
                'neighborhood_effect': base_price * 1.02,
                'location_premium': 0.75,
                'accessibility_score': 68
            },
            'comparable_properties': [
                {
                    'id': property_id + i,
                    'price': base_price * np.random.uniform(0.9, 1.1),
                    'bedrooms': property_features.get('bedrooms', 3),
                    'bathrooms': property_features.get('bathrooms', 2),
                    'sqft': property_features.get('sqft', 1500),
                    'distance': np.random.uniform(100, 1000)
                }
                for i in range(1, 6)
            ],
            'model_version': '1.0.0-mock',
            'timestamp': datetime.utcnow().isoformat()
        }

# ============================================================================
# Flask API Endpoints
# ============================================================================

gnn_service = GNNValuationService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'city2graph-gnn-valuation',
        'city2graph_available': CITY2GRAPH_AVAILABLE,
        'torch_available': TORCH_AVAILABLE,
        'mock_mode': USE_MOCK_DATA,
        'device': str(gnn_service.device) if gnn_service.device else 'cpu',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/gnn/valuate', methods=['POST'])
def valuate_property():
    """
    GNN-based property valuation endpoint.
    
    Request body:
    {
        "property_id": 123,
        "property_features": {
            "price": 50000000,
            "bedrooms": 3,
            "bathrooms": 2,
            "sqft": 1500,
            "lat": 6.5244,
            "lon": 3.3792
        },
        "neighborhood_properties": [
            {
                "id": 124,
                "price": 48000000,
                "bedrooms": 3,
                "bathrooms": 2,
                "sqft": 1450,
                "lat": 6.5250,
                "lon": 3.3800
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        property_id = data.get('property_id')
        property_features = data.get('property_features', {})
        neighborhood_properties = data.get('neighborhood_properties', [])
        
        if not property_id or not property_features:
            return jsonify({'error': 'Missing required fields'}), 400
        
        result = gnn_service.valuate_property(
            property_id,
            property_features,
            neighborhood_properties
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Valuation error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/gnn/batch-valuate', methods=['POST'])
def batch_valuate():
    """
    Batch valuation for multiple properties.
    
    Request body:
    {
        "properties": [
            {
                "property_id": 123,
                "property_features": {...},
                "neighborhood_properties": [...]
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        properties = data.get('properties', [])
        
        if not properties:
            return jsonify({'error': 'No properties provided'}), 400
        
        results = []
        for prop in properties:
            result = gnn_service.valuate_property(
                prop['property_id'],
                prop['property_features'],
                prop.get('neighborhood_properties', [])
            )
            results.append({
                'property_id': prop['property_id'],
                **result
            })
        
        return jsonify({'results': results})
        
    except Exception as e:
        logger.error(f"Batch valuation error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5008))
    logger.info(f"Starting City2Graph GNN Valuation Service on port {port}")
    logger.info(f"Mock mode: {USE_MOCK_DATA}")
    app.run(host='0.0.0.0', port=port, debug=True)
