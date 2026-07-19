# Real Document Collection Guidelines

Comprehensive guidelines for collecting, organizing, and validating real Nigerian identity documents for OCR testing.

## Overview

Collecting real document samples is critical for validating OCR accuracy and face matching performance before the Lagos pilot launch. This guide provides detailed procedures for ethically sourcing documents, creating ground truth data, and organizing samples for automated testing.

### Collection Goals

The testing framework requires a minimum of **30 samples per document type** to achieve statistical significance. The recommended target is **50+ samples** to account for quality variations and edge cases. Each sample must include the original document image, extracted face photo, and verified ground truth data for all text fields.

| Document Type | Minimum Samples | Recommended | Priority |
|---------------|----------------|-------------|----------|
| Nigerian Passport | 30 | 50+ | **High** |
| NIN Card | 30 | 50+ | **High** |
| International Passport | 30 | 40+ | Medium |
| Driver's License | 20 | 30+ | Low |

## Ethical Considerations

### Privacy and Consent

All document collection must follow strict ethical guidelines to protect participant privacy and comply with data protection regulations. Participants must provide explicit informed consent before their documents are photographed or scanned.

**Consent Requirements**:

1. **Written Consent Form**: Participants must sign a consent form explaining how their data will be used, stored, and protected
2. **Purpose Disclosure**: Clearly explain that documents will be used solely for OCR testing and validation
3. **Anonymization Option**: Offer to anonymize sensitive fields (document numbers, addresses) while preserving OCR-relevant text
4. **Right to Withdraw**: Participants can request deletion of their data at any time
5. **Secure Storage**: All documents must be encrypted at rest and in transit

**Sample Consent Form**:

```
DOCUMENT COLLECTION CONSENT FORM

I, [Name], voluntarily consent to having my identity document photographed 
for the purpose of testing and improving document verification technology.

I understand that:
- My document will be used only for OCR accuracy testing
- My data will be stored securely and encrypted
- My personal information will not be shared with third parties
- I can request deletion of my data at any time
- The document images will be deleted after testing is complete

Document Type: ________________
Date: ________________
Signature: ________________
```

### Data Protection

**Storage Security**:
- Encrypt all document images using AES-256
- Store encryption keys separately from data
- Implement access controls (only authorized testers)
- Enable audit logging for all data access
- Delete raw documents after testing completion

**Anonymization Techniques**:
- Blur or redact document numbers (optional)
- Mask residential addresses (optional)
- Preserve name, date of birth, and face photo (required for testing)
- Generate pseudonymous IDs for tracking

## Collection Methodology

### Recruitment Strategy

Recruit participants from diverse demographics to ensure the test dataset represents the actual user population. Target recruitment channels include company employees, university students, community organizations, and social networks.

**Recruitment Channels**:

1. **Internal Recruitment** (Fastest, 20-30 samples)
   - Company employees and contractors
   - Friends and family of team members
   - Offer small incentive (₦2,000-5,000 per sample)

2. **University Partnerships** (30-50 samples)
   - Partner with Lagos universities (UNILAG, LASU)
   - Recruit students through campus ambassadors
   - Offer academic credit or small compensation

3. **Community Organizations** (20-40 samples)
   - Tech hubs and coworking spaces
   - Professional associations
   - Religious and community centers

4. **Social Media** (Variable)
   - Post on Twitter, LinkedIn, Facebook
   - Explain purpose and compensation
   - Screen participants for authenticity

**Participant Criteria**:
- Age 18+ (legal consent)
- Nigerian citizen or resident
- Possesses valid identity document
- Willing to sign consent form
- Available for in-person or remote collection

### Document Photography Guidelines

High-quality document images are essential for accurate OCR testing. Follow these guidelines to ensure consistent, usable samples.

**Equipment Requirements**:
- **Camera**: Smartphone camera (12MP+) or flatbed scanner (300 DPI+)
- **Lighting**: Natural daylight or LED panel (avoid harsh shadows)
- **Background**: Plain white or light gray surface
- **Tripod**: Optional but recommended for consistency

**Photography Procedure**:

1. **Prepare Document**
   - Remove from protective sleeve
   - Clean surface with microfiber cloth
   - Flatten document on white background

2. **Camera Setup**
   - Position camera directly above document (90° angle)
   - Ensure entire document fits in frame with small margin
   - Disable flash (use natural or diffused lighting)
   - Focus on document text (tap to focus on smartphone)

3. **Capture Image**
   - Take 2-3 photos for quality assurance
   - Verify text is sharp and readable
   - Check for glare, shadows, or distortion
   - Ensure colors are accurate (not washed out)

4. **Quality Check**
   - Zoom in to verify text clarity
   - Confirm document edges are visible
   - Check file size (minimum 2 MB for high quality)
   - Retake if quality is insufficient

**Quality Standards**:

| Criterion | Requirement | Verification |
|-----------|-------------|--------------|
| Resolution | ≥300 DPI (scanned) or ≥12 MP (photo) | Check image properties |
| Focus | All text sharp and readable | Zoom to 200% and inspect |
| Lighting | Even, no harsh shadows or glare | Visual inspection |
| Angle | Document parallel to camera | Check for perspective distortion |
| Color | Accurate color reproduction | Compare to original document |
| File Format | JPEG (high quality) or PNG | Check file extension |

### Face Photo Extraction

Extract the face photo from the document for face matching validation. This requires careful cropping to preserve image quality.

**Extraction Procedure**:

1. **Locate Face Region**
   - Identify face photo area on document
   - Note exact pixel coordinates

2. **Crop Face Photo**
   - Use image editing software (Photoshop, GIMP, or Python PIL)
   - Crop with small margin around face (10-15% padding)
   - Maintain aspect ratio

3. **Save Face Image**
   - Save as separate file: `{sample_id}_face.jpg`
   - Minimum resolution: 200x200 pixels
   - Preserve original quality (no compression)

**Python Script for Face Extraction**:

```python
from PIL import Image

def extract_face(document_path, face_coords, output_path):
    """
    Extract face photo from document image
    
    Args:
        document_path: Path to document image
        face_coords: Tuple (left, top, right, bottom) in pixels
        output_path: Path to save extracted face
    """
    img = Image.open(document_path)
    
    # Add 10% padding around face
    left, top, right, bottom = face_coords
    width = right - left
    height = bottom - top
    padding = int(max(width, height) * 0.1)
    
    # Crop with padding
    face = img.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(img.width, right + padding),
        min(img.height, bottom + padding)
    ))
    
    # Save face image
    face.save(output_path, quality=95)
    print(f"Face extracted: {output_path}")

# Example usage
extract_face(
    "passport_NG_abc123.jpg",
    face_coords=(150, 200, 350, 450),
    output_path="passport_NG_abc123_face.jpg"
)
```

## Ground Truth Creation

### Manual Data Entry

Create ground truth data by manually transcribing all text fields from the document. This serves as the reference for calculating OCR accuracy.

**Required Fields by Document Type**:

**Nigerian Passport**:
- Document Number (e.g., A12345678)
- Surname
- Given Names
- Date of Birth (YYYY-MM-DD)
- Place of Birth
- Nationality
- Sex (M/F)
- Date of Issue (YYYY-MM-DD)
- Date of Expiry (YYYY-MM-DD)
- Issuing Authority

**NIN Card**:
- NIN Number (11 digits)
- Surname
- First Name
- Middle Name (if applicable)
- Date of Birth (YYYY-MM-DD)
- Gender (M/F)
- State of Origin
- LGA of Origin

**Ground Truth JSON Format**:

```json
{
  "document_type": "passport",
  "country": "NG",
  "fields": {
    "document_number": "A12345678",
    "surname": "ADEBAYO",
    "given_names": "OLUWASEUN MICHAEL",
    "date_of_birth": "1990-03-15",
    "place_of_birth": "LAGOS",
    "nationality": "NIGERIAN",
    "sex": "M",
    "date_of_issue": "2020-06-20",
    "date_of_expiry": "2030-06-19",
    "issuing_authority": "COMPTROLLER GENERAL"
  },
  "metadata": {
    "collection_date": "2025-11-17",
    "collector_id": "COLL-001",
    "quality_rating": "high",
    "notes": "Excellent condition, clear text"
  }
}
```

### Data Entry Best Practices

**Accuracy Guidelines**:
1. **Exact Transcription**: Copy text exactly as it appears (preserve capitalization, spacing, punctuation)
2. **Date Formats**: Use ISO 8601 format (YYYY-MM-DD) for all dates
3. **Special Characters**: Include accents, hyphens, and apostrophes
4. **Illegible Text**: Mark as `"[ILLEGIBLE]"` if text cannot be read
5. **Missing Fields**: Use `null` for fields not present on document

**Quality Assurance**:
- **Double Entry**: Have two people independently transcribe the same document
- **Cross-Verification**: Compare entries and resolve discrepancies
- **Spot Checks**: Randomly audit 10% of ground truth data
- **Automated Validation**: Run scripts to check format consistency

## Sample Organization

### Directory Structure

Organize collected samples using a standardized directory structure for easy automation.

```
testing/document-collection/
├── samples/
│   ├── passport_NG_abc123.jpg
│   ├── passport_NG_def456.jpg
│   ├── nin_NG_ghi789.jpg
│   └── ...
├── faces/
│   ├── passport_NG_abc123_face.jpg
│   ├── passport_NG_def456_face.jpg
│   ├── nin_NG_ghi789_face.jpg
│   └── ...
├── ground-truth/
│   ├── passport_NG_abc123.json
│   ├── passport_NG_def456.json
│   ├── nin_NG_ghi789.json
│   └── ...
└── index.json
```

### Naming Convention

Use consistent naming for all files to enable automated processing.

**Format**: `{document_type}_{country}_{unique_id}.{extension}`

**Examples**:
- `passport_NG_a1b2c3d4.jpg` (document image)
- `passport_NG_a1b2c3d4_face.jpg` (face photo)
- `passport_NG_a1b2c3d4.json` (ground truth)

**Unique ID Generation**:
```python
import hashlib
from pathlib import Path

def generate_sample_id(image_path):
    """Generate unique 8-character ID from image hash"""
    image_bytes = Path(image_path).read_bytes()
    hash_digest = hashlib.md5(image_bytes).hexdigest()
    return hash_digest[:8]
```

## Collection Workflow

### Step-by-Step Process

**Week 1: Recruitment and Setup** (10-15 samples)

1. **Day 1-2**: Prepare consent forms and collection materials
2. **Day 3-4**: Recruit initial participants (internal team, friends, family)
3. **Day 5-7**: Collect first batch of documents, create ground truth

**Week 2: Scaling Collection** (20-30 samples)

1. **Day 8-10**: Expand recruitment (universities, community organizations)
2. **Day 11-13**: Conduct collection sessions
3. **Day 14**: Quality assurance and data validation

**Week 3: Final Push** (10-20 samples)

1. **Day 15-18**: Fill gaps in document types and demographics
2. **Day 19-20**: Complete ground truth entry
3. **Day 21**: Final quality audit and dataset preparation

### Using the Collection Tool

The automated collection tool (`collect_test_data.py`) streamlines the process of adding samples to the test dataset.

```bash
# Add a new sample
cd /home/ubuntu/realestate-platform/testing/ocr-validation

./collect_test_data.py --add \
  --document /path/to/passport.jpg \
  --face /path/to/face.jpg \
  --type passport \
  --country NG \
  --ground-truth /path/to/ground-truth.json

# View collection statistics
./collect_test_data.py --stats

# Output:
# ==================================================
# Test Data Collection Statistics
# ==================================================
# Total Samples: 45
# Last Updated: 2025-11-17T14:30:00
#
# Breakdown by Type:
#   passport_NG: 25
#   nin_NG: 15
#   international_id_NG: 5
# ==================================================
```

## Quality Assurance

### Sample Quality Criteria

Each sample must meet minimum quality standards before inclusion in the test dataset.

**Acceptance Criteria**:

| Criterion | Standard | Rejection Threshold |
|-----------|----------|---------------------|
| Image Resolution | ≥300 DPI or ≥12 MP | <200 DPI or <8 MP |
| Text Clarity | All text readable at 100% zoom | >10% of text illegible |
| Lighting | Even, no harsh shadows | Significant glare or dark areas |
| Document Condition | Good to fair | Severely damaged or torn |
| Face Photo Quality | Clear, recognizable | Blurry, obscured, or low resolution |
| Ground Truth Accuracy | 100% accurate | Any transcription errors |

### Validation Checklist

Before adding a sample to the dataset, verify:

- [ ] Consent form signed and stored securely
- [ ] Document image meets quality standards
- [ ] Face photo extracted and saved separately
- [ ] Ground truth JSON created with all required fields
- [ ] Data entry double-checked for accuracy
- [ ] Files named according to convention
- [ ] Sample added to index using collection tool
- [ ] Backup created (encrypted)

## Data Security

### Encryption and Storage

**Encryption at Rest**:

```bash
# Encrypt entire dataset directory
tar -czf documents.tar.gz testing/document-collection/
openssl enc -aes-256-cbc -salt -in documents.tar.gz -out documents.tar.gz.enc -k "strong-password"
rm documents.tar.gz

# Decrypt when needed
openssl enc -aes-256-cbc -d -in documents.tar.gz.enc -out documents.tar.gz -k "strong-password"
tar -xzf documents.tar.gz
```

**Access Controls**:

```bash
# Restrict directory permissions
chmod 700 testing/document-collection/
chmod 600 testing/document-collection/samples/*
chmod 600 testing/document-collection/ground-truth/*

# Create access audit log
cat > access-log.sh << 'EOF'
#!/bin/bash
echo "$(date): $(whoami) accessed document collection" >> /var/log/doc-collection-access.log
EOF
```

### Data Retention Policy

**Retention Schedule**:
- **Active Testing Period**: Retain all data encrypted
- **Post-Testing (30 days)**: Delete raw document images, retain anonymized ground truth
- **Long-term (1 year)**: Retain aggregated statistics only

**Deletion Procedure**:

```bash
# Secure deletion of document images
find testing/document-collection/samples/ -type f -exec shred -vfz -n 10 {} \;
find testing/document-collection/faces/ -type f -exec shred -vfz -n 10 {} \;

# Verify deletion
ls -la testing/document-collection/samples/
ls -la testing/document-collection/faces/
```

## Troubleshooting

### Common Issues

**Issue**: Participant reluctant to share document

**Solution**: 
- Explain security measures and data protection
- Offer anonymization of sensitive fields
- Show example of how data is used (OCR testing only)
- Provide written privacy policy

**Issue**: Poor image quality (blurry, dark, glare)

**Solution**:
- Use natural lighting or diffused LED panel
- Disable camera flash
- Use tripod or stable surface
- Clean document surface before photography
- Take multiple shots and select best quality

**Issue**: Difficulty extracting face photo

**Solution**:
- Use higher resolution source image
- Manually crop using image editor
- Ensure face region has sufficient padding
- Verify face is in focus in original document

**Issue**: Ground truth entry errors

**Solution**:
- Implement double-entry verification
- Use automated format validation
- Conduct spot checks on random samples
- Retrain data entry personnel

## Next Steps

After collecting 30+ samples per document type:

1. **Run Initial Tests**: Use `continuous_monitor.py` to test OCR accuracy
2. **Analyze Results**: Review accuracy by document type and field
3. **Tune Thresholds**: Run `tune_thresholds.py` to optimize confidence thresholds
4. **Collect Additional Samples**: Target low-accuracy document types or fields
5. **Final Validation**: Achieve >85% overall accuracy before pilot launch

---

**Author**: Manus AI  
**Last Updated**: November 17, 2025  
**Version**: 1.0
