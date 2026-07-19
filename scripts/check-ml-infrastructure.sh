#!/bin/bash

# ML Infrastructure Health Check Script
# Verifies all lakehouse services are running and healthy

set -e

echo "========================================="
echo "ML Infrastructure Health Check"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ docker-compose not found${NC}"
    exit 1
fi

# Check if services are running
echo "Checking service status..."
echo ""

services=("ml-zookeeper" "ml-kafka" "ml-minio" "ml-spark-master" "ml-spark-worker" "ml-mlflow" "ml-ray-head")

all_healthy=true

for service in "${services[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
        # Check health status
        health=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "unknown")
        
        if [ "$health" == "healthy" ]; then
            echo -e "${GREEN}✓${NC} $service: running (healthy)"
        elif [ "$health" == "unknown" ]; then
            # No healthcheck defined, just check if running
            status=$(docker inspect --format='{{.State.Status}}' "$service")
            if [ "$status" == "running" ]; then
                echo -e "${YELLOW}⚠${NC} $service: running (no healthcheck)"
            else
                echo -e "${RED}✗${NC} $service: $status"
                all_healthy=false
            fi
        else
            echo -e "${RED}✗${NC} $service: $health"
            all_healthy=false
        fi
    else
        echo -e "${RED}✗${NC} $service: not running"
        all_healthy=false
    fi
done

echo ""
echo "Checking service connectivity..."
echo ""

# Check Kafka
if nc -z localhost 29092 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Kafka: localhost:29092"
else
    echo -e "${RED}✗${NC} Kafka: localhost:29092 not reachable"
    all_healthy=false
fi

# Check MinIO
if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} MinIO API: localhost:9000"
else
    echo -e "${RED}✗${NC} MinIO API: localhost:9000 not reachable"
    all_healthy=false
fi

# Check MinIO Console
if curl -s http://localhost:9001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} MinIO Console: localhost:9001"
else
    echo -e "${YELLOW}⚠${NC} MinIO Console: localhost:9001 not reachable"
fi

# Check Spark Master
if curl -s http://localhost:8081 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Spark Master UI: localhost:8081"
else
    echo -e "${RED}✗${NC} Spark Master UI: localhost:8081 not reachable"
    all_healthy=false
fi

# Check MLflow
if curl -s http://localhost:5050 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} MLflow: localhost:5050"
else
    echo -e "${RED}✗${NC} MLflow: localhost:5050 not reachable"
    all_healthy=false
fi

# Check Ray Dashboard
if curl -s http://localhost:8265 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Ray Dashboard: localhost:8265"
else
    echo -e "${YELLOW}⚠${NC} Ray Dashboard: localhost:8265 not reachable"
fi

echo ""
echo "========================================="

if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}All services are healthy!${NC}"
    echo ""
    echo "Access points:"
    echo "  - MinIO Console: http://localhost:9001 (admin/admin123456)"
    echo "  - Spark Master:  http://localhost:8081"
    echo "  - MLflow:        http://localhost:5050"
    echo "  - Ray Dashboard: http://localhost:8265"
    echo "  - Jupyter:       http://localhost:8888"
    exit 0
else
    echo -e "${RED}Some services are unhealthy or not running${NC}"
    echo ""
    echo "To start services:"
    echo "  docker-compose -f docker-compose.ml-infra.yml up -d"
    echo ""
    echo "To view logs:"
    echo "  docker-compose -f docker-compose.ml-infra.yml logs -f [service-name]"
    exit 1
fi
