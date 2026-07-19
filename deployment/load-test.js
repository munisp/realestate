import http from 'k6/http';
import {check, sleep} from 'k6';

export const options = {
  stages: [
    {duration: '2m', target: 100}, // Ramp up to 100 users
    {duration: '5m', target: 100}, // Stay at 100 users
    {duration: '2m', target: 200}, // Ramp up to 200 users
    {duration: '5m', target: 200}, // Stay at 200 users
    {duration: '2m', target: 0},   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';

export default function () {
  // Test property search
  let searchRes = http.get(`${BASE_URL}/api/properties/search?q=apartment`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test property detail
  let detailRes = http.get(`${BASE_URL}/api/properties/1`);
  check(detailRes, {
    'detail status is 200': (r) => r.status === 200,
    'detail response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // Test user authentication
  let authRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }), {
    headers: {'Content-Type': 'application/json'},
  });
  check(authRes, {
    'auth status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, {indent: ' ', enableColors: true}),
  };
}

function textSummary(data, options) {
  return `
Load Test Summary
=================

Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.passes}
Request Duration (p95): ${data.metrics.http_req_duration.values['p(95)']}ms
Request Duration (avg): ${data.metrics.http_req_duration.values.avg}ms

Checks Passed: ${data.metrics.checks.values.passes}/${data.metrics.checks.values.count}
`;
}
