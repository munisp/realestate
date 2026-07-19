/**
 * Automated Pricing Engine Background Job
 * 
 * Runs daily to automatically calculate and update property prices
 * based on pricing rules, demand, seasonality, and market conditions.
 */

import { getDb } from "../db";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  pricingRules,
  specialEventPricing,
  customDatePricing,
  shortLetProperties,
  availabilityCalendar,
} from "../../drizzle/schema";
import { SmartPricingService } from "../services/smartPricingService";

interface PriceUpdate {
  propertyId: number;
  date: Date;
  calculatedPrice: number;
  factors: string[];
}

export class AutoPricingEngine {
  /**
   * Calculate occupancy rate for a property in the last 30 days
   */
  private static async calculateOccupancyRate(
    propertyId: number,
    db: any
  ): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // TODO: Implement occupancy calculation when bookings table is available
    // For now, return a default occupancy rate of 50%
    return 0.5;
  }

  /**
   * Calculate prices for the next 90 days for a property
   */
  private static async calculatePropertyPrices(
    propertyId: number,
    db: any
  ): Promise<PriceUpdate[]> {
    // Get pricing rule
    const rules = await db
      .select()
      .from(pricingRules)
      .where(eq(pricingRules.propertyId, propertyId))
      .limit(1);

    if (!rules.length) {
      console.log(`[AutoPricing] No pricing rules for property ${propertyId}`);
      return [];
    }

    const rule = rules[0];

    // Skip if strategy is fixed
    if (rule.strategy === "fixed") {
      console.log(
        `[AutoPricing] Property ${propertyId} uses fixed pricing, skipping`
      );
      return [];
    }

    // Calculate occupancy rate
    const occupancyRate = await this.calculateOccupancyRate(propertyId, db);

    // Get special events for the next 90 days
    const today = new Date();
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(today.getDate() + 90);

    const events = await db
      .select()
      .from(specialEventPricing)
      .where(
        and(
          eq(specialEventPricing.propertyId, propertyId),
          gte(specialEventPricing.endDate, today),
          lte(specialEventPricing.startDate, ninetyDaysLater)
        )
      );

    // Get custom pricing
    const customPrices = await db
      .select()
      .from(customDatePricing)
      .where(
        and(
          eq(customDatePricing.propertyId, propertyId),
          gte(customDatePricing.date, today),
          lte(customDatePricing.date, ninetyDaysLater)
        )
      );

    // Calculate price for each day
    const priceUpdates: PriceUpdate[] = [];

    for (let i = 0; i < 90; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(currentDate.getDate() + i);

      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      try {
        const result = SmartPricingService.calculatePrice({
          pricingRule: rule,
          checkInDate: currentDate,
          checkOutDate: nextDate,
          specialEvents: events,
          customPricing: customPrices,
          currentOccupancyRate: occupancyRate,
        });

        if (result.breakdown.length > 0) {
          priceUpdates.push({
            propertyId,
            date: currentDate,
            calculatedPrice: result.breakdown[0].adjustedPrice,
            factors: result.breakdown[0].factors,
          });
        }
      } catch (error) {
        console.error(
          `[AutoPricing] Error calculating price for ${propertyId} on ${currentDate}:`,
          error
        );
      }
    }

    return priceUpdates;
  }

  /**
   * Update availability calendar with calculated prices
   */
  private static async updateAvailabilityCalendar(
    priceUpdates: PriceUpdate[],
    db: any
  ): Promise<void> {
    for (const update of priceUpdates) {
      try {
        // Check if entry exists
        const existing = await db
          .select()
          .from(availabilityCalendar)
          .where(
            and(
              eq(availabilityCalendar.propertyId, update.propertyId),
              eq(availabilityCalendar.date, update.date)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing entry
          await db
            .update(availabilityCalendar)
            .set({
              price: update.calculatedPrice.toString(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(availabilityCalendar.propertyId, update.propertyId),
                eq(availabilityCalendar.date, update.date)
              )
            );
        } else {
          // Insert new entry
          await db.insert(availabilityCalendar).values({
            propertyId: update.propertyId,
            date: update.date,
            isAvailable: true,
            price: update.calculatedPrice.toString(),
            minimumStay: 1,
          });
        }
      } catch (error) {
        console.error(
          `[AutoPricing] Error updating calendar for property ${update.propertyId}:`,
          error
        );
      }
    }
  }

  /**
   * Main job execution - process all properties with dynamic pricing
   */
  static async run(): Promise<void> {
    console.log("[AutoPricing] Starting automated pricing engine...");

    const db = await getDb();
    if (!db) {
      console.error("[AutoPricing] Database not available");
      return;
    }

    try {
      // Get all properties with dynamic pricing rules
      const dynamicRules = await db
        .select({
          propertyId: pricingRules.propertyId,
        })
        .from(pricingRules)
        .where(eq(pricingRules.strategy, "dynamic"));

      console.log(
        `[AutoPricing] Found ${dynamicRules.length} properties with dynamic pricing`
      );

      let totalUpdates = 0;

      for (const rule of dynamicRules) {
        console.log(
          `[AutoPricing] Processing property ${rule.propertyId}...`
        );

        const priceUpdates = await this.calculatePropertyPrices(
          rule.propertyId,
          db
        );

        if (priceUpdates.length > 0) {
          await this.updateAvailabilityCalendar(priceUpdates, db);
          totalUpdates += priceUpdates.length;
          console.log(
            `[AutoPricing] Updated ${priceUpdates.length} prices for property ${rule.propertyId}`
          );
        }
      }

      console.log(
        `[AutoPricing] Completed! Updated ${totalUpdates} price entries across ${dynamicRules.length} properties`
      );
    } catch (error) {
      console.error("[AutoPricing] Job failed:", error);
      throw error;
    }
  }

  /**
   * Run pricing engine for a specific property (on-demand)
   */
  static async runForProperty(propertyId: number): Promise<number> {
    console.log(
      `[AutoPricing] Running on-demand pricing for property ${propertyId}...`
    );

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const priceUpdates = await this.calculatePropertyPrices(propertyId, db);

    if (priceUpdates.length > 0) {
      await this.updateAvailabilityCalendar(priceUpdates, db);
      console.log(
        `[AutoPricing] Updated ${priceUpdates.length} prices for property ${propertyId}`
      );
    }

    return priceUpdates.length;
  }
}

// Run immediately if executed directly (commented out for ES modules)
// if (import.meta.url === `file://${process.argv[1]}`) {
//   AutoPricingEngine.run()
//     .then(() => {
//       console.log("[AutoPricing] Job completed successfully");
//       process.exit(0);
//     })
//     .catch((error) => {
//       console.error("[AutoPricing] Job failed:", error);
//       process.exit(1);
//     });
// }
