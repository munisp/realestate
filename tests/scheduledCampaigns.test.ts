import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { scheduledCampaignService } from "../server/services/scheduledCampaignService";
import { getDb } from "../server/db";
import {
  emailCampaigns,
  emailCampaignSequences,
  emailCampaignSubscribers,
  emailTemplates,
} from "../drizzle/schema";
import { sql } from "drizzle-orm";

describe("Scheduled Campaign Service", () => {
  let testCampaignId: number;
  let testTemplateId: number;
  let testUserId = 999;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test template
    const templateResult = await db.insert(emailTemplates).values({
      templateKey: "test-campaign-template",
      name: "Test Campaign Template",
      subject: "Welcome to our platform",
      htmlContent: "<p>Welcome!</p>",
    });

    testTemplateId = Number(templateResult[0].insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.execute(sql`DELETE FROM emailCampaignSubscribers`);
    await db.execute(sql`DELETE FROM emailCampaignSequences`);
    await db.execute(sql`DELETE FROM emailCampaigns`);
    await db.execute(sql`DELETE FROM emailTemplates`);
  });

  it("should create a campaign", async () => {
    const campaignId = await scheduledCampaignService.createCampaign({
      name: "Test Welcome Campaign",
      description: "Test campaign for new users",
      status: "draft",
      triggerType: "signup",
    });

    expect(campaignId).toBeGreaterThan(0);
    testCampaignId = campaignId;
  });

  it("should get campaign by id", async () => {
    const campaign = await scheduledCampaignService.getCampaign(testCampaignId);

    expect(campaign).toBeDefined();
    expect(campaign?.name).toBe("Test Welcome Campaign");
    expect(campaign?.status).toBe("draft");
    expect(campaign?.triggerType).toBe("signup");
    expect(campaign?.sequences).toBeInstanceOf(Array);
  });

  it("should update campaign", async () => {
    await scheduledCampaignService.updateCampaign(testCampaignId, {
      status: "active",
    });

    const campaign = await scheduledCampaignService.getCampaign(testCampaignId);
    expect(campaign?.status).toBe("active");
  });

  it("should add sequence to campaign", async () => {
    const sequenceId = await scheduledCampaignService.addSequence({
      campaignId: testCampaignId,
      sequenceOrder: 1,
      templateId: testTemplateId,
      delayDays: 0,
      delayHours: 0,
    });

    expect(sequenceId).toBeGreaterThan(0);

    const campaign = await scheduledCampaignService.getCampaign(testCampaignId);
    expect(campaign?.sequences.length).toBe(1);
    expect(campaign?.sequences[0].sequenceOrder).toBe(1);
  });

  it("should subscribe user to campaign", async () => {
    await scheduledCampaignService.subscribeToCampaign({
      campaignId: testCampaignId,
      userId: testUserId,
      status: "active",
      subscribedAt: new Date(),
      metadata: { email: "test@example.com" },
    });

    const subscribers = await scheduledCampaignService.getSubscribers(testCampaignId);
    expect(subscribers.length).toBeGreaterThan(0);
    expect(subscribers[0].userId).toBe(testUserId);
  });

  it("should get all campaigns", async () => {
    const campaigns = await scheduledCampaignService.getAllCampaigns();

    expect(campaigns).toBeInstanceOf(Array);
    expect(campaigns.length).toBeGreaterThan(0);

    const testCampaign = campaigns.find((c) => c.id === testCampaignId);
    expect(testCampaign).toBeDefined();
  });

  it("should unsubscribe user from campaign", async () => {
    await scheduledCampaignService.unsubscribeFromCampaign(testCampaignId, testUserId);

    const subscribers = await scheduledCampaignService.getSubscribers(testCampaignId);
    const unsubscribed = subscribers.find((s) => s.userId === testUserId);

    expect(unsubscribed?.status).toBe("unsubscribed");
  });

  it("should trigger campaign for user", async () => {
    const newUserId = 1000;

    await scheduledCampaignService.triggerCampaign(newUserId, "signup", {
      email: "newuser@example.com",
    });

    const subscribers = await scheduledCampaignService.getSubscribers(testCampaignId);
    const newSubscriber = subscribers.find((s) => s.userId === newUserId);

    expect(newSubscriber).toBeDefined();
    expect(newSubscriber?.status).toBe("active");
  });

  it("should delete sequence", async () => {
    const campaign = await scheduledCampaignService.getCampaign(testCampaignId);
    const sequenceId = campaign?.sequences[0]?.id;

    if (sequenceId) {
      await scheduledCampaignService.deleteSequence(sequenceId);

      const updatedCampaign = await scheduledCampaignService.getCampaign(testCampaignId);
      expect(updatedCampaign?.sequences.length).toBe(0);
    }
  });

  it("should delete campaign", async () => {
    await scheduledCampaignService.deleteCampaign(testCampaignId);

    const campaign = await scheduledCampaignService.getCampaign(testCampaignId);
    expect(campaign).toBeNull();
  });
});
