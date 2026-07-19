# Real Document Testing Procedures

## Overview

This document outlines the procedures for testing the OCR service with real documents to validate accuracy and tune confidence thresholds.

## Prerequisites

- OCR service deployed and running (CPU or GPU)
- Real document samples collected
- Python 3.8+ with required dependencies

## Step 1: Prepare Test Documents

### 1.1 Document Collection

Collect at least 30 documents of each type:
- **Nigerian Passports**: 30+ samples
- **NIN Cards**: 30+ samples
- **International Passports**: 30+ samples (various countries)
- **Selfies**: 60+ samples (matching and non-matching pairs)

### 1.2 Create Configuration File

Copy the template and fill in document paths:

\`\`\`bash
cd services/ocr-service/tests
cp real_documents_config.template.json real_documents_config.json
\`\`\`

Edit `real_documents_config.json`:

\`\`\`json
{
  "documents": [
    {
      "file_path": "/path/to/nigerian_passport_001.jpg",
      "document_type": "nigerian_passport",
      "expected_data": {
        "passport_number": "A12345678",
        "surname": "OKONKWO",
        "given_names": "CHINUA ACHEBE",
        "date_of_birth": "1990-05-15",
        "date_of_issue": "2020-01-10",
        "date_of_expiry": "2030-01-09",
        "place_of_birth": "LAGOS",
        "nationality": "NIGERIAN",
        "sex": "M"
      }
    }
  ]
}
\`\`\`

**Important**: Manually verify all expected data against the actual documents.

## Step 2: Run OCR Accuracy Tests

### 2.1 Start OCR Service

\`\`\`bash
# CPU deployment
kubectl apply -f k8s/deployment.yaml

# GPU deployment (recommended)
kubectl apply -f k8s/gpu/deployment-gpu.yaml

# Port forward for local testing
kubectl port-forward svc/ocr-service 8000:8000
\`\`\`

### 2.2 Upload Documents

\`\`\`bash
./upload_real_documents.py
\`\`\`

**Expected output**:
\`\`\`
📤 Uploading 90 documents...
✅ Report generated:
  JSON: reports/accuracy_report_20251117_120000.json
  CSV:  reports/accuracy_report_20251117_120000.csv

📊 Summary:
  Total documents: 90
  Successful: 87
  Failed: 3
  Average accuracy: 91.2%
\`\`\`

### 2.3 Analyze Results

\`\`\`bash
./measure_accuracy.py reports/accuracy_report_20251117_120000.json
\`\`\`

**Expected output**:
\`\`\`
📊 Accuracy Analysis Report

By Document Type:
  nigerian_passport:
    Count: 30
    Mean: 93.5%
    Std: 4.2%
    Range: 85.0% - 100.0%
  
  nin_card:
    Count: 28
    Mean: 89.3%
    Std: 6.1%
    Range: 78.0% - 98.0%
  
  international_passport:
    Count: 29
    Mean: 91.8%
    Std: 5.3%
    Range: 82.0% - 100.0%

By Field:
  passport_number: 96.7% (29/30)
  surname: 95.0% (28/30)
  given_names: 93.3% (28/30)
  date_of_birth: 91.7% (27/30)
  nationality: 98.3% (29/30)
\`\`\`

## Step 3: Run Face Matching Tests

### 3.1 Prepare Face Match Pairs

Create `face_match_config.json`:

\`\`\`json
{
  "pairs": [
    {
      "person_id": "person_001",
      "document_path": "/path/to/passport_001.jpg",
      "selfie_path": "/path/to/selfie_001.jpg",
      "is_match": true
    },
    {
      "person_id": "person_001",
      "document_path": "/path/to/passport_001.jpg",
      "selfie_path": "/path/to/selfie_002.jpg",
      "is_match": false
    }
  ]
}
\`\`\`

**Important**: Include both matching and non-matching pairs (50/50 split recommended).

### 3.2 Run Face Matching Validation

\`\`\`bash
./validate_face_matching.py
\`\`\`

**Expected output**:
\`\`\`
👤 Validating 60 face match pairs...

👤 Face Matching Validation Report

Total pairs tested: 60
  True matches: 30
  True non-matches: 30

Confusion Matrix:
  True Positive:  28
  True Negative:  27
  False Positive: 3
  False Negative: 2

Metrics:
  Accuracy:  91.67%
  Precision: 90.32%
  Recall:    93.33%
  F1 Score:  91.80%
  FPR:       10.00%
  FNR:       6.67%
  ROC AUC:   0.9567

Threshold Analysis:
  Current threshold: 0.6
  Optimal threshold: 0.6234
  At optimal: TPR=93.33%, FPR=6.67%
\`\`\`

## Step 4: Tune Confidence Thresholds

### 4.1 Run Confidence Tuning

\`\`\`bash
./tune_confidence.py \
  reports/accuracy_report_20251117_120000.json \
  reports/face_match_report_20251117_120000.json
\`\`\`

**Expected output**:
\`\`\`
🎯 Confidence Score Tuning Report

OCR Confidence Analysis:
  Samples: 87
  Mean confidence: 82.3%
  Mean accuracy: 91.2%
  Correlation: Strong (r=0.823)
  Recommended threshold: 0.75

Face Match Confidence Analysis:
  Samples: 60
  Mean confidence: 78.5%
  Overall accuracy: 91.7%
  Recommended threshold: 0.70

Tier Threshold Recommendations:

  Full Verification:
    Description: Nigerian residents (NIN + BVN)
    Risk tolerance: low
    OCR threshold: 0.85
    Face match threshold: 0.75
    Booking limit: unlimited

  International Verification:
    Description: Diaspora/International (Passport + Onfido)
    Risk tolerance: medium
    OCR threshold: 0.80
    Face match threshold: 0.70
    Booking limit: ₦500,000
\`\`\`

### 4.2 Update Service Configuration

Apply recommended thresholds to the verification service:

\`\`\`bash
kubectl set env deployment/verification-service \
  OCR_CONFIDENCE_THRESHOLD_FULL=0.85 \
  OCR_CONFIDENCE_THRESHOLD_INTERNATIONAL=0.80 \
  OCR_CONFIDENCE_THRESHOLD_BASIC=0.75 \
  FACE_MATCH_THRESHOLD_FULL=0.75 \
  FACE_MATCH_THRESHOLD_INTERNATIONAL=0.70 \
  FACE_MATCH_THRESHOLD_BASIC=0.65
\`\`\`

## Step 5: Validate Performance

### 5.1 Check Accuracy Targets

Verify that the system meets minimum accuracy requirements:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| OCR Accuracy (Nigerian Passport) | ≥85% | 93.5% | ✅ |
| OCR Accuracy (NIN Card) | ≥85% | 89.3% | ✅ |
| OCR Accuracy (International Passport) | ≥85% | 91.8% | ✅ |
| Face Match Accuracy | ≥90% | 91.7% | ✅ |
| Face Match FPR | ≤10% | 10.0% | ✅ |
| Face Match FNR | ≤10% | 6.7% | ✅ |

### 5.2 Performance Benchmarks

Run performance tests:

\`\`\`bash
cd services/ocr-service/tests
python3 test_ocr_performance.py
\`\`\`

**Expected results** (GPU deployment):
- **Throughput**: 162,000 images/hour (T4 GPU)
- **Latency**: <100ms per document (p95)
- **Batch processing**: 18 images/batch

## Step 6: Continuous Monitoring

### 6.1 Set Up Monitoring Dashboard

Deploy Grafana dashboard for OCR metrics:

\`\`\`bash
kubectl apply -f monitoring/grafana-dashboard-ocr.yaml
\`\`\`

**Key metrics to monitor**:
- OCR accuracy by document type
- Face matching accuracy
- Confidence score distribution
- Processing latency
- Error rates

### 6.2 Automated Testing

Set up weekly automated testing:

\`\`\`bash
# Add to crontab
0 2 * * 0 /path/to/upload_real_documents.py && /path/to/measure_accuracy.py
\`\`\`

## Troubleshooting

### Low OCR Accuracy

**Symptoms**: Accuracy < 85%

**Possible causes**:
1. Poor image quality
2. Incorrect document type classification
3. Model not optimized for document format

**Solutions**:
1. Check image resolution (minimum 1200x1600 recommended)
2. Verify document type in configuration
3. Retrain model with more samples

### High False Positive Rate

**Symptoms**: FPR > 10%

**Possible causes**:
1. Face match threshold too low
2. Poor selfie quality
3. Similar-looking individuals in test set

**Solutions**:
1. Increase face match threshold
2. Enforce selfie quality checks
3. Review test data for duplicates

### Performance Issues

**Symptoms**: Latency > 500ms

**Possible causes**:
1. CPU deployment (slow)
2. Insufficient GPU memory
3. Network latency

**Solutions**:
1. Deploy GPU version
2. Reduce batch size
3. Use local testing environment

## Next Steps

1. **Production Deployment**: Deploy tuned configuration to production
2. **Monitoring**: Set up alerts for accuracy degradation
3. **Continuous Improvement**: Collect failed cases for model retraining
4. **A/B Testing**: Test different thresholds with real users

---

*Last updated: November 17, 2025*
