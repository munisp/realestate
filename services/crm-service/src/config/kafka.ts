import { Kafka, Producer } from 'kafkajs';
import { logger } from './logger';

const kafka = new Kafka({
  clientId: 'crm-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export const kafkaProducer: Producer = kafka.producer();

export async function connectKafka() {
  try {
    await kafkaProducer.connect();
    logger.info('Kafka producer connected');
  } catch (error) {
    logger.error('Failed to connect Kafka producer:', error);
    throw error;
  }
}

export async function disconnectKafka() {
  await kafkaProducer.disconnect();
  logger.info('Kafka producer disconnected');
}
