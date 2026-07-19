"""
Zestimate Bias Correction Service
Fairness monitoring and bias mitigation
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
PORT = int(os.getenv('PORT', 5007))

class BiasCorrector:
    """Bias detection and correction"""
    
    def __init__(self):
        self.calibration_factors = {}
        logger.info("Bias Corrector initialized")
    
    def calculate_fairness_metrics(self, predictions: list, actuals: list, segments: list) -> dict:
        """
        Calculate fairness metrics across segments
        
        Args:
            predictions: List of predicted values
            actuals: List of actual values
            segments: List of segment labels (e.g., zip codes, neighborhoods)
            
        Returns:
            dict with fairness metrics
        """
        # Group by segment
        segment_data = {}
        for pred, actual, segment in zip(predictions, actuals, segments):
            if segment not in segment_data:
                segment_data[segment] = {'predictions': [], 'actuals': []}
            segment_data[segment]['predictions'].append(pred)
            segment_data[segment]['actuals'].append(actual)
        
        # Calculate metrics per segment
        segment_metrics = {}
        for segment, data in segment_data.items():
            preds = np.array(data['predictions'])
            acts = np.array(data['actuals'])
            
            # Mean Percentage Error (MPE)
            mpe = np.mean((preds - acts) / acts) * 100
            
            # Mean Absolute Percentage Error (MAPE)
            mape = np.mean(np.abs((preds - acts) / acts)) * 100
            
            segment_metrics[segment] = {
                'mpe': round(mpe, 4),
                'mape': round(mape, 4),
                'count': len(preds)
            }
        
        # Calculate disparate impact
        mpe_values = [m['mpe'] for m in segment_metrics.values()]
        disparate_impact = max(mpe_values) - min(mpe_values) if mpe_values else 0
        
        return {
            'segment_metrics': segment_metrics,
            'disparate_impact': round(disparate_impact, 4),
            'overall_mpe': round(np.mean(mpe_values), 4) if mpe_values else 0
        }
    
    def correct_bias(self, prediction: float, segment: str) -> float:
        """
        Apply bias correction to a prediction
        
        Args:
            prediction: Original prediction
            segment: Segment identifier
            
        Returns:
            Corrected prediction
        """
        # Get calibration factor for segment
        calibration = self.calibration_factors.get(segment, 1.0)
        
        # Apply correction
        corrected = prediction * calibration
        
        return corrected

corrector = BiasCorrector()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'zestimate-bias',
        'version': '1.0.0',
        'calibration_segments': len(corrector.calibration_factors)
    })

@app.route('/calculate-metrics', methods=['POST'])
def calculate_metrics():
    """
    Calculate fairness metrics
    
    Request body:
    {
        "predictions": [1000000, 950000, 1100000],
        "actuals": [980000, 970000, 1050000],
        "segments": ["94102", "94110", "94102"]
    }
    """
    try:
        data = request.json
        predictions = data.get('predictions', [])
        actuals = data.get('actuals', [])
        segments = data.get('segments', [])
        
        if not all([predictions, actuals, segments]):
            return jsonify({'error': 'predictions, actuals, and segments are required'}), 400
        
        if not (len(predictions) == len(actuals) == len(segments)):
            return jsonify({'error': 'All arrays must have the same length'}), 400
        
        # Calculate metrics
        metrics = corrector.calculate_fairness_metrics(predictions, actuals, segments)
        
        return jsonify(metrics)
        
    except Exception as e:
        logger.error(f"Metrics calculation error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/correct', methods=['POST'])
def correct():
    """
    Apply bias correction to a prediction
    
    Request body:
    {
        "property_id": 1,
        "prediction": 1000000,
        "segment": "94102"
    }
    """
    try:
        data = request.json
        property_id = data.get('property_id')
        prediction = data.get('prediction')
        segment = data.get('segment', 'default')
        
        if not all([property_id, prediction]):
            return jsonify({'error': 'property_id and prediction are required'}), 400
        
        # Apply correction
        corrected = corrector.correct_bias(prediction, segment)
        calibration = corrector.calibration_factors.get(segment, 1.0)
        
        return jsonify({
            'property_id': property_id,
            'original_prediction': prediction,
            'corrected_prediction': round(corrected, 2),
            'calibration_factor': calibration,
            'segment': segment
        })
        
    except Exception as e:
        logger.error(f"Correction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/calibrate', methods=['POST'])
def calibrate():
    """
    Update calibration factors based on historical performance
    
    Request body:
    {
        "segment_factors": {
            "94102": 0.98,
            "94110": 1.02,
            "94117": 1.00
        }
    }
    """
    try:
        data = request.json
        segment_factors = data.get('segment_factors', {})
        
        if not segment_factors:
            return jsonify({'error': 'segment_factors is required'}), 400
        
        # Update calibration factors
        corrector.calibration_factors.update(segment_factors)
        
        logger.info(f"Updated calibration factors for {len(segment_factors)} segments")
        
        return jsonify({
            'success': True,
            'updated_segments': list(segment_factors.keys()),
            'total_segments': len(corrector.calibration_factors)
        })
        
    except Exception as e:
        logger.error(f"Calibration error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/calibration-factors', methods=['GET'])
def get_calibration_factors():
    """Get current calibration factors"""
    return jsonify({
        'factors': corrector.calibration_factors,
        'total_segments': len(corrector.calibration_factors)
    })

if __name__ == '__main__':
    logger.info(f"Starting Zestimate Bias Correction Service on port {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=False)
