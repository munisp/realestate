// @ts-nocheck
/**
 * Competitor Price Refresh Scheduler
 * 
 * Automatically refreshes competitor pricing data on a schedule
 * Runs daily price updates and weekly market analysis
 */

import cron from 'node-cron';
import { competitorDataService } from './competitorDataService';
import { getDb } from '../db';
import { shortLetProperties, marketPricingRecommendations } from '../../drizzle/schema';
import { eq, and, gte } from 'drizzle-orm';
import { logger } from "../_core/logger";

interface SchedulerStatus {
  dailyRefresh: {
    enabled: boolean;
    schedule: string;
    lastRun: Date | null;
    nextRun: Date | null;
    status: 'idle' | 'running' | 'error';
  };
  weeklyAnalysis: {
    enabled: boolean;
    schedule: string;
    lastRun: Date | null;
    nextRun: Date | null;
    status: 'idle' | 'running' | 'error';
  };
}

export class CompetitorRefreshScheduler {
  private dailyTask: any | null = null;
  private weeklyTask: any | null = null;
  private status: SchedulerStatus;

  constructor() {
    this.status = {
      dailyRefresh: {
        enabled: false,
        schedule: '0 3 * * *', // 3 AM daily
        lastRun: null,
        nextRun: null,
        status: 'idle',
      },
      weeklyAnalysis: {
        enabled: false,
        schedule: '0 4 * * 0', // 4 AM every Sunday
        lastRun: null,
        nextRun: null,
        status: 'idle',
      },
    };
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    this.startDailyRefresh();
    this.startWeeklyAnalysis();
    logger.info('[CompetitorRefreshScheduler] All tasks started');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    if (this.dailyTask) {
      this.dailyTask.stop();
      this.status.dailyRefresh.enabled = false;
    }
    if (this.weeklyTask) {
      this.weeklyTask.stop();
      this.status.weeklyAnalysis.enabled = false;
    }
    logger.info('[CompetitorRefreshScheduler] All tasks stopped');
  }

  /**
   * Start daily competitor price refresh
   */
  private startDailyRefresh() {
    if (this.dailyTask) {
      this.dailyTask.stop();
    }

    this.dailyTask = cron.schedule(this.status.dailyRefresh.schedule, async () => {
      logger.info('[CompetitorRefreshScheduler] Starting daily price refresh...');
      this.status.dailyRefresh.status = 'running';
      this.status.dailyRefresh.lastRun = new Date();

      try {
        await this.refreshAllPropertyPricing();
        this.status.dailyRefresh.status = 'idle';
        logger.info('[CompetitorRefreshScheduler] Daily price refresh completed');
      } catch (error) {
        logger.error('[CompetitorRefreshScheduler] Daily refresh error:', { error: String(error) });
        this.status.dailyRefresh.status = 'error';
      }
    });

    this.status.dailyRefresh.enabled = true;
    this.status.dailyRefresh.nextRun = this.getNextRunTime(this.status.dailyRefresh.schedule);
    console.log('[CompetitorRefreshScheduler] Daily refresh scheduled for', this.status.dailyRefresh.schedule);
  }

  /**
   * Start weekly market analysis
   */
  private startWeeklyAnalysis() {
    if (this.weeklyTask) {
      this.weeklyTask.stop();
    }

    this.weeklyTask = cron.schedule(this.status.weeklyAnalysis.schedule, async () => {
      logger.info('[CompetitorRefreshScheduler] Starting weekly market analysis...');
      this.status.weeklyAnalysis.status = 'running';
      this.status.weeklyAnalysis.lastRun = new Date();

      try {
        await this.performWeeklyAnalysis();
        this.status.weeklyAnalysis.status = 'idle';
        logger.info('[CompetitorRefreshScheduler] Weekly analysis completed');
      } catch (error) {
        logger.error('[CompetitorRefreshScheduler] Weekly analysis error:', { error: String(error) });
        this.status.weeklyAnalysis.status = 'error';
      }
    });

    this.status.weeklyAnalysis.enabled = true;
    this.status.weeklyAnalysis.nextRun = this.getNextRunTime(this.status.weeklyAnalysis.schedule);
    console.log('[CompetitorRefreshScheduler] Weekly analysis scheduled for', this.status.weeklyAnalysis.schedule);
  }

  /**
   * Refresh pricing recommendations for all active properties
   */
  async refreshAllPropertyPricing(): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    let processed = 0;
    let updated = 0;
    let errors = 0;

    try {
      // Get all active shortlet properties
      const properties = await db
        .select()
        .from(shortLetProperties)
        .where(eq(shortLetProperties.status, 'active'));

      logger.info(`[CompetitorRefreshScheduler] Processing ${properties.length} properties...`);

      for (const property of properties) {
        processed++;
        
        try {
          // Get pricing recommendation from competitor data
          const recommendation = await competitorDataService.getPricingRecommendation({
            city: property.city || 'Lagos',
            bedrooms: property.bedrooms || 2,
            bathrooms: property.bathrooms || 1,
            guests: property.maxGuests || 4,
            currentPrice: property.nightlyRate || undefined,
          });

          // Calculate competitor average price
          const marketAnalysis = await competitorDataService.getMarketAnalysis({
            city: property.city || 'Lagos',
            bedrooms: property.bedrooms || 2,
            bathrooms: property.bathrooms || 1,
            guests: property.maxGuests || 4,
          });

          // Save recommendation to database
          await db.insert(marketPricingRecommendations).values({
            propertyId: property.id,
            recommendedBasePrice: Math.round(String(recommendation.recommendedPrice)),
            confidence: String(String(recommendation.confidence)),
            competitorAvgPrice: marketAnalysis.averagePrice,
            marketDemandScore: String(marketAnalysis.demandScore ?? 0),
            seasonalityFactor: String(marketAnalysis.seasonalityFactor ?? 1),
            reasoning: recommendation.reasoning.join('; '),
            createdAt: new Date(),
          });

          updated++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          logger.error(`[CompetitorRefreshScheduler] Error processing property ${property.id}:`, { error: String(error) });
          errors++;
        }
      }

      logger.info(`[CompetitorRefreshScheduler] Refresh complete: ${updated}/${processed} updated, ${errors} errors`);
    } catch (error) {
      logger.error('[CompetitorRefreshScheduler] Fatal error during refresh:', { error: String(error) });
      throw error;
    }

    return { processed, updated, errors };
  }

  /**
   * Perform comprehensive weekly market analysis
   */
  async performWeeklyAnalysis(): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    try {
      // Get unique cities from active properties
      const properties = await db
        .select()
        .from(shortLetProperties)
        .where(eq(shortLetProperties.status, 'active'));

      const cities = [...new Set(properties.map(p => (p as any).city || 'Lagos'))];
      
      logger.info(`[CompetitorRefreshScheduler] Analyzing ${cities.length} cities...`);

      for (const city of cities) {
        // Get market analysis for different property types
        const bedroomCounts = [1, 2, 3, 4];
        
        for (const bedrooms of bedroomCounts) {
          try {
            const analysis = await competitorDataService.getMarketAnalysis({
              city,
              bedrooms,
              bathrooms: Math.ceil(bedrooms / 2),
              guests: bedrooms * 2,
            });

            console.log(`[CompetitorRefreshScheduler] ${city} - ${bedrooms}BR:`, {
              avgPrice: analysis.averagePrice,
              demand: analysis.demandScore,
              listings: analysis.totalListings,
            });

            // Could store this in a market_trends table for historical tracking
            // await db.insert(marketTrends).values({ ... });
            
          } catch (error) {
            logger.error(`[CompetitorRefreshScheduler] Error analyzing ${city} ${bedrooms}BR:`, { error: String(error) });
          }
        }
      }

      logger.info('[CompetitorRefreshScheduler] Weekly analysis complete');
    } catch (error) {
      logger.error('[CompetitorRefreshScheduler] Fatal error during weekly analysis:', { error: String(error) });
      throw error;
    }
  }

  /**
   * Manually trigger a refresh (for testing or admin use)
   */
  async triggerManualRefresh(): Promise<{
    success: boolean;
    result?: { processed: number; updated: number; errors: number };
    error?: string;
  }> {
    try {
      logger.info('[CompetitorRefreshScheduler] Manual refresh triggered');
      const result = await this.refreshAllPropertyPricing();
      return { success: true, result };
    } catch (error: any) {
      logger.error('[CompetitorRefreshScheduler] Manual refresh failed:', { error: String(error) });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current scheduler status
   */
  getStatus(): SchedulerStatus {
    return {
      ...this.status,
      dailyRefresh: {
        ...this.status.dailyRefresh,
        nextRun: this.getNextRunTime(this.status.dailyRefresh.schedule),
      },
      weeklyAnalysis: {
        ...this.status.weeklyAnalysis,
        nextRun: this.getNextRunTime(this.status.weeklyAnalysis.schedule),
      },
    };
  }

  /**
   * Calculate next run time for a cron schedule
   */
  private getNextRunTime(schedule: string): Date | null {
    try {
      // Simple approximation - for 3 AM daily
      if (schedule === '0 3 * * *') {
        const next = new Date();
        next.setHours(3, 0, 0, 0);
        if (next <= new Date()) {
          next.setDate(next.getDate() + 1);
        }
        return next;
      }
      
      // For 4 AM Sunday
      if (schedule === '0 4 * * 0') {
        const next = new Date();
        next.setHours(4, 0, 0, 0);
        const daysUntilSunday = (7 - next.getDay()) % 7;
        next.setDate(next.getDate() + (daysUntilSunday || 7));
        return next;
      }
      
      return null;
    } catch {
      return null;
    }
  }
}

// Singleton instance
export const competitorRefreshScheduler = new CompetitorRefreshScheduler();

// Auto-start on module load
competitorRefreshScheduler.start();
logger.info('[CompetitorRefreshScheduler] Initialized and started');
