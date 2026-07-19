import { gnnAlertService } from "../services/gnnAlertService";

/**
 * GNN Alerts Scheduler
 * Runs automated evaluation of alert subscriptions
 */

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Start the GNN alerts scheduler
 * Evaluates all active subscriptions every 15 minutes
 */
export function startGnnAlertsScheduler() {
  if (schedulerInterval) {
    console.log('[GnnAlertsScheduler] Scheduler already running');
    return;
  }

  console.log('[GnnAlertsScheduler] Starting GNN alerts scheduler');

  // Run immediately on startup
  evaluateAlerts();

  // Then run every 15 minutes
  schedulerInterval = setInterval(() => {
    evaluateAlerts();
  }, 15 * 60 * 1000); // 15 minutes

  console.log('[GnnAlertsScheduler] Scheduler started - will run every 15 minutes');
}

/**
 * Stop the GNN alerts scheduler
 */
export function stopGnnAlertsScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[GnnAlertsScheduler] Scheduler stopped');
  }
}

/**
 * Evaluate all active alert subscriptions
 */
async function evaluateAlerts() {
  if (isRunning) {
    console.log('[GnnAlertsScheduler] Evaluation already in progress, skipping');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log('[GnnAlertsScheduler] Starting alert evaluation');

    const result = await gnnAlertService.evaluateAllSubscriptions();

    const duration = Date.now() - startTime;
    console.log(
      `[GnnAlertsScheduler] Evaluation completed in ${duration}ms - ` +
      `Triggers: ${result.triggersCreated}, Notifications: ${result.notificationsSent}`
    );

  } catch (error) {
    console.error('[GnnAlertsScheduler] Error during evaluation:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Manually trigger alert evaluation (for testing)
 */
export async function triggerManualEvaluation(): Promise<{ triggersCreated: number; notificationsSent: number }> {
  console.log('[GnnAlertsScheduler] Manual evaluation triggered');
  
  if (isRunning) {
    throw new Error('Evaluation already in progress');
  }

  isRunning = true;
  try {
    const result = await gnnAlertService.evaluateAllSubscriptions();
    return result;
  } finally {
    isRunning = false;
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    isActive: schedulerInterval !== null,
    isRunning,
  };
}
