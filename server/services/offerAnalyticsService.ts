// @ts-nocheck
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { getDb } from "../db";
import { offers, properties, counteroffers } from "../../drizzle/schema";

/**
 * Offer Analytics Service
 * Provides market insights and analytics for offers
 */

interface OfferMetrics {
  totalOffers: number;
  acceptedOffers: number;
  rejectedOffers: number;
  pendingOffers: number;
  acceptanceRate: number;
  averageOfferAmount: number;
  averageNegotiationCycle: number;
  averageTimeToAcceptance: number; // in days
}

interface PropertyOfferAnalytics {
  propertyId: number;
  listingPrice: number;
  offerCount: number;
  highestOffer: number;
  lowestOffer: number;
  averageOffer: number;
  offerToListRatio: number;
  competitivenessScore: number; // 1-100
}

interface MarketTrends {
  period: string;
  averageOfferAmount: number;
  offerCount: number;
  acceptanceRate: number;
}

/**
 * Get overall offer metrics for a user
 */
export async function getUserOfferMetrics(userId: number, role: "buyer" | "seller"): Promise<OfferMetrics> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const field = role === "buyer" ? offers.buyerId : offers.sellerId;
  const userOffers = await db
    .select()
    .from(offers)
    .where(eq(field, userId));

  const totalOffers = userOffers.length;
  const acceptedOffers = userOffers.filter((o: any) => o.status === "accepted").length;
  const rejectedOffers = userOffers.filter((o: any) => o.status === "rejected").length;
  const pendingOffers = userOffers.filter((o: any) => o.status === "pending").length;

  const acceptanceRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0;
  
  const averageOfferAmount = totalOffers > 0
    ? userOffers.reduce((sum: number, o: any) => sum + o.offerAmount, 0) / totalOffers
    : 0;

  // Calculate average negotiation cycle (number of counteroffers before acceptance)
  let totalNegotiationCycles = 0;
  let acceptedWithNegotiation = 0;

  for (const offer of userOffers.filter((o: any) => o.status === "accepted")) {
    const offerCounteroffers = await db
      .select()
      .from(counteroffers)
      .where(eq(counteroffers.offerId, offer.id));
    
    if (offerCounteroffers.length > 0) {
      totalNegotiationCycles += offerCounteroffers.length;
      acceptedWithNegotiation++;
    }
  }

  const averageNegotiationCycle = acceptedWithNegotiation > 0
    ? totalNegotiationCycles / acceptedWithNegotiation
    : 0;

  // Calculate average time to acceptance
  const acceptedOffersWithTime = userOffers.filter(
    o => o.status === "accepted" && o.acceptedAt
  );
  
  const totalDaysToAcceptance = acceptedOffersWithTime.reduce((sum, o) => {
    const created = new Date(o.createdAt).getTime();
    const accepted = new Date(o.acceptedAt!).getTime();
    return sum + (accepted - created) / (1000 * 60 * 60 * 24);
  }, 0);

  const averageTimeToAcceptance = acceptedOffersWithTime.length > 0
    ? totalDaysToAcceptance / acceptedOffersWithTime.length
    : 0;

  return {
    totalOffers,
    acceptedOffers,
    rejectedOffers,
    pendingOffers,
    acceptanceRate,
    averageOfferAmount,
    averageNegotiationCycle,
    averageTimeToAcceptance,
  };
}

/**
 * Get offer analytics for a specific property
 */
export async function getPropertyOfferAnalytics(propertyId: number): Promise<PropertyOfferAnalytics> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId));

  if (!property) {
    throw new Error("Property not found");
  }

  const propertyOffers = await db
    .select()
    .from(offers)
    .where(eq(offers.propertyId, propertyId));

  const offerCount = propertyOffers.length;
  
  if (offerCount === 0) {
    return {
      propertyId,
      listingPrice: property.price,
      offerCount: 0,
      highestOffer: 0,
      lowestOffer: 0,
      averageOffer: 0,
      offerToListRatio: 0,
      competitivenessScore: 0,
    };
  }

  const offerAmounts = propertyOffers.map(o => o.offerAmount);
  const highestOffer = Math.max(...offerAmounts);
  const lowestOffer = Math.min(...offerAmounts);
  const averageOffer = offerAmounts.reduce((sum, amt) => sum + amt, 0) / offerCount;
  const offerToListRatio = (averageOffer / property.price) * 100;

  // Calculate competitiveness score (1-100)
  // Factors: number of offers, offer-to-list ratio, time on market
  let competitivenessScore = 0;
  
  // Factor 1: Number of offers (max 40 points)
  competitivenessScore += Math.min(offerCount * 10, 40);
  
  // Factor 2: Offer-to-list ratio (max 40 points)
  if (offerToListRatio >= 100) {
    competitivenessScore += 40;
  } else if (offerToListRatio >= 95) {
    competitivenessScore += 30;
  } else if (offerToListRatio >= 90) {
    competitivenessScore += 20;
  } else if (offerToListRatio >= 85) {
    competitivenessScore += 10;
  }
  
  // Factor 3: Time on market (max 20 points)
  const daysOnMarket = (Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysOnMarket <= 7) {
    competitivenessScore += 20;
  } else if (daysOnMarket <= 14) {
    competitivenessScore += 15;
  } else if (daysOnMarket <= 30) {
    competitivenessScore += 10;
  } else if (daysOnMarket <= 60) {
    competitivenessScore += 5;
  }

  return {
    propertyId,
    listingPrice: property.price,
    offerCount,
    highestOffer,
    lowestOffer,
    averageOffer,
    offerToListRatio,
    competitivenessScore: Math.min(competitivenessScore, 100),
  };
}

/**
 * Get market trends over time
 */
export async function getMarketTrends(
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month" = "week"
): Promise<MarketTrends[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allOffers = await db
    .select()
    .from(offers)
    .where(
      and(
        gte(offers.createdAt, startDate),
        lte(offers.createdAt, endDate)
      )
    )
    .orderBy(offers.createdAt);

  // Group offers by period
  const groupedOffers = new Map<string, typeof allOffers>();

  for (const offer of allOffers) {
    const date = new Date(offer.createdAt);
    let periodKey: string;

    if (groupBy === "day") {
      periodKey = date.toISOString().split("T")[0];
    } else if (groupBy === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      periodKey = weekStart.toISOString().split("T")[0];
    } else {
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!groupedOffers.has(periodKey)) {
      groupedOffers.set(periodKey, []);
    }
    groupedOffers.get(periodKey)!.push(offer);
  }

  // Calculate metrics for each period
  const trends: MarketTrends[] = [];

  for (const [period, periodOffers] of groupedOffers.entries()) {
    const offerCount = periodOffers.length;
    const averageOfferAmount = periodOffers.reduce((sum: number, o: any) => sum + o.offerAmount, 0) / offerCount;
    const acceptedCount = periodOffers.filter((o: any) => o.status === "accepted").length;
    const acceptanceRate = (acceptedCount / offerCount) * 100;

    trends.push({
      period,
      averageOfferAmount,
      offerCount,
      acceptanceRate,
    });
  }

  return trends.sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Get comparative market analysis for a property
 */
export async function getComparativeMarketAnalysis(propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId));

  if (!property) {
    throw new Error("Property not found");
  }

  // Find similar properties (same city, similar price range, similar size)
  const priceRange = property.price * 0.15; // ±15%
  const sizeRange = (property.squareFeet ?? 0) * 0.15; // ±15%

  const similarProperties = await db
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.city, property.city),
        gte(properties.price, property.price - priceRange),
        lte(properties.price, property.price + priceRange),
        gte(properties.squareFeet, (property.squareFeet ?? 0) - sizeRange),
        lte(properties.squareFeet, (property.squareFeet ?? 0) + sizeRange)
      )
    )
    .limit(10);

  // Get offer analytics for similar properties
  const comparableAnalytics = await Promise.all(
    similarProperties.map(p => getPropertyOfferAnalytics(p.id))
  );

  const avgCompetitivenessScore = comparableAnalytics.reduce(
    (sum, a) => sum + a.competitivenessScore, 0
  ) / comparableAnalytics.length;

  const avgOfferToListRatio = comparableAnalytics.reduce(
    (sum, a) => sum + a.offerToListRatio, 0
  ) / comparableAnalytics.length;

  const avgOfferCount = comparableAnalytics.reduce(
    (sum, a) => sum + a.offerCount, 0
  ) / comparableAnalytics.length;

  return {
    property,
    similarPropertyCount: similarProperties.length,
    averageCompetitivenessScore: avgCompetitivenessScore,
    averageOfferToListRatio: avgOfferToListRatio,
    averageOfferCount: avgOfferCount,
    comparableProperties: comparableAnalytics,
  };
}

/**
 * Get offer success predictions based on historical data
 */
export async function getOfferSuccessPrediction(
  propertyId: number,
  offerAmount: number
): Promise<{
  successProbability: number;
  recommendation: string;
  insights: string[];
}> {
  const analytics = await getPropertyOfferAnalytics(propertyId);
  const cma = await getComparativeMarketAnalysis(propertyId);

  const offerToListRatio = (offerAmount / analytics.listingPrice) * 100;
  
  let successProbability = 50; // Base probability
  const insights: string[] = [];

  // Adjust based on offer-to-list ratio
  if (offerToListRatio >= 100) {
    successProbability += 40;
    insights.push("Your offer is at or above asking price, which significantly increases acceptance probability");
  } else if (offerToListRatio >= 95) {
    successProbability += 30;
    insights.push("Your offer is close to asking price and has a strong chance of acceptance");
  } else if (offerToListRatio >= 90) {
    successProbability += 15;
    insights.push("Your offer is competitive but may face negotiation");
  } else if (offerToListRatio >= 85) {
    successProbability += 5;
    insights.push("Your offer is below market expectations and may require negotiation");
  } else {
    successProbability -= 10;
    insights.push("Your offer is significantly below asking price and has lower acceptance probability");
  }

  // Adjust based on property competitiveness
  if (analytics.competitivenessScore >= 80) {
    successProbability -= 15;
    insights.push("This is a highly competitive property with multiple offers");
  } else if (analytics.competitivenessScore >= 60) {
    successProbability -= 5;
    insights.push("This property has moderate competition");
  } else {
    successProbability += 10;
    insights.push("This property has limited competition, giving you negotiating power");
  }

  // Adjust based on market comparison
  if (offerToListRatio > cma.averageOfferToListRatio) {
    successProbability += 10;
    insights.push(`Your offer is above the market average of ${cma.averageOfferToListRatio.toFixed(1)}%`);
  } else {
    successProbability -= 5;
    insights.push(`Your offer is below the market average of ${cma.averageOfferToListRatio.toFixed(1)}%`);
  }

  // Clamp probability between 0 and 100
  successProbability = Math.max(0, Math.min(100, successProbability));

  let recommendation: string;
  if (successProbability >= 75) {
    recommendation = "Strong offer - high probability of acceptance";
  } else if (successProbability >= 50) {
    recommendation = "Competitive offer - expect possible negotiation";
  } else if (successProbability >= 25) {
    recommendation = "Weak offer - consider increasing amount";
  } else {
    recommendation = "Low probability - significant increase recommended";
  }

  return {
    successProbability,
    recommendation,
    insights,
  };
}
