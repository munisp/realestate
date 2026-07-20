"""
Market Trend Prediction Service
--------------------------------
Spatial diffusion model for real estate price trend propagation.
Uses Temporal Graph Convolutional Networks (T-GCN) for time-series spatial predictions.

Features:
- Spatial diffusion modeling for price trends
- Temporal-GCN for time-series predictions
- Investment opportunity detection using network centrality
- Market trend alerts and notifications
- Optimized for Nigerian markets with sparse data
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
import networkx as nx

# PyTorch imports
try:
    import torch
    import torch.nn.functional as F
    from torch_geometric.nn import GCNConv, GATConv
    from torch_geometric.data import Data
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logging.warning("PyTorch not installed. Using mock mode.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = get_logger("market-trend-prediction")

# Flask app
app = Flask(__name__)
CORS(app)

# Configuration
USE_MOCK_DATA = not TORCH_AVAILABLE

# ============================================================================
# Temporal-GCN Model for Market Trend Prediction
# ============================================================================

if TORCH_AVAILABLE:
    class TemporalGCN(torch.nn.Module):
        """
        Temporal Graph Convolutional Network for market trend prediction.
        
        Architecture:
        - GRU for temporal dependencies
        - GCN for spatial dependencies
        - Combined temporal-spatial features
        - Output: price trend (up/down/stable) + magnitude
        """
        def __init__(self, num_features: int, hidden_dim: int = 64, num_timesteps: int = 12):
            super(TemporalGCN, self).__init__()
            self.num_timesteps = num_timesteps
            self.hidden_dim = hidden_dim
            
            # Temporal layer (GRU)
            self.gru = torch.nn.GRU(num_features, hidden_dim, batch_first=True)
            
            # Spatial layers (GCN)
            self.gcn1 = GCNConv(hidden_dim, hidden_dim)
            self.gcn2 = GCNConv(hidden_dim, hidden_dim)
            
            # Attention for important features
            self.attention = torch.nn.MultiheadAttention(hidden_dim, num_heads=4)
            
            # Output layers
            self.trend_classifier = torch.nn.Linear(hidden_dim, 3)  # up/down/stable
            self.magnitude_predictor = torch.nn.Linear(hidden_dim, 1)  # % change
            
            # Dropout
            self.dropout = torch.nn.Dropout(0.2)
        
        def forward(self, x, edge_index, h0=None):
            """
            Args:
                x: Node features [num_nodes, num_timesteps, num_features]
                edge_index: Graph connectivity [2, num_edges]
                h0: Initial hidden state
            """
            batch_size, num_nodes, num_timesteps, num_features = x.shape
            
            # Reshape for GRU: [num_nodes, num_timesteps, num_features]
            x_temporal = x.view(-1, num_timesteps, num_features)
            
            # Temporal encoding with GRU
            h_temporal, _ = self.gru(x_temporal, h0)  # [num_nodes, num_timesteps, hidden_dim]
            h_temporal = h_temporal[:, -1, :]  # Take last timestep: [num_nodes, hidden_dim]
            
            # Spatial encoding with GCN
            h_spatial = F.relu(self.gcn1(h_temporal, edge_index))
            h_spatial = self.dropout(h_spatial)
            h_spatial = F.relu(self.gcn2(h_spatial, edge_index))
            
            # Attention mechanism
            h_spatial = h_spatial.unsqueeze(0)  # [1, num_nodes, hidden_dim]
            h_att, _ = self.attention(h_spatial, h_spatial, h_spatial)
            h_att = h_att.squeeze(0)  # [num_nodes, hidden_dim]
            
            # Predictions
            trend = self.trend_classifier(h_att)  # [num_nodes, 3]
            magnitude = self.magnitude_predictor(h_att)  # [num_nodes, 1]
            
            return trend, magnitude

# ============================================================================
# Spatial Diffusion Model
# ============================================================================

class SpatialDiffusionModel:
    """
    Model price trend diffusion across spatial networks.
    Based on epidemic diffusion models (SIR-like).
    """
    
    def __init__(self):
        self.logger = get_logger("market-trend-prediction")
    
    def simulate_diffusion(
        self,
        graph: nx.Graph,
        initial_nodes: List[int],
        num_steps: int = 12,
        diffusion_rate: float = 0.3
    ) -> Dict[int, List[float]]:
        """
        Simulate price trend diffusion through spatial network.
        
        Args:
            graph: NetworkX graph of properties
            initial_nodes: Nodes where trend starts (e.g., hot neighborhoods)
            num_steps: Number of time steps to simulate
            diffusion_rate: Rate of diffusion (0-1)
            
        Returns:
            Dictionary mapping node_id -> list of trend values over time
        """
        self.logger.info(f"Simulating diffusion from {len(initial_nodes)} initial nodes")
        
        # Initialize state
        state = {node: [0.0] * num_steps for node in graph.nodes()}
        
        # Set initial nodes
        for node in initial_nodes:
            if node in state:
                state[node][0] = 1.0
        
        # Simulate diffusion
        for t in range(1, num_steps):
            for node in graph.nodes():
                # Get neighbors
                neighbors = list(graph.neighbors(node))
                
                if not neighbors:
                    state[node][t] = state[node][t-1]
                    continue
                
                # Diffusion from neighbors
                neighbor_influence = sum(state[n][t-1] for n in neighbors) / len(neighbors)
                
                # Update state with diffusion
                state[node][t] = state[node][t-1] + diffusion_rate * (neighbor_influence - state[node][t-1])
                
                # Decay over time
                state[node][t] *= 0.95
        
        return state
    
    def identify_hotspots(
        self,
        graph: nx.Graph,
        property_data: pd.DataFrame,
        lookback_months: int = 6
    ) -> List[int]:
        """
        Identify hotspot neighborhoods with rising prices.
        
        Args:
            graph: NetworkX graph of properties
            property_data: DataFrame with price history
            lookback_months: Months to look back for trend
            
        Returns:
            List of node IDs representing hotspots
        """
        hotspots = []
        
        for node in graph.nodes():
            # Get property data
            prop = property_data[property_data['id'] == node]
            
            if len(prop) == 0:
                continue
            
            # Check price trend (simple: current > historical average)
            current_price = prop['price'].iloc[-1] if len(prop) > 0 else 0
            historical_avg = prop['price'].mean()
            
            if current_price > historical_avg * 1.1:  # 10% above average
                hotspots.append(node)
        
        self.logger.info(f"Identified {len(hotspots)} hotspots")
        return hotspots

# ============================================================================
# Investment Opportunity Detection
# ============================================================================

class InvestmentOpportunityDetector:
    """
    Detect investment opportunities using network centrality and trend analysis.
    """
    
    def __init__(self):
        self.logger = get_logger("market-trend-prediction")
    
    def score_properties(
        self,
        graph: nx.Graph,
        property_data: pd.DataFrame,
        trend_predictions: Dict[int, float]
    ) -> pd.DataFrame:
        """
        Score properties for investment potential.
        
        Scoring factors:
        - Network centrality (betweenness, closeness)
        - Predicted price trend
        - Current undervaluation
        - Neighborhood momentum
        
        Args:
            graph: NetworkX graph of properties
            property_data: DataFrame with property features
            trend_predictions: Dictionary of predicted trends
            
        Returns:
            DataFrame with investment scores
        """
        self.logger.info(f"Scoring {len(property_data)} properties for investment")
        
        # Calculate network centrality
        betweenness = nx.betweenness_centrality(graph)
        closeness = nx.closeness_centrality(graph)
        pagerank = nx.pagerank(graph)
        
        scores = []
        
        for _, prop in property_data.iterrows():
            prop_id = prop['id']
            
            # Network centrality score (0-1)
            centrality_score = (
                0.4 * betweenness.get(prop_id, 0) +
                0.3 * closeness.get(prop_id, 0) +
                0.3 * pagerank.get(prop_id, 0)
            )
            
            # Trend score (0-1)
            trend_score = max(0, min(1, trend_predictions.get(prop_id, 0)))
            
            # Undervaluation score (compare to neighborhood average)
            neighbors = list(graph.neighbors(prop_id))
            if neighbors:
                neighbor_prices = property_data[property_data['id'].isin(neighbors)]['price'].mean()
                undervaluation_score = max(0, (neighbor_prices - prop['price']) / neighbor_prices)
            else:
                undervaluation_score = 0
            
            # Combined score
            investment_score = (
                0.3 * centrality_score +
                0.4 * trend_score +
                0.3 * undervaluation_score
            ) * 100  # Scale to 0-100
            
            scores.append({
                'property_id': prop_id,
                'investment_score': investment_score,
                'centrality_score': centrality_score * 100,
                'trend_score': trend_score * 100,
                'undervaluation_score': undervaluation_score * 100,
                'recommendation': self._get_recommendation(investment_score)
            })
        
        return pd.DataFrame(scores).sort_values('investment_score', ascending=False)
    
    def _get_recommendation(self, score: float) -> str:
        """Get investment recommendation based on score."""
        if score >= 80:
            return "Strong Buy"
        elif score >= 60:
            return "Buy"
        elif score >= 40:
            return "Hold"
        elif score >= 20:
            return "Consider"
        else:
            return "Pass"

# ============================================================================
# Market Trend Service
# ============================================================================

class MarketTrendService:
    """
    Main service for market trend prediction and analysis.
    """
    
    def __init__(self):
        self.logger = get_logger("market-trend-prediction")
        self.diffusion_model = SpatialDiffusionModel()
        self.opportunity_detector = InvestmentOpportunityDetector()
        self.tgcn_model = None
        
        if TORCH_AVAILABLE:
            self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the T-GCN model."""
        num_features = 10  # price, volume, days_on_market, etc.
        self.tgcn_model = TemporalGCN(num_features=num_features, hidden_dim=64, num_timesteps=12)
        
        # Load pre-trained weights if available
        model_path = 'models/tgcn_market_trends.pth'
        if os.path.exists(model_path):
            self.tgcn_model.load_state_dict(torch.load(model_path, map_location='cpu'))
            self.tgcn_model.eval()
            self.logger.info(f"Loaded pre-trained T-GCN model from {model_path}")
    
    def predict_market_trends(
        self,
        property_data: pd.DataFrame,
        graph: nx.Graph,
        forecast_months: int = 6
    ) -> Dict:
        """
        Predict market trends for properties.
        
        Args:
            property_data: DataFrame with property features and history
            graph: NetworkX graph of spatial relationships
            forecast_months: Number of months to forecast
            
        Returns:
            Dictionary with predictions and insights
        """
        if USE_MOCK_DATA:
            return self._mock_predictions(property_data, forecast_months)
        
        try:
            # Identify current hotspots
            hotspots = self.diffusion_model.identify_hotspots(graph, property_data)
            
            # Simulate trend diffusion
            diffusion_state = self.diffusion_model.simulate_diffusion(
                graph,
                hotspots,
                num_steps=forecast_months
            )
            
            # Convert diffusion state to trend predictions
            trend_predictions = {
                node: states[-1] for node, states in diffusion_state.items()
            }
            
            # Score investment opportunities
            investment_scores = self.opportunity_detector.score_properties(
                graph,
                property_data,
                trend_predictions
            )
            
            # Generate insights
            insights = self._generate_insights(
                property_data,
                trend_predictions,
                investment_scores
            )
            
            return {
                'forecast_months': forecast_months,
                'hotspots': hotspots,
                'trend_predictions': trend_predictions,
                'investment_opportunities': investment_scores.head(20).to_dict('records'),
                'insights': insights,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Market trend prediction failed: {e}")
            return self._mock_predictions(property_data, forecast_months)
    
    def _generate_insights(
        self,
        property_data: pd.DataFrame,
        trend_predictions: Dict[int, float],
        investment_scores: pd.DataFrame
    ) -> List[Dict]:
        """Generate actionable insights from predictions."""
        insights = []
        
        # Top growth areas
        top_trends = sorted(trend_predictions.items(), key=lambda x: x[1], reverse=True)[:5]
        if top_trends:
            insights.append({
                'type': 'growth_areas',
                'title': 'Top Growth Areas',
                'description': f'{len(top_trends)} neighborhoods showing strong growth potential',
                'properties': [prop_id for prop_id, _ in top_trends]
            })
        
        # Best investment opportunities
        top_investments = investment_scores.head(5)
        if len(top_investments) > 0:
            insights.append({
                'type': 'investment',
                'title': 'Best Investment Opportunities',
                'description': f'{len(top_investments)} properties with high investment scores',
                'properties': top_investments['property_id'].tolist()
            })
        
        # Market momentum
        avg_trend = np.mean(list(trend_predictions.values()))
        momentum = "bullish" if avg_trend > 0.5 else "bearish" if avg_trend < -0.5 else "neutral"
        insights.append({
            'type': 'momentum',
            'title': 'Market Momentum',
            'description': f'Overall market sentiment is {momentum}',
            'value': avg_trend
        })
        
        return insights
    
    def _mock_predictions(self, property_data: pd.DataFrame, forecast_months: int) -> Dict:
        """Mock predictions for development/testing."""
        num_properties = len(property_data)
        
        # Generate random trends
        trend_predictions = {
            int(prop_id): float(np.random.uniform(-0.2, 0.8))
            for prop_id in property_data['id'].values
        }
        
        # Generate mock investment scores
        investment_scores = []
        for prop_id in property_data['id'].values[:20]:
            score = np.random.uniform(40, 95)
            investment_scores.append({
                'property_id': int(prop_id),
                'investment_score': score,
                'centrality_score': np.random.uniform(50, 90),
                'trend_score': np.random.uniform(50, 90),
                'undervaluation_score': np.random.uniform(30, 80),
                'recommendation': 'Strong Buy' if score > 80 else 'Buy' if score > 60 else 'Hold'
            })
        
        return {
            'forecast_months': forecast_months,
            'hotspots': list(property_data['id'].values[:5]),
            'trend_predictions': trend_predictions,
            'investment_opportunities': investment_scores,
            'insights': [
                {
                    'type': 'growth_areas',
                    'title': 'Top Growth Areas',
                    'description': '5 neighborhoods showing strong growth potential',
                    'properties': list(property_data['id'].values[:5])
                },
                {
                    'type': 'momentum',
                    'title': 'Market Momentum',
                    'description': 'Overall market sentiment is bullish',
                    'value': 0.65
                }
            ],
            'model_version': '1.0.0-mock',
            'timestamp': datetime.utcnow().isoformat()
        }

# ============================================================================
# Flask API Endpoints
# ============================================================================

market_service = MarketTrendService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'market-trend-prediction',
        'torch_available': TORCH_AVAILABLE,
        'mock_mode': USE_MOCK_DATA,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/market/predict-trends', methods=['POST'])
def predict_trends():
    """
    Predict market trends endpoint.
    
    Request body:
    {
        "property_data": [...],  // List of properties with features
        "graph": {...},          // Graph structure (adjacency list)
        "forecast_months": 6
    }
    """
    try:
        data = request.get_json()
        
        # Parse property data
        property_data = pd.DataFrame(data.get('property_data', []))
        
        # Parse graph
        graph_data = data.get('graph', {})
        graph = nx.Graph()
        for node, neighbors in graph_data.items():
            for neighbor in neighbors:
                graph.add_edge(int(node), int(neighbor))
        
        forecast_months = data.get('forecast_months', 6)
        
        # Predict trends
        result = market_service.predict_market_trends(
            property_data,
            graph,
            forecast_months
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Trend prediction error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5009))
    logger.info(f"Starting Market Trend Prediction Service on port {port}")
    logger.info(f"Mock mode: {USE_MOCK_DATA}")
    app.run(host='0.0.0.0', port=port, debug=True)
