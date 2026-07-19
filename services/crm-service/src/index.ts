import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { crmController } from './controllers/crmController';
import { AppDataSource } from './config/database';
import { connectKafka, disconnectKafka } from './config/kafka';
import { logger } from './config/logger';

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'crm-service' });
});

// Lead routes
app.post('/api/leads', crmController.createLead.bind(crmController));
app.put('/api/leads/:id', crmController.updateLead.bind(crmController));
app.get('/api/leads', crmController.getLeads.bind(crmController));
app.post('/api/leads/:id/convert', crmController.convertLead.bind(crmController));

// Contact routes
app.post('/api/contacts', crmController.createContact.bind(crmController));
app.put('/api/contacts/:id', crmController.updateContact.bind(crmController));
app.get('/api/contacts', crmController.getContacts.bind(crmController));

// Deal routes
app.post('/api/deals', crmController.createDeal.bind(crmController));
app.put('/api/deals/:id', crmController.updateDeal.bind(crmController));
app.post('/api/deals/:id/move', crmController.moveDealStage.bind(crmController));
app.get('/api/deals/by-stage', crmController.getDealsByStage.bind(crmController));

// Activity routes
app.post('/api/activities', crmController.createActivity.bind(crmController));
app.put('/api/activities/:id', crmController.updateActivity.bind(crmController));
app.get('/api/activities', crmController.getActivities.bind(crmController));

// Task routes
app.post('/api/tasks', crmController.createTask.bind(crmController));
app.put('/api/tasks/:id', crmController.updateTask.bind(crmController));
app.get('/api/tasks', crmController.getTasks.bind(crmController));

// Analytics routes
app.get('/api/analytics', crmController.getAnalytics.bind(crmController));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected');

    await connectKafka();

    app.listen(PORT, () => {
      logger.info(`CRM Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectKafka();
  await AppDataSource.destroy();
  process.exit(0);
});

start();
