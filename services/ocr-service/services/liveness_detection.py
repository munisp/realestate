"""
Biometric Liveness Detection Service

Advanced anti-spoofing with 3D face mapping and challenge-response.

Supported Providers:
- FaceTec (Recommended) - 3D face mapping, passive + active liveness
- iProov (Alternative) - Genuine Presence Assurance
- Onfido (Backup) - Motion-based liveness
"""

import os
import httpx
from typing import Dict, Any, Optional
from datetime import datetime
import base64

class LivenessDetectionService:
    def __init__(self):
        # FaceTec configuration
        self.facetec_api_key = os.getenv('FACETEC_API_KEY')
        self.facetec_device_key = os.getenv('FACETEC_DEVICE_KEY')
        self.facetec_base_url = os.getenv('FACETEC_BASE_URL', 'https://api.facetec.com/api/v3.1')
        
        # iProov configuration
        self.iproov_api_key = os.getenv('IPROOV_API_KEY')
        self.iproov_secret = os.getenv('IPROOV_SECRET')
        self.iproov_base_url = os.getenv('IPROOV_BASE_URL', 'https://eu.rp.secure.iproov.me/api/v2')
        
        # Onfido configuration (backup)
        self.onfido_api_key = os.getenv('ONFIDO_API_KEY')
        self.onfido_base_url = os.getenv('ONFIDO_BASE_URL', 'https://api.onfido.com/v3.6')
    
    async def verify_liveness(
        self,
        user_id: str,
        selfie_image: str,  # Base64 encoded
        provider: str = "facetec"  # "facetec", "iproov", "onfido"
    ) -> Dict[str, Any]:
        """
        Verify liveness of selfie image
        
        Args:
            user_id: Unique user identifier
            selfie_image: Base64 encoded selfie image
            provider: Liveness detection provider
        
        Returns:
            {
                "success": bool,
                "liveness_verified": bool,
                "confidence_score": float (0-1),
                "liveness_score": float (0-100),
                "spoof_detected": bool,
                "spoof_type": str,  # "photo", "video", "mask", "deepfake", "none"
                "face_quality": {
                    "brightness": float,
                    "sharpness": float,
                    "face_angle": float
                },
                "provider": str,
                "session_id": str,
                "timestamp": str
            }
        """
        
        if provider == "facetec" and self.facetec_api_key:
            return await self._verify_with_facetec(user_id, selfie_image)
        elif provider == "iproov" and self.iproov_api_key:
            return await self._verify_with_iproov(user_id, selfie_image)
        elif provider == "onfido" and self.onfido_api_key:
            return await self._verify_with_onfido(user_id, selfie_image)
        else:
            # Fallback to any available provider
            if self.facetec_api_key:
                return await self._verify_with_facetec(user_id, selfie_image)
            elif self.iproov_api_key:
                return await self._verify_with_iproov(user_id, selfie_image)
            elif self.onfido_api_key:
                return await self._verify_with_onfido(user_id, selfie_image)
            
            return {
                "success": False,
                "error": "No liveness detection provider configured"
            }
    
    async def create_liveness_session(
        self,
        user_id: str,
        provider: str = "facetec"
    ) -> Dict[str, Any]:
        """
        Create liveness detection session
        
        Returns:
            {
                "success": bool,
                "session_id": str,
                "session_token": str,
                "expires_at": str,
                "provider": str
            }
        """
        
        if provider == "facetec" and self.facetec_api_key:
            return await self._create_facetec_session(user_id)
        elif provider == "iproov" and self.iproov_api_key:
            return await self._create_iproov_session(user_id)
        elif provider == "onfido" and self.onfido_api_key:
            return await self._create_onfido_session(user_id)
        
        return {
            "success": False,
            "error": "No liveness detection provider configured"
        }
    
    async def _verify_with_facetec(
        self,
        user_id: str,
        selfie_image: str
    ) -> Dict[str, Any]:
        """
        Verify liveness using FaceTec ZoOm
        
        FaceTec provides:
        - 3D face mapping
        - Passive liveness (no user action required)
        - Active liveness (user follows prompts)
        - Anti-spoofing (photo, video, mask detection)
        """
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "X-Device-Key": self.facetec_device_key,
                    "X-User-Agent": "RealEstatePlatform/1.0",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "externalDatabaseRefID": user_id,
                    "faceScan": selfie_image,
                    "auditTrailImage": selfie_image,
                    "lowQualityAuditTrailImage": selfie_image
                }
                
                response = await client.post(
                    f"{self.facetec_base_url}/liveness",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # FaceTec returns scanResultBlob with liveness data
                    scan_result = data.get('scanResultBlob', {})
                    
                    liveness_verified = scan_result.get('success', False)
                    liveness_score = scan_result.get('livenessScore', 0) * 100
                    
                    # Detect spoof type
                    spoof_detected = not liveness_verified
                    spoof_type = "none"
                    
                    if spoof_detected:
                        if scan_result.get('replayAttack'):
                            spoof_type = "video"
                        elif scan_result.get('printAttack'):
                            spoof_type = "photo"
                        elif scan_result.get('maskAttack'):
                            spoof_type = "mask"
                        elif scan_result.get('deepfakeDetected'):
                            spoof_type = "deepfake"
                    
                    # Face quality metrics
                    face_quality = {
                        "brightness": scan_result.get('faceQuality', {}).get('brightness', 0),
                        "sharpness": scan_result.get('faceQuality', {}).get('sharpness', 0),
                        "face_angle": scan_result.get('faceQuality', {}).get('faceAngle', 0)
                    }
                    
                    return {
                        "success": True,
                        "liveness_verified": liveness_verified,
                        "confidence_score": scan_result.get('confidence', 0),
                        "liveness_score": liveness_score,
                        "spoof_detected": spoof_detected,
                        "spoof_type": spoof_type,
                        "face_quality": face_quality,
                        "provider": "facetec",
                        "session_id": data.get('sessionId', ''),
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "success": False,
                    "error": f"FaceTec API error: {response.status_code}",
                    "details": response.text
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"FaceTec API exception: {str(e)}"
            }
    
    async def _verify_with_iproov(
        self,
        user_id: str,
        selfie_image: str
    ) -> Dict[str, Any]:
        """
        Verify liveness using iProov Genuine Presence Assurance
        
        iProov provides:
        - Genuine Presence Assurance (GPA)
        - Liveness Assurance (LA)
        - Dynamic Liveness (user follows on-screen cues)
        - Anti-spoofing
        """
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Content-Type": "application/json",
                    "X-API-Key": self.iproov_api_key,
                    "X-API-Secret": self.iproov_secret
                }
                
                # First, create a token
                token_response = await client.post(
                    f"{self.iproov_base_url}/claim/verify/token",
                    headers=headers,
                    json={
                        "api_key": self.iproov_api_key,
                        "secret": self.iproov_secret,
                        "resource": "RealEstatePlatform",
                        "client": "web",
                        "user_id": user_id
                    }
                )
                
                if token_response.status_code != 200:
                    return {
                        "success": False,
                        "error": f"iProov token error: {token_response.status_code}"
                    }
                
                token_data = token_response.json()
                token = token_data.get('token')
                
                # Validate liveness
                validate_response = await client.post(
                    f"{self.iproov_base_url}/claim/verify/validate",
                    headers=headers,
                    json={
                        "api_key": self.iproov_api_key,
                        "secret": self.iproov_secret,
                        "token": token,
                        "image": selfie_image,
                        "user_id": user_id
                    }
                )
                
                if validate_response.status_code == 200:
                    data = validate_response.json()
                    
                    liveness_verified = data.get('passed', False)
                    
                    # iProov confidence score
                    confidence = data.get('confidence', 0)
                    
                    # Spoof detection
                    spoof_detected = not liveness_verified
                    spoof_type = "none"
                    
                    if spoof_detected:
                        failure_reason = data.get('failureReason', '')
                        if 'replay' in failure_reason.lower():
                            spoof_type = "video"
                        elif 'photo' in failure_reason.lower():
                            spoof_type = "photo"
                        elif 'mask' in failure_reason.lower():
                            spoof_type = "mask"
                    
                    return {
                        "success": True,
                        "liveness_verified": liveness_verified,
                        "confidence_score": confidence,
                        "liveness_score": confidence * 100,
                        "spoof_detected": spoof_detected,
                        "spoof_type": spoof_type,
                        "face_quality": {
                            "brightness": data.get('quality', {}).get('brightness', 0),
                            "sharpness": data.get('quality', {}).get('sharpness', 0),
                            "face_angle": 0
                        },
                        "provider": "iproov",
                        "session_id": token,
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "success": False,
                    "error": f"iProov validation error: {validate_response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"iProov API exception: {str(e)}"
            }
    
    async def _verify_with_onfido(
        self,
        user_id: str,
        selfie_image: str
    ) -> Dict[str, Any]:
        """
        Verify liveness using Onfido motion-based liveness
        
        Onfido provides:
        - Motion-based liveness
        - Video liveness
        - Anti-spoofing
        """
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Token token={self.onfido_api_key}",
                    "Content-Type": "application/json"
                }
                
                # Create applicant
                applicant_response = await client.post(
                    f"{self.onfido_base_url}/applicants",
                    headers=headers,
                    json={
                        "first_name": f"User",
                        "last_name": user_id
                    }
                )
                
                if applicant_response.status_code != 201:
                    return {
                        "success": False,
                        "error": f"Onfido applicant error: {applicant_response.status_code}"
                    }
                
                applicant_id = applicant_response.json().get('id')
                
                # Upload live photo
                files = {
                    'file': ('selfie.jpg', base64.b64decode(selfie_image), 'image/jpeg')
                }
                
                photo_response = await client.post(
                    f"{self.onfido_base_url}/live_photos",
                    headers={"Authorization": f"Token token={self.onfido_api_key}"},
                    data={"applicant_id": applicant_id},
                    files=files
                )
                
                if photo_response.status_code != 201:
                    return {
                        "success": False,
                        "error": f"Onfido photo upload error: {photo_response.status_code}"
                    }
                
                photo_id = photo_response.json().get('id')
                
                # Create liveness check
                check_response = await client.post(
                    f"{self.onfido_base_url}/checks",
                    headers=headers,
                    json={
                        "applicant_id": applicant_id,
                        "report_names": ["facial_similarity_photo"]
                    }
                )
                
                if check_response.status_code == 201:
                    check_data = check_response.json()
                    
                    # Get report
                    report_id = check_data.get('report_ids', [])[0] if check_data.get('report_ids') else None
                    
                    if report_id:
                        report_response = await client.get(
                            f"{self.onfido_base_url}/reports/{report_id}",
                            headers=headers
                        )
                        
                        if report_response.status_code == 200:
                            report_data = report_response.json()
                            
                            result = report_data.get('result', 'clear')
                            liveness_verified = result == 'clear'
                            
                            breakdown = report_data.get('breakdown', {})
                            image_quality = breakdown.get('image_quality', {})
                            
                            return {
                                "success": True,
                                "liveness_verified": liveness_verified,
                                "confidence_score": 0.9 if liveness_verified else 0.3,
                                "liveness_score": 90 if liveness_verified else 30,
                                "spoof_detected": not liveness_verified,
                                "spoof_type": "photo" if not liveness_verified else "none",
                                "face_quality": {
                                    "brightness": 0.8,
                                    "sharpness": image_quality.get('sharpness', {}).get('result', 0),
                                    "face_angle": 0
                                },
                                "provider": "onfido",
                                "session_id": check_data.get('id', ''),
                                "timestamp": datetime.now().isoformat()
                            }
                
                return {
                    "success": False,
                    "error": "Onfido liveness check failed"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Onfido API exception: {str(e)}"
            }
    
    async def _create_facetec_session(self, user_id: str) -> Dict[str, Any]:
        """Create FaceTec liveness session"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "X-Device-Key": self.facetec_device_key,
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{self.facetec_base_url}/session-token",
                    headers=headers,
                    json={
                        "externalDatabaseRefID": user_id
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    return {
                        "success": True,
                        "session_id": data.get('sessionId', ''),
                        "session_token": data.get('sessionToken', ''),
                        "expires_at": data.get('expiresAt', ''),
                        "provider": "facetec"
                    }
                
                return {
                    "success": False,
                    "error": f"FaceTec session error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"FaceTec session exception: {str(e)}"
            }
    
    async def _create_iproov_session(self, user_id: str) -> Dict[str, Any]:
        """Create iProov liveness session"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Content-Type": "application/json",
                    "X-API-Key": self.iproov_api_key,
                    "X-API-Secret": self.iproov_secret
                }
                
                response = await client.post(
                    f"{self.iproov_base_url}/claim/verify/token",
                    headers=headers,
                    json={
                        "api_key": self.iproov_api_key,
                        "secret": self.iproov_secret,
                        "resource": "RealEstatePlatform",
                        "client": "web",
                        "user_id": user_id
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    return {
                        "success": True,
                        "session_id": data.get('token', ''),
                        "session_token": data.get('token', ''),
                        "expires_at": "",
                        "provider": "iproov"
                    }
                
                return {
                    "success": False,
                    "error": f"iProov session error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"iProov session exception: {str(e)}"
            }
    
    async def _create_onfido_session(self, user_id: str) -> Dict[str, Any]:
        """Create Onfido liveness session"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Token token={self.onfido_api_key}",
                    "Content-Type": "application/json"
                }
                
                # Create SDK token
                response = await client.post(
                    f"{self.onfido_base_url}/sdk_token",
                    headers=headers,
                    json={
                        "applicant_id": user_id,
                        "referrer": "https://*.manus.space"
                    }
                )
                
                if response.status_code == 201:
                    data = response.json()
                    
                    return {
                        "success": True,
                        "session_id": user_id,
                        "session_token": data.get('token', ''),
                        "expires_at": "",
                        "provider": "onfido"
                    }
                
                return {
                    "success": False,
                    "error": f"Onfido session error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Onfido session exception: {str(e)}"
            }
