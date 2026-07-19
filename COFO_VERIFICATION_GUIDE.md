# Certificate of Occupancy (C of O) Verification System

## Overview

The C of O Verification System is a comprehensive solution for verifying Nigerian Certificate of Occupancy documents. It includes bulk verification capabilities, automated OCR extraction using DeepSeek AI, email/SMS notifications, and integration with government registries.

## Features

### 1. Bulk Verification API

Upload CSV files containing multiple C of O certificates for batch verification.

**Key Features:**
- CSV file upload (up to 10MB)
- Batch processing with rate limiting
- Progress tracking in real-time
- Automatic results generation
- Email and SMS notifications

**CSV Format:**

Required columns:
- `cofONumber`: Certificate number
- `state`: State where property is located

Optional columns:
- `lga`: Local Government Area
- `propertyAddress`: Full property address
- `ownerName`: Name of certificate holder
- `itemId`: Client reference ID

**Example CSV:**
```csv
cofONumber,state,lga,propertyAddress,ownerName,itemId
LAG/2024/001,LAGOS,Ikeja,123 Allen Avenue,John Doe,REF-001
FCT/2023/456,FCT,Abuja Municipal,45 Gwarinpa Estate,Jane Smith,REF-002
```

### 2. DeepSeek OCR Integration

Automatically extract structured data from C of O document images using AI-powered OCR.

**Capabilities:**
- Extract certificate details (number, state, owner, dates, etc.)
- Validate document authenticity
- Compare multiple documents
- Batch process multiple images
- High-accuracy extraction with confidence scores

**Extracted Fields:**
- C of O Number
- State
- LGA
- Property Address
- Owner Name
- Issue Date
- Expiry Date
- Land Size
- Plot Number
- Registration Number
- Purpose

**Authenticity Validation:**
- Watermark detection
- Official seal verification
- Signature validation
- Document quality assessment
- Suspicious element detection

### 3. Email/SMS Notifications

Automated notifications for verification events.

**Notification Types:**
- Job started
- Job completed
- Job failed
- Single verification results
- Scheduled verification reminders
- Report generation

**Supported Channels:**
- Email (via built-in notification system)
- SMS (via Twilio integration)

**Configuration:**
Set environment variables for Twilio:
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### 4. Frontend UI Components

User-friendly interfaces for managing bulk verifications.

**Pages:**
- `/bulk-verification` - Upload and manage bulk verification jobs
- `/bulk-verification/:jobId` - View detailed job status and results

**Features:**
- Drag-and-drop CSV upload
- Real-time progress tracking
- Job statistics dashboard
- Results download
- Job cancellation
- Auto-refresh for active jobs

## API Reference

### Bulk Verification Endpoints

#### Upload CSV
```typescript
trpc.bulkVerification.uploadCSV.useMutation({
  fileName: string;
  fileBase64: string;
  metadata?: {
    clientName?: string;
    department?: string;
    requestReference?: string;
    notificationEmail?: string;
    notificationPhone?: string;
  };
})
```

#### Get Job Status
```typescript
trpc.bulkVerification.getJobStatus.useQuery({
  jobId: string;
})
```

#### List Jobs
```typescript
trpc.bulkVerification.listJobs.useQuery({
  limit?: number;
  offset?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
})
```

#### Cancel Job
```typescript
trpc.bulkVerification.cancelJob.useMutation({
  jobId: string;
})
```

#### Get Statistics
```typescript
trpc.bulkVerification.getStatistics.useQuery()
```

### DeepSeek OCR Endpoints

#### Extract C of O Data
```typescript
trpc.deepseekOCR.extractCofOData.useMutation({
  imageBase64: string;
  fileName: string;
})
```

#### Extract from URL
```typescript
trpc.deepseekOCR.extractFromUrl.useMutation({
  imageUrl: string;
})
```

#### Validate Authenticity
```typescript
trpc.deepseekOCR.validateAuthenticity.useMutation({
  imageUrl: string;
})
```

#### Compare Documents
```typescript
trpc.deepseekOCR.compareDocuments.useMutation({
  imageUrl1: string;
  imageUrl2: string;
})
```

#### Batch Extract
```typescript
trpc.deepseekOCR.batchExtract.useMutation({
  imageUrls: string[]; // Max 20
})
```

## Database Schema

### Bulk Verification Jobs
```sql
CREATE TABLE bulk_verification_jobs (
  id SERIAL PRIMARY KEY,
  jobId VARCHAR(100) UNIQUE NOT NULL,
  userId INTEGER NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  fileUrl TEXT NOT NULL,
  totalItems INTEGER DEFAULT 0,
  processedItems INTEGER DEFAULT 0,
  successfulItems INTEGER DEFAULT 0,
  failedItems INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  progress DECIMAL(5,2) DEFAULT 0.00,
  resultsFileUrl TEXT,
  errorLog JSON,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  estimatedCompletionAt TIMESTAMP,
  priority INTEGER DEFAULT 0,
  rateLimitPerMinute INTEGER DEFAULT 10,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Bulk Verification Items
```sql
CREATE TABLE bulk_verification_items (
  id SERIAL PRIMARY KEY,
  jobId INTEGER NOT NULL REFERENCES bulk_verification_jobs(id),
  rowNumber INTEGER NOT NULL,
  itemId VARCHAR(100),
  cofONumber VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(100),
  propertyAddress TEXT,
  ownerName VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  verificationScore INTEGER,
  isVerified BOOLEAN,
  verificationDetails JSON,
  errorMessage TEXT,
  retryCount INTEGER DEFAULT 0,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  processingTimeMs INTEGER,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Usage Examples

### Example 1: Upload Bulk Verification Job

```typescript
import { trpc } from "@/lib/trpc";

function BulkUpload() {
  const uploadMutation = trpc.bulkVerification.uploadCSV.useMutation({
    onSuccess: (data) => {
      console.log("Job created:", data.jobId);
    },
  });

  const handleUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      
      await uploadMutation.mutateAsync({
        fileName: file.name,
        fileBase64: base64,
        metadata: {
          clientName: "ABC Corporation",
          notificationEmail: "alerts@example.com",
          notificationPhone: "+234 800 000 0000",
        },
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <input type="file" accept=".csv" onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    }} />
  );
}
```

### Example 2: Extract C of O Data from Image

```typescript
import { trpc } from "@/lib/trpc";

function OCRExtraction() {
  const extractMutation = trpc.deepseekOCR.extractCofOData.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        console.log("Extracted data:", result.data);
        console.log("Confidence:", result.confidence);
      }
    },
  });

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      
      await extractMutation.mutateAsync({
        imageBase64: base64,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <input type="file" accept="image/*" onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) handleImageUpload(file);
    }} />
  );
}
```

### Example 3: Monitor Job Progress

```typescript
import { trpc } from "@/lib/trpc";

function JobMonitor({ jobId }: { jobId: string }) {
  const jobQuery = trpc.bulkVerification.getJobStatus.useQuery(
    { jobId },
    {
      refetchInterval: (data) => {
        // Auto-refresh every 5 seconds if processing
        if (data?.job.status === "processing") {
          return 5000;
        }
        return false;
      },
    }
  );

  if (!jobQuery.data) return <div>Loading...</div>;

  const { job, summary } = jobQuery.data;

  return (
    <div>
      <h2>Job Status: {job.status}</h2>
      <p>Progress: {summary.progress.toFixed(1)}%</p>
      <p>Processed: {summary.processed} / {summary.total}</p>
      <p>Successful: {summary.successful}</p>
      <p>Failed: {summary.failed}</p>
      
      {job.resultsFileUrl && (
        <a href={job.resultsFileUrl} download>
          Download Results
        </a>
      )}
    </div>
  );
}
```

## Best Practices

### 1. CSV File Preparation
- Ensure all required columns are present
- Use consistent formatting for certificate numbers
- Validate data before upload
- Keep file size under 10MB
- Use UTF-8 encoding

### 2. Rate Limiting
- Default: 10 verifications per minute
- Adjust `rateLimitPerMinute` based on your needs
- Higher rates may impact government registry APIs

### 3. Error Handling
- Check `errorLog` in job results for failed items
- Retry failed items separately if needed
- Monitor notification delivery status

### 4. OCR Best Practices
- Use high-resolution images (min 1920x1080)
- Ensure good lighting and contrast
- Avoid blurry or distorted images
- Scan documents flat without folds
- Use JPEG or PNG format

### 5. Security
- Store Twilio credentials securely in environment variables
- Validate user permissions before bulk operations
- Sanitize CSV input data
- Use HTTPS for all API calls

## Troubleshooting

### Issue: CSV Upload Fails
**Solution:** Check file format, size, and required columns. Ensure UTF-8 encoding.

### Issue: Low OCR Confidence
**Solution:** Improve image quality, ensure document is flat and well-lit, use higher resolution.

### Issue: Notifications Not Sent
**Solution:** Verify Twilio credentials are set correctly. Check phone number format (+234...).

### Issue: Job Stuck in Processing
**Solution:** Check server logs for errors. Cancel and retry if necessary.

### Issue: Database Connection Errors
**Solution:** Ensure SSL connection is properly configured in database settings.

## Future Enhancements

- [ ] Add support for more document types (Deed of Assignment, Survey Plans)
- [ ] Implement advanced fraud detection using ML
- [ ] Add geospatial validation with coordinate matching
- [ ] Support for scheduled recurring verifications
- [ ] Custom report templates
- [ ] API webhooks for job completion
- [ ] Multi-language support
- [ ] Mobile app integration

## Support

For issues or questions:
- Check the troubleshooting section above
- Review API documentation
- Contact support at https://help.manus.im

## License

Proprietary - All rights reserved
