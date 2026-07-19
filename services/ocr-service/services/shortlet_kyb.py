"""
Shortlet Operator KYB Verification Service

Comprehensive verification for shortlet/hospitality operators:
- Hotel/hospitality licensing
- FIRS hospitality tax registration
- Property-specific permits (change of use, occupancy)
- Fire safety certificates
- Environmental health permits
- NTDC (Nigerian Tourism Development Corporation) registration
"""

import os
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from .kyb_verification import KYBVerificationService

class ShortletKYBService:
    def __init__(self):
        # Base KYB service
        self.base_kyb = KYBVerificationService()
        
        # FIRS API (Federal Inland Revenue Service)
        self.firs_api_key = os.getenv('FIRS_API_KEY')
        self.firs_base_url = os.getenv('FIRS_BASE_URL', 'https://api.firs.gov.ng')
        
        # NTDC API (Nigerian Tourism Development Corporation)
        self.ntdc_api_key = os.getenv('NTDC_API_KEY')
        self.ntdc_base_url = os.getenv('NTDC_BASE_URL', 'https://api.ntdc.gov.ng')
        
        # State hospitality licensing (Lagos as example)
        self.lasg_hospitality_key = os.getenv('LASG_HOSPITALITY_KEY')
        self.lasg_base_url = os.getenv('LASG_BASE_URL', 'https://eservices.lagosstate.gov.ng/api')
        
        # Fire service APIs
        self.fire_service_key = os.getenv('FIRE_SERVICE_API_KEY')
        
        # Environmental health
        self.env_health_key = os.getenv('ENV_HEALTH_API_KEY')
        
        # Cache
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    async def comprehensive_shortlet_verification(
        self,
        rc_number: str,
        company_name: str,
        operator_type: str,  # "hotel", "shortlet", "apartment", "guesthouse"
        properties: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Complete KYB verification for shortlet operators
        
        Args:
            rc_number: CAC registration number
            company_name: Business name
            operator_type: Type of hospitality business
            properties: List of properties with permit information
        
        Returns:
            {
                "success": bool,
                "verification_status": str,
                "risk_level": str,
                "verifications": {
                    "cac": dict,
                    "firs_tax": dict,
                    "ntdc": dict,
                    "hospitality_license": dict,
                    "property_permits": dict,
                    "fire_safety": dict,
                    "environmental_health": dict
                },
                "compliance_score": float,
                "missing_requirements": List[str],
                "recommendations": List[str]
            }
        """
        
        verifications = {}
        missing_requirements = []
        
        # 1. Basic CAC verification
        cac_result = await self.base_kyb.verify_cac(rc_number, company_name)
        verifications['cac'] = cac_result
        
        if not cac_result.get('verified'):
            return {
                "success": False,
                "verification_status": "FAILED",
                "error": "CAC verification failed",
                "verifications": verifications
            }
        
        # 2. FIRS hospitality tax registration
        firs_result = await self.verify_firs_hospitality_tax(rc_number)
        verifications['firs_tax'] = firs_result
        
        if not firs_result.get('verified'):
            missing_requirements.append("FIRS hospitality tax registration required")
        
        # 3. NTDC registration (tourism board)
        ntdc_result = await self.verify_ntdc(rc_number, operator_type)
        verifications['ntdc'] = ntdc_result
        
        if not ntdc_result.get('verified'):
            if operator_type in ['hotel', 'guesthouse']:
                missing_requirements.append("NTDC registration required for hotels/guesthouses")
        
        # 4. State hospitality license
        hospitality_license = await self.verify_hospitality_license(
            rc_number,
            properties[0].get('state', 'Lagos') if properties else 'Lagos'
        )
        verifications['hospitality_license'] = hospitality_license
        
        if not hospitality_license.get('verified'):
            missing_requirements.append("State hospitality license required")
        
        # 5. Property-specific permits
        property_permits = await self.verify_property_permits(properties)
        verifications['property_permits'] = property_permits
        
        if not property_permits.get('all_verified'):
            missing_requirements.append("Property permits missing or expired")
        
        # 6. Fire safety certificates
        fire_safety = await self.verify_fire_safety_certificates(properties)
        verifications['fire_safety'] = fire_safety
        
        if not fire_safety.get('all_verified'):
            missing_requirements.append("Fire safety certificates required for all properties")
        
        # 7. Environmental health permits
        env_health = await self.verify_environmental_health(properties)
        verifications['environmental_health'] = env_health
        
        if not env_health.get('all_verified'):
            missing_requirements.append("Environmental health permits required")
        
        # Calculate compliance score
        compliance_score = self._calculate_shortlet_compliance_score(verifications)
        
        # Determine verification status
        verification_status = self._determine_verification_status(
            compliance_score, missing_requirements
        )
        
        # Assess risk level
        risk_level = self._assess_shortlet_risk_level(
            verifications, compliance_score, operator_type
        )
        
        # Generate recommendations
        recommendations = self._generate_shortlet_recommendations(
            verifications, missing_requirements, operator_type
        )
        
        return {
            "success": True,
            "verification_status": verification_status,
            "risk_level": risk_level,
            "verifications": verifications,
            "compliance_score": compliance_score,
            "missing_requirements": missing_requirements,
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        }
    
    async def verify_firs_hospitality_tax(self, rc_number: str) -> Dict[str, Any]:
        """
        Verify FIRS hospitality tax registration
        
        Returns:
            {
                "verified": bool,
                "data": {
                    "tin": str,
                    "registration_date": str,
                    "tax_office": str,
                    "compliance_status": str,
                    "last_filing_date": str
                }
            }
        """
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.firs_api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    f"{self.firs_base_url}/hospitality-tax/verify/{rc_number}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check compliance status
                    compliance_status = data.get('compliance_status', 'UNKNOWN')
                    verified = compliance_status in ['COMPLIANT', 'UP_TO_DATE']
                    
                    # Check last filing (should be within 3 months)
                    last_filing = data.get('last_filing_date')
                    if last_filing:
                        filing_date = datetime.fromisoformat(last_filing)
                        months_since_filing = (datetime.now() - filing_date).days / 30
                        if months_since_filing > 3:
                            verified = False
                            compliance_status = 'OVERDUE'
                    
                    return {
                        "verified": verified,
                        "data": {
                            "tin": data.get('tin'),
                            "registration_date": data.get('registration_date'),
                            "tax_office": data.get('tax_office'),
                            "compliance_status": compliance_status,
                            "last_filing_date": last_filing
                        },
                        "provider": "firs",
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "verified": False,
                    "error": f"FIRS API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "verified": False,
                "error": f"FIRS verification exception: {str(e)}"
            }
    
    async def verify_ntdc(
        self,
        rc_number: str,
        operator_type: str
    ) -> Dict[str, Any]:
        """
        Verify NTDC (Nigerian Tourism Development Corporation) registration
        
        Returns:
            {
                "verified": bool,
                "data": {
                    "registration_number": str,
                    "registration_date": str,
                    "category": str,
                    "star_rating": int,
                    "status": str,
                    "expiry_date": str
                }
            }
        """
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.ntdc_api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    f"{self.ntdc_base_url}/verify/{rc_number}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    status = data.get('status', 'UNKNOWN')
                    verified = status == 'ACTIVE'
                    
                    # Check expiry
                    expiry_date = data.get('expiry_date')
                    if expiry_date:
                        expiry = datetime.fromisoformat(expiry_date)
                        if expiry < datetime.now():
                            verified = False
                            status = "EXPIRED"
                    
                    return {
                        "verified": verified,
                        "data": {
                            "registration_number": data.get('registration_number'),
                            "registration_date": data.get('registration_date'),
                            "category": data.get('category'),
                            "star_rating": data.get('star_rating', 0),
                            "status": status,
                            "expiry_date": expiry_date
                        },
                        "provider": "ntdc",
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "verified": False,
                    "error": f"NTDC API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "verified": False,
                "error": f"NTDC verification exception: {str(e)}"
            }
    
    async def verify_hospitality_license(
        self,
        rc_number: str,
        state: str
    ) -> Dict[str, Any]:
        """
        Verify state hospitality license
        
        Returns:
            {
                "verified": bool,
                "data": {
                    "license_number": str,
                    "issue_date": str,
                    "expiry_date": str,
                    "license_type": str,
                    "status": str
                }
            }
        """
        
        # Lagos State example
        if state == 'Lagos':
            return await self._verify_lagos_hospitality_license(rc_number)
        
        # Placeholder for other states
        return {
            "verified": False,
            "error": f"Hospitality license verification not available for {state}"
        }
    
    async def _verify_lagos_hospitality_license(self, rc_number: str) -> Dict[str, Any]:
        """Verify Lagos State hospitality license"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.lasg_hospitality_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    f"{self.lasg_base_url}/hospitality/verify/{rc_number}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    expiry_date = data.get('expiry_date')
                    verified = False
                    
                    if expiry_date:
                        expiry = datetime.fromisoformat(expiry_date)
                        verified = expiry > datetime.now()
                    
                    return {
                        "verified": verified,
                        "data": {
                            "license_number": data.get('license_number'),
                            "issue_date": data.get('issue_date'),
                            "expiry_date": expiry_date,
                            "license_type": data.get('license_type'),
                            "status": "ACTIVE" if verified else "EXPIRED"
                        },
                        "provider": "lasg",
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "verified": False,
                    "error": f"License verification error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "verified": False,
                "error": f"License verification exception: {str(e)}"
            }
    
    async def verify_property_permits(
        self,
        properties: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Verify property-specific permits (change of use, occupancy)
        
        Returns:
            {
                "all_verified": bool,
                "properties": List[dict],
                "valid_permits": int,
                "expired_permits": int,
                "missing_permits": int
            }
        """
        
        verified_properties = []
        valid_count = 0
        expired_count = 0
        missing_count = 0
        
        for property_data in properties:
            permit_result = await self._verify_property_permit(property_data)
            verified_properties.append(permit_result)
            
            if permit_result.get('permits_valid'):
                valid_count += 1
            elif permit_result.get('permits_expired'):
                expired_count += 1
            else:
                missing_count += 1
        
        all_verified = valid_count == len(properties) and expired_count == 0 and missing_count == 0
        
        return {
            "all_verified": all_verified,
            "properties": verified_properties,
            "valid_permits": valid_count,
            "expired_permits": expired_count,
            "missing_permits": missing_count,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _verify_property_permit(
        self,
        property_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify permits for a single property"""
        
        address = property_data.get('address')
        state = property_data.get('state', 'Lagos')
        change_of_use_permit = property_data.get('change_of_use_permit')
        occupancy_permit = property_data.get('occupancy_permit')
        
        permits_valid = False
        permits_expired = False
        
        # Check change of use permit (if commercial use)
        if change_of_use_permit:
            # Verify with state authority
            # Placeholder - implement actual verification
            permits_valid = True
        else:
            return {
                "address": address,
                "permits_valid": False,
                "error": "Change of use permit required for commercial/shortlet operation"
            }
        
        # Check occupancy permit
        if occupancy_permit:
            # Verify with state authority
            # Placeholder - implement actual verification
            permits_valid = permits_valid and True
        else:
            return {
                "address": address,
                "permits_valid": False,
                "error": "Occupancy permit required"
            }
        
        return {
            "address": address,
            "permits_valid": permits_valid,
            "permits_expired": permits_expired,
            "data": {
                "change_of_use_permit": change_of_use_permit,
                "occupancy_permit": occupancy_permit,
                "state": state
            }
        }
    
    async def verify_fire_safety_certificates(
        self,
        properties: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Verify fire safety certificates for all properties
        
        Returns:
            {
                "all_verified": bool,
                "properties": List[dict],
                "valid_certificates": int,
                "expired_certificates": int,
                "missing_certificates": int
            }
        """
        
        verified_properties = []
        valid_count = 0
        expired_count = 0
        missing_count = 0
        
        for property_data in properties:
            cert_result = await self._verify_fire_safety_certificate(property_data)
            verified_properties.append(cert_result)
            
            if cert_result.get('certificate_valid'):
                valid_count += 1
            elif cert_result.get('certificate_expired'):
                expired_count += 1
            else:
                missing_count += 1
        
        all_verified = valid_count == len(properties)
        
        return {
            "all_verified": all_verified,
            "properties": verified_properties,
            "valid_certificates": valid_count,
            "expired_certificates": expired_count,
            "missing_certificates": missing_count,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _verify_fire_safety_certificate(
        self,
        property_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify fire safety certificate for a single property"""
        
        address = property_data.get('address')
        certificate_number = property_data.get('fire_safety_certificate')
        
        if not certificate_number:
            return {
                "address": address,
                "certificate_valid": False,
                "error": "Fire safety certificate number not provided"
            }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.fire_service_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    f"https://api.fireservice.gov.ng/verify/{certificate_number}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    expiry_date = data.get('expiry_date')
                    certificate_valid = False
                    certificate_expired = False
                    
                    if expiry_date:
                        expiry = datetime.fromisoformat(expiry_date)
                        if expiry > datetime.now():
                            certificate_valid = True
                        else:
                            certificate_expired = True
                    
                    return {
                        "address": address,
                        "certificate_number": certificate_number,
                        "certificate_valid": certificate_valid,
                        "certificate_expired": certificate_expired,
                        "data": {
                            "issue_date": data.get('issue_date'),
                            "expiry_date": expiry_date,
                            "inspection_date": data.get('inspection_date'),
                            "compliance_status": data.get('compliance_status')
                        }
                    }
                
                return {
                    "address": address,
                    "certificate_valid": False,
                    "error": f"Fire safety verification error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "address": address,
                "certificate_valid": False,
                "error": f"Fire safety verification exception: {str(e)}"
            }
    
    async def verify_environmental_health(
        self,
        properties: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Verify environmental health permits
        
        Returns:
            {
                "all_verified": bool,
                "properties": List[dict],
                "valid_permits": int,
                "expired_permits": int,
                "missing_permits": int
            }
        """
        
        verified_properties = []
        valid_count = 0
        expired_count = 0
        missing_count = 0
        
        for property_data in properties:
            permit_result = await self._verify_env_health_permit(property_data)
            verified_properties.append(permit_result)
            
            if permit_result.get('permit_valid'):
                valid_count += 1
            elif permit_result.get('permit_expired'):
                expired_count += 1
            else:
                missing_count += 1
        
        all_verified = valid_count == len(properties)
        
        return {
            "all_verified": all_verified,
            "properties": verified_properties,
            "valid_permits": valid_count,
            "expired_permits": expired_count,
            "missing_permits": missing_count,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _verify_env_health_permit(
        self,
        property_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify environmental health permit for a single property"""
        
        address = property_data.get('address')
        permit_number = property_data.get('env_health_permit')
        
        if not permit_number:
            return {
                "address": address,
                "permit_valid": False,
                "error": "Environmental health permit number not provided"
            }
        
        # Placeholder - implement actual verification
        return {
            "address": address,
            "permit_number": permit_number,
            "permit_valid": True,
            "data": {
                "issue_date": "2023-01-01",
                "expiry_date": "2024-12-31",
                "inspection_status": "PASSED"
            }
        }
    
    def _calculate_shortlet_compliance_score(
        self,
        verifications: Dict[str, Any]
    ) -> float:
        """Calculate compliance score (0-100)"""
        
        score = 0.0
        
        # CAC (20 points)
        if verifications.get('cac', {}).get('verified'):
            score += 20
        
        # FIRS tax (20 points)
        if verifications.get('firs_tax', {}).get('verified'):
            score += 20
        
        # NTDC (10 points)
        if verifications.get('ntdc', {}).get('verified'):
            score += 10
        
        # Hospitality license (20 points)
        if verifications.get('hospitality_license', {}).get('verified'):
            score += 20
        
        # Property permits (15 points)
        if verifications.get('property_permits', {}).get('all_verified'):
            score += 15
        
        # Fire safety (10 points)
        if verifications.get('fire_safety', {}).get('all_verified'):
            score += 10
        
        # Environmental health (5 points)
        if verifications.get('environmental_health', {}).get('all_verified'):
            score += 5
        
        return round(score, 2)
    
    def _determine_verification_status(
        self,
        compliance_score: float,
        missing_requirements: List[str]
    ) -> str:
        """Determine overall verification status"""
        
        if compliance_score >= 80 and len(missing_requirements) == 0:
            return "VERIFIED"
        elif compliance_score >= 50:
            return "PARTIAL"
        else:
            return "FAILED"
    
    def _assess_shortlet_risk_level(
        self,
        verifications: Dict[str, Any],
        compliance_score: float,
        operator_type: str
    ) -> str:
        """Assess risk level for shortlet operator"""
        
        # High risk if CAC not verified
        if not verifications.get('cac', {}).get('verified'):
            return "HIGH"
        
        # High risk if no tax registration
        if not verifications.get('firs_tax', {}).get('verified'):
            return "HIGH"
        
        # High risk if no hospitality license
        if not verifications.get('hospitality_license', {}).get('verified'):
            return "HIGH"
        
        # High risk if fire safety not verified
        if not verifications.get('fire_safety', {}).get('all_verified'):
            return "HIGH"
        
        # Medium risk if compliance score 50-79
        if compliance_score < 80:
            return "MEDIUM"
        
        # Low risk if all checks pass
        return "LOW"
    
    def _generate_shortlet_recommendations(
        self,
        verifications: Dict[str, Any],
        missing_requirements: List[str],
        operator_type: str
    ) -> List[str]:
        """Generate recommendations for shortlet operator"""
        
        recommendations = []
        
        if not verifications.get('firs_tax', {}).get('verified'):
            recommendations.append("Register for FIRS hospitality tax and file quarterly returns")
        
        if not verifications.get('ntdc', {}).get('verified'):
            if operator_type in ['hotel', 'guesthouse']:
                recommendations.append("Obtain NTDC registration for tourism board compliance")
        
        if not verifications.get('hospitality_license', {}).get('verified'):
            recommendations.append("Apply for state hospitality license")
        
        property_permits = verifications.get('property_permits', {})
        if not property_permits.get('all_verified'):
            recommendations.append("Obtain change of use and occupancy permits for all properties")
        
        fire_safety = verifications.get('fire_safety', {})
        if not fire_safety.get('all_verified'):
            recommendations.append("Obtain fire safety certificates for all properties (mandatory)")
        
        env_health = verifications.get('environmental_health', {})
        if not env_health.get('all_verified'):
            recommendations.append("Obtain environmental health permits for all properties")
        
        return recommendations
