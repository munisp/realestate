// @ts-nocheck
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
 * Rivers State Land Registry Client
 * Implements integration with Rivers State Land Registry API
 * 
 * API Base URL: https://api.riversstate.gov.ng/lands/v1
 * Authentication: Basic Auth + API Key
 * Rate Limit: 30 requests/minute
 */
export class RiversRegistryClient extends BaseGovernmentRegistryClient {
  constructor() {
    const config: RegistryConfig = {
      baseUrl: process.env.RIVERS_REGISTRY_BASE_URL || 'https://api.riversstate.gov.ng/lands/v1',
      authType: 'basic',
      credentials: {
        username: process.env.RIVERS_REGISTRY_USERNAME,
        password: process.env.RIVERS_REGISTRY_PASSWORD,
        apiKey: process.env.RIVERS_REGISTRY_API_KEY,
      },
      rateLimit: {
        maxRequests: 30,
        perMinutes: 1,
      },
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
      },
    };

    super('RIVERS', config);
  }

  /**
   * Rivers uses Basic Auth, no separate authentication needed
   */
  protected async authenticate(): Promise<void> {
    // Basic auth is handled in headers, no token needed
    logger.info('[Rivers Registry] Using Basic Authentication');
  }

  /**
   * Verify Certificate of Occupancy
   */
  async verifyCofO(cofoNumber: string): Promise<CofOVerificationResult> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.get(`/certificates/${cofoNumber}`);
      const data = response.data;

      return {
        isValid: data.valid === true,
        cofoNumber: data.certificate_number,
        parcelId: data.parcel_id,
        ownerName: data.owner_name,
        issueDate: new Date(data.issue_date),
        expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
        status: this.mapStatus(data.status),
        verificationScore: data.verification_score || 0,
        verificationDetails: {
          documentAuthenticity: data.authentic === true,
          ownershipMatch: data.ownership_verified === true,
          noEncumbrances: data.no_encumbrances === true,
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
      const response = await this.client.get(`/records/${parcelId}`);
      const data = response.data;

      return {
        parcelId: data.parcel_id,
        address: data.address,
        state: 'Rivers',
        lga: data.local_government,
        landSize: parseFloat(data.land_area),
        landSizeUnit: data.area_unit || 'sqm',
        landUse: data.land_use_type,
        currentOwner: {
          name: data.owner_name,
          contact: data.owner_contact,
          idNumber: data.owner_id,
        },
        cofoNumber: data.cofo_number,
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
      const response = await this.client.get(`/owners/${parcelId}/history`);
      const data = response.data.history || [];

      return data.map((record: any) => ({
        transferDate: new Date(record.transfer_date),
        fromOwner: record.previous_owner,
        toOwner: record.new_owner,
        transferType: this.mapTransferType(record.transfer_type),
        transferValue: record.transfer_amount,
        deedNumber: record.deed_ref,
        registrationNumber: record.reg_number,
        notes: record.remarks,
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
      const response = await this.client.post('/verification-requests', {
        parcel_id: data.parcelId,
        cofo_number: data.cofoNumber,
        owner_name: data.ownerName,
        request_type: data.requestType,
        requester: {
          name: data.requesterInfo.name,
          email: data.requesterInfo.email,
          phone: data.requesterInfo.phone,
        },
        additional_data: data.additionalInfo,
      });

      const result = response.data;

      return {
        requestId: result.request_id,
        status: this.mapRequestStatus(result.status),
        estimatedCompletionTime: result.estimated_completion
          ? new Date(result.estimated_completion)
          : undefined,
        message: result.message || 'Verification request submitted successfully',
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
      logger.error('[Rivers Registry] Health check failed:', { error: String(error) });
      return false;
    }
  }

  /**
   * Map Rivers-specific status to standard status
   */
  private mapStatus(status: string): CofOVerificationResult['status'] {
    const statusMap: Record<string, CofOVerificationResult['status']> = {
      'valid': 'active',
      'active': 'active',
      'expired': 'expired',
      'revoked': 'revoked',
      'cancelled': 'revoked',
      'suspended': 'suspended',
      'pending': 'suspended',
    };

    return statusMap[status?.toLowerCase()] || 'suspended';
  }

  /**
   * Map Rivers-specific transfer types to standard types
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
      'government_allocation': 'government_allocation',
      'allocation': 'government_allocation',
    };

    return typeMap[type?.toLowerCase()] || 'sale';
  }

  /**
   * Map Rivers-specific request status to standard status
   */
  private mapRequestStatus(status: string): VerificationResponse['status'] {
    const statusMap: Record<string, VerificationResponse['status']> = {
      'submitted': 'submitted',
      'pending': 'submitted',
      'in_progress': 'processing',
      'processing': 'processing',
      'completed': 'completed',
      'done': 'completed',
      'rejected': 'rejected',
      'failed': 'rejected',
    };

    return statusMap[status?.toLowerCase()] || 'submitted';
  }
}
