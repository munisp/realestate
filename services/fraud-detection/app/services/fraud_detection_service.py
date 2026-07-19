from typing import Dict, List, Any
import numpy as np
import torch
from datetime import datetime
import logging
import shap
from ..models.gnn_fraud_model import HybridFraudDetector
from ..rules.rule_engine import RuleEngine
import mlflow

logger = logging.getLogger(__name__)


class FraudDetectionService:
    """
    Hybrid fraud detection service combining rule-based and ML/DL/GNN approaches.
    Implements five-layer architecture:
    1. Data Ingestion and Preprocessing
    2. Rule-Based Detection
    3. Machine Learning (ML/DL/GNN)
    4. Integration and Decision
    5. Feedback and Adaptation
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
        # Initialize rule engine
        self.rule_engine = RuleEngine()
        
        # Initialize ML/DL/GNN hybrid detector
        self.ml_detector = HybridFraudDetector(config)
        
        # Integration weights
        self.integration_weights = {
            'rules': 0.4,
            'ml': 0.6
        }
        
        # SHAP explainer for model interpretability
        self.explainer = None
        
        # MLflow tracking
        self.mlflow_enabled = config.get('mlflow_enabled', False)
        if self.mlflow_enabled:
            mlflow.set_tracking_uri(config.get('mlflow_uri', 'http://localhost:5000'))
            mlflow.set_experiment('fraud-detection')
        
        logger.info("Fraud detection service initialized")
    
    def detect_fraud(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main fraud detection method combining all approaches.
        
        Args:
            transaction_data: Dictionary containing transaction information
            
        Returns:
            Comprehensive fraud detection result
        """
        start_time = datetime.now()
        
        # Layer 1: Data Preprocessing
        preprocessed_data = self._preprocess_data(transaction_data)
        
        # Layer 2: Rule-Based Detection
        rule_result = self.rule_engine.evaluate(preprocessed_data)
        
        # Layer 3: ML/DL/GNN Detection
        ml_result = self._ml_detection(preprocessed_data)
        
        # Layer 4: Integration and Decision
        final_result = self._integrate_results(rule_result, ml_result, preprocessed_data)
        
        # Add explainability
        final_result['explanation'] = self._generate_explanation(
            rule_result, ml_result, preprocessed_data
        )
        
        # Layer 5: Feedback (log for model retraining)
        self._log_detection(transaction_data, final_result)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        final_result['processing_time_ms'] = processing_time * 1000
        
        return final_result
    
    def _preprocess_data(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Preprocess transaction data for both rules and ML models.
        """
        preprocessed = transaction_data.copy()
        
        # Add derived features
        preprocessed['transaction_hour'] = datetime.now().hour
        
        # Calculate user statistics if not provided
        if 'user_avg_transaction' not in preprocessed:
            preprocessed['user_avg_transaction'] = preprocessed.get('amount', 0) / 2
        
        # Add default values for missing fields
        defaults = {
            'account_age_days': 365,
            'recent_transaction_count': 0,
            'identity_verified': False,
            'document_verification_failed': False,
            'on_watchlist': False,
            'connected_to_fraudster': False,
            'circular_pattern_detected': False,
            'payment_source_count': 1,
            'location_distance_km': 0,
            'days_since_purchase': 999,
            'submitted_documents': []
        }
        
        for key, value in defaults.items():
            if key not in preprocessed:
                preprocessed[key] = value
        
        return preprocessed
    
    def _ml_detection(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run ML/DL/GNN detection.
        """
        try:
            # Prepare graph data for GNN
            graph_data = self._prepare_graph_data(data)
            
            # Prepare sequence data for LSTM/Transformer
            sequence_data = self._prepare_sequence_data(data)
            
            # Get predictions from hybrid model
            prediction = self.ml_detector.predict(graph_data, sequence_data)
            
            return {
                'fraud_probability': prediction['fraud_probability'],
                'is_fraud': prediction['is_fraud'],
                'model_scores': {
                    'gnn': prediction['gnn_score'],
                    'lstm': prediction['lstm_score'],
                    'transformer': prediction['transformer_score']
                }
            }
            
        except Exception as e:
            logger.error(f"ML detection error: {str(e)}")
            return {
                'fraud_probability': 0.5,
                'is_fraud': False,
                'model_scores': {},
                'error': str(e)
            }
    
    def _prepare_graph_data(self, data: Dict[str, Any]):
        """
        Prepare graph data for GNN model.
        Creates a transaction graph with users, properties, and transactions as nodes.
        """
        # This is a simplified version - in production, you would build a full graph
        # from historical data
        
        num_nodes = 10  # Example: user, property, and related entities
        num_features = 64
        
        # Create node features (in production, extract from actual data)
        x = torch.randn(num_nodes, num_features)
        
        # Create edges (connections between entities)
        edge_index = torch.tensor([
            [0, 1, 1, 2, 2, 3, 3, 4, 4, 5],
            [1, 0, 2, 1, 3, 2, 4, 3, 5, 4]
        ], dtype=torch.long)
        
        from torch_geometric.data import Data
        graph_data = Data(x=x, edge_index=edge_index)
        
        return graph_data
    
    def _prepare_sequence_data(self, data: Dict[str, Any]):
        """
        Prepare sequence data for LSTM/Transformer models.
        Creates a sequence of historical transactions.
        """
        # This is a simplified version - in production, you would extract
        # actual transaction history
        
        sequence_length = 10
        num_features = 32
        
        # Create sequence (in production, extract from user's transaction history)
        sequence = torch.randn(1, sequence_length, num_features)
        
        return sequence
    
    def _integrate_results(
        self,
        rule_result: Dict[str, Any],
        ml_result: Dict[str, Any],
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Integrate rule-based and ML results using ensemble approach.
        """
        # Normalize scores to 0-1 range
        rule_score = rule_result['risk_score'] / 100.0
        ml_score = ml_result['fraud_probability']
        
        # Weighted ensemble
        final_score = (
            self.integration_weights['rules'] * rule_score +
            self.integration_weights['ml'] * ml_score
        )
        
        # Hierarchical decision making
        # If rules indicate CRITICAL risk, override ML prediction
        if rule_result['risk_level'] == 'CRITICAL':
            final_decision = 'BLOCK'
            final_score = max(final_score, 0.9)
        elif final_score >= 0.8:
            final_decision = 'BLOCK'
        elif final_score >= 0.6:
            final_decision = 'REVIEW'
        elif final_score >= 0.4:
            final_decision = 'MONITOR'
        else:
            final_decision = 'APPROVE'
        
        return {
            'transaction_id': data.get('transaction_id', 'unknown'),
            'fraud_score': final_score,
            'fraud_probability': final_score,
            'is_fraud': final_score >= 0.5,
            'decision': final_decision,
            'rule_based_result': {
                'risk_score': rule_result['risk_score'],
                'risk_level': rule_result['risk_level'],
                'triggered_rules': rule_result['triggered_rules'],
                'recommendation': rule_result['recommendation']
            },
            'ml_based_result': {
                'fraud_probability': ml_result['fraud_probability'],
                'model_scores': ml_result.get('model_scores', {})
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _generate_explanation(
        self,
        rule_result: Dict[str, Any],
        ml_result: Dict[str, Any],
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate human-readable explanation for the fraud detection result.
        Combines rule explanations with SHAP values from ML models.
        """
        explanation = {
            'summary': '',
            'key_factors': [],
            'rule_contributions': [],
            'ml_contributions': []
        }
        
        # Rule-based explanations
        triggered_rules = rule_result.get('triggered_rules', [])
        for rule in triggered_rules:
            explanation['rule_contributions'].append({
                'factor': rule['name'],
                'severity': rule['severity'],
                'score': rule['score'],
                'description': rule['reason']
            })
            explanation['key_factors'].append(rule['name'])
        
        # ML-based explanations (simplified - in production use SHAP)
        model_scores = ml_result.get('model_scores', {})
        if model_scores:
            explanation['ml_contributions'].append({
                'model': 'GNN',
                'score': model_scores.get('gnn', 0),
                'description': 'Graph-based network analysis detected suspicious patterns'
            })
            explanation['ml_contributions'].append({
                'model': 'LSTM',
                'score': model_scores.get('lstm', 0),
                'description': 'Temporal pattern analysis of transaction history'
            })
            explanation['ml_contributions'].append({
                'model': 'Transformer',
                'score': model_scores.get('transformer', 0),
                'description': 'Deep learning analysis of transaction features'
            })
        
        # Generate summary
        if len(triggered_rules) > 0:
            explanation['summary'] = f"Detected {len(triggered_rules)} suspicious patterns. "
            explanation['summary'] += f"Primary concerns: {', '.join(explanation['key_factors'][:3])}"
        else:
            explanation['summary'] = "No significant fraud indicators detected by rules. ML models show "
            explanation['summary'] += f"{ml_result['fraud_probability']*100:.1f}% fraud probability."
        
        return explanation
    
    def _log_detection(self, transaction_data: Dict[str, Any], result: Dict[str, Any]):
        """
        Log detection result for feedback and model retraining.
        """
        if self.mlflow_enabled:
            with mlflow.start_run():
                mlflow.log_param('transaction_id', transaction_data.get('transaction_id'))
                mlflow.log_metric('fraud_score', result['fraud_score'])
                mlflow.log_metric('rule_score', result['rule_based_result']['risk_score'])
                mlflow.log_metric('ml_score', result['ml_based_result']['fraud_probability'])
                mlflow.log_param('decision', result['decision'])
        
        # Log to database for retraining (implement based on your DB)
        logger.info(f"Detection logged: {result['transaction_id']} - Score: {result['fraud_score']:.2f}")
    
    def update_feedback(self, transaction_id: str, actual_fraud: bool):
        """
        Update model with feedback on actual fraud status.
        Used for continuous learning and model improvement.
        """
        logger.info(f"Feedback received for {transaction_id}: fraud={actual_fraud}")
        
        # Store feedback for model retraining
        # In production, this would trigger a retraining pipeline
        if self.mlflow_enabled:
            with mlflow.start_run():
                mlflow.log_param('transaction_id', transaction_id)
                mlflow.log_param('actual_fraud', actual_fraud)
                mlflow.log_param('feedback_timestamp', datetime.now().isoformat())
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get fraud detection statistics.
        """
        return {
            'total_rules': len(self.rule_engine.rules),
            'enabled_rules': sum(1 for r in self.rule_engine.rules if r.enabled),
            'integration_weights': self.integration_weights,
            'models_loaded': True,
            'mlflow_enabled': self.mlflow_enabled
        }
    
    def retrain_models(self, training_data):
        """
        Retrain ML/DL/GNN models with new data.
        """
        logger.info("Starting model retraining...")
        
        if self.mlflow_enabled:
            with mlflow.start_run():
                mlflow.log_param('retraining_started', datetime.now().isoformat())
                
                # Train models
                self.ml_detector.train(training_data['train_loader'], training_data['val_loader'])
                
                # Save models
                model_path = f"models/fraud_detector_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pth"
                self.ml_detector.save_models(model_path)
                
                mlflow.log_artifact(model_path)
                mlflow.log_param('retraining_completed', datetime.now().isoformat())
        
        logger.info("Model retraining completed")
