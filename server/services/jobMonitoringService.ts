import { getDb } from "../db";
import { jobMonitoring, jobQueue, jobExecutionMetrics, type InsertJobMonitoring, type InsertJobQueue } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

/**
 * Job Monitoring Service
 * Manages real-time job tracking, queue management, and performance metrics
 */

export interface JobProgress {
  jobId: number;
  progress: number;
  processedItems: number;
  totalItems: number;
  status: string;
}

export class JobMonitoringService {
  /**
   * Create a new job monitoring entry
   */
  static async createJob(data: Omit<InsertJobMonitoring, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(jobMonitoring).values(data).returning({ id: jobMonitoring.id });
    return result[0].id;
  }

  /**
   * Update job progress
   */
  static async updateProgress(jobId: number, progress: number, processedItems: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(jobMonitoring)
      .set({
        progress,
        processedItems,
        updatedAt: new Date(),
      })
      .where(eq(jobMonitoring.id, jobId));
  }

  /**
   * Update job status
   */
  static async updateStatus(
    jobId: number,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const updates: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'running' && !errorMessage) {
      updates.startedAt = new Date();
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.completedAt = new Date();
    }

    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }

    await db.update(jobMonitoring)
      .set(updates)
      .where(eq(jobMonitoring.id, jobId));
  }

  /**
   * Get job by ID
   */
  static async getJob(jobId: number) {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(jobMonitoring).where(eq(jobMonitoring.id, jobId)).limit(1);
    return result[0] || null;
  }

  /**
   * Get all jobs with optional filters
   */
  static async getJobs(filters?: {
    status?: string;
    jobType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const db = await getDb();
    if (!db) return [];

    let query = db.select().from(jobMonitoring);

    const conditions: any[] = [];

    if (filters?.status) {
      conditions.push(eq(jobMonitoring.status, filters.status));
    }

    if (filters?.jobType) {
      conditions.push(eq(jobMonitoring.jobType, filters.jobType));
    }

    if (filters?.startDate) {
      conditions.push(gte(jobMonitoring.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(jobMonitoring.createdAt, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(jobMonitoring.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  /**
   * Get running jobs
   */
  static async getRunningJobs() {
    return this.getJobs({ status: 'running' });
  }

  /**
   * Cancel a job
   */
  static async cancelJob(jobId: number): Promise<void> {
    await this.updateStatus(jobId, 'cancelled');
  }

  /**
   * Add job to queue
   */
  static async enqueueJob(data: Omit<InsertJobQueue, 'id' | 'createdAt'>): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(jobQueue).values(data).returning({ id: jobQueue.id });
    return result[0].id;
  }

  /**
   * Get pending jobs from queue
   */
  static async getPendingJobs(limit: number = 10) {
    const db = await getDb();
    if (!db) return [];

    return await db.select()
      .from(jobQueue)
      .where(eq(jobQueue.status, 'pending'))
      .orderBy(desc(jobQueue.priority), jobQueue.scheduledFor)
      .limit(limit);
  }

  /**
   * Mark queue job as processing
   */
  static async markJobProcessing(queueId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(jobQueue)
      .set({
        status: 'processing',
        lastAttemptAt: new Date(),
      })
      .where(eq(jobQueue.id, queueId));
  }

  /**
   * Mark queue job as completed
   */
  static async markJobCompleted(queueId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(jobQueue)
      .set({ status: 'completed' })
      .where(eq(jobQueue.id, queueId));
  }

  /**
   * Mark queue job as failed and increment attempts
   */
  static async markJobFailed(queueId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const job = await db.select().from(jobQueue).where(eq(jobQueue.id, queueId)).limit(1);
    if (!job[0]) return;

    const newAttempts = job[0].attempts + 1;
    const newStatus = newAttempts >= job[0].maxAttempts ? 'failed' : 'pending';

    await db.update(jobQueue)
      .set({
        attempts: newAttempts,
        status: newStatus,
        lastAttemptAt: new Date(),
      })
      .where(eq(jobQueue.id, queueId));
  }

  /**
   * Record job execution metrics
   */
  static async recordMetrics(data: {
    jobId: number;
    executionTime: number;
    itemsProcessed: number;
    itemsFailed: number;
    averageItemTime?: number;
    peakMemoryUsage?: number;
    cpuUsage?: number;
  }): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(jobExecutionMetrics).values(data);
  }

  /**
   * Get job statistics
   */
  static async getJobStats(days: number = 7) {
    const db = await getDb();
    if (!db) return null;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const jobs = await this.getJobs({ startDate });

    const stats = {
      total: jobs.length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
      running: jobs.filter(j => j.status === 'running').length,
      pending: jobs.filter(j => j.status === 'pending').length,
      averageExecutionTime: 0,
      successRate: 0,
    };

    if (stats.completed > 0) {
      const completedJobs = jobs.filter(j => j.status === 'completed' && j.startedAt && j.completedAt);
      if (completedJobs.length > 0) {
        const totalTime = completedJobs.reduce((sum, job) => {
          const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
          return sum + duration;
        }, 0);
        stats.averageExecutionTime = Math.round(totalTime / completedJobs.length);
      }
      stats.successRate = Math.round((stats.completed / (stats.completed + stats.failed)) * 100);
    }

    return stats;
  }
}
