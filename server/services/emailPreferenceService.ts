import { getDb } from "../db";
import {
  userNotificationPreferences,
  InsertUserNotificationPreferences,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface EmailPreferences {
  userId: number;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  // Category preferences
  escrowUpdates: boolean;
  documentSigning: boolean;
  propertyAlerts: boolean;
  messageNotifications: boolean;
  marketingEmails: boolean;
}

export interface EmailPreferenceService {
  getPreferences(userId: number): Promise<EmailPreferences | null>;
  updatePreferences(userId: number, preferences: Partial<EmailPreferences>): Promise<void>;
  createDefaultPreferences(userId: number): Promise<void>;
  unsubscribeAll(userId: number): Promise<void>;
  checkPreference(userId: number, category: string): Promise<boolean>;
}

const boolToInt = (value: boolean): number => (value ? 1 : 0);
const intToBool = (value: number): boolean => value === 1;

export const emailPreferenceService: EmailPreferenceService = {
  async getPreferences(userId: number): Promise<EmailPreferences | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);

    if (result.length === 0) {
      // Create default preferences if they don't exist
      await this.createDefaultPreferences(userId);
      return await this.getPreferences(userId);
    }

    const prefs = result[0];

    return {
      userId: prefs.userId,
      emailEnabled: intToBool(prefs.emailEnabled),
      smsEnabled: intToBool(prefs.smsEnabled),
      pushEnabled: intToBool(prefs.pushEnabled),
      escrowUpdates: intToBool(prefs.escrowUpdates),
      documentSigning: intToBool(prefs.documentSigning),
      propertyAlerts: intToBool(prefs.propertyAlerts),
      messageNotifications: intToBool(prefs.messageNotifications),
      marketingEmails: intToBool(prefs.marketingEmails),
    };
  },

  async updatePreferences(userId: number, preferences: Partial<EmailPreferences>): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Ensure preferences exist
    const existing = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      await this.createDefaultPreferences(userId);
    }

    // Convert boolean values to integers for database
    const updateData: Record<string, any> = {};

    if (preferences.emailEnabled !== undefined) {
      updateData.emailEnabled = boolToInt(preferences.emailEnabled);
    }
    if (preferences.smsEnabled !== undefined) {
      updateData.smsEnabled = boolToInt(preferences.smsEnabled);
    }
    if (preferences.pushEnabled !== undefined) {
      updateData.pushEnabled = boolToInt(preferences.pushEnabled);
    }
    if (preferences.escrowUpdates !== undefined) {
      updateData.escrowUpdates = boolToInt(preferences.escrowUpdates);
    }
    if (preferences.documentSigning !== undefined) {
      updateData.documentSigning = boolToInt(preferences.documentSigning);
    }
    if (preferences.propertyAlerts !== undefined) {
      updateData.propertyAlerts = boolToInt(preferences.propertyAlerts);
    }
    if (preferences.messageNotifications !== undefined) {
      updateData.messageNotifications = boolToInt(preferences.messageNotifications);
    }
    if (preferences.marketingEmails !== undefined) {
      updateData.marketingEmails = boolToInt(preferences.marketingEmails);
    }

    await db
      .update(userNotificationPreferences)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(userNotificationPreferences.userId, userId));
  },

  async createDefaultPreferences(userId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if already exists
    const existing = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);

    if (existing.length > 0) return;

    // Create with default values (all enabled except marketing)
    await db.insert(userNotificationPreferences).values({
      userId,
      emailEnabled: 1,
      smsEnabled: 0,
      pushEnabled: 1,
      escrowUpdates: 1,
      documentSigning: 1,
      propertyAlerts: 1,
      messageNotifications: 1,
      marketingEmails: 0,
    });
  },

  async unsubscribeAll(userId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await this.updatePreferences(userId, {
      emailEnabled: false,
      smsEnabled: false,
      pushEnabled: false,
      escrowUpdates: false,
      documentSigning: false,
      propertyAlerts: false,
      messageNotifications: false,
      marketingEmails: false,
    });
  },

  async checkPreference(userId: number, category: string): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const prefs = await this.getPreferences(userId);
    if (!prefs) return false;

    // Check if email is globally enabled first
    if (!prefs.emailEnabled) return false;

    // Check specific category
    switch (category) {
      case "escrow":
        return prefs.escrowUpdates;
      case "document":
        return prefs.documentSigning;
      case "property":
        return prefs.propertyAlerts;
      case "message":
        return prefs.messageNotifications;
      case "marketing":
        return prefs.marketingEmails;
      default:
        return true; // Allow by default for unknown categories
    }
  },
};
