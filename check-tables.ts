import { Pool } from 'pg';

async function checkTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const connection = pool;
  
  const [tables] = await connection.query('SHOW TABLES');
  console.log('📊 Existing tables in database:');
  console.log(tables);
  
  await pool.end();
  process.exit(0);
}

checkTables().catch(console.error);
