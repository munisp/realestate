import { getDb } from "../db";
import { eq, and, desc } from "drizzle-orm";
import {
  landRecords,
  certificateOfOccupancy,
  landVerificationRequests,
  landDocuments,
  type CertificateOfOccupancy,
  type LandVerificationRequest,
} from "../../drizzle/schema";
import crypto from "crypto";

/**
 * C of O Verification Service
 * Handles Certificate of Occupancy verification, validation, and fraud detection
 */

export interface CofOVerificationInput {
  cofONumber: string;
  fileNumber?: string;
  holderName: string;
  issueDate: Date;
  issuingAuthority: string;
  documentUrl?: string;
}

export interface VerificationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  registryMatch?: any;
  blockchainMatch?: any;
}

/**
 * Verify C of O Number Format
 * Nigerian C of O numbers typically follow patterns like:
 * - Lagos: LA/XXXX/YYYY or LA-XXXX-YYYY
 * - FCT: FCT/XXXX/YYYY
 * - Rivers: RIV/XXXX/YYYY
 */
function verifyCofONumberFormat(cofONumber: string, state: string): boolean {
  const patterns: Record<string, RegExp> = {
    Lagos: /^LA[/-]\d{4,6}[/-]\d{4}$/i,
    "Federal Capital Territory": /^FCT[/-]\d{4,6}[/-]\d{4}$/i,
    Rivers: /^RIV[/-]\d{4,6}[/-]\d{4}$/i,
    Kano: /^KAN[/-]\d{4,6}[/-]\d{4}$/i,
    Oyo: /^OYO[/-]\d{4,6}[/-]\d{4}$/i,
  };

  const pattern = patterns[state];
  if (!pattern) {
    // Generic pattern for other states
    return /^[A-Z]{2,4}[/-]\d{4,6}[/-]\d{4}$/i.test(cofONumber);
  }

  return pattern.test(cofONumber);
}

/**
 * Calculate document hash for integrity verification
 */
export function calculateDocumentHash(documentUrl: string): string {
  // In production, this would download and hash the actual document
  // For now, we'll hash the URL as a placeholder
  return crypto.createHash("sha256").update(documentUrl).digest("hex");
}

/**
 * Mock Government Registry Check
 * In production, this would call actual government APIs
 */
async function checkGovernmentRegistry(
  cofONumber: string,
  registrySource: string
): Promise<{
  found: boolean;
  data?: any;
  error?: string;
}> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock registry data - in production, this would be real API calls
  const mockRegistryData: Record<string, any> = {
    "LA/1234/2020": {
      found: true,
      status: "valid",
      holderName: "John Doe",
      issueDate: "2020-01-15",
      landSize: "500",
      location: "Lekki Phase 1, Lagos",
    },
    "FCT/5678/2019": {
      found: true,
      status: "valid",
      holderName: "Jane Smith",
      issueDate: "2019-06-20",
      landSize: "750",
      location: "Maitama, Abuja",
    },
  };

  const registryData = mockRegistryData[cofONumber];

  if (registryData) {
    return {
      found: true,
      data: registryData,
    };
  }

  return {
    found: false,
    error: "C of O number not found in government registry",
  };
}

/**
 * Detect potential fraud indicators
 */
function detectFraudIndicators(
  input: CofOVerificationInput,
  registryData?: any
): string[] {
  const indicators: string[] = [];

  // Check for suspicious patterns
  if (input.cofONumber.includes("0000")) {
    indicators.push("C of O number contains suspicious pattern (0000)");
  }

  // Check if issue date is in the future
  if (input.issueDate > new Date()) {
    indicators.push("Issue date is in the future");
  }

  // Check if issue date is too old (before 1960, when Nigeria gained independence)
  const minDate = new Date("1960-01-01");
  if (input.issueDate < minDate) {
    indicators.push("Issue date is before 1960 (suspicious)");
  }

  // Check for name mismatch with registry
  if (registryData && registryData.holderName) {
    const nameSimilarity = calculateNameSimilarity(
      input.holderName,
      registryData.holderName
    );
    if (nameSimilarity < 0.7) {
      indicators.push(
        `Holder name mismatch with registry (similarity: ${Math.round(nameSimilarity * 100)}%)`
      );
    }
  }

  // Check for known fake issuing authorities
  const knownFakeAuthorities = [
    "fake authority",
    "test authority",
    "unknown office",
  ];
  if (
    knownFakeAuthorities.some((fake) =>
      input.issuingAuthority.toLowerCase().includes(fake)
    )
  ) {
    indicators.push("Issuing authority appears suspicious");
  }

  return indicators;
}

/**
 * Calculate name similarity (simple Levenshtein-based)
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate verification score based on multiple factors
 */
function calculateVerificationScore(
  formatValid: boolean,
  registryFound: boolean,
  fraudIndicators: string[],
  documentProvided: boolean
): number {
  let score = 0;

  // Format validation (20 points)
  if (formatValid) score += 20;

  // Registry match (40 points)
  if (registryFound) score += 40;

  // Document provided (20 points)
  if (documentProvided) score += 20;

  // Fraud indicators (deduct 10 points per indicator, max -30)
  const fraudPenalty = Math.min(fraudIndicators.length * 10, 30);
  score -= fraudPenalty;

  // Bonus points if all checks pass (20 points)
  if (formatValid && registryFound && fraudIndicators.length === 0) {
    score += 20;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Main verification function
 */
export async function verifyCofO(
  input: CofOVerificationInput,
  state: string,
  registrySource: string
): Promise<VerificationResult> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Step 1: Verify C of O number format
  const formatValid = verifyCofONumberFormat(input.cofONumber, state);
  if (!formatValid) {
    issues.push(
      `C of O number format is invalid for ${state}. Expected format: STATE/XXXX/YYYY`
    );
    recommendations.push("Verify the C of O number with the issuing authority");
  }

  // Step 2: Check government registry
  const registryCheck = await checkGovernmentRegistry(
    input.cofONumber,
    registrySource
  );

  if (!registryCheck.found) {
    issues.push(
      registryCheck.error ||
        "C of O number not found in government registry database"
    );
    recommendations.push(
      "Contact the state land registry to verify the C of O status"
    );
    recommendations.push(
      "Request original C of O document for manual verification"
    );
  }

  // Step 3: Detect fraud indicators
  const fraudIndicators = detectFraudIndicators(
    input,
    registryCheck.data
  );
  if (fraudIndicators.length > 0) {
    issues.push(...fraudIndicators);
    recommendations.push("Conduct thorough due diligence before proceeding");
    recommendations.push("Consider engaging a property lawyer for verification");
  }

  // Step 4: Calculate verification score
  const score = calculateVerificationScore(
    formatValid,
    registryCheck.found,
    fraudIndicators,
    !!input.documentUrl
  );

  // Step 5: Determine if valid
  const isValid = score >= 70 && issues.length === 0;

  return {
    isValid,
    score,
    issues,
    recommendations,
    registryMatch: registryCheck.found ? registryCheck.data : undefined,
  };
}

/**
 * Create verification request
 */
export async function createVerificationRequest(
  landRecordId: number,
  cofOId: number | null,
  requestType: string,
  requestedBy: number
): Promise<LandVerificationRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [request] = await db
    .insert(landVerificationRequests)
    .values({
      landRecordId,
      cofOId,
      requestType,
      requestedBy,
      status: "pending",
    })
    .returning();

  return request;
}

/**
 * Update verification request with results
 */
export async function updateVerificationRequest(
  requestId: number,
  result: VerificationResult,
  reportUrl?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const status = result.isValid ? "verified" : "rejected";
  const verificationResult = result.isValid ? "verified" : "rejected";

  await db
    .update(landVerificationRequests)
    .set({
      status,
      verificationResult,
      verificationScore: result.score,
      verificationReport: JSON.stringify({
        issues: result.issues,
        recommendations: result.recommendations,
        registryMatch: result.registryMatch,
      }),
      verificationReportUrl: reportUrl,
      completedAt: new Date(),
      issuesFound: result.issues.length > 0 ? result.issues : null,
      recommendedActions: result.recommendations.join("\n"),
      registryCheckPerformed: true,
      registryCheckResult: result.registryMatch || null,
    })
    .where(eq(landVerificationRequests.id, requestId));
}

/**
 * Get verification history for a land record
 */
export async function getVerificationHistory(
  landRecordId: number
): Promise<LandVerificationRequest[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const history = await db
    .select()
    .from(landVerificationRequests)
    .where(eq(landVerificationRequests.landRecordId, landRecordId))
    .orderBy(desc(landVerificationRequests.requestedAt));

  return history;
}

/**
 * Check if C of O is expired
 */
export function isCofOExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) return false;
  return new Date() > expiryDate;
}

/**
 * Calculate days until C of O expiry
 */
export function daysUntilExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;

  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Validate C of O document upload
 */
export function validateCofODocument(
  fileType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(fileType)) {
    return {
      valid: false,
      error: "Invalid file type. Only PDF, JPEG, and PNG are allowed.",
    };
  }

  if (fileSize > maxSize) {
    return {
      valid: false,
      error: "File size exceeds 10MB limit.",
    };
  }

  return { valid: true };
}
