import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  competitorTrackingJobs, 
  emailDeliveryLogs,
  competitorListings 
} from "../../drizzle/schema";
import { desc, and, gte, sql, eq } from "drizzle-orm";

export const competitorAnalyticsRouter = router({
  /**
   * Get job execution history
   */
  getJobHistory: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.days);

      const jobs = await db
        .select({
          id: competitorTrackingJobs.id,
          jobType: competitorTrackingJobs.jobType,
          status: competitorTrackingJobs.status,
          startedAt: competitorTrackingJobs.startedAt,
          completedAt: competitorTrackingJobs.completedAt,
          propertiesProcessed: competitorTrackingJobs.propertiesProcessed,
          emailsSent: competitorTrackingJobs.emailsSent,
          errorMessage: competitorTrackingJobs.errorMessage
        })
        .from(competitorTrackingJobs)
        .where(gte(competitorTrackingJobs.startedAt, cutoffDate))
        .orderBy(desc(competitorTrackingJobs.startedAt))
        .limit(100);

      return jobs.map(job => ({
        ...job,
        duration: job.completedAt 
          ? Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000)
          : null
      }));
    }),

  /**
   * Get email delivery metrics
   */
  getEmailMetrics: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          totalSent: 0,
          totalDelivered: 0,
          totalOpened: 0,
          totalClicked: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0
        };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.days);

      const metrics = await db
        .select({
          totalSent: sql<number>`COUNT(*)`,
          totalDelivered: sql<number>`SUM(CASE WHEN ${emailDeliveryLogs.status} = 'delivered' THEN 1 ELSE 0 END)`,
          totalOpened: sql<number>`0`,
          totalClicked: sql<number>`0`
        })
        .from(emailDeliveryLogs)
        .where(gte(emailDeliveryLogs.createdAt, cutoffDate));

      const result = metrics[0];
      const totalSent = Number(result.totalSent) || 0;
      const totalDelivered = Number(result.totalDelivered) || 0;
      const totalOpened = Number(result.totalOpened) || 0;
      const totalClicked = Number(result.totalClicked) || 0;

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0
      };
    }),

  /**
   * Get email performance breakdown
   */
  getEmailPerformance: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          byTemplate: [],
          dailyStats: []
        };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.days);

      // Get performance by template
      const byTemplate = await db
        .select({
          templateName: emailDeliveryLogs.emailType,
          sent: sql<number>`COUNT(*)`,
          delivered: sql<number>`SUM(CASE WHEN ${emailDeliveryLogs.status} = 'delivered' THEN 1 ELSE 0 END)`,
          opened: sql<number>`0`,
          clicked: sql<number>`0`
        })
        .from(emailDeliveryLogs)
        .where(gte(emailDeliveryLogs.createdAt, cutoffDate))
        .groupBy(emailDeliveryLogs.emailType);

      const templateStats = byTemplate.map(t => {
        const sent = Number(t.sent) || 0;
        const delivered = Number(t.delivered) || 0;
        const opened = Number(t.opened) || 0;
        const clicked = Number(t.clicked) || 0;

        return {
          templateName: t.templateName || "Unknown",
          sent,
          delivered,
          opened,
          clicked,
          openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
          clickRate: opened > 0 ? (clicked / opened) * 100 : 0
        };
      });

      // Get daily stats
      const dailyStats = await db
        .select({
          date: sql<string>`DATE(${emailDeliveryLogs.createdAt})`,
          sent: sql<number>`COUNT(*)`,
          delivered: sql<number>`SUM(CASE WHEN ${emailDeliveryLogs.status} = 'delivered' THEN 1 ELSE 0 END)`,
          opened: sql<number>`0`,
          clicked: sql<number>`0`
        })
        .from(emailDeliveryLogs)
        .where(gte(emailDeliveryLogs.createdAt, cutoffDate))
        .groupBy(sql`DATE(${emailDeliveryLogs.createdAt})`)
        .orderBy(sql`DATE(${emailDeliveryLogs.createdAt})`);

      const dailyStatsFormatted = dailyStats.map(d => {
        const sent = Number(d.sent) || 0;
        const delivered = Number(d.delivered) || 0;
        const opened = Number(d.opened) || 0;
        const clicked = Number(d.clicked) || 0;

        return {
          date: d.date,
          sent,
          delivered,
          opened,
          clicked,
          openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
          clickRate: opened > 0 ? (clicked / opened) * 100 : 0
        };
      });

      return {
        byTemplate: templateStats,
        dailyStats: dailyStatsFormatted
      };
    })
});
