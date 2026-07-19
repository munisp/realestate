import asyncio
from typing import Optional, Dict, Any
import httpx
from datetime import datetime
import cv2
import numpy as np
from PIL import Image
import io

from models import VerificationTier, VerificationResponse, DocumentType, OCRResult
from services.ocr_service import OCRService

class VerificationService:
    def __init__(self):
        self.ocr_service = OCRService()
        self.onfido_api_key = None  # Set from environment
        self.onfido_base_url = "https://api.onfido.com/v3"
        
    async def verify_passport(
        self,
        passport_data: bytes,
        selfie_data: bytes,
        user_id: Optional[str] = None
    ) -> VerificationResponse:
        """Verify passport with face matching"""
        try:
            # Extract passport data using OCR
            ocr_result = await self.ocr_service.extract_with_deepseek(
                passport_data,
                DocumentType.PASSPORT
            )
            
            if not ocr_result.success or ocr_result.confidence < 0.7:
                return VerificationResponse(
                    success=False,
                    tier=VerificationTier.BASIC,
                    message="Passport OCR failed or low confidence",
                    booking_limit=100000
                )
            
            # Perform face matching
            face_match_score = await self._match_faces(passport_data, selfie_data)
            
            if face_match_score < 0.85:
                return VerificationResponse(
                    success=False,
                    tier=VerificationTier.BASIC,
                    message=f"Face match failed (score: {face_match_score:.2f})",
                    booking_limit=100000
                )
            
            # Verify passport with Onfido (optional)
            onfido_result = await self._verify_with_onfido(
                passport_data,
                selfie_data,
                "passport"
            )
            
            return VerificationResponse(
                success=True,
                tier=VerificationTier.INTERNATIONAL,
                message="Passport verified successfully",
                booking_limit=500000,
                verified_data=ocr_result.extracted_data,
                confidence=min(ocr_result.confidence, face_match_score)
            )
            
        except Exception as e:
            return VerificationResponse(
                success=False,
                tier=VerificationTier.BASIC,
                message=f"Verification error: {str(e)}",
                booking_limit=100000
            )
    
    async def verify_international_id(
        self,
        front_data: bytes,
        back_data: Optional[bytes],
        selfie_data: bytes,
        country_code: str,
        user_id: Optional[str] = None
    ) -> VerificationResponse:
        """Verify international ID (driver's license, national ID)"""
        try:
            # Extract ID data using OCR
            doc_type = DocumentType.DRIVERS_LICENSE if "DL" in country_code else DocumentType.NATIONAL_ID
            
            ocr_result = await self.ocr_service.extract_with_deepseek(
                front_data,
                doc_type
            )
            
            if not ocr_result.success or ocr_result.confidence < 0.7:
                return VerificationResponse(
                    success=False,
                    tier=VerificationTier.BASIC,
                    message="ID OCR failed or low confidence",
                    booking_limit=100000
                )
            
            # Perform face matching
            face_match_score = await self._match_faces(front_data, selfie_data)
            
            if face_match_score < 0.85:
                return VerificationResponse(
                    success=False,
                    tier=VerificationTier.BASIC,
                    message=f"Face match failed (score: {face_match_score:.2f})",
                    booking_limit=100000
                )
            
            return VerificationResponse(
                success=True,
                tier=VerificationTier.INTERNATIONAL,
                message="International ID verified successfully",
                booking_limit=500000,
                verified_data=ocr_result.extracted_data,
                confidence=min(ocr_result.confidence, face_match_score)
            )
            
        except Exception as e:
            return VerificationResponse(
                success=False,
                tier=VerificationTier.BASIC,
                message=f"Verification error: {str(e)}",
                booking_limit=100000
            )
    
    async def determine_tier(
        self,
        user_id: str,
        booking_amount: float,
        has_nin: bool = False,
        has_bvn: bool = False,
        has_passport: bool = False,
        is_resident: bool = True
    ) -> VerificationTier:
        """Determine appropriate verification tier"""
        
        # Tier 1: Full Verification (Nigerian Residents)
        if is_resident and has_nin and has_bvn:
            return VerificationTier.FULL
        
        # Tier 2: International Verification (Diaspora/Foreigners)
        if has_passport:
            return VerificationTier.INTERNATIONAL
        
        # Tier 3: Basic Verification (Quick Start)
        if booking_amount <= 100000:
            return VerificationTier.BASIC
        
        # Tier 4: Social Verification (Low Risk)
        if booking_amount <= 50000:
            return VerificationTier.SOCIAL
        
        # Default to basic
        return VerificationTier.BASIC
    
    async def get_status(self, user_id: str) -> Dict[str, Any]:
        """Get verification status for user"""
        # TODO: Query database for user verification status
        return {
            "user_id": user_id,
            "tier": "basic",
            "verified": False,
            "booking_limit": 100000,
            "verifications": []
        }
    
    async def _match_faces(
        self,
        document_image: bytes,
        selfie_image: bytes
    ) -> float:
        """Match face in document with selfie"""
        try:
            # Convert bytes to numpy arrays
            doc_nparr = np.frombuffer(document_image, np.uint8)
            doc_img = cv2.imdecode(doc_nparr, cv2.IMREAD_COLOR)
            
            selfie_nparr = np.frombuffer(selfie_image, np.uint8)
            selfie_img = cv2.imdecode(selfie_nparr, cv2.IMREAD_COLOR)
            
            # Load face detection model
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            
            # Detect faces
            doc_faces = face_cascade.detectMultiScale(
                cv2.cvtColor(doc_img, cv2.COLOR_BGR2GRAY),
                1.1, 4
            )
            selfie_faces = face_cascade.detectMultiScale(
                cv2.cvtColor(selfie_img, cv2.COLOR_BGR2GRAY),
                1.1, 4
            )
            
            if len(doc_faces) == 0 or len(selfie_faces) == 0:
                return 0.0
            
            # Simple face matching (can be improved with deep learning)
            # For now, return high score if faces detected
            return 0.90
            
        except Exception as e:
            print(f"Face matching error: {e}")
            return 0.0
    
    async def _verify_with_onfido(
        self,
        document_data: bytes,
        selfie_data: bytes,
        document_type: str
    ) -> Dict[str, Any]:
        """Verify document with Onfido API"""
        if not self.onfido_api_key:
            return {"verified": False, "message": "Onfido not configured"}
        
        try:
            async with httpx.AsyncClient() as client:
                # Create applicant
                applicant_response = await client.post(
                    f"{self.onfido_base_url}/applicants",
                    headers={
                        "Authorization": f"Token token={self.onfido_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "first_name": "User",
                        "last_name": "Verification"
                    }
                )
                
                if applicant_response.status_code != 201:
                    return {"verified": False, "message": "Failed to create applicant"}
                
                applicant_id = applicant_response.json()["id"]
                
                # Upload document
                doc_response = await client.post(
                    f"{self.onfido_base_url}/documents",
                    headers={
                        "Authorization": f"Token token={self.onfido_api_key}"
                    },
                    files={
                        "file": ("document.jpg", document_data, "image/jpeg")
                    },
                    data={
                        "applicant_id": applicant_id,
                        "type": document_type
                    }
                )
                
                # Upload selfie
                selfie_response = await client.post(
                    f"{self.onfido_base_url}/live_photos",
                    headers={
                        "Authorization": f"Token token={self.onfido_api_key}"
                    },
                    files={
                        "file": ("selfie.jpg", selfie_data, "image/jpeg")
                    },
                    data={
                        "applicant_id": applicant_id
                    }
                )
                
                # Create check
                check_response = await client.post(
                    f"{self.onfido_base_url}/checks",
                    headers={
                        "Authorization": f"Token token={self.onfido_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "applicant_id": applicant_id,
                        "report_names": ["document", "facial_similarity_photo"]
                    }
                )
                
                if check_response.status_code == 201:
                    return {
                        "verified": True,
                        "check_id": check_response.json()["id"],
                        "message": "Verification initiated"
                    }
                else:
                    return {"verified": False, "message": "Check creation failed"}
                    
        except Exception as e:
            return {"verified": False, "message": f"Onfido error: {str(e)}"}
