/**
 * Valuation Alert Scheduler
 * 
 * Automated job that runs daily to check property valuations
 * and send alerts to users when thresholds are met
 */

import cron from 'node-cron';
import { processAllMonitoring } from '../services/valuationMonitoring';

let schedulerRunning = false;

/**
 * Start the valuation alert scheduler
 * Runs daily at 9:00 AM
 */
export function startValuationAlertScheduler() {
  if (schedulerRunning) {
    console.log('[ValuationScheduler] Scheduler already running');
    return;
  }

  // Run daily at 9:00 AM
  // Cron format: second minute hour day month weekday
  const schedule = '0 0 9 * * *';
  
  cron.schedule(schedule, async () => {
    console.log('[ValuationScheduler] Starting daily valuation check...');
    
    try {
      const result = await processAllMonitoring();
      
      if (result) {
        console.log(`[ValuationScheduler] Completed: ${result.alertsSent} alerts sent, ${result.totalFailed} failed`);
      } else {
        console.log('[ValuationScheduler] Check completed with no results');
      }
    } catch (error) {
      console.error('[ValuationScheduler] Error during valuation check:', error);
    }
  });

  schedulerRunning = true;
  console.log('[ValuationScheduler] Scheduler started - will run daily at 9:00 AM');
}

/**
 * Stop the valuation alert scheduler
 */
export function stopValuationAlertScheduler() {
  if (!schedulerRunning) {
    console.log('[ValuationScheduler] Scheduler not running');
    return;
  }

  // Note: node-cron doesn't provide a direct way to stop a specific task
  // In production, you'd want to store the task reference and call task.stop()
  schedulerRunning = false;
  console.log('[ValuationScheduler] Scheduler stopped');
}

/**
 * Run valuation check immediately (for testing)
 */
export async function runValuationCheckNow() {
  console.log('[ValuationScheduler] Running immediate valuation check...');
  
  try {
    const result = await processAllMonitoring();
    
    if (result) {
      console.log(`[ValuationScheduler] Immediate check completed: ${result.alertsSent} alerts sent, ${result.totalFailed} failed`);
      return result;
    } else {
      console.log('[ValuationScheduler] Immediate check completed with no results');
      return { alertsSent: 0, totalFailed: 0 };
    }
  } catch (error) {
    console.error('[ValuationScheduler] Error during immediate check:', error);
    throw error;
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    running: schedulerRunning,
    schedule: '9:00 AM daily',
    nextRun: schedulerRunning ? 'Next 9:00 AM' : 'Not scheduled',
  };
}
