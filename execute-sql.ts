import { Pool } from 'pg';
import fs from 'fs';

async function executeSql() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const connection = pool;
  
  const sql = fs.readFileSync('./scripts/create-properties-table.sql', 'utf-8');
  
  console.log('📝 Creating properties table...');
  await connection.query(sql);
  console.log('✅ Properties table created successfully!');
  
  // Verify table was created
  const [tables] = await connection.query("SHOW TABLES LIKE 'properties'");
  console.log('📊 Verification:', tables);
  
  await pool.end();
  process.exit(0);
}

executeSql().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
