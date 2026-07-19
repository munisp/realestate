"""
Zestimate Ensemble Valuation Service
Combines multiple ML models (XGBoost, LightGBM, CatBoost, Neural Network)
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
PORT = int(os.getenv('PORT', 5006))

class EnsembleModel:
    """Ensemble of multiple ML models"""
    
    def __init__(self):
        self.models = {
            'xgboost': {'weight': 0.30, 'name': 'XGBoost'},
            'lightgbm': {'weight': 0.25, 'name': 'LightGBM'},
            'catboost': {'weight': 0.25, 'name': 'CatBoost'},
            'neural_net': {'weight': 0.20, 'name': 'Neural Network'}
        }
        logger.info("Ensemble Model initialized with 4 base models")
    
    def predict_single_model(self, model_name: str, features: dict) -> float:
        """Predict using a single model (mock implementation)"""
        base_value = features.get('price', 1000000)
        
        # Add model-specific variance
        variance = {
            'xgboost': 0.05,
            'lightgbm': 0.04,
            'catboost': 0.06,
            'neural_net': 0.08
        }.get(model_name, 0.05)
        
        prediction = base_value * (1 + np.random.uniform(-variance, variance))
        return prediction
    
    def predict(self, features: dict) -> dict:
        """
        Predict using ensemble of models
        
        Args:
            features: Property features
            
        Returns:
            dict with prediction, confidence, and model breakdown
        """
        # Get predictions from all models
        predictions = {}
        for model_name, model_info in self.models.items():
            pred = self.predict_single_model(model_name, features)
            predictions[model_name] = {
                'prediction': round(pred, 2),
                'weight': model_info['weight'],
                'name': model_info['name']
            }
        
        # Calculate weighted ensemble prediction
        ensemble_prediction = sum(
            pred_info['prediction'] * pred_info['weight']
            for pred_info in predictions.values()
        )
        
        # Calculate confidence based on prediction variance
        pred_values = [p['prediction'] for p in predictions.values()]
        std_dev = np.std(pred_values)
        mean_pred = np.mean(pred_values)
        coefficient_of_variation = std_dev / mean_pred if mean_pred > 0 else 1
        confidence = max(0.5, 1 - coefficient_of_variation)  # Higher variance = lower confidence
        
        # Calculate prediction interval
        lower_bound = ensemble_prediction * 0.9
        upper_bound = ensemble_prediction * 1.1
        
        return {
            'estimated_value': round(ensemble_prediction, 2),
            'lower_bound': round(lower_bound, 2),
            'upper_bound': round(upper_bound, 2),
            'confidence': round(confidence, 4),
            'model_predictions': predictions,
            'std_dev': round(std_dev, 2)
        }

model = EnsembleModel()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'zestimate-ensemble',
        'version': '1.0.0',
        'models': list(model.models.keys()),
        'num_models': len(model.models)
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict property value using ensemble
    
    Request body:
    {
        "property_id": 1,
        "features": {
            "price": 1000000,
            "sqft": 2000,
            "beds": 3,
            "baths": 2,
            "year_built": 1990
        }
    }
    """
    try:
        data = request.json
        property_id = data.get('property_id')
        features = data.get('features', {})
        
        if not property_id:
            return jsonify({'error': 'property_id is required'}), 400
        
        # Generate prediction
        result = model.predict(features)
        
        return jsonify({
            'property_id': property_id,
            'source': 'ensemble',
            **result
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/model-weights', methods=['GET'])
def get_model_weights():
    """Get current model weights"""
    return jsonify({
        'weights': {
            name: info['weight']
            for name, info in model.models.items()
        }
    })

@app.route('/model-weights', methods=['POST'])
def update_model_weights():
    """
    Update model weights
    
    Request body:
    {
        "weights": {
            "xgboost": 0.35,
            "lightgbm": 0.30,
            "catboost": 0.20,
            "neural_net": 0.15
        }
    }
    """
    try:
        data = request.json
        new_weights = data.get('weights', {})
        
        # Validate weights sum to 1.0
        total_weight = sum(new_weights.values())
        if not (0.99 <= total_weight <= 1.01):
            return jsonify({'error': 'Weights must sum to 1.0'}), 400
        
        # Update weights
        for model_name, weight in new_weights.items():
            if model_name in model.models:
                model.models[model_name]['weight'] = weight
        
        logger.info(f"Updated model weights: {new_weights}")
        
        return jsonify({
            'success': True,
            'weights': {
                name: info['weight']
                for name, info in model.models.items()
            }
        })
        
    except Exception as e:
        logger.error(f"Weight update error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info(f"Starting Zestimate Ensemble Service on port {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=False)
