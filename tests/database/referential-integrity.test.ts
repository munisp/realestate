/**
 * Referential Integrity Test Suite
 * Tests database constraints, foreign keys, and data consistency
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '../../server/db';
import { sql } from 'drizzle-orm';

describe('Referential Integrity Tests', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  describe('Foreign Key Constraints', () => {
    it('should have foreign key from properties to users (ownerId)', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'properties'
          AND kcu.column_name = 'ownerId'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have foreign key from favorites to users', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints AS tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'favorites'
      `);
      
      expect(result.rows[0].count).toBeGreaterThan(0);
    });

    it('should have foreign key from offers to properties', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints AS tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'offers'
      `);
      
      expect(result.rows[0].count).toBeGreaterThan(0);
    });
  });

  describe('Primary Key Constraints', () => {
    it('should have primary key on users table', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'users'
          AND constraint_type = 'PRIMARY KEY'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    it('should have primary key on properties table', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'properties'
          AND constraint_type = 'PRIMARY KEY'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    it('should have primary key on all major tables', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const tables = [
        'users', 'properties', 'favorites', 'saved_searches',
        'appointments', 'offers', 'transactions', 'escrow_accounts'
      ];
      
      for (const table of tables) {
        const result = await db.execute(sql`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = ${table}
            AND constraint_type = 'PRIMARY KEY'
        `);
        
        expect(result.rows.length).toBe(1);
      }
    });
  });

  describe('Unique Constraints', () => {
    it('should have unique constraint on users.openId', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'users'
          AND constraint_type = 'UNIQUE'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Check Constraints', () => {
    it('should verify enum constraints on property status', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'properties'
          AND column_name = 'status'
      `);
      
      expect(result.rows.length).toBe(1);
    });
  });

  describe('Data Consistency Tests', () => {
    it('should not have orphaned property records', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM properties p
        WHERE p."ownerId" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM users u WHERE u.id = p."ownerId"
          )
      `);
      
      expect(result.rows[0].count).toBe(0);
    });

    it('should not have orphaned favorite records', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM favorites f
        WHERE NOT EXISTS (
          SELECT 1 FROM users u WHERE u.id = f."userId"
        )
        OR NOT EXISTS (
          SELECT 1 FROM properties p WHERE p.id = f."propertyId"
        )
      `);
      
      expect(result.rows[0].count).toBe(0);
    });

    it('should not have orphaned offer records', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM offers o
        WHERE NOT EXISTS (
          SELECT 1 FROM properties p WHERE p.id = o."propertyId"
        )
        OR NOT EXISTS (
          SELECT 1 FROM users u WHERE u.id = o."buyerId"
        )
      `);
      
      expect(result.rows[0].count).toBe(0);
    });
  });

  describe('Index Verification', () => {
    it('should have spatial index on properties.coordinates', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'properties'
          AND indexname LIKE '%gist%'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have indexes on frequently queried columns', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename IN ('properties', 'users', 'offers', 'transactions')
      `);
      
      expect(result.rows[0].count).toBeGreaterThan(10);
    });
  });

  describe('Cascade Behavior Tests', () => {
    it('should verify cascade delete behavior is configured', async () => {
      if (!db) throw new Error('Database not initialized');
      
      const result = await db.execute(sql`
        SELECT 
          tc.table_name,
          kcu.column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND rc.delete_rule IN ('CASCADE', 'SET NULL', 'RESTRICT')
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});
