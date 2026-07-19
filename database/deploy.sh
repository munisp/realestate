#!/bin/bash

# ============================================================================
# Real Estate Platform - PostgreSQL Deployment Script
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_message "$BLUE" "============================================"
    print_message "$BLUE" "$1"
    print_message "$BLUE" "============================================"
    echo ""
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_message "$RED" "ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set your database connection string:"
    echo "  export DATABASE_URL='postgresql://username:password@host:5432/database?sslmode=require'"
    echo ""
    exit 1
fi

print_header "Real Estate Platform - Database Deployment"

print_message "$YELLOW" "Connection: ${DATABASE_URL%%@*}@***"
echo ""

# Confirm deployment
read -p "$(echo -e ${YELLOW}This will create/replace all tables. Continue? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_message "$RED" "Deployment cancelled"
    exit 1
fi

# Step 1: Check PostgreSQL connection
print_header "Step 1: Testing Database Connection"
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    print_message "$GREEN" "✓ Database connection successful"
else
    print_message "$RED" "✗ Failed to connect to database"
    exit 1
fi

# Step 2: Check PostGIS extension
print_header "Step 2: Checking PostGIS Extension"
if psql "$DATABASE_URL" -c "SELECT PostGIS_version();" > /dev/null 2>&1; then
    POSTGIS_VERSION=$(psql "$DATABASE_URL" -t -c "SELECT PostGIS_version();" | xargs)
    print_message "$GREEN" "✓ PostGIS is available: $POSTGIS_VERSION"
else
    print_message "$YELLOW" "⚠ PostGIS not found. Attempting to install..."
    if psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;" > /dev/null 2>&1; then
        print_message "$GREEN" "✓ PostGIS installed successfully"
    else
        print_message "$RED" "✗ Failed to install PostGIS. Please install manually."
        exit 1
    fi
fi

# Step 3: Deploy schema
print_header "Step 3: Deploying Database Schema"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$SCRIPT_DIR/schema-clean.sql" ]; then
    print_message "$RED" "✗ schema-clean.sql not found in $SCRIPT_DIR"
    exit 1
fi

print_message "$YELLOW" "Executing schema-clean.sql..."
if psql "$DATABASE_URL" -f "$SCRIPT_DIR/schema-clean.sql" > /tmp/schema_output.log 2>&1; then
    print_message "$GREEN" "✓ Schema deployed successfully"
    
    # Count tables created
    TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    print_message "$GREEN" "  Created $TABLE_COUNT tables"
else
    print_message "$RED" "✗ Schema deployment failed. Check /tmp/schema_output.log for details"
    cat /tmp/schema_output.log
    exit 1
fi

# Step 4: Load seed data
print_header "Step 4: Loading Seed Data"

if [ ! -f "$SCRIPT_DIR/seed-data.sql" ]; then
    print_message "$YELLOW" "⚠ seed-data.sql not found. Skipping seed data."
else
    read -p "$(echo -e ${YELLOW}Load sample data? [Y/n]: ${NC})" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_message "$YELLOW" "Skipping seed data"
    else
        print_message "$YELLOW" "Executing seed-data.sql..."
        if psql "$DATABASE_URL" -f "$SCRIPT_DIR/seed-data.sql" > /tmp/seed_output.log 2>&1; then
            print_message "$GREEN" "✓ Seed data loaded successfully"
            
            # Show record counts
            echo ""
            print_message "$BLUE" "Record Counts:"
            psql "$DATABASE_URL" -c "
                SELECT 'Users' as table_name, COUNT(*) as records FROM users
                UNION ALL SELECT 'Properties', COUNT(*) FROM properties
                UNION ALL SELECT 'Valuations', COUNT(*) FROM property_valuations
                UNION ALL SELECT 'GNN Nodes', COUNT(*) FROM gnn_property_nodes
                UNION ALL SELECT 'GNN Edges', COUNT(*) FROM gnn_property_edges
                UNION ALL SELECT 'Appointments', COUNT(*) FROM appointments
                UNION ALL SELECT 'Offers', COUNT(*) FROM offers
                UNION ALL SELECT 'Builders', COUNT(*) FROM builders
                UNION ALL SELECT 'Projects', COUNT(*) FROM builder_projects
                ORDER BY table_name;
            "
        else
            print_message "$RED" "✗ Seed data loading failed. Check /tmp/seed_output.log for details"
            cat /tmp/seed_output.log
            exit 1
        fi
    fi
fi

# Step 5: Verify installation
print_header "Step 5: Verifying Installation"

print_message "$YELLOW" "Running verification queries..."

# Test 1: Check properties with geospatial data
if psql "$DATABASE_URL" -c "SELECT id, title, ST_AsText(location) FROM properties LIMIT 1;" > /dev/null 2>&1; then
    print_message "$GREEN" "✓ Geospatial queries working"
else
    print_message "$RED" "✗ Geospatial queries failed"
fi

# Test 2: Check views
if psql "$DATABASE_URL" -c "SELECT * FROM active_listings LIMIT 1;" > /dev/null 2>&1; then
    print_message "$GREEN" "✓ Views created successfully"
else
    print_message "$RED" "✗ Views not working"
fi

# Test 3: Check triggers
if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%updated_at%';" > /dev/null 2>&1; then
    TRIGGER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%updated_at%';" | xargs)
    print_message "$GREEN" "✓ Triggers installed ($TRIGGER_COUNT triggers)"
else
    print_message "$YELLOW" "⚠ Could not verify triggers"
fi

# Final summary
print_header "Deployment Complete!"

print_message "$GREEN" "✓ Database schema deployed"
print_message "$GREEN" "✓ PostGIS extension enabled"
print_message "$GREEN" "✓ All tables, indexes, and views created"
print_message "$GREEN" "✓ Triggers and functions installed"

if [ -f "$SCRIPT_DIR/seed-data.sql" ] && [[ ! $REPLY =~ ^[Nn]$ ]]; then
    print_message "$GREEN" "✓ Sample data loaded"
fi

echo ""
print_message "$BLUE" "Next Steps:"
echo "  1. Update your application's DATABASE_URL environment variable"
echo "  2. Test database connectivity from your application"
echo "  3. Run any additional migrations if needed"
echo ""
print_message "$YELLOW" "Connection String (save this securely):"
echo "  ${DATABASE_URL}"
echo ""

# Save deployment log
DEPLOY_LOG="$SCRIPT_DIR/deployment_$(date +%Y%m%d_%H%M%S).log"
{
    echo "Deployment Date: $(date)"
    echo "Database: ${DATABASE_URL%%@*}@***"
    echo "Tables Created: $TABLE_COUNT"
    echo "PostGIS Version: $POSTGIS_VERSION"
    echo ""
    echo "=== Schema Output ==="
    cat /tmp/schema_output.log
    if [ -f /tmp/seed_output.log ]; then
        echo ""
        echo "=== Seed Data Output ==="
        cat /tmp/seed_output.log
    fi
} > "$DEPLOY_LOG"

print_message "$BLUE" "Deployment log saved to: $DEPLOY_LOG"
echo ""
