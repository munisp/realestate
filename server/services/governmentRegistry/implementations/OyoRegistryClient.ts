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
 * Oyo State Land Registry Client
 * Implements integration with Oyo State Lands API
 * 
 * API Base URL: https://api.oyostate.gov.ng/lands/api/v1
 * Authentication: OAuth 2.0
 * Rate Limit: 60 requests/minute
 */
export class OyoRegistryClient extends BaseGovernmentRegistryClient {
  constructor() {
    const config: RegistryConfig = {
      baseUrl: process.env.OYO_REGISTRY_BASE_URL || 'https://api.oyostate.gov.ng/lands/api/v1',
      authType: 'oauth',
      credentials: {
        clientId: process.env.OYO_REGISTRY_CLIENT_ID,
        clientSecret: process.env.OYO_REGISTRY_CLIENT_SECRET,
        redirectUri: process.env.OYO_REGISTRY_REDIRECT_URI,
      },
      rateLimit: {
        maxRequests: 60,
        perMinutes: 1,
      },
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
      },
    };

    super('OYO', config);
  }

  /**
   * Authenticate with Oyo State Lands OAuth
   */
  protected async authenticate(): Promise<void> {
    try {
      const response = await this.client.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: this.config.credentials.clientId,
        client_secret: this.config.credentials.clientSecret,
      });

      this.accessToken = (response as any).data.access_token;
      
      // Set token expiry (usually 1 hour)
      const expiresIn = (response as any).data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      logger.info(`[Oyo Registry] Successfully authenticated, token expires at ${this.tokenExpiry}`);
    } catch (error) {
      logger.error('[Oyo Registry] Authentication failed:', { error: String(error) });
      throw error;
    }
  }

  /**
   * Verify Certificate of Occupancy
   */
  async verifyCofO(cofoNumber: string): Promise<CofOVerificationResult> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.get(`/cofo/validate/${cofoNumber}`);
      const data = (response as any).data.data;

      return {
        isValid: data.validated === true,
        cofoNumber: data.certificate_number,
        parcelId: data.parcel_reference,
        ownerName: data.holder_name,
        issueDate: new Date(data.date_issued),
        expiryDate: data.expiry ? new Date(data.expiry) : undefined,
        status: this.mapStatus(data.certificate_status),
        verificationScore: data.validation_score || 0,
        verificationDetails: {
          documentAuthenticity: data.authenticity_check === 'passed',
          ownershipMatch: data.ownership_status === 'verified',
          noEncumbrances: data.encumbrance_status === 'clear',
          taxCompliance: data.tax_clearance === 'current',
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
      const response = await this.client.get('/parcels/search', {
        params: {
          parcel_id: parcelId,
        },
      });
      const data = (response as any).data.data[0]; // Search returns array

      if (!data) {
        throw new Error(`Parcel ${parcelId} not found`);
      }

      return {
        parcelId: data.parcel_id,
        address: data.location_address,
        state: 'Oyo',
        lga: data.lga,
        landSize: parseFloat(data.area),
        landSizeUnit: data.area_measurement || 'sqm',
        landUse: data.designated_use,
        currentOwner: {
          name: data.current_owner.full_name,
          contact: data.current_owner.contact_number,
          idNumber: data.current_owner.identification,
        },
        cofoNumber: data.cofo_reference,
        registrationDate: new Date(data.date_registered),
        lastUpdated: new Date(data.last_modified || data.date_registered),
        rawResponse: data,
      };
    });
  }

  /**
   * Get ownership history for a parcel
   */
  async getOwnershipHistory(parcelId: string): Promise<OwnershipRecord[]> {
    return this.makeRateLimitedRequest(async () => {
      const response = await this.client.get(`/ownership/${parcelId}/history`);
      const data = (response as any).data.data.transactions || [];

      return data.map((record: any) => ({
        transferDate: new Date(record.transaction_date),
        fromOwner: record.transferor,
        toOwner: record.transferee,
        transferType: this.mapTransferType(record.transaction_type),
        transferValue: record.consideration_amount,
        deedNumber: record.deed_reference,
        registrationNumber: record.registration_number,
        notes: record.additional_notes,
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
      const response = await this.client.post('/verification/request', {
        parcel_identifier: data.parcelId,
        certificate_number: data.cofoNumber,
        owner_name: data.ownerName,
        verification_category: data.requestType,
        applicant_details: {
          full_name: data.requesterInfo.name,
          email_address: data.requesterInfo.email,
          phone_number: data.requesterInfo.phone,
          organization_name: data.requesterInfo.organization,
        },
        supplementary_info: data.additionalInfo,
      });

      const result = (response as any).data.data;

      return {
        requestId: result.reference_number,
        status: this.mapRequestStatus(result.current_status),
        estimatedCompletionTime: result.expected_completion_date
          ? new Date(result.expected_completion_date)
          : undefined,
        message: result.status_message || 'Verification request submitted',
      };
    });
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/system/health');
      return (response as any).data.status === 'operational';
    } catch (error) {
      logger.error('[Oyo Registry] Health check failed:', { error: String(error) });
      return false;
    }
  }

  /**
   * Map Oyo-specific status to standard status
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
      'nullified': 'revoked',
      'suspended': 'suspended',
      'pending': 'suspended',
      'under_review': 'suspended',
    };

    return statusMap[status?.toLowerCase()] || 'suspended';
  }

  /**
   * Map Oyo-specific transfer types to standard types
   */
  private mapTransferType(type: string): OwnershipRecord['transferType'] {
    const typeMap: Record<string, OwnershipRecord['transferType']> = {
      'sale': 'sale',
      'purchase': 'sale',
      'conveyance': 'sale',
      'inheritance': 'inheritance',
      'succession': 'inheritance',
      'devolution': 'inheritance',
      'gift': 'gift',
      'donation': 'gift',
      'court_order': 'court_order',
      'judgment': 'court_order',
      'decree': 'court_order',
      'government_allocation': 'government_allocation',
      'allocation': 'government_allocation',
      'grant': 'government_allocation',
    };

    return typeMap[type?.toLowerCase()] || 'sale';
  }

  /**
   * Map Oyo-specific request status to standard status
   */
  private mapRequestStatus(status: string): VerificationResponse['status'] {
    const statusMap: Record<string, VerificationResponse['status']> = {
      'submitted': 'submitted',
      'received': 'submitted',
      'pending': 'submitted',
      'processing': 'processing',
      'under_review': 'processing',
      'in_progress': 'processing',
      'completed': 'completed',
      'verified': 'completed',
      'approved': 'completed',
      'rejected': 'rejected',
      'declined': 'rejected',
      'failed': 'rejected',
    };

    return statusMap[status?.toLowerCase()] || 'submitted';
  }
}
