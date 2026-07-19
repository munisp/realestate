export interface RiskFactors {
  identityVerified: boolean;
  faceMatchScore: number;
  backgroundCheckPassed: boolean;
  criminalRecords: boolean;
  watchlistMatch: boolean;
}

export class RiskScoringService {
  calculateRiskScore(factors: Partial<RiskFactors>): number {
    let score = 50;
    if (factors.identityVerified) score -= 20;
    if (factors.faceMatchScore && factors.faceMatchScore >= 90) score -= 15;
    if (factors.criminalRecords) score += 25;
    if (factors.watchlistMatch) score += 20;
    if (factors.backgroundCheckPassed) score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  shouldAutoApprove(score: number): boolean {
    return score < 25;
  }

  requiresManualReview(score: number): boolean {
    return score >= 50;
  }
}
