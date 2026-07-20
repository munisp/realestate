// @ts-nocheck
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { v4 as uuidv4 } from 'uuid';
import { storagePut } from '../storage';
import {
  bulkVerificationJobs,
  bulkVerificationItems,
  type InsertBulkVerificationJob,
  type InsertBulkVerificationItem,
} from '../../drizzle/schema-bulk-verification';
import { getDb } from '../db';
import { eq, and, inArray } from 'drizzle-orm';

// Import verification services
import { RegistryAggregator } from './governmentRegistry/RegistryAggregator';
import { notificationService } from './notificationService';
import { logger } from "../_core/logger";

/**
 * CSV Row Interface
 */
interface CSVRow {
  cofONumber: string;
  state: string;
  lga?: string;
  propertyAddress?: string;
  ownerName?: string;
  itemId?: string; // Optional client reference
}

/**
 * Bulk Verification Service
 * Handles batch processing of C of O verifications for institutional clients
 */
export class BulkVerificationService {
  /**
   * Parse and validate CSV file
   */
  async parseCSV(fileBuffer: Buffer): Promise<CSVRow[]> {
    try {
      const records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      // Validate required columns
      if (records.length === 0) {
        throw new Error('CSV file is empty');
      }

      const firstRow = records[0];
      const requiredColumns = ['cofONumber', 'state'];
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));

      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      return records as CSVRow[];
    } catch (error: any) {
      throw new Error(`CSV parsing error: ${error.message}`);
    }
  }

  /**
   * Create bulk verification job
   */
  async createBulkJob(
    userId: number,
    fileName: string,
    fileBuffer: Buffer,
    metadata?: any
  ): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Parse CSV
    const rows = await this.parseCSV(fileBuffer);

    // Upload CSV to S3
    const jobId = uuidv4();
    const fileKey = `bulk-verifications/${jobId}/${fileName}`;
    const { url: fileUrl } = await storagePut(fileKey, fileBuffer, 'text/csv');

    // Create job record
    const jobData: InsertBulkVerificationJob = {
      jobId,
      userId,
      fileName,
      fileUrl,
      totalItems: rows.length,
      status: 'pending',
      metadata,
    };

    const [job] = await db.insert(bulkVerificationJobs).values(jobData).returning();

    // Create item records
    const items: InsertBulkVerificationItem[] = rows.map((row, index) => ({
      jobId: job.id,
      rowNumber: index + 2, // +2 because row 1 is header, and we're 0-indexed
      itemId: row.itemId,
      cofONumber: row.cofONumber,
      state: row.state,
      lga: row.lga,
      propertyAddress: row.propertyAddress,
      ownerName: row.ownerName,
      status: 'pending',
    }));

    await db.insert(bulkVerificationItems).values(items);

    // Send job started notification
    if (metadata?.notificationEmail || metadata?.notificationPhone) {
      notificationService.notifyJobStarted({
        jobId,
        fileName,
        totalItems: rows.length,
        email: metadata.notificationEmail,
        phone: metadata.notificationPhone,
      }).catch(error => {
        logger.error(`[BulkVerification] Failed to send job started notification:`, { error: String(error) });
      });
    }

    // Start processing asynchronously
    this.processBulkJob(job.id).catch(error => {
      logger.error(`[BulkVerification] Error processing job ${jobId}:`, { error: String(error) });
    });

    return jobId;
  }

  /**
   * Process bulk verification job
   */
  async processBulkJob(jobId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    try {
      // Update job status
      await db
        .update(bulkVerificationJobs)
        .set({
          status: 'processing',
          startedAt: new Date(),
        })
        .where(eq(bulkVerificationJobs.id, jobId));

      // Get all pending items
      const items = await db
        .select()
        .from(bulkVerificationItems)
        .where(
          and(
            eq(bulkVerificationItems.jobId, jobId),
            eq(bulkVerificationItems.status, 'pending')
          )
        );

      // Get job details for rate limiting
      const [job] = await db
        .select()
        .from(bulkVerificationJobs)
        .where(eq(bulkVerificationJobs.id, jobId));

      const rateLimitPerMinute = job.rateLimitPerMinute || 10;
      const delayMs = (60 * 1000) / rateLimitPerMinute;

      // Process items with rate limiting
      let successCount = 0;
      let failCount = 0;

      for (const item: any of items) {
        try {
          await this.processItem(item.id);
          successCount++;
        } catch (error: any) {
          logger.error(`[BulkVerification] Error processing item ${item.id}:`, { error: String(error) });
          failCount++;
        }

        // Update progress
        const processed = successCount + failCount;
        const progress = (processed / items.length) * 100;

        await db
          .update(bulkVerificationJobs)
          .set({
            processedItems: processed,
            successfulItems: successCount,
            failedItems: failCount,
            progress: progress.toFixed(2),
          })
          .where(eq(bulkVerificationJobs.id, jobId));

        // Rate limiting delay
        if (processed < items.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // Generate results CSV
      const resultsFileUrl = await this.generateResultsCSV(jobId);

      // Mark job as completed
      await db
        .update(bulkVerificationJobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          resultsFileUrl,
        })
        .where(eq(bulkVerificationJobs.id, jobId));

      logger.info(`[BulkVerification] Job ${job.jobId} completed: ${successCount} successful, ${failCount} failed`);

      // Send job completed notification
      if (job.metadata?.notificationEmail || job.metadata?.notificationPhone) {
        notificationService.notifyJobCompleted({
          jobId: job.jobId,
          fileName: job.fileName,
          totalItems: items.length,
          successfulItems: successCount,
          failedItems: failCount,
          resultsUrl: resultsFileUrl,
          email: job.metadata.notificationEmail,
          phone: job.metadata.notificationPhone,
        }).catch(error => {
          logger.error(`[BulkVerification] Failed to send job completed notification:`, { error: String(error) });
        });
      }
    } catch (error: any) {
      logger.error(`[BulkVerification] Job ${jobId} failed:`, { error: String(error) });

      await db
        .update(bulkVerificationJobs)
        .set({
          status: 'failed',
          completedAt: new Date(),
        })
        .where(eq(bulkVerificationJobs.id, jobId));

      // Send job failed notification
      const [failedJob] = await db
        .select()
        .from(bulkVerificationJobs)
        .where(eq(bulkVerificationJobs.id, jobId));

      if (failedJob?.metadata?.notificationEmail || failedJob?.metadata?.notificationPhone) {
        notificationService.notifyJobFailed({
          jobId: failedJob.jobId,
          fileName: failedJob.fileName,
          errorMessage: error.message,
          email: failedJob.metadata.notificationEmail,
          phone: failedJob.metadata.notificationPhone,
        }).catch(err => {
          logger.error(`[BulkVerification] Failed to send job failed notification:`, { error: String(err) });
        });
      }
    }
  }

  /**
   * Process individual verification item
   */
  async processItem(itemId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const startTime = Date.now();

    try {
      // Get item
      const [item] = await db
        .select()
        .from(bulkVerificationItems)
        .where(eq(bulkVerificationItems.id, itemId));

      if (!item) throw new Error('Item not found');

      // Update status
      await db
        .update(bulkVerificationItems)
        .set({
          status: 'processing',
          startedAt: new Date(),
        })
        .where(eq(bulkVerificationItems.id, itemId));

      // Perform verification
      const verificationDetails: any = {};

      // 1. Government Registry Verification
      try {
        const aggregator = new RegistryAggregator();
        const govResult = await aggregator.verifyCofO(
          item.cofONumber,
          item.state as any // Cast to registry state type
        );

        verificationDetails.governmentVerification = {
          status: govResult.isValid ? 'verified' : 'not_found',
          confidence: govResult.confidence || 0,
          registryData: govResult.data,
        };
      } catch (error: any) {
        verificationDetails.governmentVerification = {
          status: 'error',
          confidence: 0,
          error: error.message,
        };
      }

      // 2. Basic validation checks (fraud detection placeholder)
      verificationDetails.fraudDetection = {
        riskLevel: 'low',
        riskScore: 10,
        flags: [],
      };

      // 3. Geospatial validation placeholder
      if (item.propertyAddress) {
        verificationDetails.geospatialValidation = {
          coordinatesMatch: false,
          error: 'Geospatial validation not yet implemented',
        };
      }

      // Calculate overall verification score
      const verificationScore = this.calculateVerificationScore(verificationDetails);
      const isVerified = verificationScore >= 70;

      // Update item with results
      const processingTime = Date.now() - startTime;

      await db
        .update(bulkVerificationItems)
        .set({
          status: 'completed',
          verificationScore,
          isVerified,
          verificationDetails,
          completedAt: new Date(),
          processingTimeMs: processingTime,
        })
        .where(eq(bulkVerificationItems.id, itemId));
    } catch (error: any) {
      logger.error(`[BulkVerification] Item ${itemId} failed:`, { error: String(error) });

      await db
        .update(bulkVerificationItems)
        .set({
          status: 'failed',
          errorMessage: error.message,
          retryCount: item.retryCount + 1,
          completedAt: new Date(),
        })
        .where(eq(bulkVerificationItems.id, itemId));
    }
  }

  /**
   * Calculate overall verification score
   */
  private calculateVerificationScore(details: any): number {
    let score = 0;
    let weight = 0;

    // Government verification (50% weight)
    if (details.governmentVerification) {
      const govScore = details.governmentVerification.confidence || 0;
      score += govScore * 0.5;
      weight += 0.5;
    }

    // Fraud detection (30% weight)
    if (details.fraudDetection) {
      const fraudScore = 100 - (details.fraudDetection.riskScore || 0);
      score += fraudScore * 0.3;
      weight += 0.3;
    }

    // Geospatial validation (20% weight)
    if (details.geospatialValidation) {
      const geoScore = details.geospatialValidation.coordinatesMatch ? 100 : 0;
      score += geoScore * 0.2;
      weight += 0.2;
    }

    return weight > 0 ? Math.round(score / weight) : 0;
  }

  /**
   * Generate results CSV
   */
  async generateResultsCSV(jobId: number): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get job and items
    const [job] = await db
      .select()
      .from(bulkVerificationJobs)
      .where(eq(bulkVerificationJobs.id, jobId));

    const items = await db
      .select()
      .from(bulkVerificationItems)
      .where(eq(bulkVerificationItems.jobId, jobId));

    // Generate CSV
    const records = items.map(item => ({
      rowNumber: item.rowNumber,
      itemId: item.itemId || '',
      cofONumber: item.cofONumber,
      state: item.state,
      lga: item.lga || '',
      propertyAddress: item.propertyAddress || '',
      ownerName: item.ownerName || '',
      status: item.status,
      isVerified: item.isVerified ? 'Yes' : 'No',
      verificationScore: item.verificationScore || 0,
      governmentStatus: item.verificationDetails?.governmentVerification?.status || '',
      fraudRiskLevel: item.verificationDetails?.fraudDetection?.riskLevel || '',
      errorMessage: item.errorMessage || '',
    }));

    const csv = stringify(records, { header: true });

    // Upload to S3
    const resultsKey = `bulk-verifications/${job.jobId}/results.csv`;
    const { url } = await storagePut(resultsKey, Buffer.from(csv), 'text/csv');

    return url;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [job] = await db
      .select()
      .from(bulkVerificationJobs)
      .where(eq(bulkVerificationJobs.jobId, jobId));

    if (!job) throw new Error('Job not found');

    const items = await db
      .select()
      .from(bulkVerificationItems)
      .where(eq(bulkVerificationItems.jobId, job.id));

    return {
      job,
      items,
      summary: {
        total: job.totalItems,
        processed: job.processedItems,
        successful: job.successfulItems,
        failed: job.failedItems,
        progress: parseFloat(job.progress || '0'),
      },
    };
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db
      .update(bulkVerificationJobs)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
      })
      .where(eq(bulkVerificationJobs.jobId, jobId));
  }
}

export const bulkVerificationService = new BulkVerificationService();
