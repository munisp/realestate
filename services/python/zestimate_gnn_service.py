"""
Zestimate GNN Valuation Service
Graph Neural Network-based property valuation with spatial intelligence
Supports Manus Google Maps proxy for geocoding
"""

import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
PORT = int(os.getenv('PORT', 5003))
DATABASE_URL = os.getenv('DATABASE_URL', '')
MANUS_FORGE_API_KEY = os.getenv('BUILT_IN_FORGE_API_KEY', '')
MANUS_FORGE_API_URL = os.getenv('BUILT_IN_FORGE_API_URL', '')

class GNNValuationModel:
    """Graph Neural Network for property valuation"""
    
    def __init__(self):
        self.model_type = 'ensemble'  # gcn, graphsage, gat, ensemble
        logger.info("GNN Valuation Model initialized")
    
    def predict(self, property_id: int, features: dict, neighbors: list) -> dict:
        """
        Predict property value using GNN
        
        Args:
            property_id: Property ID
            features: Property features (sqft, beds, baths, etc.)
            neighbors: List of neighbor properties with distances
            
        Returns:
            dict with prediction, confidence, and influence scores
        """
        # Mock prediction (replace with trained model)
        base_value = features.get('price', 1000000)
        
        # Calculate neighborhood influence
        neighbor_influence = 0
        if neighbors:
            for neighbor in neighbors:
                weight = np.exp(-neighbor['distance'])  # Exponential decay
                neighbor_influence += weight * neighbor.get('price', base_value)
            neighbor_influence /= len(neighbors)
        else:
            neighbor_influence = base_value
        
        # Weighted ensemble
        prediction = 0.7 * base_value + 0.3 * neighbor_influence
        confidence = 0.75 + np.random.random() * 0.2  # 75-95%
        
        return {
            'estimated_value': round(prediction, 2),
            'confidence': round(confidence, 4),
            'base_value': round(base_value, 2),
            'neighbor_influence': round(neighbor_influence, 2),
            'influence_weight': 0.3,
            'num_neighbors': len(neighbors)
        }

model = GNNValuationModel()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'zestimate-gnn',
        'version': '1.0.0',
        'model_type': model.model_type
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict property value using GNN
    
    Request body:
    {
        "property_id": 1,
        "features": {"price": 1000000, "sqft": 2000, "beds": 3},
        "neighbors": [{"id": 2, "distance": 0.5, "price": 950000}],
        "model_type": "ensemble"
    }
    """
    try:
        data = request.json
        property_id = data.get('property_id')
        features = data.get('features', {})
        neighbors = data.get('neighbors', [])
        model_type = data.get('model_type', 'ensemble')
        
        if not property_id:
            return jsonify({'error': 'property_id is required'}), 400
        
        # Update model type if specified
        if model_type != model.model_type:
            model.model_type = model_type
            logger.info(f"Switched to model type: {model_type}")
        
        # Generate prediction
        result = model.predict(property_id, features, neighbors)
        
        return jsonify({
            'property_id': property_id,
            'model_type': model_type,
            **result
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/build-graph', methods=['POST'])
def build_graph():
    """
    Build neighborhood graph for a property
    
    Request body:
    {
        "property_id": 1,
        "latitude": 37.7749,
        "longitude": -122.4194,
        "k_neighbors": 10,
        "max_distance_miles": 2.0
    }
    """
    try:
        data = request.json
        property_id = data.get('property_id')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        k = data.get('k_neighbors', 10)
        max_distance = data.get('max_distance_miles', 2.0)
        
        if not all([property_id, latitude, longitude]):
            return jsonify({'error': 'property_id, latitude, and longitude are required'}), 400
        
        # Mock graph construction (replace with actual DB query)
        # In production, query database for nearby properties using PostGIS
        mock_neighbors = []
        for i in range(min(k, 5)):
            distance = np.random.random() * max_distance
            influence = np.exp(-distance)
            mock_neighbors.append({
                'neighbor_id': property_id + i + 1,
                'distance_miles': round(distance, 4),
                'influence_weight': round(influence, 6),
                'price': 900000 + np.random.randint(-100000, 200000)
            })
        
        return jsonify({
            'property_id': property_id,
            'num_neighbors': len(mock_neighbors),
            'neighbors': mock_neighbors,
            'max_distance': max_distance
        })
        
    except Exception as e:
        logger.error(f"Graph building error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info(f"Starting Zestimate GNN Service on port {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=False)
