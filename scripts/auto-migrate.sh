#!/bin/bash

# Automated Database Migration Script
# Handles interactive prompts automatically

set -e

echo "=== Real Estate Platform - Automated Database Migration ==="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    echo "Please set it in .env file or export it"
    exit 1
fi

echo "✓ Database URL configured"
echo ""

# Generate migration files
echo "📝 Generating migration files..."

# Use expect to handle interactive prompts
expect << 'EOF'
set timeout 300

spawn npx drizzle-kit generate

expect {
    "Is * column in * table created or renamed from another column?" {
        send "\r"
        exp_continue
    }
    "create column" {
        send "\r"
        exp_continue
    }
    "rename column" {
        send "\r"
        exp_continue
    }
    eof
}
EOF

echo "✓ Migration files generated"
echo ""

# Apply migrations
echo "📊 Applying migrations to database..."

npx drizzle-kit migrate

echo "✓ Migrations applied successfully"
echo ""

# Verify tables
echo "🔍 Verifying database tables..."

# Extract database connection details
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

if command -v psql &> /dev/null; then
    TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d " ")
    echo "✓ Found $TABLE_COUNT tables in database"
else
    echo "⚠ psql client not installed, skipping verification"
fi

echo ""
echo "=== Migration Complete ==="
echo ""
echo "Next steps:"
echo "1. Run: npx tsx scripts/seed-simple.ts"
echo "2. Start dev server: pnpm dev"
echo "3. Test the platform"
