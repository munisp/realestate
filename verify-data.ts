import { Pool } from 'pg';

async function verifyData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const connection = pool;
  
  // Total count
  const [total] = await connection.query('SELECT COUNT(*) as count FROM properties');
  console.log(`✅ Total properties: ${(total as any)[0].count}`);
  
  // By city
  const [byCity] = await connection.query(`
    SELECT city, country, COUNT(*) as count 
    FROM properties 
    GROUP BY city, country 
    ORDER BY count DESC
  `);
  console.log('\n📍 Properties by city:');
  (byCity as any[]).forEach(row => {
    console.log(`  ${row.city}, ${row.country}: ${row.count} properties`);
  });
  
  // By property type
  const [byType] = await connection.query(`
    SELECT propertyType, COUNT(*) as count 
    FROM properties 
    GROUP BY propertyType
  `);
  console.log('\n🏠 Properties by type:');
  (byType as any[]).forEach(row => {
    console.log(`  ${row.propertyType}: ${row.count} properties`);
  });
  
  // Price range
  const [priceRange] = await connection.query(`
    SELECT 
      MIN(price) as min_price,
      MAX(price) as max_price,
      AVG(price) as avg_price
    FROM properties
  `);
  const pr = (priceRange as any)[0];
  console.log('\n💰 Price statistics:');
  console.log(`  Min: $${pr.min_price.toLocaleString()}`);
  console.log(`  Max: $${pr.max_price.toLocaleString()}`);
  console.log(`  Avg: $${Math.floor(pr.avg_price).toLocaleString()}`);
  
  await pool.end();
  process.exit(0);
}

verifyData().catch(console.error);
