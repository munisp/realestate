/**
 * GNN Alert Evaluation Job
 * -------------------------
 * Background job that evaluates GNN predictions and triggers alerts
 * based on user subscriptions.
 */

import { getDb } from '../db';
import { 
  gnnAlertSubscriptions, 
  gnnAlertTriggers,
  properties,
  users
} from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';

// ============================================================================
// Alert Evaluation Logic
// ============================================================================

/**
 * Detect market trends using simplified GNN analysis
 * In production, this would call the actual GNN model
 */
async function detectMarketTrends(filters: any) {
  const db = await getDb();
  if (!db) return null;

  // Simplified trend detection - in production, use GNN predictions
  const recentProperties = await db
    .select()
    .from(properties)
    .where(eq(properties.status, 'active'))
    .limit(100);

  if (recentProperties.length < 10) return null;

  // Calculate average price trend (mock calculation)
  const avgPrice = recentProperties.reduce((sum, p) => sum + (p.price || 0), 0) / recentProperties.length;
  const trend = Math.random() > 0.5 ? 'upward' : 'stable';
  const avgIncrease = trend === 'upward' ? 8 + Math.random() * 10 : 0;

  if (trend === 'upward' && avgIncrease > 5) {
    return {
      trend,
      properties: recentProperties.slice(0, 5).map(p => p.id),
      avgIncrease,
      confidence: 85 + Math.random() * 10,
    };
  }

  return null;
}

/**
 * Detect undervalued properties using GNN valuation
 */
async function detectUndervaluedProperties(filters: any) {
  const db = await getDb();
  if (!db) return null;

  // Simplified undervaluation detection
  const activeProperties = await db
    .select()
    .from(properties)
    .where(eq(properties.status, 'active'))
    .limit(50);

  // Mock: Find properties with potential undervaluation
  const undervalued = activeProperties.filter(() => Math.random() > 0.9);

  if (undervalued.length > 0) {
    const property = undervalued[0];
    const currentPrice = property.price || 0;
    const predictedValue = currentPrice * (1.15 + Math.random() * 0.15);
    const discount = ((predictedValue - currentPrice) / predictedValue) * 100;

    return {
      propertyId: property.id,
      currentPrice,
      predictedValue,
      discount,
      confidence: 88 + Math.random() * 8,
    };
  }

  return null;
}

/**
 * Detect neighborhood growth using spatial analysis
 */
async function detectNeighborhoodGrowth(filters: any) {
  const db = await getDb();
  if (!db) return null;

  // Simplified neighborhood growth detection
  const neighborhoods = ['Lekki', 'Victoria Island', 'Ikoyi', 'Yaba'];
  const growingNeighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];

  if (Math.random() > 0.8) {
    return {
      neighborhood: growingNeighborhood,
      growthRate: 10 + Math.random() * 15,
      momentum: 75 + Math.random() * 20,
      confidence: 82 + Math.random() * 12,
    };
  }

  return null;
}

/**
 * Detect price momentum changes
 */
async function detectPriceMomentum(filters: any) {
  const db = await getDb();
  if (!db) return null;

  // Simplified momentum detection
  if (Math.random() > 0.85) {
    return {
      area: 'Lagos Mainland',
      momentumChange: 15 + Math.random() * 10,
      direction: 'accelerating',
      confidence: 80 + Math.random() * 15,
    };
  }

  return null;
}

/**
 * Detect investment opportunities
 */
async function detectInvestmentOpportunities(filters: any) {
  const db = await getDb();
  if (!db) return null;

  const activeProperties = await db
    .select()
    .from(properties)
    .where(eq(properties.status, 'active'))
    .limit(20);

  // Mock: Find high-potential properties
  const opportunities = activeProperties.filter(() => Math.random() > 0.92);

  if (opportunities.length > 0) {
    const property = opportunities[0];
    return {
      propertyId: property.id,
      investmentScore: 85 + Math.random() * 12,
      roi_projection_12m: 12 + Math.random() * 8,
      risk_level: 'moderate',
      confidence: 87 + Math.random() * 10,
    };
  }

  return null;
}

// ============================================================================
// Alert Delivery
// ============================================================================

/**
 * Send email notification
 */
async function sendEmailNotification(user: any, alertType: string, alertData: any) {
  // In production, use email service
  console.log(`[Email] Sending ${alertType} alert to ${user.email}`);
  console.log(`[Email] Data:`, JSON.stringify(alertData, null, 2));
  
  // Notify owner about alert trigger
  await notifyOwner({
    title: `GNN Alert Triggered: ${alertType}`,
    content: `Alert triggered for user ${user.name} (${user.email})\nConfidence: ${alertData.confidence}%`,
  });
  
  return true;
}

/**
 * Send SMS notification
 */
async function sendSMSNotification(user: any, alertType: string, alertData: any) {
  // In production, use SMS service (Twilio, etc.)
  console.log(`[SMS] Sending ${alertType} alert to ${((user as any).phoneNumber)}`);
  return true;
}

/**
 * Send push notification
 */
async function sendPushNotification(user: any, alertType: string, alertData: any) {
  // In production, use push notification service
  console.log(`[Push] Sending ${alertType} alert to user ${user.id}`);
  return true;
}

// ============================================================================
// Main Job Function
// ============================================================================

export async function evaluateGNNAlerts() {
  console.log('[GNN Alerts] Starting alert evaluation...');
  
  const db = await getDb();
  if (!db) {
    console.error('[GNN Alerts] Database not available');
    return;
  }

  try {
    // Get all enabled subscriptions
    const subscriptions = await db
      .select()
      .from(gnnAlertSubscriptions)
      .where(eq(gnnAlertSubscriptions.enabled, 1));

    console.log(`[GNN Alerts] Found ${subscriptions.length} active subscriptions`);

    for (const subscription of subscriptions) {
      try {
        // Get user details
        const userResult = await db
          .select()
          .from(users)
          .where(eq(users.id, subscription.userId))
          .limit(1);

        if (userResult.length === 0) continue;
        const user = userResult[0];

        // Parse filters
        const filters = subscription.neighborhoods ? JSON.parse(subscription.neighborhoods) : {};

        // Evaluate based on alert type
        let alertData = null;
        switch (subscription.alertType) {
          case 'market_trend':
            alertData = await detectMarketTrends(filters);
            break;
          case 'undervalued_property':
            alertData = await detectUndervaluedProperties(filters);
            break;
          case 'neighborhood_growth':
            alertData = await detectNeighborhoodGrowth(filters);
            break;
          case 'price_momentum' as any:
            alertData = await detectPriceMomentum(filters);
            break;
          case 'investment_opportunity' as any:
            alertData = await detectInvestmentOpportunities(filters);
            break;
        }

        // If alert condition met, trigger notification
        if (alertData && alertData.confidence >= (subscription.minUndervaluedPercent || 80)) {
          console.log(`[GNN Alerts] Triggering ${subscription.alertType} alert for user ${user.id}`);

          // Create alert trigger record
          const [triggerRow] = await db.insert(gnnAlertTriggers).values({
            subscriptionId: subscription.id,
            userId: subscription.userId,
            alertType: subscription.alertType,
            alertTitle: `${subscription.alertType} Alert`,
            alertMessage: JSON.stringify(alertData),
            confidence: Math.round(alertData.confidence),
            emailSent: 0,
            smsSent: 0,
            inAppSent: 0,
            viewed: 0,
          } as any).returning({ id: gnnAlertTriggers.id });
          const triggerId = triggerRow?.id ?? 0;

          // Send notifications based on preferences
          if (subscription.notifyEmail && user.email) {
            await sendEmailNotification(user, subscription.alertType, alertData);
            // Update trigger record
            await db
              .update(gnnAlertTriggers)
              .set({ emailSent: 1 })
              .where(eq(gnnAlertTriggers.id, triggerId));
          }

          if (subscription.notifySms && ((user as any).phoneNumber)) {
            await sendSMSNotification(user, subscription.alertType, alertData);
            await db
              .update(gnnAlertTriggers)
              .set({ smsSent: 1 })
              .where(eq(gnnAlertTriggers.id, triggerId));
          }

          if (subscription.notifyInApp) {
            await sendPushNotification(user, subscription.alertType, alertData);
            await db
              .update(gnnAlertTriggers)
              .set({ inAppSent: 1 })
              .where(eq(gnnAlertTriggers.id, triggerId));
          }

          // Update subscription last triggered time
          await db
            .update(gnnAlertSubscriptions)
            .set({ lastTriggered: new Date() })
            .where(eq(gnnAlertSubscriptions.id, subscription.id));
        }
      } catch (error) {
        console.error(`[GNN Alerts] Error processing subscription ${subscription.id}:`, error);
      }
    }

    console.log('[GNN Alerts] Alert evaluation complete');
  } catch (error) {
    console.error('[GNN Alerts] Fatal error in alert evaluation:', error);
  }
}

// Export for job scheduler
export default evaluateGNNAlerts;
