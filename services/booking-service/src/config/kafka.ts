import { Kafka, Producer } from 'kafkajs';
import logger from '../utils/logger';

const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

let producer: Producer;

export async function initKafka() {
  producer = kafka.producer();
  await producer.connect();
  logger.info('Kafka producer connected');
}

export async function publishEvent(topic: string, message: any) {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    logger.info(`Event published to ${topic}`, { message });
  } catch (error) {
    logger.error('Failed to publish event', { topic, error });
    throw error;
  }
}

export { producer };
