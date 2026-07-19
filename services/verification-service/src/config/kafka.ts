import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'verification-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export const kafkaProducer = kafka.producer();

export async function connectKafka() {
  await kafkaProducer.connect();
}
