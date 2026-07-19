// @ts-nocheck
import { getDb } from "../db";
import { competitorListings, properties } from "../../drizzle/schema";
import { eq, sql, and, gte, desc } from "drizzle-orm";

export interface CompetitorInsight {
  propertyId: number;
  propertyAddress: string;
  propertyPrice: number;
  competitorCount: number;
  avgCompetitorPrice: number;
  lowestCompetitorPrice: number;
  highestCompetitorPrice: number;
  pricePosition: "below_market" | "at_market" | "above_market";
  competitiveAdvantage: number; // -100 to 100
  recommendedAction: string;
  marketShare: number; // percentage
  priceChangeVelocity: number; // average price change rate
}

export interface MarketPositioning {
  totalProperties: number;
  totalCompetitors: number;
  avgMarketPrice: number;
  priceDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  topPerformers: {
    propertyId: number;
    address: string;
    competitiveScore: number;
  }[];
}

export interface PricingRecommendation {
  propertyId: number;
  currentPrice: number;
  recommendedPrice: number;
  priceAdjustment: number;
  confidence: number;
  reasoning: string[];
}

export class CompetitorInsightsService {
  /**
   * Get comprehensive insights for a property
   */
  static async getPropertyInsights(propertyId: number): Promise<CompetitorInsight | null> {
    const db = await getDb();
    if (!db) return null;

    // Get property details
    const property = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!property[0]) return null;

    // Get competitor statistics
    const competitors = await db
      .select()
      .from(competitorListings)
      .where(eq(competitorListings.propertyId, propertyId));

    if (competitors.length === 0) {
      return {
        propertyId,
        propertyAddress: property[0].addressLine1,
        propertyPrice: property[0].price,
        competitorCount: 0,
        avgCompetitorPrice: property[0].price,
        lowestCompetitorPrice: property[0].price,
        highestCompetitorPrice: property[0].price,
        pricePosition: "at_market",
        competitiveAdvantage: 0,
        recommendedAction: "No competitors found. Consider expanding search criteria.",
        marketShare: 100,
        priceChangeVelocity: 0,
      };
    }

    const competitorPrices = competitors
      .map(c => c.competitorPrice)
      .filter((p): p is number => p !== null);

    const avgPrice = competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length;
    const lowestPrice = Math.min(...competitorPrices);
    const highestPrice = Math.max(...competitorPrices);

    // Calculate price position
    const propertyPrice = property[0].price;
    let pricePosition: "below_market" | "at_market" | "above_market" = "at_market";
    if (propertyPrice < avgPrice * 0.95) pricePosition = "below_market";
    else if (propertyPrice > avgPrice * 1.05) pricePosition = "above_market";

    // Calculate competitive advantage (-100 to 100)
    const competitiveAdvantage = Math.round(
      ((avgPrice - propertyPrice) / avgPrice) * 100
    );

    // Generate recommendation
    let recommendedAction = "";
    if (pricePosition === "below_market") {
      recommendedAction = "Your property is priced competitively. Consider highlighting unique features to justify value.";
    } else if (pricePosition === "above_market") {
      recommendedAction = "Your property is priced above market average. Consider price adjustment or emphasize premium features.";
    } else {
      recommendedAction = "Your property is priced at market average. Monitor competitor changes closely.";
    }

    // Calculate market share (simplified)
    const totalMarketValue = propertyPrice + competitorPrices.reduce((sum, p) => sum + p, 0);
    const marketShare = Math.round((propertyPrice / totalMarketValue) * 100);

    // Calculate price change velocity
    const recentChanges = competitors
      .filter(c => c.priceHistory)
      .map(c => {
        try {
          const history = JSON.parse(c.priceHistory!);
          return history.length > 1 ? history[history.length - 1].price - history[0].price : 0;
        } catch {
          return 0;
        }
      });

    const priceChangeVelocity = recentChanges.length > 0
      ? Math.round(recentChanges.reduce((sum, c) => sum + c, 0) / recentChanges.length)
      : 0;

    return {
      propertyId,
      propertyAddress: property[0].addressLine1,
      propertyPrice,
      competitorCount: competitors.length,
      avgCompetitorPrice: Math.round(avgPrice),
      lowestCompetitorPrice: lowestPrice,
      highestCompetitorPrice: highestPrice,
      pricePosition,
      competitiveAdvantage,
      recommendedAction,
      marketShare,
      priceChangeVelocity,
    };
  }

  /**
   * Get market positioning analysis
   */
  static async getMarketPositioning(): Promise<MarketPositioning> {
    const db = await getDb();
    if (!db) {
      return {
        totalProperties: 0,
        totalCompetitors: 0,
        avgMarketPrice: 0,
        priceDistribution: [],
        topPerformers: [],
      };
    }

    // Get all properties with competitors
    const propertiesWithCompetitors = await db
      .select({
        id: properties.id,
        address: properties.addressLine1,
        price: properties.price,
      })
      .from(properties)
      .where(eq(properties.status, "active"));

    const allCompetitors = await db.select().from(competitorListings);

    // Calculate average market price
    const allPrices = [
      ...propertiesWithCompetitors.map(p => p.price),
      ...allCompetitors.map(c => c.competitorPrice).filter((p): p is number => p !== null),
    ];

    const avgMarketPrice = allPrices.length > 0
      ? Math.round(allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length)
      : 0;

    // Calculate price distribution
    const priceRanges = [
      { range: "Under ₦10M", min: 0, max: 10000000 },
      { range: "₦10M - ₦25M", min: 10000000, max: 25000000 },
      { range: "₦25M - ₦50M", min: 25000000, max: 50000000 },
      { range: "₦50M - ₦100M", min: 50000000, max: 100000000 },
      { range: "Over ₦100M", min: 100000000, max: Infinity },
    ];

    const priceDistribution = priceRanges.map(range => {
      const count = allPrices.filter(p => p >= range.min && p < range.max).length;
      return {
        range: range.range,
        count,
        percentage: allPrices.length > 0 ? Math.round((count / allPrices.length) * 100) : 0,
      };
    });

    // Calculate top performers (properties with best competitive advantage)
    const topPerformers = await Promise.all(
      propertiesWithCompetitors.slice(0, 10).map(async (prop) => {
        const insights = await this.getPropertyInsights(prop.id);
        return {
          propertyId: prop.id,
          address: prop.addressLine1,
          competitiveScore: insights?.competitiveAdvantage || 0,
        };
      })
    );

    topPerformers.sort((a, b) => b.competitiveScore - a.competitiveScore);

    return {
      totalProperties: propertiesWithCompetitors.length,
      totalCompetitors: allCompetitors.length,
      avgMarketPrice,
      priceDistribution,
      topPerformers: topPerformers.slice(0, 5),
    };
  }

  /**
   * Generate pricing recommendation
   */
  static async getPricingRecommendation(propertyId: number): Promise<PricingRecommendation | null> {
    const insights = await this.getPropertyInsights(propertyId);
    if (!insights) return null;

    const reasoning: string[] = [];
    let recommendedPrice = insights.propertyPrice;
    let confidence = 70; // Base confidence

    // Analyze competitive position
    if (insights.pricePosition === "above_market") {
      const adjustment = (insights.propertyPrice - insights.avgCompetitorPrice) * 0.5;
      recommendedPrice = Math.round(insights.propertyPrice - adjustment);
      reasoning.push(`Property is ${Math.abs(insights.competitiveAdvantage)}% above market average`);
      reasoning.push("Recommend price reduction to improve competitiveness");
      confidence += 10;
    } else if (insights.pricePosition === "below_market") {
      const adjustment = (insights.avgCompetitorPrice - insights.propertyPrice) * 0.3;
      recommendedPrice = Math.round(insights.propertyPrice + adjustment);
      reasoning.push(`Property is ${Math.abs(insights.competitiveAdvantage)}% below market average`);
      reasoning.push("Opportunity to increase price while remaining competitive");
      confidence += 5;
    } else {
      reasoning.push("Property is priced at market average");
      reasoning.push("Current pricing is optimal");
    }

    // Consider price change velocity
    if (insights.priceChangeVelocity < -1000000) {
      reasoning.push("Market trend shows declining prices");
      confidence -= 10;
    } else if (insights.priceChangeVelocity > 1000000) {
      reasoning.push("Market trend shows rising prices");
      confidence += 10;
    }

    // Consider competitor count
    if (insights.competitorCount < 3) {
      reasoning.push("Limited competitor data - recommendation has lower confidence");
      confidence -= 20;
    } else if (insights.competitorCount > 10) {
      reasoning.push("Strong competitor data available");
      confidence += 10;
    }

    const priceAdjustment = recommendedPrice - insights.propertyPrice;

    return {
      propertyId,
      currentPrice: insights.propertyPrice,
      recommendedPrice,
      priceAdjustment,
      confidence: Math.min(Math.max(confidence, 0), 100),
      reasoning,
    };
  }

  /**
   * Get insights for all properties
   */
  static async getAllInsights(): Promise<CompetitorInsight[]> {
    const db = await getDb();
    if (!db) return [];

    const allProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.status, "active"));

    const insights = await Promise.all(
      allProperties.map(prop => this.getPropertyInsights(prop.id))
    );

    return insights.filter((i): i is CompetitorInsight => i !== null);
  }
}
