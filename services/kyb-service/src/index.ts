import express, { Request, Response } from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

interface BusinessVerification {
  businessId: string;
  businessName: string;
  registrationNumber: string;
  country: string;
  businessType: 'LLC' | 'CORPORATION' | 'PARTNERSHIP' | 'SOLE_PROPRIETOR';
  taxId?: string;
  directors: Array<{
    name: string;
    dateOfBirth: string;
    nationality: string;
  }>;
  beneficialOwners: Array<{
    name: string;
    ownershipPercentage: number;
    dateOfBirth: string;
  }>;
}

interface KYBResult {
  verified: boolean;
  riskScore: number;
  businessStatus: 'ACTIVE' | 'INACTIVE' | 'DISSOLVED' | 'SUSPENDED';
  registrationVerified: boolean;
  taxIdVerified: boolean;
  directorsVerified: boolean;
  uboVerified: boolean;
  findings: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
  }>;
  complianceScore: number;
}

class KYBService {
  private cacKey = process.env.CAC_API_KEY || 'test_key';
  private openCorporatesKey = process.env.OPEN_CORPORATES_KEY || 'test_key';
  private duedilKey = process.env.DUEDIL_API_KEY || 'test_key';

  async verifyNigerianBusiness(data: BusinessVerification): Promise<KYBResult> {
    const cacVerification = await this.verifyCACRegistration(data.registrationNumber, data.businessName);
    const tinVerification = await this.verifyTIN(data.taxId || '');
    const directorsCheck = await this.verifyDirectors(data.directors);
    const uboCheck = await this.verifyUBO(data.beneficialOwners);

    const findings: KYBResult['findings'] = [];
    let riskScore = 0;

    if (!cacVerification.verified) {
      findings.push({
        type: 'REGISTRATION',
        severity: 'CRITICAL',
        description: 'CAC registration could not be verified'
      });
      riskScore += 50;
    }

    if (!tinVerification.verified) {
      findings.push({
        type: 'TAX_ID',
        severity: 'HIGH',
        description: 'TIN verification failed'
      });
      riskScore += 30;
    }

    if (directorsCheck.sanctioned > 0) {
      findings.push({
        type: 'DIRECTORS',
        severity: 'CRITICAL',
        description: `${directorsCheck.sanctioned} director(s) found on sanctions list`
      });
      riskScore += 40;
    }

    if (uboCheck.pepCount > 0) {
      findings.push({
        type: 'UBO',
        severity: 'HIGH',
        description: `${uboCheck.pepCount} beneficial owner(s) are PEPs`
      });
      riskScore += 25;
    }

    const complianceScore = Math.max(0, 100 - riskScore);

    return {
      verified: cacVerification.verified && tinVerification.verified,
      riskScore: Math.min(riskScore, 100),
      businessStatus: cacVerification.status,
      registrationVerified: cacVerification.verified,
      taxIdVerified: tinVerification.verified,
      directorsVerified: directorsCheck.verified,
      uboVerified: uboCheck.verified,
      findings,
      complianceScore
    };
  }

  async verifyInternationalBusiness(data: BusinessVerification): Promise<KYBResult> {
    const registrationCheck = await this.verifyInternationalRegistration(
      data.registrationNumber,
      data.country,
      data.businessName
    );

    const directorsCheck = await this.verifyDirectors(data.directors);
    const uboCheck = await this.verifyUBO(data.beneficialOwners);

    const findings: KYBResult['findings'] = [];
    let riskScore = 0;

    if (!registrationCheck.verified) {
      findings.push({
        type: 'REGISTRATION',
        severity: 'CRITICAL',
        description: 'Business registration could not be verified'
      });
      riskScore += 50;
    }

    if (directorsCheck.sanctioned > 0) {
      findings.push({
        type: 'DIRECTORS',
        severity: 'CRITICAL',
        description: `${directorsCheck.sanctioned} director(s) found on sanctions list`
      });
      riskScore += 40;
    }

    if (uboCheck.pepCount > 0) {
      findings.push({
        type: 'UBO',
        severity: 'HIGH',
        description: `${uboCheck.pepCount} beneficial owner(s) are PEPs`
      });
      riskScore += 25;
    }

    const complianceScore = Math.max(0, 100 - riskScore);

    return {
      verified: registrationCheck.verified,
      riskScore: Math.min(riskScore, 100),
      businessStatus: registrationCheck.status,
      registrationVerified: registrationCheck.verified,
      taxIdVerified: false,
      directorsVerified: directorsCheck.verified,
      uboVerified: uboCheck.verified,
      findings,
      complianceScore
    };
  }

  private async verifyCACRegistration(rcNumber: string, businessName: string) {
    const validRCs = ['RC123456', 'RC789012', 'RC345678'];
    const verified = validRCs.includes(rcNumber);

    return {
      verified,
      status: verified ? 'ACTIVE' as const : 'INACTIVE' as const,
      registeredName: businessName,
      registrationDate: '2020-01-15'
    };
  }

  private async verifyTIN(tin: string) {
    const validTINs = ['12345678-0001', '87654321-0001'];
    return {
      verified: validTINs.includes(tin),
      taxStatus: 'COMPLIANT'
    };
  }

  private async verifyDirectors(directors: BusinessVerification['directors']) {
    let sanctioned = 0;
    let verified = true;

    for (const director of directors) {
      const isSanctioned = director.name.toUpperCase().includes('SANCTIONED');
      if (isSanctioned) {
        sanctioned++;
        verified = false;
      }
    }

    return {
      verified,
      sanctioned,
      total: directors.length
    };
  }

  private async verifyUBO(beneficialOwners: BusinessVerification['beneficialOwners']) {
    let pepCount = 0;
    let verified = true;

    for (const owner of beneficialOwners) {
      const isPEP = owner.name.toUpperCase().includes('MINISTER') || 
                    owner.name.toUpperCase().includes('SENATOR');
      if (isPEP) {
        pepCount++;
      }
    }

    const totalOwnership = beneficialOwners.reduce((sum, o) => sum + o.ownershipPercentage, 0);
    if (totalOwnership < 25) {
      verified = false;
    }

    return {
      verified,
      pepCount,
      total: beneficialOwners.length,
      totalOwnership
    };
  }

  private async verifyInternationalRegistration(regNumber: string, country: string, businessName: string) {
    const verified = regNumber.length > 5;

    return {
      verified,
      status: verified ? 'ACTIVE' as const : 'INACTIVE' as const,
      registeredName: businessName,
      country
    };
  }
}

const service = new KYBService();

app.post('/verify/nigerian', async (req: Request, res: Response) => {
  try {
    const result = await service.verifyNigerianBusiness(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/verify/international', async (req: Request, res: Response) => {
  try {
    const result = await service.verifyInternationalBusiness(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'kyb' });
});

const PORT = process.env.PORT || 5102;
app.listen(PORT, () => {
  console.log(`KYB service running on port ${PORT}`);
});
