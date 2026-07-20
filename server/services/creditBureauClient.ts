/**
 * Nigerian Credit Bureau Integration
 * Supports: NIBSS (Nigeria Inter-Bank Settlement System) + FCMB Credit Bureau
 * 
 * In production, replace stub responses with real API calls after obtaining
 * NIBSS API credentials from https://nibss-plc.com.ng
 */
import { logger } from "../_core/logger";

const NIBSS_API_URL = process.env.NIBSS_API_URL || "https://api.nibss-plc.com.ng/v1";
const NIBSS_API_KEY = process.env.NIBSS_API_KEY || "";
const FCMB_BUREAU_URL = process.env.FCMB_BUREAU_URL || "https://creditbureau.fcmb.com/api/v1";
const FCMB_API_KEY = process.env.FCMB_API_KEY || "";

export interface CreditBureauReport {
  nin: string;
  bvn: string;
  fullName: string;
  creditScore: number;          // 300–850 scale
  creditScoreGrade: "A" | "B" | "C" | "D" | "E" | "F";
  totalOutstandingDebt: number; // NGN
  activeLoans: number;
  defaultedLoans: number;
  paymentHistoryScore: number;  // 0–100
  debtToIncomeRatio: number;    // 0–1
  inquiriesLast6Months: number;
  oldestAccountAgeMonths: number;
  reportDate: string;
  source: "nibss" | "fcmb" | "stub";
}

export interface CreditBureauQuery {
  nin?: string;
  bvn?: string;
  phoneNumber?: string;
  fullName?: string;
}

class CreditBureauClient {
  private isConfigured(): boolean {
    return !!(NIBSS_API_KEY || FCMB_API_KEY);
  }

  async getCreditReport(query: CreditBureauQuery): Promise<CreditBureauReport> {
    if (!this.isConfigured()) {
      logger.warn("[CreditBureau] API keys not configured — returning stub report");
      return this.generateStubReport(query);
    }

    // Try NIBSS first, fall back to FCMB
    try {
      return await this.fetchFromNIBSS(query);
    } catch (nibssErr) {
      logger.warn("[CreditBureau] NIBSS failed, trying FCMB", { error: String(nibssErr) });
      try {
        return await this.fetchFromFCMB(query);
      } catch (fcmbErr) {
        logger.error("[CreditBureau] Both bureaus failed, using stub", { error: String(fcmbErr) });
        return this.generateStubReport(query);
      }
    }
  }

  private async fetchFromNIBSS(query: CreditBureauQuery): Promise<CreditBureauReport> {
    const response = await fetch(`${NIBSS_API_URL}/credit-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NIBSS_API_KEY}`,
        "X-Request-ID": crypto.randomUUID(),
      },
      body: JSON.stringify({
        nin: query.nin,
        bvn: query.bvn,
        phone: query.phoneNumber,
      }),
    });

    if (!response.ok) {
      throw new Error(`NIBSS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return this.mapNIBSSResponse(data);
  }

  private async fetchFromFCMB(query: CreditBureauQuery): Promise<CreditBureauReport> {
    const response = await fetch(`${FCMB_BUREAU_URL}/enquiry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": FCMB_API_KEY,
      },
      body: JSON.stringify({
        NIN: query.nin,
        BVN: query.bvn,
        FullName: query.fullName,
      }),
    });

    if (!response.ok) {
      throw new Error(`FCMB Bureau error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return this.mapFCMBResponse(data);
  }

  private mapNIBSSResponse(data: Record<string, unknown>): CreditBureauReport {
    const score = Number(data.creditScore ?? 600);
    return {
      nin: String(data.nin ?? ""),
      bvn: String(data.bvn ?? ""),
      fullName: String(data.fullName ?? ""),
      creditScore: score,
      creditScoreGrade: this.scoreToGrade(score),
      totalOutstandingDebt: Number(data.totalOutstandingDebt ?? 0),
      activeLoans: Number(data.activeLoans ?? 0),
      defaultedLoans: Number(data.defaultedLoans ?? 0),
      paymentHistoryScore: Number(data.paymentHistoryScore ?? 70),
      debtToIncomeRatio: Number(data.debtToIncomeRatio ?? 0.3),
      inquiriesLast6Months: Number(data.inquiriesLast6Months ?? 0),
      oldestAccountAgeMonths: Number(data.oldestAccountAgeMonths ?? 24),
      reportDate: new Date().toISOString(),
      source: "nibss",
    };
  }

  private mapFCMBResponse(data: Record<string, unknown>): CreditBureauReport {
    const score = Number(data.Score ?? 600);
    return {
      nin: String(data.NIN ?? ""),
      bvn: String(data.BVN ?? ""),
      fullName: String(data.FullName ?? ""),
      creditScore: score,
      creditScoreGrade: this.scoreToGrade(score),
      totalOutstandingDebt: Number(data.TotalDebt ?? 0),
      activeLoans: Number(data.ActiveFacilities ?? 0),
      defaultedLoans: Number(data.NonPerformingFacilities ?? 0),
      paymentHistoryScore: Number(data.PaymentHistory ?? 70),
      debtToIncomeRatio: Number(data.DTI ?? 0.3),
      inquiriesLast6Months: Number(data.Enquiries6Months ?? 0),
      oldestAccountAgeMonths: Number(data.OldestAccountAge ?? 24),
      reportDate: new Date().toISOString(),
      source: "fcmb",
    };
  }

  private generateStubReport(query: CreditBureauQuery): CreditBureauReport {
    // Deterministic stub based on BVN/NIN hash
    const seed = (query.bvn ?? query.nin ?? "stub").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const score = 500 + (seed % 300); // 500–800
    return {
      nin: query.nin ?? "00000000000",
      bvn: query.bvn ?? "00000000000",
      fullName: query.fullName ?? "Test User",
      creditScore: score,
      creditScoreGrade: this.scoreToGrade(score),
      totalOutstandingDebt: (seed % 5) * 1_000_000,
      activeLoans: seed % 3,
      defaultedLoans: 0,
      paymentHistoryScore: 60 + (seed % 35),
      debtToIncomeRatio: 0.1 + (seed % 40) / 100,
      inquiriesLast6Months: seed % 4,
      oldestAccountAgeMonths: 12 + (seed % 60),
      reportDate: new Date().toISOString(),
      source: "stub",
    };
  }

  private scoreToGrade(score: number): "A" | "B" | "C" | "D" | "E" | "F" {
    if (score >= 750) return "A";
    if (score >= 700) return "B";
    if (score >= 650) return "C";
    if (score >= 600) return "D";
    if (score >= 550) return "E";
    return "F";
  }

  /** Generate CBN-compliant credit decision explanation */
  generateCBNExplanation(report: CreditBureauReport, decision: "approved" | "declined" | "conditional"): string {
    const reasons: string[] = [];
    if (report.creditScore < 600) reasons.push(`Credit score of ${report.creditScore} is below the minimum threshold of 600`);
    if (report.debtToIncomeRatio > 0.43) reasons.push(`Debt-to-income ratio of ${(report.debtToIncomeRatio * 100).toFixed(1)}% exceeds the 43% limit`);
    if (report.defaultedLoans > 0) reasons.push(`${report.defaultedLoans} defaulted loan(s) on record`);
    if (report.paymentHistoryScore < 60) reasons.push(`Payment history score of ${report.paymentHistoryScore}/100 indicates irregular payments`);
    if (report.inquiriesLast6Months > 3) reasons.push(`${report.inquiriesLast6Months} credit inquiries in the last 6 months indicates high credit-seeking activity`);

    const positives: string[] = [];
    if (report.creditScore >= 700) positives.push(`Strong credit score of ${report.creditScore}`);
    if (report.paymentHistoryScore >= 80) positives.push(`Excellent payment history (${report.paymentHistoryScore}/100)`);
    if (report.debtToIncomeRatio < 0.3) positives.push(`Healthy debt-to-income ratio of ${(report.debtToIncomeRatio * 100).toFixed(1)}%`);

    return [
      `CBN Credit Decision Explanation (as required by CBN Consumer Protection Framework)`,
      `Decision: ${decision.toUpperCase()}`,
      `Credit Score: ${report.creditScore} (${report.creditScoreGrade})`,
      positives.length > 0 ? `Positive factors: ${positives.join("; ")}` : "",
      reasons.length > 0 ? `Adverse factors: ${reasons.join("; ")}` : "No adverse factors identified",
      `Report Date: ${report.reportDate}`,
      `Source: ${report.source.toUpperCase()}`,
    ].filter(Boolean).join("\n");
  }
}

export const creditBureauClient = new CreditBureauClient();
export default creditBureauClient;
