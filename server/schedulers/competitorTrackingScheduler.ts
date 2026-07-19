// @ts-nocheck
import { CronJob } from "cron";
import { runDailyPriceCheck } from "../jobs/dailyPriceCheck";
import { runWeeklySummary } from "../jobs/weeklySummary";

/**
 * Competitor Tracking Scheduler
 * 
 * Manages automated jobs for competitor tracking system:
 * - Daily price checks at 6:00 AM
 * - Weekly summaries on Mondays at 9:00 AM
 */

let dailyPriceCheckJob: CronJob | null = null;
let weeklySummaryJob: CronJob | null = null;

export function startCompetitorTrackingScheduler() {
  console.log("[CompetitorTrackingScheduler] Starting scheduler...");

  // Daily Price Check - runs every day at 6:00 AM
  dailyPriceCheckJob = new CronJob(
    "0 6 * * *", // cron expression: minute hour day month dayOfWeek
    async () => {
      console.log("[CompetitorTrackingScheduler] Running daily price check...");
      try {
        const result = await runDailyPriceCheck();
        console.log("[CompetitorTrackingScheduler] Daily price check completed:", result);
      } catch (error) {
        console.error("[CompetitorTrackingScheduler] Daily price check failed:", error);
      }
    },
    null, // onComplete
    true, // start immediately
    "America/New_York" // timezone
  );

  // Weekly Summary - runs every Monday at 9:00 AM
  weeklySummaryJob = new CronJob(
    "0 9 * * 1", // cron expression: every Monday at 9:00 AM
    async () => {
      console.log("[CompetitorTrackingScheduler] Running weekly summary...");
      try {
        const result = await runWeeklySummary();
        console.log("[CompetitorTrackingScheduler] Weekly summary completed:", result);
      } catch (error) {
        console.error("[CompetitorTrackingScheduler] Weekly summary failed:", error);
      }
    },
    null, // onComplete
    true, // start immediately
    "America/New_York" // timezone
  );

  console.log("[CompetitorTrackingScheduler] Scheduler started successfully");
  console.log("  - Daily price check: Every day at 6:00 AM");
  console.log("  - Weekly summary: Every Monday at 9:00 AM");
}

export function stopCompetitorTrackingScheduler() {
  console.log("[CompetitorTrackingScheduler] Stopping scheduler...");

  if (dailyPriceCheckJob) {
    dailyPriceCheckJob.stop();
    dailyPriceCheckJob = null;
  }

  if (weeklySummaryJob) {
    weeklySummaryJob.stop();
    weeklySummaryJob = null;
  }

  console.log("[CompetitorTrackingScheduler] Scheduler stopped");
}

// Manual trigger functions for testing/admin
export async function triggerDailyPriceCheck() {
  console.log("[CompetitorTrackingScheduler] Manually triggering daily price check...");
  return await runDailyPriceCheck();
}

export async function triggerWeeklySummary() {
  console.log("[CompetitorTrackingScheduler] Manually triggering weekly summary...");
  return await runWeeklySummary();
}

// Get scheduler status
export function getSchedulerStatus() {
  return {
    dailyPriceCheck: {
      active: dailyPriceCheckJob !== null && dailyPriceCheckJob.running,
      nextRun: dailyPriceCheckJob?.nextDate().toJSDate(),
      lastRun: dailyPriceCheckJob?.lastDate()?.toJSDate(),
    },
    weeklySummary: {
      active: weeklySummaryJob !== null && weeklySummaryJob.running,
      nextRun: weeklySummaryJob?.nextDate().toJSDate(),
      lastRun: weeklySummaryJob?.lastDate()?.toJSDate(),
    },
  };
}
