import { getDb } from "../db";
import { alertConfigurations, alertHistory, InsertAlertHistory } from "../../drizzle/schema";
import { serviceHealth, apiUsage } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * Alert Evaluation Service
 * Monitors metrics and triggers alerts based on configured thresholds
 */

interface MetricValue {
  serviceName: string;
  metricName: string;
  value: number;
  timestamp: Date;
}

interface AlertEvaluationResult {
  triggered: boolean;
  configurationId: number;
  metricValue: number;
  thresholdValue: number;
  message: string;
}

export class AlertEvaluationService {
  /**
   * Evaluate all active alert configurations
   */
  static async evaluateAllAlerts(): Promise<AlertEvaluationResult[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get all enabled alert configurations
    const configs = await db
      .select()
      .from(alertConfigurations)
      .where(eq(alertConfigurations.enabled, true));

    const results: AlertEvaluationResult[] = [];

    for (const config of configs) {
      try {
        const result = await this.evaluateAlert(config);
        if (result.triggered) {
          results.push(result);
          await this.triggerAlert(config, result);
        }
      } catch (error) {
        console.error(`[Alert Evaluation] Error evaluating alert ${config.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Evaluate a single alert configuration
   */
  private static async evaluateAlert(
    config: typeof alertConfigurations.$inferSelect
  ): Promise<AlertEvaluationResult> {
    const metric = await this.getMetricValue(
      config.serviceName || "",
      config.metricName,
      config.evaluationWindow
    );

    if (!metric) {
      return {
        triggered: false,
        configurationId: config.id,
        metricValue: 0,
        thresholdValue: Number(config.thresholdValue),
        message: "No metric data available",
      };
    }

    const thresholdValue = Number(config.thresholdValue);
    const metricValue = metric.value;
    const triggered = this.compareValues(metricValue, thresholdValue, config.comparisonOperator);

    return {
      triggered,
      configurationId: config.id,
      metricValue,
      thresholdValue,
      message: this.buildAlertMessage(config, metricValue, thresholdValue),
    };
  }

  /**
   * Get current metric value from database
   */
  private static async getMetricValue(
    serviceName: string,
    metricName: string,
    windowSeconds: number
  ): Promise<MetricValue | null> {
    const db = await getDb();
    if (!db) return null;

    const windowStart = new Date(Date.now() - windowSeconds * 1000);

    // Query based on metric type
    if (metricName === "response_time") {
      const result = await db
        .select({
          value: sql<number>`AVG(${apiUsage.responseTimeMs})`,
        })
        .from(apiUsage)
        .where(
          and(
            eq(apiUsage.serviceName, serviceName),
            sql`${apiUsage.timestamp} >= ${windowStart}`
          )
        );

      return result[0]?.value
        ? {
            serviceName,
            metricName,
            value: result[0].value,
            timestamp: new Date(),
          }
        : null;
    }

    if (metricName === "error_rate") {
      const total = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(apiUsage)
        .where(
          and(
            eq(apiUsage.serviceName, serviceName),
            sql`${apiUsage.timestamp} >= ${windowStart}`
          )
        );

      const errors = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(apiUsage)
        .where(
          and(
            eq(apiUsage.serviceName, serviceName),
            sql`${apiUsage.statusCode} >= 400`,
            sql`${apiUsage.timestamp} >= ${windowStart}`
          )
        );

      const errorRate = total[0]?.count ? (errors[0]?.count || 0) / total[0].count : 0;

      return {
        serviceName,
        metricName,
        value: errorRate * 100, // percentage
        timestamp: new Date(),
      };
    }

    if (metricName === "cache_hit_rate") {
      const totalRequests = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(apiUsage)
        .where(
          and(
            eq(apiUsage.serviceName, serviceName),
            sql`${apiUsage.timestamp} >= ${windowStart}`
          )
        );

      const cacheHits = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(apiUsage)
        .where(
          and(
            eq(apiUsage.serviceName, serviceName),
            eq(apiUsage.cacheHit, 1),
            sql`${apiUsage.timestamp} >= ${windowStart}`
          )
        );

      const cacheHitRate = totalRequests[0]?.count
        ? (cacheHits[0]?.count || 0) / totalRequests[0].count * 100
        : 0;

      const result = [{ value: cacheHitRate }];

      return result[0]?.value
        ? {
            serviceName,
            metricName,
            value: result[0].value,
            timestamp: new Date(),
          }
        : null;
    }

    if (metricName === "service_health") {
      const health = await db
        .select()
        .from(serviceHealth)
        .where(eq(serviceHealth.serviceName, serviceName))
        .orderBy(desc(serviceHealth.lastCheckAt))
        .limit(1);

      return health[0]
        ? {
            serviceName,
            metricName,
            value: health[0].status === "healthy" ? 1 : 0,
            timestamp: health[0].lastCheckAt,
          }
        : null;
    }

    return null;
  }

  /**
   * Compare metric value against threshold
   */
  private static compareValues(
    metricValue: number,
    thresholdValue: number,
    operator: string
  ): boolean {
    switch (operator) {
      case "gt":
        return metricValue > thresholdValue;
      case "lt":
        return metricValue < thresholdValue;
      case "gte":
        return metricValue >= thresholdValue;
      case "lte":
        return metricValue <= thresholdValue;
      case "eq":
        return metricValue === thresholdValue;
      default:
        return false;
    }
  }

  /**
   * Build alert message
   */
  private static buildAlertMessage(
    config: typeof alertConfigurations.$inferSelect,
    metricValue: number,
    thresholdValue: number
  ): string {
    const serviceName = config.serviceName || "System";
    const metricName = config.metricName.replace(/_/g, " ");
    const operator = this.getOperatorText(config.comparisonOperator);

    return `${serviceName}: ${metricName} is ${metricValue.toFixed(2)} (threshold: ${operator} ${thresholdValue})`;
  }

  private static getOperatorText(operator: string): string {
    const map: Record<string, string> = {
      gt: ">",
      lt: "<",
      gte: "≥",
      lte: "≤",
      eq: "=",
    };
    return map[operator] || operator;
  }

  /**
   * Trigger alert and send notifications
   */
  private static async triggerAlert(
    config: typeof alertConfigurations.$inferSelect,
    result: AlertEvaluationResult
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    // Check if alert is in cooldown period
    const recentAlert = await db
      .select()
      .from(alertHistory)
      .where(
        and(
          eq(alertHistory.configurationId, config.id),
          eq(alertHistory.status, "triggered"),
          sql`${alertHistory.triggeredAt} > DATE_SUB(NOW(), INTERVAL ${config.cooldownPeriod} SECOND)`
        )
      )
      .limit(1);

    if (recentAlert.length > 0) {
      console.log(`[Alert] Skipping alert ${config.id} - in cooldown period`);
      return;
    }

    // Create alert history entry
    const alertRecord: InsertAlertHistory = {
      configurationId: config.id,
      alertType: config.alertType,
      serviceName: config.serviceName || undefined,
      metricName: config.metricName,
      metricValue: result.metricValue.toString(),
      thresholdValue: result.thresholdValue.toString(),
      status: "triggered",
      severity: config.severity,
      triggeredAt: new Date(),
      message: result.message,
      emailSent: 0,
      smsSent: 0,
      webhookSent: 0,
    };

    const [inserted] = await db.insert(alertHistory).values(alertRecord);

    // Send notifications
    if (config.emailEnabled && config.emailRecipients) {
      await this.sendEmailNotification(config, result);
      await db
        .update(alertHistory)
        .set({ emailSent: 1 })
        .where(eq(alertHistory.id, inserted.insertId));
    }

    if (config.smsEnabled && config.smsRecipients) {
      await this.sendSmsNotification(config, result);
      await db
        .update(alertHistory)
        .set({ smsSent: 1 })
        .where(eq(alertHistory.id, inserted.insertId));
    }

    if (config.webhookEnabled && config.webhookUrl) {
      await this.sendWebhookNotification(config, result);
      await db
        .update(alertHistory)
        .set({ webhookSent: 1 })
        .where(eq(alertHistory.id, inserted.insertId));
    }

    console.log(`[Alert] Triggered alert ${config.id}: ${result.message}`);
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    config: typeof alertConfigurations.$inferSelect,
    result: AlertEvaluationResult
  ): Promise<void> {
    try {
      const title = `[${config.severity.toUpperCase()}] ${config.name}`;
      const content = `
Alert: ${config.name}
Severity: ${config.severity}
Service: ${config.serviceName || "System"}
Metric: ${config.metricName}
Current Value: ${result.metricValue.toFixed(2)}
Threshold: ${result.thresholdValue}

${result.message}

Time: ${new Date().toISOString()}
      `.trim();

      await notifyOwner({ title, content });
    } catch (error) {
      console.error("[Alert] Failed to send email notification:", error);
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSmsNotification(
    config: typeof alertConfigurations.$inferSelect,
    result: AlertEvaluationResult
  ): Promise<void> {
    try {
      const { sendAlertSMS } = await import('./smsService');
      const { logSMSDelivery } = await import('./smsDeliveryLog');

      if (!config.smsRecipients) return;

      const recipients = JSON.parse(config.smsRecipients);
      for (const phoneNumber of recipients) {
        try {
          const smsResult = await sendAlertSMS(
            phoneNumber,
            config.name,
            result.message
          );

          await logSMSDelivery({
            phoneNumber,
            messageBody: `🚨 ${config.name}\n\n${result.message}`,
            messageType: 'alert',
            status: smsResult.success ? 'sent' : 'failed',
            messageId: smsResult.messageId,
            errorMessage: smsResult.error,
            provider: 'twilio',
          });

          console.log(`[Alert] SMS sent to ${phoneNumber} for alert ${config.id}`);
        } catch (error) {
          console.error(`[Alert] Failed to send SMS to ${phoneNumber}:`, error);
        }
      }
    } catch (error) {
      console.error('[Alert] Failed to send SMS notification:', error);
    }
  }

  /**
   * Send webhook notification
   */
  private static async sendWebhookNotification(
    config: typeof alertConfigurations.$inferSelect,
    result: AlertEvaluationResult
  ): Promise<void> {
    if (!config.webhookUrl) return;

    try {
      const payload = {
        alertId: config.id,
        alertName: config.name,
        severity: config.severity,
        serviceName: config.serviceName,
        metricName: config.metricName,
        metricValue: result.metricValue,
        thresholdValue: result.thresholdValue,
        message: result.message,
        timestamp: new Date().toISOString(),
      };

      await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("[Alert] Failed to send webhook notification:", error);
    }
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId: number, userId: number, notes?: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(alertHistory)
      .set({
        status: "acknowledged",
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      })
      .where(eq(alertHistory.id, alertId));
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(alertId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(alertHistory)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
      })
      .where(eq(alertHistory.id, alertId));
  }
}
