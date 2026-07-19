from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from enum import Enum
from datetime import datetime

class DocumentType(str, Enum):
    PASSPORT = "passport"
    DRIVERS_LICENSE = "drivers_license"
    NATIONAL_ID = "national_id"
    RESIDENCE_PERMIT = "residence_permit"
    VOTER_CARD = "voter_card"

class VerificationTier(str, Enum):
    FULL = "full"  # NIN + BVN (Nigerian residents)
    INTERNATIONAL = "international"  # Passport + Selfie (Diaspora/foreigners)
    BASIC = "basic"  # Phone + Email (Quick start)
    SOCIAL = "social"  # OAuth (Low risk)

class OCRResult(BaseModel):
    success: bool
    document_type: DocumentType
    extracted_data: Dict[str, Any]
    confidence: float
    processing_time: float
    ocr_engine: str  # "deepseek" or "paddle"
    
class VerificationRequest(BaseModel):
    user_id: str
    booking_amount: float
    has_nin: bool = False
    has_bvn: bool = False
    has_passport: bool = False
    is_resident: bool = True

class VerificationResponse(BaseModel):
    success: bool
    tier: VerificationTier
    message: str
    booking_limit: int
    verified_data: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None

class BatchOCRRequest(BaseModel):
    document_type: DocumentType
    file_urls: List[str]
