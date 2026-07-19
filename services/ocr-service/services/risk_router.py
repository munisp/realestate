from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from database.repository import VerificationRepository
from database.models import VerificationTierEnum, VerificationStatusEnum

class RiskBasedRouter:
    def __init__(self):
        self.repository = VerificationRepository()
        
    def determine_required_verification(
        self,
        user_id: str,
        booking_amount: float,
        property_value: Optional[float] = None,
        is_resident: bool = True,
        has_previous_bookings: bool = False
    ) -> Dict[str, Any]:
        """Determine required verification tier based on risk factors"""
        
        # Get current verification
        current_verification = self.repository.get_user_verification(user_id)
        
        # Calculate risk score
        risk_score = self._calculate_risk_score(
            booking_amount=booking_amount,
            property_value=property_value,
            has_previous_bookings=has_previous_bookings,
            current_tier=current_verification.tier if current_verification else None
        )
        
        # Determine required tier
        required_tier = self._get_required_tier(
            risk_score=risk_score,
            booking_amount=booking_amount,
            is_resident=is_resident
        )
        
        # Check if current verification is sufficient
        is_sufficient = self._is_verification_sufficient(
            current_tier=current_verification.tier if current_verification else None,
            required_tier=required_tier
        )
        
        # Get upgrade path if needed
        upgrade_path = None
        if not is_sufficient:
            upgrade_path = self._get_upgrade_path(
                current_tier=current_verification.tier if current_verification else None,
                required_tier=required_tier,
                is_resident=is_resident
            )
        
        return {
            "risk_score": risk_score,
            "required_tier": required_tier.value,
            "current_tier": current_verification.tier.value if current_verification else "none",
            "is_sufficient": is_sufficient,
            "booking_allowed": is_sufficient,
            "upgrade_path": upgrade_path,
            "message": self._get_user_message(
                is_sufficient=is_sufficient,
                required_tier=required_tier,
                upgrade_path=upgrade_path
            )
        }
    
    def _calculate_risk_score(
        self,
        booking_amount: float,
        property_value: Optional[float],
        has_previous_bookings: bool,
        current_tier: Optional[VerificationTierEnum]
    ) -> float:
        """Calculate risk score (0-100)"""
        score = 0.0
        
        # Booking amount risk (0-40 points)
        if booking_amount < 50000:
            score += 0
        elif booking_amount < 100000:
            score += 10
        elif booking_amount < 200000:
            score += 20
        elif booking_amount < 500000:
            score += 30
        else:
            score += 40
        
        # Property value risk (0-20 points)
        if property_value:
            if property_value > 10000000:  # ₦10M+
                score += 20
            elif property_value > 5000000:
                score += 15
            elif property_value > 1000000:
                score += 10
        
        # New user risk (0-20 points)
        if not has_previous_bookings:
            score += 20
        
        # Current verification reduces risk (0-20 points reduction)
        if current_tier == VerificationTierEnum.FULL:
            score -= 20
        elif current_tier == VerificationTierEnum.INTERNATIONAL:
            score -= 15
        elif current_tier == VerificationTierEnum.BASIC:
            score -= 10
        elif current_tier == VerificationTierEnum.SOCIAL:
            score -= 5
        
        return max(0, min(100, score))
    
    def _get_required_tier(
        self,
        risk_score: float,
        booking_amount: float,
        is_resident: bool
    ) -> VerificationTierEnum:
        """Get required verification tier based on risk"""
        
        # High risk (70+) - Full verification required
        if risk_score >= 70:
            return VerificationTierEnum.FULL if is_resident else VerificationTierEnum.INTERNATIONAL
        
        # Medium-high risk (50-70) - International verification
        elif risk_score >= 50:
            return VerificationTierEnum.INTERNATIONAL
        
        # Medium risk (30-50) - Basic verification
        elif risk_score >= 30:
            return VerificationTierEnum.BASIC
        
        # Low risk (<30) - Social verification
        else:
            return VerificationTierEnum.SOCIAL
    
    def _is_verification_sufficient(
        self,
        current_tier: Optional[VerificationTierEnum],
        required_tier: VerificationTierEnum
    ) -> bool:
        """Check if current verification meets requirement"""
        if not current_tier:
            return False
        
        tier_hierarchy = {
            VerificationTierEnum.SOCIAL: 1,
            VerificationTierEnum.BASIC: 2,
            VerificationTierEnum.INTERNATIONAL: 3,
            VerificationTierEnum.FULL: 4
        }
        
        return tier_hierarchy[current_tier] >= tier_hierarchy[required_tier]
    
    def _get_upgrade_path(
        self,
        current_tier: Optional[VerificationTierEnum],
        required_tier: VerificationTierEnum,
        is_resident: bool
    ) -> Dict[str, Any]:
        """Get upgrade path from current to required tier"""
        
        if required_tier == VerificationTierEnum.FULL:
            return {
                "steps": [
                    "Verify NIN (National Identity Number)",
                    "Verify BVN (Bank Verification Number)",
                    "Complete face verification"
                ],
                "estimated_time": "5-10 minutes",
                "required_documents": ["NIN", "BVN"]
            }
        
        elif required_tier == VerificationTierEnum.INTERNATIONAL:
            return {
                "steps": [
                    "Upload passport or international ID",
                    "Take selfie for face matching",
                    "Wait for verification (2-5 minutes)"
                ],
                "estimated_time": "5-10 minutes",
                "required_documents": ["Passport or International ID", "Selfie"]
            }
        
        elif required_tier == VerificationTierEnum.BASIC:
            return {
                "steps": [
                    "Verify phone number (OTP)",
                    "Verify email address",
                    "Complete basic profile"
                ],
                "estimated_time": "2-3 minutes",
                "required_documents": ["Phone", "Email"]
            }
        
        else:  # SOCIAL
            return {
                "steps": [
                    "Sign in with Google or Facebook"
                ],
                "estimated_time": "1 minute",
                "required_documents": ["Google or Facebook account"]
            }
    
    def _get_user_message(
        self,
        is_sufficient: bool,
        required_tier: VerificationTierEnum,
        upgrade_path: Optional[Dict[str, Any]]
    ) -> str:
        """Get user-friendly message"""
        if is_sufficient:
            return "Your verification level is sufficient for this booking."
        
        tier_names = {
            VerificationTierEnum.FULL: "Full Verification (NIN + BVN)",
            VerificationTierEnum.INTERNATIONAL: "International Verification (Passport)",
            VerificationTierEnum.BASIC: "Basic Verification (Phone + Email)",
            VerificationTierEnum.SOCIAL: "Social Login (Google/Facebook)"
        }
        
        return f"This booking requires {tier_names[required_tier]}. Please complete verification to proceed."
