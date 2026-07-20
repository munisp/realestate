/**
 * Kafka Consumer Group
 * Consumes domain events from all platform topics with DLQ, retry, and idempotency.
 *
 * Topics consumed:
 *   property.created / updated / deleted
 *   user.registered / updated
 *   transaction.created / completed / cancelled
 *   valuation.requested / completed
 *   payment.processed
 *   document.uploaded
 *   fraud.detected
 *   alert.triggered
 */
import { Kafka, Consumer, EachMessagePayload, KafkaMessage } from "kafkajs";
import { logger } from "./logger";
import { TOPICS } from "./kafkaPublisher";

// ── Configuration ─────────────────────────────────────────────────────────────
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:29092").split(",");
const KAFKA_ENABLED = process.env.KAFKA_ENABLED === "true" || process.env.NODE_ENV === "production";
const CONSUMER_GROUP_ID = process.env.KAFKA_CONSUMER_GROUP || "realestate-platform-consumers";
const DLQ_TOPIC_SUFFIX = ".dlq";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ── Types ─────────────────────────────────────────────────────────────────────
export type EventHandler = (payload: Record<string, unknown>, key: string | null) => Promise<void>;

interface HandlerRegistry {
  [topic: string]: EventHandler[];
}

interface ProcessedEvent {
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  processedAt: number;
}

// ── In-memory idempotency cache (use Redis in production) ─────────────────────
const processedEvents = new Map<string, ProcessedEvent>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getEventId(topic: string, partition: number, offset: string): string {
  return `${topic}:${partition}:${offset}`;
}

function isAlreadyProcessed(eventId: string): boolean {
  const record = processedEvents.get(eventId);
  if (!record) return false;
  if (Date.now() - record.processedAt > IDEMPOTENCY_TTL_MS) {
    processedEvents.delete(eventId);
    return false;
  }
  return true;
}

function markProcessed(eventId: string, topic: string, partition: number, offset: string, key: string | null): void {
  processedEvents.set(eventId, { topic, partition, offset, key, processedAt: Date.now() });
  // Prune old entries periodically
  if (processedEvents.size > 10000) {
    const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
    for (const [id, record] of processedEvents.entries()) {
      if (record.processedAt < cutoff) processedEvents.delete(id);
    }
  }
}

// ── Consumer class ────────────────────────────────────────────────────────────
class KafkaConsumerManager {
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;
  private dlqProducer: import("kafkajs").Producer | null = null;
  private handlers: HandlerRegistry = {};
  private running = false;

  constructor() {
    if (KAFKA_ENABLED) {
      this.kafka = new Kafka({
        clientId: `${process.env.KAFKA_CLIENT_ID || "realestate-platform"}-consumer`,
        brokers: KAFKA_BROKERS,
        retry: { initialRetryTime: 300, retries: 8 },
      });
    }
  }

  /** Register a handler for a specific topic */
  on(topic: string, handler: EventHandler): void {
    if (!this.handlers[topic]) this.handlers[topic] = [];
    this.handlers[topic].push(handler);
  }

  /** Start consuming all registered topics */
  async start(): Promise<void> {
    if (!KAFKA_ENABLED || !this.kafka) {
      logger.info("[KafkaConsumer] Disabled — skipping consumer startup");
      return;
    }
    if (this.running) return;

    const topics = Object.keys(this.handlers);
    if (topics.length === 0) {
      logger.warn("[KafkaConsumer] No handlers registered — not starting consumer");
      return;
    }

    try {
      this.consumer = this.kafka.consumer({ groupId: CONSUMER_GROUP_ID });
      this.dlqProducer = this.kafka.producer();

      await this.consumer.connect();
      await this.dlqProducer.connect();

      for (const topic of topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }

      this.running = true;
      logger.info(`[KafkaConsumer] Subscribed to ${topics.length} topics`, { topics });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.processMessage(payload);
        },
      });
    } catch (err) {
      logger.error("[KafkaConsumer] Failed to start", { error: String(err) });
    }
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const offset = message.offset;
    const key = message.key?.toString() ?? null;
    const eventId = getEventId(topic, partition, offset);

    // Idempotency check
    if (isAlreadyProcessed(eventId)) {
      logger.debug("[KafkaConsumer] Skipping duplicate event", { eventId });
      return;
    }

    let parsedValue: Record<string, unknown> = {};
    try {
      parsedValue = message.value ? JSON.parse(message.value.toString()) : {};
    } catch {
      logger.warn("[KafkaConsumer] Failed to parse message value", { topic, offset });
    }

    const handlers = this.handlers[topic] ?? [];
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        for (const handler of handlers) {
          await handler(parsedValue, key);
        }
        markProcessed(eventId, topic, partition, offset, key);
        return;
      } catch (err) {
        lastError = err as Error;
        logger.warn(`[KafkaConsumer] Handler failed (attempt ${attempt}/${MAX_RETRIES})`, {
          topic, offset, error: String(err),
        });
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
        }
      }
    }

    // All retries exhausted — send to DLQ
    await this.sendToDLQ(topic, message, lastError!);
  }

  private async sendToDLQ(topic: string, message: KafkaMessage, error: Error): Promise<void> {
    if (!this.dlqProducer) return;
    const dlqTopic = `${topic}${DLQ_TOPIC_SUFFIX}`;
    try {
      await this.dlqProducer.send({
        topic: dlqTopic,
        messages: [{
          key: message.key,
          value: message.value,
          headers: {
            ...message.headers,
            "x-original-topic": topic,
            "x-error": error.message,
            "x-failed-at": new Date().toISOString(),
            "x-retry-count": String(MAX_RETRIES),
          },
        }],
      });
      logger.error("[KafkaConsumer] Message sent to DLQ", { dlqTopic, error: error.message });
    } catch (dlqErr) {
      logger.error("[KafkaConsumer] Failed to send to DLQ", { dlqTopic, error: String(dlqErr) });
    }
  }

  async stop(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.running = false;
      logger.info("[KafkaConsumer] Consumer disconnected");
    }
    if (this.dlqProducer) {
      await this.dlqProducer.disconnect();
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
export const kafkaConsumer = new KafkaConsumerManager();

// ── Default event handlers ────────────────────────────────────────────────────
/**
 * Register all default platform event handlers.
 * Called once during server startup.
 */
export async function registerDefaultKafkaHandlers(): Promise<void> {
  // Property events → OpenSearch index sync
  kafkaConsumer.on(TOPICS.PROPERTY_CREATED, async (event) => {
    try {
      const { opensearch } = await import("./opensearch");
      await opensearch.indexProperty(event as any);
      logger.debug("[KafkaConsumer] Property indexed in OpenSearch", { id: event.id });
    } catch (err) {
      logger.warn("[KafkaConsumer] OpenSearch index failed", { error: String(err) });
    }
  });

  kafkaConsumer.on(TOPICS.PROPERTY_UPDATED, async (event) => {
    try {
      const { opensearch } = await import("./opensearch");
      if (event.id) await opensearch.updateProperty(String(event.id), event as any);
    } catch (err) {
      logger.warn("[KafkaConsumer] OpenSearch update failed", { error: String(err) });
    }
  });

  kafkaConsumer.on(TOPICS.PROPERTY_DELETED, async (event) => {
    try {
      const { opensearch } = await import("./opensearch");
      if (event.id) await opensearch.deleteProperty(String(event.id));
    } catch (err) {
      logger.warn("[KafkaConsumer] OpenSearch delete failed", { error: String(err) });
    }
  });

  // Transaction events → audit log
  kafkaConsumer.on(TOPICS.TRANSACTION_COMPLETED, async (event) => {
    logger.info("[KafkaConsumer] Transaction completed", {
      transactionId: event.transactionId,
      amount: event.amount,
      currency: event.currency,
    });
  });

  // Fraud events → alert + account suspension
  kafkaConsumer.on("fraud.detected", async (event) => {
    logger.warn("[KafkaConsumer] Fraud detected", {
      userId: event.userId,
      transactionId: event.transactionId,
      riskScore: event.riskScore,
    });
    // TODO: trigger account suspension workflow via Dapr
  });

  // Valuation completed → notify property owner
  kafkaConsumer.on(TOPICS.VALUATION_COMPLETED, async (event) => {
    logger.info("[KafkaConsumer] Valuation completed", {
      propertyId: event.propertyId,
      estimatedValue: event.estimatedValue,
    });
    // TODO: send push notification via notificationService
  });

  logger.info("[KafkaConsumer] Default handlers registered");
}
