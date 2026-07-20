/**
 * Fluvio Streaming Consumer
 * Consumes events from Fluvio topics for real-time analytics and notifications.
 * Falls back to polling the fluvio_events PostgreSQL table when Fluvio is unavailable.
 */
import { logger } from "../_core/logger";

const FLUVIO_ENDPOINT = process.env.FLUVIO_ENDPOINT || "";
const FLUVIO_API_KEY = process.env.FLUVIO_API_KEY || "";
const FLUVIO_ENABLED = !!FLUVIO_ENDPOINT;

type EventHandler = (event: Record<string, unknown>) => Promise<void>;

class FluvioConsumer {
  private handlers: Map<string, EventHandler[]> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private offsets: Map<string, number> = new Map();

  on(topic: string, handler: EventHandler): void {
    if (!this.handlers.has(topic)) this.handlers.set(topic, []);
    this.handlers.get(topic)!.push(handler);
  }

  async start(): Promise<void> {
    if (FLUVIO_ENABLED) {
      await this.startFluvioConsumers();
    } else {
      logger.info("[FluvioConsumer] Fluvio not configured — using DB polling fallback");
      await this.startDBPolling();
    }
  }

  private async startFluvioConsumers(): Promise<void> {
    for (const [topic] of this.handlers) {
      try {
        // Fluvio HTTP consumer (long-poll)
        this.pollFluvioTopic(topic);
        logger.info(`[FluvioConsumer] Started consumer for topic: ${topic}`);
      } catch (err) {
        logger.error(`[FluvioConsumer] Failed to start consumer for ${topic}`, { error: String(err) });
      }
    }
  }

  private async pollFluvioTopic(topic: string): Promise<void> {
    const offset = this.offsets.get(topic) ?? 0;
    try {
      const response = await fetch(
        `${FLUVIO_ENDPOINT}/topics/${topic}/consume?offset=${offset}&max_records=100`,
        {
          headers: { "Authorization": `Bearer ${FLUVIO_API_KEY}` },
          signal: AbortSignal.timeout(30000),
        }
      );
      if (response.ok) {
        const records = await response.json() as Array<{ offset: number; value: string }>;
        for (const record of records) {
          try {
            const event = JSON.parse(record.value);
            const handlers = this.handlers.get(topic) ?? [];
            for (const handler of handlers) await handler(event);
            this.offsets.set(topic, record.offset + 1);
          } catch (err) {
            logger.warn(`[FluvioConsumer] Handler error for ${topic}`, { error: String(err) });
          }
        }
      }
    } catch (err) {
      logger.debug(`[FluvioConsumer] Poll failed for ${topic}`, { error: String(err) });
    }
    // Schedule next poll
    setTimeout(() => this.pollFluvioTopic(topic), 1000);
  }

  private async startDBPolling(): Promise<void> {
    // Poll fluvio_events table every 5 seconds for unprocessed events
    const interval = setInterval(async () => {
      try {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) return;
        // Process pending events from DB
        const { sql } = await import("drizzle-orm");
        const pending = await db.execute(sql`
          SELECT id, topic, payload, created_at
          FROM fluvio_events
          WHERE status = 'pending'
          ORDER BY created_at ASC
          LIMIT 50
        `);
        for (const row of pending.rows as Array<{ id: string; topic: string; payload: string }>) {
          const handlers = this.handlers.get(row.topic) ?? [];
          try {
            const event = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
            for (const handler of handlers) await handler(event);
            await db.execute(sql`UPDATE fluvio_events SET status = 'processed' WHERE id = ${row.id}`);
          } catch (err) {
            await db.execute(sql`UPDATE fluvio_events SET status = 'failed' WHERE id = ${row.id}`);
            logger.warn(`[FluvioConsumer] DB event handler failed`, { id: row.id, error: String(err) });
          }
        }
      } catch (err) {
        logger.debug("[FluvioConsumer] DB poll error", { error: String(err) });
      }
    }, 5000);
    this.pollingIntervals.set("db-fallback", interval);
    logger.info("[FluvioConsumer] DB polling fallback started (5s interval)");
  }

  async stop(): Promise<void> {
    for (const [key, interval] of this.pollingIntervals) {
      clearInterval(interval);
      this.pollingIntervals.delete(key);
    }
    logger.info("[FluvioConsumer] Stopped");
  }
}

export const fluvioConsumer = new FluvioConsumer();

export async function registerDefaultFluvioHandlers(): Promise<void> {
  // Property views → real-time analytics
  fluvioConsumer.on("property-views", async (event) => {
    logger.debug("[FluvioConsumer] Property view", { propertyId: event.propertyId });
    // Update real-time view counter in Redis
    try {
      const { redis } = await import("../_core/redis");
      await redis.increment(`property:views:${event.propertyId}`);
    } catch { /* Redis optional */ }
  });

  // Price changes → alert evaluation
  fluvioConsumer.on("price-changes", async (event) => {
    logger.info("[FluvioConsumer] Price change detected", {
      propertyId: event.propertyId,
      oldPrice: event.oldPrice,
      newPrice: event.newPrice,
    });
  });

  // Transactions → audit trail
  fluvioConsumer.on("transactions", async (event) => {
    logger.info("[FluvioConsumer] Transaction event", {
      transactionId: event.transactionId,
      type: event.type,
      amount: event.amount,
    });
  });

  logger.info("[FluvioConsumer] Default handlers registered");
}
