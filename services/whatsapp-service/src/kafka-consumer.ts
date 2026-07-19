import { Kafka, Consumer } from 'kafkajs';
import { MessageQueue } from './message-queue';
import { formatBookingConfirmation, formatCheckInInstructions, formatReviewRequest } from './templates';
import logger from './logger';

export class BookingEventConsumer {
  private consumer: Consumer;
  private messageQueue: MessageQueue;

  constructor(kafkaBrokers: string[], messageQueue: MessageQueue) {
    this.messageQueue = messageQueue;

    const kafka = new Kafka({
      clientId: 'whatsapp-service',
      brokers: kafkaBrokers,
    });

    this.consumer = kafka.consumer({ groupId: 'whatsapp-service-group' });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'booking-events', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await this.handleBookingEvent(event);
        } catch (error: any) {
          logger.error('Failed to process booking event', { error: error.message });
        }
      },
    });

    logger.info('Kafka consumer started');
  }

  private async handleBookingEvent(event: any): Promise<void> {
    const { eventType, data } = event;

    switch (eventType) {
      case 'booking.confirmed':
        await this.sendBookingConfirmation(data);
        break;
      
      case 'booking.check_in_ready':
        await this.sendCheckInInstructions(data);
        break;
      
      case 'booking.checked_out':
        // Send review request 2 hours after checkout
        await this.scheduleReviewRequest(data, 2 * 60 * 60 * 1000);
        break;
      
      default:
        logger.debug('Unhandled event type', { eventType });
    }
  }

  private async sendBookingConfirmation(data: any): Promise<void> {
    const message = formatBookingConfirmation(
      data.guestName,
      data.propertyTitle,
      data.checkInDate,
      data.checkOutDate
    );

    await this.messageQueue.addMessage({
      to: data.guestPhone,
      type: 'text',
      content: message,
    });
  }

  private async sendCheckInInstructions(data: any): Promise<void> {
    const message = formatCheckInInstructions(
      data.guestName,
      data.propertyAddress,
      data.accessCode,
      data.wifiPassword
    );

    await this.messageQueue.addMessage({
      to: data.guestPhone,
      type: 'text',
      content: message,
    });
  }

  private async scheduleReviewRequest(data: any, delay: number): Promise<void> {
    const message = formatReviewRequest(
      data.guestName,
      data.propertyTitle
    );

    await this.messageQueue.addMessage({
      to: data.guestPhone,
      type: 'text',
      content: message,
    }, delay);
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
    logger.info('Kafka consumer stopped');
  }
}
