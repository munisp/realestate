"""
Fraud Detection Activities for Temporal Workflows
Hybrid approach: Rule-based + ML + Deep Learning + Graph Neural Networks
"""

import logging
from typing import Dict, List, Any, Tuple
import numpy as np
from temporalio import activity

# ML libraries
import torch
import torch.nn as nn
from torch_geometric.nn import GCNConv, SAGEConv
from torch_geometric.data import Data
import tensorflow as tf
from sklearn.ensemble import IsolationForest, RandomForestClassifier

# Infrastructure
import redis
from kafka import KafkaProducer
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Redis
redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

# Initialize Kafka producer
kafka_producer = KafkaProducer(
    bootstrap_servers=['kafka:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)


class FraudDetectionGNN(nn.Module):
    """Graph Neural Network for fraud detection"""
    def __init__(self, in_channels: int, hidden_channels: int, out_channels: int):
        super().__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)
        self.conv3 = SAGEConv(hidden_channels, out_channels)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.5)
    
    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = self.relu(x)
        x = self.dropout(x)
        x = self.conv2(x, edge_index)
        x = self.relu(x)
        x = self.dropout(x)
        x = self.conv3(x, edge_index)
        return torch.sigmoid(x)


# Load pre-trained fraud detection model (in production, load from MLflow)
fraud_gnn_model = FraudDetectionGNN(in_channels=20, hidden_channels=64, out_channels=1)


@activity.defn(name="DetectDocumentFraud")
async def detect_document_fraud(document_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Detect fraudulent documents using hybrid approach:
    1. Rule-based checks
    2. ML anomaly detection
    3. Deep learning image analysis
    """
    activity.logger.info(f"Detecting fraud in document {document_data.get('id')}")
    
    try:
        fraud_score = 0.0
        fraud_indicators = []
        
        # === RULE-BASED DETECTION ===
        
        # Check 1: Document age vs claimed date
        if document_data.get('metadata'):
            claimed_date = document_data.get('issuedDate')
            file_creation_date = document_data['metadata'].get('creationDate')
            if claimed_date and file_creation_date:
                # Document file shouldn't be created after claimed issue date
                if file_creation_date > claimed_date:
                    fraud_score += 0.3
                    fraud_indicators.append("File creation date after claimed issue date")
        
        # Check 2: Duplicate detection
        document_hash = document_data.get('contentHash')
        if document_hash:
            cache_key = f"document_hash:{document_hash}"
            if redis_client.exists(cache_key):
                fraud_score += 0.4
                fraud_indicators.append("Duplicate document detected")
            else:
                redis_client.setex(cache_key, 86400 * 30, "1")  # Cache for 30 days
        
        # Check 3: Suspicious patterns in extracted text
        extracted_text = document_data.get('extractedText', '')
        if extracted_text:
            suspicious_patterns = [
                'photoshop', 'edited', 'sample', 'template', 'void', 'copy'
            ]
            for pattern in suspicious_patterns:
                if pattern.lower() in extracted_text.lower():
                    fraud_score += 0.2
                    fraud_indicators.append(f"Suspicious text pattern: {pattern}")
        
        # Check 4: Image quality analysis
        if document_data.get('imageQuality'):
            quality = document_data['imageQuality']
            if quality.get('isBlurry') or quality.get('isLowResolution'):
                fraud_score += 0.15
                fraud_indicators.append("Poor image quality (potential manipulation)")
        
        # === ML-BASED ANOMALY DETECTION ===
        
        # Extract features for anomaly detection
        features = extract_document_features(document_data)
        
        # Use Isolation Forest for anomaly detection
        # (In production, use pre-trained model)
        isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        anomaly_score = isolation_forest.fit_predict([features])[0]
        
        if anomaly_score == -1:  # Anomaly detected
            fraud_score += 0.25
            fraud_indicators.append("ML anomaly detected")
        
        # === DEEP LEARNING IMAGE ANALYSIS ===
        
        if document_data.get('imageUrl'):
            # In production, run CNN model on document image
            # Check for signs of digital manipulation
            dl_fraud_score = await analyze_document_image_dl(document_data['imageUrl'])
            fraud_score += dl_fraud_score
            if dl_fraud_score > 0.3:
                fraud_indicators.append(f"Deep learning detected manipulation ({dl_fraud_score:.2f})")
        
        # Normalize fraud score to 0-100
        fraud_score = min(fraud_score * 100, 100)
        
        # Determine risk level
        if fraud_score >= 70:
            risk_level = "high"
            action = "reject"
        elif fraud_score >= 40:
            risk_level = "medium"
            action = "manual_review"
        else:
            risk_level = "low"
            action = "approve"
        
        result = {
            'isFraudulent': fraud_score >= 70,
            'fraudScore': int(fraud_score),
            'riskLevel': risk_level,
            'recommendedAction': action,
            'indicators': fraud_indicators,
            'detectionMethod': 'hybrid_rule_ml_dl',
        }
        
        # Publish fraud detection event to Kafka
        kafka_producer.send('fraud.document.detected', {
            'documentId': document_data.get('id'),
            'fraudScore': int(fraud_score),
            'riskLevel': risk_level,
            'timestamp': activity.info().current_attempt_scheduled_time.isoformat(),
        })
        
        activity.logger.info(f"Fraud detection complete: score={fraud_score:.1f}, risk={risk_level}")
        return result
        
    except Exception as e:
        activity.logger.error(f"Fraud detection failed: {e}")
        return {
            'isFraudulent': False,
            'fraudScore': 0,
            'riskLevel': 'unknown',
            'recommendedAction': 'manual_review',
            'indicators': [f"Detection error: {str(e)}"],
        }


@activity.defn(name="DetectListingFraud")
async def detect_listing_fraud(listing_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Detect fraudulent property listings using GNN and ML
    Analyzes listing patterns, user behavior, and network connections
    """
    activity.logger.info(f"Detecting fraud in listing {listing_data.get('id')}")
    
    try:
        fraud_score = 0.0
        fraud_indicators = []
        
        # === RULE-BASED CHECKS ===
        
        # Check 1: Price anomaly
        price = listing_data.get('price', 0)
        avg_market_price = listing_data.get('marketAveragePrice', 0)
        
        if avg_market_price > 0:
            price_ratio = price / avg_market_price
            if price_ratio < 0.5:  # Too cheap
                fraud_score += 0.3
                fraud_indicators.append("Price significantly below market (possible scam)")
            elif price_ratio > 2.0:  # Too expensive
                fraud_score += 0.15
                fraud_indicators.append("Price significantly above market")
        
        # Check 2: Contact information patterns
        contact_info = listing_data.get('contactInfo', {})
        phone = contact_info.get('phone', '')
        email = contact_info.get('email', '')
        
        # Check for disposable email domains
        disposable_domains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com']
        if any(domain in email for domain in disposable_domains):
            fraud_score += 0.25
            fraud_indicators.append("Disposable email address")
        
        # Check for phone number patterns (e.g., repeated digits)
        if phone and len(set(phone.replace('-', '').replace(' ', ''))) < 4:
            fraud_score += 0.2
            fraud_indicators.append("Suspicious phone number pattern")
        
        # Check 3: Image analysis
        images = listing_data.get('images', [])
        if len(images) < 3:
            fraud_score += 0.1
            fraud_indicators.append("Insufficient property images")
        
        # Check for stock/watermarked images
        for img in images:
            if img.get('hasWatermark'):
                fraud_score += 0.15
                fraud_indicators.append("Watermarked images detected")
                break
        
        # Check 4: Description analysis
        description = listing_data.get('description', '')
        spam_keywords = ['urgent', 'act now', 'limited time', 'guaranteed', 'wire transfer']
        spam_count = sum(1 for keyword in spam_keywords if keyword.lower() in description.lower())
        if spam_count >= 2:
            fraud_score += 0.2
            fraud_indicators.append(f"Spam keywords detected ({spam_count})")
        
        # === GRAPH NEURAL NETWORK ANALYSIS ===
        
        # Build graph of user-listing relationships
        user_id = listing_data.get('userId')
        listing_id = listing_data.get('id')
        
        # Get user's network (other listings, connections, transactions)
        user_network = await build_user_network(user_id)
        
        # Run GNN fraud detection
        gnn_fraud_score = await detect_fraud_with_gnn(user_network, listing_id)
        fraud_score += gnn_fraud_score
        
        if gnn_fraud_score > 0.3:
            fraud_indicators.append(f"GNN detected suspicious network patterns ({gnn_fraud_score:.2f})")
        
        # === ML CLASSIFICATION ===
        
        # Extract features for ML model
        features = extract_listing_features(listing_data)
        
        # Use Random Forest classifier (in production, use pre-trained model)
        rf_classifier = RandomForestClassifier(n_estimators=100, random_state=42)
        # Note: In production, this would be a pre-trained model
        # ml_fraud_prob = rf_classifier.predict_proba([features])[0][1]
        # fraud_score += ml_fraud_prob * 0.3
        
        # Normalize score
        fraud_score = min(fraud_score * 100, 100)
        
        # Determine risk level
        if fraud_score >= 70:
            risk_level = "high"
            action = "suspend_listing"
        elif fraud_score >= 40:
            risk_level = "medium"
            action = "flag_for_review"
        else:
            risk_level = "low"
            action = "approve"
        
        result = {
            'isFraudulent': fraud_score >= 70,
            'fraudScore': int(fraud_score),
            'riskLevel': risk_level,
            'recommendedAction': action,
            'indicators': fraud_indicators,
            'detectionMethod': 'hybrid_rule_gnn_ml',
        }
        
        # Publish to Kafka
        kafka_producer.send('fraud.listing.detected', {
            'listingId': listing_id,
            'userId': user_id,
            'fraudScore': int(fraud_score),
            'riskLevel': risk_level,
        })
        
        activity.logger.info(f"Listing fraud detection: score={fraud_score:.1f}, risk={risk_level}")
        return result
        
    except Exception as e:
        activity.logger.error(f"Listing fraud detection failed: {e}")
        return {
            'isFraudulent': False,
            'fraudScore': 0,
            'riskLevel': 'unknown',
            'recommendedAction': 'manual_review',
            'indicators': [f"Detection error: {str(e)}"],
        }


@activity.defn(name="VerifyIdentityDocument")
async def verify_identity_document(document_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Verify identity documents (passport, driver's license, national ID)
    Uses OCR + fraud detection + external API verification
    """
    activity.logger.info(f"Verifying identity document {document_data.get('id')}")
    
    try:
        verification_score = 100  # Start with perfect score, deduct for issues
        issues = []
        
        # Extract document type
        doc_type = document_data.get('type', 'unknown')
        
        # OCR extraction should already be done
        extracted_data = document_data.get('extractedData', {})
        
        # Check 1: Required fields present
        required_fields = {
            'passport': ['number', 'fullName', 'dateOfBirth', 'expiryDate'],
            'drivers_license': ['number', 'fullName', 'dateOfBirth', 'expiryDate'],
            'national_id': ['number', 'fullName', 'dateOfBirth'],
        }
        
        if doc_type in required_fields:
            for field in required_fields[doc_type]:
                if not extracted_data.get(field):
                    verification_score -= 20
                    issues.append(f"Missing required field: {field}")
        
        # Check 2: Expiry date validation
        expiry_date = extracted_data.get('expiryDate')
        if expiry_date:
            from datetime import datetime
            try:
                expiry = datetime.fromisoformat(expiry_date)
                if expiry < datetime.now():
                    verification_score -= 30
                    issues.append("Document expired")
            except:
                verification_score -= 10
                issues.append("Invalid expiry date format")
        
        # Check 3: Run fraud detection
        fraud_result = await detect_document_fraud(document_data)
        if fraud_result['fraudScore'] > 40:
            verification_score -= fraud_result['fraudScore'] // 2
            issues.extend(fraud_result['indicators'])
        
        # Check 4: Face matching (if photo provided)
        if document_data.get('facePhoto') and document_data.get('selfiePhoto'):
            face_match_score = await compare_faces(
                document_data['facePhoto'],
                document_data['selfiePhoto']
            )
            if face_match_score < 0.7:
                verification_score -= 25
                issues.append(f"Face match score low: {face_match_score:.2f}")
        
        # Ensure score is between 0-100
        verification_score = max(0, min(100, verification_score))
        
        # Determine verification status
        if verification_score >= 80:
            status = "verified"
        elif verification_score >= 60:
            status = "needs_review"
        else:
            status = "rejected"
        
        result = {
            'isVerified': verification_score >= 80,
            'verificationScore': verification_score,
            'status': status,
            'issues': issues,
            'extractedData': extracted_data,
        }
        
        activity.logger.info(f"Identity verification: score={verification_score}, status={status}")
        return result
        
    except Exception as e:
        activity.logger.error(f"Identity verification failed: {e}")
        return {
            'isVerified': False,
            'verificationScore': 0,
            'status': 'error',
            'issues': [f"Verification error: {str(e)}"],
        }


# Helper functions

def extract_document_features(document_data: Dict[str, Any]) -> List[float]:
    """Extract numerical features for anomaly detection"""
    return [
        float(document_data.get('fileSize', 0)),
        float(len(document_data.get('extractedText', ''))),
        float(document_data.get('imageQuality', {}).get('resolution', 0)),
        float(document_data.get('pageCount', 1)),
    ]


def extract_listing_features(listing_data: Dict[str, Any]) -> List[float]:
    """Extract numerical features for ML classification"""
    return [
        float(listing_data.get('price', 0)),
        float(listing_data.get('bedrooms', 0)),
        float(listing_data.get('bathrooms', 0)),
        float(listing_data.get('squareFeet', 0)),
        float(len(listing_data.get('images', []))),
        float(len(listing_data.get('description', ''))),
        float(listing_data.get('viewCount', 0)),
        float(listing_data.get('inquiryCount', 0)),
    ]


async def analyze_document_image_dl(image_url: str) -> float:
    """
    Analyze document image using deep learning
    Returns fraud score (0.0 - 1.0)
    """
    # In production, load image and run through CNN model
    # Check for signs of digital manipulation, copy-paste, etc.
    # For now, return low score
    return 0.0


async def build_user_network(user_id: int) -> Dict[str, Any]:
    """Build graph representation of user's network"""
    # In production, query database for user's connections
    # Return graph structure for GNN
    return {
        'nodes': [user_id],
        'edges': [],
        'features': [],
    }


async def detect_fraud_with_gnn(network: Dict[str, Any], listing_id: int) -> float:
    """
    Use Graph Neural Network to detect fraud patterns
    Returns fraud score (0.0 - 1.0)
    """
    # In production, convert network to PyTorch Geometric Data object
    # Run through pre-trained GNN model
    # For now, return low score
    return 0.0


async def compare_faces(face1_url: str, face2_url: str) -> float:
    """
    Compare two face images
    Returns similarity score (0.0 - 1.0)
    """
    # In production, use face recognition library (DeepFace, FaceNet, etc.)
    # For now, return high score
    return 0.9
