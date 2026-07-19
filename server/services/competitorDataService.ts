/**
 * Unified Competitor Data Service
 * 
 * Aggregates data from multiple sources (Airbnb, Booking.com)
 * and provides normalized competitor pricing intelligence
 */

import { airbnbIntegration } from './airbnbIntegrationService';
import { bookingComScraper } from './bookingComScraperService';

interface CompetitorProperty {
  source: 'airbnb' | 'booking';
  id: string;
  name: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  rating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
  amenities: string[];
  url: string;
}

interface MarketAnalysis {
  averagePrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  totalListings: number;
  occupancyRate: number;
  demandScore: number;
  seasonalityFactor: number;
  competitorCount: {
    airbnb: number;
    booking: number;
    total: number;
  };
  priceDistribution: {
    budget: number; // < 25th percentile
    midRange: number; // 25-75th percentile
    premium: number; // > 75th percentile
  };
}

interface PricingRecommendation {
  recommendedPrice: number;
  confidence: number;
  reasoning: string[];
  priceAdjustments: {
    weekendMultiplier: number;
    seasonalMultiplier: number;
    demandMultiplier: number;
  };
  competitivePosition: 'below_market' | 'at_market' | 'above_market';
}

export class CompetitorDataService {
  /**
   * Get comprehensive market analysis for a location
   */
  async getMarketAnalysis(params: {
    city: string;
    bedrooms: number;
    bathrooms: number;
    guests: number;
    checkIn?: string;
    checkOut?: string;
  }): Promise<MarketAnalysis> {
    // Fetch data from both sources in parallel
    const [airbnbStats, bookingStats] = await Promise.all([
      airbnbIntegration.getPricingStats({
        city: params.city,
        bedrooms: params.bedrooms,
        guests: params.guests,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      }),
      bookingComScraper.getPricingStats({
        city: params.city,
        rooms: params.bedrooms,
        guests: params.guests,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      }),
    ]);

    // Aggregate statistics
    const avgPrice = Math.round((airbnbStats.averagePrice + bookingStats.averagePrice) / 2);
    const medianPrice = Math.round((airbnbStats.medianPrice + bookingStats.medianPrice) / 2);
    const minPrice = Math.min(airbnbStats.priceRange.min, bookingStats.priceRange.min);
    const maxPrice = Math.max(airbnbStats.priceRange.max, bookingStats.priceRange.max);
    const avgOccupancy = (airbnbStats.occupancyRate + bookingStats.occupancyRate) / 2;
    const avgDemand = (airbnbStats.demandScore + bookingStats.demandScore) / 2;

    // Calculate seasonality factor based on current month
    const month = new Date().getMonth();
    const seasonalityFactor = this.calculateSeasonalityFactor(month, params.city);

    // Calculate price distribution
    const q1 = Math.round(avgPrice * 0.75);
    const q3 = Math.round(avgPrice * 1.25);
    
    // Get actual listings to calculate distribution
    const [airbnbListings, bookingListings] = await Promise.all([
      airbnbIntegration.searchListings({
        city: params.city,
        bedrooms: params.bedrooms,
        guests: params.guests,
      }),
      bookingComScraper.searchListings({
        city: params.city,
        rooms: params.bedrooms,
        guests: params.guests,
      }),
    ]);

    const allPrices = [
      ...airbnbListings.listings.map(l => l.price),
      ...bookingListings.listings.map(l => l.price),
    ];

    const budget = allPrices.filter(p => p < q1).length;
    const midRange = allPrices.filter(p => p >= q1 && p <= q3).length;
    const premium = allPrices.filter(p => p > q3).length;

    return {
      averagePrice: avgPrice,
      medianPrice: medianPrice,
      priceRange: { min: minPrice, max: maxPrice },
      totalListings: airbnbListings.totalCount + bookingListings.totalCount,
      occupancyRate: avgOccupancy,
      demandScore: Math.round(avgDemand),
      seasonalityFactor,
      competitorCount: {
        airbnb: airbnbListings.totalCount,
        booking: bookingListings.totalCount,
        total: airbnbListings.totalCount + bookingListings.totalCount,
      },
      priceDistribution: {
        budget: Math.round((budget / allPrices.length) * 100),
        midRange: Math.round((midRange / allPrices.length) * 100),
        premium: Math.round((premium / allPrices.length) * 100),
      },
    };
  }

  /**
   * Get pricing recommendation based on market analysis
   */
  async getPricingRecommendation(params: {
    city: string;
    bedrooms: number;
    bathrooms: number;
    guests: number;
    currentPrice?: number;
    propertyQuality?: 'budget' | 'standard' | 'premium';
  }): Promise<PricingRecommendation> {
    const marketAnalysis = await this.getMarketAnalysis(params);
    
    // Base recommendation on market median
    let recommendedPrice = marketAnalysis.medianPrice;
    const reasoning: string[] = [];

    // Adjust for property quality
    const quality = params.propertyQuality || 'standard';
    if (quality === 'premium') {
      recommendedPrice *= 1.2;
      reasoning.push('Premium property quality justifies 20% price premium');
    } else if (quality === 'budget') {
      recommendedPrice *= 0.85;
      reasoning.push('Budget positioning suggests 15% discount from market median');
    } else {
      reasoning.push('Standard property quality aligns with market median pricing');
    }

    // Adjust for demand
    if (marketAnalysis.demandScore > 80) {
      recommendedPrice *= 1.1;
      reasoning.push(`High demand (${marketAnalysis.demandScore}/100) supports 10% price increase`);
    } else if (marketAnalysis.demandScore < 40) {
      recommendedPrice *= 0.95;
      reasoning.push(`Low demand (${marketAnalysis.demandScore}/100) suggests 5% discount`);
    }

    // Adjust for occupancy
    if (marketAnalysis.occupancyRate > 0.85) {
      recommendedPrice *= 1.05;
      reasoning.push(`High occupancy (${Math.round(marketAnalysis.occupancyRate * 100)}%) indicates room for price increase`);
    }

    // Calculate multipliers
    const weekendMultiplier = marketAnalysis.demandScore > 70 ? 1.25 : 1.15;
    const seasonalMultiplier = marketAnalysis.seasonalityFactor;
    const demandMultiplier = 1 + (marketAnalysis.demandScore - 50) / 200; // 0.75 to 1.25

    // Determine competitive position
    let competitivePosition: 'below_market' | 'at_market' | 'above_market' = 'at_market';
    if (params.currentPrice) {
      if (params.currentPrice < marketAnalysis.averagePrice * 0.9) {
        competitivePosition = 'below_market';
        reasoning.push('Current price is below market average - opportunity to increase');
      } else if (params.currentPrice > marketAnalysis.averagePrice * 1.1) {
        competitivePosition = 'above_market';
        reasoning.push('Current price is above market average - may reduce bookings');
      } else {
        reasoning.push('Current price is competitive with market average');
      }
    }

    // Calculate confidence based on data availability
    const confidence = Math.min(95, 60 + (marketAnalysis.totalListings / 10) * 35);

    return {
      recommendedPrice: Math.round(recommendedPrice),
      confidence: Math.round(confidence),
      reasoning,
      priceAdjustments: {
        weekendMultiplier,
        seasonalMultiplier,
        demandMultiplier,
      },
      competitivePosition,
    };
  }

  /**
   * Get all competitor listings for a property
   */
  async getCompetitorListings(params: {
    city: string;
    bedrooms: number;
    bathrooms: number;
    guests: number;
    limit?: number;
  }): Promise<CompetitorProperty[]> {
    const limit = params.limit || 20;
    
    // Fetch from both sources
    const [airbnbListings, bookingListings] = await Promise.all([
      airbnbIntegration.findSimilarListings({
        city: params.city,
        bedrooms: params.bedrooms,
        bathrooms: params.bathrooms,
        guests: params.guests,
      }, Math.ceil(limit / 2)),
      bookingComScraper.findSimilarListings({
        city: params.city,
        bedrooms: params.bedrooms,
        bathrooms: params.bathrooms,
        guests: params.guests,
      }, Math.ceil(limit / 2)),
    ]);

    // Normalize and combine
    const competitors: CompetitorProperty[] = [
      ...airbnbListings.map(listing => ({
        source: 'airbnb' as const,
        id: listing.id,
        name: listing.name,
        price: listing.price,
        currency: listing.currency,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        guests: listing.guests,
        rating: listing.rating,
        reviewCount: listing.reviewCount,
        latitude: listing.latitude,
        longitude: listing.longitude,
        amenities: listing.amenities,
        url: listing.url,
      })),
      ...bookingListings.map(listing => ({
        source: 'booking' as const,
        id: listing.id,
        name: listing.name,
        price: listing.price,
        currency: listing.currency,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        guests: listing.guests,
        rating: listing.rating,
        reviewCount: listing.reviewCount,
        latitude: listing.latitude,
        longitude: listing.longitude,
        amenities: listing.amenities,
        url: listing.url,
      })),
    ];

    // Sort by rating and review count
    return competitors
      .sort((a, b) => {
        const scoreA = a.rating * Math.log(a.reviewCount + 1);
        const scoreB = b.rating * Math.log(b.reviewCount + 1);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Calculate seasonality factor for a given month and city
   */
  private calculateSeasonalityFactor(month: number, city: string): number {
    // Nigerian tourism seasons
    // High season: December-February (dry season, holidays)
    // Mid season: March-May, October-November
    // Low season: June-September (rainy season)
    
    const isNigeria = city.toLowerCase().includes('lagos') || 
                     city.toLowerCase().includes('abuja') ||
                     city.toLowerCase().includes('port harcourt');

    if (isNigeria) {
      if (month >= 11 || month <= 1) return 1.25; // High season
      if (month >= 5 && month <= 8) return 0.85; // Low season
      return 1.0; // Mid season
    }

    // Default seasonality (Northern hemisphere)
    if (month >= 5 && month <= 8) return 1.15; // Summer
    if (month >= 11 || month <= 1) return 1.1; // Winter holidays
    return 1.0;
  }

  /**
   * Check if services are in mock mode
   */
  getServiceStatus(): {
    airbnb: { available: boolean; mockMode: boolean };
    booking: { available: boolean; mockMode: boolean };
  } {
    return {
      airbnb: {
        available: true,
        mockMode: airbnbIntegration.isMockMode(),
      },
      booking: {
        available: true,
        mockMode: bookingComScraper.isMockMode(),
      },
    };
  }
}

// Singleton instance
export const competitorDataService = new CompetitorDataService();
