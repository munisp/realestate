// @ts-nocheck
/**
 * PostGIS Connection Pool Service
 * 
 * Manages PostgreSQL/PostGIS database connections for spatial queries
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from "../_core/logger";

// Singleton pool instance
let pool: Pool | null = null;

/**
 * Get or create PostGIS connection pool
 */
export function getPostGISPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGIS_HOST || 'localhost',
      port: parseInt(process.env.POSTGIS_PORT || '5432'),
      database: process.env.POSTGIS_DATABASE || 'realestate_spatial',
      user: process.env.POSTGIS_USER || 'postgres',
      password: process.env.POSTGIS_PASSWORD,
      max: parseInt(process.env.POSTGIS_POOL_MAX || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.POSTGIS_SSL === 'true' ? { rejectUnauthorized: true } : false,
    });

    // Error handler
    pool.on('error', (err) => {
      logger.error('[PostGIS] Unexpected error on idle client', { error: String(err) });
    });

    logger.info('[PostGIS] Connection pool created');
  }

  return pool;
}

/**
 * Execute a query with automatic connection management
 */
export async function queryPostGIS<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPostGISPool();
  try {
    const result = await pool.query<T>(text, params);
    return result;
  } catch (error) {
    logger.error('[PostGIS] Query error:', { error: String(error) });
    logger.error('[PostGIS] Query:', { error: String(text) });
    logger.error('[PostGIS] Params:', { error: String(params) });
    throw error;
  }
}

/**
 * Get a client from the pool for transaction support
 */
export async function getPostGISClient(): Promise<PoolClient> {
  const pool = getPostGISPool();
  return await pool.connect();
}

/**
 * Close the connection pool
 */
export async function closePostGISPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('[PostGIS] Connection pool closed');
  }
}

/**
 * Test PostGIS connection
 */
export async function testPostGISConnection(): Promise<{
  connected: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const result = await queryPostGIS('SELECT PostGIS_Version()');
    return {
      connected: true,
      version: result.rows[0].postgis_version,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closePostGISPool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePostGISPool();
  process.exit(0);
});
