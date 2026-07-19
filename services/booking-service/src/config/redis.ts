import { createClient } from 'redis';
import logger from '../utils/logger';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

export async function initRedis() {
  await redisClient.connect();
  logger.info('Redis client connected');
}

export { redisClient };
