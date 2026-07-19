/**
 * Automated Pricing Scheduler
 * 
 * Runs the automated pricing engine daily at 2 AM to update property prices
 * for the next 90 days based on pricing rules and market conditions.
 */

import cron from "node-cron";
import { AutoPricingEngine } from "../jobs/autoPricingEngine";

export function startAutoPricingScheduler() {
  // Run daily at 2:00 AM
  const schedule = "0 2 * * *";

  console.log(
    `[AutoPricingScheduler] Scheduling automated pricing engine to run daily at 2:00 AM`
  );

  cron.schedule(schedule, async () => {
    console.log(
      `[AutoPricingScheduler] Starting scheduled pricing update at ${new Date().toISOString()}`
    );

    try {
      await AutoPricingEngine.run();
      console.log(
        `[AutoPricingScheduler] Completed successfully at ${new Date().toISOString()}`
      );
    } catch (error) {
      console.error(
        `[AutoPricingScheduler] Failed at ${new Date().toISOString()}:`,
        error
      );
    }
  });

  console.log("[AutoPricingScheduler] Scheduler started successfully");
}
