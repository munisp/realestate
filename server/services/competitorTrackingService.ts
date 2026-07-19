import { getDb } from "../db";
import { marketPricingRecommendations, shortLetProperties } from "../../drizzle/schema";
import { eq, and, gte, desc } from "drizzle-orm";

/**
 * Competitor Tracking Service
 * 
 * This service tracks competitor pricing and generates market recommendations.
 * In a production environment, this would integrate with:
 * - Web scraping services (e.g., Scrapy, Puppeteer)
 * - Third-party APIs (e.g., Airbnb API, Booking.com API)
 * - Real estate data providers
 * 
 * For now, we'll implement a mock version that demonstrates the functionality.
 */

interface CompetitorProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  rating: number;
  reviewCount: number;
  source: string; // 'airbnb', 'booking', 'vrbo', etc.
}

interface MarketAnalysis {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  competitorCount: number;
  demandScore: number; // 0-1
  seasonalityFactor: number; // 0.5-2.0
  recommendedPrice: number;
  confidence: number; // 0-1
  reasoning: string;
}

export class CompetitorTrackingService {
  /**
   * Fetch competitor properties from various sources
   * In production, this would call real APIs or scraping services
   */
  private async fetchCompetitorData(
    location: string,
    bedrooms: number,
    propertyType: string
  ): Promise<CompetitorProperty[]> {
    // Mock competitor data
    // In production, replace with real API calls
    const mockCompetitors: CompetitorProperty[] = [
      {
        id: "comp-1",
        title: "Luxury Apartment in " + location,
        price: 18000,
        location,
        bedrooms,
        bathrooms: 2,
        amenities: ["wifi", "pool", "gym", "parking"],
        rating: 4.8,
        reviewCount: 124,
        source: "airbnb",
      },
      {
        id: "comp-2",
        title: "Modern Condo in " + location,
        price: 22000,
        location,
        bedrooms,
        bathrooms: 2,
        amenities: ["wifi", "pool", "security"],
        rating: 4.6,
        reviewCount: 89,
        source: "booking",
      },
      {
        id: "comp-3",
        title: "Cozy Apartment in " + location,
        price: 15000,
        location,
        bedrooms,
        bathrooms: 1,
        amenities: ["wifi", "parking"],
        rating: 4.5,
        reviewCount: 67,
        source: "vrbo",
      },
      {
        id: "comp-4",
        title: "Premium Flat in " + location,
        price: 25000,
        location,
        bedrooms: bedrooms + 1,
        bathrooms: 3,
        amenities: ["wifi", "pool", "gym", "parking", "concierge"],
        rating: 4.9,
        reviewCount: 156,
        source: "airbnb",
      },
      {
        id: "comp-5",
        title: "Budget-Friendly Studio in " + location,
        price: 12000,
        location,
        bedrooms: bedrooms - 1 < 1 ? 1 : bedrooms - 1,
        bathrooms: 1,
        amenities: ["wifi"],
        rating: 4.2,
        reviewCount: 43,
        source: "booking",
      },
    ];

    // Filter by similar size (±1 bedroom)
    return mockCompetitors.filter(
      (comp) => Math.abs(comp.bedrooms - bedrooms) <= 1
    );
  }

  /**
   * Calculate demand score based on market factors
   */
  private calculateDemandScore(
    competitors: CompetitorProperty[],
    location: string
  ): number {
    // Factors that influence demand:
    // 1. Number of competitors (more = higher demand)
    // 2. Average review count (more reviews = more bookings)
    // 3. Average rating (higher = better market)

    const competitorCount = competitors.length;
    const avgReviewCount =
      competitors.reduce((sum, c) => sum + c.reviewCount, 0) /
      competitorCount;
    const avgRating =
      competitors.reduce((sum, c) => sum + c.rating, 0) / competitorCount;

    // Normalize scores
    const competitorScore = Math.min(competitorCount / 10, 1); // Max at 10 competitors
    const reviewScore = Math.min(avgReviewCount / 200, 1); // Max at 200 reviews
    const ratingScore = avgRating / 5; // Max at 5 stars

    // Weighted average
    const demandScore =
      competitorScore * 0.3 + reviewScore * 0.4 + ratingScore * 0.3;

    return Math.min(Math.max(demandScore, 0), 1);
  }

  /**
   * Calculate seasonality factor based on current month
   */
  private calculateSeasonalityFactor(): number {
    const month = new Date().getMonth(); // 0-11

    // High season: December-February, July-August (Nigeria)
    const highSeasonMonths = [0, 1, 6, 7, 11];
    // Low season: March-May, September-November
    const lowSeasonMonths = [2, 3, 4, 8, 9, 10];

    if (highSeasonMonths.includes(month)) {
      return 1.3; // 30% increase
    } else if (lowSeasonMonths.includes(month)) {
      return 0.85; // 15% decrease
    } else {
      return 1.0; // Normal season
    }
  }

  /**
   * Analyze market and generate pricing recommendation
   */
  async analyzeMarket(propertyId: number): Promise<MarketAnalysis> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get property details
    const property = await db
      .select()
      .from(shortLetProperties)
      .where(eq(shortLetProperties.id, propertyId))
      .limit(1);

    if (!property.length) {
      throw new Error("Property not found");
    }

    const prop = property[0];
    const location = prop.city || "Lagos";
    const bedrooms = prop.bedrooms || 2;
    const propertyType = prop.propertyType || "apartment";

    // Fetch competitor data
    const competitors = await this.fetchCompetitorData(
      location,
      bedrooms,
      propertyType
    );

    if (competitors.length === 0) {
      throw new Error("No competitor data available");
    }

    // Calculate statistics
    const prices = competitors.map((c) => c.price).sort((a, b) => a - b);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    const medianPrice = prices[Math.floor(prices.length / 2)];

    // Calculate demand and seasonality
    const demandScore = this.calculateDemandScore(competitors, location);
    const seasonalityFactor = this.calculateSeasonalityFactor();

    // Calculate recommended price
    // Base on median price, adjusted for demand and seasonality
    let recommendedPrice = medianPrice * demandScore * seasonalityFactor;

    // Ensure it's within reasonable bounds (±30% of median)
    recommendedPrice = Math.max(
      medianPrice * 0.7,
      Math.min(recommendedPrice, medianPrice * 1.3)
    );

    // Calculate confidence based on data quality
    const confidence = Math.min(
      0.5 + competitors.length * 0.1, // More competitors = higher confidence
      0.95 // Cap at 95%
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      avgPrice,
      recommendedPrice,
      demandScore,
      seasonalityFactor,
      competitors.length
    );

    return {
      avgPrice: Math.round(avgPrice),
      minPrice,
      maxPrice,
      medianPrice: Math.round(medianPrice),
      competitorCount: competitors.length,
      demandScore: Math.round(demandScore * 100) / 100,
      seasonalityFactor: Math.round(seasonalityFactor * 100) / 100,
      recommendedPrice: Math.round(recommendedPrice),
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  /**
   * Generate human-readable reasoning for the recommendation
   */
  private generateReasoning(
    avgPrice: number,
    recommendedPrice: number,
    demandScore: number,
    seasonalityFactor: number,
    competitorCount: number
  ): string {
    const parts: string[] = [];

    // Price comparison
    const priceDiff = ((recommendedPrice - avgPrice) / avgPrice) * 100;
    if (Math.abs(priceDiff) < 5) {
      parts.push(
        `Your recommended price is aligned with the market average of ₦${Math.round(
          avgPrice
        )}.`
      );
    } else if (priceDiff > 0) {
      parts.push(
        `Your recommended price is ${Math.abs(
          Math.round(priceDiff)
        )}% above market average due to high demand.`
      );
    } else {
      parts.push(
        `Your recommended price is ${Math.abs(
          Math.round(priceDiff)
        )}% below market average to remain competitive.`
      );
    }

    // Demand analysis
    if (demandScore > 0.7) {
      parts.push(
        "Market demand is high with strong booking activity and positive reviews."
      );
    } else if (demandScore > 0.4) {
      parts.push("Market demand is moderate with steady booking patterns.");
    } else {
      parts.push(
        "Market demand is low; consider competitive pricing to attract guests."
      );
    }

    // Seasonality
    if (seasonalityFactor > 1.1) {
      parts.push(
        "Currently in high season - prices adjusted upward to capture peak demand."
      );
    } else if (seasonalityFactor < 0.9) {
      parts.push(
        "Currently in low season - prices adjusted downward to maintain occupancy."
      );
    }

    // Data quality
    parts.push(
      `Analysis based on ${competitorCount} comparable properties in your area.`
    );

    return parts.join(" ");
  }

  /**
   * Save market recommendation to database
   */
  async saveRecommendation(
    propertyId: number,
    analysis: MarketAnalysis
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(marketPricingRecommendations).values({
      propertyId,
      recommendedBasePrice: analysis.recommendedPrice,
      confidence: analysis.confidence.toString(),
      competitorAvgPrice: analysis.avgPrice,
      marketDemandScore: analysis.demandScore.toString(),
      seasonalityFactor: analysis.seasonalityFactor.toString(),
      reasoning: analysis.reasoning,
    });
  }

  /**
   * Get latest recommendation for a property
   */
  async getLatestRecommendation(propertyId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const recommendations = await db
      .select()
      .from(marketPricingRecommendations)
      .where(eq(marketPricingRecommendations.propertyId, propertyId))
      .orderBy(desc(marketPricingRecommendations.createdAt))
      .limit(1);

    return recommendations[0] || null;
  }

  /**
   * Refresh market data for a property
   * This should be called periodically (e.g., daily/weekly)
   */
  async refreshMarketData(propertyId: number): Promise<MarketAnalysis> {
    const analysis = await this.analyzeMarket(propertyId);
    await this.saveRecommendation(propertyId, analysis);
    return analysis;
  }
}

// Export singleton instance
export const competitorTrackingService = new CompetitorTrackingService();
