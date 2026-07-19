import express from 'express';
import { AppDataSource } from './config/database';
import { connectKafka } from './config/kafka';
import { logger } from './config/logger';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3008;

app.use(express.json());
app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'verification-service' });
});

async function start() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected');

    await connectKafka();
    logger.info('Kafka connected');

    app.listen(PORT, () => {
      logger.info(`Verification service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start service:', error);
    process.exit(1);
  }
}

start();
