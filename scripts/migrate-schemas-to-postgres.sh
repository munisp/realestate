#!/bin/bash
# Automated PostgreSQL Schema Migration Script

SCHEMA_DIR="/home/ubuntu/realestate-platform/drizzle"
BACKUP_DIR="$SCHEMA_DIR/mysql_backups_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

# List of schema files to migrate (excluding backups)
SCHEMA_FILES=(
  "email-delivery-schema.ts"
  "gnn_schema.ts"
  "monitoring-schema.ts"
  "schema-email-delivery.ts"
  "schema-hybrid-valuation.ts"
  "schema-map-analytics.ts"
  "schema-valuation-alerts.ts"
  "schema-valuation-analytics.ts"
  "schema-valuations.ts"
)

echo "Starting PostgreSQL migration for ${#SCHEMA_FILES[@]} schema files..."

for file in "${SCHEMA_FILES[@]}"; do
  filepath="$SCHEMA_DIR/$file"
  
  if [ ! -f "$filepath" ]; then
    echo "⚠️  Skipping $file (not found)"
    continue
  fi
  
  echo "📝 Migrating $file..."
  
  # Backup original
  cp "$filepath" "$BACKUP_DIR/$file"
  
  # Perform migrations
  sed -i 's/import { mysqlTable, mysqlEnum, int, varchar, text, timestamp, decimal, boolean, json, index, uniqueIndex } from "drizzle-orm\/mysql-core";/import { pgTable, pgEnum, serial, varchar, text, timestamp, decimal, boolean, json, index, uniqueIndex, integer, real } from "drizzle-orm\/pg-core";/g' "$filepath"
  
  sed -i 's/from "drizzle-orm\/mysql-core"/from "drizzle-orm\/pg-core"/g' "$filepath"
  sed -i 's/mysqlTable/pgTable/g' "$filepath"
  sed -i 's/mysqlEnum/pgEnum/g' "$filepath"
  sed -i 's/\.autoincrement()/.generatedAlwaysAsIdentity()/g' "$filepath"
  sed -i 's/int(/integer(/g' "$filepath"
  sed -i 's/\.onUpdateNow()//g' "$filepath"
  
  echo "✅ Migrated $file"
done

echo ""
echo "✅ Migration complete!"
echo "📁 Backups saved to: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff drizzle/"
echo "2. Test database connection"
echo "3. Run: pnpm db:push"
