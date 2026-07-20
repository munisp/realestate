/**
 * Prembly Identity Verification Client
 * =====================================
 * Production integration with Prembly (https://prembly.com) for Nigerian
 * identity verification: NIN, BVN, CAC, and document verification.
 *
 * Environment variables:
 *   PREMBLY_API_KEY    — Prembly API key from dashboard
 *   PREMBLY_APP_ID     — Prembly App ID from dashboard
 *
 * API Docs: https://docs.prembly.com
 * Fallback: If PREMBLY_API_KEY is not set, returns a structured "pending manual review"
 * response so the platform degrades gracefully rather than crashing.
 */

import { logger } from '../_core/logger';

const PREMBLY_BASE = 'https://api.prembly.com/identitypass';
const API_KEY = process.env.PREMBLY_API_KEY || '';
const APP_ID = process.env.PREMBLY_APP_ID || '';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface NINVerificationResult {
  verified: boolean;
  nin: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  photo?: string;
  confidence: number;
  verifiedAt: string;
  error?: string;
  pendingManualReview?: boolean;
}

export interface BVNVerificationResult {
  verified: boolean;
  bvn: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  phone?: string;
  enrollmentBank?: string;
  enrollmentBranch?: string;
  confidence: number;
  verifiedAt: string;
  error?: string;
  pendingManualReview?: boolean;
}

export interface CACVerificationResult {
  verified: boolean;
  rcNumber: string;
  companyName?: string;
  companyType?: string;
  registrationDate?: string;
  status?: string;
  address?: string;
  confidence: number;
  verifiedAt: string;
  error?: string;
  pendingManualReview?: boolean;
}

export interface NIESVVerificationResult {
  verified: boolean;
  nisvNumber: string;
  agentName?: string;
  licenseStatus?: string;
  expiryDate?: string;
  confidence: number;
  verifiedAt: string;
  pendingManualReview: boolean;
  note: string;
}

// ── Core HTTP executor ────────────────────────────────────────────────────────
async function premblyPost<T = any>(
  endpoint: string,
  body: Record<string, any>
): Promise<T> {
  if (!API_KEY || !APP_ID) {
    throw new Error('PREMBLY_API_KEY and PREMBLY_APP_ID are not configured.');
  }

  const res = await fetch(`${PREMBLY_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'app-id': APP_ID,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Prembly API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── NIN Verification ──────────────────────────────────────────────────────────
export async function verifyNIN(nin: string): Promise<NINVerificationResult> {
  const verifiedAt = new Date().toISOString();

  // Validate format: 11 digits
  if (!/^\d{11}$/.test(nin)) {
    return {
      verified: false,
      nin,
      confidence: 0,
      verifiedAt,
      error: 'Invalid NIN format. NIN must be exactly 11 digits.',
    };
  }

  if (!API_KEY) {
    logger.warn('PREMBLY_API_KEY not set — NIN verification pending manual review');
    return {
      verified: false,
      nin,
      confidence: 0,
      verifiedAt,
      pendingManualReview: true,
      error: 'Identity verification service not configured. Pending manual review.',
    };
  }

  try {
    const response = await premblyPost<{
      status: boolean;
      detail: string;
      nin_data?: {
        firstname?: string;
        lastname?: string;
        middlename?: string;
        birthdate?: string;
        gender?: string;
        phone?: string;
        address?: string;
        photo?: string;
      };
    }>('/data/ng/nin', { number: nin });

    if (!response.status) {
      return {
        verified: false,
        nin,
        confidence: 0,
        verifiedAt,
        error: response.detail || 'NIN verification failed',
      };
    }

    const data = response.nin_data || {};
    return {
      verified: true,
      nin,
      firstName: data.firstname,
      lastName: data.lastname,
      middleName: data.middlename,
      dateOfBirth: data.birthdate,
      gender: data.gender,
      phone: data.phone,
      address: data.address,
      photo: data.photo,
      confidence: 0.98,
      verifiedAt,
    };
  } catch (err: any) {
    logger.error({ err, nin }, 'NIN verification API call failed');
    return {
      verified: false,
      nin,
      confidence: 0,
      verifiedAt,
      error: err.message,
      pendingManualReview: true,
    };
  }
}

// ── BVN Verification ──────────────────────────────────────────────────────────
export async function verifyBVN(bvn: string): Promise<BVNVerificationResult> {
  const verifiedAt = new Date().toISOString();

  if (!/^\d{11}$/.test(bvn)) {
    return {
      verified: false,
      bvn,
      confidence: 0,
      verifiedAt,
      error: 'Invalid BVN format. BVN must be exactly 11 digits.',
    };
  }

  if (!API_KEY) {
    logger.warn('PREMBLY_API_KEY not set — BVN verification pending manual review');
    return {
      verified: false,
      bvn,
      confidence: 0,
      verifiedAt,
      pendingManualReview: true,
      error: 'Identity verification service not configured. Pending manual review.',
    };
  }

  try {
    const response = await premblyPost<{
      status: boolean;
      detail: string;
      bvn_data?: {
        firstName?: string;
        lastName?: string;
        middleName?: string;
        dateOfBirth?: string;
        phoneNumber1?: string;
        enrollmentBank?: string;
        enrollmentBranch?: string;
      };
    }>('/data/ng/bvn', { number: bvn });

    if (!response.status) {
      return {
        verified: false,
        bvn,
        confidence: 0,
        verifiedAt,
        error: response.detail || 'BVN verification failed',
      };
    }

    const data = response.bvn_data || {};
    return {
      verified: true,
      bvn,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      dateOfBirth: data.dateOfBirth,
      phone: data.phoneNumber1,
      enrollmentBank: data.enrollmentBank,
      enrollmentBranch: data.enrollmentBranch,
      confidence: 0.97,
      verifiedAt,
    };
  } catch (err: any) {
    logger.error({ err, bvn }, 'BVN verification API call failed');
    return {
      verified: false,
      bvn,
      confidence: 0,
      verifiedAt,
      error: err.message,
      pendingManualReview: true,
    };
  }
}

// ── CAC Business Verification ─────────────────────────────────────────────────
export async function verifyCAC(rcNumber: string): Promise<CACVerificationResult> {
  const verifiedAt = new Date().toISOString();

  if (!rcNumber || rcNumber.length < 5) {
    return {
      verified: false,
      rcNumber,
      confidence: 0,
      verifiedAt,
      error: 'Invalid RC number format.',
    };
  }

  if (!API_KEY) {
    return {
      verified: false,
      rcNumber,
      confidence: 0,
      verifiedAt,
      pendingManualReview: true,
      error: 'CAC verification service not configured. Pending manual review.',
    };
  }

  try {
    const response = await premblyPost<{
      status: boolean;
      detail: string;
      data?: {
        companyName?: string;
        companyType?: string;
        registrationDate?: string;
        status?: string;
        address?: string;
      };
    }>('/data/ng/cac', { rc_number: rcNumber });

    if (!response.status) {
      return {
        verified: false,
        rcNumber,
        confidence: 0,
        verifiedAt,
        error: response.detail || 'CAC verification failed',
      };
    }

    const data = response.data || {};
    return {
      verified: true,
      rcNumber,
      companyName: data.companyName,
      companyType: data.companyType,
      registrationDate: data.registrationDate,
      status: data.status,
      address: data.address,
      confidence: 0.95,
      verifiedAt,
    };
  } catch (err: any) {
    logger.error({ err, rcNumber }, 'CAC verification API call failed');
    return {
      verified: false,
      rcNumber,
      confidence: 0,
      verifiedAt,
      error: err.message,
      pendingManualReview: true,
    };
  }
}

// ── NIESV License Verification ────────────────────────────────────────────────
// NIESV (Nigerian Institution of Estate Surveyors and Valuers) does not have
// a public API. Verification is done via manual check with NIESV national office.
// This function returns a structured pending-review response.
export async function verifyNIESV(nisvNumber: string): Promise<NIESVVerificationResult> {
  const verifiedAt = new Date().toISOString();

  // NIESV number format: NIESV/STATE/YEAR/SERIAL
  const isValidFormat = /^NIESV\/[A-Z]{2,3}\/\d{4}\/\d+$/i.test(nisvNumber);

  return {
    verified: false,
    nisvNumber,
    licenseStatus: isValidFormat ? 'pending_manual_verification' : 'invalid_format',
    confidence: 0,
    verifiedAt,
    pendingManualReview: true,
    note: 'NIESV verification requires manual confirmation with the Nigerian Institution of Estate Surveyors and Valuers. Our compliance team will verify within 24–48 hours.',
  };
}

// ── Cross-verification: NIN + BVN name match ──────────────────────────────────
export async function crossVerifyIdentity(
  nin: string,
  bvn: string
): Promise<{
  ninResult: NINVerificationResult;
  bvnResult: BVNVerificationResult;
  nameMatch: boolean;
  overallConfidence: number;
  verified: boolean;
}> {
  const [ninResult, bvnResult] = await Promise.all([
    verifyNIN(nin),
    verifyBVN(bvn),
  ]);

  // Cross-check: first name and last name should match between NIN and BVN
  const nameMatch = !!(
    ninResult.verified &&
    bvnResult.verified &&
    ninResult.firstName?.toLowerCase() === bvnResult.firstName?.toLowerCase() &&
    ninResult.lastName?.toLowerCase() === bvnResult.lastName?.toLowerCase()
  );

  const overallConfidence = nameMatch
    ? (ninResult.confidence + bvnResult.confidence) / 2
    : Math.min(ninResult.confidence, bvnResult.confidence) * 0.5;

  return {
    ninResult,
    bvnResult,
    nameMatch,
    overallConfidence,
    verified: ninResult.verified && bvnResult.verified && nameMatch,
  };
}
