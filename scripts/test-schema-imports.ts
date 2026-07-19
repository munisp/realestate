/**
 * Test script to isolate which schema file is causing TypeScript compiler crash
 */

const schemaFiles = [
  'schema.ts',
  'gnn_schema.ts',
  'schema-hybrid-valuation.ts',
  'schema-valuations.ts',
  'schema-valuation-alerts.ts',
  'schema-valuation-analytics.ts',
  'monitoring-schema.ts',
  'schema-map-analytics.ts',
  'email-delivery-schema.ts',
  'schema-email-delivery.ts',
];

async function testSchemaImport(filename: string) {
  console.log(`\n=== Testing ${filename} ===`);
  try {
    const module = await import(`../drizzle/${filename}`);
    console.log(`✅ ${filename} imported successfully`);
    console.log(`   Exports: ${Object.keys(module).length} items`);
    return true;
  } catch (error) {
    console.error(`❌ ${filename} failed to import:`);
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  console.log('Starting schema import tests...\n');
  
  const results: Record<string, boolean> = {};
  
  for (const file of schemaFiles) {
    results[file] = await testSchemaImport(file);
  }
  
  console.log('\n=== Summary ===');
  const passed = Object.values(results).filter(r => r).length;
  const failed = Object.values(results).filter(r => !r).length;
  
  console.log(`Passed: ${passed}/${schemaFiles.length}`);
  console.log(`Failed: ${failed}/${schemaFiles.length}`);
  
  if (failed > 0) {
    console.log('\nFailed files:');
    Object.entries(results).forEach(([file, success]) => {
      if (!success) console.log(`  - ${file}`);
    });
  }
}

main().catch(console.error);
