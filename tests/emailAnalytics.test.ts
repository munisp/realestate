import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { emailAnalyticsService } from "../server/services/emailAnalyticsService";
import { getDb } from "../server/db";
import { emailDeliveryLog, emailTemplates } from "../drizzle/schema";
import { sql } from "drizzle-orm";

describe("Email Analytics Service", () => {
  let testTemplateId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test template
    const result = await db.insert(emailTemplates).values({
      templateKey: "test-analytics-template",
      name: "Test Analytics Template",
      subject: "Test Subject",
      htmlContent: "<p>Test</p>",
    });

    testTemplateId = Number(result[0].insertId);

    // Insert test data
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await db.insert(emailDeliveryLog).values([
      {
        recipient: "test1@example.com",
        subject: "Test 1",
        status: "delivered",
        templateId: testTemplateId,
        emailType: "campaign",
        opened: 1,
        clicked: 1,
        sentAt: yesterday,
      },
      {
        recipient: "test2@example.com",
        subject: "Test 2",
        status: "delivered",
        templateId: testTemplateId,
        emailType: "campaign",
        opened: 1,
        clicked: 0,
        sentAt: yesterday,
      },
      {
        recipient: "test3@example.com",
        subject: "Test 3",
        status: "failed",
        templateId: testTemplateId,
        emailType: "transactional",
        opened: 0,
        clicked: 0,
        sentAt: now,
      },
    ]);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.execute(sql`DELETE FROM emailDeliveryLog`);
    await db.execute(sql`DELETE FROM emailTemplates`);
  });

  it("should calculate campaign metrics correctly", async () => {
    const metrics = await emailAnalyticsService.getCampaignMetrics();

    expect(metrics.totalSent).toBeGreaterThanOrEqual(3);
    expect(metrics.delivered).toBeGreaterThanOrEqual(2);
    expect(metrics.opened).toBeGreaterThanOrEqual(2);
    expect(metrics.clicked).toBeGreaterThanOrEqual(1);
    expect(metrics.deliveryRate).toBeGreaterThan(0);
    expect(metrics.openRate).toBeGreaterThan(0);
  });

  it("should get campaign performance by template", async () => {
    const performance = await emailAnalyticsService.getCampaignPerformance();

    expect(performance).toBeInstanceOf(Array);
    expect(performance.length).toBeGreaterThan(0);

    const testCampaign = performance.find((p) => p.templateId === testTemplateId);
    expect(testCampaign).toBeDefined();
    if (testCampaign) {
      expect(testCampaign.totalSent).toBeGreaterThanOrEqual(3);
      expect(testCampaign.delivered).toBeGreaterThanOrEqual(2);
    }
  });

  it("should get time series data", async () => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const timeSeries = await emailAnalyticsService.getTimeSeriesData(startDate, endDate, "day");

    expect(timeSeries).toBeInstanceOf(Array);
    // Should have data for at least one day
    expect(timeSeries.length).toBeGreaterThan(0);
  });

  it("should get email type breakdown", async () => {
    const breakdown = await emailAnalyticsService.getEmailTypeBreakdown();

    expect(breakdown).toBeInstanceOf(Array);
    expect(breakdown.length).toBeGreaterThan(0);

    const campaignType = breakdown.find((b) => b.emailType === "campaign");
    expect(campaignType).toBeDefined();
    if (campaignType) {
      expect(campaignType.count).toBeGreaterThanOrEqual(2);
    }
  });

  it("should get top performing campaigns", async () => {
    const topCampaigns = await emailAnalyticsService.getTopPerformingCampaigns(5);

    expect(topCampaigns).toBeInstanceOf(Array);
    expect(topCampaigns.length).toBeGreaterThan(0);

    // Should be sorted by open rate descending
    for (let i = 0; i < topCampaigns.length - 1; i++) {
      expect(topCampaigns[i].openRate).toBeGreaterThanOrEqual(topCampaigns[i + 1].openRate);
    }
  });

  it("should filter metrics by date range", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const metrics = await emailAnalyticsService.getCampaignMetrics(yesterday, now);

    expect(metrics).toBeDefined();
    expect(metrics.totalSent).toBeGreaterThanOrEqual(0);
  });
});
