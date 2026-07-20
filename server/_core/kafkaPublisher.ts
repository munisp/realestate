/**
 * Kafka Event Publisher
 * Publishes domain events to Kafka topics for consumption by lakehouse and microservices
 */

import { Kafka, Producer, ProducerRecord, Message } from 'kafkajs';
import { logger } from "./logger";

// ============================================================================
// Configuration
// ============================================================================

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:29092').split(',');
const KAFKA_ENABLED = process.env.KAFKA_ENABLED === 'true' || process.env.NODE_ENV === 'production';
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'realestate-platform';

// Topic names
export const TOPICS = {
  PROPERTY_CREATED: 'property.created',
  PROPERTY_UPDATED: 'property.updated',
  PROPERTY_DELETED: 'property.deleted',
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_COMPLETED: 'transaction.completed',
  TRANSACTION_CANCELLED: 'transaction.cancelled',
  VALUATION_REQUESTED: 'valuation.requested',
  VALUATION_COMPLETED: 'valuation.completed',
  PAYMENT_PROCESSED: 'payment.processed',
  DOCUMENT_UPLOADED: 'document.uploaded',
  ESCROW_CREATED: 'escrow.created',
  ESCROW_RELEASED: 'escrow.released',
} as const;

// ============================================================================
// Event Schemas
// ============================================================================

interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
}

export interface PropertyCreatedEvent extends BaseEvent {
  eventType: 'property.created';
  data: {
    propertyId: string;
    userId: string;
    title: string;
    description: string;
    price: number;
    location: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      lat: number;
      lng: number;
    };
    features: {
      bedrooms: number;
      bathrooms: number;
      sqft: number;
      propertyType: string;
      yearBuilt?: number;
    };
  };
}

export interface PropertyUpdatedEvent extends BaseEvent {
  eventType: 'property.updated';
  data: {
    propertyId: string;
    userId: string;
    changes: Record<string, any>;
    previousValues: Record<string, any>;
  };
}

export interface UserRegisteredEvent extends BaseEvent {
  eventType: 'user.registered';
  data: {
    userId: string;
    email: string;
    name: string;
    role: string;
    registrationMethod: string;
  };
}

export interface TransactionCompletedEvent extends BaseEvent {
  eventType: 'transaction.completed';
  data: {
    transactionId: string;
    propertyId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    currency: string;
    completedAt: string;
  };
}

export interface ValuationRequestedEvent extends BaseEvent {
  eventType: 'valuation.requested';
  data: {
    valuationId: string;
    propertyId: string;
    requestedBy: string;
    features: Record<string, any>;
  };
}

// ============================================================================
// Kafka Publisher Class
// ============================================================================

class KafkaPublisher {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: KAFKA_BROKERS,
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
    });
  }

  /**
   * Connect to Kafka and initialize producer
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('[Kafka] Already connected');
      return;
    }

    if (!KAFKA_ENABLED) {
      logger.info('[Kafka] Disabled in development mode (set KAFKA_ENABLED=true to enable)');
      return;
    }

    try {
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000,
      });

      await this.producer.connect();
      this.isConnected = true;
      logger.info('[Kafka] Producer connected successfully');
    } catch (error) {
      logger.error('[Kafka] Failed to connect producer:', { error: String(error) });
      throw error;
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    if (this.producer && this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('[Kafka] Producer disconnected');
    }
  }

  /**
   * Publish a single event to a topic
   */
  async publishEvent<T extends BaseEvent>(
    topic: string,
    event: T,
    key?: string
  ): Promise<void> {
    if (!KAFKA_ENABLED) {
      logger.info(`[Kafka] Skipping event publish to ${topic} (Kafka disabled)`);
      return;
    }

    if (!this.producer || !this.isConnected) {
      logger.warn('[Kafka] Producer not connected, attempting to connect...');
      await this.connect();
    }

    if (!this.producer || !this.isConnected) {
      logger.warn(`[Kafka] Failed to connect, skipping event publish to ${topic}`);
      return;
    }

    try{
      const message: Message = {
        key: key || event.data?.['id'] || event.eventId,
        value: JSON.stringify(event),
        timestamp: new Date(event.timestamp).getTime().toString(),
        headers: {
          eventType: event.eventType,
          version: event.version,
        },
      };

      await this.producer!.send({
        topic,
        messages: [message],
      });

      console.log(`[Kafka] Published event to ${topic}:`, event.eventType);
    } catch (error) {
      logger.error(`[Kafka] Failed to publish event to ${topic}:`, { error: String(error) });
      throw error;
    }
  }

  /**
   * Publish multiple events in a batch
   */
  async publishBatch(records: ProducerRecord[]): Promise<void> {
    if (!this.producer || !this.isConnected) {
      await this.connect();
    }

    try {
      await this.producer!.sendBatch({
        topicMessages: records,
      });

      logger.info(`[Kafka] Published batch of ${records.length} events`);
    } catch (error) {
      logger.error('[Kafka] Failed to publish batch:', { error: String(error) });
      throw error;
    }
  }

  /**
   * Create a properly formatted event
   */
  private createEvent<T extends Omit<BaseEvent, 'eventId' | 'timestamp' | 'version'>>(
    eventType: string,
    data: any
  ): BaseEvent & T {
    return {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      timestamp: new Date().toISOString(),
      version: '1.0',
      data,
    } as BaseEvent & T;
  }

  // ============================================================================
  // Domain Event Publishers
  // ============================================================================

  async publishPropertyCreated(data: PropertyCreatedEvent['data']): Promise<void> {
    const event = this.createEvent<PropertyCreatedEvent>(
      TOPICS.PROPERTY_CREATED,
      data
    );
    await this.publishEvent(TOPICS.PROPERTY_CREATED, event, data.propertyId);
  }

  async publishPropertyUpdated(data: PropertyUpdatedEvent['data']): Promise<void> {
    const event = this.createEvent<PropertyUpdatedEvent>(
      TOPICS.PROPERTY_UPDATED,
      data
    );
    await this.publishEvent(TOPICS.PROPERTY_UPDATED, event, data.propertyId);
  }

  async publishUserRegistered(data: UserRegisteredEvent['data']): Promise<void> {
    const event = this.createEvent<UserRegisteredEvent>(
      TOPICS.USER_REGISTERED,
      data
    );
    await this.publishEvent(TOPICS.USER_REGISTERED, event, data.userId);
  }

  async publishTransactionCompleted(data: TransactionCompletedEvent['data']): Promise<void> {
    const event = this.createEvent<TransactionCompletedEvent>(
      TOPICS.TRANSACTION_COMPLETED,
      data
    );
    await this.publishEvent(TOPICS.TRANSACTION_COMPLETED, event, data.transactionId);
  }

  async publishValuationRequested(data: ValuationRequestedEvent['data']): Promise<void> {
    const event = this.createEvent<ValuationRequestedEvent>(
      TOPICS.VALUATION_REQUESTED,
      data
    );
    await this.publishEvent(TOPICS.VALUATION_REQUESTED, event, data.valuationId);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let publisherInstance: KafkaPublisher | null = null;

export function getKafkaPublisher(): KafkaPublisher {
  if (!publisherInstance) {
    publisherInstance = new KafkaPublisher();
  }
  return publisherInstance;
}

// Export singleton
export const kafkaPublisher = getKafkaPublisher();

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', async () => {
  logger.info('[Kafka] SIGTERM received, disconnecting...');
  if (publisherInstance) {
    await publisherInstance.disconnect();
  }
});

process.on('SIGINT', async () => {
  logger.info('[Kafka] SIGINT received, disconnecting...');
  if (publisherInstance) {
    await publisherInstance.disconnect();
  }
});
