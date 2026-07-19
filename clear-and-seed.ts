import { Pool } from 'pg';

async function clearAndSeed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const connection = pool;
  
  console.log('🗑️  Clearing existing properties...');
  await connection.query('DELETE FROM properties');
  console.log('✅ Properties cleared');
  
  await pool.end();
  
  // Now run the seed script
  console.log('\n🌱 Starting seeding...\n');
}

clearAndSeed().then(() => {
  // Import and run seed
  import('./scripts/seed-properties.js').then(m => m.seedProperties());
}).catch(console.error);
