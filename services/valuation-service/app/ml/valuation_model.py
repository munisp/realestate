import torch
import torch.nn as nn
import numpy as np
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class PropertyValuationModel(nn.Module):
    """
    Neural network model for property valuation
    Combines property features, location embeddings, and market trends
    """
    
    def __init__(
        self,
        feature_dim: int = 20,
        location_dim: int = 10,
        hidden_dim: int = 128,
        num_layers: int = 3,
        dropout: float = 0.2
    ):
        super().__init__()
        
        # Feature encoder
        self.feature_encoder = nn.Sequential(
            nn.Linear(feature_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        
        # Location encoder
        self.location_encoder = nn.Sequential(
            nn.Linear(location_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, hidden_dim // 2),
            nn.ReLU()
        )
        
        # Combined network
        combined_dim = hidden_dim + hidden_dim // 2
        layers = []
        for i in range(num_layers):
            if i == 0:
                layers.append(nn.Linear(combined_dim, hidden_dim))
            else:
                layers.append(nn.Linear(hidden_dim, hidden_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout))
        
        self.combined_network = nn.Sequential(*layers)
        
        # Output layers
        self.value_head = nn.Linear(hidden_dim, 1)
        self.confidence_head = nn.Sequential(
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )
    
    def forward(self, features: torch.Tensor, location: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass
        
        Args:
            features: Property features tensor [batch_size, feature_dim]
            location: Location features tensor [batch_size, location_dim]
        
        Returns:
            value: Predicted property value [batch_size, 1]
            confidence: Confidence score [batch_size, 1]
        """
        # Encode features
        feature_encoded = self.feature_encoder(features)
        location_encoded = self.location_encoder(location)
        
        # Combine
        combined = torch.cat([feature_encoded, location_encoded], dim=1)
        
        # Process combined features
        hidden = self.combined_network(combined)
        
        # Predict value and confidence
        value = self.value_head(hidden)
        confidence = self.confidence_head(hidden)
        
        return value, confidence


class ValuationPredictor:
    """
    Wrapper for valuation model with preprocessing and postprocessing
    """
    
    def __init__(self, model_path: str = None, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = PropertyValuationModel().to(self.device)
        
        if model_path:
            self.load_model(model_path)
        else:
            logger.warning("No model path provided, using untrained model")
        
        self.model.eval()
    
    def load_model(self, model_path: str):
        """Load model weights from file"""
        try:
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            logger.info(f"Loaded model from {model_path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def preprocess_features(self, property_data: Dict) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Preprocess property data into model inputs
        
        Args:
            property_data: Dictionary with property features and location
        
        Returns:
            features: Property features tensor
            location: Location features tensor
        """
        # Extract property features
        features = [
            property_data.get('bedrooms', 0) / 10.0,  # Normalize
            property_data.get('bathrooms', 0) / 10.0,
            property_data.get('square_feet', 0) / 5000.0,
            property_data.get('lot_size', 0) / 50000.0,
            property_data.get('year_built', 2000) / 2024.0,
            property_data.get('parking', 0) / 5.0,
            1.0 if property_data.get('property_type') == 'house' else 0.0,
            1.0 if property_data.get('property_type') == 'condo' else 0.0,
            1.0 if property_data.get('property_type') == 'townhouse' else 0.0,
            1.0 if property_data.get('property_type') == 'land' else 0.0,
            # Add more features as needed (pool, garage, etc.)
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        ]
        
        # Extract location features
        location = [
            property_data.get('latitude', 0.0) / 90.0,  # Normalize to [-1, 1]
            property_data.get('longitude', 0.0) / 180.0,
            # Add location embeddings (city, state, neighborhood)
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        ]
        
        features_tensor = torch.tensor([features], dtype=torch.float32).to(self.device)
        location_tensor = torch.tensor([location], dtype=torch.float32).to(self.device)
        
        return features_tensor, location_tensor
    
    @torch.no_grad()
    def predict(self, property_data: Dict) -> Dict:
        """
        Predict property value
        
        Args:
            property_data: Dictionary with property features
        
        Returns:
            Dictionary with predicted value, confidence, and range
        """
        # Preprocess
        features, location = self.preprocess_features(property_data)
        
        # Predict
        value, confidence = self.model(features, location)
        
        # Postprocess
        predicted_value = float(value.item())
        confidence_score = float(confidence.item())
        
        # Calculate value range based on confidence
        uncertainty = (1.0 - confidence_score) * 0.2  # 20% max uncertainty
        value_range_low = predicted_value * (1.0 - uncertainty)
        value_range_high = predicted_value * (1.0 + uncertainty)
        
        return {
            'estimated_value': predicted_value,
            'confidence_score': confidence_score,
            'value_range_low': value_range_low,
            'value_range_high': value_range_high
        }
    
    def batch_predict(self, properties: List[Dict]) -> List[Dict]:
        """
        Predict values for multiple properties
        
        Args:
            properties: List of property data dictionaries
        
        Returns:
            List of prediction dictionaries
        """
        return [self.predict(prop) for prop in properties]


class ComparablePropertyMatcher:
    """
    Find and score comparable properties for CMA (Comparative Market Analysis)
    """
    
    def __init__(self, max_distance_km: float = 10.0):
        self.max_distance_km = max_distance_km
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two points using Haversine formula
        
        Returns:
            Distance in kilometers
        """
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth radius in kilometers
        r = 6371
        
        return c * r
    
    def calculate_similarity(self, target: Dict, comparable: Dict) -> float:
        """
        Calculate similarity score between target and comparable property
        
        Returns:
            Similarity score between 0 and 1
        """
        score = 0.0
        weights = {
            'bedrooms': 0.15,
            'bathrooms': 0.15,
            'square_feet': 0.25,
            'property_type': 0.20,
            'year_built': 0.10,
            'location': 0.15
        }
        
        # Bedrooms similarity
        if target.get('bedrooms') and comparable.get('bedrooms'):
            diff = abs(target['bedrooms'] - comparable['bedrooms'])
            score += weights['bedrooms'] * max(0, 1 - diff / 5)
        
        # Bathrooms similarity
        if target.get('bathrooms') and comparable.get('bathrooms'):
            diff = abs(target['bathrooms'] - comparable['bathrooms'])
            score += weights['bathrooms'] * max(0, 1 - diff / 3)
        
        # Square feet similarity
        if target.get('square_feet') and comparable.get('square_feet'):
            ratio = min(target['square_feet'], comparable['square_feet']) / max(target['square_feet'], comparable['square_feet'])
            score += weights['square_feet'] * ratio
        
        # Property type match
        if target.get('property_type') == comparable.get('property_type'):
            score += weights['property_type']
        
        # Year built similarity
        if target.get('year_built') and comparable.get('year_built'):
            diff = abs(target['year_built'] - comparable['year_built'])
            score += weights['year_built'] * max(0, 1 - diff / 50)
        
        # Location proximity (distance-based)
        distance = self.calculate_distance(
            target['latitude'], target['longitude'],
            comparable['latitude'], comparable['longitude']
        )
        score += weights['location'] * max(0, 1 - distance / self.max_distance_km)
        
        return score
    
    def find_comparables(self, target: Dict, candidates: List[Dict], top_k: int = 10) -> List[Dict]:
        """
        Find most similar comparable properties
        
        Args:
            target: Target property
            candidates: List of candidate properties
            top_k: Number of top comparables to return
        
        Returns:
            List of comparable properties with similarity scores
        """
        scored_comparables = []
        
        for candidate in candidates:
            # Calculate distance
            distance = self.calculate_distance(
                target['latitude'], target['longitude'],
                candidate['latitude'], candidate['longitude']
            )
            
            # Skip if too far
            if distance > self.max_distance_km:
                continue
            
            # Calculate similarity
            similarity = self.calculate_similarity(target, candidate)
            
            scored_comparables.append({
                **candidate,
                'distance_km': distance,
                'similarity_score': similarity
            })
        
        # Sort by similarity and return top k
        scored_comparables.sort(key=lambda x: x['similarity_score'], reverse=True)
        return scored_comparables[:top_k]
