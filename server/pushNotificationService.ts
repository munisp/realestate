import webpush from 'web-push';
import { getDb } from './db';
import { pushSubscriptions, pushNotificationLog, InsertPushNotificationLog } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// VAPID keys for Web Push (in production, these should be environment variables)
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBrXhqhHk9VcNEY4x8Ug';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6o18hgE6OlVKR7Ck1miAwqQ';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@realestate-platform.com';

// Configure web-push
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    propertyId?: number;
    messageId?: number;
    offerId?: number;
    [key: string]: any;
  };
  notificationType: 'property_alert' | 'new_message' | 'offer_update' | 'showing_reminder' | 'document_ready' | 'price_change' | 'new_listing' | 'system';
}

/**
 * Subscribe a user to push notifications
 */
export async function subscribeToPush(
  userId: number,
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  userAgent?: string
) {
  const db = await getDb();
  if (!db) {
    console.warn('[Push] Database not available');
    return null;
  }

  try {
    // Check if subscription already exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, subscription.endpoint)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent,
          isActive: 1,
          lastUsed: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existing[0].id));

      return existing[0];
    }

    // Create new subscription
    const deviceType = userAgent
      ? userAgent.toLowerCase().includes('mobile')
        ? 'mobile'
        : userAgent.toLowerCase().includes('tablet')
        ? 'tablet'
        : 'desktop'
      : 'unknown';

    const result = await db.insert(pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      deviceType,
      isActive: 1,
      lastUsed: new Date(),
    });

    return {
      id: Number(result.insertId),
      userId,
      endpoint: subscription.endpoint,
    };
  } catch (error) {
    console.error('[Push] Error subscribing:', error);
    throw error;
  }
}

/**
 * Unsubscribe a user from push notifications
 */
export async function unsubscribeFromPush(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) {
    console.warn('[Push] Database not available');
    return false;
  }

  try {
    await db
      .update(pushSubscriptions)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      );

    return true;
  } catch (error) {
    console.error('[Push] Error unsubscribing:', error);
    return false;
  }
}

/**
 * Get all active subscriptions for a user
 */
export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn('[Push] Database not available');
    return [];
  }

  try {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.isActive, 1)
        )
      );

    return subs;
  } catch (error) {
    console.error('[Push] Error getting subscriptions:', error);
    return [];
  }
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  userId: number,
  payload: PushNotificationPayload
) {
  const db = await getDb();
  if (!db) {
    console.warn('[Push] Database not available');
    return { sent: 0, failed: 0 };
  }

  try {
    // Get user's active subscriptions
    const subscriptions = await getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      console.log(`[Push] No active subscriptions for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Send to all user's devices
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        // Send the notification
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/logo.png',
            badge: payload.badge || '/badge.png',
            data: payload.data || {},
          })
        );

        // Log success
        await db.insert(pushNotificationLog).values({
          userId,
          subscriptionId: sub.id,
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          badge: payload.badge,
          data: JSON.stringify(payload.data || {}),
          notificationType: payload.notificationType,
          status: 'sent',
        });

        // Update last used timestamp
        await db
          .update(pushSubscriptions)
          .set({ lastUsed: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));

        sent++;
      } catch (error: any) {
        console.error(`[Push] Error sending to subscription ${sub.id}:`, error);

        // Log failure
        await db.insert(pushNotificationLog).values({
          userId,
          subscriptionId: sub.id,
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          badge: payload.badge,
          data: JSON.stringify(payload.data || {}),
          notificationType: payload.notificationType,
          status: 'failed',
          errorMessage: error.message || 'Unknown error',
        });

        // If subscription is invalid (410 Gone), mark as inactive
        if (error.statusCode === 410) {
          await db
            .update(pushSubscriptions)
            .set({ isActive: 0 })
            .where(eq(pushSubscriptions.id, sub.id));
        }

        failed++;
      }
    }

    return { sent, failed };
  } catch (error) {
    console.error('[Push] Error sending notifications:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendBulkPushNotification(
  userIds: number[],
  payload: PushNotificationPayload
) {
  const results = await Promise.all(
    userIds.map((userId) => sendPushNotification(userId, payload))
  );

  const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

  return { sent: totalSent, failed: totalFailed };
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

/**
 * Log notification click
 */
export async function logNotificationClick(notificationId: number) {
  const db = await getDb();
  if (!db) {
    console.warn('[Push] Database not available');
    return false;
  }

  try {
    await db
      .update(pushNotificationLog)
      .set({ status: 'clicked', clickedAt: new Date() })
      .where(eq(pushNotificationLog.id, notificationId));

    return true;
  } catch (error) {
    console.error('[Push] Error logging click:', error);
    return false;
  }
}
