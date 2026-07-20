import { getDb } from "../db";
import { 
  gnnAlertSubscriptions, 
  gnnAlertTriggers, 
  gnnAlertEvaluationLog,
  gnnAlertPerformanceMetrics,
} from "../../drizzle/schema";
import type {
  InsertGnnAlertSubscription,
  InsertGnnAlertTrigger,
  InsertGnnAlertEvaluationLog,
  GnnAlertSubscription,
  GnnAlertTrigger
} from "../../drizzle/schema-gnn-alerts";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { getInvestmentScore, getMarketTrends, getNeighborhoodIntel } from "./gnnService";
import { sendGNNAlertEmail, sendGNNAlertSMS } from "./gnnAlertEmailService";
import { logger } from "../_core/logger";

export interface AlertCriteria {
  cities?: string[];
  neighborhoods?: string[];
  propertyTypes?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minInvestmentScore?: number;
  minUndervaluedPercent?: number;
  minTrendStrength?: number;
  minGrowthPotential?: number;
}

export interface GnnAlertMatch {
  propertyId: number;
  alertType: string;
  investmentScore?: number;
  undervaluedPercent?: number;
  trendStrength?: number;
  growthPotential?: number;
  confidence: number;
  title: string;
  message: string;
  reasoning: any;
}

/**
 * GNN Alert Service
 * Manages GNN-powered property alerts and notifications
 */
export class GnnAlertService {
  /**
   * Create a new alert subscription
   */
  async createSubscription(userId: number, data: Omit<InsertGnnAlertSubscription, 'userId'>): Promise<number> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const result = await db.insert(gnnAlertSubscriptions).values({
      userId,
      ...(data as any),
      isActive: 1,
    }).returning({ id: gnnAlertSubscriptions.id });

    return result[0].id;
  }

  /**
   * Get user's alert subscriptions
   */
  async getUserSubscriptions(userId: number): Promise<GnnAlertSubscription[]> {
    const db = await getDb();
    if (!db) {
      return [];
    }

    return await db.select()
      .from(gnnAlertSubscriptions)
      .where(eq(gnnAlertSubscriptions.userId, userId))
      .orderBy(sql`${gnnAlertSubscriptions.createdAt} DESC`) as any as GnnAlertSubscription[];
  }

  /**
   * Update alert subscription
   */
  async updateSubscription(subscriptionId: number, userId: number, data: Partial<InsertGnnAlertSubscription>): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    await db.update(gnnAlertSubscriptions)
      .set({
        ...(data as any),
        updatedAt: new Date(),
      })
      .where(and(
        eq(gnnAlertSubscriptions.id, subscriptionId),
        eq(gnnAlertSubscriptions.userId, userId)
      ));
  }

  /**
   * Delete alert subscription
   */
  async deleteSubscription(subscriptionId: number, userId: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    await db.delete(gnnAlertSubscriptions)
      .where(and(
        eq(gnnAlertSubscriptions.id, subscriptionId),
        eq(gnnAlertSubscriptions.userId, userId)
      ));
  }

  /**
   * Toggle subscription active status
   */
  async toggleSubscription(subscriptionId: number, userId: number, isActive: boolean): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    await db.update(gnnAlertSubscriptions)
      .set({
        isActive: isActive ? 1 : 0,
        updatedAt: new Date(),
      })
      .where(and(
        eq(gnnAlertSubscriptions.id, subscriptionId),
        eq(gnnAlertSubscriptions.userId, userId)
      ));
  }

  /**
   * Get user's alert triggers (notifications received)
   */
  async getUserAlertTriggers(userId: number, limit: number = 50): Promise<GnnAlertTrigger[]> {
    const db = await getDb();
    if (!db) {
      return [];
    }

    // Get user's subscriptions first
    const subscriptions = await db.select({ id: gnnAlertSubscriptions.id })
      .from(gnnAlertSubscriptions)
      .where(eq(gnnAlertSubscriptions.userId, userId));

    if (subscriptions.length === 0) {
      return [];
    }

    const subscriptionIds = subscriptions.map(s => s.id);

    return await db.select()
      .from(gnnAlertTriggers)
      .where(inArray(gnnAlertTriggers.subscriptionId, subscriptionIds))
      .orderBy(sql`${gnnAlertTriggers.createdAt} DESC`)
      .limit(limit) as any as GnnAlertTrigger[];
  }

  /**
   * Mark alert as viewed
   */
  async markAlertViewed(triggerId: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      return;
    }

    await db.update(gnnAlertTriggers)
      .set({
        userViewed: 1,
        viewedAt: new Date(),
      })
      .where(eq(gnnAlertTriggers.id, triggerId));
  }

  /**
   * Mark alert as dismissed
   */
  async markAlertDismissed(triggerId: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      return;
    }

    await db.update(gnnAlertTriggers)
      .set({
        userDismissed: 1,
        dismissedAt: new Date(),
      })
      .where(eq(gnnAlertTriggers.id, triggerId));
  }

  /**
   * Track user action on alert
   */
  async trackAlertAction(triggerId: number, action: 'saved' | 'viewed_property' | 'contacted_agent'): Promise<void> {
    const db = await getDb();
    if (!db) {
      return;
    }

    const updateData: any = {};
    if (action === 'saved') {
      updateData.userSavedProperty = 1;
    } else if (action === 'viewed_property') {
      updateData.userViewedProperty = 1;
    } else if (action === 'contacted_agent') {
      updateData.userContactedAgent = 1;
    }

    await db.update(gnnAlertTriggers)
      .set(updateData)
      .where(eq(gnnAlertTriggers.id, triggerId));
  }

  /**
   * Evaluate properties against alert criteria
   * This is the core GNN alert matching logic
   */
  async evaluatePropertyForAlerts(propertyId: number): Promise<GnnAlertMatch[]> {
    const matches: GnnAlertMatch[] = [];

    try {
      // Get GNN insights for this property
      const [investmentScore, marketTrends, neighborhoodIntel] = await Promise.all([
        getInvestmentScore(propertyId),
        getMarketTrends(String(propertyId), "Lagos"), // TODO: Get actual city from property
        getNeighborhoodIntel("Lagos, Nigeria", "Lagos"), // TODO: Get actual neighborhood
      ]);

            // Check for undervalued property (use appreciationPotential as proxy)
      const appreciationPct = investmentScore.appreciationPotential ?? 0;
      if (appreciationPct >= 10) {
        matches.push({
          propertyId,
          alertType: 'undervalued',
          investmentScore: investmentScore.investmentScore,
          undervaluedPercent: appreciationPct,
          confidence: 0.75,
          title: `🎯 Undervalued Property Alert`,
          message: `Property has ${appreciationPct.toFixed(1)}% appreciation potential`,
          reasoning: {
            strengths: investmentScore.strengths,
            risks: investmentScore.risks,
            recommendation: investmentScore.recommendation,
          },
        });
      }
      // Check for strong investment opportunity
      if (investmentScore.investmentScore >= 70) {
        matches.push({
          propertyId,
          alertType: 'investment_opportunity',
          investmentScore: investmentScore.investmentScore,
          confidence: 0.8,
          title: `💎 High Investment Score`,
          message: `Investment score: ${investmentScore.investmentScore}/100 - Strong opportunity`,
          reasoning: {
            strengths: investmentScore.strengths,
            roiEstimate: investmentScore.roiEstimate,
            rentalYield: investmentScore.rentalYield,
          },
        });
      }

      // Check for positive market trend (use percentageChange from MarketTrendData)
      const pctChange = marketTrends.percentageChange ?? 0;
      if (marketTrends.trendDirection === 'up' && Math.abs(pctChange) >= 0.5) {
        matches.push({
          propertyId,
          alertType: 'market_trend',
          trendStrength: pctChange,
          confidence: marketTrends.confidence,
          title: `📈 Strong Market Trend`,
          message: `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}% predicted growth`,
          reasoning: {
            trendDirection: marketTrends.trendDirection,
            predictedPrice12Months: marketTrends.predictedPrice12Months,
            factors: marketTrends.factors,
          },
        });
      }

      // Check for high growth potential
      const intelExt = neighborhoodIntel as any;
      const growthPotential = intelExt.growthPotential as number | undefined;
      const amenityDensity = intelExt.amenityDensity as number | undefined;
      if (growthPotential && growthPotential >= 70) {
        matches.push({
          propertyId,
          alertType: 'growth_potential',
          growthPotential,
          confidence: 0.8, // Default confidence for neighborhood intel
          title: `🚀 High Growth Potential`,
          message: `Neighborhood growth potential: ${growthPotential}/100`,
          reasoning: {
            walkabilityScore: neighborhoodIntel.walkabilityScore,
            transitScore: neighborhoodIntel.transitScore,
            amenityDensity,
          },
        });
      }

    } catch (error) {
      logger.error('[GnnAlertService] Error evaluating property:', { error: String(error) });
    }

    return matches;
  }

  /**
   * Check all active subscriptions and trigger alerts
   * This is called by the scheduled job
   */
  async evaluateAllSubscriptions(): Promise<{ triggersCreated: number; notificationsSent: number }> {
    const startTime = Date.now();
    const db = await getDb();
    
    if (!db) {
      logger.info('[GnnAlertService] Database not available, skipping evaluation');
      return { triggersCreated: 0, notificationsSent: 0 };
    }

    try {
      // Get all active subscriptions
      const activeSubscriptions = await db.select()
        .from(gnnAlertSubscriptions)
        .where(eq(gnnAlertSubscriptions.isActive, 1) as any);

      logger.info(`[GnnAlertService] Evaluating ${activeSubscriptions.length} active subscriptions`);

      let triggersCreated = 0;
      let notificationsSent = 0;

      // Evaluate each subscription
      for (const subscription of activeSubscriptions) {
        try {
          // Build criteria from subscription columns
          const criteria: AlertCriteria = {
            cities: subscription.cities ? JSON.parse(subscription.cities) : undefined,
            neighborhoods: subscription.neighborhoods ? JSON.parse(subscription.neighborhoods) : undefined,
            propertyTypes: subscription.propertyTypes ? JSON.parse(subscription.propertyTypes) : undefined,
            minPrice: subscription.minPrice ?? undefined,
            maxPrice: subscription.maxPrice ?? undefined,
            minBedrooms: subscription.minBedrooms ?? undefined,
            maxBedrooms: subscription.maxBedrooms ?? undefined,
            minInvestmentScore: subscription.minInvestmentScore ?? undefined,
            minUndervaluedPercent: subscription.minUndervaluedPercent ?? undefined,
            minTrendStrength: subscription.minTrendStrength ?? undefined,
            minGrowthPotential: subscription.minGrowthPotential ?? undefined,
          };

          // For demonstration, evaluate a mock property
          // In production, query properties table matching criteria
          const mockPropertyId = 1;
          const matches = await this.evaluatePropertyForAlerts(mockPropertyId);

          // Check if any matches meet the subscription criteria
          for (const match of matches) {
            const shouldTrigger = this.shouldTriggerAlert(match, criteria, subscription);

            if (shouldTrigger) {
              // Create trigger record
              const [trigger] = await db.insert(gnnAlertTriggers).values({
                subscriptionId: subscription.id,
                propertyId: match.propertyId,
                alertType: match.alertType,
                alertTitle: match.title,
                alertMessage: match.message,
                investmentScore: match.investmentScore ? Math.round(match.investmentScore) : null,
                undervaluedPercent: match.undervaluedPercent ?? null,
                trendStrength: match.trendStrength ?? null,
                growthPotential: match.growthPotential ?? null,
                confidence: match.confidence,
                title: match.title,
                message: match.message,
                reasoning: JSON.stringify(match.reasoning),
                notificationsSent: null,
              } as any).returning();

              triggersCreated++;

              // Send notifications
              if (trigger) {
                const sent = await this.sendAlertNotifications(subscription, match, trigger.id);
                if (sent) {
                  notificationsSent++;
                }
              }
            }
          }
        } catch (error) {
          logger.error(`[GnnAlertService] Error evaluating subscription ${subscription.id}:`, { error: String(error) });
        }
      }
      
      // Log evaluation
      await db.insert(gnnAlertEvaluationLog).values({
        evaluationType: 'scheduled',
        propertiesEvaluated: 0, // TODO: Actual count
        alertsTriggered: triggersCreated,
        subscriptionsChecked: activeSubscriptions.length,
        notificationsSent,
        executionTimeMs: Date.now() - startTime,
        errorCount: 0,
      });

      return { triggersCreated, notificationsSent };

    } catch (error) {
      logger.error('[GnnAlertService] Error evaluating subscriptions:', { error: String(error) });
      
      // Log error
      await db.insert(gnnAlertEvaluationLog).values({
        evaluationType: 'scheduled',
        propertiesEvaluated: 0,
        alertsTriggered: 0,
        subscriptionsChecked: 0,
        notificationsSent: 0,
        executionTimeMs: Date.now() - startTime,
        errorCount: 1,
        errorDetails: JSON.stringify({ message: (error as Error).message }),
      });

      throw error;
    }
  }

  /**
   * Get alert performance metrics
   */
  async getPerformanceMetrics(alertType?: string): Promise<any> {
    const db = await getDb();
    if (!db) {
      return null;
    }

    const query = db.select().from(gnnAlertPerformanceMetrics);
    
    if (alertType) {
      return await query.where(eq(gnnAlertPerformanceMetrics.alertType, alertType)).limit(1);
    }

    return await query;
  }

  /**
   * Check if alert should be triggered based on criteria
   */
  private shouldTriggerAlert(match: GnnAlertMatch, criteria: AlertCriteria, subscription: any): boolean {
    // Check investment score threshold
    if (criteria.minInvestmentScore && match.investmentScore) {
      if (match.investmentScore < criteria.minInvestmentScore) {
        return false;
      }
    }

    // Check undervalued percentage threshold
    if (criteria.minUndervaluedPercent && match.undervaluedPercent) {
      if (match.undervaluedPercent < criteria.minUndervaluedPercent) {
        return false;
      }
    }

    // Check trend strength threshold
    if (criteria.minTrendStrength && match.trendStrength) {
      if (Math.abs(match.trendStrength) < criteria.minTrendStrength) {
        return false;
      }
    }

    // Check growth potential threshold
    if (criteria.minGrowthPotential && match.growthPotential) {
      if (match.growthPotential < criteria.minGrowthPotential) {
        return false;
      }
    }

    // Check if we've sent an alert recently (avoid spam)
    if (subscription.lastNotifiedAt) {
      const hoursSinceLastAlert = (Date.now() - new Date(subscription.lastNotifiedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAlert < 1) { // Don't send more than once per hour
        return false;
      }
    }

    return true;
  }

  /**
   * Send alert notifications via email and SMS
   */
  private async sendAlertNotifications(
    subscription: any,
    match: GnnAlertMatch,
    triggerId: number
  ): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      // Get user details
      const { users } = await import("../../drizzle/schema");
      const [user] = await db.select().from(users).where(eq(users.id, subscription.userId)).limit(1);

      if (!user || !user.email) {
        console.log('[GNN Alert] User not found or no email:', subscription.userId);
        return false;
      }

      // Prepare notification data
      const propertyMatch = {
        propertyId: match.propertyId,
        address: 'Sample Property Address', // TODO: Get from property
        city: 'Lagos',
        price: 50000000,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1500,
        primaryImage: undefined,
        investmentScore: match.investmentScore,
        undervaluedPercentage: match.undervaluedPercent,
        trendStrength: match.trendStrength,
        reason: match.message,
      };

      const emailData = {
        userName: user.name || 'User',
        alertName: `${subscription.alertType} alert`,
        matchCount: 1,
        properties: [propertyMatch],
        alertUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/gnn-alerts`,
      };

      // Send email notification
      const emailResult = await sendGNNAlertEmail(user.email, emailData);

      // SMS notifications can be added when phone numbers are collected
      // For now, we only send email notifications

      // Update trigger with notification status
      await db.update(gnnAlertTriggers)
        .set({
          notificationsSent: emailResult.success
            ? JSON.stringify([{ channel: 'email', status: 'sent', sentAt: new Date().toISOString() }])
            : JSON.stringify([{ channel: 'email', status: 'failed', sentAt: new Date().toISOString() }]),
        })
        .where(eq(gnnAlertTriggers.id, triggerId));

      // Update subscription last notified timestamp
      if (emailResult.success) {
        await db.update(gnnAlertSubscriptions)
          .set({ lastNotifiedAt: new Date() })
          .where(eq(gnnAlertSubscriptions.id, subscription.id));
      }

      console.log('[GNN Alert] Notifications sent:', {
        email: emailResult.success,
        user: user.email,
      });

      return emailResult.success;
    } catch (error) {
      logger.error('[GNN Alert] Error sending notifications:', { error: String(error) });
      return false;
    }
  }
}

export const gnnAlertService = new GnnAlertService();
