import Bull from 'bull';
import Redis from 'ioredis';
import { WhatsAppClient } from './whatsapp-client';
import logger from './logger';

export interface MessageJob {
  to: string;
  type: 'text' | 'template';
  content: string | any;
  templateName?: string;
  templateParams?: any;
}

export class MessageQueue {
  private queue: Bull.Queue;
  private whatsappClient: WhatsAppClient;

  constructor(whatsappClient: WhatsAppClient, redisUrl: string) {
    this.whatsappClient = whatsappClient;
    
    const redis = new Redis(redisUrl);
    
    this.queue = new Bull('whatsapp-messages', {
      redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.queue.process(async (job) => {
      return this.processMessage(job.data);
    });

    this.queue.on('failed', (job, err) => {
      logger.error('Message job failed', {
        jobId: job.id,
        error: err.message,
        data: job.data,
      });
    });

    this.queue.on('completed', (job) => {
      logger.info('Message sent successfully', {
        jobId: job.id,
        to: job.data.to,
      });
    });
  }

  async addMessage(message: MessageJob, delay?: number): Promise<void> {
    await this.queue.add(message, { delay });
    logger.info('Message added to queue', { to: message.to, delay });
  }

  private async processMessage(message: MessageJob): Promise<any> {
    try {
      if (message.type === 'text') {
        return await this.whatsappClient.sendTextMessage(message.to, message.content);
      } else if (message.type === 'template') {
        return await this.whatsappClient.sendTemplateMessage(
          message.to,
          message.templateName!,
          'en',
          message.templateParams
        );
      }
    } catch (error: any) {
      logger.error('Failed to send message', {
        to: message.to,
        error: error.message,
      });
      throw error;
    }
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
