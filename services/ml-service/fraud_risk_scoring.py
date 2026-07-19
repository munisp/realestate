"""
ML-Based Fraud Risk Scoring Service

Machine learning model for automated fraud detection and risk scoring.

Features:
- Transaction pattern analysis
- Behavioral analytics
- Device fingerprinting
- Velocity checks
- Historical fraud patterns
- Real-time scoring
"""

import os
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import json

class FraudRiskScoringService:
    def __init__(self):
        self.model_path = os.getenv('FRAUD_MODEL_PATH', '/app/models/fraud_model.pkl')
        self.scaler_path = os.getenv('FRAUD_SCALER_PATH', '/app/models/fraud_scaler.pkl')
        
        # Load trained model and scaler
        self.model = self._load_model()
        self.scaler = self._load_scaler()
        
        # Feature importance weights
        self.feature_weights = {
            'verification_score': 0.25,
            'transaction_velocity': 0.20,
            'behavioral_score': 0.15,
            'device_trust': 0.15,
            'historical_fraud': 0.10,
            'kyc_completeness': 0.10,
            'network_risk': 0.05
        }
    
    async def score_transaction(
        self,
        user_id: int,
        transaction_amount: float,
        transaction_type: str,
        user_data: Dict[str, Any],
        device_data: Optional[Dict[str, Any]] = None,
        location_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Score transaction for fraud risk
        
        Args:
            user_id: User identifier
            transaction_amount: Transaction amount in NGN
            transaction_type: Type of transaction
            user_data: User verification and profile data
            device_data: Device fingerprint data
            location_data: Location and IP data
        
        Returns:
            {
                "risk_score": float (0-100),
                "risk_level": str,
                "fraud_probability": float (0-1),
                "risk_factors": List[dict],
                "recommendation": str,
                "confidence": float
            }
        """
        
        # Extract features
        features = await self._extract_features(
            user_id,
            transaction_amount,
            transaction_type,
            user_data,
            device_data,
            location_data
        )
        
        # Calculate individual risk scores
        verification_score = self._calculate_verification_score(user_data)
        velocity_score = await self._calculate_velocity_score(user_id, transaction_amount)
        behavioral_score = await self._calculate_behavioral_score(user_id, user_data)
        device_score = self._calculate_device_trust_score(device_data)
        historical_score = await self._calculate_historical_fraud_score(user_id)
        kyc_score = self._calculate_kyc_completeness(user_data)
        network_score = await self._calculate_network_risk_score(user_id)
        
        # Weighted risk score
        risk_score = (
            verification_score * self.feature_weights['verification_score'] +
            velocity_score * self.feature_weights['transaction_velocity'] +
            behavioral_score * self.feature_weights['behavioral_score'] +
            device_score * self.feature_weights['device_trust'] +
            historical_score * self.feature_weights['historical_fraud'] +
            kyc_score * self.feature_weights['kyc_completeness'] +
            network_score * self.feature_weights['network_risk']
        ) * 100
        
        # ML model prediction
        if self.model is not None:
            feature_vector = self._prepare_feature_vector(features)
            scaled_features = self.scaler.transform([feature_vector])
            fraud_probability = self.model.predict_proba(scaled_features)[0][1]
            
            # Combine rule-based and ML scores
            final_score = (risk_score * 0.6) + (fraud_probability * 100 * 0.4)
        else:
            final_score = risk_score
            fraud_probability = risk_score / 100
        
        # Determine risk level
        risk_level = self._get_risk_level(final_score)
        
        # Identify risk factors
        risk_factors = self._identify_risk_factors({
            'verification': verification_score,
            'velocity': velocity_score,
            'behavioral': behavioral_score,
            'device': device_score,
            'historical': historical_score,
            'kyc': kyc_score,
            'network': network_score
        })
        
        # Generate recommendation
        recommendation = self._get_recommendation(risk_level, final_score)
        
        # Calculate confidence
        confidence = self._calculate_confidence(features, user_data)
        
        return {
            "risk_score": round(final_score, 2),
            "risk_level": risk_level,
            "fraud_probability": round(fraud_probability, 4),
            "risk_factors": risk_factors,
            "recommendation": recommendation,
            "confidence": round(confidence, 2),
            "component_scores": {
                "verification": round(verification_score * 100, 2),
                "velocity": round(velocity_score * 100, 2),
                "behavioral": round(behavioral_score * 100, 2),
                "device": round(device_score * 100, 2),
                "historical": round(historical_score * 100, 2),
                "kyc": round(kyc_score * 100, 2),
                "network": round(network_score * 100, 2)
            },
            "timestamp": datetime.now().isoformat()
        }
    
    async def batch_score_users(
        self,
        user_ids: List[int]
    ) -> Dict[int, Dict[str, Any]]:
        """
        Batch score multiple users for risk
        
        Returns:
            Dict mapping user_id to risk score
        """
        
        results = {}
        
        for user_id in user_ids:
            # Fetch user data (placeholder - implement actual DB query)
            user_data = await self._fetch_user_data(user_id)
            
            if user_data:
                score = await self.score_transaction(
                    user_id=user_id,
                    transaction_amount=0,  # Profile scoring
                    transaction_type="profile_review",
                    user_data=user_data
                )
                results[user_id] = score
        
        return results
    
    def train_model(
        self,
        training_data: pd.DataFrame,
        labels: pd.Series
    ) -> Dict[str, Any]:
        """
        Train fraud detection model
        
        Args:
            training_data: DataFrame with features
            labels: Series with fraud labels (0=legitimate, 1=fraud)
        
        Returns:
            Training metrics
        """
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            training_data, labels, test_size=0.2, random_state=42, stratify=labels
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train Gradient Boosting model
        model = GradientBoostingClassifier(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_score = model.score(X_train_scaled, y_train)
        test_score = model.score(X_test_scaled, y_test)
        
        # Feature importance
        feature_importance = dict(zip(
            training_data.columns,
            model.feature_importances_
        ))
        
        # Save model and scaler
        joblib.dump(model, self.model_path)
        joblib.dump(scaler, self.scaler_path)
        
        self.model = model
        self.scaler = scaler
        
        return {
            "train_accuracy": train_score,
            "test_accuracy": test_score,
            "feature_importance": feature_importance,
            "model_path": self.model_path
        }
    
    async def _extract_features(
        self,
        user_id: int,
        transaction_amount: float,
        transaction_type: str,
        user_data: Dict[str, Any],
        device_data: Optional[Dict[str, Any]],
        location_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Extract features for ML model"""
        
        features = {
            # Transaction features
            'amount': transaction_amount,
            'amount_log': np.log1p(transaction_amount),
            'transaction_type': transaction_type,
            
            # User features
            'account_age_days': self._get_account_age(user_data),
            'kyc_tier': user_data.get('kyc_tier', 0),
            'verification_status': 1 if user_data.get('verified') else 0,
            
            # Behavioral features
            'transaction_count_24h': await self._get_transaction_count(user_id, hours=24),
            'transaction_count_7d': await self._get_transaction_count(user_id, days=7),
            'avg_transaction_amount': await self._get_avg_transaction_amount(user_id),
            'unique_devices_7d': await self._get_unique_devices(user_id, days=7),
            'unique_locations_7d': await self._get_unique_locations(user_id, days=7),
            
            # Device features
            'device_trusted': 1 if device_data and device_data.get('trusted') else 0,
            'device_age_days': self._get_device_age(device_data) if device_data else 0,
            
            # Location features
            'location_change': 1 if await self._detect_location_change(user_id, location_data) else 0,
            'high_risk_country': 1 if location_data and location_data.get('high_risk') else 0,
            
            # Time features
            'hour_of_day': datetime.now().hour,
            'day_of_week': datetime.now().weekday(),
            'is_weekend': 1 if datetime.now().weekday() >= 5 else 0,
            'is_night': 1 if datetime.now().hour < 6 or datetime.now().hour > 22 else 0
        }
        
        return features
    
    def _calculate_verification_score(self, user_data: Dict[str, Any]) -> float:
        """Calculate verification quality score (0-1, lower is better)"""
        
        score = 1.0  # Start with highest risk
        
        # Reduce risk based on verification level
        if user_data.get('nin_verified'):
            score -= 0.3
        if user_data.get('bvn_verified'):
            score -= 0.3
        if user_data.get('face_verified'):
            score -= 0.2
        if user_data.get('address_verified'):
            score -= 0.1
        if user_data.get('phone_verified'):
            score -= 0.05
        if user_data.get('email_verified'):
            score -= 0.05
        
        return max(0, score)
    
    async def _calculate_velocity_score(
        self,
        user_id: int,
        transaction_amount: float
    ) -> float:
        """Calculate transaction velocity risk (0-1)"""
        
        # Get recent transactions
        count_1h = await self._get_transaction_count(user_id, hours=1)
        count_24h = await self._get_transaction_count(user_id, hours=24)
        amount_24h = await self._get_transaction_sum(user_id, hours=24)
        
        score = 0.0
        
        # High frequency
        if count_1h > 5:
            score += 0.4
        elif count_1h > 3:
            score += 0.2
        
        if count_24h > 20:
            score += 0.3
        elif count_24h > 10:
            score += 0.15
        
        # High amount
        if amount_24h > 10000000:  # ₦10M
            score += 0.3
        elif amount_24h > 5000000:  # ₦5M
            score += 0.15
        
        return min(1.0, score)
    
    async def _calculate_behavioral_score(
        self,
        user_id: int,
        user_data: Dict[str, Any]
    ) -> float:
        """Calculate behavioral anomaly score (0-1)"""
        
        score = 0.0
        
        # New account
        account_age = self._get_account_age(user_data)
        if account_age < 1:  # Less than 1 day
            score += 0.4
        elif account_age < 7:  # Less than 1 week
            score += 0.2
        
        # Unusual activity patterns
        avg_amount = await self._get_avg_transaction_amount(user_id)
        if avg_amount > 0:
            # Current transaction significantly higher than average
            # (would need current transaction amount passed in)
            pass
        
        # Device/location changes
        unique_devices = await self._get_unique_devices(user_id, days=7)
        if unique_devices > 5:
            score += 0.2
        elif unique_devices > 3:
            score += 0.1
        
        unique_locations = await self._get_unique_locations(user_id, days=7)
        if unique_locations > 5:
            score += 0.2
        elif unique_locations > 3:
            score += 0.1
        
        return min(1.0, score)
    
    def _calculate_device_trust_score(
        self,
        device_data: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate device trust score (0-1, lower is better)"""
        
        if not device_data:
            return 0.5  # Unknown device = medium risk
        
        score = 0.0
        
        # New device
        if not device_data.get('seen_before'):
            score += 0.3
        
        # Suspicious device characteristics
        if device_data.get('emulator'):
            score += 0.4
        if device_data.get('rooted'):
            score += 0.2
        if device_data.get('vpn'):
            score += 0.1
        
        return min(1.0, score)
    
    async def _calculate_historical_fraud_score(self, user_id: int) -> float:
        """Calculate historical fraud risk (0-1)"""
        
        # Check past fraud reports
        fraud_reports = await self._get_fraud_reports(user_id)
        
        if fraud_reports > 0:
            return 1.0  # Any fraud history = high risk
        
        # Check chargebacks
        chargebacks = await self._get_chargebacks(user_id)
        if chargebacks > 2:
            return 0.8
        elif chargebacks > 0:
            return 0.4
        
        return 0.0
    
    def _calculate_kyc_completeness(self, user_data: Dict[str, Any]) -> float:
        """Calculate KYC completeness score (0-1, lower is better)"""
        
        total_fields = 10
        completed_fields = 0
        
        if user_data.get('nin_verified'):
            completed_fields += 2
        if user_data.get('bvn_verified'):
            completed_fields += 2
        if user_data.get('face_verified'):
            completed_fields += 2
        if user_data.get('address_verified'):
            completed_fields += 1
        if user_data.get('phone_verified'):
            completed_fields += 1
        if user_data.get('email_verified'):
            completed_fields += 1
        if user_data.get('employment_verified'):
            completed_fields += 1
        
        # Invert: more complete = lower risk
        return 1.0 - (completed_fields / total_fields)
    
    async def _calculate_network_risk_score(self, user_id: int) -> float:
        """Calculate network/connection risk (0-1)"""
        
        # Check if user is connected to known fraudsters
        connected_fraudsters = await self._get_connected_fraudsters(user_id)
        
        if connected_fraudsters > 0:
            return min(1.0, connected_fraudsters * 0.3)
        
        return 0.0
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Determine risk level from score"""
        
        if risk_score >= 75:
            return "CRITICAL"
        elif risk_score >= 50:
            return "HIGH"
        elif risk_score >= 25:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _identify_risk_factors(
        self,
        component_scores: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Identify top risk factors"""
        
        risk_factors = []
        
        for component, score in component_scores.items():
            if score > 0.5:  # Significant risk
                risk_factors.append({
                    "factor": component,
                    "score": round(score * 100, 2),
                    "severity": "high" if score > 0.75 else "medium",
                    "description": self._get_factor_description(component, score)
                })
        
        # Sort by score descending
        risk_factors.sort(key=lambda x: x['score'], reverse=True)
        
        return risk_factors
    
    def _get_factor_description(self, factor: str, score: float) -> str:
        """Get human-readable description of risk factor"""
        
        descriptions = {
            'verification': "Incomplete identity verification",
            'velocity': "Unusual transaction frequency or volume",
            'behavioral': "Abnormal user behavior detected",
            'device': "Untrusted or suspicious device",
            'historical': "Previous fraud or chargeback history",
            'kyc': "Incomplete KYC information",
            'network': "Connection to high-risk users"
        }
        
        return descriptions.get(factor, "Unknown risk factor")
    
    def _get_recommendation(self, risk_level: str, risk_score: float) -> str:
        """Get action recommendation based on risk"""
        
        if risk_level == "CRITICAL":
            return "REJECT - High fraud probability. Block transaction immediately."
        elif risk_level == "HIGH":
            return "MANUAL REVIEW - Requires senior fraud analyst approval."
        elif risk_level == "MEDIUM":
            return "ENHANCED VERIFICATION - Request additional documentation."
        else:
            return "APPROVE - Low risk. Standard monitoring applies."
    
    def _calculate_confidence(
        self,
        features: Dict[str, Any],
        user_data: Dict[str, Any]
    ) -> float:
        """Calculate confidence in risk score (0-1)"""
        
        confidence = 0.5  # Base confidence
        
        # More data = higher confidence
        if user_data.get('nin_verified'):
            confidence += 0.1
        if user_data.get('bvn_verified'):
            confidence += 0.1
        if features.get('transaction_count_7d', 0) > 5:
            confidence += 0.1
        if features.get('account_age_days', 0) > 30:
            confidence += 0.1
        if self.model is not None:
            confidence += 0.1
        
        return min(1.0, confidence)
    
    def _prepare_feature_vector(self, features: Dict[str, Any]) -> List[float]:
        """Prepare feature vector for ML model"""
        
        # Extract numeric features in consistent order
        feature_order = [
            'amount_log', 'account_age_days', 'kyc_tier', 'verification_status',
            'transaction_count_24h', 'transaction_count_7d', 'avg_transaction_amount',
            'unique_devices_7d', 'unique_locations_7d', 'device_trusted',
            'device_age_days', 'location_change', 'high_risk_country',
            'hour_of_day', 'day_of_week', 'is_weekend', 'is_night'
        ]
        
        return [features.get(f, 0) for f in feature_order]
    
    def _load_model(self):
        """Load trained ML model"""
        try:
            if os.path.exists(self.model_path):
                return joblib.load(self.model_path)
        except Exception as e:
            print(f"Failed to load model: {e}")
        return None
    
    def _load_scaler(self):
        """Load feature scaler"""
        try:
            if os.path.exists(self.scaler_path):
                return joblib.load(self.scaler_path)
        except Exception as e:
            print(f"Failed to load scaler: {e}")
        return StandardScaler()  # Return default scaler
    
    def _get_account_age(self, user_data: Dict[str, Any]) -> int:
        """Get account age in days"""
        created_at = user_data.get('created_at')
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            return (datetime.now() - created_at).days
        return 0
    
    def _get_device_age(self, device_data: Dict[str, Any]) -> int:
        """Get device age in days"""
        first_seen = device_data.get('first_seen')
        if first_seen:
            if isinstance(first_seen, str):
                first_seen = datetime.fromisoformat(first_seen.replace('Z', '+00:00'))
            return (datetime.now() - first_seen).days
        return 0
    
    # Placeholder methods for database queries
    # These should be implemented with actual database access
    
    async def _fetch_user_data(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Fetch user data from database"""
        # Placeholder - implement actual DB query
        return None
    
    async def _get_transaction_count(
        self,
        user_id: int,
        hours: Optional[int] = None,
        days: Optional[int] = None
    ) -> int:
        """Get transaction count in time period"""
        # Placeholder - implement actual DB query
        return 0
    
    async def _get_transaction_sum(
        self,
        user_id: int,
        hours: Optional[int] = None,
        days: Optional[int] = None
    ) -> float:
        """Get transaction sum in time period"""
        # Placeholder - implement actual DB query
        return 0.0
    
    async def _get_avg_transaction_amount(self, user_id: int) -> float:
        """Get average transaction amount"""
        # Placeholder - implement actual DB query
        return 0.0
    
    async def _get_unique_devices(self, user_id: int, days: int) -> int:
        """Get unique device count"""
        # Placeholder - implement actual DB query
        return 0
    
    async def _get_unique_locations(self, user_id: int, days: int) -> int:
        """Get unique location count"""
        # Placeholder - implement actual DB query
        return 0
    
    async def _detect_location_change(
        self,
        user_id: int,
        location_data: Optional[Dict[str, Any]]
    ) -> bool:
        """Detect significant location change"""
        # Placeholder - implement actual logic
        return False
    
    async def _get_fraud_reports(self, user_id: int) -> int:
        """Get fraud report count"""
        # Placeholder - implement actual DB query
        return 0
    
    async def _get_chargebacks(self, user_id: int) -> int:
        """Get chargeback count"""
        # Placeholder - implement actual DB query
        return 0
    
    async def _get_connected_fraudsters(self, user_id: int) -> int:
        """Get count of connected known fraudsters"""
        # Placeholder - implement actual graph query
        return 0
