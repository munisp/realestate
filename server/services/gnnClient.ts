/**
 * GNN Client Service
 * Calls the live GNN valuation microservice at localhost:5003
 * Falls back gracefully if the service is unavailable
 */
import { logger } from '../_core/logger';

const GNN_SERVICE_URL = process.env.GNN_SERVICE_URL || 'http://localhost:5003';
const GNN_TIMEOUT_MS = 8000;

export interface GNNValuationRequest {
  property_id: number | string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  location: string;
  state?: string;
  property_type?: string;
  year_built?: number;
  latitude?: number;
  longitude?: number;
  amenities?: string[];
}

export interface GNNValuationResult {
  property_id: number | string;
  predicted_price: number;
  confidence: number;
  price_range: { low: number; high: number };
  comparable_properties: number[];
  market_trend: string;
  model: string;
  isMockData: false;
}

export interface GNNMarketTrendResult {
  trend: 'upward' | 'downward' | 'stable';
  avg_price_change_pct: number;
  confidence: number;
  hot_locations: string[];
  model: string;
  isMockData: false;
}

export interface GNNUndervaluedResult {
  property_id: number | string;
  current_price: number;
  predicted_price: number;
  discount_pct: number;
  confidence: number;
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
 * Get GNN valuation for a single property
 */
export async function getGNNValuation(req: GNNValuationRequest): Promise<GNNValuationResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${GNN_SERVICE_URL}/predict/valuation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        bedrooms: req.bedrooms,
        bathrooms: req.bathrooms,
        square_feet: req.sqft,
        latitude: req.latitude ?? 6.4474,
        longitude: req.longitude ?? 3.4739,
        property_type: req.property_type ?? "house",
        city: req.location ?? "Lagos",
        year_built: req.year_built ?? 2015,
      }),
      },
      GNN_TIMEOUT_MS
    );

    if (!response.ok) {
      logger.warn(`[GNNClient] Valuation service returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    // Map GNN service response fields to our interface
    return {
      property_id: req.property_id,
      predicted_price: data.estimatedPrice ?? data.predicted_price,
      confidence: (data.confidence ?? 0.85) * 100,
      price_range: {
        low: data.lowerBound ?? Math.round((data.estimatedPrice ?? 0) * 0.88),
        high: data.upperBound ?? Math.round((data.estimatedPrice ?? 0) * 1.12),
      },
      comparable_properties: data.comparable_properties ?? [],
      market_trend: data.priceGrowth12M > 5 ? 'upward' : 'stable',
      neighbourhood: data.neighbourhood,
      neighbourhood_score: data.neighbourhoodScore,
      investment_score: data.investmentScore,
      price_growth_12m: data.priceGrowth12M,
      model: data.model ?? 'GraphSAGE-v2',
      isMockData: false as const,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logger.warn('[GNNClient] Valuation request timed out');
    } else {
      logger.warn('[GNNClient] Valuation service unavailable:', err.message);
    }
    return null;
  }
}

/**
 * Get market trend analysis from GNN
 */
export async function getGNNMarketTrend(location: string, state?: string): Promise<GNNMarketTrendResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${GNN_SERVICE_URL}/predict/market-trend`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, state }),
      },
      GNN_TIMEOUT_MS
    );

    if (!response.ok) return null;
    const data = await response.json();
    return { ...data, isMockData: false };
  } catch {
    return null;
  }
}

/**
 * Get batch valuations for multiple properties
 */
export async function getGNNBatchValuations(
  properties: GNNValuationRequest[]
): Promise<GNNValuationResult[]> {
  try {
    const response = await fetchWithTimeout(
      `${GNN_SERVICE_URL}/predict/batch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties }),
      },
      GNN_TIMEOUT_MS * 2
    );

    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []).map((r: any) => ({ ...r, isMockData: false }));
  } catch {
    return [];
  }
}

/**
 * Check if GNN service is healthy
 */
export async function isGNNServiceHealthy(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${GNN_SERVICE_URL}/health`,
      { method: 'GET' },
      3000
    );
    return response.ok;
  } catch {
    return false;
  }
}
