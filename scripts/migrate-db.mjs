#!/usr/bin/env node

/**
 * Automated Database Migration Script
 * Runs drizzle-kit push with automatic responses to prompts
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('=== Real Estate Platform - Database Migration ===\n');

// Check DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  console.error('Please set it in .env file or export it\n');
  process.exit(1);
}

console.log('✓ Database URL configured\n');

console.log('📝 Running database migration...\n');

// Run drizzle-kit push
const drizzle = spawn('npx', ['drizzle-kit', 'push'], {
  cwd: projectRoot,
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true,
});

// Auto-respond to prompts by sending Enter key
let promptCount = 0;
const autoRespond = setInterval(() => {
  if (drizzle.stdin.writable) {
    drizzle.stdin.write('\n');
    promptCount++;
    if (promptCount > 100) {
      // Safety limit
      clearInterval(autoRespond);
    }
  }
}, 500);

drizzle.on('close', (code) => {
  clearInterval(autoRespond);
  
  if (code === 0) {
    console.log('\n✓ Migration completed successfully\n');
    console.log('Next steps:');
    console.log('1. Run: npx tsx scripts/seed-simple.ts');
    console.log('2. Start dev server: pnpm dev');
    console.log('3. Test the platform\n');
  } else {
    console.error(`\n❌ Migration failed with code ${code}\n`);
    process.exit(code);
  }
});

drizzle.on('error', (err) => {
  clearInterval(autoRespond);
  console.error('\n❌ Migration error:', err.message, '\n');
  process.exit(1);
});
