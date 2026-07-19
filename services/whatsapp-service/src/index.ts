import express from 'express';
import { WhatsAppClient } from './whatsapp-client';
import { MessageQueue } from './message-queue';
import { BookingEventConsumer } from './kafka-consumer';
import logger from './logger';

const app = express();
const port = process.env.PORT || 3007;

app.use(express.json());

// Initialize WhatsApp client
const whatsappClient = new WhatsAppClient(
  process.env.WHATSAPP_ACCESS_TOKEN!,
  process.env.WHATSAPP_PHONE_NUMBER_ID!
);

// Initialize message queue
const messageQueue = new MessageQueue(
  whatsappClient,
  process.env.REDIS_URL || 'redis://localhost:6379'
);

// Initialize Kafka consumer
const kafkaConsumer = new BookingEventConsumer(
  (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  messageQueue
);

// Webhook verification (required by WhatsApp)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Webhook for incoming messages
app.post('/webhook', async (req, res) => {
  try {
    const { entry } = req.body;
    
    if (entry && entry[0].changes) {
      const change = entry[0].changes[0];
      const { messages } = change.value;
      
      if (messages && messages[0]) {
        const message = messages[0];
        logger.info('Received message', {
          from: message.from,
          type: message.type,
          text: message.text?.body,
        });
        
        // Mark as read
        await whatsappClient.markAsRead(message.id);
        
        // Handle incoming message (e.g., forward to host)
        // Implementation depends on your business logic
      }
    }
    
    res.sendStatus(200);
  } catch (error: any) {
    logger.error('Webhook error', { error: error.message });
    res.sendStatus(500);
  }
});

// Manual send endpoint (for testing)
app.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    await messageQueue.addMessage({
      to,
      type: 'text',
      content: message,
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Queue stats endpoint
app.get('/stats', async (req, res) => {
  try {
    const stats = await messageQueue.getQueueStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'whatsapp-service' });
});

// Start server
async function start() {
  try {
    await kafkaConsumer.start();
    
    app.listen(port, () => {
      logger.info(`WhatsApp Service running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await kafkaConsumer.stop();
  process.exit(0);
});

start();
