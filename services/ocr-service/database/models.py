from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class VerificationTierEnum(str, enum.Enum):
    FULL = "full"
    INTERNATIONAL = "international"
    BASIC = "basic"
    SOCIAL = "social"

class VerificationStatusEnum(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    EXPIRED = "expired"

class UserVerification(Base):
    __tablename__ = "user_verifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    tier = Column(Enum(VerificationTierEnum), nullable=False)
    status = Column(Enum(VerificationStatusEnum), default=VerificationStatusEnum.PENDING)
    
    # NIN/BVN (Tier 1 - Full)
    nin = Column(String(11), nullable=True)
    nin_verified = Column(Boolean, default=False)
    bvn = Column(String(11), nullable=True)
    bvn_verified = Column(Boolean, default=False)
    
    # Passport (Tier 2 - International)
    passport_number = Column(String(50), nullable=True)
    passport_country = Column(String(3), nullable=True)
    passport_expiry = Column(DateTime, nullable=True)
    passport_verified = Column(Boolean, default=False)
    
    # International ID (Tier 2)
    id_type = Column(String(50), nullable=True)  # drivers_license, national_id
    id_number = Column(String(50), nullable=True)
    id_country = Column(String(3), nullable=True)
    id_verified = Column(Boolean, default=False)
    
    # Social (Tier 4)
    google_id = Column(String(255), nullable=True)
    facebook_id = Column(String(255), nullable=True)
    social_verified = Column(Boolean, default=False)
    
    # Face matching
    face_match_score = Column(Float, nullable=True)
    face_verified = Column(Boolean, default=False)
    
    # OCR data
    ocr_data = Column(JSON, nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    
    # Booking limits
    booking_limit = Column(Integer, default=100000)
    total_bookings = Column(Float, default=0.0)
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    verified_at = Column(DateTime, nullable=True)
    
class VerificationAttempt(Base):
    __tablename__ = "verification_attempts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    verification_type = Column(String(50), nullable=False)  # nin, bvn, passport, id, social
    status = Column(Enum(VerificationStatusEnum), nullable=False)
    confidence = Column(Float, nullable=True)
    error_message = Column(String(500), nullable=True)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
