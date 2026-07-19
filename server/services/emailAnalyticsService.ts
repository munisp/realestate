import { getDb } from "../db";
import { emailDeliveryLog, emailTemplates } from "../../drizzle/schema";
import { and, between, count, desc, eq, gte, sql } from "drizzle-orm";

export interface CampaignMetrics {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
}

export interface CampaignPerformance {
  templateId: number;
  templateName: string;
  subject: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface TimeSeriesData {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
}

export interface EmailTypeBreakdown {
  emailType: string;
  count: number;
  openRate: number;
  clickRate: number;
}

export interface DeviceBreakdown {
  device: string;
  count: number;
  percentage: number;
}

export interface EmailAnalyticsService {
  getCampaignMetrics(startDate?: Date, endDate?: Date): Promise<CampaignMetrics>;
  getCampaignPerformance(startDate?: Date, endDate?: Date): Promise<CampaignPerformance[]>;
  getTimeSeriesData(startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month'): Promise<TimeSeriesData[]>;
  getEmailTypeBreakdown(startDate?: Date, endDate?: Date): Promise<EmailTypeBreakdown[]>;
  getDeviceBreakdown(startDate?: Date, endDate?: Date): Promise<DeviceBreakdown[]>;
  getTopPerformingCampaigns(limit: number, startDate?: Date, endDate?: Date): Promise<CampaignPerformance[]>;
  getWorstPerformingCampaigns(limit: number, startDate?: Date, endDate?: Date): Promise<CampaignPerformance[]>;
}

export const emailAnalyticsService: EmailAnalyticsService = {
  async getCampaignMetrics(startDate?: Date, endDate?: Date): Promise<CampaignMetrics> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const conditions = [];
    if (startDate) conditions.push(gte(emailDeliveryLog.sentAt, startDate));
    if (endDate) conditions.push(sql`${emailDeliveryLog.sentAt} <= ${endDate}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        totalSent: count(),
        delivered: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.status} = 'delivered' THEN 1 ELSE 0 END)`,
        opened: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.opened} = true THEN 1 ELSE 0 END)`,
        clicked: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.clicked} = true THEN 1 ELSE 0 END)`,
        bounced: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.status} = 'bounced' THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.status} = 'failed' THEN 1 ELSE 0 END)`,
      })
      .from(emailDeliveryLog)
      .where(whereClause);

    const metrics = result[0];
    const totalSent = Number(metrics.totalSent) || 0;
    const delivered = Number(metrics.delivered) || 0;
    const opened = Number(metrics.opened) || 0;
    const clicked = Number(metrics.clicked) || 0;

    return {
      totalSent,
      delivered,
      opened,
      clicked,
      bounced: Number(metrics.bounced) || 0,
      failed: Number(metrics.failed) || 0,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      clickToOpenRate: opened > 0 ? (clicked / opened) * 100 : 0,
    };
  },

  async getCampaignPerformance(startDate?: Date, endDate?: Date): Promise<CampaignPerformance[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const conditions = [];
    if (startDate) conditions.push(gte(emailDeliveryLog.sentAt, startDate));
    if (endDate) conditions.push(sql`${emailDeliveryLog.sentAt} <= ${endDate}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        templateId: emailDeliveryLog.templateId,
        templateName: emailTemplates.name,
        subject: emailTemplates.subject,
        totalSent: count(),
        delivered: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.status} = 'delivered' THEN 1 ELSE 0 END)`,
        opened: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.opened} = true THEN 1 ELSE 0 END)`,
        clicked: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.clicked} = true THEN 1 ELSE 0 END)`,
      })
      .from(emailDeliveryLog)
      .leftJoin(emailTemplates, eq(emailDeliveryLog.templateId, emailTemplates.id))
      .where(whereClause)
      .groupBy(emailDeliveryLog.templateId, emailTemplates.name, emailTemplates.subject);

    return results.map((row) => {
      const totalSent = Number(row.totalSent) || 0;
      const delivered = Number(row.delivered) || 0;
      const opened = Number(row.opened) || 0;
      const clicked = Number(row.clicked) || 0;

      return {
        templateId: row.templateId || 0,
        templateName: row.templateName || "Unknown",
        subject: row.subject || "No Subject",
        totalSent,
        delivered,
        opened,
        clicked,
        deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
        clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      };
    });
  },

  async getTimeSeriesData(
    startDate: Date,
    endDate: Date,
    interval: 'day' | 'week' | 'month'
  ): Promise<TimeSeriesData[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let dateFormat: string;
    switch (interval) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%U';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
    }

    const results = await db
      .select({
        date: sql<string>`DATE_FORMAT(${emailDeliveryLog.sentAt}, ${dateFormat})`.as('date'),
        sent: count(),
        delivered: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.status} = 'delivered' THEN 1 ELSE 0 END)`,
        opened: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.opened} = 1 THEN 1 ELSE 0 END)`,
        clicked: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.clicked} = 1 THEN 1 ELSE 0 END)`,
      })
      .from(emailDeliveryLog)
      .where(between(emailDeliveryLog.sentAt, startDate, endDate))
      .groupBy(sql`date`)
      .orderBy(sql`date`);

    return results.map((row) => ({
      date: row.date,
      sent: Number(row.sent) || 0,
      delivered: Number(row.delivered) || 0,
      opened: Number(row.opened) || 0,
      clicked: Number(row.clicked) || 0,
    }));
  },

  async getEmailTypeBreakdown(startDate?: Date, endDate?: Date): Promise<EmailTypeBreakdown[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const conditions = [];
    if (startDate) conditions.push(gte(emailDeliveryLog.sentAt, startDate));
    if (endDate) conditions.push(sql`${emailDeliveryLog.sentAt} <= ${endDate}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        emailType: emailDeliveryLog.emailType,
        count: count(),
        delivered: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.status} = 'delivered' THEN 1 ELSE 0 END)`,
        opened: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.opened} = true THEN 1 ELSE 0 END)`,
        clicked: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.clicked} = true THEN 1 ELSE 0 END)`,
      })
      .from(emailDeliveryLog)
      .where(whereClause)
      .groupBy(emailDeliveryLog.emailType);

    return results.map((row) => {
      const delivered = Number(row.delivered) || 0;
      const opened = Number(row.opened) || 0;
      const clicked = Number(row.clicked) || 0;

      return {
        emailType: row.emailType || "Unknown",
        count: Number(row.count) || 0,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
        clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      };
    });
  },

  async getDeviceBreakdown(startDate?: Date, endDate?: Date): Promise<DeviceBreakdown[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const conditions = [];
    if (startDate) conditions.push(gte(emailDeliveryLog.sentAt, startDate));
    if (endDate) conditions.push(sql`${emailDeliveryLog.sentAt} <= ${endDate}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count first
    const totalResult = await db
      .select({ total: count() })
      .from(emailDeliveryLog)
      .where(whereClause);

    const total = Number(totalResult[0]?.total) || 0;

    // Mock device data since we don't track this yet
    // In production, this would come from email tracking metadata
    return [
      { device: "Desktop", count: Math.floor(total * 0.45), percentage: 45 },
      { device: "Mobile", count: Math.floor(total * 0.40), percentage: 40 },
      { device: "Tablet", count: Math.floor(total * 0.10), percentage: 10 },
      { device: "Other", count: Math.floor(total * 0.05), percentage: 5 },
    ];
  },

  async getTopPerformingCampaigns(
    limit: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<CampaignPerformance[]> {
    const campaigns = await this.getCampaignPerformance(startDate, endDate);
    
    // Sort by open rate (primary) and click rate (secondary)
    return campaigns
      .sort((a, b) => {
        if (b.openRate !== a.openRate) return b.openRate - a.openRate;
        return b.clickRate - a.clickRate;
      })
      .slice(0, limit);
  },

  async getWorstPerformingCampaigns(
    limit: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<CampaignPerformance[]> {
    const campaigns = await this.getCampaignPerformance(startDate, endDate);
    
    // Filter out campaigns with very low send volume (< 10)
    const significantCampaigns = campaigns.filter(c => c.totalSent >= 10);
    
    // Sort by open rate (ascending)
    return significantCampaigns
      .sort((a, b) => a.openRate - b.openRate)
      .slice(0, limit);
  },
};
