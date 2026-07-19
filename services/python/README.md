# Python AI/ML Services

Machine learning and AI-powered services for the Real Estate Platform.

## Services

### 1. ML Property Valuation (Port 5000)
**Purpose:** AI-powered property price prediction and market analysis

**Endpoints:**
- `POST /api/v1/valuation/predict` - Predict single property value
- `POST /api/v1/valuation/batch` - Batch predictions

**Features:**
- Location-based pricing (Lagos, VI, Ikoyi, etc.)
- Property type multipliers
- Age and amenities adjustments
- Comparable properties analysis
- Confidence scoring

**Example Request:**
```json
{
  "bedrooms": 4,
  "bathrooms": 3,
  "square_feet": 2500,
  "location": "Lekki",
  "property_type": "detached",
  "year_built": 2018,
  "amenities": ["pool", "gym", "security"]
}
```

### 2. Document OCR Service (Port 5001)
**Purpose:** Extract data from Nigerian ID documents and verify identity

**Endpoints:**
- `POST /api/v1/ocr/extract` - Extract data from document
- `POST /api/v1/ocr/verify-face` - Face matching verification
- `POST /api/v1/ocr/full-verification` - Complete verification

**Supported Documents:**
- Nigerian International Passport
- NIN Card
- Driver's License

**Features:**
- Text extraction with pattern matching
- Face matching between document and selfie
- Confidence scoring
- Multi-document support

### 3. Fraud Detection (Port 5002)
**Purpose:** Real-time transaction fraud detection and risk scoring

**Endpoints:**
- `POST /api/v1/fraud/analyze` - Analyze single transaction
- `GET /api/v1/fraud/user/{user_id}` - Get user risk profile
- `POST /api/v1/fraud/batch-analyze` - Batch analysis

**Risk Factors:**
- Unusual transaction amounts
- High-velocity transactions
- Suspicious IP addresses
- First-time large transactions
- Unusual locations
- High-risk payment methods

**Risk Levels:**
- **Low** (0-24): Approve
- **Medium** (25-49): Additional verification
- **High** (50-74): Manual review
- **Critical** (75-100): Block transaction

## Installation

```bash
cd services/python
pip install -r requirements.txt
```

## Running Services

### Development
```bash
# ML Valuation
cd ml-valuation
python app/main.py

# OCR Service
cd ocr-service
python app/main.py

# Fraud Detection
cd fraud-detection
python app/main.py
```

### Production (Docker)
```bash
docker-compose up python-services
```

## Integration with Node.js

Call Python services from Node.js backend:

```typescript
// Example: Property valuation
const response = await fetch('http://localhost:5000/api/v1/valuation/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bedrooms: 4,
    bathrooms: 3,
    square_feet: 2500,
    location: 'Lekki',
    property_type: 'detached'
  })
});

const valuation = await response.json();
console.log(`Estimated price: ₦${valuation.estimated_price}`);
```

## Upgrading to Production ML Models

Current implementation uses rule-based models. For production:

### ML Valuation
- Train regression model on historical sales data
- Use scikit-learn, XGBoost, or LightGBM
- Features: location embeddings, property attributes, market trends
- Regular retraining with new data

### OCR Service
- Integrate Tesseract OCR or Google Cloud Vision API
- Use AWS Textract for document analysis
- Implement DeepFace or AWS Rekognition for face matching
- Add liveness detection

### Fraud Detection
- Train anomaly detection model on transaction history
- Use isolation forest or autoencoder
- Implement graph-based fraud detection
- Add device fingerprinting

## Performance

- **ML Valuation:** <100ms per prediction
- **OCR Service:** 1-3 seconds per document
- **Fraud Detection:** <50ms per transaction

## Monitoring

Health check endpoints available at `/health` for all services.
