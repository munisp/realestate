#!/bin/bash
set -euo pipefail

echo "======================================"
echo "Payment Integration Tests"
echo "======================================"

NAMESPACE="shortlet-staging"
BOOKING_SERVICE_URL="http://$(kubectl get svc booking-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

test_passed=0
test_failed=0

run_payment_test() {
    local test_name=$1
    local provider=$2
    
    echo "\nTesting: $test_name"
    echo "Provider: $provider"
    
    # Initialize payment
    RESPONSE=$(curl -s -X POST $BOOKING_SERVICE_URL/api/payments/initialize \
      -H "Content-Type: application/json" \
      -d '{
        "bookingId": "test_booking_123",
        "amount": 50000,
        "provider": "'$provider'"
      }')
    
    AUTH_URL=$(echo $RESPONSE | jq -r '.authorizationUrl')
    REFERENCE=$(echo $RESPONSE | jq -r '.reference')
    
    if [ "$AUTH_URL" != "null" ] && [ "$REFERENCE" != "null" ]; then
        echo -e "${GREEN}✓ Payment initialization successful${NC}"
        echo "  Reference: $REFERENCE"
        echo "  Auth URL: $AUTH_URL"
        ((test_passed++))
    else
        echo -e "${RED}✗ Payment initialization failed${NC}"
        echo "  Response: $RESPONSE"
        ((test_failed++))
    fi
}

# Test Paystack
run_payment_test "Paystack Payment" "paystack"

# Test Flutterwave
run_payment_test "Flutterwave Payment" "flutterwave"

echo "\n======================================"
echo "Payment Test Results"
echo "======================================"
echo -e "${GREEN}Passed: $test_passed${NC}"
echo -e "${RED}Failed: $test_failed${NC}"

if [ $test_failed -eq 0 ]; then
    echo -e "\n${GREEN}All payment tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some payment tests failed.${NC}"
    exit 1
fi
