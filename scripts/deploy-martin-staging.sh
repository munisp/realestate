#!/bin/bash

# Martin Tile Server - Staging Deployment Script
# Deploys Martin + PostGIS + Nginx to staging environment

set -e  # Exit on error

echo "🚀 Starting Martin Tile Server Staging Deployment"
echo "=================================================="

# Configuration
STAGING_HOST="${STAGING_HOST:-localhost}"
POSTGIS_PASSWORD="${POSTGIS_PASSWORD:-postgis_staging_password}"
MARTIN_PORT="${MARTIN_PORT:-3000}"
NGINX_PORT="${NGINX_PORT:-8080}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose found${NC}"

# Step 2: Stop existing containers
echo -e "\n${YELLOW}Step 2: Stopping existing containers...${NC}"

docker-compose -f docker-compose.martin.yml down || true
docker-compose -f docker-compose.postgis.yml down || true

echo -e "${GREEN}✅ Existing containers stopped${NC}"

# Step 3: Create necessary directories
echo -e "\n${YELLOW}Step 3: Creating directories...${NC}"

mkdir -p config
mkdir -p scripts/postgis-init
mkdir -p logs/martin
mkdir -p logs/nginx

echo -e "${GREEN}✅ Directories created${NC}"

# Step 4: Start PostGIS
echo -e "\n${YELLOW}Step 4: Starting PostGIS...${NC}"

docker-compose -f docker-compose.martin.yml up -d postgis

# Wait for PostGIS to be ready
echo "Waiting for PostGIS to be ready..."
for i in {1..30}; do
    if docker exec realestate-postgis pg_isready -U postgres &> /dev/null; then
        echo -e "${GREEN}✅ PostGIS is ready${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Step 5: Initialize PostGIS schema
echo -e "\n${YELLOW}Step 5: Initializing PostGIS schema...${NC}"

# Check if tables exist
TABLE_COUNT=$(docker exec realestate-postgis psql -U postgres -d realestate_spatial -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'spatial';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLE_COUNT" -eq "0" ]; then
    echo "Creating spatial schema..."
    docker exec realestate-postgis psql -U postgres -d realestate_spatial -f /docker-entrypoint-initdb.d/01-init-spatial-db.sql
    docker exec realestate-postgis psql -U postgres -d realestate_spatial -f /docker-entrypoint-initdb.d/02-martin-views.sql
    echo -e "${GREEN}✅ Schema created${NC}"
else
    echo -e "${GREEN}✅ Schema already exists (${TABLE_COUNT} tables)${NC}"
fi

# Step 6: Migrate data to PostGIS
echo -e "\n${YELLOW}Step 6: Migrating data to PostGIS...${NC}"

PROPERTY_COUNT=$(docker exec realestate-postgis psql -U postgres -d realestate_spatial -t -c "SELECT COUNT(*) FROM spatial.properties_spatial;" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$PROPERTY_COUNT" -eq "0" ]; then
    echo "Running migration script..."
    pnpm tsx scripts/migrate-to-postgis.ts
    echo -e "${GREEN}✅ Data migrated${NC}"
else
    echo -e "${GREEN}✅ Data already migrated (${PROPERTY_COUNT} properties)${NC}"
fi

# Step 7: Refresh H3 clusters
echo -e "\n${YELLOW}Step 7: Refreshing H3 clusters...${NC}"

docker exec realestate-postgis psql -U postgres -d realestate_spatial -c "SELECT spatial.refresh_h3_clusters(7);"

echo -e "${GREEN}✅ H3 clusters refreshed${NC}"

# Step 8: Start Martin tile server
echo -e "\n${YELLOW}Step 8: Starting Martin tile server...${NC}"

docker-compose -f docker-compose.martin.yml up -d martin

# Wait for Martin to be ready
echo "Waiting for Martin to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:${MARTIN_PORT}/health &> /dev/null; then
        echo -e "${GREEN}✅ Martin is ready${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Step 9: Start Nginx tile cache
echo -e "\n${YELLOW}Step 9: Starting Nginx tile cache...${NC}"

docker-compose -f docker-compose.martin.yml up -d nginx-tile-cache

# Wait for Nginx to be ready
echo "Waiting for Nginx to be ready..."
for i in {1..15}; do
    if curl -s http://localhost:${NGINX_PORT}/health &> /dev/null; then
        echo -e "${GREEN}✅ Nginx is ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Step 10: Verify deployment
echo -e "\n${YELLOW}Step 10: Verifying deployment...${NC}"

# Check PostGIS
if docker exec realestate-postgis psql -U postgres -d realestate_spatial -c "SELECT PostGIS_Version();" &> /dev/null; then
    echo -e "${GREEN}✅ PostGIS: OK${NC}"
else
    echo -e "${RED}❌ PostGIS: FAILED${NC}"
fi

# Check Martin
if curl -s http://localhost:${MARTIN_PORT}/health | grep -q "OK"; then
    echo -e "${GREEN}✅ Martin: OK${NC}"
else
    echo -e "${RED}❌ Martin: FAILED${NC}"
fi

# Check Nginx
if curl -s http://localhost:${NGINX_PORT}/health | grep -q "OK"; then
    echo -e "${GREEN}✅ Nginx: OK${NC}"
else
    echo -e "${RED}❌ Nginx: FAILED${NC}"
fi

# Check tile generation
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${NGINX_PORT}/tiles/properties/12/2047/2047.pbf" | grep -q "200"; then
    echo -e "${GREEN}✅ Tile Generation: OK${NC}"
else
    echo -e "${RED}❌ Tile Generation: FAILED${NC}"
fi

# Step 11: Display summary
echo -e "\n${GREEN}=================================================="
echo "✅ Martin Tile Server Deployment Complete!"
echo "==================================================${NC}"

echo -e "\n📊 Deployment Summary:"
echo "  PostGIS:     http://localhost:5432"
echo "  Martin:      http://localhost:${MARTIN_PORT}"
echo "  Nginx Cache: http://localhost:${NGINX_PORT}"
echo ""
echo "  Property Count: ${PROPERTY_COUNT}"
echo "  Spatial Tables: ${TABLE_COUNT}"
echo ""

echo -e "\n🔗 Useful Endpoints:"
echo "  Health Check:   http://localhost:${NGINX_PORT}/health"
echo "  Tile Catalog:   http://localhost:${NGINX_PORT}/catalog"
echo "  TileJSON:       http://localhost:${NGINX_PORT}/tiles/properties.json"
echo "  Sample Tile:    http://localhost:${NGINX_PORT}/tiles/properties/12/2047/2047.pbf"
echo ""

echo -e "\n📝 Next Steps:"
echo "  1. Test tile generation: curl http://localhost:${NGINX_PORT}/tiles/properties/12/2047/2047.pbf -o test.pbf"
echo "  2. View logs: docker-compose -f docker-compose.martin.yml logs -f"
echo "  3. Monitor cache: curl http://localhost:${NGINX_PORT}/cache-stats"
echo "  4. Update frontend to use: http://localhost:${NGINX_PORT}/tiles"
echo ""

echo -e "${GREEN}🎉 Deployment successful!${NC}"
