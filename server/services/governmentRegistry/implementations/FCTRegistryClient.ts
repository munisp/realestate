import { BaseGovernmentRegistryClient } from '../base/GovernmentRegistryClient';
import {
  CofOVerificationResult,
  LandRecordData,
  OwnershipRecord,
  VerificationRequest,
  VerificationResponse,
  RegistryConfig,
} from '../base/types';

/**
 * Federal Capital Territory (FCT) Abuja Land Registry Client
 * Implements integration with FCT Land Registry API
 * 
 * API Base URL: https://api.fct.gov.ng/land-registry/v1
 * Authentication: API Key
 * Rate Limit: 50 requests/minute
 */
export class FCTRegistryClient extends BaseGovernmentRegistryClient {
  private organizationId: string;

  constructor() {
    const config: RegistryConfig = {
      baseUrl: process.env.FCT_REGISTRY_BASE_URL || 'https://api.fct.gov.ng/land-registry/v1',
      authType: 'api_key',
      credentials: {
        apiKey: process.env.FCT_REGISTRY_API_KEY,
      },
      rateLimit: {
        maxRequests: 50,
        perMinutes: 1,
      },
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
      },
    };

    super('FCT', config);
    this.organizationId = process.env.FCT_REGISTRY_ORG_ID || '';
  }

  /**
   * FCT uses API Key authentication, no token refresh needed
   */
  protected async authenticate(): Promise<void> {
    // API Key authentication doesn't require token refresh
    // Key is added to headers in the base class
  }

  /**
   * Add organization ID to request headers
   */
  protected addAuthHeaders(config: any): any {
    config = super.addAuthHeaders(config);
    if (this.organizationId) {
      config.headers['X-Organization-ID'] = this.organizationId;
    }
    return config;
  }

  /**
   * Verify Certificate of Occupancy
   */
  async verifyCofO(cofoNumber: string): Promise<CofOVerificationResult> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.get(`/cofo/${cofoNumber}`);
      const data = response.data;

      return {
        isValid: data.valid,
        cofoNumber: data.certificate_number,
        parcelId: data.parcel_id,
        ownerName: data.owner_name,
        issueDate: new Date(data.issue_date),
        expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
        status: this.mapStatus(data.status),
        verificationScore: data.verification_score || this.calculateScore(data),
        verificationDetails: {
          documentAuthenticity: data.document_authentic === true,
          ownershipMatch: data.ownership_verified === true,
          noEncumbrances: data.encumbrances_clear === true,
          taxCompliance: data.tax_compliant === true,
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
      const response = await this.client.get(`/parcels/${parcelId}`);
      const data = response.data;

      return {
        parcelId: data.parcel_id,
        address: data.address,
        state: 'FCT',
        lga: data.area_council || 'Abuja',
        landSize: parseFloat(data.size),
        landSizeUnit: data.size_unit || 'sqm',
        landUse: data.land_use_type,
        currentOwner: {
          name: data.owner.name,
          contact: data.owner.contact,
          idNumber: data.owner.id_number,
        },
        cofoNumber: data.certificate_number,
        registrationDate: new Date(data.registration_date),
        lastUpdated: new Date(data.last_updated || data.registration_date),
        rawResponse: data,
      };
    });
  }

  /**
   * Get ownership history for a parcel
   */
  async getOwnershipHistory(parcelId: string): Promise<OwnershipRecord[]> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.get(`/transactions/${parcelId}`);
      const data = response.data;

      if (!Array.isArray(data.transactions)) {
        return [];
      }

      return data.transactions.map((record: any) => ({
        transferDate: new Date(record.transaction_date),
        fromOwner: record.previous_owner,
        toOwner: record.new_owner,
        transferType: this.mapTransferType(record.transaction_type),
        transferValue: record.transaction_value,
        deedNumber: record.deed_number,
        registrationNumber: record.registration_number,
        notes: record.remarks,
      }));
    });
  }

  /**
   * Submit verification request
   */
  async submitVerificationRequest(
    data: VerificationRequest
  ): Promise<VerificationResponse> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.post('/verify', {
        parcel_id: data.parcelId,
        certificate_number: data.cofoNumber,
        owner_name: data.ownerName,
        verification_type: data.requestType,
        requester: {
          name: data.requesterInfo.name,
          email: data.requesterInfo.email,
          phone: data.requesterInfo.phone,
          organization: data.requesterInfo.organization,
        },
        additional_data: data.additionalInfo,
      });

      const result = response.data;

      return {
        requestId: result.request_id,
        status: this.mapVerificationStatus(result.status),
        estimatedCompletionTime: result.estimated_completion
          ? new Date(result.estimated_completion)
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
      const response = await this.client.get('/status');
      return response.data.operational === true;
    } catch (error) {
      console.error('[FCT Registry] Health check failed:', error);
      return false;
    }
  }

  /**
   * Map FCT status codes to standard status
   */
  private mapStatus(status: string): CofOVerificationResult['status'] {
    const statusMap: Record<string, CofOVerificationResult['status']> = {
      'active': 'active',
      'valid': 'active',
      'expired': 'expired',
      'revoked': 'revoked',
      'cancelled': 'revoked',
      'suspended': 'suspended',
    };

    return statusMap[status.toLowerCase()] || 'active';
  }

  /**
   * Map FCT verification status to standard status
   */
  private mapVerificationStatus(status: string): VerificationResponse['status'] {
    const statusMap: Record<string, VerificationResponse['status']> = {
      'pending': 'pending',
      'in_progress': 'processing',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'rejected': 'failed',
    };

    return statusMap[status.toLowerCase()] || 'pending';
  }

  /**
   * Map FCT transfer types to standard types
   */
  private mapTransferType(type: string): OwnershipRecord['transferType'] {
    const typeMap: Record<string, OwnershipRecord['transferType']> = {
      'sale': 'sale',
      'purchase': 'sale',
      'inheritance': 'inheritance',
      'bequest': 'inheritance',
      'gift': 'gift',
      'donation': 'gift',
      'court_order': 'court_order',
      'judicial': 'court_order',
      'allocation': 'government_allocation',
      'government_allocation': 'government_allocation',
    };

    return typeMap[type.toLowerCase()] || 'sale';
  }

  /**
   * Calculate verification score from individual checks
   */
  private calculateScore(data: any): number {
    let score = 0;
    let checks = 0;

    if (data.document_authentic !== undefined) {
      checks++;
      if (data.document_authentic) score += 25;
    }
    if (data.ownership_verified !== undefined) {
      checks++;
      if (data.ownership_verified) score += 25;
    }
    if (data.encumbrances_clear !== undefined) {
      checks++;
      if (data.encumbrances_clear) score += 25;
    }
    if (data.tax_compliant !== undefined) {
      checks++;
      if (data.tax_compliant) score += 25;
    }

    return checks > 0 ? score : 0;
  }
}
