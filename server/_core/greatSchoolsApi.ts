/**
 * GreatSchools API Integration
 * Provides school ratings and information for properties
 * API Documentation: https://www.greatschools.org/api/
 */

import axios from 'axios';
import { logger } from "./logger";

// GreatSchools API configuration
const GREATSCHOOLS_API_KEY = process.env.GREATSCHOOLS_API_KEY || '';
const GREATSCHOOLS_API_URL = 'https://api.greatschools.org/schools';

export interface School {
  id: string;
  name: string;
  type: 'public' | 'private' | 'charter';
  level: 'elementary' | 'middle' | 'high';
  grades: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  distance: number; // miles from search location
  rating: number; // 1-10 scale
  parentRating: number; // 1-5 scale
  testRating: number; // 1-10 scale
  enrollment: number;
  studentTeacherRatio: number;
  website?: string;
  phone?: string;
}

export interface SchoolSearchParams {
  lat: number;
  lng: number;
  radius?: number; // miles, default 5
  level?: 'elementary' | 'middle' | 'high' | 'all';
  limit?: number;
}

export interface SchoolSearchResult {
  schools: School[];
  total: number;
  averageRating: number;
}

class GreatSchoolsAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = GREATSCHOOLS_API_KEY;
    this.baseUrl = GREATSCHOOLS_API_URL;
  }

  /**
   * Search for schools near a location
   */
  async searchNearby(params: SchoolSearchParams): Promise<SchoolSearchResult> {
    if (!this.apiKey) {
      logger.warn('[GreatSchools] API key not configured, returning mock data');
      return this.getMockSchools(params);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/nearby`, {
        params: {
          key: this.apiKey,
          lat: params.lat,
          lon: params.lng,
          radius: params.radius || 5,
          level: params.level || 'all',
          limit: params.limit || 20,
        },
        timeout: 5000,
      });

      const schools: School[] = response.data.schools.map((school: any) => ({
        id: school.id,
        name: school.name,
        type: school.type,
        level: school.level,
        grades: school.grades,
        address: {
          street: school.address.street,
          city: school.address.city,
          state: school.address.state,
          zip: school.address.zip,
        },
        location: {
          lat: parseFloat(school.lat),
          lng: parseFloat(school.lon),
        },
        distance: parseFloat(school.distance),
        rating: parseInt(school.gsRating) || 0,
        parentRating: parseFloat(school.parentRating) || 0,
        testRating: parseInt(school.testRating) || 0,
        enrollment: parseInt(school.enrollment) || 0,
        studentTeacherRatio: parseFloat(school.studentTeacherRatio) || 0,
        website: school.website,
        phone: school.phone,
      }));

      const averageRating =
        schools.reduce((sum, s) => sum + s.rating, 0) / schools.length || 0;

      return {
        schools,
        total: schools.length,
        averageRating: Math.round(averageRating * 10) / 10,
      };
    } catch (error) {
      logger.error('[GreatSchools] API error:', { error: String(error) });
      // Fallback to mock data on error
      return this.getMockSchools(params);
    }
  }

  /**
   * Get school details by ID
   */
  async getSchoolDetails(schoolId: string): Promise<School | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/${schoolId}`, {
        params: { key: this.apiKey },
        timeout: 5000,
      });

      const school = response.data;
      return {
        id: school.id,
        name: school.name,
        type: school.type,
        level: school.level,
        grades: school.grades,
        address: {
          street: school.address.street,
          city: school.address.city,
          state: school.address.state,
          zip: school.address.zip,
        },
        location: {
          lat: parseFloat(school.lat),
          lng: parseFloat(school.lon),
        },
        distance: 0,
        rating: parseInt(school.gsRating) || 0,
        parentRating: parseFloat(school.parentRating) || 0,
        testRating: parseInt(school.testRating) || 0,
        enrollment: parseInt(school.enrollment) || 0,
        studentTeacherRatio: parseFloat(school.studentTeacherRatio) || 0,
        website: school.website,
        phone: school.phone,
      };
    } catch (error) {
      logger.error('[GreatSchools] Failed to get school details:', { error: String(error) });
      return null;
    }
  }

  /**
   * Calculate school score for a location
   * Returns weighted average of nearby schools
   */
  async calculateSchoolScore(lat: number, lng: number): Promise<number> {
    const result = await this.searchNearby({ lat, lng, radius: 2, limit: 10 });
    
    if (result.schools.length === 0) {
      return 0;
    }

    // Weight schools by distance (closer schools have more weight)
    let weightedSum = 0;
    let totalWeight = 0;

    for (const school of result.schools) {
      const weight = 1 / (school.distance + 0.1); // Avoid division by zero
      weightedSum += school.rating * weight;
      totalWeight += weight;
    }

    const score = weightedSum / totalWeight;
    return Math.round(score * 10) / 10;
  }

  /**
   * Get mock school data for testing/fallback
   */
  private getMockSchools(params: SchoolSearchParams): SchoolSearchResult {
    const mockSchools: School[] = [
      {
        id: 'mock-1',
        name: 'Lincoln Elementary School',
        type: 'public',
        level: 'elementary',
        grades: 'K-5',
        address: {
          street: '123 Main St',
          city: 'Sample City',
          state: 'CA',
          zip: '90210',
        },
        location: {
          lat: params.lat + 0.01,
          lng: params.lng + 0.01,
        },
        distance: 0.5,
        rating: 8,
        parentRating: 4.2,
        testRating: 7,
        enrollment: 450,
        studentTeacherRatio: 18,
        website: 'https://lincoln.example.com',
        phone: '555-0100',
      },
      {
        id: 'mock-2',
        name: 'Washington Middle School',
        type: 'public',
        level: 'middle',
        grades: '6-8',
        address: {
          street: '456 Oak Ave',
          city: 'Sample City',
          state: 'CA',
          zip: '90210',
        },
        location: {
          lat: params.lat + 0.02,
          lng: params.lng - 0.01,
        },
        distance: 1.2,
        rating: 7,
        parentRating: 3.8,
        testRating: 6,
        enrollment: 600,
        studentTeacherRatio: 20,
        website: 'https://washington.example.com',
        phone: '555-0200',
      },
      {
        id: 'mock-3',
        name: 'Jefferson High School',
        type: 'public',
        level: 'high',
        grades: '9-12',
        address: {
          street: '789 Elm St',
          city: 'Sample City',
          state: 'CA',
          zip: '90210',
        },
        location: {
          lat: params.lat - 0.01,
          lng: params.lng + 0.02,
        },
        distance: 1.8,
        rating: 9,
        parentRating: 4.5,
        testRating: 9,
        enrollment: 1200,
        studentTeacherRatio: 22,
        website: 'https://jefferson.example.com',
        phone: '555-0300',
      },
    ];

    // Filter by level if specified
    let filteredSchools = mockSchools;
    if (params.level && params.level !== 'all') {
      filteredSchools = mockSchools.filter(s => s.level === params.level);
    }

    const averageRating =
      filteredSchools.reduce((sum, s) => sum + s.rating, 0) / filteredSchools.length;

    return {
      schools: filteredSchools,
      total: filteredSchools.length,
      averageRating: Math.round(averageRating * 10) / 10,
    };
  }
}

// Singleton instance
let greatSchoolsAPIInstance: GreatSchoolsAPI | null = null;

export function getGreatSchoolsAPI(): GreatSchoolsAPI {
  if (!greatSchoolsAPIInstance) {
    greatSchoolsAPIInstance = new GreatSchoolsAPI();
  }
  return greatSchoolsAPIInstance;
}

// Export singleton
export const greatSchoolsAPI = getGreatSchoolsAPI();
