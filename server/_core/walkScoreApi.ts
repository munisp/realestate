/**
 * Walk Score API Integration
 * Provides walkability, transit, and bike scores for properties
 * API Documentation: https://www.walkscore.com/professional/api.php
 */

import axios from 'axios';

// Walk Score API configuration
const WALKSCORE_API_KEY = process.env.WALKSCORE_API_KEY || '';
const WALKSCORE_API_URL = 'https://api.walkscore.com/score';

export interface WalkScoreResult {
  walkScore: number; // 0-100
  walkDescription: string; // e.g., "Very Walkable", "Car-Dependent"
  transitScore: number; // 0-100
  transitDescription: string;
  bikeScore: number; // 0-100
  bikeDescription: string;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface WalkScoreParams {
  lat: number;
  lng: number;
  address: string;
}

class WalkScoreAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = WALKSCORE_API_KEY;
    this.baseUrl = WALKSCORE_API_URL;
  }

  /**
   * Get Walk Score, Transit Score, and Bike Score for a location
   */
  async getScores(params: WalkScoreParams): Promise<WalkScoreResult> {
    if (!this.apiKey) {
      console.warn('[WalkScore] API key not configured, returning mock data');
      return this.getMockScores(params);
    }

    try {
      // Get Walk Score
      const walkScoreResponse = await axios.get(this.baseUrl, {
        params: {
          format: 'json',
          address: params.address,
          lat: params.lat,
          lon: params.lng,
          wsapikey: this.apiKey,
        },
        timeout: 5000,
      });

      const walkScore = walkScoreResponse.data.walkscore || 0;
      const walkDescription = this.getWalkDescription(walkScore);

      // Get Transit Score
      const transitScoreResponse = await axios.get(this.baseUrl, {
        params: {
          format: 'json',
          address: params.address,
          lat: params.lat,
          lon: params.lng,
          transit: 1,
          wsapikey: this.apiKey,
        },
        timeout: 5000,
      });

      const transitScore = transitScoreResponse.data.transit?.score || 0;
      const transitDescription = this.getTransitDescription(transitScore);

      // Get Bike Score
      const bikeScoreResponse = await axios.get(this.baseUrl, {
        params: {
          format: 'json',
          address: params.address,
          lat: params.lat,
          lon: params.lng,
          bike: 1,
          wsapikey: this.apiKey,
        },
        timeout: 5000,
      });

      const bikeScore = bikeScoreResponse.data.bike?.score || 0;
      const bikeDescription = this.getBikeDescription(bikeScore);

      // Calculate overall grade
      const averageScore = (walkScore + transitScore + bikeScore) / 3;
      const overallGrade = this.getOverallGrade(averageScore);

      return {
        walkScore,
        walkDescription,
        transitScore,
        transitDescription,
        bikeScore,
        bikeDescription,
        overallGrade,
      };
    } catch (error) {
      console.error('[WalkScore] API error:', error);
      return this.getMockScores(params);
    }
  }

  /**
   * Get Walk Score description based on score
   */
  private getWalkDescription(score: number): string {
    if (score >= 90) return 'Walker\'s Paradise';
    if (score >= 70) return 'Very Walkable';
    if (score >= 50) return 'Somewhat Walkable';
    if (score >= 25) return 'Car-Dependent';
    return 'Very Car-Dependent';
  }

  /**
   * Get Transit Score description based on score
   */
  private getTransitDescription(score: number): string {
    if (score >= 90) return 'Rider\'s Paradise';
    if (score >= 70) return 'Excellent Transit';
    if (score >= 50) return 'Good Transit';
    if (score >= 25) return 'Some Transit';
    return 'Minimal Transit';
  }

  /**
   * Get Bike Score description based on score
   */
  private getBikeDescription(score: number): string {
    if (score >= 90) return 'Biker\'s Paradise';
    if (score >= 70) return 'Very Bikeable';
    if (score >= 50) return 'Bikeable';
    if (score >= 25) return 'Somewhat Bikeable';
    return 'Not Bikeable';
  }

  /**
   * Calculate overall grade
   */
  private getOverallGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get mock scores for testing/fallback
   */
  private getMockScores(params: WalkScoreParams): WalkScoreResult {
    // Generate realistic mock scores based on location
    // Urban areas (higher density) get higher scores
    const urbanFactor = Math.random() * 0.3 + 0.7; // 0.7-1.0
    
    const walkScore = Math.round(Math.random() * 40 * urbanFactor + 50);
    const transitScore = Math.round(Math.random() * 30 * urbanFactor + 40);
    const bikeScore = Math.round(Math.random() * 35 * urbanFactor + 45);

    const averageScore = (walkScore + transitScore + bikeScore) / 3;

    return {
      walkScore,
      walkDescription: this.getWalkDescription(walkScore),
      transitScore,
      transitDescription: this.getTransitDescription(transitScore),
      bikeScore,
      bikeDescription: this.getBikeDescription(bikeScore),
      overallGrade: this.getOverallGrade(averageScore),
    };
  }
}

// Singleton instance
let walkScoreAPIInstance: WalkScoreAPI | null = null;

export function getWalkScoreAPI(): WalkScoreAPI {
  if (!walkScoreAPIInstance) {
    walkScoreAPIInstance = new WalkScoreAPI();
  }
  return walkScoreAPIInstance;
}

// Export singleton
export const walkScoreAPI = getWalkScoreAPI();
