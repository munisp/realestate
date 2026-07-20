/**
 * Collaborative Filtering Service Client
 * Integrates with Python collaborative filtering microservice
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from "../_core/logger";

const CF_SERVICE_URL = process.env.CF_SERVICE_URL || 'http://localhost:5003';

interface Interaction {
  userId: number;
  propertyId: number;
  interactionType: 'view' | 'favorite' | 'inquiry' | 'tour_request' | 'offer';
  timestamp: string;
  rating?: number;
}

interface Recommendation {
  propertyId: number;
  score: number;
}

interface SimilarUser {
  userId: number;
  similarity: number;
}

interface SimilarProperty {
  propertyId: number;
  similarity: number;
}

interface ModelStats {
  n_users: number;
  n_items: number;
  n_interactions: number;
  matrix_density: number;
  global_mean: number;
  n_components: number;
}

interface TrainResponse {
  success: boolean;
  n_users: number;
  n_items: number;
  n_interactions: number;
  matrix_density: number;
}

class CollaborativeFilteringClient {
  private client: AxiosInstance;
  private mockMode: boolean = false;

  constructor() {
    this.client = axios.create({
      baseURL: CF_SERVICE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Check if service is available
    this.checkHealth();
  }

  private async checkHealth(): Promise<void> {
    try {
      await this.client.get('/health');
      this.mockMode = false;
      logger.info('[CF Service] Connected successfully');
    } catch (error) {
      this.mockMode = true;
      logger.warn('[CF Service] Service unavailable, using mock mode');
    }
  }

  /**
   * Train the collaborative filtering model
   */
  async trainModel(interactions: Interaction[]): Promise<TrainResponse> {
    if (this.mockMode) {
      return {
        success: true,
        n_users: 100,
        n_items: 500,
        n_interactions: interactions.length,
        matrix_density: 0.05,
      };
    }

    try {
      const response = await this.client.post('/train', { interactions });
      return response.data;
    } catch (error) {
      logger.error('[CF Service] Error training model:', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(
    userId: number,
    options: {
      n?: number;
      method?: 'user' | 'item' | 'hybrid';
    } = {}
  ): Promise<Recommendation[]> {
    const { n = 10, method = 'hybrid' } = options;

    if (this.mockMode) {
      // Return mock recommendations
      return Array.from({ length: n }, (_, i) => ({
        propertyId: Math.floor(Math.random() * 1000) + 1,
        score: Math.random() * 10,
      }));
    }

    try {
      const response = await this.client.get(`/recommend/user/${userId}`, {
        params: { n, method },
      });
      return response.data.recommendations;
    } catch (error) {
      logger.error('[CF Service] Error getting recommendations:', { error: String(error) });
      return [];
    }
  }

  /**
   * Find similar users
   */
  async getSimilarUsers(userId: number, n: number = 10): Promise<SimilarUser[]> {
    if (this.mockMode) {
      return Array.from({ length: n }, (_, i) => ({
        userId: Math.floor(Math.random() * 1000) + 1,
        similarity: Math.random(),
      }));
    }

    try {
      const response = await this.client.get(`/similar/users/${userId}`, {
        params: { n },
      });
      return response.data.similarUsers;
    } catch (error) {
      logger.error('[CF Service] Error finding similar users:', { error: String(error) });
      return [];
    }
  }

  /**
   * Find similar properties
   */
  async getSimilarProperties(propertyId: number, n: number = 10): Promise<SimilarProperty[]> {
    if (this.mockMode) {
      return Array.from({ length: n }, (_, i) => ({
        propertyId: Math.floor(Math.random() * 1000) + 1,
        similarity: Math.random(),
      }));
    }

    try {
      const response = await this.client.get(`/similar/items/${propertyId}`, {
        params: { n },
      });
      return response.data.similarProperties;
    } catch (error) {
      logger.error('[CF Service] Error finding similar properties:', { error: String(error) });
      return [];
    }
  }

  /**
   * Get model statistics
   */
  async getStats(): Promise<ModelStats | null> {
    if (this.mockMode) {
      return {
        n_users: 100,
        n_items: 500,
        n_interactions: 5000,
        matrix_density: 0.05,
        global_mean: 5.5,
        n_components: 50,
      };
    }

    try {
      const response = await this.client.get('/stats');
      return response.data;
    } catch (error) {
      logger.error('[CF Service] Error getting stats:', { error: String(error) });
      return null;
    }
  }

  /**
   * Check if service is in mock mode
   */
  isMockMode(): boolean {
    return this.mockMode;
  }
}

// Export singleton instance
export const cfClient = new CollaborativeFilteringClient();
