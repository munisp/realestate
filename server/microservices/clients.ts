/**
 * Microservices clients for Python and Go services
 */

// ML Valuation Service Client
export interface PropertyFeatures {
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  location: string;
  property_type: string;
  year_built?: number;
  amenities?: string[];
}

export interface ValuationResponse {
  estimated_price: number;
  confidence: number;
  price_range: {
    min: number;
    max: number;
  };
  comparable_properties: Array<{
    address: string;
    price: number;
    bedrooms: number;
    square_feet: number;
  }>;
  factors: Record<string, string>;
}

export async function getPropertyValuation(
  features: PropertyFeatures
): Promise<ValuationResponse> {
  const ML_VALUATION_URL = process.env.ML_VALUATION_URL || "http://localhost:5000";
  
  try {
    const response = await fetch(`${ML_VALUATION_URL}/api/v1/valuation/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features),
    });
    
    if (!response.ok) {
      throw new Error(`ML Valuation service error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("[ML Valuation] Error:", error);
    throw error;
  }
}

// OCR Service Client
export interface OCRResult {
  document_type: string;
  extracted_data: Record<string, string>;
  confidence: number;
  raw_text: string;
}

export interface FaceMatchResult {
  match: boolean;
  confidence: number;
  similarity_score: number;
}

export async function extractDocumentData(
  imageBuffer: Buffer
): Promise<OCRResult> {
  const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || "http://localhost:5001";
  
  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)]);
    formData.append("file", blob, "document.jpg");
    
    const response = await fetch(`${OCR_SERVICE_URL}/api/v1/ocr/extract`, {
      method: "POST",
      body: formData as any,
    });
    
    if (!response.ok) {
      throw new Error(`OCR service error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("[OCR Service] Error:", error);
    throw error;
  }
}

export async function verifyFaceMatch(
  documentPhoto: Buffer,
  selfiePhoto: Buffer
): Promise<FaceMatchResult> {
  const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || "http://localhost:5001";
  
  try {
    const formData = new FormData();
    formData.append("document_photo", new Blob([new Uint8Array(documentPhoto)]), "document.jpg");
    formData.append("selfie_photo", new Blob([new Uint8Array(selfiePhoto)]), "selfie.jpg");
    
    const response = await fetch(`${OCR_SERVICE_URL}/api/v1/ocr/verify-face`, {
      method: "POST",
      body: formData as any,
    });
    
    if (!response.ok) {
      throw new Error(`Face verification error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("[Face Verification] Error:", error);
    throw error;
  }
}

// Fraud Detection Service Client
export interface Transaction {
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  ip_address?: string;
  device_id?: string;
  location?: string;
}

export interface FraudScore {
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  flags: string[];
  recommendation: string;
  details: Record<string, any>;
}

export async function analyzeFraud(
  transaction: Transaction
): Promise<FraudScore> {
  const FRAUD_SERVICE_URL = process.env.FRAUD_SERVICE_URL || "http://localhost:5002";
  
  try {
    const response = await fetch(`${FRAUD_SERVICE_URL}/api/v1/fraud/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });
    
    if (!response.ok) {
      throw new Error(`Fraud detection error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("[Fraud Detection] Error:", error);
    throw error;
  }
}

export async function getUserRiskProfile(userId: string): Promise<any> {
  const FRAUD_SERVICE_URL = process.env.FRAUD_SERVICE_URL || "http://localhost:5002";
  
  try {
    const response = await fetch(`${FRAUD_SERVICE_URL}/api/v1/fraud/user/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Risk profile error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("[Risk Profile] Error:", error);
    throw error;
  }
}
