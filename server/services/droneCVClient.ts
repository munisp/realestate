/**
 * Drone Computer Vision Client
 * Calls the Python drone CV microservice at localhost:5004
 * Used for: boundary detection, condition assessment, milestone verification
 */
import { logger } from '../_core/logger';

const DRONE_CV_URL = process.env.DRONE_CV_URL || 'http://localhost:5004';
const DRONE_TIMEOUT_MS = 30000; // CV is slower

export interface DroneAnalysisResult {
  boundary_confidence: number;
  boundary_polygon: Array<{ x: number; y: number }>;
  estimated_area_sqm: number;
  condition_scores: {
    roof: number;
    exterior: number;
    overall: number;
  };
  encroachment_detected: boolean;
  encroachment_details: string[];
  construction_progress_pct: number;
  milestone_recommendation: {
    milestone_id: string;
    release_escrow: boolean;
    reason: string;
  };
  isMockData: false;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Analyse a drone/aerial image (base64 encoded)
 */
export async function analyseDroneImage(
  imageBase64: string,
  milestoneId?: string | number
): Promise<DroneAnalysisResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${DRONE_CV_URL}/analyse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          milestone_id: milestoneId,
        }),
      },
      DRONE_TIMEOUT_MS
    );

    if (!response.ok) {
      logger.warn(`[DroneCVClient] Service returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    return { ...data, isMockData: false };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logger.warn('[DroneCVClient] Analysis timed out');
    } else {
      logger.warn('[DroneCVClient] Service unavailable:', err.message);
    }
    return null;
  }
}

/**
 * Verify a construction milestone using drone imagery
 * Returns whether the milestone is complete and escrow should be released
 */
export async function verifyConstructionMilestone(
  imageBase64: string,
  milestoneType: string,
  expectedProgress: number
): Promise<{
  verified: boolean;
  confidence: number;
  actualProgress: number;
  recommendation: string;
  isMockData: false;
} | null> {
  try {
    const response = await fetchWithTimeout(
      `${DRONE_CV_URL}/verify-milestone`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          milestone_type: milestoneType,
          expected_progress: expectedProgress,
        }),
      },
      DRONE_TIMEOUT_MS
    );

    if (!response.ok) return null;
    const data = await response.json();
    return { ...data, isMockData: false };
  } catch {
    return null;
  }
}

/**
 * Check if drone CV service is healthy
 */
export async function isDroneCVServiceHealthy(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${DRONE_CV_URL}/health`, { method: 'GET' }, 3000);
    return response.ok;
  } catch {
    return false;
  }
}
