/**
 * Shared types and interfaces for government registry integrations
 */

export interface CofOVerificationResult {
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
  rawResponse?: any; // Store raw API response for debugging
}

export interface LandRecordData {
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
  rawResponse?: any;
}

export interface OwnershipRecord {
  transferDate: Date;
  fromOwner: string;
  toOwner: string;
  transferType: 'sale' | 'inheritance' | 'gift' | 'court_order' | 'government_allocation';
  transferValue?: number;
  deedNumber?: string;
  registrationNumber?: string;
  notes?: string;
}

export interface VerificationRequest {
  parcelId?: string;
  cofoNumber?: string;
  ownerName?: string;
  requestType: 'cofo_verification' | 'ownership_verification' | 'encumbrance_check' | 'full_verification';
  requesterInfo: {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
  };
  additionalInfo?: Record<string, any>;
}

export interface VerificationResponse {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedCompletionTime?: Date;
  message?: string;
  result?: CofOVerificationResult;
}

export interface RegistryError {
  code: string;
  message: string;
  state: string;
  timestamp: Date;
  retryable: boolean;
  fallbackAvailable: boolean;
  originalError?: any;
}

export interface RegistryConfig {
  baseUrl: string;
  authType: 'oauth' | 'api_key' | 'basic' | 'jwt';
  credentials: {
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    username?: string;
    password?: string;
    redirectUri?: string;
  };
  rateLimit: {
    maxRequests: number;
    perMinutes: number;
  };
  timeout: number;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface GovernmentRegistryClient {
  /**
   * Verify C of O authenticity
   */
  verifyCofO(cofoNumber: string): Promise<CofOVerificationResult>;
  
  /**
   * Get land record by parcel ID
   */
  getLandRecord(parcelId: string): Promise<LandRecordData>;
  
  /**
   * Get ownership history
   */
  getOwnershipHistory(parcelId: string): Promise<OwnershipRecord[]>;
  
  /**
   * Submit verification request
   */
  submitVerificationRequest(data: VerificationRequest): Promise<VerificationResponse>;
  
  /**
   * Check API health
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * Get state identifier
   */
  getState(): string;
}

export type StateCode = 'LAGOS' | 'FCT' | 'RIVERS' | 'KANO' | 'OYO';

export interface AggregatedVerificationResult {
  primaryResult: CofOVerificationResult;
  alternativeResults: CofOVerificationResult[];
  consensus: {
    isValid: boolean;
    confidence: number;
    conflictingFields: string[];
  };
  sources: StateCode[];
}
