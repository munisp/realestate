# KYB for Builders & Shortlet Operators Guide
## Complete Business Verification Workflows

Comprehensive guide for builder/developer and shortlet operator verification with Nigerian regulatory requirements.

---

## Table of Contents

1. [Overview](#overview)
2. [Builder / Developer KYB](#builder--developer-kyb)
3. [Shortlet Operator KYB](#shortlet-operator-kyb)
4. [Integration Guide](#integration-guide)
5. [Cost Analysis](#cost-analysis)
6. [Compliance Requirements](#compliance-requirements)

---

## Overview

### Purpose

**Builder/Developer KYB:** Verify construction companies, property developers, contractors, architects, and engineers before allowing them to list projects or bid for contracts.

**Shortlet Operator KYB:** Verify hotels, shortlets, serviced apartments, and guesthouses before allowing them to list properties for short-term rentals.

### Verification Components

| Component | Builders | Shortlets | Purpose |
|-----------|----------|-----------|---------|
| CAC Registration | ✅ | ✅ | Basic business legitimacy |
| Professional Registration | ✅ COREN/CORBON | ❌ | Engineering/building credentials |
| Tax Registration | ✅ TIN | ✅ FIRS Hospitality | Tax compliance |
| Tourism Registration | ❌ | ✅ NTDC | Tourism board compliance |
| Insurance | ✅ Professional Indemnity | ⚠️ Public Liability | Risk coverage |
| Property Permits | ✅ Building Permits | ✅ Change of Use | Project/property authorization |
| Safety Certificates | ⚠️ Optional | ✅ Fire Safety | Guest safety |
| Environmental Health | ⚠️ Optional | ✅ Required | Health compliance |

---

## Builder / Developer KYB

### Service: `builder_kyb.py`

### Verification Flow

**Step 1: CAC Verification**
- Verify RC/BN/IT/LLP number
- Confirm company is active
- Check directors and shareholders

**Step 2: Professional Registration**
- **COREN** (Council for the Regulation of Engineering in Nigeria)
  - Required for: Engineers, Developers with engineering projects
  - Categories: Corporate, Professional, Graduate
  - Disciplines: Civil, Structural, Mechanical, Electrical
  - Must be ACTIVE with valid practicing license

- **CORBON** (Builders Registration Council of Nigeria)
  - Required for: Contractors, Builders
  - Categories: A, B, C, D (based on capacity)
  - Must be ACTIVE and not expired

**Step 3: Professional Indemnity Insurance**
- Minimum coverage: ₦10,000,000
- Policy type: Professional Indemnity
- Must be active (not expired)
- Verified through NAICOM (National Insurance Commission)

**Step 4: NHBF Registration** (Optional but recommended)
- National Housing and Building Fund
- Provides access to housing development funds
- Shows commitment to sector

**Step 5: Building Permits**
- Verify permits for all active projects
- Check with state building control authorities
- Ensure permits are not expired

### Example Usage

```python
from services.builder_kyb import BuilderKYBService

builder_service = BuilderKYBService()

result = await builder_service.comprehensive_builder_verification(
    rc_number="RC123456",
    company_name="ABC Construction Ltd",
    business_type="developer",
    registration_data={
        "coren_number": "COREN/12345",
        "principal_engineer": "Eng. John Doe",
        "corbon_number": "CORBON/67890",
        "insurance_policy_number": "POL123456789",
        "current_projects": [
            {
                "name": "Lekki Gardens Phase 3",
                "permit_number": "BP/2024/001",
                "state": "Lagos",
                "address": "Lekki, Lagos"
            }
        ]
    }
)

print(f"Status: {result['verification_status']}")
print(f"Risk: {result['risk_level']}")
print(f"Compliance: {result['compliance_score']}/100")
```

### API Response

```json
{
  "success": true,
  "verification_status": "VERIFIED",
  "risk_level": "LOW",
  "verifications": {
    "cac": {
      "verified": true,
      "data": {
        "company_name": "ABC Construction Ltd",
        "status": "ACTIVE",
        "directors": [...]
      }
    },
    "coren": {
      "verified": true,
      "data": {
        "engineer_name": "Eng. John Doe",
        "category": "Professional",
        "discipline": "Civil",
        "status": "ACTIVE"
      }
    },
    "corbon": {
      "verified": true,
      "data": {
        "category": "A",
        "status": "ACTIVE"
      }
    },
    "insurance": {
      "verified": true,
      "data": {
        "coverage_amount": 15000000,
        "status": "ACTIVE"
      }
    },
    "nhbf": {
      "verified": true
    },
    "building_permits": {
      "verified": true,
      "valid_permits": 1,
      "expired_permits": 0
    }
  },
  "compliance_score": 100.0,
  "missing_requirements": [],
  "recommendations": []
}
```

### Compliance Scoring

**Total: 100 points**

| Component | Points | Required |
|-----------|--------|----------|
| CAC Verification | 30 | ✅ Yes |
| COREN Registration | 20 | ⚠️ For engineers |
| CORBON Registration | 20 | ⚠️ For contractors |
| Professional Insurance | 15 | ✅ Yes |
| NHBF Registration | 10 | ❌ Optional |
| Building Permits | 5 | ⚠️ If projects exist |

**Risk Assessment:**

- **LOW Risk (80-100):** All required verifications pass
- **MEDIUM Risk (50-79):** Some verifications missing
- **HIGH Risk (<50):** Critical verifications failed

### Required Documents

**For Onboarding:**
1. CAC Certificate (RC/BN)
2. COREN Certificate (if engineer)
3. CORBON Certificate (if contractor)
4. Professional Indemnity Insurance Policy
5. Building Permits for active projects
6. TIN Certificate

---

## Shortlet Operator KYB

### Service: `shortlet_kyb.py`

### Verification Flow

**Step 1: CAC Verification**
- Verify RC/BN number
- Confirm company is active
- Check directors

**Step 2: FIRS Hospitality Tax Registration**
- Verify TIN for hospitality sector
- Check tax compliance status
- Ensure quarterly filings are up to date (within 3 months)

**Step 3: NTDC Registration** (for hotels/guesthouses)
- Nigerian Tourism Development Corporation
- Required for: Hotels, Guesthouses
- Optional for: Shortlets, Serviced Apartments
- Provides star rating

**Step 4: State Hospitality License**
- Required in all states
- Lagos: LASG Hospitality License
- Must be active and not expired

**Step 5: Property-Specific Permits**
- **Change of Use Permit:** Required for converting residential to commercial
- **Occupancy Permit:** Confirms property is safe for occupation
- Must be verified for EACH property

**Step 6: Fire Safety Certificates**
- **MANDATORY** for all properties
- Issued by State Fire Service
- Must be renewed annually
- Covers fire extinguishers, alarms, exits

**Step 7: Environmental Health Permits**
- Issued by State Environmental Health Office
- Covers hygiene, waste management, pest control
- Required for all properties

### Example Usage

```python
from services.shortlet_kyb import ShortletKYBService

shortlet_service = ShortletKYBService()

result = await shortlet_service.comprehensive_shortlet_verification(
    rc_number="RC789012",
    company_name="XYZ Hospitality Ltd",
    operator_type="shortlet",
    properties=[
        {
            "address": "15 Admiralty Way, Lekki Phase 1, Lagos",
            "state": "Lagos",
            "change_of_use_permit": "COU/2024/001",
            "occupancy_permit": "OCC/2024/001",
            "fire_safety_certificate": "FSC/2024/001",
            "env_health_permit": "EHP/2024/001"
        },
        {
            "address": "22 Banana Island, Ikoyi, Lagos",
            "state": "Lagos",
            "change_of_use_permit": "COU/2024/002",
            "occupancy_permit": "OCC/2024/002",
            "fire_safety_certificate": "FSC/2024/002",
            "env_health_permit": "EHP/2024/002"
        }
    ]
)

print(f"Status: {result['verification_status']}")
print(f"Risk: {result['risk_level']}")
print(f"Compliance: {result['compliance_score']}/100")
```

### API Response

```json
{
  "success": true,
  "verification_status": "VERIFIED",
  "risk_level": "LOW",
  "verifications": {
    "cac": {
      "verified": true
    },
    "firs_tax": {
      "verified": true,
      "data": {
        "tin": "12345678-0001",
        "compliance_status": "COMPLIANT",
        "last_filing_date": "2024-01-15"
      }
    },
    "ntdc": {
      "verified": true,
      "data": {
        "category": "Shortlet",
        "star_rating": 3,
        "status": "ACTIVE"
      }
    },
    "hospitality_license": {
      "verified": true,
      "data": {
        "license_number": "LASG/HOSP/2024/001",
        "status": "ACTIVE"
      }
    },
    "property_permits": {
      "all_verified": true,
      "valid_permits": 2,
      "expired_permits": 0,
      "missing_permits": 0
    },
    "fire_safety": {
      "all_verified": true,
      "valid_certificates": 2,
      "expired_certificates": 0
    },
    "environmental_health": {
      "all_verified": true,
      "valid_permits": 2
    }
  },
  "compliance_score": 100.0,
  "missing_requirements": [],
  "recommendations": []
}
```

### Compliance Scoring

**Total: 100 points**

| Component | Points | Required |
|-----------|--------|----------|
| CAC Verification | 20 | ✅ Yes |
| FIRS Tax Registration | 20 | ✅ Yes |
| NTDC Registration | 10 | ⚠️ For hotels |
| Hospitality License | 20 | ✅ Yes |
| Property Permits | 15 | ✅ Yes (all properties) |
| Fire Safety Certificates | 10 | ✅ Yes (all properties) |
| Environmental Health | 5 | ✅ Yes (all properties) |

**Risk Assessment:**

- **LOW Risk (80-100):** All verifications pass
- **MEDIUM Risk (50-79):** Some non-critical missing
- **HIGH Risk (<50):** Critical verifications failed (CAC, tax, fire safety)

### Required Documents

**For Onboarding:**
1. CAC Certificate (RC/BN)
2. TIN Certificate
3. FIRS Hospitality Tax Registration
4. State Hospitality License
5. NTDC Certificate (if hotel/guesthouse)

**For Each Property:**
1. Change of Use Permit
2. Occupancy Permit
3. Fire Safety Certificate
4. Environmental Health Permit
5. Property title documents

---

## Integration Guide

### tRPC Endpoints

```typescript
// server/routers.ts

verification: router({
  // Builder verification
  verifyBuilder: protectedProcedure
    .input(z.object({
      rc_number: z.string(),
      company_name: z.string(),
      business_type: z.enum(['developer', 'contractor', 'architect', 'engineer']),
      coren_number: z.string().optional(),
      principal_engineer: z.string().optional(),
      corbon_number: z.string().optional(),
      insurance_policy_number: z.string().optional(),
      current_projects: z.array(z.object({
        name: z.string(),
        permit_number: z.string(),
        state: z.string(),
        address: z.string()
      })).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Call Python builder_kyb service
      const result = await callPythonService('builder-kyb', {
        ...input,
        user_id: ctx.user.id
      });
      
      // Store verification result in database
      await storeVerificationResult(ctx.user.id, 'builder', result);
      
      return result;
    }),
  
  // Shortlet verification
  verifyShortlet: protectedProcedure
    .input(z.object({
      rc_number: z.string(),
      company_name: z.string(),
      operator_type: z.enum(['hotel', 'shortlet', 'apartment', 'guesthouse']),
      properties: z.array(z.object({
        address: z.string(),
        state: z.string(),
        change_of_use_permit: z.string(),
        occupancy_permit: z.string(),
        fire_safety_certificate: z.string(),
        env_health_permit: z.string()
      }))
    }))
    .mutation(async ({ input, ctx }) => {
      // Call Python shortlet_kyb service
      const result = await callPythonService('shortlet-kyb', {
        ...input,
        user_id: ctx.user.id
      });
      
      // Store verification result in database
      await storeVerificationResult(ctx.user.id, 'shortlet', result);
      
      return result;
    })
})
```

### Frontend Integration

**Route Registration:**

```typescript
// client/src/App.tsx

<Route path="/business/onboarding" component={BusinessOnboarding} />
```

**Usage in Components:**

```typescript
// Verify builder
const verifyBuilder = trpc.verification.verifyBuilder.useMutation({
  onSuccess: (data) => {
    if (data.verification_status === 'VERIFIED') {
      toast.success('Business verified successfully');
      router.push('/dashboard');
    } else {
      toast.warning(`Verification ${data.verification_status}: ${data.missing_requirements.join(', ')}`);
    }
  }
});

// Verify shortlet
const verifyShortlet = trpc.verification.verifyShortlet.useMutation({
  onSuccess: (data) => {
    if (data.verification_status === 'VERIFIED') {
      toast.success('Business verified successfully');
      router.push('/dashboard');
    }
  }
});
```

---

## Cost Analysis

### Builder Verification Costs

| Component | API Provider | Cost/Verification |
|-----------|--------------|-------------------|
| CAC Verification | Dojah/Youverify | ₦500 |
| COREN Verification | COREN Direct | ₦200 |
| CORBON Verification | CORBON Direct | ₦200 |
| Insurance Verification | NAICOM | ₦100 |
| NHBF Verification | NHBF Direct | ₦100 |
| Building Permit (per project) | State Authority | ₦300 |
| **Total (1 project)** | | **₦1,400** |
| **Total (3 projects)** | | **₦2,000** |

### Shortlet Verification Costs

| Component | API Provider | Cost/Verification |
|-----------|--------------|-------------------|
| CAC Verification | Dojah/Youverify | ₦500 |
| FIRS Tax Verification | FIRS Direct | ₦300 |
| NTDC Verification | NTDC Direct | ₦200 |
| Hospitality License | State Authority | ₦300 |
| Property Permits (per property) | State Authority | ₦400 |
| Fire Safety (per property) | Fire Service | ₦200 |
| Env Health (per property) | Health Office | ₦100 |
| **Total (1 property)** | | **₦2,000** |
| **Total (3 properties)** | | **₦3,400** |

### Monthly Cost Estimates

**Scenario: 100 builders, 200 shortlets per month**

| Business Type | Verifications | Cost/Verification | Monthly Total |
|---------------|---------------|-------------------|---------------|
| Builders (avg 2 projects) | 100 | ₦1,700 | ₦170,000 |
| Shortlets (avg 2 properties) | 200 | ₦2,700 | ₦540,000 |
| **Total** | **300** | | **₦710,000** (~$900) |

---

## Compliance Requirements

### Builder Regulatory Framework

**Federal Level:**
- CAC (Corporate Affairs Commission) - Business registration
- COREN (Council for the Regulation of Engineering) - Engineering practice
- CORBON (Builders Registration Council) - Building practice
- NAICOM (National Insurance Commission) - Insurance verification
- NHBF (National Housing and Building Fund) - Housing development

**State Level:**
- Building Control Authority - Building permits
- State Ministry of Works - Development approvals
- State Physical Planning Authority - Land use approvals

**Penalties for Non-Compliance:**
- Operating without COREN/CORBON: ₦500,000 fine or 2 years imprisonment
- Building without permit: Demolition + ₦1,000,000 fine
- Inadequate insurance: Contract invalidation + liability exposure

### Shortlet Regulatory Framework

**Federal Level:**
- CAC - Business registration
- FIRS - Hospitality tax (5% of revenue)
- NTDC - Tourism registration (hotels/guesthouses)

**State Level:**
- State Ministry of Tourism - Hospitality licensing
- State Fire Service - Fire safety certification
- State Environmental Health Office - Health permits
- State Physical Planning - Change of use permits

**Penalties for Non-Compliance:**
- Operating without hospitality license: ₦500,000 fine + closure
- No fire safety certificate: ₦250,000 fine + closure
- Tax evasion: 300% of tax + prosecution
- No change of use permit: Property sealing + ₦1,000,000 fine

---

## Environment Variables

```bash
# Builder KYB
COREN_API_KEY=your_coren_key
COREN_BASE_URL=https://api.coren.gov.ng
CORBON_API_KEY=your_corbon_key
CORBON_BASE_URL=https://api.corbon.gov.ng
LASG_BUILDING_CONTROL_KEY=your_lasg_key
NHBF_API_KEY=your_nhbf_key
NAICOM_API_KEY=your_naicom_key

# Shortlet KYB
FIRS_API_KEY=your_firs_key
FIRS_BASE_URL=https://api.firs.gov.ng
NTDC_API_KEY=your_ntdc_key
NTDC_BASE_URL=https://api.ntdc.gov.ng
LASG_HOSPITALITY_KEY=your_lasg_hospitality_key
FIRE_SERVICE_API_KEY=your_fire_service_key
ENV_HEALTH_API_KEY=your_env_health_key

# Service URLs
BUILDER_KYB_SERVICE_URL=http://localhost:5040
SHORTLET_KYB_SERVICE_URL=http://localhost:5041
```

---

## Testing

### Builder Verification Test

```python
# Test builder verification
async def test_builder_verification():
    service = BuilderKYBService()
    
    result = await service.comprehensive_builder_verification(
        rc_number="RC123456",
        company_name="Test Construction Ltd",
        business_type="developer",
        registration_data={
            "coren_number": "COREN/TEST123",
            "corbon_number": "CORBON/TEST456",
            "insurance_policy_number": "POL789",
            "current_projects": [
                {
                    "name": "Test Project",
                    "permit_number": "BP/TEST/001",
                    "state": "Lagos"
                }
            ]
        }
    )
    
    assert result['success'] == True
    assert result['verification_status'] in ['VERIFIED', 'PARTIAL', 'FAILED']
    assert 0 <= result['compliance_score'] <= 100
```

### Shortlet Verification Test

```python
# Test shortlet verification
async def test_shortlet_verification():
    service = ShortletKYBService()
    
    result = await service.comprehensive_shortlet_verification(
        rc_number="RC789012",
        company_name="Test Hospitality Ltd",
        operator_type="shortlet",
        properties=[
            {
                "address": "Test Address, Lagos",
                "state": "Lagos",
                "change_of_use_permit": "COU/TEST/001",
                "occupancy_permit": "OCC/TEST/001",
                "fire_safety_certificate": "FSC/TEST/001",
                "env_health_permit": "EHP/TEST/001"
            }
        ]
    )
    
    assert result['success'] == True
    assert result['verification_status'] in ['VERIFIED', 'PARTIAL', 'FAILED']
    assert 0 <= result['compliance_score'] <= 100
```

---

## Support & Resources

**For Builders:**
- COREN: www.coren.gov.ng | support@coren.gov.ng
- CORBON: www.corbon.gov.ng | info@corbon.gov.ng
- NHBF: www.nhbf.gov.ng

**For Shortlet Operators:**
- FIRS: www.firs.gov.ng | contactcentre@firs.gov.ng
- NTDC: www.ntdc.gov.ng | info@ntdc.gov.ng
- Lagos State (LASG): eservices.lagosstate.gov.ng

**General:**
- CAC: www.cac.gov.ng
- NAICOM: www.naicom.gov.ng

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0  
**Status:** Production-Ready
