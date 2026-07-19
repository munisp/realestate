"""
BVN (Bank Verification Number) Verification Service

Integrates with NIBSS (Nigeria Inter-Bank Settlement System) and third-party aggregators
for production-grade BVN verification.

Supported APIs:
1. NIBSS Direct API (requires bank partnership)
2. Mono API (popular fintech BVN provider)
3. Dojah API (comprehensive KYC provider)
4. Okra API (open banking with BVN)
5. Paystack Identity API (merchant-friendly)
"""

import os
import httpx
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import hashlib
import hmac
import base64
import json

class BVNVerificationService:
    def __init__(self):
        # Primary API: Mono (most reliable for BVN)
        self.mono_secret_key = os.getenv('MONO_SECRET_KEY')
        self.mono_base_url = os.getenv('MONO_BASE_URL', 'https://api.withmono.com')
        
        # Backup API: Dojah
        self.dojah_api_key = os.getenv('DOJAH_API_KEY')
        self.dojah_app_id = os.getenv('DOJAH_APP_ID')
        self.dojah_base_url = os.getenv('DOJAH_BASE_URL', 'https://api.dojah.io')
        
        # Tertiary API: Paystack
        self.paystack_secret_key = os.getenv('PAYSTACK_SECRET_KEY')
        self.paystack_base_url = os.getenv('PAYSTACK_BASE_URL', 'https://api.paystack.co')
        
        # Okra API
        self.okra_secret_key = os.getenv('OKRA_SECRET_KEY')
        self.okra_base_url = os.getenv('OKRA_BASE_URL', 'https://api.okra.ng/v2')
        
        # Cache settings
        self.cache_ttl = timedelta(hours=24)
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    async def verify_bvn(
        self,
        bvn: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        date_of_birth: Optional[str] = None,
        phone_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify BVN with NIBSS database
        
        Args:
            bvn: 11-digit Bank Verification Number
            first_name: Optional first name for matching
            last_name: Optional last name for matching
            date_of_birth: Optional DOB in YYYY-MM-DD format
            phone_number: Optional phone for matching
        
        Returns:
            {
                "success": bool,
                "verified": bool,
                "bvn": str,
                "data": {
                    "first_name": str,
                    "last_name": str,
                    "middle_name": str,
                    "date_of_birth": str,
                    "gender": str,
                    "phone": str,
                    "photo": str (base64),
                    "enrollment_bank": str,
                    "enrollment_branch": str,
                    "registration_date": str,
                    "watch_listed": bool
                },
                "match_score": float,
                "provider": str,
                "timestamp": str
            }
        """
        
        # Validate BVN format
        if not self._validate_bvn_format(bvn):
            return {
                "success": False,
                "verified": False,
                "error": "Invalid BVN format. Must be 11 digits."
            }
        
        # Check cache
        cache_key = self._get_cache_key(bvn)
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if datetime.now() - cached['timestamp'] < self.cache_ttl:
                return cached['data']
        
        # Try primary API (Mono)
        if self.mono_secret_key:
            result = await self._verify_with_mono(bvn, first_name, last_name, date_of_birth)
            if result['success']:
                self._cache_result(cache_key, result)
                return result
        
        # Fallback to Dojah
        if self.dojah_api_key:
            result = await self._verify_with_dojah(bvn, first_name, last_name, date_of_birth)
            if result['success']:
                self._cache_result(cache_key, result)
                return result
        
        # Fallback to Paystack
        if self.paystack_secret_key:
            result = await self._verify_with_paystack(bvn, first_name, last_name, date_of_birth)
            if result['success']:
                self._cache_result(cache_key, result)
                return result
        
        # Fallback to Okra
        if self.okra_secret_key:
            result = await self._verify_with_okra(bvn, first_name, last_name)
            if result['success']:
                self._cache_result(cache_key, result)
                return result
        
        return {
            "success": False,
            "verified": False,
            "error": "No BVN verification API configured. Please set MONO_SECRET_KEY, DOJAH_API_KEY, PAYSTACK_SECRET_KEY, or OKRA_SECRET_KEY."
        }
    
    async def verify_bvn_with_phone(
        self,
        bvn: str,
        phone_number: str
    ) -> Dict[str, Any]:
        """
        Verify BVN and match phone number
        
        Args:
            bvn: 11-digit Bank Verification Number
            phone_number: Phone number to match
        
        Returns:
            {
                "success": bool,
                "verified": bool,
                "phone_match": bool,
                "bvn_data": dict
            }
        """
        
        result = await self.verify_bvn(bvn, phone_number=phone_number)
        
        if not result.get('verified'):
            return {
                "success": False,
                "verified": False,
                "phone_match": False,
                "error": result.get('error', 'BVN verification failed')
            }
        
        # Check phone match
        bvn_phone = result.get('data', {}).get('phone', '')
        phone_match = self._normalize_phone(bvn_phone) == self._normalize_phone(phone_number)
        
        return {
            "success": True,
            "verified": True,
            "phone_match": phone_match,
            "bvn_data": result['data'],
            "match_score": result.get('match_score', 1.0) if phone_match else 0.5,
            "provider": result['provider']
        }
    
    async def check_watchlist(self, bvn: str) -> Dict[str, Any]:
        """
        Check if BVN is on watchlist (fraud/blacklist)
        
        Returns:
            {
                "watch_listed": bool,
                "reason": str,
                "source": str
            }
        """
        
        result = await self.verify_bvn(bvn)
        
        if result.get('verified'):
            return {
                "watch_listed": result.get('data', {}).get('watch_listed', False),
                "reason": result.get('data', {}).get('watch_list_reason', ''),
                "source": result.get('provider', 'unknown')
            }
        
        return {
            "watch_listed": False,
            "reason": "Unable to verify BVN",
            "source": "none"
        }
    
    async def _verify_with_mono(
        self,
        bvn: str,
        first_name: Optional[str],
        last_name: Optional[str],
        date_of_birth: Optional[str]
    ) -> Dict[str, Any]:
        """Verify BVN using Mono API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "mono-sec-key": self.mono_secret_key,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "bvn": bvn
                }
                
                response = await client.post(
                    f"{self.mono_base_url}/v1/lookup/bvn",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('status') == 'successful':
                        bvn_data = data.get('data', {})
                        
                        match_score = self._calculate_match_score(
                            bvn_data,
                            first_name,
                            last_name,
                            date_of_birth
                        )
                        
                        return {
                            "success": True,
                            "verified": True,
                            "bvn": bvn,
                            "data": {
                                "first_name": bvn_data.get('first_name', ''),
                                "last_name": bvn_data.get('last_name', ''),
                                "middle_name": bvn_data.get('middle_name', ''),
                                "date_of_birth": bvn_data.get('date_of_birth', ''),
                                "gender": bvn_data.get('gender', ''),
                                "phone": bvn_data.get('phone_number', ''),
                                "photo": bvn_data.get('image', ''),
                                "enrollment_bank": bvn_data.get('enrollment_bank', ''),
                                "enrollment_branch": bvn_data.get('enrollment_branch', ''),
                                "registration_date": bvn_data.get('registration_date', ''),
                                "watch_listed": bvn_data.get('watch_listed', False)
                            },
                            "match_score": match_score,
                            "provider": "mono",
                            "timestamp": datetime.now().isoformat()
                        }
                
                return {
                    "success": False,
                    "verified": False,
                    "error": f"Mono API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "verified": False,
                "error": f"Mono API exception: {str(e)}"
            }
    
    async def _verify_with_dojah(
        self,
        bvn: str,
        first_name: Optional[str],
        last_name: Optional[str],
        date_of_birth: Optional[str]
    ) -> Dict[str, Any]:
        """Verify BVN using Dojah API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": self.dojah_api_key,
                    "AppId": self.dojah_app_id,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "bvn": bvn
                }
                
                if first_name:
                    payload["first_name"] = first_name
                if last_name:
                    payload["last_name"] = last_name
                if date_of_birth:
                    payload["dob"] = date_of_birth
                
                response = await client.post(
                    f"{self.dojah_base_url}/api/v1/kyc/bvn",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('entity'):
                        entity = data['entity']
                        
                        match_score = self._calculate_match_score(
                            entity,
                            first_name,
                            last_name,
                            date_of_birth
                        )
                        
                        return {
                            "success": True,
                            "verified": True,
                            "bvn": bvn,
                            "data": {
                                "first_name": entity.get('firstname', ''),
                                "last_name": entity.get('lastname', ''),
                                "middle_name": entity.get('middlename', ''),
                                "date_of_birth": entity.get('dob', ''),
                                "gender": entity.get('gender', ''),
                                "phone": entity.get('phone', ''),
                                "photo": entity.get('image', ''),
                                "enrollment_bank": entity.get('enrollment_bank', ''),
                                "enrollment_branch": entity.get('enrollment_branch', ''),
                                "registration_date": entity.get('registration_date', ''),
                                "watch_listed": entity.get('watchlisted', False)
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
    
    async def _verify_with_paystack(
        self,
        bvn: str,
        first_name: Optional[str],
        last_name: Optional[str],
        date_of_birth: Optional[str]
    ) -> Dict[str, Any]:
        """Verify BVN using Paystack Identity API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.paystack_secret_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "bvn": bvn,
                    "type": "bvn"
                }
                
                if first_name:
                    payload["first_name"] = first_name
                if last_name:
                    payload["last_name"] = last_name
                if date_of_birth:
                    payload["dob"] = date_of_birth
                
                response = await client.post(
                    f"{self.paystack_base_url}/identity/bvn/verify",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('status') and data.get('data'):
                        bvn_data = data['data']
                        
                        match_score = self._calculate_match_score(
                            bvn_data,
                            first_name,
                            last_name,
                            date_of_birth
                        )
                        
                        return {
                            "success": True,
                            "verified": True,
                            "bvn": bvn,
                            "data": {
                                "first_name": bvn_data.get('first_name', ''),
                                "last_name": bvn_data.get('last_name', ''),
                                "middle_name": bvn_data.get('middle_name', ''),
                                "date_of_birth": bvn_data.get('dob', ''),
                                "gender": bvn_data.get('gender', ''),
                                "phone": bvn_data.get('phone', ''),
                                "photo": bvn_data.get('photo', ''),
                                "enrollment_bank": bvn_data.get('enrollment_bank', ''),
                                "enrollment_branch": bvn_data.get('enrollment_branch', ''),
                                "registration_date": bvn_data.get('registration_date', ''),
                                "watch_listed": False  # Paystack doesn't provide this
                            },
                            "match_score": match_score,
                            "provider": "paystack",
                            "timestamp": datetime.now().isoformat()
                        }
                
                return {
                    "success": False,
                    "verified": False,
                    "error": f"Paystack API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "verified": False,
                "error": f"Paystack API exception: {str(e)}"
            }
    
    async def _verify_with_okra(
        self,
        bvn: str,
        first_name: Optional[str],
        last_name: Optional[str]
    ) -> Dict[str, Any]:
        """Verify BVN using Okra API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.okra_secret_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "bvn": bvn
                }
                
                response = await client.post(
                    f"{self.okra_base_url}/products/kyc/bvn-verify",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('status') == 'success':
                        bvn_data = data.get('data', {})
                        
                        match_score = self._calculate_match_score(
                            bvn_data,
                            first_name,
                            last_name,
                            None
                        )
                        
                        return {
                            "success": True,
                            "verified": True,
                            "bvn": bvn,
                            "data": {
                                "first_name": bvn_data.get('firstName', ''),
                                "last_name": bvn_data.get('lastName', ''),
                                "middle_name": bvn_data.get('middleName', ''),
                                "date_of_birth": bvn_data.get('dateOfBirth', ''),
                                "gender": bvn_data.get('gender', ''),
                                "phone": bvn_data.get('phoneNumber', ''),
                                "photo": bvn_data.get('photo', ''),
                                "enrollment_bank": bvn_data.get('enrollmentBank', ''),
                                "enrollment_branch": bvn_data.get('enrollmentBranch', ''),
                                "registration_date": bvn_data.get('registrationDate', ''),
                                "watch_listed": bvn_data.get('watchListed', False)
                            },
                            "match_score": match_score,
                            "provider": "okra",
                            "timestamp": datetime.now().isoformat()
                        }
                
                return {
                    "success": False,
                    "verified": False,
                    "error": f"Okra API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "verified": False,
                "error": f"Okra API exception: {str(e)}"
            }
    
    def _validate_bvn_format(self, bvn: str) -> bool:
        """Validate BVN format (11 digits)"""
        return bvn.isdigit() and len(bvn) == 11
    
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
            api_first = (api_data.get('firstname') or api_data.get('firstName') or 
                        api_data.get('first_name', '')).lower()
            if api_first != provided_first_name.lower():
                score -= 0.3
        
        if provided_last_name:
            api_last = (api_data.get('lastname') or api_data.get('lastName') or 
                       api_data.get('last_name', '')).lower()
            if api_last != provided_last_name.lower():
                score -= 0.3
        
        if provided_dob:
            api_dob = api_data.get('dob') or api_data.get('date_of_birth') or api_data.get('dateOfBirth', '')
            if api_dob != provided_dob:
                score -= 0.4
        
        return max(0.0, score)
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number for comparison"""
        # Remove all non-digits
        digits = ''.join(filter(str.isdigit, phone))
        
        # Handle Nigerian format
        if digits.startswith('234'):
            return digits
        elif digits.startswith('0'):
            return '234' + digits[1:]
        else:
            return '234' + digits
    
    def _get_cache_key(self, bvn: str) -> str:
        """Generate cache key for BVN"""
        return hashlib.sha256(bvn.encode()).hexdigest()
    
    def _cache_result(self, cache_key: str, result: Dict[str, Any]):
        """Cache verification result"""
        self._cache[cache_key] = {
            'data': result,
            'timestamp': datetime.now()
        }
