# KYB & AML Implementation Guide
## Business Verification & Anti-Money Laundering Compliance

Complete guide for production-grade business verification and AML screening for real estate platform.

---

## Table of Contents

1. [Overview](#overview)
2. [KYB (Know Your Business)](#kyb-know-your-business)
3. [AML Screening](#aml-screening)
4. [Verification Dashboard](#verification-dashboard)
5. [API Configuration](#api-configuration)
6. [Compliance Framework](#compliance-framework)
7. [Cost Analysis](#cost-analysis)

---

## Overview

### System Capabilities

**✅ KYB Verification:**
- CAC (Corporate Affairs Commission) registration verification
- TIN (Tax Identification Number) validation
- Director KYC checks (NIN/BVN)
- Business address verification
- Comprehensive risk assessment

**✅ AML Screening:**
- PEP (Politically Exposed Persons) screening
- Sanctions lists (OFAC, UN, EU, UK, EFCC)
- Adverse media monitoring
- Watchlist screening
- Ongoing monitoring

**✅ Verification Dashboard:**
- Real-time verification statistics
- Fraud alert management
- Pending review queue
- API cost tracking
- Risk analytics

---

## KYB (Know Your Business)

### Service: `kyb_verification.py`

### CAC Verification

**Purpose:** Verify Nigerian company registration with Corporate Affairs Commission

**Supported APIs:**
1. **Dojah** (Recommended) - Comprehensive KYB suite
2. **Youverify** - Fast bulk verification
3. **Verified.africa** - Cost-effective alternative

**RC Number Formats:**
- **RC** - Limited Liability Company (e.g., RC123456)
- **BN** - Business Name (e.g., BN234567)
- **IT** - Incorporated Trustees (NGO) (e.g., IT345678)
- **LLP** - Limited Liability Partnership (e.g., LLP456789)

**Example Usage:**

```python
from services.kyb_verification import KYBVerificationService

kyb_service = KYBVerificationService()

# Verify CAC registration
result = await kyb_service.verify_cac(
    rc_number="RC123456",
    company_name="EXAMPLE PROPERTIES LIMITED"
)

if result['verified']:
    print(f"Company: {result['data']['company_name']}")
    print(f"Status: {result['data']['status']}")
    print(f"Directors: {len(result['data']['directors'])}")
    print(f"Share Capital: ₦{result['data']['share_capital']:,}")
```

**API Response:**

```json
{
  "success": true,
  "verified": true,
  "rc_number": "RC123456",
  "data": {
    "company_name": "EXAMPLE PROPERTIES LIMITED",
    "registration_date": "2015-03-20",
    "company_type": "LIMITED",
    "status": "ACTIVE",
    "address": "123 Victoria Island, Lagos",
    "state": "Lagos",
    "email": "info@example.com",
    "phone": "08012345678",
    "directors": [
      {
        "name": "JOHN DOE",
        "position": "Managing Director",
        "appointment_date": "2015-03-20",
        "nationality": "Nigerian"
      }
    ],
    "shareholders": [
      {
        "name": "JOHN DOE",
        "shares": 10000,
        "share_type": "ORDINARY"
      }
    ],
    "share_capital": 1000000,
    "classification": "PRIVATE",
    "branch": "Lagos"
  },
  "match_score": 1.0,
  "provider": "dojah",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### TIN Verification

**Purpose:** Verify Tax Identification Number with FIRS

```python
tin_result = await kyb_service.verify_tin(
    tin="12345678",
    company_name="EXAMPLE PROPERTIES LIMITED"
)

if tin_result['verified']:
    print(f"Tax Office: {tin_result['data']['tax_office']}")
    print(f"Status: {tin_result['data']['status']}")
```

### Director KYC Verification

**Purpose:** Verify all company directors with individual KYC

```python
directors = [
    {
        "name": "JOHN DOE",
        "first_name": "JOHN",
        "last_name": "DOE",
        "nin": "12345678901",
        "bvn": "22334455667",
        "position": "Managing Director"
    },
    {
        "name": "JANE SMITH",
        "first_name": "JANE",
        "last_name": "SMITH",
        "nin": "98765432109",
        "position": "Director"
    }
]

directors_result = await kyb_service.verify_directors(
    rc_number="RC123456",
    directors=directors
)

print(f"Verified: {directors_result['verified_count']}/{directors_result['total_count']}")
print(f"All verified: {directors_result['all_verified']}")
```

### Comprehensive KYB

**Purpose:** Complete business verification with risk assessment

```python
comprehensive_result = await kyb_service.comprehensive_kyb(
    rc_number="RC123456",
    tin="12345678",
    directors=directors,
    verify_directors_kyc=True
)

print(f"Risk Level: {comprehensive_result['risk_level']}")
print(f"CAC Verified: {comprehensive_result['cac_verified']}")
print(f"TIN Verified: {comprehensive_result['tin_verified']}")
print(f"Directors Verified: {comprehensive_result['directors_verified']}")
print(f"Recommendations: {comprehensive_result['recommendations']}")
```

**Risk Assessment:**

| Risk Level | Score | Requirements | Action |
|------------|-------|--------------|--------|
| LOW | 80-100 | CAC + TIN + All Directors | Auto-approve |
| MEDIUM | 50-79 | CAC + Partial Directors | Manual review |
| HIGH | 0-49 | CAC only or failed checks | Enhanced DD |

---

## AML Screening

### Service: `aml_screening.py`

### Individual Screening

**Purpose:** Screen individuals against PEP, sanctions, and watchlists

**Supported APIs:**
1. **Dow Jones Risk & Compliance** (Recommended) - Enterprise-grade
2. **ComplyAdvantage** - Comprehensive global coverage
3. **Refinitiv World-Check One** - Financial services standard
4. **Sanctions.io** - Cost-effective alternative

**Example Usage:**

```python
from services.aml_screening import AMLScreeningService

aml_service = AMLScreeningService()

result = await aml_service.screen_individual(
    first_name="JOHN",
    last_name="DOE",
    date_of_birth="1980-01-15",
    nationality="NG",
    country_of_residence="NG"
)

print(f"Risk Level: {result['risk_level']}")
print(f"PEP Match: {result['pep_match']}")
print(f"Sanctions Match: {result['sanctions_match']}")
print(f"Recommendation: {result['recommendation']}")
```

**API Response:**

```json
{
  "success": true,
  "risk_level": "MEDIUM",
  "pep_match": true,
  "sanctions_match": false,
  "adverse_media_match": false,
  "watchlist_match": false,
  "matches": [
    {
      "type": "PEP",
      "name": "JOHN DOE",
      "match_score": 0.92,
      "details": {
        "position": "Former State Governor",
        "country": "Nigeria",
        "start_date": "2015-05-29",
        "end_date": "2019-05-29"
      },
      "source": "dow_jones"
    }
  ],
  "recommendation": "STANDARD DUE DILIGENCE - Collect additional information and monitor closely.",
  "provider": "dow_jones",
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### Business Screening

**Purpose:** Screen business entities against sanctions and watchlists

```python
business_result = await aml_service.screen_business(
    company_name="EXAMPLE PROPERTIES LIMITED",
    registration_number="RC123456",
    country="NG"
)

print(f"Risk Level: {business_result['risk_level']}")
print(f"Sanctions Match: {business_result['sanctions_match']}")
```

### Sanctions List Checking

**Purpose:** Check against major sanctions lists

**Lists Covered:**
- **OFAC** - US Treasury Office of Foreign Assets Control
- **UN** - United Nations Security Council Sanctions
- **EU** - European Union Sanctions
- **UK** - UK HM Treasury Sanctions
- **EFCC** - Nigerian Economic and Financial Crimes Commission

```python
sanctions_result = await aml_service.check_sanctions_lists(
    name="JOHN DOE",
    entity_type="individual"
)

if sanctions_result['on_sanctions_list']:
    print("CRITICAL: Entity on sanctions list!")
    for list_check in sanctions_result['lists']:
        if list_check['match']:
            print(f"  - {list_check['name']}: {list_check['details']}")
```

### Risk Levels & Actions

| Risk Level | Triggers | Action Required |
|------------|----------|-----------------|
| **CRITICAL** | Sanctions match | REJECT - Transaction prohibited |
| **HIGH** | PEP + Adverse media | Enhanced Due Diligence + Senior approval |
| **MEDIUM** | PEP or Watchlist | Standard Due Diligence + Monitoring |
| **LOW** | No matches | Approve + Standard monitoring |

### Ongoing Monitoring

**Purpose:** Continuous monitoring for changes in risk profile

```python
monitoring_result = await aml_service.ongoing_monitoring(
    entity_id="user_123",
    entity_type="individual",
    entity_data={
        "first_name": "JOHN",
        "last_name": "DOE",
        "date_of_birth": "1980-01-15"
    }
)

print(f"Monitoring ID: {monitoring_result['monitoring_id']}")
print(f"Status: {monitoring_result['status']}")
```

---

## Verification Dashboard

### Page: `VerificationDashboard.tsx`

### Features

**Real-time Statistics:**
- Total verifications (today/week/month)
- Approval rate
- Pending reviews count
- Average processing time
- Total API costs

**Fraud Alerts:**
- Active fraud alerts with severity levels
- Unresolved alerts requiring attention
- Quick action buttons (Review/Dismiss)

**Verification Management:**
- Recent verifications table
- Pending manual reviews
- Rejected verifications
- Detailed view for each record

**Analytics:**
- Verification by type (KYC/KYB/Diaspora)
- Risk distribution (Low/Medium/High/Critical)
- API provider performance
- Cost tracking

### Access

```
URL: /verification-dashboard
Role: Admin only
```

### tRPC Endpoints Required

```typescript
// server/routers.ts

verification: router({
  getStats: protectedProcedure
    .input(z.object({
      timeRange: z.enum(['today', 'week', 'month'])
    }))
    .query(async ({ input }) => {
      // Return verification statistics
    }),
  
  getRecent: protectedProcedure
    .input(z.object({
      limit: z.number().optional()
    }))
    .query(async ({ input }) => {
      // Return recent verifications
    }),
  
  getFraudAlerts: protectedProcedure
    .input(z.object({
      resolved: z.boolean().optional()
    }))
    .query(async ({ input }) => {
      // Return fraud alerts
    }),
  
  getPendingReviews: protectedProcedure
    .query(async () => {
      // Return pending manual reviews
    })
})
```

---

## API Configuration

### Environment Variables

```bash
# KYB APIs
DOJAH_API_KEY=your_dojah_key
DOJAH_APP_ID=your_dojah_app_id
YOUVERIFY_API_KEY=your_youverify_key
VERIFIED_AFRICA_API_KEY=your_verified_key

# AML APIs
DOW_JONES_API_KEY=your_dow_jones_key
COMPLY_ADVANTAGE_API_KEY=your_comply_advantage_key
WORLD_CHECK_API_KEY=your_world_check_key
SANCTIONS_IO_API_KEY=your_sanctions_io_key
EFCC_API_KEY=your_efcc_key
```

### API Provider Selection

**For Nigerian Businesses:**
- **Primary:** Dojah (CAC + TIN + Comprehensive)
- **Backup:** Youverify (Fast, bulk-friendly)
- **Cost-Effective:** Verified.africa

**For AML Screening:**
- **Enterprise:** Dow Jones Risk & Compliance
- **Mid-Market:** ComplyAdvantage
- **Financial Services:** Refinitiv World-Check One
- **Startups:** Sanctions.io

---

## Compliance Framework

### Nigerian Regulations

**CBN (Central Bank of Nigeria) AML/CFT Requirements:**

✅ **Customer Due Diligence (CDD):**
- Verify identity of all customers
- Understand nature of business relationship
- Assess money laundering/terrorism financing risks

✅ **Enhanced Due Diligence (EDD):**
- Required for high-risk customers
- PEPs and their family members
- Customers from high-risk jurisdictions

✅ **Ongoing Monitoring:**
- Monitor transactions for suspicious activity
- Keep customer information up-to-date
- Report suspicious transactions to NFIU

**SCUML (Special Control Unit Against Money Laundering):**
- Register as Designated Non-Financial Institution (DNFI)
- Implement AML/CFT compliance program
- File Suspicious Transaction Reports (STRs)
- Maintain records for 5 years

### International Standards

**FATF (Financial Action Task Force):**
- Risk-based approach to AML/CFT
- Customer due diligence
- Suspicious transaction reporting
- Record keeping

**GDPR (Data Protection):**
- Lawful basis for processing (legal obligation)
- Data minimization
- Right to erasure (with AML exemption)
- Secure storage

---

## Cost Analysis

### KYB Verification Costs (per business)

| Provider | CAC | TIN | Director KYC | Total |
|----------|-----|-----|--------------|-------|
| Dojah | ₦500 | ₦300 | ₦600/director | ₦1,400+ |
| Youverify | ₦400 | ₦250 | ₦400/director | ₦1,050+ |
| Verified.africa | ₦300 | ₦200 | ₦200/director | ₦700+ |

**Example:** Business with 3 directors using Dojah:
- CAC: ₦500
- TIN: ₦300
- Directors (3 × ₦600): ₦1,800
- **Total: ₦2,600**

### AML Screening Costs (per entity)

| Provider | Individual | Business | Ongoing Monitoring |
|----------|------------|----------|-------------------|
| Dow Jones | $15-25 | $30-50 | $5/month |
| ComplyAdvantage | $10-20 | $20-40 | $3/month |
| World-Check | $20-30 | $40-60 | $8/month |
| Sanctions.io | $2-5 | $5-10 | $1/month |

**Recommended:** Sanctions.io for startups, Dow Jones for enterprise

### Monthly Cost Estimates

**Scenario 1: 50 businesses/month**
- KYB: 50 × ₦2,600 = ₦130,000 (~$163)
- AML (business): 50 × $5 = $250
- AML (directors, 150): 150 × $5 = $750
- **Total: ~$1,163/month**

**Scenario 2: 200 businesses/month**
- KYB: 200 × ₦2,340 (10% discount) = ₦468,000 (~$585)
- AML (business): 200 × $4 = $800
- AML (directors, 600): 600 × $4 = $2,400
- **Total: ~$3,785/month**

---

## Implementation Checklist

### Phase 1: KYB Setup

- [ ] Choose KYB API provider (Dojah recommended)
- [ ] Obtain API keys and configure environment
- [ ] Test CAC verification with sandbox
- [ ] Test TIN verification
- [ ] Test director KYC integration
- [ ] Deploy to production

### Phase 2: AML Setup

- [ ] Choose AML API provider (Sanctions.io for MVP, Dow Jones for scale)
- [ ] Obtain API keys and configure environment
- [ ] Test individual screening
- [ ] Test business screening
- [ ] Test sanctions list checking
- [ ] Set up ongoing monitoring

### Phase 3: Dashboard

- [ ] Create verification database tables
- [ ] Implement tRPC endpoints
- [ ] Deploy verification dashboard
- [ ] Configure role-based access (admin only)
- [ ] Test fraud alert system

### Phase 4: Compliance

- [ ] Register with SCUML as DNFI
- [ ] Implement AML/CFT compliance program
- [ ] Train staff on AML procedures
- [ ] Set up STR reporting process
- [ ] Implement record-keeping system

---

## Database Schema

### Verifications Table

```sql
CREATE TABLE verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entity_type ENUM('individual', 'business') NOT NULL,
  verification_type ENUM('KYC', 'KYB', 'AML') NOT NULL,
  tier VARCHAR(50),
  status ENUM('pending', 'approved', 'rejected', 'review') NOT NULL,
  risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
  provider VARCHAR(50),
  cost DECIMAL(10, 2),
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### Fraud Alerts Table

```sql
CREATE TABLE fraud_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  verification_id INT,
  alert_type VARCHAR(50) NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  description TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INT NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_resolved (resolved),
  INDEX idx_severity (severity)
);
```

---

## Testing

### Unit Tests

```bash
# Test KYB service
python -m pytest services/ocr-service/tests/test_kyb_verification.py

# Test AML service
python -m pytest services/ocr-service/tests/test_aml_screening.py
```

### Integration Tests

```python
# Test comprehensive KYB + AML flow
async def test_comprehensive_verification():
    kyb_service = KYBVerificationService()
    aml_service = AMLScreeningService()
    
    # 1. Verify business
    cac_result = await kyb_service.verify_cac("RC123456")
    assert cac_result['verified']
    
    # 2. Screen business
    business_aml = await aml_service.screen_business(
        cac_result['data']['company_name'],
        "RC123456"
    )
    assert business_aml['risk_level'] in ['LOW', 'MEDIUM']
    
    # 3. Screen directors
    for director in cac_result['data']['directors']:
        director_aml = await aml_service.screen_individual(
            first_name=director['name'].split()[0],
            last_name=director['name'].split()[-1]
        )
        assert director_aml['risk_level'] != 'CRITICAL'
```

---

## Support & Resources

**For KYB Issues:**
- Dojah: support@dojah.io
- Youverify: support@youverify.co
- Verified.africa: support@verified.africa

**For AML Issues:**
- Dow Jones: support@dowjones.com
- ComplyAdvantage: support@complyadvantage.com
- Sanctions.io: support@sanctions.io

**Regulatory Compliance:**
- CBN: www.cbn.gov.ng
- SCUML: www.scuml.gov.ng
- NFIU: www.nfiu.gov.ng

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0  
**Status:** Production-Ready
