import tensorflow as tf
import numpy as np
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class PropertyRecommendationModel:
    """
    Hybrid recommendation model combining collaborative filtering and content-based filtering
    using TensorFlow for real estate property recommendations.
    """
    
    def __init__(self, num_users: int, num_properties: int, embedding_dim: int = 64):
        """
        Initialize the recommendation model.
        
        Args:
            num_users: Total number of users in the system
            num_properties: Total number of properties in the system
            embedding_dim: Dimension of embedding vectors
        """
        self.num_users = num_users
        self.num_properties = num_properties
        self.embedding_dim = embedding_dim
        self.model = None
        self._build_model()
    
    def _build_model(self):
        """Build the neural collaborative filtering model."""
        # User input
        user_input = tf.keras.layers.Input(shape=(1,), name='user_input')
        user_embedding = tf.keras.layers.Embedding(
            input_dim=self.num_users,
            output_dim=self.embedding_dim,
            name='user_embedding'
        )(user_input)
        user_vec = tf.keras.layers.Flatten()(user_embedding)
        
        # Property input
        property_input = tf.keras.layers.Input(shape=(1,), name='property_input')
        property_embedding = tf.keras.layers.Embedding(
            input_dim=self.num_properties,
            output_dim=self.embedding_dim,
            name='property_embedding'
        )(property_input)
        property_vec = tf.keras.layers.Flatten()(property_embedding)
        
        # Property features input (price, sqft, bedrooms, bathrooms, etc.)
        property_features = tf.keras.layers.Input(shape=(10,), name='property_features')
        
        # Concatenate embeddings and features
        concat = tf.keras.layers.Concatenate()([user_vec, property_vec, property_features])
        
        # Deep neural network
        dense1 = tf.keras.layers.Dense(256, activation='relu')(concat)
        dropout1 = tf.keras.layers.Dropout(0.3)(dense1)
        dense2 = tf.keras.layers.Dense(128, activation='relu')(dropout1)
        dropout2 = tf.keras.layers.Dropout(0.3)(dense2)
        dense3 = tf.keras.layers.Dense(64, activation='relu')(dropout2)
        dropout3 = tf.keras.layers.Dropout(0.2)(dense3)
        
        # Output layer - prediction score
        output = tf.keras.layers.Dense(1, activation='sigmoid', name='output')(dropout3)
        
        # Build model
        self.model = tf.keras.Model(
            inputs=[user_input, property_input, property_features],
            outputs=output
        )
        
        # Compile model
        self.model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
        )
        
        logger.info(f"Model built with {self.model.count_params()} parameters")
    
    def train(self, train_data: Dict, validation_data: Dict = None, epochs: int = 50, batch_size: int = 256):
        """
        Train the recommendation model.
        
        Args:
            train_data: Dictionary containing training data
            validation_data: Dictionary containing validation data
            epochs: Number of training epochs
            batch_size: Batch size for training
        """
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss' if validation_data else 'loss',
                patience=5,
                restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss' if validation_data else 'loss',
                factor=0.5,
                patience=3,
                min_lr=1e-6
            ),
            tf.keras.callbacks.ModelCheckpoint(
                filepath='checkpoints/model_{epoch:02d}.h5',
                save_best_only=True,
                monitor='val_loss' if validation_data else 'loss'
            )
        ]
        
        history = self.model.fit(
            x=[train_data['user_ids'], train_data['property_ids'], train_data['property_features']],
            y=train_data['labels'],
            validation_data=(
                [validation_data['user_ids'], validation_data['property_ids'], validation_data['property_features']],
                validation_data['labels']
            ) if validation_data else None,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        logger.info("Model training completed")
        return history
    
    def predict(self, user_id: int, property_ids: List[int], property_features: np.ndarray) -> np.ndarray:
        """
        Predict recommendation scores for given properties.
        
        Args:
            user_id: User ID
            property_ids: List of property IDs
            property_features: Property features array
            
        Returns:
            Array of prediction scores
        """
        user_ids = np.array([user_id] * len(property_ids))
        property_ids = np.array(property_ids)
        
        predictions = self.model.predict(
            [user_ids, property_ids, property_features],
            verbose=0
        )
        
        return predictions.flatten()
    
    def recommend_properties(self, user_id: int, candidate_properties: List[Dict], top_k: int = 10) -> List[Dict]:
        """
        Recommend top-k properties for a user.
        
        Args:
            user_id: User ID
            candidate_properties: List of candidate properties with features
            top_k: Number of recommendations to return
            
        Returns:
            List of recommended properties with scores
        """
        property_ids = [p['id'] for p in candidate_properties]
        property_features = np.array([self._extract_features(p) for p in candidate_properties])
        
        scores = self.predict(user_id, property_ids, property_features)
        
        # Combine properties with scores
        recommendations = []
        for prop, score in zip(candidate_properties, scores):
            recommendations.append({
                **prop,
                'recommendation_score': float(score)
            })
        
        # Sort by score and return top-k
        recommendations.sort(key=lambda x: x['recommendation_score'], reverse=True)
        return recommendations[:top_k]
    
    def _extract_features(self, property_data: Dict) -> List[float]:
        """Extract numerical features from property data."""
        return [
            float(property_data.get('price', 0)) / 1000000,  # Normalize price
            float(property_data.get('square_feet', 0)) / 10000,  # Normalize sqft
            float(property_data.get('bedrooms', 0)) / 10,
            float(property_data.get('bathrooms', 0)) / 10,
            float(property_data.get('year_built', 2000)) / 2024,
            1.0 if property_data.get('property_type') == 'HOUSE' else 0.0,
            1.0 if property_data.get('property_type') == 'CONDO' else 0.0,
            1.0 if property_data.get('property_type') == 'TOWNHOUSE' else 0.0,
            float(property_data.get('latitude', 0)) / 90,
            float(property_data.get('longitude', 0)) / 180,
        ]
    
    def save_model(self, filepath: str):
        """Save the model to disk."""
        self.model.save(filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load the model from disk."""
        self.model = tf.keras.models.load_model(filepath)
        logger.info(f"Model loaded from {filepath}")


class ContentBasedFilter:
    """Content-based filtering using property features."""
    
    def __init__(self):
        self.property_vectors = {}
    
    def fit(self, properties: List[Dict]):
        """Build property feature vectors."""
        for prop in properties:
            self.property_vectors[prop['id']] = self._create_feature_vector(prop)
    
    def _create_feature_vector(self, property_data: Dict) -> np.ndarray:
        """Create feature vector from property attributes."""
        features = []
        
        # Numerical features
        features.extend([
            property_data.get('price', 0),
            property_data.get('square_feet', 0),
            property_data.get('bedrooms', 0),
            property_data.get('bathrooms', 0),
            property_data.get('year_built', 0),
        ])
        
        # Categorical features (one-hot encoded)
        property_types = ['HOUSE', 'CONDO', 'TOWNHOUSE', 'APARTMENT', 'LAND']
        for pt in property_types:
            features.append(1.0 if property_data.get('property_type') == pt else 0.0)
        
        # Location features
        features.extend([
            property_data.get('latitude', 0),
            property_data.get('longitude', 0),
        ])
        
        return np.array(features)
    
    def find_similar_properties(self, property_id: int, top_k: int = 10) -> List[Tuple[int, float]]:
        """Find similar properties using cosine similarity."""
        if property_id not in self.property_vectors:
            return []
        
        target_vector = self.property_vectors[property_id]
        similarities = []
        
        for pid, vector in self.property_vectors.items():
            if pid != property_id:
                similarity = self._cosine_similarity(target_vector, vector)
                similarities.append((pid, similarity))
        
        # Sort by similarity and return top-k
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]
    
    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors."""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)


class CollaborativeFilter:
    """Collaborative filtering using user-property interactions."""
    
    def __init__(self):
        self.user_property_matrix = None
        self.user_similarities = {}
    
    def fit(self, interactions: List[Dict]):
        """Build user-property interaction matrix."""
        # Build sparse matrix from interactions
        user_ids = set()
        property_ids = set()
        
        for interaction in interactions:
            user_ids.add(interaction['user_id'])
            property_ids.add(interaction['property_id'])
        
        # Create mapping
        self.user_id_map = {uid: idx for idx, uid in enumerate(sorted(user_ids))}
        self.property_id_map = {pid: idx for idx, pid in enumerate(sorted(property_ids))}
        
        # Initialize matrix
        matrix_shape = (len(user_ids), len(property_ids))
        self.user_property_matrix = np.zeros(matrix_shape)
        
        # Fill matrix with interaction scores
        for interaction in interactions:
            user_idx = self.user_id_map[interaction['user_id']]
            property_idx = self.property_id_map[interaction['property_id']]
            score = interaction.get('score', 1.0)  # View=0.5, Favorite=1.0, Purchase=2.0
            self.user_property_matrix[user_idx, property_idx] = score
    
    def recommend_for_user(self, user_id: int, top_k: int = 10) -> List[Tuple[int, float]]:
        """Recommend properties for a user based on similar users."""
        if user_id not in self.user_id_map:
            return []
        
        user_idx = self.user_id_map[user_id]
        user_vector = self.user_property_matrix[user_idx]
        
        # Find similar users
        similar_users = self._find_similar_users(user_idx, k=20)
        
        # Aggregate recommendations from similar users
        property_scores = np.zeros(self.user_property_matrix.shape[1])
        
        for similar_user_idx, similarity in similar_users:
            similar_user_vector = self.user_property_matrix[similar_user_idx]
            property_scores += similarity * similar_user_vector
        
        # Get properties user hasn't interacted with
        uninteracted_properties = np.where(user_vector == 0)[0]
        
        # Get top-k recommendations
        recommendations = []
        for prop_idx in uninteracted_properties:
            score = property_scores[prop_idx]
            if score > 0:
                property_id = list(self.property_id_map.keys())[list(self.property_id_map.values()).index(prop_idx)]
                recommendations.append((property_id, float(score)))
        
        recommendations.sort(key=lambda x: x[1], reverse=True)
        return recommendations[:top_k]
    
    def _find_similar_users(self, user_idx: int, k: int = 20) -> List[Tuple[int, float]]:
        """Find k most similar users."""
        user_vector = self.user_property_matrix[user_idx]
        similarities = []
        
        for idx in range(self.user_property_matrix.shape[0]):
            if idx != user_idx:
                other_vector = self.user_property_matrix[idx]
                similarity = self._cosine_similarity(user_vector, other_vector)
                if similarity > 0:
                    similarities.append((idx, similarity))
        
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:k]
    
    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors."""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
