// @ts-nocheck
import { getDb } from "../db";
import {
  emailCampaigns,
  emailCampaignSequences,
  emailCampaignSubscribers,
  emailTemplates,
  InsertEmailCampaign,
  InsertEmailCampaignSequence,
  InsertEmailCampaignSubscriber,
} from "../../drizzle/schema";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { sendEmail } from "./emailService";
import { logger } from "../_core/logger";

export interface CampaignWithSequences {
  id: number;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed";
  triggerType: "manual" | "signup" | "property_view" | "saved_search" | "offer_submitted" | "tour_booked";
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sequences: {
    id: number;
    sequenceOrder: number;
    templateId: number;
    delayDays: number;
    delayHours: number;
    templateName: string;
    templateSubject: string;
  }[];
}

export interface ScheduledCampaignService {
  createCampaign(campaign: InsertEmailCampaign): Promise<number>;
  updateCampaign(id: number, campaign: Partial<InsertEmailCampaign>): Promise<void>;
  deleteCampaign(id: number): Promise<void>;
  getCampaign(id: number): Promise<CampaignWithSequences | null>;
  getAllCampaigns(): Promise<CampaignWithSequences[]>;
  addSequence(sequence: InsertEmailCampaignSequence): Promise<number>;
  updateSequence(id: number, sequence: Partial<InsertEmailCampaignSequence>): Promise<void>;
  deleteSequence(id: number): Promise<void>;
  subscribeToCampaign(subscriber: InsertEmailCampaignSubscriber): Promise<void>;
  unsubscribeFromCampaign(campaignId: number, userId: number): Promise<void>;
  getSubscribers(campaignId: number): Promise<any[]>;
  processScheduledEmails(): Promise<number>;
  triggerCampaign(userId: number, triggerType: string, metadata?: Record<string, any>): Promise<void>;
}

export const scheduledCampaignService: ScheduledCampaignService = {
  async createCampaign(campaign: InsertEmailCampaign): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [inserted] = await db.insert(emailCampaigns).values(campaign).returning();
    return inserted.id;
  },

  async updateCampaign(id: number, campaign: Partial<InsertEmailCampaign>): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(emailCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(emailCampaigns.id, id));
  },

  async deleteCampaign(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Delete sequences first
    await db.delete(emailCampaignSequences).where(eq(emailCampaignSequences.campaignId, id));
    
    // Delete subscribers
    await db.delete(emailCampaignSubscribers).where(eq(emailCampaignSubscribers.campaignId, id));
    
    // Delete campaign
    await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
  },

  async getCampaign(id: number): Promise<CampaignWithSequences | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const campaigns = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id))
      .limit(1);

    if (campaigns.length === 0) return null;

    const campaign = campaigns[0];

    const sequences = await db
      .select({
        id: emailCampaignSequences.id,
        sequenceOrder: emailCampaignSequences.sequenceOrder,
        templateId: emailCampaignSequences.templateId,
        delayDays: emailCampaignSequences.delayDays,
        delayHours: emailCampaignSequences.delayHours,
        templateName: emailTemplates.name,
        templateSubject: emailTemplates.subject,
      })
      .from(emailCampaignSequences)
      .leftJoin(emailTemplates, eq(emailCampaignSequences.templateId, emailTemplates.id))
      .where(eq(emailCampaignSequences.campaignId, id))
      .orderBy(emailCampaignSequences.sequenceOrder);

    return {
      ...campaign,
      sequences: sequences.map((s) => ({
        id: s.id,
        sequenceOrder: s.sequenceOrder,
        templateId: s.templateId,
        delayDays: s.delayDays,
        delayHours: s.delayHours,
        templateName: s.templateName || "Unknown Template",
        templateSubject: s.templateSubject || "No Subject",
      })),
    };
  },

  async getAllCampaigns(): Promise<CampaignWithSequences[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const campaigns = await db.select().from(emailCampaigns).orderBy(emailCampaigns.createdAt);

    const result: CampaignWithSequences[] = [];

    for (const campaign of (campaigns as any[])) {
      const sequences = await db
        .select({
          id: emailCampaignSequences.id,
          sequenceOrder: emailCampaignSequences.sequenceOrder,
          templateId: emailCampaignSequences.templateId,
          delayDays: emailCampaignSequences.delayDays,
          delayHours: emailCampaignSequences.delayHours,
          templateName: emailTemplates.name,
          templateSubject: emailTemplates.subject,
        })
        .from(emailCampaignSequences)
        .leftJoin(emailTemplates, eq(emailCampaignSequences.templateId, emailTemplates.id))
        .where(eq(emailCampaignSequences.campaignId, campaign.id))
        .orderBy(emailCampaignSequences.sequenceOrder);

      result.push({
        ...campaign,
        sequences: sequences.map((s) => ({
          id: s.id,
          sequenceOrder: s.sequenceOrder,
          templateId: s.templateId,
          delayDays: s.delayDays,
          delayHours: s.delayHours,
          templateName: s.templateName || "Unknown Template",
          templateSubject: s.templateSubject || "No Subject",
        })),
      });
    }

    return result;
  },

  async addSequence(sequence: InsertEmailCampaignSequence): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [inserted] = await db.insert(emailCampaignSequences).values(sequence).returning();
    return inserted.id;
  },

  async updateSequence(id: number, sequence: Partial<InsertEmailCampaignSequence>): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(emailCampaignSequences).set(sequence).where(eq(emailCampaignSequences.id, id));
  },

  async deleteSequence(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.delete(emailCampaignSequences).where(eq(emailCampaignSequences.id, id));
  },

  async subscribeToCampaign(subscriber: InsertEmailCampaignSubscriber): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if already subscribed
    const existing = await db
      .select()
      .from(emailCampaignSubscribers)
      .where(
        and(
          eq(emailCampaignSubscribers.campaignId, subscriber.campaignId),
          eq(emailCampaignSubscribers.userId, subscriber.userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(emailCampaignSubscribers)
        .set({
          status: "active",
          subscribedAt: new Date(),
          metadata: subscriber.metadata ? JSON.stringify(subscriber.metadata) : null,
        })
        .where(eq(emailCampaignSubscribers.id, existing[0].id));
    } else {
      // Create new subscription
      const insertData = {
        ...subscriber,
        metadata: subscriber.metadata ? JSON.stringify(subscriber.metadata) : null,
      };
      await db.insert(emailCampaignSubscribers).values(insertData);
    }
  },

  async unsubscribeFromCampaign(campaignId: number, userId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(emailCampaignSubscribers)
      .set({ status: "unsubscribed" })
      .where(
        and(
          eq(emailCampaignSubscribers.campaignId, campaignId),
          eq(emailCampaignSubscribers.userId, userId)
        )
      );
  },

  async getSubscribers(campaignId: number): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db
      .select()
      .from(emailCampaignSubscribers)
      .where(eq(emailCampaignSubscribers.campaignId, campaignId));
  },

  async processScheduledEmails(): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let emailsSent = 0;
    const now = new Date();

    // Get active campaigns
    const activeCampaigns = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.status, "active"),
          or(isNull(emailCampaigns.startDate), lte(emailCampaigns.startDate, now)),
          or(isNull(emailCampaigns.endDate), gte(emailCampaigns.endDate, now))
        )
      );

    for (const campaign of (activeCampaigns as any[])) {
      // Get campaign sequences
      const sequences = await db
        .select()
        .from(emailCampaignSequences)
        .where(eq(emailCampaignSequences.campaignId, campaign.id))
        .orderBy(emailCampaignSequences.sequenceOrder);

      // Get active subscribers
      const subscribers = await db
        .select()
        .from(emailCampaignSubscribers)
        .where(
          and(
            eq(emailCampaignSubscribers.campaignId, campaign.id),
            eq(emailCampaignSubscribers.status, "active")
          )
        );

      for (const subscriber of (subscribers as any[])) {
        // Calculate which sequence step they should be on
        const subscribedAt = subscriber.subscribedAt;
        const hoursSinceSubscribed = (now.getTime() - subscribedAt.getTime()) / (1000 * 60 * 60);

        for (const sequence of (sequences as any[])) {
          const totalDelayHours = sequence.delayDays * 24 + sequence.delayHours;

          // Check if it's time to send this sequence
          if (hoursSinceSubscribed >= totalDelayHours) {
            // Check if already sent
            const lastSentSequence = subscriber.lastSentSequence || 0;

            if (sequence.sequenceOrder > lastSentSequence) {
              // Get template
              const template = await db
                .select()
                .from(emailTemplates)
                .where(eq(emailTemplates.id, sequence.templateId))
                .limit(1);

              if (template.length > 0) {
                // Get user email from metadata or user table
                const userEmail = subscriber.metadata?.email as string;

                if (userEmail) {
                  try {
                    // Send email
                    await sendEmail({
                      to: userEmail,
                      subject: template[0].subject,
                      html: template[0].htmlContent,
                      html: template[0].textContent || undefined,
                      templateId: template[0].id,
                      userId: subscriber.userId,
                      emailType: "campaign",
                    });

                    // Update subscriber's last sent sequence
                    await db
                      .update(emailCampaignSubscribers)
                      .set({ lastSentSequence: sequence.sequenceOrder })
                      .where(eq(emailCampaignSubscribers.id, subscriber.id));

                    emailsSent++;
                  } catch (error) {
                    logger.error(`Failed to send campaign email to ${userEmail}:`, { error: String(error) });
                  }
                }
              }
            }
          }
        }

        // Check if all sequences are complete
        if (subscriber.lastSentSequence && subscriber.lastSentSequence >= sequences.length) {
          await db
            .update(emailCampaignSubscribers)
            .set({ status: "completed" })
            .where(eq(emailCampaignSubscribers.id, subscriber.id));
        }
      }
    }

    return emailsSent;
  },

  async triggerCampaign(
    userId: number,
    triggerType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find campaigns with matching trigger type
    const campaigns = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.status, "active"),
          eq(emailCampaigns.triggerType, triggerType as any)
        )
      );

    for (const campaign of (campaigns as any[])) {
      // Subscribe user to campaign
      await this.subscribeToCampaign({
        campaignId: campaign.id,
        userId,
        status: "active",
        subscribedAt: new Date(),
        metadata,
      });
    }
  },
};
