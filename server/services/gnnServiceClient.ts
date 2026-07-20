import axios, { AxiosInstance } from "axios";
import { logger } from "../_core/logger";

interface PropertyData {
  id: number;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  latitude?: number;
  longitude?: number;
  city: string;
  address: string;
  propertyType?: string;
  yearBuilt?: number;
}

interface GNNScores {
  gnnScore: number;
  investmentPotential: number;
  growthMomentum: number;
  networkCentrality: number;
  confidence: number;
}

interface GNNPrediction {
  predictedPrice: number;
  confidence: number;
  priceRange: {
    min: number;
    max: number;
  };
}

interface MarketTrend {
  neighborhood: string;
  priceChange: number;
  momentum: number;
  hotspotScore: number;
}

class GNNServiceClient {
  private client: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // GNN service should be running on port 5002
    const baseURL = process.env.GNN_SERVICE_URL || "http://localhost:5002";
    
    this.client = axios.create({
      baseURL,
      timeout: 10000, // 10 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.cache = new Map();

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error("[GNN Service] Request failed:", error.message);
        throw error;
      }
    );
  }

  /**
   * Calculate GNN scores for a property
   */
  async calculateScores(property: PropertyData): Promise<GNNScores> {
    const cacheKey = `scores-${property.id}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.post("/api/property/score", {
        property_id: property.id,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        square_feet: property.squareFeet,
        latitude: property.latitude,
        longitude: property.longitude,
        city: property.city,
        address: property.address,
        property_type: property.propertyType,
        year_built: property.yearBuilt,
      });

      const scores: GNNScores = {
        gnnScore: response.data.gnn_score || 0,
        investmentPotential: response.data.investment_potential || 0,
        growthMomentum: response.data.growth_momentum || 0,
        networkCentrality: response.data.network_centrality || 0,
        confidence: response.data.confidence || 0,
      };

      this.setCache(cacheKey, scores);
      return scores;
    } catch (error) {
      logger.error("[GNN Service] Failed to calculate scores:", { error: String(error) });
      // Return fallback mock scores
      return this.getFallbackScores(property);
    }
  }

  /**
   * Get price prediction for a property
   */
  async predictPrice(property: PropertyData): Promise<GNNPrediction> {
    const cacheKey = `prediction-${property.id}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.post("/api/property/predict", {
        property_id: property.id,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        square_feet: property.squareFeet,
        latitude: property.latitude,
        longitude: property.longitude,
        city: property.city,
        address: property.address,
        property_type: property.propertyType,
        year_built: property.yearBuilt,
      });

      const prediction: GNNPrediction = {
        predictedPrice: response.data.predicted_price,
        confidence: response.data.confidence,
        priceRange: {
          min: response.data.price_range.min,
          max: response.data.price_range.max,
        },
      };

      this.setCache(cacheKey, prediction);
      return prediction;
    } catch (error) {
      logger.error("[GNN Service] Failed to predict price:", { error: String(error) });
      // Return fallback prediction
      return {
        predictedPrice: property.price,
        confidence: 0.5,
        priceRange: {
          min: property.price * 0.9,
          max: property.price * 1.1,
        },
      };
    }
  }

  /**
   * Get market trends for a city
   */
  async getMarketTrends(city: string): Promise<MarketTrend[]> {
    const cacheKey = `trends-${city}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get(`/api/market/trends`, {
        params: { city },
      });

      const trends: MarketTrend[] = response.data.trends || [];
      this.setCache(cacheKey, trends);
      return trends;
    } catch (error) {
      logger.error("[GNN Service] Failed to get market trends:", { error: String(error) });
      return [];
    }
  }

  /**
   * Batch score multiple properties
   */
  async batchCalculateScores(properties: PropertyData[]): Promise<Map<number, GNNScores>> {
    const results = new Map<number, GNNScores>();

    try {
      const response = await this.client.post("/api/property/batch-score", {
        properties: properties.map((p) => ({
          property_id: p.id,
          price: p.price,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          square_feet: p.squareFeet,
          latitude: p.latitude,
          longitude: p.longitude,
          city: p.city,
          address: p.address,
          property_type: p.propertyType,
          year_built: p.yearBuilt,
        })),
      });

      for (const result of response.data.results) {
        const scores: GNNScores = {
          gnnScore: result.gnn_score || 0,
          investmentPotential: result.investment_potential || 0,
          growthMomentum: result.growth_momentum || 0,
          networkCentrality: result.network_centrality || 0,
          confidence: result.confidence || 0,
        };
        results.set(result.property_id, scores);
        this.setCache(`scores-${result.property_id}`, scores);
      }
    } catch (error) {
      logger.error("[GNN Service] Batch scoring failed, using fallback:", { error: String(error) });
      // Fallback to individual scoring
      for (const property of properties) {
        results.set(property.id, this.getFallbackScores(property));
      }
    }

    return results;
  }

  /**
   * Check if GNN service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/health", { timeout: 3000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get fallback scores when GNN service is unavailable
   */
  private getFallbackScores(property: PropertyData): GNNScores {
    const baseScore = 70;
    const priceScore = property.price < 50000000 ? 15 : property.price < 100000000 ? 10 : 5;
    const locationScore = ["Lagos", "Abuja"].includes(property.city) ? 10 : 5;
    const sizeScore = property.squareFeet > 2000 ? 10 : property.squareFeet > 1500 ? 5 : 0;
    
    const gnnScore = Math.min(100, baseScore + priceScore + locationScore + sizeScore);
    const investmentPotential = Math.min(100, gnnScore + (property.price < 75000000 ? 10 : 0));
    
    const isGrowingArea = ["Lekki", "Ikoyi", "Victoria Island", "Maitama", "Asokoro"].some(
      (area) => property.address?.includes(area)
    );
    const growthMomentum = isGrowingArea ? 85 : 65;
    const networkCentrality = isGrowingArea ? 0.85 : 0.65;

    return {
      gnnScore,
      investmentPotential,
      growthMomentum,
      networkCentrality,
      confidence: 0.5, // Lower confidence for fallback scores
    };
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const gnnServiceClient = new GNNServiceClient();
