/**
 * TypeScript Client for Hybrid Valuation Service
 * Connects to Python FastAPI hybrid valuation service
 */

import axios, { AxiosInstance } from 'axios';

// Types matching Python Pydantic models

export interface PropertyDataRequest {
  id?: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  type: string;
  size_sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  base_price_per_sqm?: number;
}

export interface ValuationRequest {
  property_data: PropertyDataRequest;
  comparable_count?: number;
  transaction_history_count?: number;
  market_volatility?: number;
}

export interface DataSourceContribution {
  source_name: string;
  weight: number;
  confidence: number;
  value_contribution: number;
  importance_rank: number;
}

export interface ConfidenceBreakdown {
  data_completeness_contribution: number;
  model_accuracy_contribution: number;
  comparable_quality_contribution: number;
  satellite_confidence_contribution: number;
  market_stability_contribution: number;
  overall_confidence: number;
  confidence_level: string;
  limiting_factors: string[];
}

export interface UncertaintyMetrics {
  prediction_interval_lower: number;
  prediction_interval_upper: number;
  interval_width_percent: number;
  standard_error: number;
  coefficient_of_variation: number;
  uncertainty_sources: Record<string, number>;
}

export interface DataCompleteness {
  comparable_sales_count: number;
  comparable_sales_score: number;
  transaction_history_count: number;
  transaction_history_score: number;
  satellite_data_available: boolean;
  satellite_data_score: number;
  alternative_data_sources: number;
  alternative_data_score: number;
  overall_completeness: number;
  quality_flag: string;
}

export interface ConfidenceScoreDetails {
  overall_confidence: number;
  confidence_level: string;
  data_completeness: DataCompleteness;
  confidence_breakdown: ConfidenceBreakdown;
  uncertainty_metrics: UncertaintyMetrics;
  data_source_contributions: DataSourceContribution[];
  quality_flags: string[];
  recommendations: string[];
}

export interface SatelliteAnalysis {
  building_footprint_sqm: number;
  estimated_height_m: number;
  num_floors: number;
  roof_material: string;
  roof_condition: string;
  building_density: number;
  green_space_ratio: number;
  road_access_quality: string;
  confidence_score: number;
}

export interface AlternativeData {
  data_completeness_score: number;
  sources_used: string[];
  has_economic_indicators: boolean;
  has_market_listing_data: boolean;
  has_neighborhood_quality: boolean;
}

export interface HybridValuationResponse {
  final_valuation: number;
  confidence_score: number;
  uncertainty_range: [number, number];
  pathway_used: string;
  data_availability_score: number;
  confidence_details: ConfidenceScoreDetails;
  satellite_analysis?: SatelliteAnalysis;
  alternative_data?: AlternativeData;
  model_version: string;
  valuation_timestamp: string;
  num_components: number;
  component_methods: string[];
}

export class HybridValuationClient {
  private client: AxiosInstance;
  
  constructor(baseURL: string = 'http://localhost:8001') {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds for ML inference
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  /**
   * Value a property using the hybrid valuation model
   */
  async valueProperty(request: ValuationRequest): Promise<HybridValuationResponse> {
    try {
      const response = await this.client.post<HybridValuationResponse>(
        '/hybrid-valuation/value',
        request
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Hybrid valuation failed: ${error.response?.data?.detail || error.message}`
        );
      }
      throw error;
    }
  }
  
  /**
   * Health check for the hybrid valuation service
   */
  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    try {
      const response = await this.client.get('/hybrid-valuation/health');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Health check failed: ${error.message}`);
      }
      throw error;
    }
  }
}

// Singleton instance
let hybridValuationClient: HybridValuationClient | null = null;

export function getHybridValuationClient(): HybridValuationClient {
  if (!hybridValuationClient) {
    const serviceUrl = process.env.VALUATION_SERVICE_URL || 'http://localhost:8001';
    hybridValuationClient = new HybridValuationClient(serviceUrl);
  }
  return hybridValuationClient;
}

// Helper functions for formatting

export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatConfidenceLevel(level: string): string {
  const labels: Record<string, string> = {
    very_high: 'Very High',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    very_low: 'Very Low',
  };
  return labels[level] || level;
}

export function formatDataQualityFlag(flag: string): string {
  const labels: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    insufficient: 'Insufficient',
  };
  return labels[flag] || flag;
}

export function formatPathway(pathway: string): string {
  const labels: Record<string, string> = {
    data_rich: 'Data-Rich (Traditional ML)',
    data_scarce: 'Data-Scarce (Satellite + Proxies)',
    hybrid: 'Hybrid (Ensemble)',
  };
  return labels[pathway] || pathway;
}

export function getConfidenceLevelColor(level: string): string {
  const colors: Record<string, string> = {
    very_high: 'text-green-600',
    high: 'text-green-500',
    medium: 'text-yellow-500',
    low: 'text-orange-500',
    very_low: 'text-red-500',
  };
  return colors[level] || 'text-gray-500';
}

export function getDataQualityColor(flag: string): string {
  const colors: Record<string, string> = {
    excellent: 'text-green-600',
    good: 'text-green-500',
    fair: 'text-yellow-500',
    poor: 'text-orange-500',
    insufficient: 'text-red-500',
  };
  return colors[flag] || 'text-gray-500';
}
