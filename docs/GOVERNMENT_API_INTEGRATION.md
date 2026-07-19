# Government Land Registry API Integration Guide

This document outlines the integration strategy for connecting with Nigerian state land registries to verify Certificate of Occupancy (C of O) and land records.

## Overview

The platform integrates with multiple state-level land registries across Nigeria to provide real-time verification of land ownership, C of O authenticity, and property records. This integration enables automated verification and reduces fraud in land transactions.

## Supported States

### 1. Lagos State Land Registry

**API Base URL**: `https://api.lagoslandbureau.gov.ng/v1`

**Authentication**: OAuth 2.0 Bearer Token

**Key Endpoints**:
- `GET /land-records/{parcelId}` - Retrieve land record by parcel ID
- `GET /cofo/verify/{cofoNumber}` - Verify C of O authenticity
- `GET /ownership-history/{parcelId}` - Get ownership transfer history
- `POST /verification-request` - Submit verification request for manual review

**Rate Limits**: 100 requests per minute

**Data Format**: JSON

**Required Credentials**:
- Client ID
- Client Secret
- API Key

### 2. Federal Capital Territory (FCT) Abuja Land Registry

**API Base URL**: `https://api.fct.gov.ng/land-registry/v1`

**Authentication**: API Key (Header: `X-API-Key`)

**Key Endpoints**:
- `GET /parcels/{parcelId}` - Retrieve parcel information
- `GET /cofo/{cofoNumber}` - Verify C of O
- `GET /transactions/{parcelId}` - Get transaction history
- `POST /verify` - Submit batch verification requests

**Rate Limits**: 50 requests per minute

**Data Format**: JSON

**Required Credentials**:
- API Key
- Organization ID

### 3. Rivers State Land Registry

**API Base URL**: `https://api.riversstate.gov.ng/lands/v1`

**Authentication**: Basic Auth + API Key

**Key Endpoints**:
- `GET /records/{parcelId}` - Get land record
- `GET /certificates/{cofoNumber}` - Verify certificate
- `GET /owners/{parcelId}` - Get ownership details

**Rate Limits**: 30 requests per minute

**Data Format**: JSON

**Required Credentials**:
- Username
- Password
- API Key

### 4. Kano State Land Registry

**API Base URL**: `https://api.kanostate.gov.ng/land-bureau/v1`

**Authentication**: JWT Token

**Key Endpoints**:
- `GET /land/{parcelId}` - Retrieve land information
- `GET /verify-cofo` - Verify C of O (Query params: cofoNumber, parcelId)
- `GET /history/{parcelId}` - Get ownership history

**Rate Limits**: 40 requests per minute

**Data Format**: JSON

**Required Credentials**:
- Client ID
- Client Secret

### 5. Oyo State Land Registry

**API Base URL**: `https://api.oyostate.gov.ng/lands/api/v1`

**Authentication**: OAuth 2.0

**Key Endpoints**:
- `GET /parcels/search` - Search parcels by various criteria
- `GET /cofo/validate/{cofoNumber}` - Validate C of O
- `GET /ownership/{parcelId}` - Get current ownership

**Rate Limits**: 60 requests per minute

**Data Format**: JSON

**Required Credentials**:
- Client ID
- Client Secret
- Redirect URI

## Integration Architecture

### Service Layer Structure

```
server/
  services/
    governmentRegistry/
      base/
        GovernmentRegistryClient.ts       # Base client with common methods
        types.ts                           # Shared types and interfaces
        errors.ts                          # Custom error classes
      
      implementations/
        LagosRegistryClient.ts             # Lagos State implementation
        FCTRegistryClient.ts               # FCT Abuja implementation
        RiversRegistryClient.ts            # Rivers State implementation
        KanoRegistryClient.ts              # Kano State implementation
        OyoRegistryClient.ts               # Oyo State implementation
      
      RegistryFactory.ts                   # Factory to get appropriate client
      RegistryAggregator.ts                # Aggregates results from multiple registries
```

### Base Client Interface

```typescript
interface GovernmentRegistryClient {
  // Verify C of O authenticity
  verifyCofO(cofoNumber: string): Promise<CofOVerificationResult>;
  
  // Get land record by parcel ID
  getLandRecord(parcelId: string): Promise<LandRecordData>;
  
  // Get ownership history
  getOwnershipHistory(parcelId: string): Promise<OwnershipRecord[]>;
  
  // Submit verification request
  submitVerificationRequest(data: VerificationRequest): Promise<VerificationResponse>;
  
  // Check API health
  healthCheck(): Promise<boolean>;
}
```

### Data Models

```typescript
interface CofOVerificationResult {
  isValid: boolean;
  cofoNumber: string;
  parcelId: string;
  ownerName: string;
  issueDate: Date;
  expiryDate?: Date;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  verificationScore: number; // 0-100
  verificationDetails: {
    documentAuthenticity: boolean;
    ownershipMatch: boolean;
    noEncumbrances: boolean;
    taxCompliance: boolean;
  };
}

interface LandRecordData {
  parcelId: string;
  address: string;
  state: string;
  lga: string;
  landSize: number;
  landSizeUnit: string;
  landUse: string;
  currentOwner: {
    name: string;
    contact?: string;
    idNumber?: string;
  };
  cofoNumber?: string;
  registrationDate: Date;
  lastUpdated: Date;
}

interface OwnershipRecord {
  transferDate: Date;
  fromOwner: string;
  toOwner: string;
  transferType: 'sale' | 'inheritance' | 'gift' | 'court_order' | 'government_allocation';
  transferValue?: number;
  deedNumber?: string;
  registrationNumber?: string;
}
```

## Implementation Steps

### Phase 1: Setup Base Infrastructure

1. Create base client class with common HTTP methods
2. Implement authentication handlers for different auth types (OAuth, API Key, JWT)
3. Set up error handling and retry logic
4. Implement rate limiting and request queuing
5. Add logging and monitoring

### Phase 2: Implement State-Specific Clients

1. Implement Lagos State client
2. Implement FCT Abuja client
3. Implement Rivers State client
4. Implement Kano State client
5. Implement Oyo State client

### Phase 3: Create Aggregation Layer

1. Build registry factory to instantiate appropriate client
2. Implement aggregator to query multiple registries
3. Add result merging and conflict resolution
4. Implement fallback mechanisms

### Phase 4: Integration with Existing Services

1. Update C of O verification service to use government APIs
2. Enhance land record creation with government data validation
3. Add automated verification workflows
4. Implement webhook handlers for async verification responses

### Phase 5: Caching and Optimization

1. Implement Redis caching for verification results
2. Add background jobs for bulk verification
3. Optimize API call patterns to reduce costs
4. Implement smart retry strategies

## Environment Variables

Add the following environment variables for each state registry:

```bash
# Lagos State
LAGOS_REGISTRY_CLIENT_ID=your_client_id
LAGOS_REGISTRY_CLIENT_SECRET=your_client_secret
LAGOS_REGISTRY_API_KEY=your_api_key
LAGOS_REGISTRY_BASE_URL=https://api.lagoslandbureau.gov.ng/v1

# FCT Abuja
FCT_REGISTRY_API_KEY=your_api_key
FCT_REGISTRY_ORG_ID=your_org_id
FCT_REGISTRY_BASE_URL=https://api.fct.gov.ng/land-registry/v1

# Rivers State
RIVERS_REGISTRY_USERNAME=your_username
RIVERS_REGISTRY_PASSWORD=your_password
RIVERS_REGISTRY_API_KEY=your_api_key
RIVERS_REGISTRY_BASE_URL=https://api.riversstate.gov.ng/lands/v1

# Kano State
KANO_REGISTRY_CLIENT_ID=your_client_id
KANO_REGISTRY_CLIENT_SECRET=your_client_secret
KANO_REGISTRY_BASE_URL=https://api.kanostate.gov.ng/land-bureau/v1

# Oyo State
OYO_REGISTRY_CLIENT_ID=your_client_id
OYO_REGISTRY_CLIENT_SECRET=your_client_secret
OYO_REGISTRY_REDIRECT_URI=your_redirect_uri
OYO_REGISTRY_BASE_URL=https://api.oyostate.gov.ng/lands/api/v1

# General Settings
REGISTRY_CACHE_TTL=3600  # Cache results for 1 hour
REGISTRY_REQUEST_TIMEOUT=30000  # 30 seconds
REGISTRY_MAX_RETRIES=3
```

## Error Handling

### Common Error Scenarios

1. **API Unavailable**: Implement fallback to manual verification workflow
2. **Rate Limit Exceeded**: Queue requests and implement exponential backoff
3. **Authentication Failure**: Refresh tokens automatically, alert admins if persistent
4. **Invalid Response**: Log error, return partial data with warning
5. **Timeout**: Retry with increased timeout, fallback to cached data if available

### Error Response Format

```typescript
interface RegistryError {
  code: string;
  message: string;
  state: string;
  timestamp: Date;
  retryable: boolean;
  fallbackAvailable: boolean;
}
```

## Security Considerations

1. **Credential Management**: Store all API credentials in secure environment variables
2. **Data Encryption**: Encrypt sensitive data in transit and at rest
3. **Access Control**: Limit API access to authorized services only
4. **Audit Logging**: Log all API calls for compliance and debugging
5. **Rate Limiting**: Implement client-side rate limiting to prevent abuse
6. **Webhook Security**: Verify webhook signatures from government services

## Monitoring and Alerts

### Key Metrics to Monitor

1. API response times
2. Success/failure rates per state
3. Rate limit usage
4. Cache hit rates
5. Verification accuracy scores

### Alert Conditions

1. API downtime > 5 minutes
2. Error rate > 10% for any state
3. Rate limit approaching 80% capacity
4. Authentication failures
5. Unusual spike in verification requests

## Testing Strategy

### Unit Tests

- Test each state client independently
- Mock API responses for different scenarios
- Test error handling and retry logic

### Integration Tests

- Test end-to-end verification flows
- Test aggregation and conflict resolution
- Test fallback mechanisms

### Load Tests

- Simulate high-volume verification requests
- Test rate limiting behavior
- Verify caching effectiveness

## Compliance and Legal

1. Ensure compliance with Nigerian Data Protection Regulation (NDPR)
2. Obtain necessary licenses and approvals from each state
3. Maintain audit trails for all verifications
4. Implement data retention policies
5. Provide transparency reports to government agencies

## Future Enhancements

1. Add support for more states (Kaduna, Enugu, Delta, etc.)
2. Implement real-time webhook notifications from registries
3. Add bulk verification API for large datasets
4. Integrate with blockchain for immutable verification records
5. Build analytics dashboard for verification trends
6. Add machine learning for fraud detection

## Support and Maintenance

### Contact Information

- **Lagos State Land Bureau**: support@lagoslandbureau.gov.ng
- **FCT Land Registry**: landregistry@fct.gov.ng
- **Rivers State**: lands@riversstate.gov.ng
- **Kano State**: landbureau@kanostate.gov.ng
- **Oyo State**: lands@oyostate.gov.ng

### Maintenance Schedule

- Weekly: Review error logs and performance metrics
- Monthly: Update API credentials and test all endpoints
- Quarterly: Review and update integration documentation
- Annually: Renew API licenses and agreements

## Appendix

### Sample API Requests

#### Lagos State - Verify C of O

```bash
curl -X GET "https://api.lagoslandbureau.gov.ng/v1/cofo/verify/LG-COFO-2024-12345" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-API-Key: YOUR_API_KEY"
```

#### FCT Abuja - Get Land Record

```bash
curl -X GET "https://api.fct.gov.ng/land-registry/v1/parcels/FCT-P-2024-67890" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "X-Organization-ID: YOUR_ORG_ID"
```

### Sample API Responses

#### Successful C of O Verification

```json
{
  "status": "success",
  "data": {
    "isValid": true,
    "cofoNumber": "LG-COFO-2024-12345",
    "parcelId": "LG-P-2024-001",
    "ownerName": "John Doe",
    "issueDate": "2024-01-15T00:00:00Z",
    "status": "active",
    "verificationScore": 95,
    "verificationDetails": {
      "documentAuthenticity": true,
      "ownershipMatch": true,
      "noEncumbrances": true,
      "taxCompliance": true
    }
  }
}
```

#### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "COFO_NOT_FOUND",
    "message": "Certificate of Occupancy not found in registry",
    "timestamp": "2024-01-20T10:30:00Z",
    "retryable": false
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Author**: Platform Development Team  
**Review Cycle**: Quarterly
