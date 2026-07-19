/**
 * GNN Service Client
 * ------------------
 * TypeScript client for City2Graph GNN services.
 * Provides type-safe interfaces to Python GNN services.
 */

import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Types
// ============================================================================

export interface PropertyFeatures {
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lat: number;
  lon: number;
  [key: string]: number;
}

export interface GNNValuationRequest {
  property_id: number;
  property_features: PropertyFeatures;
  neighborhood_properties: PropertyFeatures[];
}

export interface GNNValuationResponse {
  estimated_value: number;
  confidence_score: number;
  value_range: {
    min: number;
    max: number;
  };
  spatial_factors: {
    neighborhood_effect: number;
    location_premium: number;
    accessibility_score: number;
  };
  comparable_properties: Array<{
    id: number;
    price: number;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    distance: number;
  }>;
  model_version: string;
  timestamp: string;
}

export interface MarketTrendRequest {
  property_data: PropertyFeatures[];
  graph: Record<string, number[]>;  // Adjacency list
  forecast_months: number;
}

export interface MarketTrendResponse {
  forecast_months: number;
  hotspots: number[];
  trend_predictions: Record<number, number>;
  investment_opportunities: Array<{
    property_id: number;
    investment_score: number;
    centrality_score: number;
    trend_score: number;
    undervaluation_score: number;
    recommendation: string;
  }>;
  insights: Array<{
    type: string;
    title: string;
    description: string;
    properties?: number[];
    value?: number;
  }>;
  model_version: string;
  timestamp: string;
}

export interface NeighborhoodAnalysisRequest {
  lat: number;
  lon: number;
  city: string;
}

export interface NeighborhoodAnalysisResponse {
  location: {
    lat: number;
    lon: number;
    city: string;
  };
  walkability: {
    intersection_density: number;
    street_connectivity: number;
    pedestrian_friendliness: number;
    network_distance_to_amenities: number;
    walkability_score: number;
  };
  transit_accessibility: {
    num_nearby_stops: number;
    avg_frequency: number;
    reachable_area: number;
    transit_score: number;
    nearest_stops: Array<{
      stop_name: string;
      distance: number;
    }>;
  };
  location_score: number;
  recommendation: string;
  timestamp: string;
}

// ============================================================================
// GNN Service Client
// ============================================================================

export class GNNServiceClient {
  private gnnValuationClient: AxiosInstance;
  private marketTrendClient: AxiosInstance;
  private neighborhoodClient: AxiosInstance;

  constructor(
    gnnValuationUrl: string = process.env.GNN_VALUATION_SERVICE_URL || 'http://localhost:5008',
    marketTrendUrl: string = process.env.MARKET_TREND_SERVICE_URL || 'http://localhost:5009',
    neighborhoodUrl: string = process.env.NEIGHBORHOOD_SERVICE_URL || 'http://localhost:5010'
  ) {
    this.gnnValuationClient = axios.create({
      baseURL: gnnValuationUrl,
      timeout: 30000,  // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.marketTrendClient = axios.create({
      baseURL: marketTrendUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.neighborhoodClient = axios.create({
      baseURL: neighborhoodUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ==========================================================================
  // GNN Valuation Methods
  // ==========================================================================

  async valuateProperty(request: GNNValuationRequest): Promise<GNNValuationResponse> {
    try {
      const response = await this.gnnValuationClient.post<GNNValuationResponse>(
        '/api/gnn/valuate',
        request
      );
      return response.data;
    } catch (error) {
      console.error('GNN valuation failed:', error);
      throw new Error(`GNN valuation failed: ${error}`);
    }
  }

  async batchValuateProperties(
    requests: GNNValuationRequest[]
  ): Promise<Array<GNNValuationResponse & { property_id: number }>> {
    try {
      const response = await this.gnnValuationClient.post<{
        results: Array<GNNValuationResponse & { property_id: number }>;
      }>('/api/gnn/batch-valuate', {
        properties: requests,
      });
      return response.data.results;
    } catch (error) {
      console.error('Batch GNN valuation failed:', error);
      throw new Error(`Batch GNN valuation failed: ${error}`);
    }
  }

  // ==========================================================================
  // Market Trend Methods
  // ==========================================================================

  async predictMarketTrends(request: MarketTrendRequest): Promise<MarketTrendResponse> {
    try {
      const response = await this.marketTrendClient.post<MarketTrendResponse>(
        '/api/market/predict-trends',
        request
      );
      return response.data;
    } catch (error) {
      console.error('Market trend prediction failed:', error);
      throw new Error(`Market trend prediction failed: ${error}`);
    }
  }

  // ==========================================================================
  // Neighborhood Intelligence Methods
  // ==========================================================================

  async analyzeNeighborhood(
    request: NeighborhoodAnalysisRequest
  ): Promise<NeighborhoodAnalysisResponse> {
    try {
      const response = await this.neighborhoodClient.post<NeighborhoodAnalysisResponse>(
        '/api/neighborhood/analyze',
        request
      );
      return response.data;
    } catch (error) {
      console.error('Neighborhood analysis failed:', error);
      throw new Error(`Neighborhood analysis failed: ${error}`);
    }
  }

  async batchAnalyzeNeighborhoods(
    requests: NeighborhoodAnalysisRequest[]
  ): Promise<NeighborhoodAnalysisResponse[]> {
    try {
      const response = await this.neighborhoodClient.post<{
        results: NeighborhoodAnalysisResponse[];
      }>('/api/neighborhood/batch-analyze', {
        locations: requests,
      });
      return response.data.results;
    } catch (error) {
      console.error('Batch neighborhood analysis failed:', error);
      throw new Error(`Batch neighborhood analysis failed: ${error}`);
    }
  }

  // ==========================================================================
  // Health Check Methods
  // ==========================================================================

  async checkGNNValuationHealth(): Promise<boolean> {
    try {
      const response = await this.gnnValuationClient.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('GNN valuation health check failed:', error);
      return false;
    }
  }

  async checkMarketTrendHealth(): Promise<boolean> {
    try {
      const response = await this.marketTrendClient.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Market trend health check failed:', error);
      return false;
    }
  }

  async checkNeighborhoodHealth(): Promise<boolean> {
    try {
      const response = await this.neighborhoodClient.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Neighborhood health check failed:', error);
      return false;
    }
  }

  async checkAllServicesHealth(): Promise<{
    gnnValuation: boolean;
    marketTrend: boolean;
    neighborhood: boolean;
    allHealthy: boolean;
  }> {
    const [gnnValuation, marketTrend, neighborhood] = await Promise.all([
      this.checkGNNValuationHealth(),
      this.checkMarketTrendHealth(),
      this.checkNeighborhoodHealth(),
    ]);

    return {
      gnnValuation,
      marketTrend,
      neighborhood,
      allHealthy: gnnValuation && marketTrend && neighborhood,
    };
  }
}

// Singleton instance
let gnnServiceClient: GNNServiceClient | null = null;

export function getGNNServiceClient(): GNNServiceClient {
  if (!gnnServiceClient) {
    gnnServiceClient = new GNNServiceClient();
  }
  return gnnServiceClient;
}
