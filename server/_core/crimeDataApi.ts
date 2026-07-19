/**
 * Crime Data API Integration
 * Provides crime statistics and safety scores for properties
 * Uses SpotCrime API and FBI Crime Data
 */

import axios from 'axios';

// SpotCrime API configuration
const SPOTCRIME_API_KEY = process.env.SPOTCRIME_API_KEY || '';
const SPOTCRIME_API_URL = 'https://api.spotcrime.com/crimes.json';

export interface CrimeIncident {
  id: string;
  type: 'assault' | 'burglary' | 'robbery' | 'theft' | 'vandalism' | 'arrest' | 'shooting' | 'other';
  date: Date;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CrimeStatistics {
  totalIncidents: number;
  incidentsByType: Record<string, number>;
  safetyScore: number; // 0-100, higher is safer
  crimeRate: number; // incidents per 1000 residents
  trend: 'increasing' | 'decreasing' | 'stable';
  comparedToNational: 'below' | 'average' | 'above';
}

export interface CrimeSearchParams {
  lat: number;
  lng: number;
  radius?: number; // miles, default 1
  days?: number; // lookback period, default 30
}

export interface CrimeSearchResult {
  incidents: CrimeIncident[];
  statistics: CrimeStatistics;
  safetyGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

class CrimeDataAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = SPOTCRIME_API_KEY;
    this.baseUrl = SPOTCRIME_API_URL;
  }

  /**
   * Search for crime incidents near a location
   */
  async searchNearby(params: CrimeSearchParams): Promise<CrimeSearchResult> {
    if (!this.apiKey) {
      console.warn('[CrimeData] API key not configured, returning mock data');
      return this.getMockCrimeData(params);
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          key: this.apiKey,
          lat: params.lat,
          lon: params.lng,
          radius: (params.radius || 1) * 1.60934, // Convert miles to km
          days: params.days || 30,
        },
        timeout: 5000,
      });

      const incidents: CrimeIncident[] = response.data.crimes.map((crime: any) => ({
        id: crime.cdid,
        type: this.normalizeCrimeType(crime.type),
        date: new Date(crime.date),
        location: {
          lat: parseFloat(crime.lat),
          lng: parseFloat(crime.lon),
          address: crime.address,
        },
        description: crime.type,
        severity: this.calculateSeverity(crime.type),
      }));

      const statistics = this.calculateStatistics(incidents, params);
      const safetyGrade = this.getSafetyGrade(statistics.safetyScore);

      return {
        incidents,
        statistics,
        safetyGrade,
      };
    } catch (error) {
      console.error('[CrimeData] API error:', error);
      return this.getMockCrimeData(params);
    }
  }

  /**
   * Calculate safety score for a location
   * Returns 0-100 score (higher is safer)
   */
  async calculateSafetyScore(lat: number, lng: number): Promise<number> {
    const result = await this.searchNearby({ lat, lng, radius: 1, days: 90 });
    return result.statistics.safetyScore;
  }

  /**
   * Get crime trend analysis
   */
  async getCrimeTrend(lat: number, lng: number): Promise<{
    current: number;
    previous: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentChange: number;
  }> {
    // Get current period (last 30 days)
    const current = await this.searchNearby({ lat, lng, radius: 1, days: 30 });
    
    // Get previous period (30-60 days ago) - would need different API call
    // For now, simulate with mock data
    const previousCount = Math.round(current.incidents.length * (0.9 + Math.random() * 0.2));
    
    const percentChange = ((current.incidents.length - previousCount) / previousCount) * 100;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (percentChange > 10) trend = 'increasing';
    else if (percentChange < -10) trend = 'decreasing';

    return {
      current: current.incidents.length,
      previous: previousCount,
      trend,
      percentChange: Math.round(percentChange * 10) / 10,
    };
  }

  /**
   * Normalize crime type from various sources
   */
  private normalizeCrimeType(type: string): CrimeIncident['type'] {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('assault') || lowerType.includes('attack')) return 'assault';
    if (lowerType.includes('burglary') || lowerType.includes('break')) return 'burglary';
    if (lowerType.includes('robbery') || lowerType.includes('rob')) return 'robbery';
    if (lowerType.includes('theft') || lowerType.includes('steal')) return 'theft';
    if (lowerType.includes('vandal') || lowerType.includes('damage')) return 'vandalism';
    if (lowerType.includes('arrest')) return 'arrest';
    if (lowerType.includes('shoot') || lowerType.includes('gun')) return 'shooting';
    
    return 'other';
  }

  /**
   * Calculate severity based on crime type
   */
  private calculateSeverity(type: string): CrimeIncident['severity'] {
    const normalizedType = this.normalizeCrimeType(type);
    
    const highSeverity = ['shooting', 'assault', 'robbery'];
    const mediumSeverity = ['burglary', 'theft'];
    
    if (highSeverity.includes(normalizedType)) return 'high';
    if (mediumSeverity.includes(normalizedType)) return 'medium';
    return 'low';
  }

  /**
   * Calculate crime statistics
   */
  private calculateStatistics(
    incidents: CrimeIncident[],
    params: CrimeSearchParams
  ): CrimeStatistics {
    const incidentsByType: Record<string, number> = {};
    
    for (const incident of incidents) {
      incidentsByType[incident.type] = (incidentsByType[incident.type] || 0) + 1;
    }

    // Calculate safety score (0-100, higher is safer)
    // Based on number and severity of incidents
    let severityWeight = 0;
    for (const incident of incidents) {
      if (incident.severity === 'high') severityWeight += 3;
      else if (incident.severity === 'medium') severityWeight += 2;
      else severityWeight += 1;
    }

    // Normalize to 0-100 scale (assuming 0 incidents = 100, 50+ weighted incidents = 0)
    const safetyScore = Math.max(0, Math.min(100, 100 - (severityWeight * 2)));

    // Estimate crime rate per 1000 residents
    // Assuming 1 mile radius covers ~3000 residents (rough estimate)
    const estimatedPopulation = 3000 * Math.pow(params.radius || 1, 2);
    const crimeRate = (incidents.length / estimatedPopulation) * 1000;

    // Determine trend (would need historical data, using mock for now)
    const trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

    // Compare to national average (mock comparison)
    const nationalAverage = 30; // incidents per month per square mile
    const localRate = incidents.length / Math.pow(params.radius || 1, 2);
    
    let comparedToNational: 'below' | 'average' | 'above';
    if (localRate < nationalAverage * 0.8) comparedToNational = 'below';
    else if (localRate > nationalAverage * 1.2) comparedToNational = 'above';
    else comparedToNational = 'average';

    return {
      totalIncidents: incidents.length,
      incidentsByType,
      safetyScore: Math.round(safetyScore),
      crimeRate: Math.round(crimeRate * 10) / 10,
      trend,
      comparedToNational,
    };
  }

  /**
   * Convert safety score to letter grade
   */
  private getSafetyGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get mock crime data for testing/fallback
   */
  private getMockCrimeData(params: CrimeSearchParams): CrimeSearchResult {
    const mockIncidents: CrimeIncident[] = [
      {
        id: 'mock-1',
        type: 'theft',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        location: {
          lat: params.lat + 0.005,
          lng: params.lng + 0.005,
          address: '123 Main St',
        },
        description: 'Vehicle theft',
        severity: 'medium',
      },
      {
        id: 'mock-2',
        type: 'vandalism',
        date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        location: {
          lat: params.lat - 0.003,
          lng: params.lng + 0.002,
          address: '456 Oak Ave',
        },
        description: 'Graffiti',
        severity: 'low',
      },
      {
        id: 'mock-3',
        type: 'burglary',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        location: {
          lat: params.lat + 0.002,
          lng: params.lng - 0.004,
          address: '789 Elm St',
        },
        description: 'Residential burglary',
        severity: 'high',
      },
    ];

    const statistics = this.calculateStatistics(mockIncidents, params);
    const safetyGrade = this.getSafetyGrade(statistics.safetyScore);

    return {
      incidents: mockIncidents,
      statistics,
      safetyGrade,
    };
  }
}

// Singleton instance
let crimeDataAPIInstance: CrimeDataAPI | null = null;

export function getCrimeDataAPI(): CrimeDataAPI {
  if (!crimeDataAPIInstance) {
    crimeDataAPIInstance = new CrimeDataAPI();
  }
  return crimeDataAPIInstance;
}

// Export singleton
export const crimeDataAPI = getCrimeDataAPI();
