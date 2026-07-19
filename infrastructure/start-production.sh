#!/bin/bash

# Production Infrastructure Startup Script
# Deploys all Critical Priority services: Keycloak, APISIX, OpenAppSec, Permify, PgBouncer, Redis

set -e

echo "========================================="
echo "Real Estate Platform - Production Deploy"
echo "========================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed"
    exit 1
fi

# Check .env file
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please create .env file with required environment variables"
    echo "See PRODUCTION_DEPLOYMENT.md for details"
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
required_vars=(
    "KEYCLOAK_ADMIN_PASSWORD"
    "KEYCLOAK_DB_PASSWORD"
    "PERMIFY_DB_PASSWORD"
    "REDIS_PASSWORD"
    "DATABASE_URL"
    "GRAFANA_PASSWORD"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set in .env file"
        exit 1
    fi
done

echo "✓ Environment variables validated"
echo ""

# Create required directories
echo "Creating required directories..."
mkdir -p logs
mkdir -p backups
mkdir -p monitoring/dashboards
echo "✓ Directories created"
echo ""

# Pull latest images
echo "Pulling latest Docker images..."
docker-compose -f docker-compose.production.yml pull
echo "✓ Images pulled"
echo ""

# Start infrastructure services
echo "Starting infrastructure services..."
echo ""

echo "1/10 Starting Keycloak (Authentication)..."
docker-compose -f docker-compose.production.yml up -d keycloak-db keycloak
sleep 10

echo "2/10 Starting APISIX (API Gateway)..."
docker-compose -f docker-compose.production.yml up -d etcd apisix
sleep 5

echo "3/10 Starting OpenAppSec (WAF)..."
docker-compose -f docker-compose.production.yml up -d elasticsearch openappsec
sleep 10

echo "4/10 Starting Permify (Authorization)..."
docker-compose -f docker-compose.production.yml up -d permify-db permify
sleep 5

echo "5/10 Starting PgBouncer (Connection Pooling)..."
docker-compose -f docker-compose.production.yml up -d pgbouncer
sleep 3

echo "6/10 Starting Redis Cluster (Caching)..."
docker-compose -f docker-compose.production.yml up -d redis-master redis-replica-1 redis-replica-2
sleep 5

echo "7/10 Starting Go Microservices..."
docker-compose -f docker-compose.production.yml up -d auth-service
sleep 3

echo "8/10 Starting Python Microservices..."
docker-compose -f docker-compose.production.yml up -d security-scanner
sleep 3

echo "9/10 Starting Monitoring Stack..."
docker-compose -f docker-compose.production.yml up -d prometheus grafana
sleep 5

echo "10/10 All services started!"
echo ""

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 15

# Check service health
echo ""
echo "========================================="
echo "Service Health Check"
echo "========================================="
echo ""

check_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo "✓ $service is healthy"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "✗ $service failed to start"
    return 1
}

check_service "Keycloak" "http://localhost:8080/health"
check_service "APISIX" "http://localhost:9080/health"
check_service "Permify" "http://localhost:3476/healthz"
check_service "Auth Service" "http://localhost:8081/health"
check_service "Security Scanner" "http://localhost:8082/health"
check_service "Prometheus" "http://localhost:9090/-/healthy"
check_service "Grafana" "http://localhost:3001/api/health"

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Service URLs:"
echo "  Keycloak Admin:     http://localhost:8080"
echo "  APISIX Gateway:     http://localhost:9080"
echo "  Permify API:        http://localhost:3476"
echo "  Auth Service:       http://localhost:8081"
echo "  Security Scanner:   http://localhost:8082"
echo "  Prometheus:         http://localhost:9090"
echo "  Grafana:            http://localhost:3001"
echo "  Redis Commander:    http://localhost:8081"
echo ""
echo "Next Steps:"
echo "  1. Access Keycloak admin console and import realm"
echo "  2. Load Permify authorization schema"
echo "  3. Configure APISIX routes"
echo "  4. Set up Grafana dashboards"
echo ""
echo "See PRODUCTION_DEPLOYMENT.md for detailed instructions"
echo ""

# Show running containers
echo "Running Containers:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "To view logs: docker-compose -f docker-compose.production.yml logs -f [service-name]"
echo "To stop all services: docker-compose -f docker-compose.production.yml down"
echo ""
