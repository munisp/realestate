// @ts-nocheck
import * as cron from 'node-cron';
import cron from "node-cron";
import { getDb } from "../../db";
import {
  landVerificationRequests,
  landRecords,
  scheduledVerifications,
  verificationChangeAlerts,
} from "../../../drizzle/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { notifyOwner } from "../../_core/notification";

interface ScheduledVerificationConfig {
  propertyId: number;
  verificationFrequency: "monthly" | "quarterly" | "annually";
  alertOnChange: boolean;
  notificationEmail?: string;
  notificationPhone?: string;
}

/**
 * Automated Verification Scheduler Service
 * 
 * Handles:
 * - Quarterly re-verification of high-value properties
 * - Change detection and alerting
 * - Scheduled verification jobs
 * - Notification delivery
 */
export class AutomatedVerificationScheduler {
  private static instance: AutomatedVerificationScheduler;
  private isRunning = false;
  private jobs: cron.ScheduledTask[] = [];

  private constructor() {}

  public static getInstance(): AutomatedVerificationScheduler {
    if (!AutomatedVerificationScheduler.instance) {
      AutomatedVerificationScheduler.instance =
        new AutomatedVerificationScheduler();
    }
    return AutomatedVerificationScheduler.instance;
  }

  /**
   * Start all scheduled verification jobs
   */
  public start(): void {
    if (this.isRunning) {
      console.log("[AutomatedVerificationScheduler] Already running");
      return;
    }

    console.log("[AutomatedVerificationScheduler] Starting scheduler...");

    // Daily job: Check for scheduled verifications that are due
    const dailyJob = cron.schedule("0 2 * * *", async () => {
      console.log("[AutomatedVerificationScheduler] Running daily verification check");
      await this.processDueVerifications();
    });

    // Weekly job: Check high-value properties for quarterly verification
    const weeklyJob = cron.schedule("0 3 * * 1", async () => {
      console.log("[AutomatedVerificationScheduler] Running weekly high-value property check");
      await this.checkHighValueProperties();
    });

    this.jobs.push(dailyJob, weeklyJob);
    this.isRunning = true;

    console.log("[AutomatedVerificationScheduler] Scheduler started successfully");
  }

  /**
   * Stop all scheduled jobs
   */
  public stop(): void {
    console.log("[AutomatedVerificationScheduler] Stopping scheduler...");
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Schedule a verification for a property
   */
  public async scheduleVerification(
    config: ScheduledVerificationConfig
  ): Promise<{ success: boolean; scheduledId?: number; message: string }> {
    const db = await getDb();
    if (!db) {
      return { success: false, message: "Database not available" };
    }

    try {
      // Calculate next verification date based on frequency
      const nextVerificationDate = this.calculateNextDate(
        config.verificationFrequency
      );

      // Insert scheduled verification
      const result = await db
        .insert(scheduledVerifications)
        .values({
          propertyId: config.propertyId,
          frequency: config.verificationFrequency,
          nextVerificationDate,
          alertOnChange: config.alertOnChange,
          notificationEmail: config.notificationEmail || null,
          notificationPhone: config.notificationPhone || null,
          enabled: true,
          lastVerificationDate: null,
          verificationCount: 0,
        })
        .returning({ id: scheduledVerifications.id });

      return {
        success: true,
        scheduledId: result[0].id,
        message: `Verification scheduled for ${nextVerificationDate.toISOString()}`,
      };
    } catch (error) {
      console.error("[AutomatedVerificationScheduler] Error scheduling verification:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Process all due verifications
   */
  private async processDueVerifications(): Promise<void> {
    const db = await getDb();
    if (!db) {
      console.error("[AutomatedVerificationScheduler] Database not available");
      return;
    }

    try {
      // Get all scheduled verifications that are due
      const dueVerifications = await db
        .select()
        .from(scheduledVerifications)
        .where(
          and(
            eq(scheduledVerifications.enabled, true),
            lte(scheduledVerifications.nextVerificationDate, new Date())
          )
        );

      console.log(
        `[AutomatedVerificationScheduler] Found ${dueVerifications.length} due verifications`
      );

      for (const scheduled of dueVerifications) {
        await this.executeScheduledVerification(scheduled);
      }
    } catch (error) {
      console.error("[AutomatedVerificationScheduler] Error processing due verifications:", error);
    }
  }

  /**
   * Execute a scheduled verification
   */
  private async executeScheduledVerification(
    scheduled: typeof scheduledVerifications.$inferSelect
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      console.log(
        `[AutomatedVerificationScheduler] Executing verification for property ${scheduled.propertyId}`
      );

      // Get land record
      const landRecord = await db
        .select()
        .from(landRecords)
        .where(eq(landRecords.propertyId, scheduled.propertyId))
        .limit(1);

      if (landRecord.length === 0) {
        console.warn(
          `[AutomatedVerificationScheduler] No land record found for property ${scheduled.propertyId}`
        );
        return;
      }

      const record = landRecord[0];

      // Get previous verification result
      const previousVerifications = await db
        .select()
        .from(landVerificationRequests)
        .where(eq(landVerificationRequests.landRecordId, record.id))
        .orderBy(sql`${landVerificationRequests.createdAt} DESC`)
        .limit(1);

      const previousResult = previousVerifications[0] || null;

      // TODO: Run actual verification layers when services are integrated
      // For now, create a placeholder verification result
      const overallStatus = "pending";

      // Save verification result
      const verificationResult = await db
        .insert(landVerificationRequests)
        .values({
          landRecordId: record.id,
          requestedBy: scheduled.userId || null,
          verificationMethod: "automated_scheduled",
          governmentApiStatus: "pending",
          governmentApiDetails: { message: "Automated verification scheduled" },
          fraudDetectionScore: null,
          fraudDetectionDetails: null,
          geospatialValidationScore: null,
          geospatialValidationDetails: null,
          overallStatus,
          verifiedAt: new Date(),
        })
        .returning({ id: landVerificationRequests.id });

      // Check for changes and send alerts if enabled
      if (scheduled.alertOnChange && previousResult) {
        await this.detectAndAlertChanges(
          scheduled,
          previousResult,
          verificationResult[0],
          record
        );
      }

      // Update scheduled verification
      const nextVerificationDate = this.calculateNextDate(scheduled.frequency);
      await db
        .update(scheduledVerifications)
        .set({
          lastVerificationDate: new Date(),
          nextVerificationDate,
          verificationCount: (scheduled.verificationCount || 0) + 1,
          lastVerificationId: verificationResult[0].id,
        })
        .where(eq(scheduledVerifications.id, scheduled.id));

      console.log(
        `[AutomatedVerificationScheduler] Verification completed for property ${scheduled.propertyId}`
      );
    } catch (error) {
      console.error(
        `[AutomatedVerificationScheduler] Error executing verification for property ${scheduled.propertyId}:`,
        error
      );
    }
  }

  /**
   * Detect changes and send alerts
   */
  private async detectAndAlertChanges(
    scheduled: typeof scheduledVerifications.$inferSelect,
    previousResult: typeof landVerificationRequests.$inferSelect,
    currentResult: { id: number },
    landRecord: typeof landRecords.$inferSelect
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      // Get current verification details
      const current = await db
        .select()
        .from(landVerificationRequests)
        .where(eq(landVerificationRequests.id, currentResult.id))
        .limit(1);

      if (current.length === 0) return;

      const changedFields: string[] = [];
      let severity: "low" | "medium" | "high" | "critical" = "low";

      // Check for status change
      if (previousResult.status !== current[0].status) {
        changedFields.push("overallStatus");

        // Determine severity
        if (
          current[0].status === "failed" ||
          current[0].status === "suspicious"
        ) {
          severity = "critical";
        } else if (previousResult.status === "verified") {
          severity = "high";
        } else {
          severity = "medium";
        }
      }

      // Check for fraud score change
      const prevFraudScore = previousResult.fraudDetectionScore || 0;
      const currFraudScore = current[0].fraudDetectionScore || 0;
      if (Math.abs(prevFraudScore - currFraudScore) > 10) {
        changedFields.push("fraudDetectionScore");
        if (currFraudScore > 70) severity = "critical";
        else if (currFraudScore > 50) severity = "high";
      }

      // Check for geospatial score change
      const prevGeoScore = previousResult.geospatialValidationScore || 0;
      const currGeoScore = current[0].geospatialValidationScore || 0;
      if (Math.abs(prevGeoScore - currGeoScore) > 10) {
        changedFields.push("geospatialValidationScore");
        if (currGeoScore < 50) severity = "high";
      }

      // If changes detected, create alert
      if (changedFields.length > 0) {
        await db.insert(verificationChangeAlerts).values({
          propertyId: scheduled.propertyId,
          scheduledVerificationId: scheduled.id,
          previousVerificationId: previousResult.id,
          currentVerificationId: current[0].id,
          previousStatus: previousResult.status,
          currentStatus: current[0].status,
          changedFields,
          severity,
          notificationSent: false,
        });

        // Send notification
        await this.sendChangeAlert(
          scheduled,
          landRecord,
          previousResult.status,
          current[0].status,
          changedFields,
          severity
        );
      }
    } catch (error) {
      console.error("[AutomatedVerificationScheduler] Error detecting changes:", error);
    }
  }

  /**
   * Send change alert notification
   */
  private async sendChangeAlert(
    scheduled: typeof scheduledVerifications.$inferSelect,
    landRecord: typeof landRecords.$inferSelect,
    previousStatus: string,
    currentStatus: string,
    changedFields: string[],
    severity: string
  ): Promise<void> {
    const severityEmoji = {
      low: "ℹ️",
      medium: "⚠️",
      high: "🔴",
      critical: "🚨",
    }[severity];

    const message = `
${severityEmoji} **C of O Verification Change Alert**

**Property:** ${landRecord.address}
**C of O Number:** ${(landRecord as any).cofONumber}

**Status Change:**
- Previous: ${previousStatus}
- Current: ${currentStatus}

**Changed Fields:** ${changedFields.join(", ")}

**Severity:** ${severity.toUpperCase()}

This is an automated alert from your scheduled verification system.
    `.trim();

    try {
      // Send notification to owner
      await notifyOwner({
        title: `C of O Verification Alert - ${severity.toUpperCase()}`,
        content: message,
      });

      // TODO: Send email/SMS if configured
      if (scheduled.notificationEmail) {
        console.log(`[AutomatedVerificationScheduler] Would send email to ${scheduled.notificationEmail}`);
      }

      if (scheduled.notificationPhone) {
        console.log(`[AutomatedVerificationScheduler] Would send SMS to ${scheduled.notificationPhone}`);
      }
    } catch (error) {
      console.error("[AutomatedVerificationScheduler] Error sending alert:", error);
    }
  }

  /**
   * Check high-value properties for quarterly verification
   */
  private async checkHighValueProperties(): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      // Get properties with value > 50M Naira that don't have scheduled verifications
      const highValueProperties = await db
        .select({
          propertyId: landRecords.propertyId,
          cofONumber: (landRecords as any).cofONumber,
          address: landRecords.address,
        })
        .from(landRecords)
        .where(sql`${(landRecords as any).estimatedValue} > 50000000`)
        .limit(100);

      console.log(
        `[AutomatedVerificationScheduler] Found ${highValueProperties.length} high-value properties`
      );

      // Notify admin about properties that should have scheduled verification
      if (highValueProperties.length > 0) {
        await notifyOwner({
          title: "High-Value Properties Review",
          content: `${highValueProperties.length} properties valued over ₦50M are available for verification. Consider enabling quarterly verification for these properties.`,
        });
      }
    } catch (error) {
      console.error("[AutomatedVerificationScheduler] Error checking high-value properties:", error);
    }
  }

  /**
   * Calculate next verification date based on frequency
   */
  private calculateNextDate(
    frequency: "monthly" | "quarterly" | "annually"
  ): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "quarterly":
        next.setMonth(next.getMonth() + 3);
        break;
      case "annually":
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    isRunning: boolean;
    activeJobs: number;
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.jobs.length,
    };
  }
}

// Export singleton instance
export const automatedVerificationScheduler =
  AutomatedVerificationScheduler.getInstance();
