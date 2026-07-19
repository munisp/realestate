from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import base64
import re
from datetime import datetime
import uvicorn

app = FastAPI(title="Document OCR Service")

class OCRResult(BaseModel):
    document_type: str
    extracted_data: Dict
    confidence: float
    raw_text: str
    
class FaceMatchResult(BaseModel):
    match: bool
    confidence: float
    similarity_score: float

class DocumentOCRService:
    """Document OCR and verification service"""
    
    def __init__(self):
        self.document_patterns = {
            "nigerian_passport": {
                "number": r"[A-Z]\d{8}",
                "surname": r"Surname[:\s]+([A-Z\s]+)",
                "given_names": r"Given Names[:\s]+([A-Z\s]+)",
                "date_of_birth": r"Date of Birth[:\s]+(\d{2}/\d{2}/\d{4})",
                "sex": r"Sex[:\s]+([MF])",
            },
            "nin_card": {
                "number": r"\d{11}",
                "surname": r"Surname[:\s]+([A-Z\s]+)",
                "firstname": r"Firstname[:\s]+([A-Z\s]+)",
                "date_of_birth": r"Date of Birth[:\s]+(\d{2}-\d{2}-\d{4})",
                "gender": r"Gender[:\s]+([MF])",
            },
            "drivers_license": {
                "number": r"[A-Z]{3}\d{9}",
                "name": r"Name[:\s]+([A-Z\s]+)",
                "date_of_birth": r"DOB[:\s]+(\d{2}/\d{2}/\d{4})",
                "expiry_date": r"Expiry[:\s]+(\d{2}/\d{2}/\d{4})",
            }
        }
    
    def detect_document_type(self, text: str) -> str:
        """Detect document type from OCR text"""
        text_lower = text.lower()
        
        if "passport" in text_lower and "nigeria" in text_lower:
            return "nigerian_passport"
        elif "nin" in text_lower or "national identification" in text_lower:
            return "nin_card"
        elif "driver" in text_lower and "license" in text_lower:
            return "drivers_license"
        else:
            return "unknown"
    
    def extract_data(self, text: str, document_type: str) -> Dict:
        """Extract structured data from OCR text"""
        if document_type not in self.document_patterns:
            return {}
        
        patterns = self.document_patterns[document_type]
        extracted = {}
        
        for field, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                extracted[field] = match.group(1) if match.groups() else match.group(0)
        
        return extracted
    
    def calculate_confidence(self, extracted_data: Dict, document_type: str) -> float:
        """Calculate OCR confidence score"""
        if document_type == "unknown":
            return 0.0
        
        expected_fields = len(self.document_patterns.get(document_type, {}))
        extracted_fields = len(extracted_data)
        
        if expected_fields == 0:
            return 0.0
        
        base_confidence = (extracted_fields / expected_fields) * 0.8
        quality_bonus = 0.2 if extracted_fields == expected_fields else 0.1
        
        return min(base_confidence + quality_bonus, 1.0)
    
    def process_document(self, image_data: bytes) -> OCRResult:
        """Process document image and extract data"""
        # Simulate OCR processing
        # In production, use Tesseract, Google Vision API, or AWS Textract
        
        mock_ocr_text = """
        FEDERAL REPUBLIC OF NIGERIA
        INTERNATIONAL PASSPORT
        
        Surname: ADEBAYO
        Given Names: CHUKWUEMEKA OLUWASEUN
        Nationality: NIGERIAN
        Date of Birth: 15/03/1990
        Sex: M
        Place of Birth: LAGOS
        Date of Issue: 01/06/2020
        Date of Expiry: 01/06/2025
        Passport No: A12345678
        """
        
        document_type = self.detect_document_type(mock_ocr_text)
        extracted_data = self.extract_data(mock_ocr_text, document_type)
        confidence = self.calculate_confidence(extracted_data, document_type)
        
        return OCRResult(
            document_type=document_type,
            extracted_data=extracted_data,
            confidence=round(confidence, 2),
            raw_text=mock_ocr_text.strip(),
        )
    
    def match_faces(self, image1_data: bytes, image2_data: bytes) -> FaceMatchResult:
        """Compare two face images"""
        # Simulate face matching
        # In production, use AWS Rekognition, Azure Face API, or DeepFace
        
        # Mock similarity score (0-100)
        similarity_score = 87.5
        confidence = 0.92
        match = similarity_score > 80
        
        return FaceMatchResult(
            match=match,
            confidence=confidence,
            similarity_score=similarity_score,
        )

ocr_service = DocumentOCRService()

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ocr"}

@app.post("/api/v1/ocr/extract", response_model=OCRResult)
async def extract_document_data(file: UploadFile = File(...)):
    """Extract data from document image"""
    try:
        contents = await file.read()
        result = ocr_service.process_document(contents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ocr/verify-face", response_model=FaceMatchResult)
async def verify_face_match(
    document_photo: UploadFile = File(...),
    selfie_photo: UploadFile = File(...)
):
    """Verify face match between document and selfie"""
    try:
        doc_contents = await document_photo.read()
        selfie_contents = await selfie_photo.read()
        
        result = ocr_service.match_faces(doc_contents, selfie_contents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ocr/full-verification")
async def full_document_verification(
    document: UploadFile = File(...),
    selfie: UploadFile = File(...)
):
    """Complete document verification with OCR and face matching"""
    try:
        doc_contents = await document.read()
        selfie_contents = await selfie.read()
        
        ocr_result = ocr_service.process_document(doc_contents)
        face_result = ocr_service.match_faces(doc_contents, selfie_contents)
        
        overall_confidence = (ocr_result.confidence + face_result.confidence) / 2
        
        return {
            "ocr": ocr_result,
            "face_match": face_result,
            "overall_confidence": round(overall_confidence, 2),
            "verified": ocr_result.confidence > 0.7 and face_result.match,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)
