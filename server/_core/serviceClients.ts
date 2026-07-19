/**
 * Service Clients for Microservices Integration
 * Provides TypeScript clients for Go (gRPC) and Python (HTTP) services
 */

import axios, { AxiosInstance } from 'axios';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

// ============================================================================
// Configuration
// ============================================================================

const SERVICE_ENDPOINTS = {
  // Go Services (gRPC)
  payment: {
    host: process.env.PAYMENT_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.PAYMENT_SERVICE_PORT || '50051'),
    http: parseInt(process.env.PAYMENT_SERVICE_HTTP_PORT || '8080'),
  },
  notification: {
    host: process.env.NOTIFICATION_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '50052'),
    http: parseInt(process.env.NOTIFICATION_SERVICE_HTTP_PORT || '8081'),
  },
  image: {
    host: process.env.IMAGE_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.IMAGE_SERVICE_PORT || '50053'),
    http: parseInt(process.env.IMAGE_SERVICE_HTTP_PORT || '8082'),
  },
  
  // Python Services (HTTP)
  mlValuation: {
    baseURL: process.env.ML_VALUATION_SERVICE_URL || 'http://localhost:5000',
  },
  ocr: {
    baseURL: process.env.OCR_SERVICE_URL || 'http://localhost:5001',
  },
  fraudDetection: {
    baseURL: process.env.FRAUD_DETECTION_SERVICE_URL || 'http://localhost:5002',
  },
  geospatial: {
    baseURL: process.env.GEOSPATIAL_SERVICE_URL || 'http://localhost:5003',
  },
};

// ============================================================================
// Python Service Clients (HTTP/REST)
// ============================================================================

class PythonServiceClient {
  private client: AxiosInstance;
  private serviceName: string;
  private isAvailable: boolean = true;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1 minute

  constructor(baseURL: string, serviceName: string) {
    this.serviceName = serviceName;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      maxRedirects: 5,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[${serviceName}] Request:`, config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error(`[${serviceName}] Request error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[${serviceName}] Response:`, response.status, response.config.url);
        this.isAvailable = true;
        return response;
      },
      (error) => {
        console.error(`[${serviceName}] Response error:`, error.message);
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          this.isAvailable = false;
          console.warn(`[${serviceName}] Service unavailable. Set ${serviceName.toUpperCase()}_SERVICE_URL in .env to enable.`);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if service is available (with caching)
   */
  async checkHealth(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isAvailable;
    }

    try {
      await this.client.get('/health', { timeout: 5000 });
      this.isAvailable = true;
      this.lastHealthCheck = now;
      return true;
    } catch (error) {
      this.isAvailable = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  protected async post<T>(endpoint: string, data: any): Promise<T> {
    if (!this.isAvailable && !(await this.checkHealth())) {
      throw new Error(`[${this.serviceName}] Service is not available`);
    }
    
    const response = await this.client.post<T>(endpoint, data);
    return response.data;
  }

  protected async get<T>(endpoint: string, params?: any): Promise<T> {
    if (!this.isAvailable && !(await this.checkHealth())) {
      throw new Error(`[${this.serviceName}] Service is not available`);
    }
    
    const response = await this.client.get<T>(endpoint, { params });
    return response.data;
  }
}

// ============================================================================
// ML Valuation Service Client
// ============================================================================

interface ValuationRequest {
  propertyId: string;
  features: {
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    location: {
      lat: number;
      lng: number;
    };
    propertyType: string;
    yearBuilt?: number;
    lotSize?: number;
  };
}

interface ValuationResponse {
  propertyId: string;
  estimatedValue: number;
  confidence: number;
  priceRange: {
    low: number;
    high: number;
  };
  comparables: Array<{
    id: string;
    address: string;
    price: number;
    similarity: number;
  }>;
  marketTrend: 'rising' | 'stable' | 'declining';
  modelVersion: string;
}

export class MLValuationClient extends PythonServiceClient {
  constructor() {
    super(SERVICE_ENDPOINTS.mlValuation.baseURL, 'ML-Valuation');
  }

  async valuateProperty(request: ValuationRequest): Promise<ValuationResponse> {
    return this.post<ValuationResponse>('/valuate', request);
  }

  async batchValuate(requests: ValuationRequest[]): Promise<ValuationResponse[]> {
    return this.post<ValuationResponse[]>('/valuate/batch', { properties: requests });
  }

  async getMarketTrends(region: string, timeframe: string): Promise<any> {
    return this.get('/trends', { region, timeframe });
  }
}

// ============================================================================
// OCR Service Client
// ============================================================================

interface OCRRequest {
  documentUrl: string;
  documentType: 'id' | 'passport' | 'driver_license' | 'utility_bill' | 'contract';
  extractFace?: boolean;
}

interface OCRResponse {
  documentId: string;
  documentType: string;
  extractedText: string;
  structuredData: {
    name?: string;
    documentNumber?: string;
    dateOfBirth?: string;
    expiryDate?: string;
    address?: string;
    [key: string]: any;
  };
  confidence: number;
  faceImage?: string; // Base64 encoded
  processingTime: number;
}

export class OCRClient extends PythonServiceClient {
  constructor() {
    super(SERVICE_ENDPOINTS.ocr.baseURL, 'OCR');
  }

  async processDocument(request: OCRRequest): Promise<OCRResponse> {
    return this.post<OCRResponse>('/process', request);
  }

  async verifyFaceMatch(documentId: string, selfieUrl: string): Promise<{
    match: boolean;
    confidence: number;
    similarity: number;
  }> {
    return this.post('/verify-face', { documentId, selfieUrl });
  }
}

// ============================================================================
// Fraud Detection Service Client
// ============================================================================

interface FraudCheckRequest {
  userId: string;
  transactionId: string;
  amount: number;
  transactionType: 'purchase' | 'sale' | 'rental' | 'payment';
  metadata: {
    ipAddress?: string;
    deviceId?: string;
    location?: {
      lat: number;
      lng: number;
    };
    [key: string]: any;
  };
}

interface FraudCheckResponse {
  transactionId: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  recommendation: 'approve' | 'review' | 'reject';
  reasons: string[];
}

export class FraudDetectionClient extends PythonServiceClient {
  constructor() {
    super(SERVICE_ENDPOINTS.fraudDetection.baseURL, 'Fraud-Detection');
  }

  async checkTransaction(request: FraudCheckRequest): Promise<FraudCheckResponse> {
    return this.post<FraudCheckResponse>('/check', request);
  }

  async getUserRiskProfile(userId: string): Promise<{
    userId: string;
    overallRiskScore: number;
    transactionHistory: number;
    flaggedTransactions: number;
    lastReview: string;
  }> {
    return this.get(`/user/${userId}/risk-profile`);
  }
}

// ============================================================================
// Geospatial Service Client
// ============================================================================

interface GeospatialSearchRequest {
  center: {
    lat: number;
    lng: number;
  };
  radius: number; // in meters
  filters?: {
    propertyType?: string[];
    priceRange?: {
      min: number;
      max: number;
    };
    bedrooms?: number;
  };
  limit?: number;
}

interface GeospatialSearchResponse {
  properties: Array<{
    id: string;
    location: {
      lat: number;
      lng: number;
    };
    distance: number; // in meters
    h3Index: string;
    [key: string]: any;
  }>;
  total: number;
  searchArea: {
    center: { lat: number; lng: number };
    radius: number;
  };
}

export class GeospatialClient extends PythonServiceClient {
  constructor() {
    super(SERVICE_ENDPOINTS.geospatial.baseURL, 'Geospatial');
  }

  async searchNearby(request: GeospatialSearchRequest): Promise<GeospatialSearchResponse> {
    return this.post<GeospatialSearchResponse>('/search/nearby', request);
  }

  async searchPolygon(polygon: Array<{ lat: number; lng: number }>, filters?: any): Promise<GeospatialSearchResponse> {
    return this.post<GeospatialSearchResponse>('/search/polygon', { polygon, filters });
  }

  async getHeatmap(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }, resolution: number): Promise<any> {
    return this.post('/heatmap', { bounds, resolution });
  }

  async getNeighborhoodStats(h3Index: string): Promise<{
    h3Index: string;
    propertyCount: number;
    averagePrice: number;
    pricePerSqft: number;
    demographics: any;
  }> {
    return this.get(`/neighborhood/${h3Index}/stats`);
  }
}

// ============================================================================
// Go Service Clients (gRPC) - Placeholder
// ============================================================================

/**
 * Payment Service Client (gRPC)
 * Note: Requires .proto files to be available
 */
export class PaymentServiceClient {
  // private client: any;

  constructor() {
    console.log('[Payment Service] gRPC client initialized');
  }

  async processPayment(request: {
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
  }): Promise<any> {
    const response = await fetch('http://localhost:5110/api/payment/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return await response.json();
  }
}

// ============================================================================
// Service Client Factory
// ============================================================================

export class ServiceClients {
  private static instances: {
    mlValuation?: MLValuationClient;
    ocr?: OCRClient;
    fraudDetection?: FraudDetectionClient;
    geospatial?: GeospatialClient;
    payment?: PaymentServiceClient;
  } = {};

  static getMLValuationClient(): MLValuationClient {
    if (!this.instances.mlValuation) {
      this.instances.mlValuation = new MLValuationClient();
    }
    return this.instances.mlValuation;
  }

  static getOCRClient(): OCRClient {
    if (!this.instances.ocr) {
      this.instances.ocr = new OCRClient();
    }
    return this.instances.ocr;
  }

  static getFraudDetectionClient(): FraudDetectionClient {
    if (!this.instances.fraudDetection) {
      this.instances.fraudDetection = new FraudDetectionClient();
    }
    return this.instances.fraudDetection;
  }

  static getGeospatialClient(): GeospatialClient {
    if (!this.instances.geospatial) {
      this.instances.geospatial = new GeospatialClient();
    }
    return this.instances.geospatial;
  }

  static getPaymentClient(): PaymentServiceClient {
    if (!this.instances.payment) {
      this.instances.payment = new PaymentServiceClient();
    }
    return this.instances.payment;
  }
}

// Export singleton instances
export const mlValuationClient = ServiceClients.getMLValuationClient();
export const ocrClient = ServiceClients.getOCRClient();
export const fraudDetectionClient = ServiceClients.getFraudDetectionClient();
export const geospatialClient = ServiceClients.getGeospatialClient();
export const paymentClient = ServiceClients.getPaymentClient();
