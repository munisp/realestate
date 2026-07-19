import express, { Request, Response } from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: 'PURCHASE' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  timestamp: string;
  ipAddress?: string;
  deviceId?: string;
  location?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

interface FraudScore {
  transactionId: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: Array<{
    type: string;
    severity: number;
    description: string;
  }>;
  recommendation: 'APPROVE' | 'REVIEW' | 'DECLINE' | 'BLOCK_USER';
  confidence: number;
}

class FraudDetectionService {
  private userTransactionHistory: Map<string, Transaction[]> = new Map();
  private blockedUsers: Set<string> = new Set();
  private blockedIPs: Set<string> = new Set();
  private mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5103';

  async analyzeTransaction(transaction: Transaction): Promise<FraudScore> {
    const flags: FraudScore['flags'] = [];
    let riskScore = 0;

    // Rule 1: Amount-based risk
    if (transaction.amount > 10000000) {
      flags.push({
        type: 'HIGH_VALUE',
        severity: 30,
        description: `Transaction amount (${transaction.amount}) exceeds high-value threshold`
      });
      riskScore += 30;
    }

    // Rule 2: User history check
    const userHistory = this.userTransactionHistory.get(transaction.userId) || [];
    if (userHistory.length > 0) {
      const avgAmount = userHistory.reduce((sum, t) => sum + t.amount, 0) / userHistory.length;
      
      if (transaction.amount > avgAmount * 5) {
        flags.push({
          type: 'UNUSUAL_AMOUNT',
          severity: 25,
          description: `Amount is 5x higher than user's average (${avgAmount})`
        });
        riskScore += 25;
      }

      // Velocity check
      const recentTransactions = userHistory.filter(t => {
        const timeDiff = new Date(transaction.timestamp).getTime() - new Date(t.timestamp).getTime();
        return timeDiff < 3600000; // Last hour
      });

      if (recentTransactions.length > 5) {
        flags.push({
          type: 'HIGH_VELOCITY',
          severity: 35,
          description: `${recentTransactions.length} transactions in the last hour`
        });
        riskScore += 35;
      }
    }

    // Rule 3: Blocked checks
    if (this.blockedUsers.has(transaction.userId)) {
      flags.push({
        type: 'BLOCKED_USER',
        severity: 100,
        description: 'User is on blocklist'
      });
      riskScore = 100;
    }

    if (transaction.ipAddress && this.blockedIPs.has(transaction.ipAddress)) {
      flags.push({
        type: 'BLOCKED_IP',
        severity: 80,
        description: 'IP address is on blocklist'
      });
      riskScore += 80;
    }

    // Rule 4: Location-based risk
    if (transaction.location) {
      const highRiskCountries = ['XX', 'YY', 'ZZ']; // Placeholder
      if (highRiskCountries.includes(transaction.location.country)) {
        flags.push({
          type: 'HIGH_RISK_LOCATION',
          severity: 40,
          description: `Transaction from high-risk country: ${transaction.location.country}`
        });
        riskScore += 40;
      }

      // Check for location hopping
      if (userHistory.length > 0) {
        const lastLocation = userHistory[userHistory.length - 1].location;
        if (lastLocation && lastLocation.country !== transaction.location.country) {
          const timeDiff = new Date(transaction.timestamp).getTime() - 
                          new Date(userHistory[userHistory.length - 1].timestamp).getTime();
          
          if (timeDiff < 7200000) { // 2 hours
            flags.push({
              type: 'LOCATION_HOPPING',
              severity: 45,
              description: `Country changed from ${lastLocation.country} to ${transaction.location.country} in ${timeDiff / 60000} minutes`
            });
            riskScore += 45;
          }
        }
      }
    }

    // Rule 5: Time-based patterns
    const hour = new Date(transaction.timestamp).getHours();
    if (hour >= 2 && hour <= 5) {
      flags.push({
        type: 'UNUSUAL_TIME',
        severity: 15,
        description: 'Transaction during unusual hours (2-5 AM)'
      });
      riskScore += 15;
    }

    // Call ML service for advanced scoring
    try {
      const mlScore = await this.getMLFraudScore(transaction);
      if (mlScore > 0.7) {
        flags.push({
          type: 'ML_HIGH_RISK',
          severity: mlScore * 50,
          description: `ML model flagged with confidence ${mlScore}`
        });
        riskScore += mlScore * 50;
      }
    } catch (error) {
      console.error('ML service unavailable:', error);
    }

    // Normalize risk score
    riskScore = Math.min(riskScore, 100);

    // Determine risk level and recommendation
    let riskLevel: FraudScore['riskLevel'];
    let recommendation: FraudScore['recommendation'];

    if (riskScore >= 80) {
      riskLevel = 'CRITICAL';
      recommendation = 'BLOCK_USER';
    } else if (riskScore >= 60) {
      riskLevel = 'HIGH';
      recommendation = 'DECLINE';
    } else if (riskScore >= 40) {
      riskLevel = 'MEDIUM';
      recommendation = 'REVIEW';
    } else {
      riskLevel = 'LOW';
      recommendation = 'APPROVE';
    }

    // Store transaction in history
    if (!this.userTransactionHistory.has(transaction.userId)) {
      this.userTransactionHistory.set(transaction.userId, []);
    }
    this.userTransactionHistory.get(transaction.userId)!.push(transaction);

    return {
      transactionId: transaction.id,
      riskScore,
      riskLevel,
      flags,
      recommendation,
      confidence: flags.length > 0 ? 0.85 : 0.95
    };
  }

  async analyzeUser(userId: string): Promise<{
    userId: string;
    totalTransactions: number;
    totalAmount: number;
    flaggedTransactions: number;
    riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendations: string[];
  }> {
    const history = this.userTransactionHistory.get(userId) || [];
    
    const totalAmount = history.reduce((sum, t) => sum + t.amount, 0);
    const flaggedCount = history.filter(t => t.amount > 5000000).length;

    let riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
    const recommendations: string[] = [];

    if (flaggedCount > 5 || totalAmount > 100000000) {
      riskProfile = 'HIGH';
      recommendations.push('Enhanced due diligence required');
      recommendations.push('Manual review of all future transactions');
    } else if (flaggedCount > 2 || totalAmount > 50000000) {
      riskProfile = 'MEDIUM';
      recommendations.push('Periodic review recommended');
    } else {
      riskProfile = 'LOW';
      recommendations.push('Standard monitoring');
    }

    return {
      userId,
      totalTransactions: history.length,
      totalAmount,
      flaggedTransactions: flaggedCount,
      riskProfile,
      recommendations
    };
  }

  blockUser(userId: string, reason: string) {
    this.blockedUsers.add(userId);
    return {
      success: true,
      userId,
      reason,
      blockedAt: new Date().toISOString()
    };
  }

  blockIP(ipAddress: string, reason: string) {
    this.blockedIPs.add(ipAddress);
    return {
      success: true,
      ipAddress,
      reason,
      blockedAt: new Date().toISOString()
    };
  }

  unblockUser(userId: string) {
    this.blockedUsers.delete(userId);
    return { success: true, userId };
  }

  unblockIP(ipAddress: string) {
    this.blockedIPs.delete(ipAddress);
    return { success: true, ipAddress };
  }

  private async getMLFraudScore(transaction: Transaction): Promise<number> {
    try {
      const response = await axios.post(`${this.mlServiceUrl}/fraud/score`, transaction);
      return response.data.score || 0;
    } catch (error) {
      return 0;
    }
  }

  getBlockedUsers() {
    return Array.from(this.blockedUsers);
  }

  getBlockedIPs() {
    return Array.from(this.blockedIPs);
  }
}

const service = new FraudDetectionService();

app.post('/analyze/transaction', async (req: Request, res: Response) => {
  try {
    const result = await service.analyzeTransaction(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/analyze/user/:userId', async (req: Request, res: Response) => {
  try {
    const result = await service.analyzeUser(req.params.userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/block/user', (req: Request, res: Response) => {
  try {
    const { userId, reason } = req.body;
    const result = service.blockUser(userId, reason);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/block/ip', (req: Request, res: Response) => {
  try {
    const { ipAddress, reason } = req.body;
    const result = service.blockIP(ipAddress, reason);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/block/user/:userId', (req: Request, res: Response) => {
  try {
    const result = service.unblockUser(req.params.userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/block/ip/:ipAddress', (req: Request, res: Response) => {
  try {
    const result = service.unblockIP(req.params.ipAddress);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/blocked/users', (req: Request, res: Response) => {
  res.json(service.getBlockedUsers());
});

app.get('/blocked/ips', (req: Request, res: Response) => {
  res.json(service.getBlockedIPs());
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'fraud-detection' });
});

const PORT = process.env.PORT || 5108;
app.listen(PORT, () => {
  console.log(`Fraud detection service running on port ${PORT}`);
});
