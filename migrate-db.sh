#!/bin/bash
# Non-interactive database migration script

echo "Starting database migration..."

# Generate migration files
pnpm drizzle-kit generate --name init_schema 2>&1 | tee migration.log

# Apply migrations directly to database
pnpm drizzle-kit push 2>&1 | tee -a migration.log

echo "Migration complete. Check migration.log for details."
