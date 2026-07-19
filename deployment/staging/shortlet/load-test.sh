#!/bin/bash
set -euo pipefail

echo "======================================"
echo "Load Testing - 100 Concurrent Users"
echo "======================================"

NAMESPACE="shortlet-staging"
BOOKING_SERVICE_URL="http://$(kubectl get svc booking-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"

# Install k6 if not available
if ! command -v k6 &> /dev/null; then
    echo "Installing k6..."
    sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6 -y
fi

# Create k6 test script
cat > /tmp/shortlet-load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 100 }, // Ramp up to 100 users
    { duration: '2m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
  },
};

const BASE_URL = __ENV.BOOKING_SERVICE_URL;

export default function () {
  // Test 1: List properties
  let listResponse = http.get(`${BASE_URL}/api/properties`);
  check(listResponse, {
    'list properties status is 200': (r) => r.status === 200,
    'list properties response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
  
  // Test 2: Get property details
  if (listResponse.json().length > 0) {
    let propertyId = listResponse.json()[0].id;
    let detailResponse = http.get(`${BASE_URL}/api/properties/${propertyId}`);
    check(detailResponse, {
      'property details status is 200': (r) => r.status === 200,
    });
  }
  
  sleep(1);
  
  // Test 3: Check availability
  let availResponse = http.get(`${BASE_URL}/api/properties/1/availability?checkIn=2025-02-15&checkOut=2025-02-18`);
  check(availResponse, {
    'availability check status is 200': (r) => r.status === 200,
  });
  
  sleep(2);
}
EOF

# Run load test
echo "Running load test with k6..."
BOOKING_SERVICE_URL=$BOOKING_SERVICE_URL k6 run /tmp/shortlet-load-test.js

echo "\nLoad test complete!"
