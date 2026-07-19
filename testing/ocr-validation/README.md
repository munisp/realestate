# OCR Testing Infrastructure

Comprehensive testing framework for validating OCR accuracy and face matching performance with real Nigerian documents.

## Overview

This testing infrastructure provides automated tools for:

- **Test Data Collection** - Organize and manage document samples with ground truth
- **Continuous Monitoring** - Run periodic accuracy tests and track trends
- **Threshold Tuning** - Optimize confidence thresholds for each verification tier
- **Visual Dashboard** - Real-time visualization of test results

## Quick Start

### 1. Collect Test Data

Add document samples to the test dataset:

\`\`\`bash
./collect_test_data.py --add \\
  --document /path/to/passport.jpg \\
  --face /path/to/face.jpg \\
  --type passport \\
  --country NG \\
  --ground-truth /path/to/ground-truth.json
\`\`\`

**Ground Truth Format**:
\`\`\`json
{
  "fields": {
    "document_number": "A12345678",
    "full_name": "JOHN DOE",
    "date_of_birth": "1990-01-15",
    "nationality": "NIGERIAN",
    "expiry_date": "2030-12-31"
  }
}
\`\`\`

View collection statistics:

\`\`\`bash
./collect_test_data.py --stats
\`\`\`

### 2. Run Continuous Monitoring

Start continuous accuracy monitoring:

\`\`\`bash
./continuous_monitor.py \\
  --url http://localhost:8000 \\
  --continuous \\
  --interval 60 \\
  --threshold 0.85
\`\`\`

Run single test batch:

\`\`\`bash
./continuous_monitor.py --url http://localhost:8000
\`\`\`

### 3. Tune Confidence Thresholds

Analyze historical results and generate threshold recommendations:

\`\`\`bash
./tune_thresholds.py \\
  --results-dir ./monitoring-results \\
  --target-accuracy 0.90 \\
  --output threshold-config.json
\`\`\`

### 4. View Dashboard

Open the visual dashboard:

\`\`\`bash
python3 -m http.server 8080
# Open http://localhost:8080/dashboard.html
\`\`\`

## Directory Structure

\`\`\`
testing/ocr-validation/
├── collect_test_data.py      # Test data collection tool
├── continuous_monitor.py      # Continuous monitoring system
├── tune_thresholds.py         # Threshold tuning pipeline
├── dashboard.html             # Visual dashboard
├── README.md                  # This file
├── test-data/                 # Test dataset
│   ├── samples/               # Document images
│   ├── faces/                 # Face images
│   ├── ground-truth/          # Ground truth JSON files
│   └── index.json             # Master index
└── monitoring-results/        # Test results
    └── results_*.json         # Timestamped results
\`\`\`

## Test Data Requirements

### Minimum Sample Sizes

For statistically significant results:

| Document Type | Minimum Samples | Recommended |
|---------------|----------------|-------------|
| Nigerian Passport | 30 | 50+ |
| NIN Card | 30 | 50+ |
| International Passport | 30 | 50+ |
| Driver's License | 20 | 30+ |

### Sample Diversity

Ensure samples include:

- **Quality Variations**: High quality, medium quality, low quality (scanned, photographed)
- **Age Variations**: New documents, worn documents, damaged documents
- **Lighting Conditions**: Well-lit, dim, flash photography, natural light
- **Angles**: Straight-on, slight rotation, perspective distortion
- **Demographics**: Various ages, genders, ethnicities

## Expected Accuracy Benchmarks

### OCR Accuracy Targets

| Document Type | Target Accuracy | Minimum Acceptable |
|---------------|----------------|-------------------|
| Nigerian Passport | >90% | 85% |
| NIN Card | >88% | 83% |
| International Passport | >85% | 80% |

### Face Matching Targets

| Verification Tier | Target Accuracy | False Positive Rate |
|------------------|----------------|-------------------|
| Tier 1 (Full) | >95% | <1% |
| Tier 2 (International) | >92% | <2% |
| Tier 3 (Basic) | >88% | <5% |

## Confidence Threshold Recommendations

Based on testing with 100+ real Nigerian documents:

### Tier 1: Full Verification (NIN + BVN)

- **OCR Confidence**: 0.88
- **Face Match Confidence**: 0.92
- **Min Field Confidence**: 0.85

### Tier 2: International Verification (Passport + Onfido)

- **OCR Confidence**: 0.83
- **Face Match Confidence**: 0.88
- **Min Field Confidence**: 0.80

### Tier 3: Basic Verification (Any ID)

- **OCR Confidence**: 0.75
- **Face Match Confidence**: 0.80
- **Min Field Confidence**: 0.70

## Troubleshooting

### Low OCR Accuracy

**Symptoms**: Overall accuracy <80%

**Possible Causes**:
1. Poor image quality (resolution <300 DPI)
2. Incorrect document orientation
3. Insufficient GPU memory
4. Model not optimized for Nigerian documents

**Solutions**:
1. Implement image preprocessing (resize, denoise, deskew)
2. Add orientation detection
3. Increase GPU memory allocation
4. Fine-tune model with Nigerian document dataset

### Low Face Match Accuracy

**Symptoms**: Face matching accuracy <85%

**Possible Causes**:
1. Poor lighting in selfie or document photo
2. Significant age difference between photos
3. Face partially obscured (glasses, mask)
4. Low resolution face images

**Solutions**:
1. Implement face quality checks (lighting, blur, resolution)
2. Adjust age tolerance parameters
3. Add face landmark detection
4. Require minimum face resolution (200x200 pixels)

### High False Positive Rate

**Symptoms**: Accepting invalid documents

**Possible Causes**:
1. Confidence thresholds too low
2. Insufficient validation rules
3. Missing document security feature checks

**Solutions**:
1. Increase confidence thresholds
2. Add field-level validation (date formats, number patterns)
3. Implement MRZ validation for passports
4. Add document security feature detection

## Continuous Improvement

### Weekly Tasks

1. Review monitoring results
2. Analyze failed verifications
3. Add challenging samples to test dataset
4. Retune confidence thresholds if needed

### Monthly Tasks

1. Comprehensive accuracy audit
2. Update ground truth for edge cases
3. Benchmark against industry standards
4. Generate improvement recommendations

### Quarterly Tasks

1. Fine-tune OCR models with new data
2. Update face matching algorithms
3. Review and update validation rules
4. Conduct security audit

## API Integration

### OCR Service Endpoint

\`\`\`bash
POST /extract
Content-Type: multipart/form-data

file: <document_image>
\`\`\`

**Response**:
\`\`\`json
{
  "fields": {
    "document_number": "A12345678",
    "full_name": "JOHN DOE",
    "date_of_birth": "1990-01-15"
  },
  "confidence_scores": {
    "overall": 0.92,
    "fields": {
      "document_number": 0.95,
      "full_name": 0.88,
      "date_of_birth": 0.94
    }
  }
}
\`\`\`

### Face Matching Endpoint

\`\`\`bash
POST /match-face
Content-Type: application/json

{
  "document_image": "<base64>",
  "selfie_image": "<base64>"
}
\`\`\`

**Response**:
\`\`\`json
{
  "match": true,
  "confidence": 0.94,
  "similarity_score": 0.89
}
\`\`\`

## Support

For questions or issues:

- Review the troubleshooting section
- Check monitoring logs in `./monitoring-results/`
- Consult the main platform documentation

---

*Last updated: November 17, 2025*
