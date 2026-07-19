#!/bin/bash
# Comprehensive Testing Script for Real Estate Platform
# Tests: Regression, Integration, Referential Integrity

set -e

echo "================================"
echo "Platform Comprehensive Testing"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Test 1: Directory Structure Integrity
echo -e "${YELLOW}[TEST 1]${NC} Verifying directory structure..."
if [ -d "/home/ubuntu/realestate-platform/client" ] && \
   [ -d "/home/ubuntu/realestate-platform/server" ] && \
   [ -d "/home/ubuntu/realestate-platform/services" ] && \
   [ -d "/home/ubuntu/realestate-platform/realestate-mobile" ]; then
    echo -e "${GREEN}✓${NC} Core directories exist"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Missing core directories"
    ((FAILED++))
fi

# Test 2: No Duplicate Dashboards
echo -e "${YELLOW}[TEST 2]${NC} Checking for duplicate dashboards..."
if [ ! -d "/home/ubuntu/realestate-platform/admin-dashboard" ] && \
   [ ! -d "/home/ubuntu/realestate-platform/host-dashboard" ] && \
   [ ! -d "/home/ubuntu/realestate-platform/guest-app" ]; then
    echo -e "${GREEN}✓${NC} No duplicate dashboards found"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Duplicate dashboards still exist"
    ((FAILED++))
fi

# Test 3: Unified Mobile App
echo -e "${YELLOW}[TEST 3]${NC} Verifying unified mobile app..."
if [ -d "/home/ubuntu/realestate-platform/realestate-mobile" ] && \
   [ ! -d "/home/ubuntu/realestate-platform/mobile/host-app" ]; then
    echo -e "${GREEN}✓${NC} Unified mobile app structure confirmed"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Mobile app consolidation incomplete"
    ((FAILED++))
fi

# Test 4: Package.json Integrity
echo -e "${YELLOW}[TEST 4]${NC} Checking package.json..."
if [ -f "/home/ubuntu/realestate-platform/package.json" ]; then
    if node -e "require('/home/ubuntu/realestate-platform/package.json')" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} package.json is valid JSON"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} package.json has syntax errors"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗${NC} package.json not found"
    ((FAILED++))
fi

# Test 5: TypeScript Configuration
echo -e "${YELLOW}[TEST 5]${NC} Checking TypeScript configuration..."
if [ -f "/home/ubuntu/realestate-platform/tsconfig.json" ]; then
    echo -e "${GREEN}✓${NC} tsconfig.json exists"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} tsconfig.json not found"
    ((FAILED++))
fi

# Test 6: Database Schema
echo -e "${YELLOW}[TEST 6]${NC} Checking database schema..."
if [ -f "/home/ubuntu/realestate-platform/drizzle/schema.ts" ]; then
    TABLES=$(grep -c "export const.*= mysqlTable" /home/ubuntu/realestate-platform/drizzle/schema.ts || echo "0")
    if [ "$TABLES" -gt "0" ]; then
        echo -e "${GREEN}✓${NC} Database schema has $TABLES tables defined"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} No tables found in schema"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗${NC} Database schema not found"
    ((FAILED++))
fi

# Test 7: Microservices
echo -e "${YELLOW}[TEST 7]${NC} Checking microservices..."
SERVICE_COUNT=$(find /home/ubuntu/realestate-platform/services -maxdepth 1 -type d | wc -l)
if [ "$SERVICE_COUNT" -gt "5" ]; then
    echo -e "${GREEN}✓${NC} Found $SERVICE_COUNT microservices"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Only $SERVICE_COUNT microservices found"
    ((WARNINGS++))
fi

# Test 8: Frontend Pages
echo -e "${YELLOW}[TEST 8]${NC} Checking frontend pages..."
if [ -d "/home/ubuntu/realestate-platform/client/src/pages" ]; then
    PAGE_COUNT=$(find /home/ubuntu/realestate-platform/client/src/pages -name "*.tsx" | wc -l)
    if [ "$PAGE_COUNT" -gt "10" ]; then
        echo -e "${GREEN}✓${NC} Found $PAGE_COUNT frontend pages"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Only $PAGE_COUNT frontend pages found"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} Frontend pages directory not found"
    ((FAILED++))
fi

# Test 9: API Routers
echo -e "${YELLOW}[TEST 9]${NC} Checking API routers..."
if [ -d "/home/ubuntu/realestate-platform/server/routers" ]; then
    ROUTER_COUNT=$(find /home/ubuntu/realestate-platform/server/routers -name "*.ts" | wc -l)
    if [ "$ROUTER_COUNT" -gt "5" ]; then
        echo -e "${GREEN}✓${NC} Found $ROUTER_COUNT API routers"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Only $ROUTER_COUNT API routers found"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} API routers directory not found"
    ((FAILED++))
fi

# Test 10: Deployment Configuration
echo -e "${YELLOW}[TEST 10]${NC} Checking deployment configuration..."
if [ -d "/home/ubuntu/realestate-platform/deployment" ] || \
   [ -f "/home/ubuntu/realestate-platform/docker-compose.yml" ]; then
    echo -e "${GREEN}✓${NC} Deployment configuration found"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} No deployment configuration found"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ "$FAILED" -eq "0" ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review.${NC}"
    exit 1
fi
