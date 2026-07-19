#!/bin/bash

# Comprehensive test suite for all Go payment services
# Tests Escrow, Mojaloop, and TigerBeetle services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FAILED_TESTS=0
PASSED_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "Payment Services Test Suite"
echo "======================================"
echo ""

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    
    if curl -f -s "$url/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not running"
        return 1
    fi
}

# Function to run test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo ""
    echo "Running: $test_name"
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED${NC}: $test_name"
        ((PASSED_TESTS++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}: $test_name"
        ((FAILED_TESTS++))
        return 1
    fi
}

# Check if services are running
echo "Checking service availability..."
echo ""

ESCROW_RUNNING=false
MOJALOOP_RUNNING=false
TIGERBEETLE_RUNNING=false

if check_service "http://localhost:5000" "Escrow Service"; then
    ESCROW_RUNNING=true
fi

if check_service "http://localhost:5010" "Mojaloop Service"; then
    MOJALOOP_RUNNING=true
fi

if check_service "http://localhost:5011" "TigerBeetle Service"; then
    TIGERBEETLE_RUNNING=true
fi

echo ""
echo "======================================"
echo "Starting Tests"
echo "======================================"

# Test 1: Escrow Service Health
if [ "$ESCROW_RUNNING" = true ]; then
    run_test "Escrow: Health Check" \
        "curl -f -s http://localhost:5000/health | grep -q 'healthy'"
    
    run_test "Escrow: Create Escrow" \
        "curl -f -s -X POST http://localhost:5000/escrows \
        -H 'Content-Type: application/json' \
        -d '{
            \"id\": \"test_escrow_$(date +%s)\",
            \"project_id\": 1,
            \"amount\": 100000,
            \"currency\": \"USD\",
            \"buyer_id\": \"buyer_test\",
            \"seller_id\": \"seller_test\"
        }' | grep -q 'pending'"
    
    run_test "Escrow: Get Statistics" \
        "curl -f -s http://localhost:5000/stats | grep -q 'total_escrows'"
fi

# Test 2: Mojaloop Service
if [ "$MOJALOOP_RUNNING" = true ]; then
    run_test "Mojaloop: Health Check" \
        "curl -f -s http://localhost:5010/health | grep -q 'healthy'"
    
    run_test "Mojaloop: Get Info" \
        "curl -f -s http://localhost:5010/info | grep -q 'mojaloop'"
    
    run_test "Mojaloop: Create Escrow" \
        "curl -f -s -X POST http://localhost:5010/escrow/create \
        -H 'Content-Type: application/json' \
        -d '{
            \"escrow_id\": \"mojaloop_test_$(date +%s)\",
            \"amount\": 50000,
            \"currency\": \"KES\",
            \"buyer_id\": \"254712345678\",
            \"seller_id\": \"254787654321\"
        }' | grep -q 'success'"
    
    run_test "Mojaloop: Webhook Handler" \
        "curl -f -s -X POST http://localhost:5010/webhooks/mojaloop \
        -H 'Content-Type: application/json' \
        -H 'X-Mojaloop-Signature: test_signature' \
        -d '{
            \"event_type\": \"transfer.committed\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"data\": {\"transfer_id\": \"test_123\"}
        }' | grep -q 'success'"
fi

# Test 3: TigerBeetle Service
if [ "$TIGERBEETLE_RUNNING" = true ]; then
    run_test "TigerBeetle: Health Check" \
        "curl -f -s http://localhost:5011/health | grep -q 'healthy'"
    
    run_test "TigerBeetle: Get Info" \
        "curl -f -s http://localhost:5011/info | grep -q 'tigerbeetle'"
    
    run_test "TigerBeetle: Create Escrow" \
        "curl -f -s -X POST http://localhost:5011/escrow/create \
        -H 'Content-Type: application/json' \
        -d '{
            \"escrow_id\": \"tb_test_$(date +%s)\",
            \"amount\": 75000,
            \"currency\": \"USD\",
            \"buyer_id\": \"buyer_tb\",
            \"seller_id\": \"seller_tb\"
        }' | grep -q 'success'"
fi

# Test 4: Integration Tests
if [ "$ESCROW_RUNNING" = true ] && [ "$MOJALOOP_RUNNING" = true ]; then
    run_test "Integration: Escrow + Mojaloop Flow" \
        "bash -c '
            ESCROW_ID=\"integration_test_$(date +%s)\"
            
            # Create in Mojaloop
            RESPONSE=$(curl -s -X POST http://localhost:5010/escrow/create \
                -H \"Content-Type: application/json\" \
                -d \"{
                    \\\"escrow_id\\\": \\\"$ESCROW_ID\\\",
                    \\\"amount\\\": 100000,
                    \\\"currency\\\": \\\"KES\\\",
                    \\\"buyer_id\\\": \\\"254712345678\\\",
                    \\\"seller_id\\\": \\\"254787654321\\\"
                }\")
            
            echo \"$RESPONSE\" | grep -q \"success\"
        '"
fi

# Test 5: Load Test (Light)
if [ "$ESCROW_RUNNING" = true ]; then
    run_test "Load: 10 Concurrent Escrow Creates" \
        "bash -c '
            for i in {1..10}; do
                curl -s -X POST http://localhost:5000/escrows \
                    -H \"Content-Type: application/json\" \
                    -d \"{
                        \\\"id\\\": \\\"load_test_${i}_$(date +%s)\\\",
                        \\\"project_id\\\": 1,
                        \\\"amount\\\": 10000,
                        \\\"currency\\\": \\\"USD\\\",
                        \\\"buyer_id\\\": \\\"buyer_$i\\\",
                        \\\"seller_id\\\": \\\"seller_$i\\\"
                    }\" &
            done
            wait
            echo \"All requests completed\"
        '"
fi

# Test 6: Error Handling
run_test "Error: Invalid Escrow Creation" \
    "! curl -f -s -X POST http://localhost:5000/escrows \
    -H 'Content-Type: application/json' \
    -d '{\"invalid\": \"data\"}' 2>&1"

run_test "Error: Non-existent Escrow Retrieval" \
    "! curl -f -s http://localhost:5000/escrows/nonexistent_id 2>&1"

# Test 7: Redis Integration (if Redis is available)
if [ "$ESCROW_RUNNING" = true ]; then
    if docker ps | grep -q escrow-redis; then
        run_test "Redis: Connection Test" \
            "docker exec escrow-redis redis-cli ping | grep -q PONG"
        
        run_test "Redis: Data Persistence" \
            "bash -c '
                # Create escrow
                ESCROW_ID=\"redis_test_$(date +%s)\"
                curl -s -X POST http://localhost:5000/escrows \
                    -H \"Content-Type: application/json\" \
                    -d \"{
                        \\\"id\\\": \\\"$ESCROW_ID\\\",
                        \\\"project_id\\\": 1,
                        \\\"amount\\\": 50000,
                        \\\"currency\\\": \\\"USD\\\",
                        \\\"buyer_id\\\": \\\"buyer_redis\\\",
                        \\\"seller_id\\\": \\\"seller_redis\\\"
                    }\" > /dev/null
                
                # Check if key exists in Redis
                docker exec escrow-redis redis-cli EXISTS \"escrow:$ESCROW_ID\" | grep -q 1
            '"
    fi
fi

# Summary
echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"
echo "Total: $((PASSED_TESTS + FAILED_TESTS))"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
