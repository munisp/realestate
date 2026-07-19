#!/bin/bash

# End-to-End Test Script for Real Data Services
# Tests all three data services and validates responses

set -e

echo "========================================="
echo "Data Services End-to-End Test"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_field=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Response: $response"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test POST endpoint
test_post_endpoint() {
    local name=$1
    local url=$2
    local data=$3
    local expected_field=$4
    
    echo -n "Testing $name... "
    
    response=$(curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -d "$data")
    
    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Response: $response"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "1. Health Checks"
echo "----------------"
test_endpoint "Earth Engine Health" "http://localhost:5010/health" "healthy"
test_endpoint "World Bank Health" "http://localhost:5011/health" "healthy"
test_endpoint "PropertyPro Health" "http://localhost:5012/health" "healthy"
echo ""

echo "2. Earth Engine Satellite Analysis"
echo "-----------------------------------"
test_post_endpoint "Building Detection" \
    "http://localhost:5010/building-analysis" \
    '{"latitude": 6.5244, "longitude": 3.3792, "buffer_meters": 100}' \
    "building_detected"

test_post_endpoint "Height Estimation" \
    "http://localhost:5010/building-analysis" \
    '{"latitude": 6.4541, "longitude": 3.3947, "buffer_meters": 50}' \
    "estimated_height_meters"

test_post_endpoint "Roof Classification" \
    "http://localhost:5010/building-analysis" \
    '{"latitude": 6.4281, "longitude": 3.4219, "buffer_meters": 100}' \
    "roof_material"
echo ""

echo "3. World Bank Economic Indicators"
echo "----------------------------------"
test_endpoint "GDP Growth" \
    "http://localhost:5011/indicators?indicators=gdp_growth" \
    "gdp_growth"

test_endpoint "Inflation Rate" \
    "http://localhost:5011/indicators?indicators=inflation" \
    "inflation"

test_endpoint "Unemployment" \
    "http://localhost:5011/indicators?indicators=unemployment" \
    "unemployment"

test_endpoint "Multiple Indicators" \
    "http://localhost:5011/indicators?indicators=gdp_growth,inflation,unemployment" \
    "gdp_growth"

test_endpoint "Exchange Rate" \
    "http://localhost:5011/indicators?indicators=exchange_rate" \
    "exchange_rate"
echo ""

echo "4. PropertyPro Market Listings"
echo "-------------------------------"
test_endpoint "Lagos Listings" \
    "http://localhost:5012/listings?state=lagos&max_pages=1" \
    "listings"

test_endpoint "Abuja Listings" \
    "http://localhost:5012/listings?state=abuja&max_pages=1" \
    "listings"

test_endpoint "Market Statistics" \
    "http://localhost:5012/market-stats?state=lagos" \
    "average_price"
echo ""

echo "5. Data Quality Checks"
echo "----------------------"

# Test Earth Engine response structure
echo -n "Checking Earth Engine data structure... "
response=$(curl -s -X POST "http://localhost:5010/building-analysis" \
    -H "Content-Type: application/json" \
    -d '{"latitude": 6.5244, "longitude": 3.3792, "buffer_meters": 100}')

if echo "$response" | grep -q "building_detected" && \
   echo "$response" | grep -q "vegetation_index" && \
   echo "$response" | grep -q "built_up_index" && \
   echo "$response" | grep -q "estimated_height_meters"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Test World Bank response structure
echo -n "Checking World Bank data structure... "
response=$(curl -s "http://localhost:5011/indicators?indicators=gdp_growth")

if echo "$response" | grep -q "latest_value" && \
   echo "$response" | grep -q "latest_year" && \
   echo "$response" | grep -q "data"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Test PropertyPro response structure
echo -n "Checking PropertyPro data structure... "
response=$(curl -s "http://localhost:5012/listings?state=lagos&max_pages=1")

if echo "$response" | grep -q "listings" && \
   echo "$response" | grep -q "count" && \
   echo "$response" | grep -q "price" && \
   echo "$response" | grep -q "bedrooms"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi
echo ""

echo "6. Performance Tests"
echo "--------------------"

# Test response times
echo -n "Earth Engine response time... "
start_time=$(date +%s%N)
curl -s -X POST "http://localhost:5010/building-analysis" \
    -H "Content-Type: application/json" \
    -d '{"latitude": 6.5244, "longitude": 3.3792, "buffer_meters": 100}' > /dev/null
end_time=$(date +%s%N)
elapsed=$((($end_time - $start_time) / 1000000))

if [ $elapsed -lt 1000 ]; then
    echo -e "${GREEN}${elapsed}ms ✓${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}${elapsed}ms (slow)${NC}"
    ((TESTS_PASSED++))
fi

echo -n "World Bank response time... "
start_time=$(date +%s%N)
curl -s "http://localhost:5011/indicators?indicators=gdp_growth" > /dev/null
end_time=$(date +%s%N)
elapsed=$((($end_time - $start_time) / 1000000))

if [ $elapsed -lt 500 ]; then
    echo -e "${GREEN}${elapsed}ms ✓${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}${elapsed}ms (slow)${NC}"
    ((TESTS_PASSED++))
fi

echo -n "PropertyPro response time... "
start_time=$(date +%s%N)
curl -s "http://localhost:5012/listings?state=lagos&max_pages=1" > /dev/null
end_time=$(date +%s%N)
elapsed=$((($end_time - $start_time) / 1000000))

if [ $elapsed -lt 500 ]; then
    echo -e "${GREEN}${elapsed}ms ✓${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}${elapsed}ms (slow)${NC}"
    ((TESTS_PASSED++))
fi
echo ""

echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Configure Google Earth Engine credentials for real data"
    echo "2. Set USE_MOCK_EARTH_ENGINE=false for production"
    echo "3. Set USE_MOCK_WORLDBANK=false for production"
    echo "4. Set USE_MOCK_SCRAPER=false for production"
    echo "5. Monitor API usage and costs"
    exit 0
else
    echo -e "${RED}Some tests failed. Please check the logs.${NC}"
    exit 1
fi
