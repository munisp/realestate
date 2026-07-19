// @ts-nocheck
/**
 * Valuation Monitoring Scheduled Job
 * 
 * Runs daily to check for property valuation changes and send alerts to users
 */

import { checkValuationChanges } from "../services/valuationMonitoring";

// Job execution state
let isRunning = false;
let lastRun: Date | null = null;
let lastRunStatus: "success" | "failed" | null = null;
let lastRunError: string | null = null;

/**
 * Execute valuation monitoring job
 */
export async function runValuationMonitoringJob(): Promise<void> {
  if (isRunning) {
    console.log("[Valuation Job] Job already running, skipping");
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  
  console.log("[Valuation Job] Starting valuation monitoring job");

  try {
    // Check all monitored properties for valuation changes
    const result = await checkValuationChanges();

    const duration = Date.now() - startTime;
    lastRun = new Date();
    lastRunStatus = "success";
    lastRunError = null;

    console.log(`[Valuation Job] Completed successfully in ${duration}ms`);
    console.log(`[Valuation Job] Checked: ${result.checked}, Alerts sent: ${result.alertsSent}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    lastRun = new Date();
    lastRunStatus = "failed";
    lastRunError = error instanceof Error ? error.message : String(error);

    console.error(`[Valuation Job] Failed after ${duration}ms:`, error);
  } finally {
    isRunning = false;
  }
}

/**
 * Get job status
 */
export function getJobStatus() {
  return {
    isRunning,
    lastRun,
    lastRunStatus,
    lastRunError,
  };
}

/**
 * Start scheduled job (runs daily at 9 AM)
 */
export function startValuationMonitoringSchedule() {
  // Run immediately on startup (for testing)
  if (process.env.RUN_JOB_ON_STARTUP === "true") {
    console.log("[Valuation Job] Running job on startup");
    setTimeout(() => runValuationMonitoringJob(), 5000);
  }

  // Schedule daily execution at 9 AM
  const scheduleTime = process.env.VALUATION_JOB_TIME || "09:00";
  const [hours, minutes] = scheduleTime.split(":").map(Number);

  console.log(`[Valuation Job] Scheduled to run daily at ${scheduleTime}`);

  // Calculate time until next run
  const now = new Date();
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  const msUntilNext = next.getTime() - now.getTime();

  // Schedule first run
  setTimeout(() => {
    runValuationMonitoringJob();

    // Then run every 24 hours
    setInterval(runValuationMonitoringJob, 24 * 60 * 60 * 1000);
  }, msUntilNext);

  console.log(`[Valuation Job] Next run scheduled for ${next.toLocaleString()}`);
}
