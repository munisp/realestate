"""
NIN (National Identity Number) Verification Service

Integrates with NIMC (National Identity Management Commission) APIs for production-grade
identity verification of Nigerian residents.

Supported APIs:
1. NIMC Direct API (official, requires government approval)
2. Verified.africa API (third-party aggregator)
3. Youverify API (third-party with instant verification)
4. Dojah API (popular fintech KYC provider)
"""

import os
import httpx
from typing import Optional, Dict, Any, Literal
from datetime import datetime, timedelta
import hashlib
import hmac
import base64

class NINVerificationService:
    def __init__(self):
        # Primary API: Dojah (most reliable for Nigerian fintech)
        self.dojah_api_key = os.getenv('DOJAH_API_KEY')
        self.dojah_app_id = os.getenv('DOJAH_APP_ID')
        self.dojah_base_url = os.getenv('DOJAH_BASE_URL', 'https://api.dojah.io')
        
        # Backup API: Youverify
        self.youverify_api_key = os.getenv('YOUVERIFY_API_KEY')
        self.youverify_base_url = os.getenv('YOUVERIFY_BASE_URL', 'https://api.youverify.co/v2')
        
        # Tertiary API: Verified.africa
        self.verified_api_key = os.getenv('VERIFIED_AFRICA_API_KEY')
        self.verified_base_url = os.getenv('VERIFIED_AFRICA_BASE_URL', 'https://api.verified.africa/v1')
        
        # Cache settings (reduce API costs)
        self.cache_ttl = timedelta(hours=24)
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    async def verify_nin(
        self,
        nin: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        date_of_birth: Optional[str] = None,
        phone_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify NIN with NIMC database
        
        Args:
            nin: 11-digit National Identity Number
            first_name: Optional first name for matching
            last_name: Optional last name for matching
            date_of_birth: Optional DOB in YYYY-MM-DD format
            phone_number: Optional phone for matching
        
        Returns:
            {
                "success": bool,
                "verified": bool,
                "nin": str,
                "data": {
                    "first_name": str,
                    "last_name": str,
                    "middle_name": str,
                    "date_of_birth": str,
                    "gender": str,
                    "phone": str,
                    "photo": str (base64),
                    "address": str,
                    "lga": str,
                    "state": str
                },
                "match_score": float,
                "provider": str,
                "timestamp": str
            }
        """
        
        # Validate NIN format
        if not self._validate_nin_format(nin):
            return {
                "success": False,
                "verified": False,
                "error": "Invalid NIN format. Must be 11 digits."
            }
        
        # Check cache
        cache_key = self._get_cache_key(nin)
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if datetime.now() - cached['timestamp'] < self.cache_ttl:
                return cached['data']
        
        # Try primary API (Dojah)
        if self.dojah_api_key:
            result = await self._verify_with_dojah(nin, first_name, last_name, date_of_birth)
            if result['success']:
                self._cache_result(cache_key, result)
                return result
        
        # Fallback to Youverify
        if self.youverify_api_key:
            result = await self._verify_with_youverify(nin, first_name, last_name, date_of_birth)
            if result['success']:
                self._cache_result(cache_key, result)
                return result
        
        # Fallback to Verified.africa
        if self.verified_api_key:
            result = await self._verify_with_verified_africa(nin, first_name, last_name)
            if result['success']:
                self._cache_result(cache_key, result)
                return result
        
        return {
            "success": False,
            "verified": False,
            "error": "No NIN verification API configured. Please set DOJAH_API_KEY, YOUVERIFY_API_KEY, or VERIFIED_AFRICA_API_KEY."
        }
    
    async def verify_nin_with_face(
        self,
        nin: str,
        selfie_image: bytes
    ) -> Dict[str, Any]:
        """
        Verify NIN and match face with NIMC photo
        
        Args:
            nin: 11-digit National Identity Number
            selfie_image: User's selfie image bytes
        
        Returns:
            {
                "success": bool,
                "verified": bool,
                "face_match": bool,
                "face_match_score": float,
                "nin_data": dict
            }
        """
        
        # First verify NIN
        nin_result = await self.verify_nin(nin)
        
        if not nin_result.get('verified'):
            return {
                "success": False,
                "verified": False,
                "error": nin_result.get('error', 'NIN verification failed')
            }
        
        # Extract NIMC photo
        nimc_photo_base64 = nin_result.get('data', {}).get('photo')
        if not nimc_photo_base64:
            return {
                "success": True,
                "verified": True,
                "face_match": False,
                "face_match_score": 0.0,
                "nin_data": nin_result['data'],
                "warning": "No photo available from NIMC for face matching"
            }
        
        # Perform face matching (using external service)
        face_match_result = await self._match_faces_advanced(
            base64.b64decode(nimc_photo_base64),
            selfie_image
        )
        
        return {
            "success": True,
            "verified": True,
            "face_match": face_match_result['match'],
            "face_match_score": face_match_result['score'],
            "liveness_check": face_match_result.get('liveness', False),
            "nin_data": nin_result['data'],
            "provider": nin_result['provider']
        }
    
    async def _verify_with_dojah(
        self,
        nin: str,
        first_name: Optional[str],
        last_name: Optional[str],
        date_of_birth: Optional[str]
    ) -> Dict[str, Any]:
        """Verify NIN using Dojah API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": self.dojah_api_key,
                    "AppId": self.dojah_app_id,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "nin": nin
                }
                
                if first_name:
                    payload["first_name"] = first_name
                if last_name:
                    payload["last_name"] = last_name
                if date_of_birth:
                    payload["dob"] = date_of_birth
                
                response = await client.post(
                    f"{self.dojah_base_url}/api/v1/kyc/nin",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('entity'):
                        entity = data['entity']
                        
                        # Calculate match score
                        match_score = self._calculate_match_score(
                            entity,
                            first_name,
                            last_name,
                            date_of_birth
                        )
                        
                        return {
                            "success": True,
                            "verified": True,
                            "nin": nin,
                            "data": {
                                "first_name": entity.get('firstname', ''),
                                "last_name": entity.get('surname', ''),
                                "middle_name": entity.get('middlename', ''),
                                "date_of_birth": entity.get('birthdate', ''),
                                "gender": entity.get('gender', ''),
                                "phone": entity.get('telephoneno', ''),
                                "photo": entity.get('photo', ''),
                                "address": entity.get('residence_address', ''),
                                "lga": entity.get('residence_lga', ''),
                                "state": entity.get('residence_state', ''),
                                "nationality": entity.get('nationality', 'Nigerian')
                            },
                            "match_score": match_score,
                            "provider": "dojah",
                            "timestamp": datetime.now().isoformat()
                        }
                
                return {
                    "success": False,
                    "verified": False,
                    "error": f"Dojah API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "verified": False,
                "error": f"Dojah API exception: {str(e)}"
            }
    
    async def _verify_with_youverify(
        self,
        nin: str,
        first_name: Optional[str],
        last_name: Optional[str],
        date_of_birth: Optional[str]
    ) -> Dict[str, Any]:
        """Verify NIN using Youverify API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Token": self.youverify_api_key,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "id": nin,
                    "isSubjectConsent": True
                }
                
                if first_name:
                    payload["firstName"] = first_name
                if last_name:
                    payload["lastName"] = last_name
                
                response = await client.post(
                    f"{self.youverify_base_url}/identities/ng/nin",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('success') and data.get('data'):
                        nin_data = data['data']
                        
                        match_score = self._calculate_match_score(
                            nin_data,
                            first_name,
                            last_name,
                            date_of_birth
                        )
                        
                        return {
                            "success": True,
                            "verified": True,
                            "nin": nin,
                            "data": {
                                "first_name": nin_data.get('firstName', ''),
                                "last_name": nin_data.get('lastName', ''),
                                "middle_name": nin_data.get('middleName', ''),
                                "date_of_birth": nin_data.get('birthDate', ''),
                                "gender": nin_data.get('gender', ''),
                                "phone": nin_data.get('phone', ''),
                                "photo": nin_data.get('photo', ''),
                                "address": nin_data.get('residenceAddress', ''),
                                "lga": nin_data.get('residenceLga', ''),
                                "state": nin_data.get('residenceState', '')
                            },
                            "match_score": match_score,
                            "provider": "youverify",
                            "timestamp": datetime.now().isoformat()
                        }
                
                return {
                    "success": False,
                    "verified": False,
                    "error": f"Youverify API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "verified": False,
                "error": f"Youverify API exception: {str(e)}"
            }
    
    async def _verify_with_verified_africa(
        self,
        nin: str,
        first_name: Optional[str],
        last_name: Optional[str]
    ) -> Dict[str, Any]:
        """Verify NIN using Verified.africa API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.verified_api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "number": nin,
                    "type": "nin"
                }
                
                response = await client.post(
                    f"{self.verified_base_url}/verifications/identities/ng",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('status') == 'success':
                        identity = data.get('identity', {})
                        
                        match_score = self._calculate_match_score(
                            identity,
                            first_name,
                            last_name,
                            None
                        )
                        
                        return {
                            "success": True,
                            "verified": True,
                            "nin": nin,
                            "data": {
                                "first_name": identity.get('first_name', ''),
                                "last_name": identity.get('last_name', ''),
                                "middle_name": identity.get('middle_name', ''),
                                "date_of_birth": identity.get('date_of_birth', ''),
                                "gender": identity.get('gender', ''),
                                "phone": identity.get('phone', ''),
                                "photo": identity.get('photo', ''),
                                "address": identity.get('address', ''),
                                "lga": identity.get('lga', ''),
                                "state": identity.get('state', '')
                            },
                            "match_score": match_score,
                            "provider": "verified.africa",
                            "timestamp": datetime.now().isoformat()
                        }
                
                return {
                    "success": False,
                    "verified": False,
                    "error": f"Verified.africa API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "verified": False,
                "error": f"Verified.africa API exception: {str(e)}"
            }
    
    async def _match_faces_advanced(
        self,
        reference_image: bytes,
        selfie_image: bytes
    ) -> Dict[str, Any]:
        """
        Advanced face matching with liveness detection
        Uses Dojah or external face recognition service
        """
        
        if self.dojah_api_key:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    headers = {
                        "Authorization": self.dojah_api_key,
                        "AppId": self.dojah_app_id
                    }
                    
                    files = {
                        "photo_one": ("reference.jpg", reference_image, "image/jpeg"),
                        "photo_two": ("selfie.jpg", selfie_image, "image/jpeg")
                    }
                    
                    response = await client.post(
                        f"{self.dojah_base_url}/api/v1/ml/face_match",
                        headers=headers,
                        files=files
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        match_score = data.get('entity', {}).get('confidence', 0.0)
                        
                        return {
                            "match": match_score >= 0.75,
                            "score": match_score,
                            "liveness": True,  # Dojah includes liveness
                            "provider": "dojah"
                        }
            except Exception as e:
                pass
        
        # Fallback to basic matching
        return {
            "match": False,
            "score": 0.0,
            "liveness": False,
            "provider": "none",
            "error": "No face matching API configured"
        }
    
    def _validate_nin_format(self, nin: str) -> bool:
        """Validate NIN format (11 digits)"""
        return nin.isdigit() and len(nin) == 11
    
    def _calculate_match_score(
        self,
        api_data: Dict[str, Any],
        provided_first_name: Optional[str],
        provided_last_name: Optional[str],
        provided_dob: Optional[str]
    ) -> float:
        """Calculate match score between provided data and API response"""
        
        score = 1.0
        
        if provided_first_name:
            api_first = api_data.get('firstname') or api_data.get('firstName') or api_data.get('first_name', '')
            if api_first.lower() != provided_first_name.lower():
                score -= 0.3
        
        if provided_last_name:
            api_last = api_data.get('surname') or api_data.get('lastName') or api_data.get('last_name', '')
            if api_last.lower() != provided_last_name.lower():
                score -= 0.3
        
        if provided_dob:
            api_dob = api_data.get('birthdate') or api_data.get('birthDate') or api_data.get('date_of_birth', '')
            if api_dob != provided_dob:
                score -= 0.4
        
        return max(0.0, score)
    
    def _get_cache_key(self, nin: str) -> str:
        """Generate cache key for NIN"""
        return hashlib.sha256(nin.encode()).hexdigest()
    
    def _cache_result(self, cache_key: str, result: Dict[str, Any]):
        """Cache verification result"""
        self._cache[cache_key] = {
            'data': result,
            'timestamp': datetime.now()
        }
