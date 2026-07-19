"""
Collaborative Filtering Recommendation Service
Implements user-item matrix factorization for personalized property recommendations
"""

from flask import Flask, request, jsonify
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
import pandas as pd
from datetime import datetime, timedelta
import logging
import os
import json
from typing import List, Dict, Tuple, Optional
import pickle
from collections import defaultdict

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
MODEL_PATH = os.getenv('MODEL_PATH', '/tmp/cf_model.pkl')
MIN_INTERACTIONS = int(os.getenv('MIN_INTERACTIONS', '3'))
N_COMPONENTS = int(os.getenv('N_COMPONENTS', '50'))
SIMILARITY_THRESHOLD = float(os.getenv('SIMILARITY_THRESHOLD', '0.3'))

class CollaborativeFilteringEngine:
    """Collaborative Filtering Recommendation Engine"""
    
    def __init__(self):
        self.user_item_matrix = None
        self.user_similarity_matrix = None
        self.item_similarity_matrix = None
        self.svd_model = None
        self.user_index = {}
        self.item_index = {}
        self.reverse_user_index = {}
        self.reverse_item_index = {}
        self.user_factors = None
        self.item_factors = None
        self.global_mean = 0
        self.user_bias = {}
        self.item_bias = {}
        
    def build_user_item_matrix(self, interactions: List[Dict]) -> csr_matrix:
        """
        Build user-item interaction matrix from interaction data
        
        Args:
            interactions: List of {userId, propertyId, interactionType, timestamp, rating}
            
        Returns:
            Sparse user-item matrix
        """
        logger.info(f"Building user-item matrix from {len(interactions)} interactions")
        
        # Create user and item mappings
        users = sorted(set(i['userId'] for i in interactions))
        items = sorted(set(i['propertyId'] for i in interactions))
        
        self.user_index = {user: idx for idx, user in enumerate(users)}
        self.item_index = {item: idx for idx, item in enumerate(items)}
        self.reverse_user_index = {idx: user for user, idx in self.user_index.items()}
        self.reverse_item_index = {idx: item for item, idx in self.item_index.items()}
        
        # Build interaction matrix with weighted ratings
        rows, cols, data = [], [], []
        
        # Weight different interaction types
        interaction_weights = {
            'view': 1.0,
            'favorite': 3.0,
            'inquiry': 5.0,
            'tour_request': 7.0,
            'offer': 10.0
        }
        
        for interaction in interactions:
            user_idx = self.user_index[interaction['userId']]
            item_idx = self.item_index[interaction['propertyId']]
            
            # Calculate weighted score
            base_weight = interaction_weights.get(interaction.get('interactionType', 'view'), 1.0)
            rating = interaction.get('rating', 0)
            
            if rating > 0:
                # Explicit rating provided
                score = rating * base_weight
            else:
                # Implicit feedback
                score = base_weight
            
            rows.append(user_idx)
            cols.append(item_idx)
            data.append(score)
        
        # Create sparse matrix
        matrix = csr_matrix(
            (data, (rows, cols)),
            shape=(len(users), len(items))
        )
        
        self.user_item_matrix = matrix
        
        # Calculate global statistics
        self.global_mean = matrix.data.mean() if len(matrix.data) > 0 else 0
        
        # Calculate user and item biases
        for user_id, user_idx in self.user_index.items():
            user_ratings = matrix[user_idx].data
            if len(user_ratings) > 0:
                self.user_bias[user_id] = user_ratings.mean() - self.global_mean
            else:
                self.user_bias[user_id] = 0
                
        for item_id, item_idx in self.item_index.items():
            item_ratings = matrix[:, item_idx].data
            if len(item_ratings) > 0:
                self.item_bias[item_id] = item_ratings.mean() - self.global_mean
            else:
                self.item_bias[item_id] = 0
        
        logger.info(f"Matrix shape: {matrix.shape}, density: {matrix.nnz / (matrix.shape[0] * matrix.shape[1]):.4f}")
        
        return matrix
    
    def train_matrix_factorization(self):
        """Train matrix factorization model using SVD"""
        logger.info("Training matrix factorization model")
        
        if self.user_item_matrix is None:
            raise ValueError("User-item matrix not built")
        
        # Apply SVD for dimensionality reduction
        self.svd_model = TruncatedSVD(n_components=min(N_COMPONENTS, min(self.user_item_matrix.shape) - 1))
        self.user_factors = self.svd_model.fit_transform(self.user_item_matrix)
        self.item_factors = self.svd_model.components_.T
        
        logger.info(f"Model trained with {N_COMPONENTS} components, explained variance: {self.svd_model.explained_variance_ratio_.sum():.4f}")
    
    def compute_user_similarity(self):
        """Compute user-user similarity matrix"""
        logger.info("Computing user similarity matrix")
        
        if self.user_factors is None:
            raise ValueError("Model not trained")
        
        self.user_similarity_matrix = cosine_similarity(self.user_factors)
        logger.info(f"User similarity matrix computed: {self.user_similarity_matrix.shape}")
    
    def compute_item_similarity(self):
        """Compute item-item similarity matrix"""
        logger.info("Computing item similarity matrix")
        
        if self.item_factors is None:
            raise ValueError("Model not trained")
        
        self.item_similarity_matrix = cosine_similarity(self.item_factors)
        logger.info(f"Item similarity matrix computed: {self.item_similarity_matrix.shape}")
    
    def get_user_based_recommendations(
        self, 
        user_id: int, 
        n_recommendations: int = 10,
        exclude_interacted: bool = True
    ) -> List[Tuple[int, float]]:
        """
        Get recommendations using user-based collaborative filtering
        
        Args:
            user_id: User ID to get recommendations for
            n_recommendations: Number of recommendations to return
            exclude_interacted: Whether to exclude already interacted items
            
        Returns:
            List of (property_id, score) tuples
        """
        if user_id not in self.user_index:
            logger.warning(f"User {user_id} not in training data")
            return []
        
        user_idx = self.user_index[user_id]
        
        # Find similar users
        user_similarities = self.user_similarity_matrix[user_idx]
        similar_users = np.argsort(user_similarities)[::-1][1:51]  # Top 50 similar users
        
        # Get items interacted by similar users
        item_scores = defaultdict(float)
        
        for similar_user_idx in similar_users:
            similarity = user_similarities[similar_user_idx]
            
            if similarity < SIMILARITY_THRESHOLD:
                continue
            
            # Get items this similar user interacted with
            similar_user_items = self.user_item_matrix[similar_user_idx].nonzero()[1]
            similar_user_ratings = self.user_item_matrix[similar_user_idx].data
            
            for item_idx, rating in zip(similar_user_items, similar_user_ratings):
                item_id = self.reverse_item_index[item_idx]
                item_scores[item_id] += similarity * rating
        
        # Exclude already interacted items
        if exclude_interacted:
            user_items = set(self.reverse_item_index[idx] for idx in self.user_item_matrix[user_idx].nonzero()[1])
            item_scores = {k: v for k, v in item_scores.items() if k not in user_items}
        
        # Sort by score and return top N
        recommendations = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)[:n_recommendations]
        
        return recommendations
    
    def get_item_based_recommendations(
        self, 
        user_id: int, 
        n_recommendations: int = 10,
        exclude_interacted: bool = True
    ) -> List[Tuple[int, float]]:
        """
        Get recommendations using item-based collaborative filtering
        
        Args:
            user_id: User ID to get recommendations for
            n_recommendations: Number of recommendations to return
            exclude_interacted: Whether to exclude already interacted items
            
        Returns:
            List of (property_id, score) tuples
        """
        if user_id not in self.user_index:
            logger.warning(f"User {user_id} not in training data")
            return []
        
        user_idx = self.user_index[user_id]
        
        # Get items user has interacted with
        user_items = self.user_item_matrix[user_idx].nonzero()[1]
        user_ratings = self.user_item_matrix[user_idx].data
        
        if len(user_items) == 0:
            return []
        
        # Find similar items
        item_scores = defaultdict(float)
        
        for item_idx, rating in zip(user_items, user_ratings):
            # Get similar items
            item_similarities = self.item_similarity_matrix[item_idx]
            
            for similar_item_idx, similarity in enumerate(item_similarities):
                if similarity < SIMILARITY_THRESHOLD or similar_item_idx == item_idx:
                    continue
                
                similar_item_id = self.reverse_item_index[similar_item_idx]
                item_scores[similar_item_id] += similarity * rating
        
        # Exclude already interacted items
        if exclude_interacted:
            user_items_set = set(self.reverse_item_index[idx] for idx in user_items)
            item_scores = {k: v for k, v in item_scores.items() if k not in user_items_set}
        
        # Sort by score and return top N
        recommendations = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)[:n_recommendations]
        
        return recommendations
    
    def get_hybrid_recommendations(
        self, 
        user_id: int, 
        n_recommendations: int = 10,
        user_weight: float = 0.5,
        item_weight: float = 0.5
    ) -> List[Tuple[int, float]]:
        """
        Get hybrid recommendations combining user-based and item-based CF
        
        Args:
            user_id: User ID to get recommendations for
            n_recommendations: Number of recommendations to return
            user_weight: Weight for user-based recommendations
            item_weight: Weight for item-based recommendations
            
        Returns:
            List of (property_id, score) tuples
        """
        # Get both types of recommendations
        user_based = self.get_user_based_recommendations(user_id, n_recommendations * 2)
        item_based = self.get_item_based_recommendations(user_id, n_recommendations * 2)
        
        # Combine scores
        combined_scores = defaultdict(float)
        
        for item_id, score in user_based:
            combined_scores[item_id] += user_weight * score
        
        for item_id, score in item_based:
            combined_scores[item_id] += item_weight * score
        
        # Add bias terms
        for item_id in combined_scores:
            combined_scores[item_id] += self.global_mean + self.user_bias.get(user_id, 0) + self.item_bias.get(item_id, 0)
        
        # Sort and return top N
        recommendations = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)[:n_recommendations]
        
        return recommendations
    
    def get_similar_users(self, user_id: int, n_users: int = 10) -> List[Tuple[int, float]]:
        """Find similar users"""
        if user_id not in self.user_index:
            return []
        
        user_idx = self.user_index[user_id]
        similarities = self.user_similarity_matrix[user_idx]
        
        # Get top similar users (excluding self)
        similar_indices = np.argsort(similarities)[::-1][1:n_users+1]
        
        return [(self.reverse_user_index[idx], similarities[idx]) for idx in similar_indices]
    
    def get_similar_items(self, item_id: int, n_items: int = 10) -> List[Tuple[int, float]]:
        """Find similar items"""
        if item_id not in self.item_index:
            return []
        
        item_idx = self.item_index[item_id]
        similarities = self.item_similarity_matrix[item_idx]
        
        # Get top similar items (excluding self)
        similar_indices = np.argsort(similarities)[::-1][1:n_items+1]
        
        return [(self.reverse_item_index[idx], similarities[idx]) for idx in similar_indices]
    
    def save_model(self, path: str = MODEL_PATH):
        """Save trained model to disk"""
        model_data = {
            'user_item_matrix': self.user_item_matrix,
            'user_similarity_matrix': self.user_similarity_matrix,
            'item_similarity_matrix': self.item_similarity_matrix,
            'svd_model': self.svd_model,
            'user_index': self.user_index,
            'item_index': self.item_index,
            'reverse_user_index': self.reverse_user_index,
            'reverse_item_index': self.reverse_item_index,
            'user_factors': self.user_factors,
            'item_factors': self.item_factors,
            'global_mean': self.global_mean,
            'user_bias': self.user_bias,
            'item_bias': self.item_bias
        }
        
        with open(path, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path: str = MODEL_PATH):
        """Load trained model from disk"""
        if not os.path.exists(path):
            logger.warning(f"Model file not found: {path}")
            return False
        
        with open(path, 'rb') as f:
            model_data = pickle.load(f)
        
        self.user_item_matrix = model_data['user_item_matrix']
        self.user_similarity_matrix = model_data['user_similarity_matrix']
        self.item_similarity_matrix = model_data['item_similarity_matrix']
        self.svd_model = model_data['svd_model']
        self.user_index = model_data['user_index']
        self.item_index = model_data['item_index']
        self.reverse_user_index = model_data['reverse_user_index']
        self.reverse_item_index = model_data['reverse_item_index']
        self.user_factors = model_data['user_factors']
        self.item_factors = model_data['item_factors']
        self.global_mean = model_data['global_mean']
        self.user_bias = model_data['user_bias']
        self.item_bias = model_data['item_bias']
        
        logger.info(f"Model loaded from {path}")
        return True


# Global engine instance
engine = CollaborativeFilteringEngine()

# Try to load existing model
engine.load_model()


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'collaborative-filtering',
        'model_loaded': engine.user_item_matrix is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/train', methods=['POST'])
def train_model():
    """Train collaborative filtering model"""
    try:
        data = request.json
        interactions = data.get('interactions', [])
        
        if not interactions:
            return jsonify({'error': 'No interactions provided'}), 400
        
        # Build user-item matrix
        engine.build_user_item_matrix(interactions)
        
        # Train model
        engine.train_matrix_factorization()
        
        # Compute similarity matrices
        engine.compute_user_similarity()
        engine.compute_item_similarity()
        
        # Save model
        engine.save_model()
        
        return jsonify({
            'success': True,
            'n_users': len(engine.user_index),
            'n_items': len(engine.item_index),
            'n_interactions': len(interactions),
            'matrix_density': engine.user_item_matrix.nnz / (engine.user_item_matrix.shape[0] * engine.user_item_matrix.shape[1])
        })
    
    except Exception as e:
        logger.error(f"Error training model: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/recommend/user/<int:user_id>', methods=['GET'])
def recommend_for_user(user_id):
    """Get recommendations for a user"""
    try:
        n_recommendations = int(request.args.get('n', 10))
        method = request.args.get('method', 'hybrid')  # user, item, or hybrid
        
        if engine.user_item_matrix is None:
            return jsonify({'error': 'Model not trained'}), 400
        
        if method == 'user':
            recommendations = engine.get_user_based_recommendations(user_id, n_recommendations)
        elif method == 'item':
            recommendations = engine.get_item_based_recommendations(user_id, n_recommendations)
        else:
            recommendations = engine.get_hybrid_recommendations(user_id, n_recommendations)
        
        return jsonify({
            'userId': user_id,
            'method': method,
            'recommendations': [
                {'propertyId': prop_id, 'score': float(score)}
                for prop_id, score in recommendations
            ]
        })
    
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/similar/users/<int:user_id>', methods=['GET'])
def similar_users(user_id):
    """Find similar users"""
    try:
        n_users = int(request.args.get('n', 10))
        
        if engine.user_similarity_matrix is None:
            return jsonify({'error': 'Model not trained'}), 400
        
        similar = engine.get_similar_users(user_id, n_users)
        
        return jsonify({
            'userId': user_id,
            'similarUsers': [
                {'userId': uid, 'similarity': float(sim)}
                for uid, sim in similar
            ]
        })
    
    except Exception as e:
        logger.error(f"Error finding similar users: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/similar/items/<int:item_id>', methods=['GET'])
def similar_items(item_id):
    """Find similar items"""
    try:
        n_items = int(request.args.get('n', 10))
        
        if engine.item_similarity_matrix is None:
            return jsonify({'error': 'Model not trained'}), 400
        
        similar = engine.get_similar_items(item_id, n_items)
        
        return jsonify({
            'propertyId': item_id,
            'similarProperties': [
                {'propertyId': pid, 'similarity': float(sim)}
                for pid, sim in similar
            ]
        })
    
    except Exception as e:
        logger.error(f"Error finding similar items: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/stats', methods=['GET'])
def get_stats():
    """Get model statistics"""
    try:
        if engine.user_item_matrix is None:
            return jsonify({'error': 'Model not trained'}), 400
        
        return jsonify({
            'n_users': len(engine.user_index),
            'n_items': len(engine.item_index),
            'n_interactions': engine.user_item_matrix.nnz,
            'matrix_density': float(engine.user_item_matrix.nnz / (engine.user_item_matrix.shape[0] * engine.user_item_matrix.shape[1])),
            'global_mean': float(engine.global_mean),
            'n_components': N_COMPONENTS
        })
    
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5003))
    app.run(host='0.0.0.0', port=port, debug=False)
