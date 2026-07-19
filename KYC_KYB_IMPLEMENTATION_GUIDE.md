# KYC/KYB Implementation Guide
## Real Estate Platform - Nigerian & Diaspora Users

Complete guide for production-grade identity verification supporting Nigerian residents and diaspora users.

---

## Table of Contents

1. [Overview](#overview)
2. [Verification Tiers](#verification-tiers)
3. [Nigerian Residents (NIN + BVN)](#nigerian-residents-nin--bvn)
4. [Diaspora Users (International Documents)](#diaspora-users-international-documents)
5. [API Configuration](#api-configuration)
6. [Implementation Examples](#implementation-examples)
7. [Compliance & Regulations](#compliance--regulations)
8. [Cost Analysis](#cost-analysis)

---

## Overview

### Current Status

**✅ Production-Ready:**
- NIN verification with 3 API providers (Dojah, Youverify, Verified.africa)
- BVN verification with 4 API providers (Mono, Dojah, Paystack, Okra)
- International passport verification (Onfido, Veriff, Jumio)
- Driver's license verification (30+ countries)
- Address proof verification

**🔧 Requires Configuration:**
- API keys for chosen providers
- Webhook endpoints for async verification
- Database schema for storing verification records

### Verification Flow

```
User Registration
    ↓
Risk Assessment (booking amount, user type)
    ↓
Tier Determination
    ↓
Document Collection
    ↓
API Verification (NIN/BVN/Passport)
    ↓
Face Matching + Liveness
    ↓
Approval/Rejection
    ↓
Set Booking Limits
```

---

## Verification Tiers

### Tier 1: Full Verification (Nigerian Residents)
**Requirements:** NIN + BVN + Face Match  
**Booking Limit:** ₦5,000,000  
**Use Case:** High-value property bookings, landlords  
**Verification Time:** 2-5 minutes  
**Cost:** ~₦500-800 per verification

**Documents Required:**
- National Identity Number (NIN) - 11 digits
- Bank Verification Number (BVN) - 11 digits
- Live selfie for face matching

**Verification Steps:**
1. User provides NIN and BVN
2. System verifies NIN with NIMC via API
3. System verifies BVN with NIBSS via API
4. Face match between NIN photo, BVN photo, and selfie
5. Cross-check data consistency (name, DOB, phone)
6. Watchlist check for fraud/blacklist
7. Approval if all checks pass

### Tier 2: International Verification (Diaspora)
**Requirements:** International Passport + Selfie  
**Booking Limit:** $10,000 (₦15,000,000)  
**Use Case:** Diaspora investors, foreign buyers  
**Verification Time:** 5-10 minutes  
**Cost:** ~$5-15 per verification

**Supported Documents:**
- International passports (all countries)
- Driver's licenses (US, UK, CA, EU, etc.)
- National ID cards (30+ countries)
- Address proof (utility bills, bank statements)

**Verification Steps:**
1. User uploads passport + selfie
2. OCR extracts passport data (MRZ verification)
3. Document authenticity check (security features)
4. Face match with passport photo
5. Liveness detection (anti-spoofing)
6. Optional: Address proof verification
7. Approval if all checks pass

### Tier 3: Basic Verification
**Requirements:** Phone + Email  
**Booking Limit:** ₦100,000  
**Use Case:** Quick bookings, low-risk transactions  
**Verification Time:** < 1 minute  
**Cost:** Free (OTP only)

### Tier 4: Social Verification
**Requirements:** Google/Facebook OAuth  
**Booking Limit:** ₦50,000  
**Use Case:** First-time users, browsing  
**Verification Time:** < 30 seconds  
**Cost:** Free

---

## Nigerian Residents (NIN + BVN)

### NIN Verification

**Service:** `nin_verification.py`

**Supported APIs:**
1. **Dojah** (Recommended) - Most reliable, includes liveness
2. **Youverify** - Fast, good for bulk verification
3. **Verified.africa** - Cost-effective alternative

**API Response Example:**
```json
{
  "success": true,
  "verified": true,
  "nin": "12345678901",
  "data": {
    "first_name": "ADEBAYO",
    "last_name": "OLUWASEUN",
    "middle_name": "TUNDE",
    "date_of_birth": "1990-01-15",
    "gender": "Male",
    "phone": "2348012345678",
    "photo": "base64_encoded_image",
    "address": "123 Lagos Street, Victoria Island",
    "lga": "Lagos Island",
    "state": "Lagos",
    "nationality": "Nigerian"
  },
  "match_score": 1.0,
  "provider": "dojah",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Face Matching:**
```python
from services.nin_verification import NINVerificationService

nin_service = NINVerificationService()

result = await nin_service.verify_nin_with_face(
    nin="12345678901",
    selfie_image=selfie_bytes
)

if result['verified'] and result['face_match']:
    print(f"Face match score: {result['face_match_score']}")
    print(f"Liveness check: {result['liveness_check']}")
```

**Caching:**
- Results cached for 24 hours
- Reduces API costs for repeat checks
- Cache key: SHA-256 hash of NIN

### BVN Verification

**Service:** `bvn_verification.py`

**Supported APIs:**
1. **Mono** (Recommended) - Best for BVN, includes watchlist
2. **Dojah** - Comprehensive KYC suite
3. **Paystack** - Merchant-friendly, integrated with payments
4. **Okra** - Open banking integration

**API Response Example:**
```json
{
  "success": true,
  "verified": true,
  "bvn": "22334455667",
  "data": {
    "first_name": "ADEBAYO",
    "last_name": "OLUWASEUN",
    "middle_name": "TUNDE",
    "date_of_birth": "1990-01-15",
    "gender": "Male",
    "phone": "08012345678",
    "photo": "base64_encoded_image",
    "enrollment_bank": "Access Bank",
    "enrollment_branch": "Victoria Island",
    "registration_date": "2015-03-20",
    "watch_listed": false
  },
  "match_score": 1.0,
  "provider": "mono",
  "timestamp": "2024-01-15T10:31:00Z"
}
```

**Phone Matching:**
```python
from services.bvn_verification import BVNVerificationService

bvn_service = BVNVerificationService()

result = await bvn_service.verify_bvn_with_phone(
    bvn="22334455667",
    phone_number="08012345678"
)

if result['phone_match']:
    print("Phone number matches BVN record")
```

**Watchlist Check:**
```python
watchlist_result = await bvn_service.check_watchlist("22334455667")

if watchlist_result['watch_listed']:
    print(f"User is watchlisted: {watchlist_result['reason']}")
    # Reject verification
```

### Combined NIN + BVN Verification

**Best Practice for Tier 1:**
```python
# 1. Verify NIN
nin_result = await nin_service.verify_nin(
    nin="12345678901",
    first_name="ADEBAYO",
    last_name="OLUWASEUN",
    date_of_birth="1990-01-15"
)

# 2. Verify BVN
bvn_result = await bvn_service.verify_bvn(
    bvn="22334455667",
    first_name="ADEBAYO",
    last_name="OLUWASEUN",
    date_of_birth="1990-01-15"
)

# 3. Cross-check data consistency
if nin_result['verified'] and bvn_result['verified']:
    nin_data = nin_result['data']
    bvn_data = bvn_result['data']
    
    # Check name match
    name_match = (
        nin_data['first_name'] == bvn_data['first_name'] and
        nin_data['last_name'] == bvn_data['last_name']
    )
    
    # Check DOB match
    dob_match = nin_data['date_of_birth'] == bvn_data['date_of_birth']
    
    # Check phone match
    phone_match = normalize_phone(nin_data['phone']) == normalize_phone(bvn_data['phone'])
    
    if name_match and dob_match and phone_match:
        # 4. Face matching
        face_result = await nin_service._match_faces_advanced(
            base64.b64decode(nin_data['photo']),
            selfie_bytes
        )
        
        if face_result['match'] and face_result['liveness']:
            # APPROVED - Tier 1
            approve_user(booking_limit=5000000)
```

---

## Diaspora Users (International Documents)

### International Passport Verification

**Service:** `diaspora_verification.py`

**Supported Countries:** 30+ (US, UK, CA, EU, Middle East, Asia, Africa)

**Supported APIs:**
1. **Onfido** (Recommended) - Best global coverage, MRZ verification
2. **Veriff** - Strong liveness detection
3. **Jumio** - Enterprise-grade, biometric matching

**Verification Process:**
```python
from services.diaspora_verification import DiasporaVerificationService

diaspora_service = DiasporaVerificationService()

result = await diaspora_service.verify_international_passport(
    passport_image=passport_bytes,
    selfie_image=selfie_bytes,
    country_code="US",
    user_id="user_123"
)

if result['verified']:
    print(f"Document authentic: {result['document_authentic']}")
    print(f"Face match: {result['face_match']}")
    print(f"Liveness passed: {result['liveness_passed']}")
    print(f"MRZ verified: {result['data']['mrz_verified']}")
```

**Response Example:**
```json
{
  "success": true,
  "verified": true,
  "document_authentic": true,
  "face_match": true,
  "liveness_passed": true,
  "data": {
    "document_number": "123456789",
    "first_name": "JOHN",
    "last_name": "DOE",
    "date_of_birth": "1985-06-15",
    "nationality": "USA",
    "issue_date": "2020-01-10",
    "expiry_date": "2030-01-10",
    "mrz_verified": true
  },
  "risk_score": 0.05,
  "provider": "onfido"
}
```

### Driver's License Verification

**Supported Regions:**
- **North America:** US (all states), Canada (all provinces)
- **Europe:** UK, Germany, France, Italy, Spain, Netherlands, etc.
- **Middle East:** UAE, Saudi Arabia, Qatar
- **Asia:** Singapore, Malaysia, India
- **Africa:** South Africa, Ghana, Kenya

```python
result = await diaspora_service.verify_drivers_license(
    front_image=front_bytes,
    back_image=back_bytes,
    selfie_image=selfie_bytes,
    country_code="GB",
    state_code=None  # Only for US/CA
)
```

### Address Proof Verification

**Accepted Documents:**
- Utility bills (electricity, water, gas)
- Bank statements
- Lease agreements
- Government letters

```python
result = await diaspora_service.verify_address_proof(
    document_image=bill_bytes,
    document_type="utility_bill",
    expected_address={
        "street": "123 Main St",
        "city": "London",
        "postal_code": "SW1A 1AA",
        "country": "UK"
    },
    country_code="GB"
)

if result['address_match']:
    print(f"Document age: {result['document_age_days']} days")
```

---

## API Configuration

### Environment Variables

```bash
# NIN Verification
DOJAH_API_KEY=your_dojah_key
DOJAH_APP_ID=your_dojah_app_id
YOUVERIFY_API_KEY=your_youverify_key
VERIFIED_AFRICA_API_KEY=your_verified_key

# BVN Verification
MONO_SECRET_KEY=your_mono_key
PAYSTACK_SECRET_KEY=your_paystack_key
OKRA_SECRET_KEY=your_okra_key

# International Verification
ONFIDO_API_KEY=your_onfido_key
VERIFF_API_KEY=your_veriff_key
JUMIO_API_TOKEN=your_jumio_token
JUMIO_API_SECRET=your_jumio_secret
TRULIOO_API_KEY=your_trulioo_key
```

### API Provider Selection

**For Nigerian Users:**
- **Primary:** Dojah (NIN + BVN + Face Match)
- **Backup:** Mono (BVN), Youverify (NIN)
- **Cost-Effective:** Verified.africa

**For Diaspora Users:**
- **Primary:** Onfido (best global coverage)
- **Backup:** Veriff (strong liveness)
- **Enterprise:** Jumio (high-volume)

### Failover Strategy

```python
# Automatic failover implemented in services
# Priority: Primary → Backup → Tertiary

# Example: NIN verification tries:
# 1. Dojah (if configured)
# 2. Youverify (if Dojah fails)
# 3. Verified.africa (if both fail)
```

---

## Implementation Examples

### Complete Verification Flow

```python
from services.nin_verification import NINVerificationService
from services.bvn_verification import BVNVerificationService
from services.diaspora_verification import DiasporaVerificationService

async def verify_user(user_data):
    if user_data['is_nigerian_resident']:
        # Tier 1: Full Verification
        nin_service = NINVerificationService()
        bvn_service = BVNVerificationService()
        
        # Verify NIN
        nin_result = await nin_service.verify_nin_with_face(
            nin=user_data['nin'],
            selfie_image=user_data['selfie']
        )
        
        if not nin_result['verified'] or not nin_result['face_match']:
            return {"approved": False, "reason": "NIN verification failed"}
        
        # Verify BVN
        bvn_result = await bvn_service.verify_bvn_with_phone(
            bvn=user_data['bvn'],
            phone_number=user_data['phone']
        )
        
        if not bvn_result['verified'] or not bvn_result['phone_match']:
            return {"approved": False, "reason": "BVN verification failed"}
        
        # Check watchlist
        watchlist = await bvn_service.check_watchlist(user_data['bvn'])
        if watchlist['watch_listed']:
            return {"approved": False, "reason": "User is watchlisted"}
        
        # APPROVED - Tier 1
        return {
            "approved": True,
            "tier": "full",
            "booking_limit": 5000000,
            "currency": "NGN",
            "verification_data": {
                "nin": nin_result['data'],
                "bvn": bvn_result['bvn_data']
            }
        }
    
    else:
        # Tier 2: International Verification
        diaspora_service = DiasporaVerificationService()
        
        result = await diaspora_service.verify_international_passport(
            passport_image=user_data['passport'],
            selfie_image=user_data['selfie'],
            country_code=user_data['country_code']
        )
        
        if not result['verified'] or not result['face_match'] or not result['liveness_passed']:
            return {"approved": False, "reason": "Passport verification failed"}
        
        # APPROVED - Tier 2
        return {
            "approved": True,
            "tier": "international",
            "booking_limit": 15000000,  # ~$10,000
            "currency": "NGN",
            "verification_data": result['data']
        }
```

---

## Compliance & Regulations

### Nigerian Regulations

**NDPR (Nigeria Data Protection Regulation):**
- ✅ User consent required before verification
- ✅ Data minimization (only collect necessary data)
- ✅ Secure storage (encryption at rest and in transit)
- ✅ Right to erasure (delete user data on request)

**CBN (Central Bank of Nigeria) KYC Requirements:**
- ✅ Tier 1: NIN or BVN required for high-value transactions
- ✅ Tier 2: Passport acceptable for foreign nationals
- ✅ Tier 3: Phone/email for low-value transactions

**NIMC (National Identity Management Commission):**
- ✅ NIN verification through approved aggregators only
- ✅ No direct NIMC API access without government approval

### International Compliance

**GDPR (EU users):**
- ✅ Explicit consent
- ✅ Data portability
- ✅ Right to be forgotten

**AML/CFT (Anti-Money Laundering):**
- ✅ Watchlist screening
- ✅ PEP (Politically Exposed Persons) checks
- ✅ Transaction monitoring

---

## Cost Analysis

### Nigerian Verification (per user)

| Provider | NIN | BVN | Combined | Volume Discount |
|----------|-----|-----|----------|-----------------|
| Dojah | ₦300 | ₦300 | ₦600 | 10% at 10k/month |
| Mono | N/A | ₦250 | ₦250 | 15% at 20k/month |
| Youverify | ₦200 | ₦200 | ₦400 | 20% at 50k/month |
| Paystack | N/A | ₦100 | ₦100 | Free for merchants |

**Recommended:** Dojah (NIN + BVN + Face) = ₦600/user

### International Verification (per user)

| Provider | Passport | Driver's License | Address Proof | Volume Discount |
|----------|----------|------------------|---------------|-----------------|
| Onfido | $5 | $5 | $3 | 20% at 1k/month |
| Veriff | $8 | $8 | N/A | 15% at 500/month |
| Jumio | $10 | $10 | $5 | 25% at 5k/month |

**Recommended:** Onfido = $5-8/user

### Monthly Cost Estimates

**Scenario 1: 1,000 Nigerian users + 100 diaspora users**
- Nigerian: 1,000 × ₦600 = ₦600,000 (~$750)
- Diaspora: 100 × $5 = $500
- **Total: ~$1,250/month**

**Scenario 2: 10,000 Nigerian users + 1,000 diaspora users**
- Nigerian: 10,000 × ₦540 (10% discount) = ₦5,400,000 (~$6,750)
- Diaspora: 1,000 × $4 (20% discount) = $4,000
- **Total: ~$10,750/month**

---

## Next Steps

### Immediate Actions

1. **Choose API Providers:**
   - Nigerian: Dojah (primary), Mono (backup)
   - International: Onfido (primary), Veriff (backup)

2. **Get API Keys:**
   - Sign up at provider websites
   - Complete KYB verification (for your business)
   - Request production API keys

3. **Configure Environment:**
   - Set environment variables
   - Test with sandbox keys first
   - Deploy to production

4. **Database Setup:**
   - Create `verifications` table
   - Store verification records
   - Implement audit logging

5. **Webhook Configuration:**
   - Set up webhook endpoints
   - Handle async verification results
   - Implement retry logic

### Testing

```bash
# Test NIN verification
python -m pytest services/ocr-service/tests/test_nin_verification.py

# Test BVN verification
python -m pytest services/ocr-service/tests/test_bvn_verification.py

# Test diaspora verification
python -m pytest services/ocr-service/tests/test_diaspora_verification.py
```

### Monitoring

- Track verification success rates
- Monitor API costs
- Set up alerts for failures
- Review fraud patterns

---

## Support

**For API Issues:**
- Dojah: support@dojah.io
- Mono: support@mono.co
- Onfido: support@onfido.com

**For Implementation Help:**
- Check service documentation in `services/ocr-service/services/`
- Review test files for examples
- Contact platform team

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0  
**Status:** Production-Ready
