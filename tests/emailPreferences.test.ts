import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { emailPreferenceService } from "../server/services/emailPreferenceService";
import { getDb } from "../server/db";
import { userNotificationPreferences } from "../drizzle/schema";
import { sql } from "drizzle-orm";

describe("Email Preference Service", () => {
  const testUserId = 9999;

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.execute(sql`DELETE FROM userNotificationPreferences`);
  });

  it("should create default preferences for new user", async () => {
    await emailPreferenceService.createDefaultPreferences(testUserId);

    const preferences = await emailPreferenceService.getPreferences(testUserId);

    expect(preferences).toBeDefined();
    expect(preferences?.userId).toBe(testUserId);
    expect(preferences?.emailEnabled).toBe(true);
    expect(preferences?.smsEnabled).toBe(false);
    expect(preferences?.pushEnabled).toBe(true);
    expect(preferences?.escrowUpdates).toBe(true);
    expect(preferences?.documentSigning).toBe(true);
    expect(preferences?.propertyAlerts).toBe(true);
    expect(preferences?.messageNotifications).toBe(true);
    expect(preferences?.marketingEmails).toBe(false);
  });

  it("should update user preferences", async () => {
    await emailPreferenceService.updatePreferences(testUserId, {
      marketingEmails: true,
      smsEnabled: true,
    });

    const preferences = await emailPreferenceService.getPreferences(testUserId);

    expect(preferences?.marketingEmails).toBe(true);
    expect(preferences?.smsEnabled).toBe(true);
    // Other preferences should remain unchanged
    expect(preferences?.emailEnabled).toBe(true);
  });

  it("should check specific category preference", async () => {
    const escrowEnabled = await emailPreferenceService.checkPreference(testUserId, "escrow");
    expect(escrowEnabled).toBe(true);

    const propertyEnabled = await emailPreferenceService.checkPreference(testUserId, "property");
    expect(propertyEnabled).toBe(true);
  });

  it("should respect global email enabled setting", async () => {
    // Disable email globally
    await emailPreferenceService.updatePreferences(testUserId, {
      emailEnabled: false,
    });

    // Even though category is enabled, global setting should override
    const escrowEnabled = await emailPreferenceService.checkPreference(testUserId, "escrow");
    expect(escrowEnabled).toBe(false);

    // Re-enable email
    await emailPreferenceService.updatePreferences(testUserId, {
      emailEnabled: true,
    });
  });

  it("should unsubscribe from all notifications", async () => {
    await emailPreferenceService.unsubscribeAll(testUserId);

    const preferences = await emailPreferenceService.getPreferences(testUserId);

    expect(preferences?.emailEnabled).toBe(false);
    expect(preferences?.smsEnabled).toBe(false);
    expect(preferences?.pushEnabled).toBe(false);
    expect(preferences?.escrowUpdates).toBe(false);
    expect(preferences?.documentSigning).toBe(false);
    expect(preferences?.propertyAlerts).toBe(false);
    expect(preferences?.messageNotifications).toBe(false);
    expect(preferences?.marketingEmails).toBe(false);
  });

  it("should handle non-existent user gracefully", async () => {
    const nonExistentUserId = 99999;

    // Should create default preferences if they don't exist
    const preferences = await emailPreferenceService.getPreferences(nonExistentUserId);

    expect(preferences).toBeDefined();
    expect(preferences?.userId).toBe(nonExistentUserId);
  });

  it("should update partial preferences without affecting others", async () => {
    const newUserId = 10000;
    await emailPreferenceService.createDefaultPreferences(newUserId);

    // Update only one preference
    await emailPreferenceService.updatePreferences(newUserId, {
      propertyAlerts: false,
    });

    const preferences = await emailPreferenceService.getPreferences(newUserId);

    expect(preferences?.propertyAlerts).toBe(false);
    // Others should remain at default
    expect(preferences?.emailEnabled).toBe(true);
    expect(preferences?.escrowUpdates).toBe(true);
    expect(preferences?.documentSigning).toBe(true);
  });

  it("should allow unknown categories by default", async () => {
    const unknownCategory = await emailPreferenceService.checkPreference(
      testUserId,
      "unknown_category"
    );

    // Should allow unknown categories by default (after re-enabling email)
    await emailPreferenceService.updatePreferences(testUserId, {
      emailEnabled: true,
    });

    const unknownCategoryAfterEnable = await emailPreferenceService.checkPreference(
      testUserId,
      "unknown_category"
    );

    expect(unknownCategoryAfterEnable).toBe(true);
  });
});
