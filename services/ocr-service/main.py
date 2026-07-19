from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
import uvicorn
import os
from datetime import datetime
import json

from services.ocr_service import OCRService
from services.verification_service import VerificationService
from models import (
    DocumentType,
    VerificationTier,
    OCRResult,
    VerificationRequest,
    VerificationResponse,
    BatchOCRRequest
)

app = FastAPI(title="OCR & Verification Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ocr_service = OCRService()
verification_service = VerificationService()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ocr-verification"
    }

@app.post("/api/ocr/extract", response_model=OCRResult)
async def extract_document(
    file: UploadFile = File(...),
    document_type: DocumentType = DocumentType.PASSPORT,
    use_deepseek: bool = True
):
    """Extract text and structured data from document image"""
    try:
        # Read file
        contents = await file.read()
        
        # Perform OCR
        if use_deepseek:
            result = await ocr_service.extract_with_deepseek(contents, document_type)
        else:
            result = await ocr_service.extract_with_paddle(contents, document_type)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ocr/batch", response_model=List[OCRResult])
async def batch_extract(
    files: List[UploadFile] = File(...),
    document_type: DocumentType = DocumentType.PASSPORT,
    background_tasks: BackgroundTasks = None
):
    """Batch process multiple documents for speed"""
    try:
        # Read all files
        file_contents = []
        for file in files:
            contents = await file.read()
            file_contents.append((file.filename, contents))
        
        # Batch process with DeepSeek-OCR (optimized for batch)
        results = await ocr_service.batch_extract(file_contents, document_type)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verification/passport", response_model=VerificationResponse)
async def verify_passport(
    passport_image: UploadFile = File(...),
    selfie_image: UploadFile = File(...),
    user_id: str = None
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

@app.post("/api/verification/international-id", response_model=VerificationResponse)
async def verify_international_id(
    id_front: UploadFile = File(...),
    id_back: Optional[UploadFile] = File(None),
    selfie: UploadFile = File(...),
    country_code: str = "NG",
    user_id: str = None
):
    """Verify international ID (driver's license, national ID, etc.)"""
    try:
        front_data = await id_front.read()
        back_data = await id_back.read() if id_back else None
        selfie_data = await selfie.read()
        
        result = await verification_service.verify_international_id(
            front_data,
            back_data,
            selfie_data,
            country_code,
            user_id
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verification/tier", response_model=VerificationResponse)
async def determine_verification_tier(request: VerificationRequest):
    """Determine appropriate verification tier based on user info and booking amount"""
    try:
        tier = await verification_service.determine_tier(
            user_id=request.user_id,
            booking_amount=request.booking_amount,
            has_nin=request.has_nin,
            has_bvn=request.has_bvn,
            has_passport=request.has_passport,
            is_resident=request.is_resident
        )
        
        return VerificationResponse(
            success=True,
            tier=tier,
            message=f"Verification tier: {tier.value}",
            booking_limit=get_booking_limit(tier)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/verification/status/{user_id}")
async def get_verification_status(user_id: str):
    """Get current verification status and tier for user"""
    try:
        status = await verification_service.get_status(user_id)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_booking_limit(tier: VerificationTier) -> int:
    """Get booking limit for verification tier"""
    limits = {
        VerificationTier.FULL: -1,  # Unlimited
        VerificationTier.INTERNATIONAL: 500000,
        VerificationTier.BASIC: 100000,
        VerificationTier.SOCIAL: 50000
    }
    return limits.get(tier, 0)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
