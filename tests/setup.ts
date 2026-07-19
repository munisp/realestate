import { beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

/**
 * Global test setup for PostgreSQL migration tests
 * This file is executed once before all test suites
 */

let globalPool: Pool | null = null;

beforeAll(async () => {
  console.log('🔧 Setting up test environment...');

  // Verify PostgreSQL connection
  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!testDbUrl) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for testing');
  }

  try {
    globalPool = new Pool({ connectionString: testDbUrl });
    const db = drizzle(globalPool);

    // Test connection
    await globalPool.query('SELECT 1');
    console.log('✅ PostgreSQL connection successful');

    // Check PostgreSQL version
    const versionResult = await globalPool.query('SELECT version()');
    console.log(`📊 PostgreSQL version: ${versionResult.rows[0].version.split(',')[0]}`);

    // Verify database exists
    const dbResult = await globalPool.query('SELECT current_database()');
    console.log(`📁 Connected to database: ${dbResult.rows[0].current_database}`);

    // Check if tables exist
    const tablesResult = await globalPool.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`📋 Tables in database: ${tablesResult.rows[0].table_count}`);

  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  if (globalPool) {
    await globalPool.end();
    console.log('✅ Database connections closed');
  }
});

// Export test utilities
export async function createTestDatabase() {
  if (!globalPool) {
    throw new Error('Global pool not initialized');
  }

  const testDbName = `test_db_${Date.now()}`;
  
  try {
    await globalPool.query(`CREATE DATABASE ${testDbName}`);
    console.log(`✅ Created test database: ${testDbName}`);
    return testDbName;
  } catch (error) {
    console.error(`❌ Failed to create test database: ${error}`);
    throw error;
  }
}

export async function dropTestDatabase(dbName: string) {
  if (!globalPool) {
    throw new Error('Global pool not initialized');
  }

  try {
    await globalPool.query(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log(`✅ Dropped test database: ${dbName}`);
  } catch (error) {
    console.error(`❌ Failed to drop test database: ${error}`);
    throw error;
  }
}

export async function truncateAllTables() {
  if (!globalPool) {
    throw new Error('Global pool not initialized');
  }

  try {
    // Get all table names
    const result = await globalPool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    const tables = result.rows.map(row => row.tablename);

    if (tables.length > 0) {
      // Truncate all tables
      await globalPool.query(`
        TRUNCATE TABLE ${tables.join(', ')} CASCADE
      `);
      console.log(`✅ Truncated ${tables.length} tables`);
    }
  } catch (error) {
    console.error(`❌ Failed to truncate tables: ${error}`);
    throw error;
  }
}

export function getTestDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
}

export function isPostgreSQL(): boolean {
  const dbUrl = getTestDatabaseUrl();
  return dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
}

// Verify we're using PostgreSQL
if (!isPostgreSQL()) {
  throw new Error('Tests must run against PostgreSQL database. Please set DATABASE_URL to a PostgreSQL connection string.');
}

console.log('✅ Test setup loaded - PostgreSQL migration tests ready');
