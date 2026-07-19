/**
 * Lakehouse Analytics Client
 * Provides bi-directional integration with Delta Lake data lakehouse
 * - Write: TypeScript → Kafka → Bronze → Silver → Gold
 * - Read: TypeScript → Analytics API → Gold Layer (pre-aggregated)
 */

import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Configuration
// ============================================================================

const LAKEHOUSE_API_URL = process.env.LAKEHOUSE_API_URL || 'http://localhost:8000';
const TRINO_URL = process.env.TRINO_URL || 'http://localhost:8080';

// ============================================================================
// Lakehouse Analytics Client
// ============================================================================

class LakehouseClient {
  private apiClient: AxiosInstance;
  private trinoClient: AxiosInstance;

  constructor() {
    // Analytics API client (for Gold layer queries)
    this.apiClient = axios.create({
      baseURL: LAKEHOUSE_API_URL,
      timeout: 60000, // Analytics queries can be slow
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Trino client (for direct SQL queries)
    this.trinoClient = axios.create({
      baseURL: TRINO_URL,
      timeout: 120000,
      headers: {
        'X-Trino-User': 'realestate-app',
        'X-Trino-Catalog': 'delta',
        'X-Trino-Schema': 'gold',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.apiClient.interceptors.request.use(
      (config) => {
        console.log('[Lakehouse API] Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('[Lakehouse API] Request error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        console.log('[Lakehouse API] Response:', response.status);
        return response;
      },
      (error) => {
        console.error('[Lakehouse API] Response error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // Property Market Analytics
  // ============================================================================

  /**
   * Get property market trends for a region
   */
  async getMarketTrends(params: {
    region: string;
    timeframe: 'day' | 'week' | 'month' | 'quarter' | 'year';
    startDate?: string;
    endDate?: string;
  }): Promise<{
    region: string;
    timeframe: string;
    trends: Array<{
      date: string;
      averagePrice: number;
      medianPrice: number;
      totalListings: number;
      totalSales: number;
      daysOnMarket: number;
      priceChange: number; // percentage
    }>;
    summary: {
      currentAveragePrice: number;
      priceChangePercent: number;
      totalProperties: number;
      activeListings: number;
    };
  }> {
    const response = await this.apiClient.get('/analytics/market-trends', { params });
    return response.data;
  }

  /**
   * Get price heatmap data for visualization
   */
  async getPriceHeatmap(params: {
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    resolution: number; // H3 resolution level
    propertyType?: string;
  }): Promise<{
    heatmapData: Array<{
      h3Index: string;
      center: { lat: number; lng: number };
      averagePrice: number;
      propertyCount: number;
      pricePerSqft: number;
    }>;
    metadata: {
      resolution: number;
      totalCells: number;
      dataFreshness: string;
    };
  }> {
    const response = await this.apiClient.post('/analytics/price-heatmap', params);
    return response.data;
  }

  /**
   * Get comparable properties for valuation
   */
  async getComparables(params: {
    propertyId: string;
    location: { lat: number; lng: number };
    features: {
      bedrooms: number;
      bathrooms: number;
      sqft: number;
      propertyType: string;
    };
    radius: number; // in meters
    limit?: number;
  }): Promise<{
    comparables: Array<{
      propertyId: string;
      address: string;
      soldPrice: number;
      soldDate: string;
      features: any;
      distance: number;
      similarity: number;
    }>;
    averagePrice: number;
    priceRange: {
      low: number;
      high: number;
    };
  }> {
    const response = await this.apiClient.post('/analytics/comparables', params);
    return response.data;
  }

  // ============================================================================
  // User Behavior Analytics
  // ============================================================================

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(params: {
    timeframe: 'day' | 'week' | 'month';
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    averageSessionDuration: number;
    pageViews: number;
    propertyViews: number;
    searchQueries: number;
    conversionRate: number;
    trends: Array<{
      date: string;
      activeUsers: number;
      sessions: number;
      conversions: number;
    }>;
  }> {
    const response = await this.apiClient.get('/analytics/user-engagement', { params });
    return response.data;
  }

  /**
   * Get user journey funnel
   */
  async getUserJourneyFunnel(params: {
    startDate: string;
    endDate: string;
  }): Promise<{
    stages: Array<{
      stage: string;
      users: number;
      dropoffRate: number;
      averageTime: number;
    }>;
    overallConversionRate: number;
  }> {
    const response = await this.apiClient.get('/analytics/user-journey', { params });
    return response.data;
  }

  // ============================================================================
  // Transaction Analytics
  // ============================================================================

  /**
   * Get transaction metrics
   */
  async getTransactionMetrics(params: {
    timeframe: 'day' | 'week' | 'month' | 'quarter' | 'year';
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalTransactions: number;
    totalVolume: number;
    averageTransactionValue: number;
    completionRate: number;
    averageTimeToClose: number; // in days
    trends: Array<{
      date: string;
      transactions: number;
      volume: number;
      averageValue: number;
    }>;
    byPropertyType: Array<{
      propertyType: string;
      transactions: number;
      volume: number;
    }>;
  }> {
    const response = await this.apiClient.get('/analytics/transactions', { params });
    return response.data;
  }

  // ============================================================================
  // Valuation Analytics
  // ============================================================================

  /**
   * Get valuation accuracy metrics
   */
  async getValuationAccuracy(params: {
    timeframe: 'month' | 'quarter' | 'year';
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalValuations: number;
    averageAccuracy: number; // percentage
    medianError: number; // absolute value
    modelPerformance: Array<{
      modelVersion: string;
      accuracy: number;
      errorRate: number;
      sampleSize: number;
    }>;
    byPropertyType: Array<{
      propertyType: string;
      accuracy: number;
      sampleSize: number;
    }>;
  }> {
    const response = await this.apiClient.get('/analytics/valuation-accuracy', { params });
    return response.data;
  }

  // ============================================================================
  // Agent Performance Analytics
  // ============================================================================

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(params: {
    agentId?: string;
    timeframe: 'month' | 'quarter' | 'year';
    startDate?: string;
    endDate?: string;
  }): Promise<{
    agents: Array<{
      agentId: string;
      name: string;
      totalListings: number;
      totalSales: number;
      totalVolume: number;
      averageDaysOnMarket: number;
      conversionRate: number;
      customerSatisfaction: number;
    }>;
    leaderboard: Array<{
      rank: number;
      agentId: string;
      name: string;
      score: number;
      metric: string;
    }>;
  }> {
    const response = await this.apiClient.get('/analytics/agent-performance', { params });
    return response.data;
  }

  // ============================================================================
  // Custom SQL Queries (Advanced)
  // ============================================================================

  /**
   * Execute custom SQL query on Gold layer
   * WARNING: Use with caution, ensure queries are safe
   */
  async executeQuery(sql: string): Promise<{
    columns: string[];
    rows: any[][];
    rowCount: number;
    executionTime: number;
  }> {
    const response = await this.trinoClient.post('/v1/statement', sql, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    // Trino returns results asynchronously, need to poll
    let nextUri = response.data.nextUri;
    while (nextUri) {
      const pollResponse = await this.trinoClient.get(nextUri);
      if (pollResponse.data.data) {
        return {
          columns: pollResponse.data.columns.map((c: any) => c.name),
          rows: pollResponse.data.data,
          rowCount: pollResponse.data.data.length,
          executionTime: pollResponse.data.stats.elapsedTimeMillis,
        };
      }
      nextUri = pollResponse.data.nextUri;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Query did not return results');
  }

  // ============================================================================
  // Data Freshness & Quality
  // ============================================================================

  /**
   * Get data freshness information
   */
  async getDataFreshness(): Promise<{
    layers: {
      bronze: {
        lastUpdate: string;
        lag: number; // seconds behind real-time
        recordCount: number;
      };
      silver: {
        lastUpdate: string;
        lag: number;
        recordCount: number;
      };
      gold: {
        lastUpdate: string;
        lag: number;
        recordCount: number;
      };
    };
    topics: Array<{
      topic: string;
      lastMessage: string;
      lag: number;
    }>;
  }> {
    const response = await this.apiClient.get('/analytics/data-freshness');
    return response.data;
  }

  /**
   * Get data quality metrics
   */
  async getDataQuality(): Promise<{
    overall: {
      completeness: number; // percentage
      accuracy: number;
      consistency: number;
      timeliness: number;
    };
    issues: Array<{
      layer: 'bronze' | 'silver' | 'gold';
      table: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
      affectedRecords: number;
    }>;
  }> {
    const response = await this.apiClient.get('/analytics/data-quality');
    return response.data;
  }

  // ============================================================================
  // ML Feature Store
  // ============================================================================

  /**
   * Get ML features for a property
   */
  async getMLFeatures(propertyId: string): Promise<{
    propertyId: string;
    features: {
      // Property features
      bedrooms: number;
      bathrooms: number;
      sqft: number;
      lotSize: number;
      yearBuilt: number;
      
      // Location features
      h3Index: string;
      neighborhoodScore: number;
      walkScore: number;
      transitScore: number;
      
      // Market features
      avgNeighborhoodPrice: number;
      pricePerSqft: number;
      daysOnMarket: number;
      priceChange30d: number;
      priceChange90d: number;
      
      // Temporal features
      seasonality: number;
      marketTrend: number;
      
      // Derived features
      priceToAreaRatio: number;
      ageScore: number;
      locationScore: number;
    };
    version: string;
    generatedAt: string;
  }> {
    const response = await this.apiClient.get(`/ml/features/${propertyId}`);
    return response.data;
  }

  /**
   * Batch get ML features for multiple properties
   */
  async batchGetMLFeatures(propertyIds: string[]): Promise<Array<any>> {
    const response = await this.apiClient.post('/ml/features/batch', { propertyIds });
    return response.data;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let lakehouseClientInstance: LakehouseClient | null = null;

export function getLakehouseClient(): LakehouseClient {
  if (!lakehouseClientInstance) {
    lakehouseClientInstance = new LakehouseClient();
  }
  return lakehouseClientInstance;
}

// Export singleton
export const lakehouseClient = getLakehouseClient();
