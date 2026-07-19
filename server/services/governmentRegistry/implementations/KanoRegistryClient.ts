// @ts-nocheck
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
 * Kano State Land Registry Client
 * Implements integration with Kano State Land Bureau API
 * 
 * API Base URL: https://api.kanostate.gov.ng/land-bureau/v1
 * Authentication: JWT Token
 * Rate Limit: 40 requests/minute
 */
export class KanoRegistryClient extends BaseGovernmentRegistryClient {
  constructor() {
    const config: RegistryConfig = {
      baseUrl: process.env.KANO_REGISTRY_BASE_URL || 'https://api.kanostate.gov.ng/land-bureau/v1',
      authType: 'jwt',
      credentials: {
        clientId: process.env.KANO_REGISTRY_CLIENT_ID,
        clientSecret: process.env.KANO_REGISTRY_CLIENT_SECRET,
      },
      rateLimit: {
        maxRequests: 40,
        perMinutes: 1,
      },
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
      },
    };

    super('KANO', config);
  }

  /**
   * Authenticate with Kano Land Bureau JWT
   */
  protected async authenticate(): Promise<void> {
    try {
      const response = await this.client.post('/auth/token', {
        client_id: this.config.credentials.clientId,
        client_secret: this.config.credentials.clientSecret,
        grant_type: 'client_credentials',
      });

      this.accessToken = response.data.token;
      
      // JWT tokens typically expire in 2 hours for Kano
      const expiresIn = response.data.expires_in || 7200;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      console.log(`[Kano Registry] Successfully authenticated, token expires at ${this.tokenExpiry}`);
    } catch (error) {
      console.error('[Kano Registry] Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Verify Certificate of Occupancy
   */
  async verifyCofO(cofoNumber: string): Promise<CofOVerificationResult> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.get('/verify-cofo', {
        params: {
          cofoNumber: cofoNumber,
        },
      });
      const data = response.data.result;

      return {
        isValid: data.is_valid === true,
        cofoNumber: data.cofo_number,
        parcelId: data.parcel_id,
        ownerName: data.owner_name,
        issueDate: new Date(data.issue_date),
        expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
        status: this.mapStatus(data.status),
        verificationScore: data.score || 0,
        verificationDetails: {
          documentAuthenticity: data.document_valid === true,
          ownershipMatch: data.ownership_confirmed === true,
          noEncumbrances: data.clear_title === true,
          taxCompliance: data.tax_status === 'compliant',
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
      const response = await this.client.get(`/land/${parcelId}`);
      const data = response.data.land_info;

      return {
        parcelId: data.parcel_id,
        address: data.property_address,
        state: 'Kano',
        lga: data.local_govt_area,
        landSize: parseFloat(data.size),
        landSizeUnit: data.size_unit || 'sqm',
        landUse: data.use_type,
        currentOwner: {
          name: data.owner.name,
          contact: data.owner.phone,
          idNumber: data.owner.nin,
        },
        cofoNumber: data.cofo_ref,
        registrationDate: new Date(data.reg_date),
        lastUpdated: new Date(data.updated_at || data.reg_date),
        rawResponse: data,
      };
    });
  }

  /**
   * Get ownership history for a parcel
   */
  async getOwnershipHistory(parcelId: string): Promise<OwnershipRecord[]> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.get(`/history/${parcelId}`);
      const data = response.data.transfers || [];

      return data.map((record: any) => ({
        transferDate: new Date(record.date),
        fromOwner: record.seller || record.from_owner,
        toOwner: record.buyer || record.to_owner,
        transferType: this.mapTransferType(record.type),
        transferValue: record.value,
        deedNumber: record.deed_no,
        registrationNumber: record.reg_no,
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
      const response = await this.client.post('/verification/submit', {
        parcel_id: data.parcelId,
        cofo_number: data.cofoNumber,
        owner_name: data.ownerName,
        verification_type: data.requestType,
        requester: {
          name: data.requesterInfo.name,
          email: data.requesterInfo.email,
          phone: data.requesterInfo.phone,
          org: data.requesterInfo.organization,
        },
        metadata: data.additionalInfo,
      });

      const result = response.data;

      return {
        requestId: result.verification_id,
        status: this.mapRequestStatus(result.status),
        estimatedCompletionTime: result.eta
          ? new Date(result.eta)
          : undefined,
        message: result.message || 'Verification request received',
      };
    });
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.healthy === true;
    } catch (error) {
      console.error('[Kano Registry] Health check failed:', error);
      return false;
    }
  }

  /**
   * Map Kano-specific status to standard status
   */
  private mapStatus(status: string): CofOVerificationResult['status'] {
    const statusMap: Record<string, CofOVerificationResult['status']> = {
      'valid': 'active',
      'active': 'active',
      'current': 'active',
      'expired': 'expired',
      'lapsed': 'expired',
      'revoked': 'revoked',
      'cancelled': 'revoked',
      'suspended': 'suspended',
      'on_hold': 'suspended',
    };

    return statusMap[status?.toLowerCase()] || 'suspended';
  }

  /**
   * Map Kano-specific transfer types to standard types
   */
  private mapTransferType(type: string): OwnershipRecord['transferType'] {
    const typeMap: Record<string, OwnershipRecord['transferType']> = {
      'sale': 'sale',
      'purchase': 'sale',
      'inheritance': 'inheritance',
      'succession': 'inheritance',
      'gift': 'gift',
      'donation': 'gift',
      'court_order': 'court_order',
      'court_ruling': 'court_order',
      'government_allocation': 'government_allocation',
      'allocation': 'government_allocation',
      'grant': 'government_allocation',
    };

    return typeMap[type?.toLowerCase()] || 'sale';
  }

  /**
   * Map Kano-specific request status to standard status
   */
  private mapRequestStatus(status: string): VerificationResponse['status'] {
    const statusMap: Record<string, VerificationResponse['status']> = {
      'received': 'submitted',
      'submitted': 'submitted',
      'pending': 'submitted',
      'in_review': 'processing',
      'processing': 'processing',
      'completed': 'completed',
      'verified': 'completed',
      'rejected': 'rejected',
      'declined': 'rejected',
    };

    return statusMap[status?.toLowerCase()] || 'submitted';
  }
}
