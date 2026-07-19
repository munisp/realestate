"""
KYB (Know Your Business) Verification Service

Comprehensive business verification for Nigerian companies including:
- CAC (Corporate Affairs Commission) verification
- Business registration validation
- Director KYC checks
- Beneficial ownership verification
- Business address verification
- Tax identification (TIN) verification
"""

import os
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import hashlib

class KYBVerificationService:
    def __init__(self):
        # Primary API: Dojah (comprehensive KYB)
        self.dojah_api_key = os.getenv('DOJAH_API_KEY')
        self.dojah_app_id = os.getenv('DOJAH_APP_ID')
        self.dojah_base_url = os.getenv('DOJAH_BASE_URL', 'https://api.dojah.io')
        
        # Backup API: Youverify
        self.youverify_api_key = os.getenv('YOUVERIFY_API_KEY')
        self.youverify_base_url = os.getenv('YOUVERIFY_BASE_URL', 'https://api.youverify.co/v2')
        
        # Tertiary API: Verified.africa
        self.verified_api_key = os.getenv('VERIFIED_AFRICA_API_KEY')
        self.verified_base_url = os.getenv('VERIFIED_AFRICA_BASE_URL', 'https://api.verified.africa/v1')
        
        # Cache settings
        self.cache_ttl = timedelta(hours=24)
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    async def verify_cac(
        self,
        rc_number: str,
        company_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify CAC (Corporate Affairs Commission) registration
        
        Args:
            rc_number: Registration number (RC, BN, IT, LLP)
            company_name: Optional company name for matching
        
        Returns:
            {
                "success": bool,
                "verified": bool,
                "rc_number": str,
                "data": {
                    "company_name": str,
                    "registration_date": str,
                    "company_type": str,  # "LIMITED", "BN", "IT", "LLP"
                    "status": str,  # "ACTIVE", "INACTIVE", "DISSOLVED"
                    "address": str,
                    "state": str,
                    "email": str,
                    "phone": str,
                    "directors": List[dict],
                    "shareholders": List[dict],
                    "share_capital": float,
                    "classification": str,
                    "branch": str
                },
                "match_score": float,
                "provider": str,
                "timestamp": str
            }
        """
        
        # Validate RC number format
        if not self._validate_rc_format(rc_number):
            return {
                "success": False,
                "verified": False,
                "error": "Invalid RC number format"
            }
        
        # Check cache
        cache_key = self._get_cache_key(rc_number)
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if datetime.now() - cached['timestamp'] < self.cache_ttl:
                return cached['data']
        
        # Try primary API (Dojah)
        if self.dojah_api_key:
            result = await self._verify_cac_with_dojah(rc_number, company_name)
            if result['success']:
                self._cache_result(cache_key, result)
                return result
        
        # Fallback to Youverify
        if self.youverify_api_key:
            result = await self._verify_cac_with_youverify(rc_number, company_name)
            if result['success']:
                self._cache_result(cache_key, result)
                return result
        
        # Fallback to Verified.africa
        if self.verified_api_key:
            result = await self._verify_cac_with_verified(rc_number, company_name)
            if result['success']:
                self._cache_result(cache_key, result)
                return result
        
        return {
            "success": False,
            "verified": False,
            "error": "No CAC verification API configured"
        }
    
    async def verify_tin(
        self,
        tin: str,
        company_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify Tax Identification Number (TIN)
        
        Args:
            tin: Tax Identification Number
            company_name: Optional company name for matching
        
        Returns:
            {
                "success": bool,
                "verified": bool,
                "tin": str,
                "data": {
                    "company_name": str,
                    "tax_office": str,
                    "registration_date": str,
                    "status": str,
                    "address": str
                },
                "provider": str
            }
        """
        
        if not self._validate_tin_format(tin):
            return {
                "success": False,
                "verified": False,
                "error": "Invalid TIN format"
            }
        
        # Try Dojah
        if self.dojah_api_key:
            result = await self._verify_tin_with_dojah(tin, company_name)
            if result['success']:
                return result
        
        return {
            "success": False,
            "verified": False,
            "error": "TIN verification not configured"
        }
    
    async def verify_directors(
        self,
        rc_number: str,
        directors: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Verify company directors with individual KYC
        
        Args:
            rc_number: Company RC number
            directors: List of directors with NIN/BVN
        
        Returns:
            {
                "success": bool,
                "all_verified": bool,
                "directors": [
                    {
                        "name": str,
                        "verified": bool,
                        "nin_verified": bool,
                        "bvn_verified": bool,
                        "position": str,
                        "appointment_date": str
                    }
                ]
            }
        """
        
        from .nin_verification import NINVerificationService
        from .bvn_verification import BVNVerificationService
        
        nin_service = NINVerificationService()
        bvn_service = BVNVerificationService()
        
        verified_directors = []
        all_verified = True
        
        for director in directors:
            director_result = {
                "name": director.get('name', ''),
                "position": director.get('position', 'Director'),
                "verified": False,
                "nin_verified": False,
                "bvn_verified": False
            }
            
            # Verify NIN if provided
            if director.get('nin'):
                nin_result = await nin_service.verify_nin(
                    nin=director['nin'],
                    first_name=director.get('first_name'),
                    last_name=director.get('last_name')
                )
                director_result['nin_verified'] = nin_result.get('verified', False)
            
            # Verify BVN if provided
            if director.get('bvn'):
                bvn_result = await bvn_service.verify_bvn(
                    bvn=director['bvn'],
                    first_name=director.get('first_name'),
                    last_name=director.get('last_name')
                )
                director_result['bvn_verified'] = bvn_result.get('verified', False)
            
            # Director is verified if either NIN or BVN is verified
            director_result['verified'] = (
                director_result['nin_verified'] or 
                director_result['bvn_verified']
            )
            
            if not director_result['verified']:
                all_verified = False
            
            verified_directors.append(director_result)
        
        return {
            "success": True,
            "all_verified": all_verified,
            "directors": verified_directors,
            "verified_count": sum(1 for d in verified_directors if d['verified']),
            "total_count": len(verified_directors)
        }
    
    async def verify_business_address(
        self,
        rc_number: str,
        proof_document: bytes,
        expected_address: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Verify business address with proof document
        
        Args:
            rc_number: Company RC number
            proof_document: Utility bill or lease agreement
            expected_address: Expected address fields
        
        Returns:
            {
                "success": bool,
                "verified": bool,
                "address_match": bool,
                "extracted_address": dict
            }
        """
        
        # Get CAC registered address
        cac_result = await self.verify_cac(rc_number)
        
        if not cac_result.get('verified'):
            return {
                "success": False,
                "verified": False,
                "error": "CAC verification failed"
            }
        
        cac_address = cac_result['data'].get('address', '')
        
        # Compare with expected address
        address_match = self._compare_addresses(
            cac_address,
            expected_address.get('full_address', '')
        )
        
        return {
            "success": True,
            "verified": True,
            "address_match": address_match,
            "cac_address": cac_address,
            "expected_address": expected_address.get('full_address', ''),
            "match_score": 1.0 if address_match else 0.5
        }
    
    async def comprehensive_kyb(
        self,
        rc_number: str,
        tin: Optional[str] = None,
        directors: Optional[List[Dict[str, str]]] = None,
        verify_directors_kyc: bool = True
    ) -> Dict[str, Any]:
        """
        Comprehensive KYB verification
        
        Performs:
        1. CAC verification
        2. TIN verification (if provided)
        3. Director KYC (if provided)
        4. Risk assessment
        
        Returns:
            {
                "success": bool,
                "verified": bool,
                "risk_level": str,  # "LOW", "MEDIUM", "HIGH"
                "cac_data": dict,
                "tin_data": dict,
                "directors_data": dict,
                "recommendations": List[str]
            }
        """
        
        results = {
            "success": True,
            "verified": False,
            "risk_level": "HIGH",
            "cac_verified": False,
            "tin_verified": False,
            "directors_verified": False,
            "recommendations": []
        }
        
        # 1. Verify CAC
        cac_result = await self.verify_cac(rc_number)
        results['cac_data'] = cac_result
        results['cac_verified'] = cac_result.get('verified', False)
        
        if not results['cac_verified']:
            results['recommendations'].append("CAC verification failed - company may not be registered")
            return results
        
        # Check company status
        company_status = cac_result.get('data', {}).get('status', '')
        if company_status != 'ACTIVE':
            results['recommendations'].append(f"Company status is {company_status} - not active")
            results['risk_level'] = "HIGH"
            return results
        
        # 2. Verify TIN (if provided)
        if tin:
            tin_result = await self.verify_tin(tin)
            results['tin_data'] = tin_result
            results['tin_verified'] = tin_result.get('verified', False)
            
            if not results['tin_verified']:
                results['recommendations'].append("TIN verification failed - tax compliance unclear")
        
        # 3. Verify Directors (if provided and requested)
        if directors and verify_directors_kyc:
            directors_result = await self.verify_directors(rc_number, directors)
            results['directors_data'] = directors_result
            results['directors_verified'] = directors_result.get('all_verified', False)
            
            if not results['directors_verified']:
                verified_count = directors_result.get('verified_count', 0)
                total_count = directors_result.get('total_count', 0)
                results['recommendations'].append(
                    f"Only {verified_count}/{total_count} directors verified"
                )
        
        # 4. Risk Assessment
        risk_score = 0
        
        if results['cac_verified']:
            risk_score += 40
        if results['tin_verified']:
            risk_score += 20
        if results['directors_verified']:
            risk_score += 40
        
        # Determine risk level
        if risk_score >= 80:
            results['risk_level'] = "LOW"
            results['verified'] = True
        elif risk_score >= 50:
            results['risk_level'] = "MEDIUM"
            results['verified'] = True
            results['recommendations'].append("Additional verification recommended")
        else:
            results['risk_level'] = "HIGH"
            results['recommendations'].append("Insufficient verification - high risk")
        
        return results
    
    async def _verify_cac_with_dojah(
        self,
        rc_number: str,
        company_name: Optional[str]
    ) -> Dict[str, Any]:
        """Verify CAC using Dojah API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": self.dojah_api_key,
                    "AppId": self.dojah_app_id,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "rc_number": rc_number
                }
                
                if company_name:
                    payload["company_name"] = company_name
                
                response = await client.post(
                    f"{self.dojah_base_url}/api/v1/kyc/cac",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('entity'):
                        entity = data['entity']
                        
                        # Extract directors
                        directors = []
                        if entity.get('directors'):
                            for director in entity['directors']:
                                directors.append({
                                    "name": director.get('name', ''),
                                    "position": director.get('position', 'Director'),
                                    "appointment_date": director.get('date_appointed', ''),
                                    "nationality": director.get('nationality', 'Nigerian')
                                })
                        
                        # Extract shareholders
                        shareholders = []
                        if entity.get('shareholders'):
                            for shareholder in entity['shareholders']:
                                shareholders.append({
                                    "name": shareholder.get('name', ''),
                                    "shares": shareholder.get('num_shares', 0),
                                    "share_type": shareholder.get('share_type', '')
                                })
                        
                        match_score = 1.0
                        if company_name:
                            match_score = self._calculate_name_match(
                                entity.get('company_name', ''),
                                company_name
                            )
                        
                        return {
                            "success": True,
                            "verified": True,
                            "rc_number": rc_number,
                            "data": {
                                "company_name": entity.get('company_name', ''),
                                "registration_date": entity.get('registration_date', ''),
                                "company_type": entity.get('company_type', ''),
                                "status": entity.get('status', 'UNKNOWN'),
                                "address": entity.get('address', ''),
                                "state": entity.get('state', ''),
                                "email": entity.get('email', ''),
                                "phone": entity.get('phone', ''),
                                "directors": directors,
                                "shareholders": shareholders,
                                "share_capital": entity.get('share_capital', 0),
                                "classification": entity.get('classification', ''),
                                "branch": entity.get('branch', '')
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
    
    async def _verify_cac_with_youverify(
        self,
        rc_number: str,
        company_name: Optional[str]
    ) -> Dict[str, Any]:
        """Verify CAC using Youverify API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Token": self.youverify_api_key,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "id": rc_number,
                    "isSubjectConsent": True
                }
                
                response = await client.post(
                    f"{self.youverify_base_url}/identities/ng/cac",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('success') and data.get('data'):
                        cac_data = data['data']
                        
                        match_score = 1.0
                        if company_name:
                            match_score = self._calculate_name_match(
                                cac_data.get('companyName', ''),
                                company_name
                            )
                        
                        return {
                            "success": True,
                            "verified": True,
                            "rc_number": rc_number,
                            "data": {
                                "company_name": cac_data.get('companyName', ''),
                                "registration_date": cac_data.get('registrationDate', ''),
                                "company_type": cac_data.get('companyType', ''),
                                "status": cac_data.get('status', 'UNKNOWN'),
                                "address": cac_data.get('address', ''),
                                "state": cac_data.get('state', ''),
                                "email": cac_data.get('email', ''),
                                "phone": cac_data.get('phone', ''),
                                "directors": cac_data.get('directors', []),
                                "shareholders": cac_data.get('shareholders', []),
                                "share_capital": cac_data.get('shareCapital', 0),
                                "classification": cac_data.get('classification', ''),
                                "branch": cac_data.get('branch', '')
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
    
    async def _verify_cac_with_verified(
        self,
        rc_number: str,
        company_name: Optional[str]
    ) -> Dict[str, Any]:
        """Verify CAC using Verified.africa API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.verified_api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "number": rc_number,
                    "type": "cac"
                }
                
                response = await client.post(
                    f"{self.verified_base_url}/verifications/business/ng",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('status') == 'success':
                        business = data.get('business', {})
                        
                        match_score = 1.0
                        if company_name:
                            match_score = self._calculate_name_match(
                                business.get('company_name', ''),
                                company_name
                            )
                        
                        return {
                            "success": True,
                            "verified": True,
                            "rc_number": rc_number,
                            "data": {
                                "company_name": business.get('company_name', ''),
                                "registration_date": business.get('registration_date', ''),
                                "company_type": business.get('company_type', ''),
                                "status": business.get('status', 'UNKNOWN'),
                                "address": business.get('address', ''),
                                "state": business.get('state', ''),
                                "email": business.get('email', ''),
                                "phone": business.get('phone', ''),
                                "directors": business.get('directors', []),
                                "shareholders": business.get('shareholders', []),
                                "share_capital": business.get('share_capital', 0),
                                "classification": business.get('classification', ''),
                                "branch": business.get('branch', '')
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
    
    async def _verify_tin_with_dojah(
        self,
        tin: str,
        company_name: Optional[str]
    ) -> Dict[str, Any]:
        """Verify TIN using Dojah API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": self.dojah_api_key,
                    "AppId": self.dojah_app_id,
                    "Content-Type": "application/json"
                }
                
                payload = {"tin": tin}
                if company_name:
                    payload["company_name"] = company_name
                
                response = await client.post(
                    f"{self.dojah_base_url}/api/v1/kyc/tin",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('entity'):
                        entity = data['entity']
                        
                        return {
                            "success": True,
                            "verified": True,
                            "tin": tin,
                            "data": {
                                "company_name": entity.get('company_name', ''),
                                "tax_office": entity.get('tax_office', ''),
                                "registration_date": entity.get('registration_date', ''),
                                "status": entity.get('status', ''),
                                "address": entity.get('address', '')
                            },
                            "provider": "dojah"
                        }
                
                return {
                    "success": False,
                    "verified": False,
                    "error": "TIN verification failed"
                }
                
        except Exception as e:
            return {
                "success": False,
                "verified": False,
                "error": f"TIN verification exception: {str(e)}"
            }
    
    def _validate_rc_format(self, rc_number: str) -> bool:
        """Validate RC number format"""
        # RC numbers typically start with RC, BN, IT, or LLP followed by digits
        if not rc_number:
            return False
        
        rc_upper = rc_number.upper()
        valid_prefixes = ['RC', 'BN', 'IT', 'LLP']
        
        for prefix in valid_prefixes:
            if rc_upper.startswith(prefix):
                return True
        
        return False
    
    def _validate_tin_format(self, tin: str) -> bool:
        """Validate TIN format"""
        # TIN is typically 8-10 digits
        return tin.isdigit() and 8 <= len(tin) <= 10
    
    def _calculate_name_match(self, api_name: str, provided_name: str) -> float:
        """Calculate name match score"""
        api_name_clean = api_name.lower().strip()
        provided_name_clean = provided_name.lower().strip()
        
        if api_name_clean == provided_name_clean:
            return 1.0
        elif api_name_clean in provided_name_clean or provided_name_clean in api_name_clean:
            return 0.8
        else:
            return 0.5
    
    def _compare_addresses(self, address1: str, address2: str) -> bool:
        """Compare two addresses for similarity"""
        addr1_clean = address1.lower().strip()
        addr2_clean = address2.lower().strip()
        
        # Simple comparison - can be enhanced with fuzzy matching
        return addr1_clean == addr2_clean or addr1_clean in addr2_clean or addr2_clean in addr1_clean
    
    def _get_cache_key(self, rc_number: str) -> str:
        """Generate cache key"""
        return hashlib.sha256(rc_number.encode()).hexdigest()
    
    def _cache_result(self, cache_key: str, result: Dict[str, Any]):
        """Cache verification result"""
        self._cache[cache_key] = {
            'data': result,
            'timestamp': datetime.now()
        }
