"""
Computer Vision Property Assessment Service
Analyzes property images for quality, features, and condition assessment
"""

from flask import Flask, request, jsonify
import cv2
import numpy as np
from PIL import Image
import io
import requests
from typing import List, Dict, Tuple, Optional
import logging
import os
from datetime import datetime
import base64

# Try to import TensorFlow/Keras for advanced features
try:
    import tensorflow as tf
    from tensorflow import keras
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print("TensorFlow not available - using basic CV features only")

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
MODEL_PATH = os.getenv('CV_MODEL_PATH', '/tmp/cv_models')
MIN_IMAGE_SIZE = (640, 480)
MAX_IMAGE_SIZE = (4096, 4096)

class PropertyImageAnalyzer:
    """Analyzes property images for quality and features"""
    
    def __init__(self):
        self.room_classifier = None
        if TF_AVAILABLE:
            self.load_models()
    
    def load_models(self):
        """Load pre-trained models"""
        # In production, load actual trained models
        # For now, we'll use basic CV features
        logger.info("CV models initialized")
    
    def analyze_image_quality(self, image: np.ndarray) -> Dict:
        """
        Analyze image quality metrics
        
        Args:
            image: OpenCV image (BGR format)
            
        Returns:
            Quality metrics dictionary
        """
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 1. Sharpness (Laplacian variance)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = laplacian.var()
        
        # 2. Brightness
        brightness = gray.mean()
        
        # 3. Contrast (standard deviation)
        contrast = gray.std()
        
        # 4. Color distribution
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        color_variance = hsv[:, :, 1].std()  # Saturation variance
        
        # 5. Resolution check
        height, width = image.shape[:2]
        resolution_score = min(100, (width * height) / (1920 * 1080) * 100)
        
        # 6. Noise level (using high-frequency content)
        noise_level = self.estimate_noise(gray)
        
        # Calculate overall quality score (0-100)
        quality_score = self.calculate_quality_score({
            'sharpness': sharpness,
            'brightness': brightness,
            'contrast': contrast,
            'color_variance': color_variance,
            'resolution': resolution_score,
            'noise': noise_level
        })
        
        return {
            'overallScore': round(quality_score, 2),
            'sharpness': round(min(100, sharpness / 10), 2),
            'brightness': round(min(100, brightness / 2.55), 2),
            'contrast': round(min(100, contrast / 0.8), 2),
            'colorfulness': round(min(100, color_variance / 1.0), 2),
            'resolution': round(resolution_score, 2),
            'noiseLevel': round(noise_level, 2),
            'dimensions': {'width': width, 'height': height},
            'recommendations': self.get_quality_recommendations(quality_score, {
                'sharpness': sharpness,
                'brightness': brightness,
                'contrast': contrast,
                'noise': noise_level
            })
        }
    
    def estimate_noise(self, gray_image: np.ndarray) -> float:
        """Estimate noise level in image"""
        # Use median absolute deviation method
        h, w = gray_image.shape
        M = [[1, -2, 1],
             [-2, 4, -2],
             [1, -2, 1]]
        
        sigma = np.sum(np.sum(np.absolute(cv2.filter2D(gray_image, -1, np.array(M)))))
        sigma = sigma * np.sqrt(0.5 * np.pi) / (6 * (w-2) * (h-2))
        
        return min(100, sigma)
    
    def calculate_quality_score(self, metrics: Dict) -> float:
        """Calculate overall quality score from individual metrics"""
        # Normalize and weight different factors
        weights = {
            'sharpness': 0.25,
            'brightness': 0.15,
            'contrast': 0.15,
            'color_variance': 0.15,
            'resolution': 0.20,
            'noise': 0.10
        }
        
        # Normalize metrics to 0-100 scale
        normalized = {
            'sharpness': min(100, metrics['sharpness'] / 10 * 100),
            'brightness': min(100, abs(128 - metrics['brightness']) / 128 * 100),  # Penalize too dark/bright
            'contrast': min(100, metrics['contrast'] / 80 * 100),
            'color_variance': min(100, metrics['color_variance'] * 100),
            'resolution': metrics['resolution'],
            'noise': max(0, 100 - metrics['noise'])  # Lower noise is better
        }
        
        score = sum(normalized[k] * weights[k] for k in weights.keys())
        return score
    
    def get_quality_recommendations(self, score: float, metrics: Dict) -> List[str]:
        """Generate recommendations for improving image quality"""
        recommendations = []
        
        if score < 50:
            recommendations.append("Consider retaking this photo with better lighting and focus")
        
        if metrics['sharpness'] < 50:
            recommendations.append("Image appears blurry - ensure camera is focused and steady")
        
        if metrics['brightness'] < 80:
            recommendations.append("Image is too dark - use more lighting or adjust exposure")
        elif metrics['brightness'] > 180:
            recommendations.append("Image is overexposed - reduce lighting or lower exposure")
        
        if metrics['contrast'] < 30:
            recommendations.append("Low contrast - try shooting in better lighting conditions")
        
        if metrics['noise'] > 30:
            recommendations.append("High noise level - use lower ISO or better lighting")
        
        if not recommendations:
            recommendations.append("Good quality image - no improvements needed")
        
        return recommendations
    
    def detect_room_type(self, image: np.ndarray) -> Dict:
        """
        Detect room type from image
        
        Args:
            image: OpenCV image
            
        Returns:
            Room type classification
        """
        # In production, use trained CNN model
        # For now, use basic heuristics
        
        # Analyze color distribution and features
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Detect edges (furniture, fixtures)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        
        # Detect horizontal lines (floors, counters)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)
        horizontal_lines = 0
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                angle = np.abs(np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi)
                if angle < 10 or angle > 170:
                    horizontal_lines += 1
        
        # Simple heuristic classification
        # In production, replace with trained model
        room_types = ['living_room', 'bedroom', 'kitchen', 'bathroom', 'exterior', 'other']
        confidences = [0.3, 0.2, 0.15, 0.15, 0.1, 0.1]  # Mock confidences
        
        return {
            'roomType': room_types[0],
            'confidence': round(confidences[0] * 100, 2),
            'alternatives': [
                {'type': room_types[i], 'confidence': round(confidences[i] * 100, 2)}
                for i in range(1, min(4, len(room_types)))
            ]
        }
    
    def extract_features(self, image: np.ndarray) -> Dict:
        """
        Extract property features from image
        
        Args:
            image: OpenCV image
            
        Returns:
            Detected features
        """
        features = {
            'hasWindows': False,
            'hasNaturalLight': False,
            'hasModernFixtures': False,
            'hasWoodFlooring': False,
            'hasTileFlooring': False,
            'hasHighCeilings': False,
            'estimatedCondition': 'good'
        }
        
        # Detect bright areas (windows, natural light)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        bright_pixels = np.sum(gray > 200) / gray.size
        features['hasNaturalLight'] = bright_pixels > 0.15
        features['hasWindows'] = bright_pixels > 0.10
        
        # Detect wood textures (brown/tan colors)
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        brown_mask = cv2.inRange(hsv, np.array([10, 50, 50]), np.array([30, 255, 200]))
        wood_percentage = np.sum(brown_mask > 0) / brown_mask.size
        features['hasWoodFlooring'] = wood_percentage > 0.20
        
        # Detect tile patterns (high-frequency patterns in lower part of image)
        lower_half = gray[gray.shape[0]//2:, :]
        edges = cv2.Canny(lower_half, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        features['hasTileFlooring'] = edge_density > 0.10 and not features['hasWoodFlooring']
        
        # Estimate ceiling height (vertical space above furniture line)
        # Simplified heuristic
        features['hasHighCeilings'] = image.shape[0] > 1200
        
        # Estimate condition based on overall quality
        if bright_pixels > 0.15 and edge_density < 0.15:
            features['estimatedCondition'] = 'excellent'
        elif bright_pixels > 0.10:
            features['estimatedCondition'] = 'good'
        else:
            features['estimatedCondition'] = 'fair'
        
        return features
    
    def find_similar_images(self, query_image: np.ndarray, candidate_images: List[np.ndarray], top_k: int = 5) -> List[Tuple[int, float]]:
        """
        Find similar images using feature matching
        
        Args:
            query_image: Query image
            candidate_images: List of candidate images
            top_k: Number of top matches to return
            
        Returns:
            List of (index, similarity_score) tuples
        """
        # Use ORB features for similarity
        orb = cv2.ORB_create()
        
        # Detect keypoints and descriptors for query
        kp1, des1 = orb.detectAndCompute(query_image, None)
        
        if des1 is None:
            return []
        
        # Match with each candidate
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        similarities = []
        
        for idx, candidate in enumerate(candidate_images):
            kp2, des2 = orb.detectAndCompute(candidate, None)
            
            if des2 is None:
                similarities.append((idx, 0.0))
                continue
            
            # Match descriptors
            matches = bf.match(des1, des2)
            
            # Calculate similarity score
            if len(matches) > 0:
                # Normalize by number of keypoints
                similarity = len(matches) / max(len(kp1), len(kp2))
            else:
                similarity = 0.0
            
            similarities.append((idx, similarity))
        
        # Sort by similarity and return top K
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]
    
    def assess_property_condition(self, images: List[np.ndarray]) -> Dict:
        """
        Assess overall property condition from multiple images
        
        Args:
            images: List of property images
            
        Returns:
            Property condition assessment
        """
        if not images:
            return {'overallCondition': 'unknown', 'confidence': 0}
        
        # Analyze each image
        quality_scores = []
        feature_counts = {
            'hasNaturalLight': 0,
            'hasModernFixtures': 0,
            'hasWoodFlooring': 0,
            'hasTileFlooring': 0,
            'hasHighCeilings': 0
        }
        
        for image in images:
            quality = self.analyze_image_quality(image)
            quality_scores.append(quality['overallScore'])
            
            features = self.extract_features(image)
            for key in feature_counts:
                if features.get(key, False):
                    feature_counts[key] += 1
        
        # Calculate overall assessment
        avg_quality = np.mean(quality_scores)
        feature_percentage = sum(feature_counts.values()) / (len(images) * len(feature_counts))
        
        # Determine condition
        if avg_quality > 75 and feature_percentage > 0.5:
            condition = 'excellent'
            confidence = 85
        elif avg_quality > 60 and feature_percentage > 0.3:
            condition = 'good'
            confidence = 75
        elif avg_quality > 40:
            condition = 'fair'
            confidence = 65
        else:
            condition = 'needs_improvement'
            confidence = 70
        
        return {
            'overallCondition': condition,
            'confidence': confidence,
            'averageImageQuality': round(avg_quality, 2),
            'detectedFeatures': {k: v for k, v in feature_counts.items() if v > 0},
            'totalImages': len(images),
            'recommendations': self.get_property_recommendations(condition, feature_counts, len(images))
        }
    
    def get_property_recommendations(self, condition: str, features: Dict, num_images: int) -> List[str]:
        """Generate recommendations for property listing"""
        recommendations = []
        
        if num_images < 5:
            recommendations.append(f"Add more photos - {5 - num_images} more recommended for better listing")
        
        if condition == 'needs_improvement':
            recommendations.append("Consider professional photography to showcase property better")
        
        if features['hasNaturalLight'] == 0:
            recommendations.append("Add photos showing natural lighting and windows")
        
        if features['hasModernFixtures'] == 0:
            recommendations.append("Highlight modern amenities and fixtures in photos")
        
        if not recommendations:
            recommendations.append("Great photo quality - listing looks professional")
        
        return recommendations


# Global analyzer instance
analyzer = PropertyImageAnalyzer()


def load_image_from_url(url: str) -> Optional[np.ndarray]:
    """Load image from URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        image = Image.open(io.BytesIO(response.content))
        image = image.convert('RGB')
        
        # Convert PIL to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        return opencv_image
    except Exception as e:
        logger.error(f"Error loading image from URL: {str(e)}")
        return None


def load_image_from_base64(base64_str: str) -> Optional[np.ndarray]:
    """Load image from base64 string"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        image_data = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_data))
        image = image.convert('RGB')
        
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        return opencv_image
    except Exception as e:
        logger.error(f"Error loading image from base64: {str(e)}")
        return None


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'computer-vision',
        'tensorflow_available': TF_AVAILABLE,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/analyze/quality', methods=['POST'])
def analyze_quality():
    """Analyze image quality"""
    try:
        data = request.json
        image_url = data.get('imageUrl')
        image_base64 = data.get('imageBase64')
        
        # Load image
        if image_url:
            image = load_image_from_url(image_url)
        elif image_base64:
            image = load_image_from_base64(image_base64)
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        if image is None:
            return jsonify({'error': 'Failed to load image'}), 400
        
        # Analyze quality
        quality = analyzer.analyze_image_quality(image)
        
        return jsonify(quality)
    
    except Exception as e:
        logger.error(f"Error analyzing quality: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/analyze/room', methods=['POST'])
def analyze_room():
    """Detect room type"""
    try:
        data = request.json
        image_url = data.get('imageUrl')
        image_base64 = data.get('imageBase64')
        
        # Load image
        if image_url:
            image = load_image_from_url(image_url)
        elif image_base64:
            image = load_image_from_base64(image_base64)
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        if image is None:
            return jsonify({'error': 'Failed to load image'}), 400
        
        # Detect room type
        room_info = analyzer.detect_room_type(image)
        
        return jsonify(room_info)
    
    except Exception as e:
        logger.error(f"Error detecting room: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/analyze/features', methods=['POST'])
def analyze_features():
    """Extract property features"""
    try:
        data = request.json
        image_url = data.get('imageUrl')
        image_base64 = data.get('imageBase64')
        
        # Load image
        if image_url:
            image = load_image_from_url(image_url)
        elif image_base64:
            image = load_image_from_base64(image_base64)
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        if image is None:
            return jsonify({'error': 'Failed to load image'}), 400
        
        # Extract features
        features = analyzer.extract_features(image)
        
        return jsonify(features)
    
    except Exception as e:
        logger.error(f"Error extracting features: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/analyze/property', methods=['POST'])
def analyze_property():
    """Analyze property from multiple images"""
    try:
        data = request.json
        image_urls = data.get('imageUrls', [])
        
        if not image_urls:
            return jsonify({'error': 'No images provided'}), 400
        
        # Load all images
        images = []
        for url in image_urls:
            image = load_image_from_url(url)
            if image is not None:
                images.append(image)
        
        if not images:
            return jsonify({'error': 'Failed to load any images'}), 400
        
        # Assess property condition
        assessment = analyzer.assess_property_condition(images)
        
        return jsonify(assessment)
    
    except Exception as e:
        logger.error(f"Error analyzing property: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/similar', methods=['POST'])
def find_similar():
    """Find similar images"""
    try:
        data = request.json
        query_url = data.get('queryImageUrl')
        candidate_urls = data.get('candidateImageUrls', [])
        top_k = data.get('topK', 5)
        
        if not query_url or not candidate_urls:
            return jsonify({'error': 'Query and candidate images required'}), 400
        
        # Load images
        query_image = load_image_from_url(query_url)
        if query_image is None:
            return jsonify({'error': 'Failed to load query image'}), 400
        
        candidate_images = []
        for url in candidate_urls:
            image = load_image_from_url(url)
            if image is not None:
                candidate_images.append(image)
        
        if not candidate_images:
            return jsonify({'error': 'Failed to load candidate images'}), 400
        
        # Find similar
        similar = analyzer.find_similar_images(query_image, candidate_images, top_k)
        
        return jsonify({
            'similarImages': [
                {'index': idx, 'similarity': float(score)}
                for idx, score in similar
            ]
        })
    
    except Exception as e:
        logger.error(f"Error finding similar images: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5004))
    app.run(host='0.0.0.0', port=port, debug=False)
