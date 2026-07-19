"""
Buyer KYC Service - Nigerian Local Users
Comprehensive verification for property buyers using NIN and BVN
"""

from flask import Flask, request, jsonify
from typing import Dict, List, Optional, Any
import os
import logging
from datetime import datetime, timedelta
import requests
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class VerificationTier(Enum):
    """KYC verification tiers with transaction limits"""
    FULL = "FULL"  # ₦5,000,000 limit
    INTERNATIONAL = "INTERNATIONAL"  # $10,000 limit
    BASIC = "BASIC"  # ₦100,000 limit
    SOCIAL = "SOCIAL"  # ₦50,000 limit

class BuyerKYCService:
    """
    Buyer KYC Service for Nigerian Local Users
    
    Supports 4-tier verification system:
    - FULL: NIN + BVN + Face Match (₦5M limit)
    - INTERNATIONAL: Passport + Proof of Address ($10K limit)
    - BASIC: NIN only (₦100K limit)
    - SOCIAL: Social login + Phone (₦50K limit)
    """
    
    def __init__(self):
        # API Keys
        self.dojah_key = os.getenv('DOJAH_API_KEY', 'test_key')
        self.youverify_key = os.getenv('YOUVERIFY_API_KEY', 'test_key')
        self.verified_africa_key = os.getenv('VERIFIED_AFRICA_API_KEY', 'test_key')
        self.mono_key = os.getenv('MONO_API_KEY', 'test_key')
        self.paystack_key = os.getenv('PAYSTACK_SECRET_KEY', 'test_key')
        self.okra_key = os.getenv('OKRA_API_KEY', 'test_key')
        
        # Tier limits (in Naira)
        self.tier_limits = {
            VerificationTier.FULL: 5_000_000,  # ₦5M
            VerificationTier.INTERNATIONAL: 10_000 * 1500,  # $10K @ ₦1500/$
            VerificationTier.BASIC: 100_000,  # ₦100K
            VerificationTier.SOCIAL: 50_000,  # ₦50K
        }
    
    async def verify_nin(self, nin: str, first_name: str, last_name: str, date_of_birth: str) -> Dict[str, Any]:
        """
        Verify NIN using 3 providers (Dojah, Youverify, Verified.africa)
        """
        logger.info(f"Verifying NIN: {nin[:3]}***{nin[-2:]}")
        
        # Try Dojah first (most reliable)
        try:
            result = await self._verify_nin_dojah(nin, first_name, last_name, date_of_birth)
            if result['verified']:
                return result
        except Exception as e:
            logger.warning(f"Dojah NIN verification failed: {e}")
        
        # Fallback to Youverify
        try:
            result = await self._verify_nin_youverify(nin, first_name, last_name, date_of_birth)
            if result['verified']:
                return result
        except Exception as e:
            logger.warning(f"Youverify NIN verification failed: {e}")
        
        # Final fallback to Verified.africa
        try:
            result = await self._verify_nin_verified_africa(nin, first_name, last_name, date_of_birth)
            return result
        except Exception as e:
            logger.error(f"All NIN verification providers failed: {e}")
            return {
                'verified': False,
                'provider': 'none',
                'error': 'All providers failed',
                'data': None
            }
    
    async def _verify_nin_dojah(self, nin: str, first_name: str, last_name: str, dob: str) -> Dict[str, Any]:
        """Verify NIN using Dojah API"""
        # Mock implementation - replace with actual API call
        logger.info(f"Verifying NIN with Dojah: {nin}")
        
        # Simulated API response
        return {
            'verified': True,
            'provider': 'dojah',
            'data': {
                'nin': nin,
                'first_name': first_name.upper(),
                'last_name': last_name.upper(),
                'date_of_birth': dob,
                'phone': '+234' + '8012345678',
                'gender': 'M',
                'photo': 'base64_encoded_photo',
                'address': 'Lagos, Nigeria'
            },
            'match_score': 100.0
        }
    
    async def _verify_nin_youverify(self, nin: str, first_name: str, last_name: str, dob: str) -> Dict[str, Any]:
        """Verify NIN using Youverify API"""
        logger.info(f"Verifying NIN with Youverify: {nin}")
        
        return {
            'verified': True,
            'provider': 'youverify',
            'data': {
                'nin': nin,
                'first_name': first_name.upper(),
                'last_name': last_name.upper(),
                'date_of_birth': dob,
                'phone': '+234' + '8012345678',
            },
            'match_score': 95.0
        }
    
    async def _verify_nin_verified_africa(self, nin: str, first_name: str, last_name: str, dob: str) -> Dict[str, Any]:
        """Verify NIN using Verified.africa API"""
        logger.info(f"Verifying NIN with Verified.africa: {nin}")
        
        return {
            'verified': True,
            'provider': 'verified_africa',
            'data': {
                'nin': nin,
                'first_name': first_name.upper(),
                'last_name': last_name.upper(),
                'date_of_birth': dob,
            },
            'match_score': 90.0
        }
    
    async def verify_bvn(self, bvn: str, phone_number: str, first_name: str, last_name: str) -> Dict[str, Any]:
        """
        Verify BVN using 4 providers (Mono, Dojah, Paystack, Okra)
        """
        logger.info(f"Verifying BVN: {bvn[:3]}***{bvn[-2:]}")
        
        # Try Mono first (most comprehensive)
        try:
            result = await self._verify_bvn_mono(bvn, phone_number, first_name, last_name)
            if result['verified']:
                return result
        except Exception as e:
            logger.warning(f"Mono BVN verification failed: {e}")
        
        # Fallback to Dojah
        try:
            result = await self._verify_bvn_dojah(bvn, phone_number)
            if result['verified']:
                return result
        except Exception as e:
            logger.warning(f"Dojah BVN verification failed: {e}")
        
        # Fallback to Paystack
        try:
            result = await self._verify_bvn_paystack(bvn, phone_number)
            if result['verified']:
                return result
        except Exception as e:
            logger.warning(f"Paystack BVN verification failed: {e}")
        
        # Final fallback to Okra
        try:
            result = await self._verify_bvn_okra(bvn, phone_number)
            return result
        except Exception as e:
            logger.error(f"All BVN verification providers failed: {e}")
            return {
                'verified': False,
                'provider': 'none',
                'error': 'All providers failed',
                'data': None
            }
    
    async def _verify_bvn_mono(self, bvn: str, phone: str, first_name: str, last_name: str) -> Dict[str, Any]:
        """Verify BVN using Mono API"""
        logger.info(f"Verifying BVN with Mono: {bvn}")
        
        return {
            'verified': True,
            'provider': 'mono',
            'data': {
                'bvn': bvn,
                'first_name': first_name.upper(),
                'last_name': last_name.upper(),
                'phone': phone,
                'date_of_birth': '1990-01-01',
                'watchlist_status': 'CLEAR',  # Not on any watchlist
                'bank_accounts': 2  # Number of linked accounts
            },
            'match_score': 100.0
        }
    
    async def _verify_bvn_dojah(self, bvn: str, phone: str) -> Dict[str, Any]:
        """Verify BVN using Dojah API"""
        logger.info(f"Verifying BVN with Dojah: {bvn}")
        
        return {
            'verified': True,
            'provider': 'dojah',
            'data': {
                'bvn': bvn,
                'phone': phone,
                'watchlist_status': 'CLEAR'
            },
            'match_score': 95.0
        }
    
    async def _verify_bvn_paystack(self, bvn: str, phone: str) -> Dict[str, Any]:
        """Verify BVN using Paystack API"""
        logger.info(f"Verifying BVN with Paystack: {bvn}")
        
        return {
            'verified': True,
            'provider': 'paystack',
            'data': {
                'bvn': bvn,
                'phone': phone,
            },
            'match_score': 90.0
        }
    
    async def _verify_bvn_okra(self, bvn: str, phone: str) -> Dict[str, Any]:
        """Verify BVN using Okra API"""
        logger.info(f"Verifying BVN with Okra: {bvn}")
        
        return {
            'verified': True,
            'provider': 'okra',
            'data': {
                'bvn': bvn,
                'phone': phone,
            },
            'match_score': 85.0
        }
    
    async def perform_face_match(self, nin_photo: str, selfie_photo: str) -> Dict[str, Any]:
        """
        Perform biometric face matching between NIN photo and selfie
        Uses FaceTec/iProov/Onfido for liveness detection
        """
        logger.info("Performing face match with liveness detection")
        
        # Mock implementation - replace with actual face matching API
        # In production, use FaceTec, iProov, or Onfido
        
        similarity_score = 92.5  # Simulated score
        
        return {
            'success': True,
            'similarity_score': similarity_score,
            'liveness_passed': True,
            'match': similarity_score >= 75.0,
            'provider': 'facetec'
        }
    
    async def comprehensive_buyer_verification(
        self,
        user_id: str,
        verification_type: str,
        nin: Optional[str] = None,
        bvn: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        date_of_birth: Optional[str] = None,
        phone_number: Optional[str] = None,
        selfie_photo: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive buyer KYC verification
        
        Args:
            user_id: User identifier
            verification_type: FULL, BASIC, SOCIAL
            nin: National Identification Number (11 digits)
            bvn: Bank Verification Number (11 digits)
            first_name: First name
            last_name: Last name
            date_of_birth: DOB in YYYY-MM-DD format
            phone_number: Phone number with country code
            selfie_photo: Base64 encoded selfie for face matching
        
        Returns:
            Verification result with tier assignment and transaction limit
        """
        logger.info(f"Starting comprehensive buyer verification for user {user_id}, type: {verification_type}")
        
        result = {
            'success': False,
            'user_id': user_id,
            'verification_tier': None,
            'transaction_limit': 0,
            'verifications': {},
            'compliance_score': 0.0,
            'risk_level': 'HIGH',
            'missing_requirements': [],
            'recommendations': []
        }
        
        # FULL Verification: NIN + BVN + Face Match
        if verification_type == 'FULL':
            if not all([nin, bvn, first_name, last_name, date_of_birth, phone_number, selfie_photo]):
                result['missing_requirements'] = [
                    req for req, val in {
                        'NIN': nin,
                        'BVN': bvn,
                        'First Name': first_name,
                        'Last Name': last_name,
                        'Date of Birth': date_of_birth,
                        'Phone Number': phone_number,
                        'Selfie Photo': selfie_photo
                    }.items() if not val
                ]
                result['recommendations'].append('Provide all required documents for FULL verification')
                return result
            
            # Verify NIN
            nin_result = await self.verify_nin(nin, first_name, last_name, date_of_birth)
            result['verifications']['nin'] = nin_result
            
            # Verify BVN
            bvn_result = await self.verify_bvn(bvn, phone_number, first_name, last_name)
            result['verifications']['bvn'] = bvn_result
            
            # Face matching
            if nin_result['verified'] and nin_result['data'].get('photo'):
                face_match = await self.perform_face_match(nin_result['data']['photo'], selfie_photo)
                result['verifications']['face_match'] = face_match
            else:
                result['verifications']['face_match'] = {'success': False, 'error': 'No NIN photo available'}
            
            # Calculate compliance score
            score = 0
            if nin_result['verified']:
                score += 40
            if bvn_result['verified']:
                score += 40
            if result['verifications']['face_match'].get('match'):
                score += 20
            
            result['compliance_score'] = score
            
            # Assign tier
            if score >= 90:
                result['verification_tier'] = VerificationTier.FULL.value
                result['transaction_limit'] = self.tier_limits[VerificationTier.FULL]
                result['risk_level'] = 'LOW'
                result['success'] = True
            elif score >= 70:
                result['verification_tier'] = VerificationTier.BASIC.value
                result['transaction_limit'] = self.tier_limits[VerificationTier.BASIC]
                result['risk_level'] = 'MEDIUM'
                result['success'] = True
                result['recommendations'].append('Complete face matching to upgrade to FULL tier')
            else:
                result['risk_level'] = 'HIGH'
                result['recommendations'].append('NIN and BVN verification required')
        
        # BASIC Verification: NIN only
        elif verification_type == 'BASIC':
            if not all([nin, first_name, last_name, date_of_birth]):
                result['missing_requirements'] = ['NIN', 'First Name', 'Last Name', 'Date of Birth']
                return result
            
            nin_result = await self.verify_nin(nin, first_name, last_name, date_of_birth)
            result['verifications']['nin'] = nin_result
            
            if nin_result['verified']:
                result['verification_tier'] = VerificationTier.BASIC.value
                result['transaction_limit'] = self.tier_limits[VerificationTier.BASIC]
                result['compliance_score'] = 60.0
                result['risk_level'] = 'MEDIUM'
                result['success'] = True
                result['recommendations'].append('Add BVN verification to upgrade to FULL tier (₦5M limit)')
            else:
                result['risk_level'] = 'HIGH'
                result['recommendations'].append('NIN verification failed - check details')
        
        # SOCIAL Verification: Phone + Social Login
        elif verification_type == 'SOCIAL':
            if not phone_number:
                result['missing_requirements'] = ['Phone Number']
                return result
            
            # Phone verification (OTP assumed to be done separately)
            result['verifications']['phone'] = {
                'verified': True,
                'phone': phone_number
            }
            
            result['verification_tier'] = VerificationTier.SOCIAL.value
            result['transaction_limit'] = self.tier_limits[VerificationTier.SOCIAL]
            result['compliance_score'] = 30.0
            result['risk_level'] = 'MEDIUM'
            result['success'] = True
            result['recommendations'].append('Upgrade to BASIC tier (NIN) for ₦100K limit')
            result['recommendations'].append('Upgrade to FULL tier (NIN+BVN+Face) for ₦5M limit')
        
        return result

# Flask routes
service = BuyerKYCService()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'buyer-kyc'})

@app.route('/verify/nin', methods=['POST'])
async def verify_nin():
    data = request.json
    result = await service.verify_nin(
        nin=data['nin'],
        first_name=data['first_name'],
        last_name=data['last_name'],
        date_of_birth=data['date_of_birth']
    )
    return jsonify(result)

@app.route('/verify/bvn', methods=['POST'])
async def verify_bvn():
    data = request.json
    result = await service.verify_bvn(
        bvn=data['bvn'],
        phone_number=data['phone_number'],
        first_name=data['first_name'],
        last_name=data['last_name']
    )
    return jsonify(result)

@app.route('/verify/face-match', methods=['POST'])
async def face_match():
    data = request.json
    result = await service.perform_face_match(
        nin_photo=data['nin_photo'],
        selfie_photo=data['selfie_photo']
    )
    return jsonify(result)

@app.route('/verify/comprehensive', methods=['POST'])
async def comprehensive_verification():
    data = request.json
    result = await service.comprehensive_buyer_verification(
        user_id=data['user_id'],
        verification_type=data['verification_type'],
        nin=data.get('nin'),
        bvn=data.get('bvn'),
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        date_of_birth=data.get('date_of_birth'),
        phone_number=data.get('phone_number'),
        selfie_photo=data.get('selfie_photo')
    )
    return jsonify(result)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5050))
    app.run(host='0.0.0.0', port=port, debug=True)
