#!/bin/bash
set -euo pipefail

echo "======================================"
echo "Shortlet Platform - Smoke Tests"
echo "======================================"

NAMESPACE="shortlet-staging"
BOOKING_SERVICE_URL="http://$(kubectl get svc booking-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
VERIFICATION_SERVICE_URL="http://$(kubectl get svc verification-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

test_passed=0
test_failed=0

run_test() {
    local test_name=$1
    local command=$2
    
    echo -n "Testing: $test_name... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((test_passed++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((test_failed++))
    fi
}

# Test 1: Health checks
run_test "Booking Service Health" "curl -f $BOOKING_SERVICE_URL/health"
run_test "Verification Service Health" "curl -f $VERIFICATION_SERVICE_URL/health"

# Test 2: Database connectivity
run_test "Database Connection" "kubectl exec -n $NAMESPACE postgres-0 -- psql -U shortlet_user -d shortlet -c 'SELECT 1'"

# Test 3: Redis connectivity
run_test "Redis Connection" "kubectl exec -n $NAMESPACE $(kubectl get pod -n $NAMESPACE -l app=redis -o jsonpath='{.items[0].metadata.name}') -- redis-cli ping"

# Test 4: API endpoints
run_test "List Properties Endpoint" "curl -f $BOOKING_SERVICE_URL/api/properties"
run_test "Create Property Endpoint" "curl -f -X POST $BOOKING_SERVICE_URL/api/properties -H 'Content-Type: application/json' -d '{"name":"Test Property","location":"Lekki"}'"

# Test 5: Verification endpoints
run_test "Verification Health" "curl -f $VERIFICATION_SERVICE_URL/api/verification/health"

echo "\n======================================"
echo "Test Results"
echo "======================================"
echo -e "${GREEN}Passed: $test_passed${NC}"
echo -e "${RED}Failed: $test_failed${NC}"

if [ $test_failed -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Please investigate.${NC}"
    exit 1
fi
