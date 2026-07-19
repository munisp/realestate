#!/bin/bash

# Infrastructure Deployment Script
# Deploys all microservices and middleware components

set -e

echo "========================================="
echo "Real Estate Platform - Infrastructure Deployment"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Navigate to project directory
cd "$(dirname "$0")/.."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cat > .env << 'EOF'
# Database
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=realestate
MYSQL_USER=realestate_user
MYSQL_PASSWORD=realestate_pass

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=realestate-platform

# Service URLs
ML_VALUATION_SERVICE_URL=http://localhost:5000
OCR_SERVICE_URL=http://localhost:5001
FRAUD_DETECTION_SERVICE_URL=http://localhost:5002
GEOSPATIAL_SERVICE_URL=http://localhost:5003

# Go Services
PAYMENT_SERVICE_HOST=localhost
PAYMENT_SERVICE_PORT=50051
NOTIFICATION_SERVICE_HOST=localhost
NOTIFICATION_SERVICE_PORT=50052
IMAGE_SERVICE_HOST=localhost
IMAGE_SERVICE_PORT=50053

# Lakehouse
LAKEHOUSE_API_URL=http://localhost:8000
TRINO_URL=http://localhost:8080

# Payment Providers (add your keys)
STRIPE_SECRET_KEY=
FLUTTERWAVE_SECRET_KEY=
PAYSTACK_SECRET_KEY=
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Function to check service health
check_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo -n "Waiting for $service to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep -q "$service.*healthy\|$service.*Up"; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e " ${RED}✗ (timeout)${NC}"
    return 1
}

# Step 1: Start core infrastructure
echo "========================================="
echo "Step 1: Starting Core Infrastructure"
echo "========================================="
echo ""

echo "Starting MySQL..."
docker-compose up -d mysql
check_service "mysql" 3306

echo "Starting PostgreSQL with PostGIS..."
docker-compose up -d postgres
check_service "postgres" 5432

echo "Starting Redis..."
docker-compose up -d redis
check_service "redis" 6379

echo ""
echo -e "${GREEN}✓ Core infrastructure started${NC}"
echo ""

# Step 2: Start message queue
echo "========================================="
echo "Step 2: Starting Message Queue"
echo "========================================="
echo ""

echo "Starting Zookeeper..."
docker-compose up -d zookeeper
sleep 5

echo "Starting Kafka..."
docker-compose up -d kafka
check_service "kafka" 9092

echo ""
echo -e "${GREEN}✓ Message queue started${NC}"
echo ""

# Step 3: Start Python AI services
echo "========================================="
echo "Step 3: Starting Python AI Services"
echo "========================================="
echo ""

echo "Starting ML Valuation Service..."
docker-compose up -d ml-valuation-service
sleep 3

echo "Starting OCR Service..."
docker-compose up -d ocr-service
sleep 3

echo "Starting Fraud Detection Service..."
docker-compose up -d fraud-detection-service
sleep 3

echo "Starting MLflow..."
docker-compose up -d mlflow
sleep 3

echo ""
echo -e "${GREEN}✓ Python AI services started${NC}"
echo ""

# Step 4: Start Go microservices
echo "========================================="
echo "Step 4: Starting Go Microservices"
echo "========================================="
echo ""

echo "Starting Payment Service..."
docker-compose up -d payment-service
sleep 3

echo "Starting Notification Service..."
docker-compose up -d notification-service
sleep 3

echo "Starting Image Service..."
docker-compose up -d image-service
sleep 3

echo ""
echo -e "${GREEN}✓ Go microservices started${NC}"
echo ""

# Step 5: Verify all services
echo "========================================="
echo "Step 5: Verifying Services"
echo "========================================="
echo ""

docker-compose ps

echo ""
echo "========================================="
echo "Service Health Check"
echo "========================================="
echo ""

# Check each service
services=("mysql" "postgres" "redis" "kafka" "ml-valuation-service" "ocr-service" "fraud-detection-service" "payment-service" "notification-service" "image-service")

all_healthy=true
for service in "${services[@]}"; do
    if docker-compose ps | grep -q "$service.*Up\|$service.*healthy"; then
        echo -e "$service: ${GREEN}✓ Running${NC}"
    else
        echo -e "$service: ${RED}✗ Not running${NC}"
        all_healthy=false
    fi
done

echo ""

if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✓ All services deployed successfully!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "Service Endpoints:"
    echo "  MySQL:                localhost:3306"
    echo "  PostgreSQL (PostGIS): localhost:5432"
    echo "  Redis:                localhost:6379"
    echo "  Kafka:                localhost:9092"
    echo "  ML Valuation:         http://localhost:5000"
    echo "  OCR Service:          http://localhost:5001"
    echo "  Fraud Detection:      http://localhost:5002"
    echo "  Payment Service:      http://localhost:8080 (gRPC: 50051)"
    echo "  Notification Service: http://localhost:8081 (gRPC: 50052)"
    echo "  Image Service:        http://localhost:8082 (gRPC: 50053)"
    echo "  MLflow:               http://localhost:5050"
    echo ""
    echo "Next steps:"
    echo "  1. Run property migration: ./scripts/migrate-geospatial.sh"
    echo "  2. Deploy APIsix gateway: ./scripts/deploy-apisix.sh"
    echo ""
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}✗ Some services failed to start${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo "Check logs with: docker-compose logs <service-name>"
    exit 1
fi
