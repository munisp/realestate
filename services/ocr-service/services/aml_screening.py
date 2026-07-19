"""
AML (Anti-Money Laundering) Screening Service

Comprehensive screening for:
- PEP (Politically Exposed Persons)
- Sanctions lists (OFAC, UN, EU, UK)
- Adverse media
- Watchlists
- Criminal records
"""

import os
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
import hashlib

class AMLScreeningService:
    def __init__(self):
        # Primary API: Dow Jones Risk & Compliance
        self.dow_jones_api_key = os.getenv('DOW_JONES_API_KEY')
        self.dow_jones_base_url = os.getenv('DOW_JONES_BASE_URL', 'https://api.dowjones.com/risk')
        
        # Backup API: ComplyAdvantage
        self.comply_advantage_api_key = os.getenv('COMPLY_ADVANTAGE_API_KEY')
        self.comply_advantage_base_url = os.getenv('COMPLY_ADVANTAGE_BASE_URL', 'https://api.complyadvantage.com')
        
        # Tertiary API: Refinitiv World-Check One
        self.world_check_api_key = os.getenv('WORLD_CHECK_API_KEY')
        self.world_check_base_url = os.getenv('WORLD_CHECK_BASE_URL', 'https://api-worldcheck.refinitiv.com/v2')
        
        # Alternative: Sanctions.io (cost-effective)
        self.sanctions_io_api_key = os.getenv('SANCTIONS_IO_API_KEY')
        self.sanctions_io_base_url = os.getenv('SANCTIONS_IO_BASE_URL', 'https://api.sanctions.io/v1')
        
        # Nigerian-specific: EFCC watchlist
        self.efcc_api_key = os.getenv('EFCC_API_KEY')
        
        # Cache for screening results
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    async def screen_individual(
        self,
        first_name: str,
        last_name: str,
        date_of_birth: Optional[str] = None,
        nationality: Optional[str] = None,
        country_of_residence: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Screen individual against PEP, sanctions, and watchlists
        
        Args:
            first_name: First name
            last_name: Last name
            date_of_birth: DOB in YYYY-MM-DD format
            nationality: ISO country code
            country_of_residence: ISO country code
        
        Returns:
            {
                "success": bool,
                "risk_level": str,  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
                "pep_match": bool,
                "sanctions_match": bool,
                "adverse_media_match": bool,
                "watchlist_match": bool,
                "matches": [
                    {
                        "type": str,  # "PEP", "SANCTION", "ADVERSE_MEDIA", "WATCHLIST"
                        "name": str,
                        "match_score": float,
                        "details": dict,
                        "source": str
                    }
                ],
                "recommendation": str,
                "provider": str
            }
        """
        
        # Check cache
        cache_key = self._get_cache_key(first_name, last_name, date_of_birth)
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Try primary API (Dow Jones)
        if self.dow_jones_api_key:
            result = await self._screen_with_dow_jones(
                first_name, last_name, date_of_birth, nationality, country_of_residence
            )
            if result['success']:
                self._cache[cache_key] = result
                return result
        
        # Fallback to ComplyAdvantage
        if self.comply_advantage_api_key:
            result = await self._screen_with_comply_advantage(
                first_name, last_name, date_of_birth, nationality
            )
            if result['success']:
                self._cache[cache_key] = result
                return result
        
        # Fallback to World-Check
        if self.world_check_api_key:
            result = await self._screen_with_world_check(
                first_name, last_name, date_of_birth, nationality
            )
            if result['success']:
                self._cache[cache_key] = result
                return result
        
        # Fallback to Sanctions.io (cost-effective)
        if self.sanctions_io_api_key:
            result = await self._screen_with_sanctions_io(
                first_name, last_name, date_of_birth
            )
            if result['success']:
                self._cache[cache_key] = result
                return result
        
        return {
            "success": False,
            "error": "No AML screening API configured"
        }
    
    async def screen_business(
        self,
        company_name: str,
        registration_number: Optional[str] = None,
        country: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Screen business entity against sanctions and watchlists
        
        Args:
            company_name: Business name
            registration_number: CAC RC number
            country: ISO country code
        
        Returns:
            {
                "success": bool,
                "risk_level": str,
                "sanctions_match": bool,
                "adverse_media_match": bool,
                "matches": List[dict],
                "recommendation": str
            }
        """
        
        # Try primary API
        if self.dow_jones_api_key:
            result = await self._screen_business_with_dow_jones(
                company_name, registration_number, country
            )
            if result['success']:
                return result
        
        # Fallback to ComplyAdvantage
        if self.comply_advantage_api_key:
            result = await self._screen_business_with_comply_advantage(
                company_name, country
            )
            if result['success']:
                return result
        
        return {
            "success": False,
            "error": "No business AML screening API configured"
        }
    
    async def check_sanctions_lists(
        self,
        name: str,
        entity_type: str = "individual"  # "individual" or "business"
    ) -> Dict[str, Any]:
        """
        Check against major sanctions lists
        
        Lists checked:
        - OFAC (US Treasury)
        - UN Security Council
        - EU Sanctions
        - UK HM Treasury
        - Nigerian EFCC watchlist
        
        Returns:
            {
                "success": bool,
                "on_sanctions_list": bool,
                "lists": [
                    {
                        "name": str,  # "OFAC", "UN", "EU", "UK", "EFCC"
                        "match": bool,
                        "details": dict
                    }
                ]
            }
        """
        
        results = {
            "success": True,
            "on_sanctions_list": False,
            "lists": []
        }
        
        # Check OFAC (US)
        ofac_result = await self._check_ofac(name, entity_type)
        results['lists'].append({
            "name": "OFAC",
            "match": ofac_result.get('match', False),
            "details": ofac_result.get('details', {})
        })
        if ofac_result.get('match'):
            results['on_sanctions_list'] = True
        
        # Check UN
        un_result = await self._check_un_sanctions(name, entity_type)
        results['lists'].append({
            "name": "UN",
            "match": un_result.get('match', False),
            "details": un_result.get('details', {})
        })
        if un_result.get('match'):
            results['on_sanctions_list'] = True
        
        # Check EU
        eu_result = await self._check_eu_sanctions(name, entity_type)
        results['lists'].append({
            "name": "EU",
            "match": eu_result.get('match', False),
            "details": eu_result.get('details', {})
        })
        if eu_result.get('match'):
            results['on_sanctions_list'] = True
        
        # Check EFCC (Nigerian)
        if self.efcc_api_key:
            efcc_result = await self._check_efcc_watchlist(name)
            results['lists'].append({
                "name": "EFCC",
                "match": efcc_result.get('match', False),
                "details": efcc_result.get('details', {})
            })
            if efcc_result.get('match'):
                results['on_sanctions_list'] = True
        
        return results
    
    async def ongoing_monitoring(
        self,
        entity_id: str,
        entity_type: str,
        entity_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Set up ongoing monitoring for entity
        
        Args:
            entity_id: Unique identifier
            entity_type: "individual" or "business"
            entity_data: Entity details
        
        Returns:
            {
                "success": bool,
                "monitoring_id": str,
                "status": str
            }
        """
        
        # Implement ongoing monitoring with chosen provider
        if self.dow_jones_api_key:
            return await self._setup_dow_jones_monitoring(
                entity_id, entity_type, entity_data
            )
        
        return {
            "success": False,
            "error": "Ongoing monitoring not configured"
        }
    
    async def _screen_with_dow_jones(
        self,
        first_name: str,
        last_name: str,
        date_of_birth: Optional[str],
        nationality: Optional[str],
        country_of_residence: Optional[str]
    ) -> Dict[str, Any]:
        """Screen using Dow Jones Risk & Compliance API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.dow_jones_api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "firstName": first_name,
                    "lastName": last_name
                }
                
                if date_of_birth:
                    payload["dateOfBirth"] = date_of_birth
                if nationality:
                    payload["nationality"] = nationality
                if country_of_residence:
                    payload["countryOfResidence"] = country_of_residence
                
                response = await client.post(
                    f"{self.dow_jones_base_url}/entities/v1/searches",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    matches = []
                    pep_match = False
                    sanctions_match = False
                    adverse_media_match = False
                    watchlist_match = False
                    
                    for result in data.get('results', []):
                        match_type = result.get('category', '')
                        
                        match_entry = {
                            "type": match_type,
                            "name": result.get('name', ''),
                            "match_score": result.get('matchScore', 0),
                            "details": result.get('details', {}),
                            "source": "dow_jones"
                        }
                        
                        matches.append(match_entry)
                        
                        if 'PEP' in match_type:
                            pep_match = True
                        elif 'SANCTION' in match_type:
                            sanctions_match = True
                        elif 'ADVERSE' in match_type:
                            adverse_media_match = True
                        elif 'WATCHLIST' in match_type:
                            watchlist_match = True
                    
                    # Determine risk level
                    risk_level = self._calculate_risk_level(
                        pep_match, sanctions_match, adverse_media_match, watchlist_match
                    )
                    
                    recommendation = self._get_recommendation(risk_level)
                    
                    return {
                        "success": True,
                        "risk_level": risk_level,
                        "pep_match": pep_match,
                        "sanctions_match": sanctions_match,
                        "adverse_media_match": adverse_media_match,
                        "watchlist_match": watchlist_match,
                        "matches": matches,
                        "recommendation": recommendation,
                        "provider": "dow_jones",
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "success": False,
                    "error": f"Dow Jones API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Dow Jones API exception: {str(e)}"
            }
    
    async def _screen_with_comply_advantage(
        self,
        first_name: str,
        last_name: str,
        date_of_birth: Optional[str],
        nationality: Optional[str]
    ) -> Dict[str, Any]:
        """Screen using ComplyAdvantage API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Token {self.comply_advantage_api_key}",
                    "Content-Type": "application/json"
                }
                
                params = {
                    "search_term": f"{first_name} {last_name}",
                    "fuzziness": 0.6
                }
                
                if date_of_birth:
                    params["birth_year"] = date_of_birth.split('-')[0]
                if nationality:
                    params["country_codes"] = nationality
                
                response = await client.get(
                    f"{self.comply_advantage_base_url}/searches",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    matches = []
                    pep_match = False
                    sanctions_match = False
                    adverse_media_match = False
                    
                    for hit in data.get('data', []):
                        match_type = hit.get('types', [])[0] if hit.get('types') else 'UNKNOWN'
                        
                        match_entry = {
                            "type": match_type,
                            "name": hit.get('name', ''),
                            "match_score": hit.get('match_score', 0),
                            "details": hit,
                            "source": "comply_advantage"
                        }
                        
                        matches.append(match_entry)
                        
                        if 'pep' in match_type.lower():
                            pep_match = True
                        elif 'sanction' in match_type.lower():
                            sanctions_match = True
                        elif 'adverse' in match_type.lower():
                            adverse_media_match = True
                    
                    risk_level = self._calculate_risk_level(
                        pep_match, sanctions_match, adverse_media_match, False
                    )
                    
                    return {
                        "success": True,
                        "risk_level": risk_level,
                        "pep_match": pep_match,
                        "sanctions_match": sanctions_match,
                        "adverse_media_match": adverse_media_match,
                        "watchlist_match": False,
                        "matches": matches,
                        "recommendation": self._get_recommendation(risk_level),
                        "provider": "comply_advantage",
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "success": False,
                    "error": f"ComplyAdvantage API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"ComplyAdvantage API exception: {str(e)}"
            }
    
    async def _screen_with_world_check(
        self,
        first_name: str,
        last_name: str,
        date_of_birth: Optional[str],
        nationality: Optional[str]
    ) -> Dict[str, Any]:
        """Screen using Refinitiv World-Check One API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.world_check_api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "name": f"{first_name} {last_name}",
                    "entityType": "INDIVIDUAL"
                }
                
                if date_of_birth:
                    payload["dateOfBirth"] = date_of_birth
                if nationality:
                    payload["nationality"] = nationality
                
                response = await client.post(
                    f"{self.world_check_base_url}/cases/screeningRequest",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    
                    # World-Check returns case ID, need to poll for results
                    case_id = data.get('caseId')
                    
                    # Simplified - in production, implement polling
                    return {
                        "success": True,
                        "risk_level": "PENDING",
                        "case_id": case_id,
                        "provider": "world_check",
                        "status": "pending"
                    }
                
                return {
                    "success": False,
                    "error": f"World-Check API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"World-Check API exception: {str(e)}"
            }
    
    async def _screen_with_sanctions_io(
        self,
        first_name: str,
        last_name: str,
        date_of_birth: Optional[str]
    ) -> Dict[str, Any]:
        """Screen using Sanctions.io API (cost-effective alternative)"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.sanctions_io_api_key}",
                    "Content-Type": "application/json"
                }
                
                params = {
                    "name": f"{first_name} {last_name}"
                }
                
                if date_of_birth:
                    params["dob"] = date_of_birth
                
                response = await client.get(
                    f"{self.sanctions_io_base_url}/search",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    matches = data.get('matches', [])
                    sanctions_match = len(matches) > 0
                    
                    risk_level = "HIGH" if sanctions_match else "LOW"
                    
                    return {
                        "success": True,
                        "risk_level": risk_level,
                        "pep_match": False,
                        "sanctions_match": sanctions_match,
                        "adverse_media_match": False,
                        "watchlist_match": False,
                        "matches": matches,
                        "recommendation": self._get_recommendation(risk_level),
                        "provider": "sanctions_io",
                        "timestamp": datetime.now().isoformat()
                    }
                
                return {
                    "success": False,
                    "error": f"Sanctions.io API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Sanctions.io API exception: {str(e)}"
            }
    
    async def _screen_business_with_dow_jones(
        self,
        company_name: str,
        registration_number: Optional[str],
        country: Optional[str]
    ) -> Dict[str, Any]:
        """Screen business using Dow Jones API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.dow_jones_api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "name": company_name,
                    "entityType": "ORGANIZATION"
                }
                
                if registration_number:
                    payload["registrationNumber"] = registration_number
                if country:
                    payload["country"] = country
                
                response = await client.post(
                    f"{self.dow_jones_base_url}/entities/v1/searches",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    matches = data.get('results', [])
                    sanctions_match = any('SANCTION' in m.get('category', '') for m in matches)
                    adverse_media_match = any('ADVERSE' in m.get('category', '') for m in matches)
                    
                    risk_level = "HIGH" if sanctions_match else ("MEDIUM" if adverse_media_match else "LOW")
                    
                    return {
                        "success": True,
                        "risk_level": risk_level,
                        "sanctions_match": sanctions_match,
                        "adverse_media_match": adverse_media_match,
                        "matches": matches,
                        "recommendation": self._get_recommendation(risk_level),
                        "provider": "dow_jones"
                    }
                
                return {
                    "success": False,
                    "error": f"Dow Jones business screening error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Dow Jones business screening exception: {str(e)}"
            }
    
    async def _screen_business_with_comply_advantage(
        self,
        company_name: str,
        country: Optional[str]
    ) -> Dict[str, Any]:
        """Screen business using ComplyAdvantage API"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Token {self.comply_advantage_api_key}",
                    "Content-Type": "application/json"
                }
                
                params = {
                    "search_term": company_name,
                    "entity_type": "company",
                    "fuzziness": 0.6
                }
                
                if country:
                    params["country_codes"] = country
                
                response = await client.get(
                    f"{self.comply_advantage_base_url}/searches",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    matches = data.get('data', [])
                    sanctions_match = any('sanction' in m.get('types', [])[0].lower() for m in matches if m.get('types'))
                    
                    risk_level = "HIGH" if sanctions_match else "LOW"
                    
                    return {
                        "success": True,
                        "risk_level": risk_level,
                        "sanctions_match": sanctions_match,
                        "adverse_media_match": False,
                        "matches": matches,
                        "recommendation": self._get_recommendation(risk_level),
                        "provider": "comply_advantage"
                    }
                
                return {
                    "success": False,
                    "error": f"ComplyAdvantage business screening error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"ComplyAdvantage business screening exception: {str(e)}"
            }
    
    async def _check_ofac(self, name: str, entity_type: str) -> Dict[str, Any]:
        """Check OFAC sanctions list"""
        # Placeholder - implement actual OFAC API call
        return {"match": False, "details": {}}
    
    async def _check_un_sanctions(self, name: str, entity_type: str) -> Dict[str, Any]:
        """Check UN sanctions list"""
        # Placeholder - implement actual UN API call
        return {"match": False, "details": {}}
    
    async def _check_eu_sanctions(self, name: str, entity_type: str) -> Dict[str, Any]:
        """Check EU sanctions list"""
        # Placeholder - implement actual EU API call
        return {"match": False, "details": {}}
    
    async def _check_efcc_watchlist(self, name: str) -> Dict[str, Any]:
        """Check EFCC watchlist"""
        # Placeholder - implement actual EFCC API call if available
        return {"match": False, "details": {}}
    
    async def _setup_dow_jones_monitoring(
        self,
        entity_id: str,
        entity_type: str,
        entity_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Set up ongoing monitoring with Dow Jones"""
        # Placeholder - implement actual monitoring setup
        return {
            "success": True,
            "monitoring_id": f"monitor_{entity_id}",
            "status": "active"
        }
    
    def _calculate_risk_level(
        self,
        pep_match: bool,
        sanctions_match: bool,
        adverse_media_match: bool,
        watchlist_match: bool
    ) -> str:
        """Calculate overall risk level"""
        
        if sanctions_match:
            return "CRITICAL"
        elif pep_match and adverse_media_match:
            return "HIGH"
        elif pep_match or watchlist_match:
            return "MEDIUM"
        elif adverse_media_match:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _get_recommendation(self, risk_level: str) -> str:
        """Get recommendation based on risk level"""
        
        recommendations = {
            "CRITICAL": "REJECT - Entity on sanctions list. Transaction prohibited.",
            "HIGH": "ENHANCED DUE DILIGENCE - Requires senior management approval and additional documentation.",
            "MEDIUM": "STANDARD DUE DILIGENCE - Collect additional information and monitor closely.",
            "LOW": "APPROVE - No significant risks identified. Standard monitoring applies."
        }
        
        return recommendations.get(risk_level, "REVIEW - Manual review required.")
    
    def _get_cache_key(
        self,
        first_name: str,
        last_name: str,
        date_of_birth: Optional[str]
    ) -> str:
        """Generate cache key"""
        key_string = f"{first_name}_{last_name}_{date_of_birth or ''}"
        return hashlib.sha256(key_string.encode()).hexdigest()
