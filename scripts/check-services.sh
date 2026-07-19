#!/bin/bash

# Microservices Health Check Script

echo "🏥 Checking microservices health..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Services to check
declare -A SERVICES
SERVICES[payment-service]="http://localhost:8001/health"
SERVICES[notification-service]="http://localhost:8002/health"
SERVICES[image-service]="http://localhost:8003/health"
SERVICES[ml-valuation]="http://localhost:9001/health"
SERVICES[ocr-service]="http://localhost:9002/health"
SERVICES[fraud-detection]="http://localhost:9003/health"

# Check each service
ALL_HEALTHY=true

for SERVICE in "${!SERVICES[@]}"; do
  URL="${SERVICES[$SERVICE]}"
  
  # Try to curl the health endpoint
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null)
  
  if [ "$RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓${NC} $SERVICE is healthy"
  else
    echo -e "${RED}✗${NC} $SERVICE is unhealthy (HTTP $RESPONSE)"
    ALL_HEALTHY=false
  fi
done

echo ""

if [ "$ALL_HEALTHY" = true ]; then
  echo -e "${GREEN}All services are healthy!${NC}"
  exit 0
else
  echo -e "${RED}Some services are unhealthy. Check logs with: docker-compose logs${NC}"
  exit 1
fi
