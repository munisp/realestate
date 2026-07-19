import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { searchController } from './controllers/searchController';
import { initializeIndex, checkOpenSearchHealth } from './config/opensearch';
import { logger } from './config/logger';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const health = await checkOpenSearchHealth();
    res.json({
      status: 'healthy',
      service: 'search-service',
      opensearch: health.status,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'search-service',
      error: 'OpenSearch unavailable',
    });
  }
});

// Routes
app.post('/api/search', searchController.search.bind(searchController));
app.get('/api/autocomplete', searchController.autocomplete.bind(searchController));
app.post('/api/index', searchController.indexProperty.bind(searchController));
app.put('/api/index/:id', searchController.updateProperty.bind(searchController));
app.delete('/api/index/:id', searchController.deleteProperty.bind(searchController));
app.post('/api/bulk-index', searchController.bulkIndex.bind(searchController));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await initializeIndex();
    app.listen(PORT, () => {
      logger.info(`Search Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
