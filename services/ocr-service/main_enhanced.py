from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import uvicorn
from datetime import datetime

from services.ocr_service import OCRService
from services.verification_service_enhanced import EnhancedVerificationService
from services.oauth_service import OAuthService
from services.risk_router import RiskBasedRouter
from models import DocumentType, VerificationTier, OCRResult, VerificationRequest, VerificationResponse

app = FastAPI(title="OCR & Multi-Tier Verification Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ocr_service = OCRService()
verification_service = EnhancedVerificationService()
oauth_service = OAuthService()
risk_router = RiskBasedRouter()

class OAuthVerifyRequest(BaseModel):
    token: str
    user_id: str
    provider: str  # "google" or "facebook"

class BookingEligibilityRequest(BaseModel):
    user_id: str
    booking_amount: float
    property_value: Optional[float] = None
    is_resident: bool = True

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ocr-verification-enhanced"
    }

@app.post("/api/ocr/batch", response_model=List[OCRResult])
async def batch_extract(
    files: List[UploadFile] = File(...),
    document_type: DocumentType = DocumentType.PASSPORT
):
    """Batch process multiple documents"""
    try:
        file_contents = []
        for file in files:
            contents = await file.read()
            file_contents.append((file.filename, contents))
        
        results = await ocr_service.batch_extract(file_contents, document_type)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verification/passport", response_model=VerificationResponse)
async def verify_passport(
    passport_image: UploadFile = File(...),
    selfie_image: UploadFile = File(...),
    user_id: str = Body(...)
):
    """Verify passport with face matching"""
    try:
        passport_data = await passport_image.read()
        selfie_data = await selfie_image.read()
        
        result = await verification_service.verify_passport(
            passport_data,
            selfie_data,
            user_id
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verification/oauth")
async def verify_oauth(request: OAuthVerifyRequest):
    """Verify OAuth token (Google/Facebook)"""
    try:
        if request.provider == "google":
            result = await oauth_service.verify_google_token(
                request.token,
                request.user_id
            )
        elif request.provider == "facebook":
            result = await oauth_service.verify_facebook_token(
                request.token,
                request.user_id
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid provider")
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verification/check-eligibility")
async def check_booking_eligibility(request: BookingEligibilityRequest):
    """Check if user can make booking and determine required verification"""
    try:
        # Get risk-based routing decision
        routing = risk_router.determine_required_verification(
            user_id=request.user_id,
            booking_amount=request.booking_amount,
            property_value=request.property_value,
            is_resident=request.is_resident
        )
        
        # If current verification is sufficient, check booking limit
        if routing["booking_allowed"]:
            allowed, message, limit = await verification_service.check_booking_eligibility(
                request.user_id,
                request.booking_amount
            )
            
            return {
                **routing,
                "booking_allowed": allowed,
                "message": message if not allowed else routing["message"],
                "booking_limit": limit
            }
        
        return routing
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/verification/status/{user_id}")
async def get_verification_status(user_id: str):
    """Get complete verification status for user"""
    try:
        status = await verification_service.get_user_status(user_id)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
