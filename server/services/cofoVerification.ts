/**
 * Certificate of Occupancy (C of O) Verification Service
 * Integrates document processing, government registry verification, and SMS notifications
 */

import { mockGovernmentRegistry, type RegistryVerificationResult } from './mockGovernmentRegistry';
import { mockTwilioSMS, type SMSDeliveryResult } from './mockTwilioSms';

export interface COFOVerificationRequest {
  certificateNumber: string;
  ownerName: string;
  propertyAddress: string;
  phoneNumber?: string;
  documentUrl?: string;
}

export interface COFOVerificationResponse {
  verificationId: string;
  status: 'verified' | 'not_verified' | 'pending' | 'error';
  certificateNumber: string;
  registryVerification: RegistryVerificationResult;
  documentAnalysis?: {
    extracted: boolean;
    certificateNumber?: string;
    ownerName?: string;
    propertyAddress?: string;
    confidence: number;
  };
  smsNotification?: SMSDeliveryResult;
  timestamp: Date;
  summary: string;
}

export interface COFOVerificationHistory {
  verificationId: string;
  certificateNumber: string;
  status: string;
  verifiedAt: Date;
  registry: string;
  ownerName?: string;
}

class COFOVerificationService {
  private verificationHistory: Map<string, COFOVerificationResponse> = new Map();

  /**
   * Generate unique verification ID
   */
  private generateVerificationId(): string {
    return `COFO-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Extract certificate details from document (mock OCR)
   */
  private async extractCertificateDetails(documentUrl: string): Promise<{
    extracted: boolean;
    certificateNumber?: string;
    ownerName?: string;
    propertyAddress?: string;
    confidence: number;
  }> {
    console.log('[COFOVerification] Extracting details from document:', documentUrl);

    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Simulate 90% success rate for OCR
    const extracted = Math.random() > 0.1;

    if (!extracted) {
      return {
        extracted: false,
        confidence: 0
      };
    }

    // Mock extracted data (in production, this would use actual OCR)
    return {
      extracted: true,
      certificateNumber: 'LAG/2023/001234',
      ownerName: 'Adebayo Ogunlesi',
      propertyAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
      confidence: 85 + Math.random() * 10 // 85-95% confidence
    };
  }

  /**
   * Verify C of O certificate
   */
  async verifyCertificate(request: COFOVerificationRequest): Promise<COFOVerificationResponse> {
    console.log('[COFOVerification] Starting verification for:', request.certificateNumber);

    const verificationId = this.generateVerificationId();
    let documentAnalysis;
    let smsNotification;

    try {
      // Step 1: Extract details from document if provided
      if (request.documentUrl) {
        documentAnalysis = await this.extractCertificateDetails(request.documentUrl);
        
        // Use extracted certificate number if available and confidence is high
        if (documentAnalysis.extracted && documentAnalysis.confidence > 80 && documentAnalysis.certificateNumber) {
          request.certificateNumber = documentAnalysis.certificateNumber;
        }
      }

      // Step 2: Verify with government registry
      const registryVerification = await mockGovernmentRegistry.verifyCertificate(request.certificateNumber);

      // Step 3: Send SMS notification if phone number provided
      if (request.phoneNumber) {
        const smsBody = this.generateSMSMessage(request.certificateNumber, registryVerification);
        smsNotification = await mockTwilioSMS.sendSMSWithRetry(
          request.phoneNumber,
          smsBody,
          { maxRetries: 3 }
        );
      }

      // Determine overall status
      let status: COFOVerificationResponse['status'];
      let summary: string;

      if (!registryVerification.success) {
        status = 'error';
        summary = `Verification failed: ${registryVerification.error}`;
      } else if (registryVerification.verified) {
        status = 'verified';
        summary = `Certificate verified successfully with ${registryVerification.registry} registry. Owner: ${registryVerification.details?.ownerName}`;
      } else {
        status = 'not_verified';
        summary = `Certificate not found or invalid in ${registryVerification.registry} registry`;
      }

      const response: COFOVerificationResponse = {
        verificationId,
        status,
        certificateNumber: request.certificateNumber,
        registryVerification,
        documentAnalysis,
        smsNotification,
        timestamp: new Date(),
        summary
      };

      // Store in history
      this.verificationHistory.set(verificationId, response);

      console.log('[COFOVerification] Verification complete:', { verificationId, status });

      return response;

    } catch (error) {
      console.error('[COFOVerification] Verification error:', error);

      const errorResponse: COFOVerificationResponse = {
        verificationId,
        status: 'error',
        certificateNumber: request.certificateNumber,
        registryVerification: {
          success: false,
          verified: false,
          certificateNumber: request.certificateNumber,
          registry: 'unknown',
          confidence: 0,
          verificationDate: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        documentAnalysis,
        smsNotification,
        timestamp: new Date(),
        summary: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

      this.verificationHistory.set(verificationId, errorResponse);

      return errorResponse;
    }
  }

  /**
   * Generate SMS message based on verification result
   */
  private generateSMSMessage(certificateNumber: string, result: RegistryVerificationResult): string {
    if (!result.success) {
      return `C of O Verification Failed\n\nCertificate: ${certificateNumber}\nStatus: Error\nReason: ${result.error}\n\nPlease try again or contact support.`;
    }

    if (result.verified && result.details) {
      return `C of O Verified Successfully ✓\n\nCertificate: ${certificateNumber}\nOwner: ${result.details.ownerName}\nProperty: ${result.details.propertyAddress}\nStatus: ${result.details.status.toUpperCase()}\nConfidence: ${result.confidence}%\n\nVerified with ${result.registry.toUpperCase()} registry.`;
    }

    return `C of O Verification Failed\n\nCertificate: ${certificateNumber}\nStatus: Not Found\nRegistry: ${result.registry.toUpperCase()}\n\nThis certificate could not be verified. Please check the certificate number and try again.`;
  }

  /**
   * Batch verify multiple certificates
   */
  async batchVerify(
    requests: COFOVerificationRequest[]
  ): Promise<COFOVerificationResponse[]> {
    console.log('[COFOVerification] Batch verifying', requests.length, 'certificates');

    const results: COFOVerificationResponse[] = [];

    // Process in batches of 5 to avoid overwhelming the registry API
    for (let i = 0; i < requests.length; i += 5) {
      const batch = requests.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(request => this.verifyCertificate(request))
      );
      results.push(...batchResults);

      // Add delay between batches
      if (i + 5 < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Get verification by ID
   */
  getVerification(verificationId: string): COFOVerificationResponse | null {
    return this.verificationHistory.get(verificationId) || null;
  }

  /**
   * Get verification history
   */
  getVerificationHistory(limit: number = 50): COFOVerificationHistory[] {
    const history: COFOVerificationHistory[] = [];

    for (const [verificationId, verification] of this.verificationHistory.entries()) {
      history.push({
        verificationId,
        certificateNumber: verification.certificateNumber,
        status: verification.status,
        verifiedAt: verification.timestamp,
        registry: verification.registryVerification.registry,
        ownerName: verification.registryVerification.details?.ownerName
      });
    }

    // Sort by date descending and limit
    return history
      .sort((a, b) => b.verifiedAt.getTime() - a.verifiedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Search verification history by certificate number
   */
  searchHistory(certificateNumber: string): COFOVerificationHistory[] {
    const results: COFOVerificationHistory[] = [];

    for (const [verificationId, verification] of this.verificationHistory.entries()) {
      if (verification.certificateNumber.toLowerCase().includes(certificateNumber.toLowerCase())) {
        results.push({
          verificationId,
          certificateNumber: verification.certificateNumber,
          status: verification.status,
          verifiedAt: verification.timestamp,
          registry: verification.registryVerification.registry,
          ownerName: verification.registryVerification.details?.ownerName
        });
      }
    }

    return results.sort((a, b) => b.verifiedAt.getTime() - a.verifiedAt.getTime());
  }

  /**
   * Get verification statistics
   */
  getVerificationStats(): {
    total: number;
    verified: number;
    notVerified: number;
    errors: number;
    successRate: number;
    smsDeliveryRate: number;
  } {
    const verifications = Array.from(this.verificationHistory.values());
    const total = verifications.length;
    const verified = verifications.filter(v => v.status === 'verified').length;
    const notVerified = verifications.filter(v => v.status === 'not_verified').length;
    const errors = verifications.filter(v => v.status === 'error').length;
    
    const smsAttempts = verifications.filter(v => v.smsNotification).length;
    const smsSuccess = verifications.filter(v => v.smsNotification?.success).length;

    return {
      total,
      verified,
      notVerified,
      errors,
      successRate: total > 0 ? (verified / total) * 100 : 0,
      smsDeliveryRate: smsAttempts > 0 ? (smsSuccess / smsAttempts) * 100 : 0
    };
  }

  /**
   * Clear history (for testing)
   */
  clearHistory(): void {
    this.verificationHistory.clear();
  }
}

// Export singleton instance
export const cofoVerificationService = new COFOVerificationService();
