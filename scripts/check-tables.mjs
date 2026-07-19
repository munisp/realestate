import { getDb } from '../server/db.js';

async function checkTables() {
  const db = await getDb();
  
  if (!db) {
    console.log('❌ Database not available');
    process.exit(1);
  }

  const tables = ['transactions', 'properties', 'users', 'favorites', 'savedSearches'];
  
  console.log('Checking database tables...\n');
  
  for (const table of tables) {
    try {
      const result = await db.execute(`SHOW TABLES LIKE '${table}'`);
      const exists = result.length > 0;
      console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'exists' : 'missing'}`);
    } catch (error) {
      console.log(`❌ ${table}: error - ${error.message}`);
    }
  }
}

checkTables().catch(console.error);
