/**
 * Apply Geospatial Migration
 * Applies database indexes and tables for geospatial optimization
 */

import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function applyMigration() {
  console.log('='.repeat(60));
  console.log('Applying Geospatial Migration');
  console.log('='.repeat(60));

  let connection;

  try {
    // Connect to database
    console.log('\n📡 Connecting to database...');
    connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ Connected successfully');

    // Read migration file
    const migrationPath = path.join(__dirname, '../drizzle/migrations/add_geospatial_indexes.sql');
    console.log(`\n📄 Reading migration file: ${migrationPath}`);
    
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    // Split SQL into individual statements (handle multi-line statements)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('COMMENT'));

    console.log(`\n🔧 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
      
      try {
        await connection.execute(statement);
        successCount++;
        console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
      } catch (error) {
        // Check if error is due to already existing index/column
        if (
          error.message.includes('Duplicate column name') ||
          error.message.includes('Duplicate key name') ||
          error.message.includes('already exists') ||
          error.message.includes('Multiple primary key')
        ) {
          skipCount++;
          console.log(`⏭️  [${i + 1}/${statements.length}] ${preview}... (already exists)`);
        } else {
          errorCount++;
          console.error(`❌ [${i + 1}/${statements.length}] ${preview}...`);
          console.error(`   Error: ${error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary:');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ⏭️  Skipped: ${skipCount} (already exists)`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));

    if (errorCount > 0) {
      console.log('\n⚠️  Migration completed with errors. Review above for details.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📡 Database connection closed');
    }
  }
}

// Run migration
applyMigration();
