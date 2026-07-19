from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional, List
from datetime import datetime, timedelta
import os

from database.models import Base, UserVerification, VerificationAttempt, VerificationTierEnum, VerificationStatusEnum

class VerificationRepository:
    def __init__(self):
        db_url = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/verification")
        self.engine = create_engine(db_url)
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
    
    def get_session(self) -> Session:
        return self.SessionLocal()
    
    def get_user_verification(self, user_id: str) -> Optional[UserVerification]:
        """Get user verification record"""
        with self.get_session() as session:
            return session.query(UserVerification).filter(
                UserVerification.user_id == user_id
            ).first()
    
    def create_or_update_verification(
        self,
        user_id: str,
        tier: VerificationTierEnum,
        **kwargs
    ) -> UserVerification:
        """Create or update user verification"""
        with self.get_session() as session:
            verification = session.query(UserVerification).filter(
                UserVerification.user_id == user_id
            ).first()
            
            if not verification:
                verification = UserVerification(
                    user_id=user_id,
                    tier=tier,
                    **kwargs
                )
                session.add(verification)
            else:
                verification.tier = tier
                for key, value in kwargs.items():
                    setattr(verification, key, value)
            
            session.commit()
            session.refresh(verification)
            return verification
    
    def update_verification_status(
        self,
        user_id: str,
        status: VerificationStatusEnum
    ) -> Optional[UserVerification]:
        """Update verification status"""
        with self.get_session() as session:
            verification = session.query(UserVerification).filter(
                UserVerification.user_id == user_id
            ).first()
            
            if verification:
                verification.status = status
                if status == VerificationStatusEnum.VERIFIED:
                    verification.verified_at = datetime.utcnow()
                session.commit()
                session.refresh(verification)
            
            return verification
    
    def check_booking_limit(
        self,
        user_id: str,
        booking_amount: float
    ) -> tuple[bool, str]:
        """Check if user can make booking within their limit"""
        verification = self.get_user_verification(user_id)
        
        if not verification:
            return False, "User not verified"
        
        if verification.status != VerificationStatusEnum.VERIFIED:
            return False, "Verification not complete"
        
        if verification.booking_limit == -1:
            return True, "Unlimited booking limit"
        
        if verification.total_bookings + booking_amount > verification.booking_limit:
            return False, f"Booking limit exceeded (limit: ₦{verification.booking_limit:,.0f})"
        
        return True, "Booking allowed"
    
    def update_booking_total(
        self,
        user_id: str,
        booking_amount: float
    ) -> Optional[UserVerification]:
        """Update total bookings for user"""
        with self.get_session() as session:
            verification = session.query(UserVerification).filter(
                UserVerification.user_id == user_id
            ).first()
            
            if verification:
                verification.total_bookings += booking_amount
                session.commit()
                session.refresh(verification)
            
            return verification
    
    def log_attempt(
        self,
        user_id: str,
        verification_type: str,
        status: VerificationStatusEnum,
        confidence: Optional[float] = None,
        error_message: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> VerificationAttempt:
        """Log verification attempt"""
        with self.get_session() as session:
            attempt = VerificationAttempt(
                user_id=user_id,
                verification_type=verification_type,
                status=status,
                confidence=confidence,
                error_message=error_message,
                metadata=metadata
            )
            session.add(attempt)
            session.commit()
            session.refresh(attempt)
            return attempt
    
    def get_user_attempts(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[VerificationAttempt]:
        """Get recent verification attempts for user"""
        with self.get_session() as session:
            return session.query(VerificationAttempt).filter(
                VerificationAttempt.user_id == user_id
            ).order_by(
                VerificationAttempt.created_at.desc()
            ).limit(limit).all()
