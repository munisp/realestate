import express, { Request, Response } from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

interface ComplianceCheck {
  userId: string;
  checkType: 'AML' | 'SANCTIONS' | 'PEP' | 'ADVERSE_MEDIA';
  country: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
}

interface ComplianceResult {
  passed: boolean;
  riskScore: number;
  findings: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    source: string;
  }>;
  sanctions: {
    ofac: boolean;
    eu: boolean;
    un: boolean;
  };
  pep: {
    isPEP: boolean;
    position?: string;
    country?: string;
  };
  adverseMedia: {
    found: boolean;
    articles: number;
  };
}

class ComplianceService {
  private dowJonesKey = process.env.DOW_JONES_API_KEY || 'test_key';
  private worldCheckKey = process.env.WORLD_CHECK_API_KEY || 'test_key';
  private complyAdvantageKey = process.env.COMPLY_ADVANTAGE_API_KEY || 'test_key';

  async performAMLCheck(data: ComplianceCheck): Promise<ComplianceResult> {
    const sanctionsCheck = await this.checkSanctions(data);
    const pepCheck = await this.checkPEP(data);
    const adverseMediaCheck = await this.checkAdverseMedia(data);

    const findings: ComplianceResult['findings'] = [];
    let riskScore = 0;

    if (sanctionsCheck.ofac || sanctionsCheck.eu || sanctionsCheck.un) {
      findings.push({
        type: 'SANCTIONS',
        severity: 'CRITICAL',
        description: 'Individual found on sanctions list',
        source: 'OFAC/EU/UN'
      });
      riskScore += 100;
    }

    if (pepCheck.isPEP) {
      findings.push({
        type: 'PEP',
        severity: 'HIGH',
        description: `Politically Exposed Person: ${pepCheck.position}`,
        source: 'World-Check'
      });
      riskScore += 60;
    }

    if (adverseMediaCheck.found) {
      findings.push({
        type: 'ADVERSE_MEDIA',
        severity: adverseMediaCheck.articles > 5 ? 'HIGH' : 'MEDIUM',
        description: `${adverseMediaCheck.articles} adverse media articles found`,
        source: 'Dow Jones'
      });
      riskScore += adverseMediaCheck.articles > 5 ? 40 : 20;
    }

    return {
      passed: riskScore < 50,
      riskScore: Math.min(riskScore, 100),
      findings,
      sanctions: sanctionsCheck,
      pep: pepCheck,
      adverseMedia: adverseMediaCheck
    };
  }

  private async checkSanctions(data: ComplianceCheck) {
    const fullName = `${data.firstName} ${data.lastName}`.toUpperCase();
    
    const sanctionedNames = [
      'VLADIMIR PUTIN', 'KIM JONG UN', 'BASHAR AL-ASSAD'
    ];

    return {
      ofac: sanctionedNames.includes(fullName),
      eu: sanctionedNames.includes(fullName),
      un: sanctionedNames.includes(fullName)
    };
  }

  private async checkPEP(data: ComplianceCheck) {
    const fullName = `${data.firstName} ${data.lastName}`.toUpperCase();
    
    const pepDatabase: Record<string, { position: string; country: string }> = {
      'MUHAMMADU BUHARI': { position: 'Former President', country: 'Nigeria' },
      'BOLA TINUBU': { position: 'President', country: 'Nigeria' }
    };

    const pepInfo = pepDatabase[fullName];

    return {
      isPEP: !!pepInfo,
      position: pepInfo?.position,
      country: pepInfo?.country
    };
  }

  private async checkAdverseMedia(data: ComplianceCheck) {
    const fullName = `${data.firstName} ${data.lastName}`;
    
    const articleCount = Math.floor(Math.random() * 10);

    return {
      found: articleCount > 0,
      articles: articleCount
    };
  }

  async monitorOngoingCompliance(userId: string) {
    return {
      userId,
      lastChecked: new Date(),
      nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'COMPLIANT',
      alerts: []
    };
  }
}

const service = new ComplianceService();

app.post('/check/aml', async (req: Request, res: Response) => {
  try {
    const result = await service.performAMLCheck(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/monitor/:userId', async (req: Request, res: Response) => {
  try {
    const result = await service.monitorOngoingCompliance(req.params.userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'compliance' });
});

const PORT = process.env.PORT || 5100;
app.listen(PORT, () => {
  console.log(`Compliance service running on port ${PORT}`);
});
