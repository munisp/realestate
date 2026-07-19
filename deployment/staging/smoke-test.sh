#!/bin/bash
set -e

echo "🧪 Running Shortlet Platform Smoke Tests..."

BOOKING_API="http://localhost:3007"
VERIFICATION_API="http://localhost:3008"

# Test Booking Service
echo "Testing Booking Service..."
curl -f $BOOKING_API/health || { echo "❌ Booking Service health check failed"; exit 1; }
echo "✅ Booking Service healthy"

# Test Verification Service
echo "Testing Verification Service..."
curl -f $VERIFICATION_API/health || { echo "❌ Verification Service health check failed"; exit 1; }
echo "✅ Verification Service healthy"

# Test booking creation
echo "Testing booking creation..."
curl -X POST $BOOKING_API/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "test-property",
    "guestId": "test-guest",
    "checkIn": "2025-02-01",
    "checkOut": "2025-02-05",
    "guests": 2,
    "totalPrice": 50000
  }' || { echo "❌ Booking creation failed"; exit 1; }
echo "✅ Booking creation successful"

# Test verification initiation
echo "Testing verification initiation..."
curl -X POST $VERIFICATION_API/api/verifications \
  -H "Content-Type: application/json" \
  -d '{
    "guestId": "test-guest",
    "verificationType": "nin",
    "identityNumber": "12345678901"
  }' || { echo "❌ Verification initiation failed"; exit 1; }
echo "✅ Verification initiation successful"

echo ""
echo "✅ All smoke tests passed!"
