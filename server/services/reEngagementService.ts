// @ts-nocheck
import { eq, and, lt, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  reEngagementCampaigns,
  userActivityTracking,
  reEngagementCampaignLogs,
  users,
  type ReEngagementCampaign,
  type UserActivityTracking,
} from "../../drizzle/schema";

/**
 * Re-engagement Campaign Service
 * 
 * Handles:
 * - User activity tracking
 * - Inactivity detection
 * - Automated re-engagement email sequences
 * - Performance analytics
 */

/**
 * Update user activity tracking
 */
export async function trackUserActivity(
  userId: number,
  activityType: "login" | "property_view" | "search" | "offer" | "message"
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  // Get or create activity record
  const [existing] = await db
    .select()
    .from(userActivityTracking)
    .where(eq(userActivityTracking.userId, userId));

  const updates: any = {
    updatedAt: now,
  };

  // Update specific activity timestamp
  switch (activityType) {
    case "login":
      updates.lastLoginAt = now;
      break;
    case "property_view":
      updates.lastPropertyViewAt = now;
      break;
    case "search":
      updates.lastSearchAt = now;
      break;
    case "offer":
      updates.lastOfferAt = now;
      break;
    case "message":
      updates.lastMessageAt = now;
      break;
  }

  // Calculate engagement score (simple algorithm)
  const daysSinceLastLogin = existing?.lastLoginAt
    ? Math.floor((now.getTime() - new Date(existing.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  const engagementScore = Math.max(0, Math.min(100, 100 - daysSinceLastLogin * 2));
  updates.engagementScore = engagementScore;

  // Mark as active if was inactive
  if (existing?.isInactive) {
    updates.isInactive = 0;
    updates.wasReEngaged = 1;
    updates.reEngagedAt = now;
  }

  if (existing) {
    await db
      .update(userActivityTracking)
      .set(updates)
      .where(eq(userActivityTracking.userId, userId));
  } else {
    await db.insert(userActivityTracking).values({
      userId,
      ...updates,
      engagementScore,
    });
  }
}

/**
 * Detect inactive users and trigger re-engagement campaigns
 */
export async function detectInactiveUsers(campaignId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [campaign] = await db
    .select()
    .from(reEngagementCampaigns)
    .where(eq(reEngagementCampaigns.id, campaignId));

  if (!campaign || campaign.status !== "active") return 0;

  const inactivityThreshold = new Date();
  inactivityThreshold.setDate(inactivityThreshold.getDate() - campaign.inactivityDays);

  // Find users who haven't logged in since threshold and aren't already in a campaign
  const inactiveUsers = await db
    .select()
    .from(userActivityTracking)
    .where(
      and(
        lt(userActivityTracking.lastLoginAt, inactivityThreshold),
        eq(userActivityTracking.isInactive, 0),
        eq(userActivityTracking.reEngagementCampaignId, null)
      )
    );

  let triggered = 0;

  for (const user of inactiveUsers) {
    // Mark as inactive
    await db
      .update(userActivityTracking)
      .set({
        isInactive: 1,
        inactiveSince: new Date(),
        reEngagementCampaignId: campaignId,
        reEngagementEmailsSent: 0,
      })
      .where(eq(userActivityTracking.userId, user.userId));

    // Schedule first email
    await scheduleReEngagementEmail(campaignId, user.userId, 0);

    triggered++;
  }

  // Update campaign stats
  await db
    .update(reEngagementCampaigns)
    .set({
      totalTriggered: campaign.totalTriggered + triggered,
    })
    .where(eq(reEngagementCampaigns.id, campaignId));

  return triggered;
}

/**
 * Schedule a re-engagement email
 */
async function scheduleReEngagementEmail(
  campaignId: number,
  userId: number,
  sequenceIndex: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [campaign] = await db
    .select()
    .from(reEngagementCampaigns)
    .where(eq(reEngagementCampaigns.id, campaignId));

  if (!campaign) return;

  const emailSequence = JSON.parse(campaign.emailSequence);
  if (sequenceIndex >= emailSequence.length || sequenceIndex >= campaign.maxEmails) {
    return; // No more emails to send
  }

  const emailTemplate = emailSequence[sequenceIndex];

  // Calculate send time
  const scheduledFor = new Date();
  if (sequenceIndex > 0) {
    scheduledFor.setDate(scheduledFor.getDate() + campaign.delayBetweenEmails);
  }

  // Create log entry
  await db.insert(reEngagementCampaignLogs).values({
    campaignId,
    userId,
    emailSequenceIndex: sequenceIndex,
    emailSubject: emailTemplate.subject,
    status: "scheduled",
    scheduledFor,
  });
}

/**
 * Process scheduled re-engagement emails
 */
export async function processScheduledEmails(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();

  // Get scheduled emails that are due
  const dueEmails = await db
    .select()
    .from(reEngagementCampaignLogs)
    .where(
      and(
        eq(reEngagementCampaignLogs.status, "scheduled"),
        lt(reEngagementCampaignLogs.scheduledFor, now)
      )
    );

  let processed = 0;

  for (const email of dueEmails) {
    try {
      // Get user info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, email.userId));

      if (!user || !user.email) continue;

      // Get campaign
      const [campaign] = await db
        .select()
        .from(reEngagementCampaigns)
        .where(eq(reEngagementCampaigns.id, email.campaignId));

      if (!campaign) continue;

      const emailSequence = JSON.parse(campaign.emailSequence);
      const emailTemplate = emailSequence[email.emailSequenceIndex];

      // TODO: Send actual email using email service
      // For now, just mark as sent
      console.log(`Sending re-engagement email to ${user.email}: ${emailTemplate.subject}`);

      // Update log
      await db
        .update(reEngagementCampaignLogs)
        .set({
          status: "sent",
          sentAt: new Date(),
        })
        .where(eq(reEngagementCampaignLogs.id, email.id));

      // Update user activity tracking
      await db
        .update(userActivityTracking)
        .set({
          reEngagementEmailsSent: sql`${userActivityTracking.reEngagementEmailsSent} + 1`,
          lastReEngagementEmailAt: new Date(),
        })
        .where(eq(userActivityTracking.userId, email.userId));

      // Schedule next email in sequence
      const nextIndex = email.emailSequenceIndex + 1;
      if (nextIndex < campaign.maxEmails && nextIndex < emailSequence.length) {
        await scheduleReEngagementEmail(email.campaignId, email.userId, nextIndex);
      }

      processed++;
    } catch (error) {
      console.error(`Error processing re-engagement email ${email.id}:`, error);

      // Mark as failed
      await db
        .update(reEngagementCampaignLogs)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(reEngagementCampaignLogs.id, email.id));
    }
  }

  return processed;
}

/**
 * Get campaign analytics
 */
export async function getCampaignAnalytics(campaignId: number): Promise<{
  totalTriggered: number;
  totalReEngaged: number;
  totalUnsubscribed: number;
  reEngagementRate: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  openRate: number;
  clickRate: number;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const [campaign] = await db
    .select()
    .from(reEngagementCampaigns)
    .where(eq(reEngagementCampaigns.id, campaignId));

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // Get email stats
  const logs = await db
    .select()
    .from(reEngagementCampaignLogs)
    .where(eq(reEngagementCampaignLogs.campaignId, campaignId));

  const emailsSent = logs.filter((l) => l.status === "sent" || l.status === "delivered").length;
  const emailsOpened = logs.filter((l) => l.status === "opened").length;
  const emailsClicked = logs.filter((l) => l.status === "clicked").length;

  const openRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;
  const clickRate = emailsOpened > 0 ? (emailsClicked / emailsOpened) * 100 : 0;
  const reEngagementRate =
    campaign.totalTriggered > 0 ? (campaign.totalReEngaged / campaign.totalTriggered) * 100 : 0;

  return {
    totalTriggered: campaign.totalTriggered,
    totalReEngaged: campaign.totalReEngaged,
    totalUnsubscribed: campaign.totalUnsubscribed,
    reEngagementRate,
    emailsSent,
    emailsOpened,
    emailsClicked,
    openRate,
    clickRate,
  };
}

/**
 * Get inactive users report
 */
export async function getInactiveUsersReport(): Promise<
  Array<{
    userId: number;
    userName: string;
    userEmail: string;
    lastLoginAt: Date | null;
    daysSinceLastLogin: number;
    engagementScore: number;
    isInCampaign: boolean;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const inactiveUsers = await db
    .select({
      userId: userActivityTracking.userId,
      userName: users.name,
      userEmail: users.email,
      lastLoginAt: userActivityTracking.lastLoginAt,
      engagementScore: userActivityTracking.engagementScore,
      isInactive: userActivityTracking.isInactive,
      reEngagementCampaignId: userActivityTracking.reEngagementCampaignId,
    })
    .from(userActivityTracking)
    .leftJoin(users, eq(users.id, userActivityTracking.userId))
    .where(eq(userActivityTracking.isInactive, 1));

  return inactiveUsers.map((user) => ({
    userId: user.userId,
    userName: user.userName || "Unknown",
    userEmail: user.userEmail || "",
    lastLoginAt: user.lastLoginAt,
    daysSinceLastLogin: user.lastLoginAt
      ? Math.floor((Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999,
    engagementScore: user.engagementScore,
    isInCampaign: !!user.reEngagementCampaignId,
  }));
}
