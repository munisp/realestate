/**
 * Comprehensive Load Testing Script using k6
 * Tests API endpoints under various load conditions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 50 },   // Ramp down to 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
    'errors': ['rate<0.1'],              // Error rate should be below 10%
    'http_req_failed': ['rate<0.05'],    // Failed requests should be below 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  // Test 1: Homepage load
  let response = http.get(`${BASE_URL}/`);
  check(response, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads in < 1s': (r) => r.timings.duration < 1000,
  });
  errorRate.add(response.status !== 200);
  responseTime.add(response.timings.duration);
  requestCount.add(1);

  sleep(1);

  // Test 2: Property search API
  response = http.get(`${BASE_URL}/api/trpc/properties.getAll?input={}`);
  check(response, {
    'property search status is 200': (r) => r.status === 200,
    'property search responds in < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(response.status !== 200);
  responseTime.add(response.timings.duration);
  requestCount.add(1);

  sleep(1);

  // Test 3: Property detail page
  response = http.get(`${BASE_URL}/property/1`);
  check(response, {
    'property detail status is 200': (r) => r.status === 200,
    'property detail loads in < 1s': (r) => r.timings.duration < 1000,
  });
  errorRate.add(response.status !== 200);
  responseTime.add(response.timings.duration);
  requestCount.add(1);

  sleep(2);
}

export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n' + indent + '=== Load Test Summary ===\n\n';
  
  // Request statistics
  summary += indent + 'Total Requests: ' + data.metrics.request_count.values.count + '\n';
  summary += indent + 'Failed Requests: ' + data.metrics.http_req_failed.values.passes + '\n';
  summary += indent + 'Error Rate: ' + (data.metrics.errors.values.rate * 100).toFixed(2) + '%\n\n';
  
  // Response time statistics
  summary += indent + 'Response Time:\n';
  summary += indent + '  Min: ' + data.metrics.http_req_duration.values.min.toFixed(2) + 'ms\n';
  summary += indent + '  Avg: ' + data.metrics.http_req_duration.values.avg.toFixed(2) + 'ms\n';
  summary += indent + '  Max: ' + data.metrics.http_req_duration.values.max.toFixed(2) + 'ms\n';
  summary += indent + '  P95: ' + data.metrics.http_req_duration.values['p(95)'].toFixed(2) + 'ms\n';
  summary += indent + '  P99: ' + data.metrics.http_req_duration.values['p(99)'].toFixed(2) + 'ms\n\n';
  
  // Throughput
  const duration = data.state.testRunDurationMs / 1000;
  const rps = data.metrics.request_count.values.count / duration;
  summary += indent + 'Throughput: ' + rps.toFixed(2) + ' req/s\n';
  summary += indent + 'Test Duration: ' + duration.toFixed(2) + 's\n\n';
  
  return summary;
}
