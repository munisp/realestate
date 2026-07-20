import { BaseGovernmentRegistryClient } from '../base/GovernmentRegistryClient';
import { logger } from "../../../_core/logger";
import {
  CofOVerificationResult,
  LandRecordData,
  OwnershipRecord,
  VerificationRequest,
  VerificationResponse,
  RegistryConfig,
} from '../base/types';

/**
 * Lagos State Land Registry Client
 * Implements integration with Lagos Land Bureau API
 * 
 * API Base URL: https://api.lagoslandbureau.gov.ng/v1
 * Authentication: OAuth 2.0
 * Rate Limit: 100 requests/minute
 */
export class LagosRegistryClient extends BaseGovernmentRegistryClient {
  constructor() {
    const config: RegistryConfig = {
      baseUrl: process.env.LAGOS_REGISTRY_BASE_URL || 'https://api.lagoslandbureau.gov.ng/v1',
      authType: 'oauth',
      credentials: {
        clientId: process.env.LAGOS_REGISTRY_CLIENT_ID,
        clientSecret: process.env.LAGOS_REGISTRY_CLIENT_SECRET,
        apiKey: process.env.LAGOS_REGISTRY_API_KEY,
      },
      rateLimit: {
        maxRequests: 100,
        perMinutes: 1,
      },
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
      },
    };

    super('LAGOS', config);
  }

  /**
   * Authenticate with Lagos Land Bureau OAuth
   */
  protected async authenticate(): Promise<void> {
    try {
      const response = await this.client.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: this.config.credentials.clientId,
        client_secret: this.config.credentials.clientSecret,
      });

      this.accessToken = response.data.access_token;
      
      // Set token expiry (usually 1 hour)
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      logger.info(`[Lagos Registry] Successfully authenticated, token expires at ${this.tokenExpiry}`);
    } catch (error) {
      logger.error('[Lagos Registry] Authentication failed:', { error: String(error) });
      throw error;
    }
  }

  /**
   * Verify Certificate of Occupancy
   */
  async verifyCofO(cofoNumber: string): Promise<CofOVerificationResult> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.get(`/cofo/verify/${cofoNumber}`);
      const data = response.data.data;

      return {
        isValid: data.isValid,
        cofoNumber: data.cofoNumber,
        parcelId: data.parcelId,
        ownerName: data.ownerName,
        issueDate: new Date(data.issueDate),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        status: data.status,
        verificationScore: data.verificationScore,
        verificationDetails: {
          documentAuthenticity: data.verificationDetails.documentAuthenticity,
          ownershipMatch: data.verificationDetails.ownershipMatch,
          noEncumbrances: data.verificationDetails.noEncumbrances,
          taxCompliance: data.verificationDetails.taxCompliance,
        },
        rawResponse: data,
      };
    });
  }

  /**
   * Get land record by parcel ID
   */
  async getLandRecord(parcelId: string): Promise<LandRecordData> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.get(`/land-records/${parcelId}`);
      const data = response.data.data;

      return {
        parcelId: data.parcelId,
        address: data.propertyAddress,
        state: 'Lagos',
        lga: data.lga,
        landSize: parseFloat(data.landSize),
        landSizeUnit: data.landSizeUnit || 'sqm',
        landUse: data.landUse,
        currentOwner: {
          name: data.currentOwner.name,
          contact: data.currentOwner.contact,
          idNumber: data.currentOwner.idNumber,
        },
        cofoNumber: data.cofoNumber,
        registrationDate: new Date(data.registrationDate),
        lastUpdated: new Date(data.lastUpdated),
        rawResponse: data,
      };
    });
  }

  /**
   * Get ownership history for a parcel
   */
  async getOwnershipHistory(parcelId: string): Promise<OwnershipRecord[]> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.get(`/ownership-history/${parcelId}`);
      const data = response.data.data;

      return data.map((record: any) => ({
        transferDate: new Date(record.transferDate),
        fromOwner: record.fromOwner,
        toOwner: record.toOwner,
        transferType: this.mapTransferType(record.transferType),
        transferValue: record.transferValue,
        deedNumber: record.deedNumber,
        registrationNumber: record.registrationNumber,
        notes: record.notes,
      }));
    });
  }

  /**
   * Submit verification request for manual review
   */
  async submitVerificationRequest(
    data: VerificationRequest
  ): Promise<VerificationResponse> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.post('/verification-request', {
        parcel_id: data.parcelId,
        cofo_number: data.cofoNumber,
        owner_name: data.ownerName,
        request_type: data.requestType,
        requester_info: {
          name: data.requesterInfo.name,
          email: data.requesterInfo.email,
          phone: data.requesterInfo.phone,
          organization: data.requesterInfo.organization,
        },
        additional_info: data.additionalInfo,
      });

      const result = response.data.data;

      return {
        requestId: result.requestId,
        status: result.status,
        estimatedCompletionTime: result.estimatedCompletionTime
          ? new Date(result.estimatedCompletionTime)
          : undefined,
        message: result.message,
      };
    });
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'ok';
    } catch (error) {
      logger.error('[Lagos Registry] Health check failed:', { error: String(error) });
      return false;
    }
  }

  /**
   * Map Lagos-specific transfer types to standard types
   */
  private mapTransferType(type: string): OwnershipRecord['transferType'] {
    const typeMap: Record<string, OwnershipRecord['transferType']> = {
      'purchase': 'sale',
      'sale': 'sale',
      'inheritance': 'inheritance',
      'gift': 'gift',
      'court_order': 'court_order',
      'government_allocation': 'government_allocation',
      'allocation': 'government_allocation',
    };

    return typeMap[type.toLowerCase()] || 'sale';
  }
}
