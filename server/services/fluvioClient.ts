/**
 * Fluvio Streaming Client
 *
 * Provides a lightweight HTTP-based client for publishing events to Fluvio
 * streaming platform. Uses Fluvio's REST API endpoint when available,
 * with graceful degradation when Fluvio is not configured.
 *
 * Topics used by this platform:
 *   - property-views       : Property view/impression events
 *   - property-searches    : Search query events
 *   - transactions         : Payment and escrow events
 *   - alert-triggers       : GNN alert trigger events
 *   - user-activity        : User login, signup, profile events
 *   - price-changes        : Property price update events
 *
 * Environment variables:
 *   FLUVIO_ENDPOINT  - Fluvio REST API base URL (e.g., http://fluvio-sc:9003)
 *   FLUVIO_API_KEY   - API key for authentication (optional)
 */

import { getDb } from "../db";
import { fluvioEvents } from "../../drizzle/schema";
import { randomUUID } from "crypto";
import { logger } from "../_core/logger";

// ==================== CONFIGURATION ====================

const FLUVIO_ENDPOINT = process.env.FLUVIO_ENDPOINT ?? "";
const FLUVIO_API_KEY = process.env.FLUVIO_API_KEY ?? "";

// ==================== EVENT TYPES ====================

export type FluvioTopic =
  | "property-views"
  | "property-searches"
  | "transactions"
  | "alert-triggers"
  | "user-activity"
  | "price-changes";

export interface FluvioEventPayload {
  eventType: string;
  timestamp: string;
  source: string;
  data: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

// ==================== CLIENT ====================

/**
 * Publishes an event to a Fluvio topic.
 *
 * If Fluvio is not configured (FLUVIO_ENDPOINT is empty), the event is
 * persisted to the fluvio_events PostgreSQL table for later replay.
 *
 * @param topic - The Fluvio topic name
 * @param payload - The event payload
 * @returns true if published to Fluvio, false if stored locally
 */
export async function publishEvent(
  topic: FluvioTopic,
  payload: FluvioEventPayload
): Promise<boolean> {
  const eventId = randomUUID();
  const enrichedPayload = {
    ...payload,
    eventId,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  // Try to publish to Fluvio REST API
  if (FLUVIO_ENDPOINT) {
    try {
      const published = await publishToFluvio(topic, eventId, enrichedPayload);
      if (published) {
        // Record successful publish in DB for audit trail
        await recordFluvioEvent(eventId, topic, enrichedPayload, "published");
        return true;
      }
    } catch (error) {
      logger.error(`[Fluvio] Failed to publish to topic ${topic}:`, { error: String(error) });
    }
  }

  // Fallback: persist to PostgreSQL for later replay
  await recordFluvioEvent(eventId, topic, enrichedPayload, "pending");
  return false;
}

async function publishToFluvio(
  topic: string,
  eventId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const url = `${FLUVIO_ENDPOINT}/topics/${encodeURIComponent(topic)}/records`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Event-ID": eventId,
  };

  if (FLUVIO_API_KEY) {
    headers["Authorization"] = `Bearer ${FLUVIO_API_KEY}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ value: JSON.stringify(payload) }),
    signal: AbortSignal.timeout(5000), // 5 second timeout
  });

  return response.ok;
}

async function recordFluvioEvent(
  eventId: string,
  topic: string,
  payload: Record<string, unknown>,
  status: "published" | "pending" | "failed"
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(fluvioEvents).values({
      eventId,
      topic,
      partition: 0,
      payload,
      source: "realestate-server",
      status,
      processedAt: status === "published" ? new Date() : null,
    });
  } catch (error) {
    // Non-critical: log but don't throw
    logger.error(`[Fluvio] Failed to record event in DB:`, { error: String(error) });
  }
}

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Publishes a property view event to Fluvio.
 */
export async function publishPropertyView(
  propertyId: string,
  userId?: string,
  sessionId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await publishEvent("property-views", {
    eventType: "property.viewed",
    timestamp: new Date().toISOString(),
    source: "realestate-server",
    data: { propertyId, ...metadata },
    userId,
    sessionId,
  });
}

/**
 * Publishes a property search event to Fluvio.
 */
export async function publishPropertySearch(
  query: Record<string, unknown>,
  resultCount: number,
  userId?: string
): Promise<void> {
  await publishEvent("property-searches", {
    eventType: "property.searched",
    timestamp: new Date().toISOString(),
    source: "realestate-server",
    data: { query, resultCount },
    userId,
  });
}

/**
 * Publishes a transaction event to Fluvio.
 */
export async function publishTransactionEvent(
  transactionId: string,
  eventType: "created" | "escrow_held" | "released" | "refunded" | "failed",
  amount: number,
  currency: string,
  buyerId: string,
  sellerId: string
): Promise<void> {
  await publishEvent("transactions", {
    eventType: `transaction.${eventType}`,
    timestamp: new Date().toISOString(),
    source: "realestate-server",
    data: { transactionId, eventType, amount, currency, buyerId, sellerId },
    userId: buyerId,
  });
}

/**
 * Publishes an alert trigger event to Fluvio.
 */
export async function publishAlertTrigger(
  alertId: string,
  alertType: string,
  userId: string,
  propertyId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await publishEvent("alert-triggers", {
    eventType: "alert.triggered",
    timestamp: new Date().toISOString(),
    source: "realestate-server",
    data: { alertId, alertType, propertyId, ...metadata },
    userId,
  });
}

/**
 * Publishes a price change event to Fluvio.
 */
export async function publishPriceChange(
  propertyId: string,
  oldPrice: number,
  newPrice: number,
  currency: string
): Promise<void> {
  await publishEvent("price-changes", {
    eventType: "property.price_changed",
    timestamp: new Date().toISOString(),
    source: "realestate-server",
    data: {
      propertyId,
      oldPrice,
      newPrice,
      currency,
      changePercent: ((newPrice - oldPrice) / oldPrice) * 100,
    },
  });
}

/**
 * Returns true if Fluvio is configured and available.
 */
export function isFluvioConfigured(): boolean {
  return Boolean(FLUVIO_ENDPOINT);
}
