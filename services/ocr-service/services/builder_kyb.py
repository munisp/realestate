"""
Builder KYB Verification Service

Comprehensive verification for construction companies and property developers:
- COREN (Council for the Regulation of Engineering in Nigeria)
- CORBON (Builders Registration Council of Nigeria)
- Building permits and development approvals
- Professional indemnity insurance
- Project portfolio verification
- NHBF registration
"""

import os
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from .kyb_verification import KYBVerificationService

class BuilderKYBService:
    def __init__(self):
        # Base KYB service
        self.base_kyb = KYBVerificationService()
        
        # COREN API
        self.coren_api_key = os.getenv('COREN_API_KEY')
        self.coren_base_url = os.getenv('COREN_BASE_URL', 'https://api.coren.gov.ng')
        
        # CORBON API
        self.corbon_api_key = os.getenv('CORBON_API_KEY')
        self.corbon_base_url = os.getenv('CORBON_BASE_URL', 'https://api.corbon.gov.ng')
        
        # State building control APIs (Lagos as example)
        self.lasg_building_control_key = os.getenv('LASG_BUILDING_CONTROL_KEY')
        self.lasg_base_url = os.getenv('LASG_BASE_URL', 'https://eservices.lagosstate.gov.ng/api')
        
        # NHBF API
        self.nhbf_api_key = os.getenv('NHBF_API_KEY')
        self.nhbf_base_url = os.getenv('NHBF_BASE_URL', 'https://api.nhbf.gov.ng')
        
        # Insurance verification
        self.naicom_api_key = os.getenv('NAICOM_API_KEY')  # National Insurance Commission
        
        # Cache
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    async def comprehensive_builder_verification(
        self,
        rc_number: str,
        company_name: str,
        business_type: str,  # "developer", "contractor", "architect", "engineer"
        registration_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Complete KYB verification for builders/developers
        
        Args:
            rc_number: CAC registration number
            company_name: Business name
            business_type: Type of construction business
            registration_data: Additional registration information
        
        Returns:
            {
                "success": bool,
                "verification_status": str,  # "VERIFIED", "PARTIAL", "FAILED"
                "risk_level": str,  # "LOW", "MEDIUM", "HIGH"
                "verifications": {
                    "cac": dict,
                    "coren": dict,
                    "corbon": dict,
                    "insurance": dict,
                    "nhbf": dict,
                    "building_permits": dict
                },
                "compliance_score": float,  # 0-100
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
        
        # 2. COREN verification (for engineering firms)
        if business_type in ['engineer', 'developer', 'contractor']:
            coren_result = await self.verify_coren(
                registration_data.get('coren_number'),
                registration_data.get('principal_engineer')
            )
            verifications['coren'] = coren_result
            
            if not coren_result.get('verified'):
                missing_requirements.append("Valid COREN registration required")
        
        # 3. CORBON verification (for builders/contractors)
        if business_type in ['contractor', 'developer']:
            corbon_result = await self.verify_corbon(
                registration_data.get('corbon_number'),
                company_name
            )
            verifications['corbon'] = corbon_result
            
            if not corbon_result.get('verified'):
                missing_requirements.append("Valid CORBON registration required")
        
        # 4. Professional indemnity insurance
        insurance_result = await self.verify_professional_insurance(
            rc_number,
            registration_data.get('insurance_policy_number')
        )
        verifications['insurance'] = insurance_result
        
        if not insurance_result.get('verified'):
            missing_requirements.append("Valid professional indemnity insurance required")
        
        # 5. NHBF registration
        nhbf_result = await self.verify_nhbf(rc_number)
        verifications['nhbf'] = nhbf_result
        
        if not nhbf_result.get('verified'):
            missing_requirements.append("NHBF registration recommended")
        
        # 6. Building permits (if projects specified)
        if registration_data.get('current_projects'):
            permits_result = await self.verify_building_permits(
                registration_data['current_projects']
            )
            verifications['building_permits'] = permits_result
        
        # Calculate compliance score
        compliance_score = self._calculate_builder_compliance_score(verifications)
        
        # Determine verification status
        verification_status = self._determine_verification_status(
            compliance_score, missing_requirements
        )
        
        # Assess risk level
        risk_level = self._assess_builder_risk_level(
            verifications, compliance_score, cac_result
        )
        
        # Generate recommendations
        recommendations = self._generate_builder_recommendations(
            verifications, missing_requirements, business_type
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
    
    async def verify_coren(
        self,
        coren_number: Optional[str],
        engineer_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify COREN (Council for the Regulation of Engineering in Nigeria) registration
        
        Returns:
            {
                "verified": bool,
                "coren_number": str,
                "data": {
                    "engineer_name": str,
                    "registration_date": str,
                    "category": str,  # "Corporate", "Professional", "Graduate"
                    "discipline": str,  # "Civil", "Structural", "Mechanical", etc.
                    "status": str,  # "ACTIVE", "SUSPENDED", "REVOKED"
                    "expiry_date": str,
                    "practicing_license": bool
                }
            }
        """
        
        if not coren_number:
            return {
                "verified": False,
                "error": "COREN number not provided"
            }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.coren_api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    f"{self.coren_base_url}/verify/{coren_number}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if registration is active
                    status = data.get('status', 'UNKNOWN')
                    verified = status == 'ACTIVE'
                    
                    # Check if name matches (if provided)
                    if engineer_name and verified:
                        name_match = self._fuzzy_match_name(
                            engineer_name,
                            data.get('engineer_name', '')
                        )
                        verified = verified and name_match > 0.8
                    
                    # Check expiry
                    expiry_date = data.get('expiry_date')
                    if expiry_date:
                        expiry = datetime.fromisoformat(expiry_date)
                        if expiry < datetime.now():
                            verified = False
                            status = "EXPIRED"
                    
                    return {
                        "verified": verified,
                        "coren_number": coren_number,
                        "data": {
                            "engineer_name": data.get('engineer_name'),
                            "registration_date": data.get('registration_date'),
                            "category": data.get('category'),
                            "discipline": data.get('discipline'),
                            "status": status,
                            "expiry_date": expiry_date,
                            "practicing_license": data.get('practicing_license', False)
                        },
                        "provider": "coren",
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "verified": False,
                    "error": f"COREN API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "verified": False,
                "error": f"COREN verification exception: {str(e)}"
            }
    
    async def verify_corbon(
        self,
        corbon_number: Optional[str],
        company_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify CORBON (Builders Registration Council of Nigeria) registration
        
        Returns:
            {
                "verified": bool,
                "corbon_number": str,
                "data": {
                    "company_name": str,
                    "registration_date": str,
                    "category": str,  # "A", "B", "C", "D" (based on capacity)
                    "status": str,
                    "expiry_date": str,
                    "specialization": List[str]
                }
            }
        """
        
        if not corbon_number:
            return {
                "verified": False,
                "error": "CORBON number not provided"
            }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.corbon_api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    f"{self.corbon_base_url}/verify/{corbon_number}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    status = data.get('status', 'UNKNOWN')
                    verified = status == 'ACTIVE'
                    
                    # Check company name match
                    if company_name and verified:
                        name_match = self._fuzzy_match_name(
                            company_name,
                            data.get('company_name', '')
                        )
                        verified = verified and name_match > 0.8
                    
                    # Check expiry
                    expiry_date = data.get('expiry_date')
                    if expiry_date:
                        expiry = datetime.fromisoformat(expiry_date)
                        if expiry < datetime.now():
                            verified = False
                            status = "EXPIRED"
                    
                    return {
                        "verified": verified,
                        "corbon_number": corbon_number,
                        "data": {
                            "company_name": data.get('company_name'),
                            "registration_date": data.get('registration_date'),
                            "category": data.get('category'),
                            "status": status,
                            "expiry_date": expiry_date,
                            "specialization": data.get('specialization', [])
                        },
                        "provider": "corbon",
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "verified": False,
                    "error": f"CORBON API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "verified": False,
                "error": f"CORBON verification exception: {str(e)}"
            }
    
    async def verify_professional_insurance(
        self,
        rc_number: str,
        policy_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify professional indemnity insurance
        
        Returns:
            {
                "verified": bool,
                "policy_number": str,
                "data": {
                    "insurer": str,
                    "policy_type": str,
                    "coverage_amount": float,
                    "start_date": str,
                    "expiry_date": str,
                    "status": str
                }
            }
        """
        
        if not policy_number:
            return {
                "verified": False,
                "error": "Insurance policy number not provided"
            }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.naicom_api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"https://api.naicom.gov.ng/verify-policy",
                    headers=headers,
                    json={
                        "policy_number": policy_number,
                        "policy_type": "professional_indemnity",
                        "insured_rc": rc_number
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if policy is active
                    expiry_date = data.get('expiry_date')
                    verified = False
                    
                    if expiry_date:
                        expiry = datetime.fromisoformat(expiry_date)
                        verified = expiry > datetime.now()
                    
                    # Check minimum coverage (₦10M recommended)
                    coverage = data.get('coverage_amount', 0)
                    if coverage < 10000000:
                        verified = False
                    
                    return {
                        "verified": verified,
                        "policy_number": policy_number,
                        "data": {
                            "insurer": data.get('insurer'),
                            "policy_type": data.get('policy_type'),
                            "coverage_amount": coverage,
                            "start_date": data.get('start_date'),
                            "expiry_date": expiry_date,
                            "status": "ACTIVE" if verified else "EXPIRED/INSUFFICIENT"
                        },
                        "provider": "naicom",
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "verified": False,
                    "error": f"Insurance verification error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "verified": False,
                "error": f"Insurance verification exception: {str(e)}"
            }
    
    async def verify_nhbf(self, rc_number: str) -> Dict[str, Any]:
        """
        Verify NHBF (National Housing and Building Fund) registration
        
        Returns:
            {
                "verified": bool,
                "data": {
                    "registration_number": str,
                    "registration_date": str,
                    "status": str,
                    "contribution_status": str
                }
            }
        """
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.nhbf_api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    f"{self.nhbf_base_url}/verify/{rc_number}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    verified = data.get('status') == 'ACTIVE'
                    
                    return {
                        "verified": verified,
                        "data": {
                            "registration_number": data.get('registration_number'),
                            "registration_date": data.get('registration_date'),
                            "status": data.get('status'),
                            "contribution_status": data.get('contribution_status')
                        },
                        "provider": "nhbf",
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "verified": False,
                    "error": f"NHBF API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "verified": False,
                "error": f"NHBF verification exception: {str(e)}"
            }
    
    async def verify_building_permits(
        self,
        projects: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Verify building permits for current projects
        
        Args:
            projects: List of projects with permit information
        
        Returns:
            {
                "verified": bool,
                "projects": List[dict],
                "valid_permits": int,
                "expired_permits": int,
                "missing_permits": int
            }
        """
        
        verified_projects = []
        valid_count = 0
        expired_count = 0
        missing_count = 0
        
        for project in projects:
            permit_result = await self._verify_single_permit(project)
            verified_projects.append(permit_result)
            
            if permit_result.get('permit_valid'):
                valid_count += 1
            elif permit_result.get('permit_expired'):
                expired_count += 1
            else:
                missing_count += 1
        
        verified = valid_count > 0 and expired_count == 0 and missing_count == 0
        
        return {
            "verified": verified,
            "projects": verified_projects,
            "valid_permits": valid_count,
            "expired_permits": expired_count,
            "missing_permits": missing_count,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _verify_single_permit(
        self,
        project: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify building permit for a single project"""
        
        permit_number = project.get('permit_number')
        state = project.get('state', 'Lagos')
        
        if not permit_number:
            return {
                "project_name": project.get('name'),
                "permit_valid": False,
                "permit_expired": False,
                "error": "No permit number provided"
            }
        
        # Lagos State example (implement for other states)
        if state == 'Lagos':
            return await self._verify_lagos_building_permit(permit_number, project)
        
        # Placeholder for other states
        return {
            "project_name": project.get('name'),
            "permit_valid": False,
            "error": f"Permit verification not available for {state}"
        }
    
    async def _verify_lagos_building_permit(
        self,
        permit_number: str,
        project: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify Lagos State building permit"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.lasg_building_control_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    f"{self.lasg_base_url}/building-control/verify/{permit_number}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    expiry_date = data.get('expiry_date')
                    permit_valid = False
                    permit_expired = False
                    
                    if expiry_date:
                        expiry = datetime.fromisoformat(expiry_date)
                        if expiry > datetime.now():
                            permit_valid = True
                        else:
                            permit_expired = True
                    
                    return {
                        "project_name": project.get('name'),
                        "permit_number": permit_number,
                        "permit_valid": permit_valid,
                        "permit_expired": permit_expired,
                        "data": {
                            "permit_type": data.get('permit_type'),
                            "issue_date": data.get('issue_date'),
                            "expiry_date": expiry_date,
                            "project_address": data.get('project_address'),
                            "approved_use": data.get('approved_use')
                        }
                    }
                
                return {
                    "project_name": project.get('name'),
                    "permit_valid": False,
                    "error": f"Permit verification error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "project_name": project.get('name'),
                "permit_valid": False,
                "error": f"Permit verification exception: {str(e)}"
            }
    
    def _calculate_builder_compliance_score(
        self,
        verifications: Dict[str, Any]
    ) -> float:
        """Calculate compliance score (0-100)"""
        
        score = 0.0
        
        # CAC (30 points)
        if verifications.get('cac', {}).get('verified'):
            score += 30
        
        # COREN (20 points)
        if verifications.get('coren', {}).get('verified'):
            score += 20
        
        # CORBON (20 points)
        if verifications.get('corbon', {}).get('verified'):
            score += 20
        
        # Insurance (15 points)
        if verifications.get('insurance', {}).get('verified'):
            score += 15
        
        # NHBF (10 points)
        if verifications.get('nhbf', {}).get('verified'):
            score += 10
        
        # Building permits (5 points)
        permits = verifications.get('building_permits', {})
        if permits.get('verified'):
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
    
    def _assess_builder_risk_level(
        self,
        verifications: Dict[str, Any],
        compliance_score: float,
        cac_result: Dict[str, Any]
    ) -> str:
        """Assess risk level for builder"""
        
        # High risk if CAC not verified
        if not cac_result.get('verified'):
            return "HIGH"
        
        # High risk if compliance score < 50
        if compliance_score < 50:
            return "HIGH"
        
        # High risk if no professional registration
        has_coren = verifications.get('coren', {}).get('verified')
        has_corbon = verifications.get('corbon', {}).get('verified')
        
        if not has_coren and not has_corbon:
            return "HIGH"
        
        # Medium risk if compliance score 50-79
        if compliance_score < 80:
            return "MEDIUM"
        
        # Low risk if all checks pass
        return "LOW"
    
    def _generate_builder_recommendations(
        self,
        verifications: Dict[str, Any],
        missing_requirements: List[str],
        business_type: str
    ) -> List[str]:
        """Generate recommendations for builder"""
        
        recommendations = []
        
        if not verifications.get('coren', {}).get('verified'):
            if business_type in ['engineer', 'developer']:
                recommendations.append("Obtain COREN registration for principal engineer")
        
        if not verifications.get('corbon', {}).get('verified'):
            if business_type in ['contractor', 'developer']:
                recommendations.append("Register with CORBON (Builders Registration Council)")
        
        if not verifications.get('insurance', {}).get('verified'):
            recommendations.append("Obtain professional indemnity insurance (minimum ₦10M coverage)")
        
        if not verifications.get('nhbf', {}).get('verified'):
            recommendations.append("Register with NHBF for access to housing development funds")
        
        permits = verifications.get('building_permits', {})
        if permits.get('expired_permits', 0) > 0:
            recommendations.append("Renew expired building permits")
        
        if permits.get('missing_permits', 0) > 0:
            recommendations.append("Obtain building permits for all active projects")
        
        return recommendations
    
    def _fuzzy_match_name(self, name1: str, name2: str) -> float:
        """Calculate fuzzy name match score (0-1)"""
        # Simple implementation - use difflib or fuzzywuzzy in production
        name1_clean = name1.lower().strip()
        name2_clean = name2.lower().strip()
        
        if name1_clean == name2_clean:
            return 1.0
        
        # Check if one contains the other
        if name1_clean in name2_clean or name2_clean in name1_clean:
            return 0.9
        
        # Simple word overlap
        words1 = set(name1_clean.split())
        words2 = set(name2_clean.split())
        
        if len(words1) == 0 or len(words2) == 0:
            return 0.0
        
        overlap = len(words1.intersection(words2))
        total = len(words1.union(words2))
        
        return overlap / total if total > 0 else 0.0
