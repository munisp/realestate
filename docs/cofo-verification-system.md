# Certificate of Occupancy (C of O) Verification System

## Overview

The C of O Verification System provides comprehensive verification of Nigerian Certificate of Occupancy documents through integration with government registries, automated document processing, and SMS notifications.

## Features

### 1. Government Registry Integration
- **Lagos State Registry**: Verifies certificates with format `LAG/YYYY/XXXXXX`
- **FCT Abuja Registry**: Verifies certificates with format `FCT/YYYY/XXXXXX`
- Batch verification support for multiple certificates
- Automatic registry detection based on certificate format

### 2. Document Processing
- Upload C of O documents (PDF, JPG, PNG)
- Automated OCR extraction of certificate details
- File size limit: 10MB
- Supported formats: PDF, JPEG, PNG

### 3. SMS Notifications
- Automatic SMS delivery to Nigerian phone numbers
- Verification results sent via SMS
- Retry logic for failed deliveries
- Delivery status tracking

### 4. Verification History
- Complete audit trail of all verifications
- Search by certificate number
- Statistics and success rate tracking
- SMS delivery rate monitoring

## Architecture

### Backend Services

#### 1. Mock Twilio SMS Service (`server/services/mockTwilioSms.ts`)
Simulates SMS delivery for testing without requiring actual Twilio credentials.

**Features:**
- Nigerian phone number validation (+234 format)
- Retry logic with configurable attempts
- Delivery status tracking
- Bulk SMS support
- 95% simulated success rate

**Usage:**
```typescript
import { mockTwilioSMS } from './server/services/mockTwilioSms';

const result = await mockTwilioSMS.sendSMS(
  '+2348012345678',
  'Your verification message'
);
```

#### 2. Mock Government Registry Service (`server/services/mockGovernmentRegistry.ts`)
Simulates Nigerian government registry APIs for testing.

**Features:**
- Lagos State and FCT Abuja registry simulation
- Certificate verification with confidence scoring
- Search by owner name or property address
- Batch verification support
- Encumbrance tracking

**Mock Data:**
- `LAG/2023/001234` - Active Lagos certificate
- `LAG/2022/005678` - Active Lagos certificate with mortgage
- `FCT/2023/009876` - Active FCT Abuja certificate
- `FCT/2021/003456` - Active FCT Abuja certificate
- `LAG/2000/001111` - Expired certificate

**Usage:**
```typescript
import { mockGovernmentRegistry } from './server/services/mockGovernmentRegistry';

const result = await mockGovernmentRegistry.verifyCertificate('LAG/2023/001234');
```

#### 3. C of O Verification Service (`server/services/cofoVerification.ts`)
Main orchestration service that coordinates document processing, registry verification, and notifications.

**Features:**
- End-to-end verification workflow
- Document OCR extraction
- Registry verification
- SMS notification delivery
- Verification history management
- Statistics tracking

**Usage:**
```typescript
import { cofoVerificationService } from './server/services/cofoVerification';

const result = await cofoVerificationService.verifyCertificate({
  certificateNumber: 'LAG/2023/001234',
  ownerName: 'Adebayo Ogunlesi',
  propertyAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
  phoneNumber: '+2348012345678',
  documentUrl: 'https://storage.example.com/cofo/document.pdf'
});
```

### Frontend Components

#### C of O Verification Page (`client/src/pages/COFOVerification.tsx`)

**Features:**
- Document upload with drag-and-drop
- Manual certificate entry form
- Real-time verification results
- Verification history display
- Statistics dashboard

**Sections:**
1. **Statistics Cards**: Total verifications, verified count, success rate, SMS delivery rate
2. **Verify Certificate Tab**:
   - Document upload area
   - Certificate details form
   - Phone number for SMS notifications
   - Real-time verification results
3. **History Tab**:
   - List of recent verifications
   - Search functionality
   - Status badges

### API Endpoints (tRPC)

#### `cofo.verify`
Verify a single C of O certificate.

**Input:**
```typescript
{
  certificateNumber: string;
  ownerName: string;
  propertyAddress: string;
  phoneNumber?: string;
  documentUrl?: string;
}
```

**Output:**
```typescript
{
  verificationId: string;
  status: 'verified' | 'not_verified' | 'pending' | 'error';
  certificateNumber: string;
  registryVerification: RegistryVerificationResult;
  documentAnalysis?: {...};
  smsNotification?: SMSDeliveryResult;
  timestamp: Date;
  summary: string;
}
```

#### `cofo.batchVerify`
Verify multiple certificates in batch.

#### `cofo.getHistory`
Get verification history with pagination.

#### `cofo.searchHistory`
Search verification history by certificate number.

#### `cofo.getStats`
Get verification statistics.

## Phone Number Validation

The system validates Nigerian phone numbers in multiple formats:

- **International format**: `+234XXXXXXXXXX` (13 digits)
- **Local format**: `0XXXXXXXXXX` (11 digits)
- **Short format**: `XXXXXXXXXX` (10 digits)

All formats are normalized to `+234XXXXXXXXXX` for SMS delivery.

**Valid prefixes**: 7, 8, or 9 (e.g., +2348012345678)

## Certificate Number Formats

### Lagos State
- Format: `LAG/YYYY/XXXXXX`
- Example: `LAG/2023/001234`

### FCT Abuja
- Format: `FCT/YYYY/XXXXXX`
- Example: `FCT/2023/009876`

## Verification Workflow

1. **Document Upload** (Optional)
   - User uploads C of O document
   - System validates file type and size
   - Document is stored temporarily

2. **OCR Extraction** (If document provided)
   - Extract certificate number
   - Extract owner name
   - Extract property address
   - Confidence score calculation

3. **Registry Verification**
   - Detect registry from certificate format
   - Query government registry API
   - Retrieve certificate details
   - Calculate confidence score

4. **SMS Notification** (If phone provided)
   - Format verification results
   - Send SMS to provided number
   - Retry on failure (up to 3 attempts)
   - Track delivery status

5. **Result Storage**
   - Store verification in history
   - Update statistics
   - Return results to user

## Error Handling

### Document Upload Errors
- **Invalid file type**: Only PDF, JPG, PNG allowed
- **File too large**: Maximum 10MB
- **Upload failed**: Retry or contact support

### Verification Errors
- **Invalid certificate format**: Check format (LAG/YYYY/XXXXXX or FCT/YYYY/XXXXXX)
- **Certificate not found**: Certificate may not exist in registry
- **Registry API unavailable**: Temporary issue, retry later
- **OCR extraction failed**: Enter details manually

### SMS Delivery Errors
- **Invalid phone number**: Check Nigerian phone format
- **Delivery failed**: Automatic retry up to 3 times
- **Network error**: Temporary issue, check delivery status

## Statistics Tracking

The system tracks:
- **Total verifications**: All verification attempts
- **Verified count**: Successfully verified certificates
- **Not verified count**: Certificates not found
- **Error count**: Failed verifications
- **Success rate**: (Verified / Total) × 100
- **SMS delivery rate**: (Delivered / Attempted) × 100

## Production Deployment

### Switching to Real Services

#### 1. Twilio SMS Integration

Replace mock service with real Twilio:

```typescript
// Install Twilio SDK
npm install twilio

// Create real Twilio service
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string) {
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to
  });
  return message;
}
```

**Environment Variables:**
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number

#### 2. Government Registry APIs

Replace mock service with real API clients:

**Lagos State Registry:**
```typescript
// Contact Lagos State Ministry of Lands
// API endpoint: https://lands.lagosstate.gov.ng/api/verify
// Authentication: API key required

export async function verifyLagosRegistry(certificateNumber: string) {
  const response = await fetch('https://lands.lagosstate.gov.ng/api/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LAGOS_REGISTRY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ certificateNumber })
  });
  return response.json();
}
```

**FCT Abuja Registry:**
```typescript
// Contact FCT Administration
// API endpoint: https://fct.gov.ng/lands/api/verify
// Authentication: API key required

export async function verifyFCTRegistry(certificateNumber: string) {
  const response = await fetch('https://fct.gov.ng/lands/api/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FCT_REGISTRY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ certificateNumber })
  });
  return response.json();
}
```

**Environment Variables:**
- `LAGOS_REGISTRY_API_KEY`: Lagos State registry API key
- `FCT_REGISTRY_API_KEY`: FCT Abuja registry API key

#### 3. Document Storage

Upload documents to S3:

```typescript
import { storagePut } from './storage';

export async function uploadDocument(file: File) {
  const buffer = await file.arrayBuffer();
  const { url } = await storagePut(
    `cofo-documents/${Date.now()}-${file.name}`,
    Buffer.from(buffer),
    file.type
  );
  return url;
}
```

## Testing

### Test Certificates

Use these mock certificates for testing:

1. **Valid Lagos Certificate**
   - Number: `LAG/2023/001234`
   - Owner: Adebayo Ogunlesi
   - Address: 15 Admiralty Way, Lekki Phase 1, Lagos

2. **Valid FCT Certificate**
   - Number: `FCT/2023/009876`
   - Owner: Ibrahim Yusuf
   - Address: Plot 123, Maitama District, Abuja

3. **Expired Certificate**
   - Number: `LAG/2000/001111`
   - Status: Expired

### Test Phone Numbers

Use Nigerian phone numbers in any format:
- `+2348012345678`
- `08012345678`
- `8012345678`

## Future Enhancements

1. **Database Integration**
   - Store verification history in database
   - User authentication for private verifications
   - Admin dashboard for monitoring

2. **Advanced OCR**
   - Integrate with DeepSeek or other OCR services
   - Support for more document formats
   - Handwriting recognition

3. **Additional Registries**
   - Rivers State registry
   - Kano State registry
   - Other Nigerian states

4. **Blockchain Integration**
   - Store verification hashes on blockchain
   - Immutable audit trail
   - Certificate authenticity proof

5. **Email Notifications**
   - Send detailed reports via email
   - PDF certificate of verification
   - Scheduled verification reminders

6. **API Rate Limiting**
   - Implement rate limiting for batch operations
   - Queue management for large batches
   - Priority queue for urgent verifications

## Support

For issues or questions:
- Check verification history for past results
- Review error messages for troubleshooting
- Contact system administrator for registry API access
- Submit feedback for feature requests

## License

Proprietary - Real Estate Platform
