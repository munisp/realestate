import { logger } from "../_core/logger";
// @ts-nocheck
/**
 * Mock Nigerian Government Registry API Service
 * Simulates responses from Lagos State and FCT Abuja land registries
 */

export interface RegistryVerificationResult {
  success: boolean;
  verified: boolean;
  certificateNumber: string;
  registry: 'lagos' | 'fct-abuja' | 'unknown';
  details?: {
    ownerName: string;
    propertyAddress: string;
    plotNumber: string;
    landSize: string;
    registrationDate: string;
    expiryDate?: string;
    encumbrances: string[];
    status: 'active' | 'expired' | 'revoked' | 'pending';
  };
  confidence: number;
  verificationDate: Date;
  error?: string;
}

export interface RegistrySearchResult {
  found: boolean;
  matches: Array<{
    certificateNumber: string;
    ownerName: string;
    propertyAddress: string;
    registrationDate: string;
    status: string;
  }>;
  totalResults: number;
}

class MockGovernmentRegistryService {
  private mockDatabase: Map<string, RegistryVerificationResult['details']> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize mock registry data
   */
  private initializeMockData(): void {
    // Lagos State mock certificates
    this.mockDatabase.set('LAG/2023/001234', {
      ownerName: 'Adebayo Ogunlesi',
      propertyAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
      plotNumber: 'Plot 15, Block A, Lekki Phase 1',
      landSize: '600 sqm',
      registrationDate: '2023-03-15',
      expiryDate: '2122-03-15',
      encumbrances: [],
      status: 'active'
    });

    this.mockDatabase.set('LAG/2022/005678', {
      ownerName: 'Chioma Nwosu',
      propertyAddress: '42 Banana Island Road, Ikoyi, Lagos',
      plotNumber: 'Plot 42, Banana Island',
      landSize: '800 sqm',
      registrationDate: '2022-11-20',
      expiryDate: '2121-11-20',
      encumbrances: ['Mortgage with First Bank Nigeria'],
      status: 'active'
    });

    // FCT Abuja mock certificates
    this.mockDatabase.set('FCT/2023/009876', {
      ownerName: 'Ibrahim Yusuf',
      propertyAddress: 'Plot 123, Maitama District, Abuja',
      plotNumber: 'Plot 123, Maitama',
      landSize: '1000 sqm',
      registrationDate: '2023-01-10',
      expiryDate: '2122-01-10',
      encumbrances: [],
      status: 'active'
    });

    this.mockDatabase.set('FCT/2021/003456', {
      ownerName: 'Fatima Mohammed',
      propertyAddress: 'Plot 456, Asokoro District, Abuja',
      plotNumber: 'Plot 456, Asokoro',
      landSize: '750 sqm',
      registrationDate: '2021-06-25',
      expiryDate: '2120-06-25',
      encumbrances: [],
      status: 'active'
    });

    // Expired certificate
    this.mockDatabase.set('LAG/2000/001111', {
      ownerName: 'Old Owner Name',
      propertyAddress: 'Old Property Address',
      plotNumber: 'Plot 111',
      landSize: '500 sqm',
      registrationDate: '2000-01-01',
      expiryDate: '2020-01-01',
      encumbrances: [],
      status: 'expired'
    });
  }

  /**
   * Detect registry from certificate number format
   */
  private detectRegistry(certificateNumber: string): 'lagos' | 'fct-abuja' | 'unknown' {
    const cleaned = certificateNumber.toUpperCase().trim();
    
    if (cleaned.startsWith('LAG/')) {
      return 'lagos';
    } else if (cleaned.startsWith('FCT/')) {
      return 'fct-abuja';
    }
    
    return 'unknown';
  }

  /**
   * Verify C of O certificate
   */
  async verifyCertificate(certificateNumber: string): Promise<RegistryVerificationResult> {
    logger.info('[MockRegistry] Verifying certificate:', { detail: String(certificateNumber) });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const registry = this.detectRegistry(certificateNumber);
    
    if (registry === 'unknown') {
      return {
        success: false,
        verified: false,
        certificateNumber,
        registry: 'unknown',
        confidence: 0,
        verificationDate: new Date(),
        error: 'Invalid certificate number format. Expected LAG/YYYY/XXXXXX or FCT/YYYY/XXXXXX'
      };
    }

    // Check mock database
    const details = this.mockDatabase.get(certificateNumber.toUpperCase().trim());
    
    if (!details) {
      // Simulate 10% chance of temporary API error
      if (Math.random() < 0.1) {
        return {
          success: false,
          verified: false,
          certificateNumber,
          registry,
          confidence: 0,
          verificationDate: new Date(),
          error: 'Registry API temporarily unavailable. Please try again later.'
        };
      }

      return {
        success: true,
        verified: false,
        certificateNumber,
        registry,
        confidence: 95,
        verificationDate: new Date(),
        error: 'Certificate not found in registry database'
      };
    }

    // Calculate confidence based on certificate status
    let confidence = 95;
    if (details.status === 'expired') {
      confidence = 70;
    } else if (details.status === 'revoked') {
      confidence = 50;
    } else if (details.status === 'pending') {
      confidence = 60;
    }

    return {
      success: true,
      verified: details.status === 'active',
      certificateNumber,
      registry,
      details,
      confidence,
      verificationDate: new Date()
    };
  }

  /**
   * Search registry by owner name
   */
  async searchByOwner(ownerName: string, registry?: 'lagos' | 'fct-abuja'): Promise<RegistrySearchResult> {
    console.log('[MockRegistry] Searching by owner:', ownerName, 'in', registry || 'all registries');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const matches: RegistrySearchResult['matches'] = [];
    const searchTerm = ownerName.toLowerCase();

    for (const [certNumber, details] of this.mockDatabase.entries()) {
      const certRegistry = this.detectRegistry(certNumber);
      
      // Filter by registry if specified
      if (registry && certRegistry !== registry) {
        continue;
      }

      // Search by owner name
      if (details.ownerName.toLowerCase().includes(searchTerm)) {
        matches.push({
          certificateNumber: certNumber,
          ownerName: details.ownerName,
          propertyAddress: details.propertyAddress,
          registrationDate: details.registrationDate,
          status: details.status
        });
      }
    }

    return {
      found: matches.length > 0,
      matches,
      totalResults: matches.length
    };
  }

  /**
   * Search registry by property address
   */
  async searchByAddress(address: string, registry?: 'lagos' | 'fct-abuja'): Promise<RegistrySearchResult> {
    console.log('[MockRegistry] Searching by address:', address, 'in', registry || 'all registries');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const matches: RegistrySearchResult['matches'] = [];
    const searchTerm = address.toLowerCase();

    for (const [certNumber, details] of this.mockDatabase.entries()) {
      const certRegistry = this.detectRegistry(certNumber);
      
      // Filter by registry if specified
      if (registry && certRegistry !== registry) {
        continue;
      }

      // Search by address
      if (details.propertyAddress.toLowerCase().includes(searchTerm)) {
        matches.push({
          certificateNumber: certNumber,
          ownerName: details.ownerName,
          propertyAddress: details.propertyAddress,
          registrationDate: details.registrationDate,
          status: details.status
        });
      }
    }

    return {
      found: matches.length > 0,
      matches,
      totalResults: matches.length
    };
  }

  /**
   * Batch verify multiple certificates
   */
  async batchVerify(certificateNumbers: string[]): Promise<RegistryVerificationResult[]> {
    console.log('[MockRegistry] Batch verifying', certificateNumbers.length, 'certificates');

    const results: RegistryVerificationResult[] = [];
    
    // Process in batches of 5 to simulate rate limiting
    for (let i = 0; i < certificateNumbers.length; i += 5) {
      const batch = certificateNumbers.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map((certNum: any) => this.verifyCertificate(certNum))
      );
      results.push(...batchResults);
      
      // Add delay between batches
      if (i + 5 < certificateNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): {
    totalCertificates: number;
    activeCount: number;
    expiredCount: number;
    revokedCount: number;
    lagosCount: number;
    fctCount: number;
  } {
    let activeCount = 0;
    let expiredCount = 0;
    let revokedCount = 0;
    let lagosCount = 0;
    let fctCount = 0;

    for (const [certNumber, details] of this.mockDatabase.entries()) {
      const registry = this.detectRegistry(certNumber);
      
      if (registry === 'lagos') lagosCount++;
      if (registry === 'fct-abuja') fctCount++;
      
      if (details.status === 'active') activeCount++;
      if (details.status === 'expired') expiredCount++;
      if (details.status === 'revoked') revokedCount++;
    }

    return {
      totalCertificates: this.mockDatabase.size,
      activeCount,
      expiredCount,
      revokedCount,
      lagosCount,
      fctCount
    };
  }

  /**
   * Add mock certificate (for testing)
   */
  addMockCertificate(
    certificateNumber: string,
    details: RegistryVerificationResult['details']
  ): void {
    this.mockDatabase.set(certificateNumber.toUpperCase().trim(), details);
  }
}

// Export singleton instance
export const mockGovernmentRegistry = new MockGovernmentRegistryService();
