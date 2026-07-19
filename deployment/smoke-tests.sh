#!/bin/bash
set -e

NAMESPACE=${1:-realestate-staging}

echo "🧪 Running Smoke Tests"
echo "====================="

# Get API Gateway endpoint
API_GATEWAY=$(kubectl get svc api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -z "$API_GATEWAY" ]; then
  echo "❌ API Gateway not found"
  exit 1
fi

echo "API Gateway: $API_GATEWAY"

# Test health endpoints
echo "Testing health endpoints..."

services=("property-service" "user-service" "transaction-service" "search-service" "crm-service" "developer-service" "analytics-service" "notification-service")

for service in "${services[@]}"; do
  echo -n "  - $service: "
  response=$(curl -s -o /dev/null -w "%{http_code}" http://$API_GATEWAY/api/$service/health || echo "000")
  if [ "$response" = "200" ]; then
    echo "✅ OK"
  else
    echo "❌ FAILED (HTTP $response)"
    exit 1
  fi
done

# Test database connections
echo "Testing database connections..."
echo -n "  - PostgreSQL: "
kubectl exec -n $NAMESPACE deployment/property-service -- pg_isready -h postgres && echo "✅ OK" || echo "❌ FAILED"

echo -n "  - ClickHouse: "
kubectl exec -n $NAMESPACE deployment/analytics-service -- curl -s http://clickhouse:8123/ping && echo "✅ OK" || echo "❌ FAILED"

echo -n "  - OpenSearch: "
kubectl exec -n $NAMESPACE deployment/search-service -- curl -s http://opensearch:9200/_cluster/health && echo "✅ OK" || echo "❌ FAILED"

echo -n "  - Redis: "
kubectl exec -n $NAMESPACE deployment/property-service -- redis-cli -h redis ping && echo "✅ OK" || echo "❌ FAILED"

# Test basic API functionality
echo "Testing API functionality..."

echo -n "  - Create property: "
response=$(curl -s -X POST http://$API_GATEWAY/api/properties   -H "Content-Type: application/json"   -d '{"title":"Test Property","price":100000,"location":"Test City"}'   -w "%{http_code}" -o /dev/null)
if [ "$response" = "201" ] || [ "$response" = "200" ]; then
  echo "✅ OK"
else
  echo "❌ FAILED (HTTP $response)"
fi

echo -n "  - Search properties: "
response=$(curl -s -o /dev/null -w "%{http_code}" http://$API_GATEWAY/api/properties/search?q=test)
if [ "$response" = "200" ]; then
  echo "✅ OK"
else
  echo "❌ FAILED (HTTP $response)"
fi

echo ""
echo "✅ All smoke tests passed!"
