// @ts-nocheck
import cron from 'node-cron';
import { AlertEvaluationService } from '../services/alertEvaluationService';
import { DataQualityService } from '../services/dataQualityService';
import { evaluateGNNAlerts } from './gnnAlertEvaluation';

/**
 * Scheduled Jobs for Monitoring Infrastructure
 * 
 * This module sets up automated background jobs for:
 * - Alert evaluation (every 5 minutes)
 * - Data quality metrics calculation (daily at 2 AM)
 */

interface JobStatus {
  name: string;
  schedule: string;
  lastRun?: Date;
  nextRun?: Date;
  status: 'running' | 'idle' | 'error';
  lastError?: string;
}

class ScheduledJobsManager {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private jobStatuses: Map<string, JobStatus> = new Map();

  /**
   * Initialize all scheduled jobs
   */
  init(): void {
    console.log('[Scheduled Jobs] Initializing...');

    // Alert evaluation job - every 5 minutes
    this.scheduleJob(
      'alert-evaluation',
      '*/5 * * * *', // Every 5 minutes
      async () => {
        await this.runAlertEvaluation();
      }
    );

    // Data quality metrics job - daily at 2 AM
    this.scheduleJob(
      'data-quality-metrics',
      '0 2 * * *', // Daily at 2:00 AM
      async () => {
        await this.runDataQualityMetrics();
      }
    );

    // Service health check - every minute
    this.scheduleJob(
      'service-health-check',
      '* * * * *', // Every minute
      async () => {
        await this.runServiceHealthCheck();
      }
    );

    // Cost tracking aggregation - hourly
    this.scheduleJob(
      'cost-tracking-aggregation',
      '0 * * * *', // Every hour at :00
      async () => {
        await this.runCostTrackingAggregation();
      }
    );

    // GNN alert evaluation - every hour
    this.scheduleJob(
      'gnn-alert-evaluation',
      '0 * * * *', // Every hour at :00
      async () => {
        await this.runGNNAlertEvaluation();
      }
    );

    console.log('[Scheduled Jobs] All jobs initialized');
    this.printJobSchedule();
  }

  /**
   * Schedule a job with error handling and status tracking
   */
  private scheduleJob(
    name: string,
    schedule: string,
    task: () => Promise<void>
  ): void {
    const job = cron.schedule(schedule, async () => {
      const status = this.jobStatuses.get(name);
      if (status) {
        status.status = 'running';
        status.lastRun = new Date();
      }

      try {
        await task();

        if (status) {
          status.status = 'idle';
          status.lastError = undefined;
        }
      } catch (error: any) {
        console.error(`[Scheduled Jobs] Error in job ${name}:`, error);

        if (status) {
          status.status = 'error';
          status.lastError = error.message || 'Unknown error';
        }
      }
    });

    this.jobs.set(name, job);
    this.jobStatuses.set(name, {
      name,
      schedule,
      status: 'idle',
    });

    console.log(`[Scheduled Jobs] Scheduled job: ${name} (${schedule})`);
  }

  /**
   * Run alert evaluation job
   */
  private async runAlertEvaluation(): Promise<void> {
    console.log('[Job: Alert Evaluation] Starting...');
    try {
      const results = await AlertEvaluationService.evaluateAllAlerts();
      const triggeredCount = results.filter((r) => r.triggered).length;
      console.log(
        `[Job: Alert Evaluation] Completed. Evaluated ${results.length} alerts, ${triggeredCount} triggered.`
      );
    } catch (error) {
      console.error('[Job: Alert Evaluation] Error:', error);
      throw error;
    }
  }

  /**
   * Run data quality metrics calculation job
   */
  private async runDataQualityMetrics(): Promise<void> {
    console.log('[Job: Data Quality Metrics] Starting...');

    try {
      await DataQualityService.calculateDailyMetrics();

      console.log('[Job: Data Quality Metrics] Completed successfully');
    } catch (error) {
      console.error('[Job: Data Quality Metrics] Error:', error);
      throw error;
    }
  }

  /**
   * Run service health check job
   */
  private async runServiceHealthCheck(): Promise<void> {
    // Placeholder for service health check
    // This would ping external services and update serviceHealth table
    console.log('[Job: Service Health Check] Running...');
  }

  /**
   * Run cost tracking aggregation job
   */
  private async runCostTrackingAggregation(): Promise<void> {
    // Placeholder for cost tracking aggregation
    // This would aggregate API usage costs per hour
    console.log('[Job: Cost Tracking Aggregation] Running...');
  }

  /**
   * Run GNN alert evaluation job
   */
  private async runGNNAlertEvaluation(): Promise<void> {
    console.log('[Job: GNN Alert Evaluation] Starting...');

    try {
      await evaluateGNNAlerts();
      console.log('[Job: GNN Alert Evaluation] Completed successfully');
    } catch (error) {
      console.error('[Job: GNN Alert Evaluation] Error:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    console.log('[Scheduled Jobs] Stopping all jobs...');

    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      console.log(`[Scheduled Jobs] Stopped job: ${name}`);
    }

    this.jobs.clear();
    this.jobStatuses.clear();
  }

  /**
   * Get status of all jobs
   */
  getJobStatuses(): JobStatus[] {
    return Array.from(this.jobStatuses.values());
  }

  /**
   * Print job schedule to console
   */
  private printJobSchedule(): void {
    console.log('\n=== Scheduled Jobs ===');
    for (const status of this.jobStatuses.values()) {
      console.log(`  ${status.name}: ${status.schedule}`);
    }
    console.log('======================\n');
  }

  /**
   * Manually trigger a job (for testing)
   */
  async triggerJob(name: string): Promise<void> {
    const status = this.jobStatuses.get(name);
    if (!status) {
      throw new Error(`Job not found: ${name}`);
    }

    console.log(`[Scheduled Jobs] Manually triggering job: ${name}`);

    switch (name) {
      case 'alert-evaluation':
        await this.runAlertEvaluation();
        break;
      case 'data-quality-metrics':
        await this.runDataQualityMetrics();
        break;
      case 'service-health-check':
        await this.runServiceHealthCheck();
        break;
      case 'cost-tracking-aggregation':
        await this.runCostTrackingAggregation();
        break;
      default:
        throw new Error(`Unknown job: ${name}`);
    }
  }
}

// Export singleton instance
export const scheduledJobsManager = new ScheduledJobsManager();

/**
 * Initialize scheduled jobs
 * Call this from server startup
 */
export function initializeScheduledJobs(): void {
  scheduledJobsManager.init();
}

/**
 * Stop all scheduled jobs
 * Call this on server shutdown
 */
export function stopScheduledJobs(): void {
  scheduledJobsManager.stopAll();
}

/**
 * Get job statuses
 */
export function getJobStatuses(): JobStatus[] {
  return scheduledJobsManager.getJobStatuses();
}

/**
 * Manually trigger a job
 */
export async function triggerJob(name: string): Promise<void> {
  return scheduledJobsManager.triggerJob(name);
}
