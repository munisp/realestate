#!/bin/bash

# Real Estate Platform Deployment Script
# This script deploys all microservices with health checks

set -e

echo "🚀 Starting Real Estate Platform Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_health() {
    local service_name=$1
    local health_url=$2
    local max_attempts=30
    local attempt=1

    echo -n "Checking $service_name health..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e " ${RED}✗${NC}"
    return 1
}

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# Build and start services
echo "Building and starting services..."
docker-compose up -d --build

# Wait for database services
echo "Waiting for database services..."
sleep 10

# Check MySQL
echo -n "Checking MySQL..."
if docker exec realestate-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo -e " ${GREEN}✓${NC}"
else
    echo -e " ${YELLOW}Warning: MySQL not responding${NC}"
fi

# Check Redis
echo -n "Checking Redis..."
if docker exec realestate-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e " ${GREEN}✓${NC}"
else
    echo -e " ${YELLOW}Warning: Redis not responding${NC}"
fi

# Wait for microservices to start
echo "Waiting for microservices to initialize..."
sleep 15

# Check Go services
echo "Checking Go microservices..."
check_health "Payment Service" "http://localhost:8080/health" || echo -e "${YELLOW}Payment service not responding${NC}"
check_health "Notification Service" "http://localhost:8081/health" || echo -e "${YELLOW}Notification service not responding${NC}"
check_health "Image Service" "http://localhost:8082/health" || echo -e "${YELLOW}Image service not responding${NC}"

# Check Python AI services
echo "Checking Python AI services..."
check_health "ML Valuation" "http://localhost:5000/api/v1/health" || echo -e "${YELLOW}ML Valuation service not responding${NC}"
check_health "OCR Service" "http://localhost:5001/api/v1/health" || echo -e "${YELLOW}OCR service not responding${NC}"
check_health "Fraud Detection" "http://localhost:5002/api/v1/health" || echo -e "${YELLOW}Fraud Detection service not responding${NC}"

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Service URLs:"
echo "  Main App:           http://localhost:3000"
echo "  Payment Service:    http://localhost:8080"
echo "  Notification:       http://localhost:8081"
echo "  Image Service:      http://localhost:8082"
echo "  ML Valuation:       http://localhost:5000"
echo "  OCR Service:        http://localhost:5001"
echo "  Fraud Detection:    http://localhost:5002"
echo "  MLflow:             http://localhost:5050"
echo ""
echo "View logs: docker-compose logs -f [service-name]"
echo "Stop all:  docker-compose down"
echo ""
