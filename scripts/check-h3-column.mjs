/**
 * Check and Add H3 Index Column
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function checkAndAddH3Column() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Check if h3Index column exists
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM properties LIKE 'h3Index'"
    );
    
    if (columns.length === 0) {
      console.log('❌ h3Index column does not exist. Adding it now...');
      
      try {
        await connection.execute(
          "ALTER TABLE properties ADD COLUMN h3Index VARCHAR(20)"
        );
        console.log('✅ h3Index column added');
      } catch (e) {
        if (!e.message.includes('Duplicate column')) throw e;
        console.log('⏭️  h3Index column already exists');
      }
      
      try {
        await connection.execute(
          "ALTER TABLE properties ADD COLUMN h3Resolution INT DEFAULT 9"
        );
        console.log('✅ h3Resolution column added');
      } catch (e) {
        if (!e.message.includes('Duplicate column')) throw e;
        console.log('⏭️  h3Resolution column already exists');
      }
      
      console.log('✅ H3 columns ready');
    } else {
      console.log('✅ h3Index column already exists');
      console.log(columns);
    }
    
    // Check for indexes
    const [indexes] = await connection.execute(
      "SHOW INDEXES FROM properties WHERE Key_name LIKE '%h3%' OR Key_name LIKE '%lat%'"
    );
    
    console.log('\n📊 Existing geospatial indexes:');
    if (indexes.length > 0) {
      indexes.forEach(idx => {
        console.log(`  - ${idx.Key_name} on ${idx.Column_name}`);
      });
    } else {
      console.log('  (none found)');
    }
    
  } finally {
    await connection.end();
  }
}

checkAndAddH3Column();
