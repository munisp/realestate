#!/bin/bash
set -euo pipefail

echo "======================================"
echo "End-to-End Booking Flow Test"
echo "======================================"

NAMESPACE="shortlet-staging"
BOOKING_SERVICE_URL="http://$(kubectl get svc booking-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_step() {
    echo -e "${YELLOW}[STEP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Create a test property
log_step "Creating test property..."
PROPERTY_RESPONSE=$(curl -s -X POST $BOOKING_SERVICE_URL/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Luxury 2BR Apartment in Lekki",
    "description": "Beautiful apartment with ocean view",
    "location": "Lekki Phase 1",
    "bedrooms": 2,
    "bathrooms": 2,
    "guests": 4,
    "basePrice": 45000,
    "amenities": ["WiFi", "AC", "Pool", "Gym"],
    "images": ["https://example.com/image1.jpg"]
  }')

PROPERTY_ID=$(echo $PROPERTY_RESPONSE | jq -r '.id')
if [ "$PROPERTY_ID" != "null" ]; then
    log_success "Property created with ID: $PROPERTY_ID"
else
    log_error "Failed to create property"
    exit 1
fi

# Step 2: Check availability
log_step "Checking availability..."
AVAILABILITY_RESPONSE=$(curl -s "$BOOKING_SERVICE_URL/api/properties/$PROPERTY_ID/availability?checkIn=2025-02-15&checkOut=2025-02-18")
IS_AVAILABLE=$(echo $AVAILABILITY_RESPONSE | jq -r '.available')

if [ "$IS_AVAILABLE" == "true" ]; then
    log_success "Property is available"
else
    log_error "Property is not available"
    exit 1
fi

# Step 3: Get price quote
log_step "Getting price quote..."
PRICE_RESPONSE=$(curl -s "$BOOKING_SERVICE_URL/api/bookings/quote" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "'$PROPERTY_ID'",
    "checkIn": "2025-02-15",
    "checkOut": "2025-02-18",
    "guests": 2
  }')

TOTAL_PRICE=$(echo $PRICE_RESPONSE | jq -r '.totalPrice')
log_success "Total price: ₦$TOTAL_PRICE"

# Step 4: Create booking
log_step "Creating booking..."
BOOKING_RESPONSE=$(curl -s -X POST $BOOKING_SERVICE_URL/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "'$PROPERTY_ID'",
    "checkIn": "2025-02-15",
    "checkOut": "2025-02-18",
    "guests": 2,
    "guestName": "Test Guest",
    "guestEmail": "test@example.com",
    "guestPhone": "+2348012345678"
  }')

BOOKING_ID=$(echo $BOOKING_RESPONSE | jq -r '.id')
if [ "$BOOKING_ID" != "null" ]; then
    log_success "Booking created with ID: $BOOKING_ID"
else
    log_error "Failed to create booking"
    exit 1
fi

# Step 5: Initiate payment
log_step "Initiating payment..."
PAYMENT_RESPONSE=$(curl -s -X POST $BOOKING_SERVICE_URL/api/payments/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "'$BOOKING_ID'",
    "provider": "paystack"
  }')

PAYMENT_URL=$(echo $PAYMENT_RESPONSE | jq -r '.authorizationUrl')
log_success "Payment URL: $PAYMENT_URL"

# Step 6: Simulate payment callback (in real scenario, this comes from Paystack)
log_step "Simulating payment callback..."
sleep 2
CALLBACK_RESPONSE=$(curl -s -X POST $BOOKING_SERVICE_URL/api/payments/webhook/paystack \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "test_ref_'$BOOKING_ID'",
      "status": "success",
      "amount": '$TOTAL_PRICE'00
    }
  }')

log_success "Payment callback processed"

# Step 7: Confirm booking
log_step "Confirming booking..."
CONFIRM_RESPONSE=$(curl -s -X POST $BOOKING_SERVICE_URL/api/bookings/$BOOKING_ID/confirm)
BOOKING_STATUS=$(echo $CONFIRM_RESPONSE | jq -r '.status')

if [ "$BOOKING_STATUS" == "confirmed" ]; then
    log_success "Booking confirmed"
else
    log_error "Failed to confirm booking. Status: $BOOKING_STATUS"
    exit 1
fi

# Step 8: Check booking details
log_step "Retrieving booking details..."
BOOKING_DETAILS=$(curl -s "$BOOKING_SERVICE_URL/api/bookings/$BOOKING_ID")
echo $BOOKING_DETAILS | jq '.'

echo "\n======================================"
echo -e "${GREEN}✓ End-to-End Booking Flow Test PASSED${NC}"
echo "======================================"
echo "Property ID: $PROPERTY_ID"
echo "Booking ID: $BOOKING_ID"
echo "Total Price: ₦$TOTAL_PRICE"
echo "Status: $BOOKING_STATUS"
