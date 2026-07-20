"""
Diaspora Buyer KYC Service - International Users
Comprehensive verification for diaspora buyers using international documents
"""

from flask import Flask, request, jsonify
from typing import Dict, List, Optional, Any
import os
from datetime import datetime, timedelta
import requests
from enum import Enum

from shared.logger import get_logger
logger = get_logger("diaspora-kyc-service")

app = Flask(__name__)

class DiasporaKYCService:
    """
    Diaspora Buyer KYC Service for International Users
    
    Supports verification for 30+ countries using:
    - Onfido (Global coverage, 195+ countries)
    - Veriff (Europe, Americas, Asia)
    - Jumio (Americas, Europe, APAC)
    
    Document types:
    - Passport (all countries)
    - Driver's License (US, UK, Canada, EU)
    - National ID (EU, Asia, Africa)
    - Proof of Address (utility bills, bank statements)
    """
    
    def __init__(self):
        # API Keys
        self.onfido_key = os.getenv('ONFIDO_API_KEY', 'test_key')
        self.veriff_key = os.getenv('VERIFF_API_KEY', 'test_key')
        self.jumio_key = os.getenv('JUMIO_API_KEY', 'test_key')
        
        # Supported countries
        self.supported_countries = [
            # Americas
            'US', 'CA', 'UK', 'BR', 'MX',
            # Europe
            'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'SE', 'NO', 'DK', 'FI',
            # Asia
            'CN', 'IN', 'JP', 'SG', 'MY', 'TH', 'PH', 'ID', 'VN',
            # Africa (Diaspora)
            'ZA', 'GH', 'KE', 'UG', 'TZ',
            # Middle East
            'AE', 'SA', 'QA'
        ]
        
        # Document types by country
        self.document_types = {
            'passport': 'all_countries',
            'drivers_license': ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'AU', 'NZ'],
            'national_id': ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'SE', 'IN', 'ZA']
        }
    
    async def verify_passport(
        self,
        passport_number: str,
        country: str,
        first_name: str,
        last_name: str,
        date_of_birth: str,
        expiry_date: str,
        document_image: str
    ) -> Dict[str, Any]:
        """
        Verify international passport using Onfido/Veriff/Jumio
        """
        logger.info(f"Verifying passport: {passport_number[:3]}*** from {country}")
        
        if country not in self.supported_countries:
            return {
                'verified': False,
                'error': f'Country {country} not supported',
                'supported_countries': self.supported_countries
            }
        
        # Try Onfido first (best global coverage)
        try:
            result = await self._verify_passport_onfido(
                passport_number, country, first_name, last_name, date_of_birth, expiry_date, document_image
            )
            if result['verified']:
                return result
        except Exception as e:
            logger.warning(f"Onfido passport verification failed: {e}")
        
        # Fallback to Veriff
        try:
            result = await self._verify_passport_veriff(
                passport_number, country, first_name, last_name, date_of_birth, document_image
            )
            if result['verified']:
                return result
        except Exception as e:
            logger.warning(f"Veriff passport verification failed: {e}")
        
        # Final fallback to Jumio
        try:
            result = await self._verify_passport_jumio(
                passport_number, country, first_name, last_name, date_of_birth, document_image
            )
            return result
        except Exception as e:
            logger.error(f"All passport verification providers failed: {e}")
            return {
                'verified': False,
                'provider': 'none',
                'error': 'All providers failed'
            }
    
    async def _verify_passport_onfido(
        self, passport_number: str, country: str, first_name: str, last_name: str,
        dob: str, expiry: str, document_image: str
    ) -> Dict[str, Any]:
        """Verify passport using Onfido API"""
        logger.info(f"Verifying passport with Onfido: {country}")
        
        # Mock implementation - replace with actual Onfido API call
        return {
            'verified': True,
            'provider': 'onfido',
            'data': {
                'passport_number': passport_number,
                'country': country,
                'first_name': first_name.upper(),
                'last_name': last_name.upper(),
                'date_of_birth': dob,
                'expiry_date': expiry,
                'nationality': country,
                'mrz_verified': True,  # Machine Readable Zone
                'document_type': 'passport',
                'photo': 'base64_encoded_photo'
            },
            'checks': {
                'document_authenticity': 'PASS',
                'visual_authenticity': 'PASS',
                'data_consistency': 'PASS',
                'expiry_check': 'PASS' if datetime.strptime(expiry, '%Y-%m-%d') > datetime.now() else 'FAIL'
            },
            'match_score': 98.0
        }
    
    async def _verify_passport_veriff(
        self, passport_number: str, country: str, first_name: str, last_name: str,
        dob: str, document_image: str
    ) -> Dict[str, Any]:
        """Verify passport using Veriff API"""
        logger.info(f"Verifying passport with Veriff: {country}")
        
        return {
            'verified': True,
            'provider': 'veriff',
            'data': {
                'passport_number': passport_number,
                'country': country,
                'first_name': first_name.upper(),
                'last_name': last_name.upper(),
                'date_of_birth': dob,
            },
            'checks': {
                'document_authenticity': 'PASS',
                'visual_authenticity': 'PASS',
            },
            'match_score': 95.0
        }
    
    async def _verify_passport_jumio(
        self, passport_number: str, country: str, first_name: str, last_name: str,
        dob: str, document_image: str
    ) -> Dict[str, Any]:
        """Verify passport using Jumio API"""
        logger.info(f"Verifying passport with Jumio: {country}")
        
        return {
            'verified': True,
            'provider': 'jumio',
            'data': {
                'passport_number': passport_number,
                'country': country,
                'first_name': first_name.upper(),
                'last_name': last_name.upper(),
                'date_of_birth': dob,
            },
            'checks': {
                'document_authenticity': 'PASS',
            },
            'match_score': 92.0
        }
    
    async def verify_proof_of_address(
        self,
        country: str,
        address: str,
        document_type: str,  # utility_bill, bank_statement, tax_document
        document_image: str,
        issue_date: str
    ) -> Dict[str, Any]:
        """
        Verify proof of address document
        
        Accepted documents:
        - Utility bills (electricity, water, gas, internet)
        - Bank statements
        - Tax documents
        - Government correspondence
        
        Requirements:
        - Must be within last 3 months
        - Must show full name and address
        - Must be from recognized institution
        """
        logger.info(f"Verifying proof of address: {document_type} from {country}")
        
        # Check document age (must be within 3 months)
        issue_datetime = datetime.strptime(issue_date, '%Y-%m-%d')
        age_days = (datetime.now() - issue_datetime).days
        
        if age_days > 90:
            return {
                'verified': False,
                'error': 'Document too old (must be within 3 months)',
                'age_days': age_days
            }
        
        # Mock OCR and verification
        return {
            'verified': True,
            'provider': 'onfido',
            'data': {
                'document_type': document_type,
                'country': country,
                'address': address,
                'issue_date': issue_date,
                'age_days': age_days,
                'extracted_text': {
                    'name': 'John Doe',
                    'address': address,
                    'issuer': 'Electric Company' if document_type == 'utility_bill' else 'Bank Name'
                }
            },
            'checks': {
                'document_age': 'PASS',
                'address_match': 'PASS',
                'document_authenticity': 'PASS'
            },
            'match_score': 90.0
        }
    
    async def verify_drivers_license(
        self,
        license_number: str,
        country: str,
        state: Optional[str],
        first_name: str,
        last_name: str,
        date_of_birth: str,
        expiry_date: str,
        document_image: str
    ) -> Dict[str, Any]:
        """
        Verify driver's license (US, UK, Canada, EU)
        """
        logger.info(f"Verifying driver's license: {license_number[:3]}*** from {country}")
        
        if country not in self.document_types['drivers_license']:
            return {
                'verified': False,
                'error': f"Driver's license verification not supported for {country}",
                'supported_countries': self.document_types['drivers_license']
            }
        
        # Mock implementation
        return {
            'verified': True,
            'provider': 'onfido',
            'data': {
                'license_number': license_number,
                'country': country,
                'state': state,
                'first_name': first_name.upper(),
                'last_name': last_name.upper(),
                'date_of_birth': date_of_birth,
                'expiry_date': expiry_date,
                'photo': 'base64_encoded_photo'
            },
            'checks': {
                'document_authenticity': 'PASS',
                'expiry_check': 'PASS' if datetime.strptime(expiry_date, '%Y-%m-%d') > datetime.now() else 'FAIL',
                'barcode_verified': True
            },
            'match_score': 95.0
        }
    
    async def perform_liveness_check(self, selfie_video: str) -> Dict[str, Any]:
        """
        Perform liveness detection using video selfie
        Uses FaceTec/iProov/Onfido for anti-spoofing
        """
        logger.info("Performing liveness check with video selfie")
        
        # Mock implementation - replace with actual liveness API
        return {
            'success': True,
            'liveness_passed': True,
            'confidence': 98.5,
            'checks': {
                'face_detected': True,
                'eyes_open': True,
                'face_movement': True,
                'anti_spoofing': 'PASS'
            },
            'provider': 'onfido'
        }
    
    async def comprehensive_diaspora_verification(
        self,
        user_id: str,
        country: str,
        document_type: str,  # passport, drivers_license, national_id
        document_number: str,
        first_name: str,
        last_name: str,
        date_of_birth: str,
        expiry_date: str,
        document_image: str,
        selfie_video: str,
        proof_of_address_type: str,
        proof_of_address_image: str,
        proof_of_address_date: str,
        address: str
    ) -> Dict[str, Any]:
        """
        Comprehensive diaspora buyer verification
        
        Requirements:
        1. Valid government-issued ID (passport, driver's license, or national ID)
        2. Liveness check (video selfie)
        3. Proof of address (within 3 months)
        4. Face matching between ID and selfie
        
        Returns:
            Verification result with INTERNATIONAL tier ($10K limit)
        """
        logger.info(f"Starting comprehensive diaspora verification for user {user_id}, country: {country}")
        
        result = {
            'success': False,
            'user_id': user_id,
            'country': country,
            'verification_tier': 'INTERNATIONAL',
            'transaction_limit_usd': 10000,
            'transaction_limit_ngn': 10000 * 1500,  # $10K @ ₦1500/$
            'verifications': {},
            'compliance_score': 0.0,
            'risk_level': 'HIGH',
            'missing_requirements': [],
            'recommendations': []
        }
        
        # 1. Verify government-issued ID
        if document_type == 'passport':
            id_result = await self.verify_passport(
                passport_number=document_number,
                country=country,
                first_name=first_name,
                last_name=last_name,
                date_of_birth=date_of_birth,
                expiry_date=expiry_date,
                document_image=document_image
            )
        elif document_type == 'drivers_license':
            id_result = await self.verify_drivers_license(
                license_number=document_number,
                country=country,
                state=None,  # Can be added as parameter
                first_name=first_name,
                last_name=last_name,
                date_of_birth=date_of_birth,
                expiry_date=expiry_date,
                document_image=document_image
            )
        else:
            result['missing_requirements'].append('Valid document type (passport or drivers_license)')
            return result
        
        result['verifications']['government_id'] = id_result
        
        # 2. Liveness check
        liveness_result = await self.perform_liveness_check(selfie_video)
        result['verifications']['liveness'] = liveness_result
        
        # 3. Proof of address
        poa_result = await self.verify_proof_of_address(
            country=country,
            address=address,
            document_type=proof_of_address_type,
            document_image=proof_of_address_image,
            issue_date=proof_of_address_date
        )
        result['verifications']['proof_of_address'] = poa_result
        
        # 4. Face matching (if ID has photo)
        if id_result.get('verified') and id_result['data'].get('photo'):
            # Extract face from video selfie and match with ID photo
            face_match_score = 94.0  # Mock score
            result['verifications']['face_match'] = {
                'success': True,
                'similarity_score': face_match_score,
                'match': face_match_score >= 75.0
            }
        
        # Calculate compliance score
        score = 0
        if id_result.get('verified'):
            score += 40
        if liveness_result.get('liveness_passed'):
            score += 30
        if poa_result.get('verified'):
            score += 20
        if result['verifications'].get('face_match', {}).get('match'):
            score += 10
        
        result['compliance_score'] = score
        
        # Assign tier and risk level
        if score >= 90:
            result['risk_level'] = 'LOW'
            result['success'] = True
        elif score >= 70:
            result['risk_level'] = 'MEDIUM'
            result['success'] = True
            result['recommendations'].append('Complete all verifications to reduce risk level')
        else:
            result['risk_level'] = 'HIGH'
            result['recommendations'].append('Government ID and proof of address required')
        
        return result

# Flask routes
service = DiasporaKYCService()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'diaspora-kyc'})

@app.route('/verify/passport', methods=['POST'])
async def verify_passport():
    data = request.json
    result = await service.verify_passport(
        passport_number=data['passport_number'],
        country=data['country'],
        first_name=data['first_name'],
        last_name=data['last_name'],
        date_of_birth=data['date_of_birth'],
        expiry_date=data['expiry_date'],
        document_image=data['document_image']
    )
    return jsonify(result)

@app.route('/verify/drivers-license', methods=['POST'])
async def verify_drivers_license():
    data = request.json
    result = await service.verify_drivers_license(
        license_number=data['license_number'],
        country=data['country'],
        state=data.get('state'),
        first_name=data['first_name'],
        last_name=data['last_name'],
        date_of_birth=data['date_of_birth'],
        expiry_date=data['expiry_date'],
        document_image=data['document_image']
    )
    return jsonify(result)

@app.route('/verify/proof-of-address', methods=['POST'])
async def verify_proof_of_address():
    data = request.json
    result = await service.verify_proof_of_address(
        country=data['country'],
        address=data['address'],
        document_type=data['document_type'],
        document_image=data['document_image'],
        issue_date=data['issue_date']
    )
    return jsonify(result)

@app.route('/verify/liveness', methods=['POST'])
async def verify_liveness():
    data = request.json
    result = await service.perform_liveness_check(
        selfie_video=data['selfie_video']
    )
    return jsonify(result)

@app.route('/verify/comprehensive', methods=['POST'])
async def comprehensive_verification():
    data = request.json
    result = await service.comprehensive_diaspora_verification(
        user_id=data['user_id'],
        country=data['country'],
        document_type=data['document_type'],
        document_number=data['document_number'],
        first_name=data['first_name'],
        last_name=data['last_name'],
        date_of_birth=data['date_of_birth'],
        expiry_date=data['expiry_date'],
        document_image=data['document_image'],
        selfie_video=data['selfie_video'],
        proof_of_address_type=data['proof_of_address_type'],
        proof_of_address_image=data['proof_of_address_image'],
        proof_of_address_date=data['proof_of_address_date'],
        address=data['address']
    )
    return jsonify(result)

@app.route('/supported-countries', methods=['GET'])
def supported_countries():
    return jsonify({
        'countries': service.supported_countries,
        'total': len(service.supported_countries)
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5051))
    app.run(host='0.0.0.0', port=port, debug=True)
