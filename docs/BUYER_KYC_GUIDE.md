# Buyer KYC Verification Guide

## Overview

The Real Estate Platform implements a comprehensive 4-tier KYC (Know Your Customer) verification system for property buyers, supporting both Nigerian local users and international diaspora buyers.

## Verification Tiers

### 1. FULL Verification (₦5,000,000 limit)

**Target Users:** Nigerian residents making large property transactions

**Requirements:**
- National Identification Number (NIN) - 11 digits
- Bank Verification Number (BVN) - 11 digits
- Biometric face matching (selfie vs NIN photo)
- Phone number verification

**Verification Providers:**
- **NIN Verification:** Dojah, Youverify, Verified.africa (fallback chain)
- **BVN Verification:** Mono, Dojah, Paystack, Okra (fallback chain)
- **Face Matching:** FaceTec/iProov (liveness detection)

**Process Flow:**
1. User provides NIN, BVN, personal details
2. System verifies NIN with NIMC through provider APIs
3. System verifies BVN with CBN through banking APIs
4. User uploads selfie for biometric matching
5. System performs liveness detection and face matching
6. Compliance score calculated (NIN 40%, BVN 40%, Face Match 20%)
7. If score ≥ 90%, FULL tier granted with ₦5M limit

**Transaction Limit:** ₦5,000,000
**Risk Level:** LOW (when fully verified)
**Compliance Score:** 90-100%

---

### 2. INTERNATIONAL Verification ($10,000 limit)

**Target Users:** Diaspora buyers (US, UK, Canada, EU, etc.)

**Requirements:**
- Valid government-issued ID (passport or driver's license)
- Proof of address (within 3 months)
- Liveness check (video selfie)
- Face matching between ID and selfie

**Supported Countries:** 30+ countries including:
- **Americas:** US, Canada, Brazil, Mexico
- **Europe:** UK, Germany, France, Italy, Spain, Netherlands, etc.
- **Asia:** China, India, Japan, Singapore, Malaysia, etc.
- **Africa:** South Africa, Ghana, Kenya
- **Middle East:** UAE, Saudi Arabia, Qatar

**Verification Providers:**
- **Document Verification:** Onfido (195+ countries), Veriff, Jumio
- **Liveness Detection:** Onfido, iProov
- **OCR & Data Extraction:** Onfido, Veriff

**Accepted Documents:**
- **Passport:** All supported countries
- **Driver's License:** US, UK, Canada, Germany, France, Italy, Spain, Australia
- **National ID:** EU countries, India, South Africa

**Proof of Address Documents:**
- Utility bills (electricity, water, gas, internet)
- Bank statements
- Tax documents
- Government correspondence
- **Must be within 3 months**

**Process Flow:**
1. User selects country and document type
2. User uploads government-issued ID (passport/driver's license)
3. System performs OCR and document authenticity checks
4. User uploads proof of address
5. System verifies document age (≤ 3 months) and address match
6. User completes video selfie for liveness detection
7. System performs face matching between ID photo and selfie
8. Compliance score calculated (ID 40%, Liveness 30%, PoA 20%, Face Match 10%)
9. If score ≥ 90%, INTERNATIONAL tier granted with $10K limit

**Transaction Limit:** $10,000 (≈ ₦15,000,000 @ ₦1500/$)
**Risk Level:** LOW-MEDIUM
**Compliance Score:** 90-100%

---

### 3. BASIC Verification (₦100,000 limit)

**Target Users:** Nigerian users for browsing and small transactions

**Requirements:**
- National Identification Number (NIN) only
- First name, last name, date of birth

**Verification Providers:**
- Dojah, Youverify, Verified.africa (fallback chain)

**Process Flow:**
1. User provides NIN and personal details
2. System verifies NIN with NIMC
3. If verified, BASIC tier granted with ₦100K limit

**Transaction Limit:** ₦100,000
**Risk Level:** MEDIUM
**Compliance Score:** 60%

**Upgrade Path:**
- Add BVN verification → upgrade to FULL tier (₦5M limit)

---

### 4. SOCIAL Verification (₦50,000 limit)

**Target Users:** Casual browsers, exploration phase

**Requirements:**
- Phone number verification (OTP)
- Social login (Google, Facebook, etc.)

**Process Flow:**
1. User provides phone number
2. System sends OTP for verification
3. User completes social login
4. SOCIAL tier granted with ₦50K limit

**Transaction Limit:** ₦50,000
**Risk Level:** MEDIUM
**Compliance Score:** 30%

**Upgrade Paths:**
- Add NIN → upgrade to BASIC tier (₦100K limit)
- Add NIN + BVN + Face Match → upgrade to FULL tier (₦5M limit)

---

## Technical Implementation

### Backend Services

#### 1. Nigerian Local Buyer Service
**File:** `/services/python/buyer_kyc_service.py`

**Endpoints:**
- `POST /verify/nin` - Verify NIN
- `POST /verify/bvn` - Verify BVN
- `POST /verify/face-match` - Perform biometric face matching
- `POST /verify/comprehensive` - Complete FULL/BASIC/SOCIAL verification

**API Integrations:**
- **Dojah:** Primary NIN/BVN provider
- **Youverify:** Fallback NIN/BVN provider
- **Verified.africa:** Final fallback for NIN
- **Mono:** Primary BVN provider (includes watchlist checks)
- **Paystack:** BVN verification
- **Okra:** BVN verification
- **FaceTec/iProov:** Liveness detection and face matching

#### 2. Diaspora Buyer Service
**File:** `/services/python/diaspora_kyc_service.py`

**Endpoints:**
- `POST /verify/passport` - Verify international passport
- `POST /verify/drivers-license` - Verify driver's license
- `POST /verify/proof-of-address` - Verify proof of address
- `POST /verify/liveness` - Perform liveness check
- `POST /verify/comprehensive` - Complete INTERNATIONAL verification
- `GET /supported-countries` - Get list of supported countries

**API Integrations:**
- **Onfido:** Primary global document verification (195+ countries)
- **Veriff:** Fallback for Europe, Americas, Asia
- **Jumio:** Final fallback for Americas, Europe, APAC

### Frontend Components

**File:** `/client/src/pages/BuyerKYCOnboarding.tsx`

**Features:**
- Multi-step verification wizard
- Tier selection interface
- Document upload with preview
- Real-time validation
- Progress tracking
- Compliance score visualization
- Risk level badges
- Upgrade recommendations

---

## Compliance & Risk Management

### Risk Scoring

**Compliance Score Calculation:**

**FULL Tier:**
- NIN Verified: 40 points
- BVN Verified: 40 points
- Face Match: 20 points
- **Total:** 100 points

**INTERNATIONAL Tier:**
- Government ID Verified: 40 points
- Liveness Check Passed: 30 points
- Proof of Address Verified: 20 points
- Face Match: 10 points
- **Total:** 100 points

**BASIC Tier:**
- NIN Verified: 60 points
- **Total:** 60 points

**SOCIAL Tier:**
- Phone Verified: 30 points
- **Total:** 30 points

### Risk Levels

- **LOW:** Compliance score ≥ 90%
- **MEDIUM:** Compliance score 60-89%
- **HIGH:** Compliance score < 60%

### Watchlist Checks

**BVN Verification includes:**
- EFCC (Economic and Financial Crimes Commission) watchlist
- CBN (Central Bank of Nigeria) blacklist
- Banking fraud database

**International Verification includes:**
- OFAC (Office of Foreign Assets Control) sanctions
- EU sanctions list
- UN sanctions list
- PEP (Politically Exposed Persons) database

---

## API Keys Required

### Nigerian Local Verification
```env
DOJAH_API_KEY=your_dojah_key
YOUVERIFY_API_KEY=your_youverify_key
VERIFIED_AFRICA_API_KEY=your_verified_africa_key
MONO_API_KEY=your_mono_key
PAYSTACK_SECRET_KEY=your_paystack_key
OKRA_API_KEY=your_okra_key
```

### International Verification
```env
ONFIDO_API_KEY=your_onfido_key
VERIFF_API_KEY=your_veriff_key
JUMIO_API_KEY=your_jumio_key
```

---

## Testing

### Test Data

**Nigerian NIN (Test):**
- NIN: `12345678901`
- First Name: `JOHN`
- Last Name: `DOE`
- DOB: `1990-01-01`

**Nigerian BVN (Test):**
- BVN: `22222222222`
- Phone: `+2348012345678`

**International Passport (Test):**
- Passport Number: `A12345678`
- Country: `US`
- First Name: `JANE`
- Last Name: `SMITH`
- DOB: `1985-05-15`
- Expiry: `2030-05-15`

### Mock Responses

All services include mock implementations for testing. In production, replace with actual API calls.

---

## Upgrade Paths

### From SOCIAL to BASIC
**Requirements:** Add NIN verification
**New Limit:** ₦100,000 (from ₦50,000)

### From BASIC to FULL
**Requirements:** Add BVN + Face Match
**New Limit:** ₦5,000,000 (from ₦100,000)

### From SOCIAL to FULL
**Requirements:** Add NIN + BVN + Face Match
**New Limit:** ₦5,000,000 (from ₦50,000)

---

## Security & Privacy

### Data Protection
- All personal data encrypted at rest
- PII (Personally Identifiable Information) stored in compliance with NDPR (Nigeria Data Protection Regulation)
- GDPR compliance for international users
- Document images stored with encryption
- Automatic deletion of rejected documents after 30 days

### Fraud Prevention
- Multi-provider verification (fallback chain)
- Liveness detection prevents photo/video spoofing
- Watchlist checks for known fraudsters
- Velocity checks (rate limiting on verification attempts)
- Device fingerprinting
- IP geolocation validation

### Audit Trail
- All verification attempts logged
- Provider responses stored for compliance
- Verification timestamps recorded
- User consent tracked
- GDPR right-to-erasure supported

---

## Support

For verification issues:
1. Check compliance score and missing requirements
2. Review recommendations in verification results
3. Contact support with verification ID
4. Provide alternative documents if primary verification fails

For API integration issues:
1. Check API key validity
2. Review provider status pages
3. Check fallback providers
4. Contact provider support

---

## Roadmap

### Planned Enhancements
- [ ] Video KYC (live agent verification)
- [ ] Corporate buyer KYC (CAC, TIN verification)
- [ ] Enhanced fraud detection with ML models
- [ ] Blockchain-based credential storage
- [ ] Biometric authentication (fingerprint, iris scan)
- [ ] Automated document translation
- [ ] Real-time verification status updates via WebSocket
- [ ] Mobile app integration with native camera
- [ ] OCR improvements for poor quality documents
- [ ] Multi-language support (Yoruba, Igbo, Hausa)

---

## Compliance Standards

- **Nigeria:** NDPR (Nigeria Data Protection Regulation), CBN KYC Guidelines
- **International:** GDPR, AML/CFT regulations, FATF recommendations
- **Industry:** ISO 27001, SOC 2 Type II

---

## Contact

For technical support or API access:
- Email: kyc-support@realestate-platform.com
- Documentation: https://docs.realestate-platform.com/kyc
- API Status: https://status.realestate-platform.com
