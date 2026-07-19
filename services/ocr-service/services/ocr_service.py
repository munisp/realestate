import cv2
import numpy as np
from paddleocr import PaddleOCR
import torch
from PIL import Image
import io
import asyncio
from typing import List, Tuple, Dict, Any
import time
import sys

# Add DeepSeek-OCR to path
sys.path.append('/app/deepseek_ocr')

from models import DocumentType, OCRResult

class OCRService:
    def __init__(self):
        # Initialize PaddleOCR
        self.paddle_ocr = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=torch.cuda.is_available()
        )
        
        # Initialize DeepSeek-OCR (will be loaded on first use)
        self.deepseek_model = None
        
    async def extract_with_paddle(
        self,
        image_data: bytes,
        document_type: DocumentType
    ) -> OCRResult:
        """Extract text using PaddleOCR"""
        start_time = time.time()
        
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # Run OCR
            result = self.paddle_ocr.ocr(img, cls=True)
            
            # Parse results based on document type
            extracted_data = self._parse_paddle_results(result, document_type)
            
            processing_time = time.time() - start_time
            
            return OCRResult(
                success=True,
                document_type=document_type,
                extracted_data=extracted_data,
                confidence=extracted_data.get('confidence', 0.0),
                processing_time=processing_time,
                ocr_engine="paddle"
            )
        except Exception as e:
            return OCRResult(
                success=False,
                document_type=document_type,
                extracted_data={"error": str(e)},
                confidence=0.0,
                processing_time=time.time() - start_time,
                ocr_engine="paddle"
            )
    
    async def extract_with_deepseek(
        self,
        image_data: bytes,
        document_type: DocumentType
    ) -> OCRResult:
        """Extract text using DeepSeek-OCR"""
        start_time = time.time()
        
        try:
            # Load DeepSeek model if not loaded
            if self.deepseek_model is None:
                self._load_deepseek_model()
            
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Run DeepSeek-OCR inference
            result = await self._run_deepseek_inference(image)
            
            # Parse results based on document type
            extracted_data = self._parse_deepseek_results(result, document_type)
            
            processing_time = time.time() - start_time
            
            return OCRResult(
                success=True,
                document_type=document_type,
                extracted_data=extracted_data,
                confidence=extracted_data.get('confidence', 0.0),
                processing_time=processing_time,
                ocr_engine="deepseek"
            )
        except Exception as e:
            # Fallback to PaddleOCR if DeepSeek fails
            return await self.extract_with_paddle(image_data, document_type)
    
    async def batch_extract(
        self,
        files: List[Tuple[str, bytes]],
        document_type: DocumentType
    ) -> List[OCRResult]:
        """Batch process multiple documents in parallel"""
        tasks = []
        for filename, file_data in files:
            task = self.extract_with_deepseek(file_data, document_type)
            tasks.append(task)
        
        # Run all tasks in parallel
        results = await asyncio.gather(*tasks)
        return results
    
    def _load_deepseek_model(self):
        """Load DeepSeek-OCR model"""
        try:
            from deepseek_ocr.model import DeepSeekOCR
            
            self.deepseek_model = DeepSeekOCR(
                model_path="/app/deepseek_ocr/models",
                device="cuda" if torch.cuda.is_available() else "cpu"
            )
        except Exception as e:
            print(f"Failed to load DeepSeek-OCR: {e}")
            self.deepseek_model = None
    
    async def _run_deepseek_inference(self, image: Image.Image) -> Dict[str, Any]:
        """Run DeepSeek-OCR inference"""
        if self.deepseek_model is None:
            raise ValueError("DeepSeek model not loaded")
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            self.deepseek_model.predict,
            image
        )
        
        return result
    
    def _parse_paddle_results(
        self,
        ocr_result: List,
        document_type: DocumentType
    ) -> Dict[str, Any]:
        """Parse PaddleOCR results into structured data"""
        if not ocr_result or not ocr_result[0]:
            return {"error": "No text detected", "confidence": 0.0}
        
        texts = []
        confidences = []
        
        for line in ocr_result[0]:
            text = line[1][0]
            confidence = line[1][1]
            texts.append(text)
            confidences.append(confidence)
        
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        if document_type == DocumentType.PASSPORT:
            return self._parse_passport(texts, avg_confidence)
        elif document_type == DocumentType.DRIVERS_LICENSE:
            return self._parse_drivers_license(texts, avg_confidence)
        elif document_type == DocumentType.NATIONAL_ID:
            return self._parse_national_id(texts, avg_confidence)
        else:
            return {
                "raw_text": " ".join(texts),
                "confidence": avg_confidence
            }
    
    def _parse_deepseek_results(
        self,
        result: Dict[str, Any],
        document_type: DocumentType
    ) -> Dict[str, Any]:
        """Parse DeepSeek-OCR results into structured data"""
        if document_type == DocumentType.PASSPORT:
            return {
                "document_number": result.get("passport_number", ""),
                "surname": result.get("surname", ""),
                "given_names": result.get("given_names", ""),
                "nationality": result.get("nationality", ""),
                "date_of_birth": result.get("date_of_birth", ""),
                "sex": result.get("sex", ""),
                "place_of_birth": result.get("place_of_birth", ""),
                "date_of_issue": result.get("date_of_issue", ""),
                "date_of_expiry": result.get("date_of_expiry", ""),
                "issuing_authority": result.get("issuing_authority", ""),
                "confidence": result.get("confidence", 0.0)
            }
        else:
            return result
    
    def _parse_passport(self, texts: List[str], confidence: float) -> Dict[str, Any]:
        """Parse passport text into structured data"""
        data = {"confidence": confidence}
        
        for text in texts:
            text_upper = text.upper()
            
            if "PASSPORT" in text_upper or "PASSEPORT" in text_upper:
                data["document_type"] = "passport"
            elif "SURNAME" in text_upper or any(char.isupper() for char in text):
                if "surname" not in data:
                    data["surname"] = text
            elif any(char.isdigit() for char in text) and len(text) >= 6:
                if "document_number" not in data:
                    data["document_number"] = text
            elif "/" in text and len(text) <= 10:
                if "date_of_birth" not in data:
                    data["date_of_birth"] = text
        
        return data
    
    def _parse_drivers_license(self, texts: List[str], confidence: float) -> Dict[str, Any]:
        return {
            "raw_text": " ".join(texts),
            "confidence": confidence,
            "document_type": "drivers_license"
        }
    
    def _parse_national_id(self, texts: List[str], confidence: float) -> Dict[str, Any]:
        return {
            "raw_text": " ".join(texts),
            "confidence": confidence,
            "document_type": "national_id"
        }
