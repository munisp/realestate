#!/bin/bash

# Docker Compose Testing Script
# Tests all services in the microservices architecture

set -e

echo "========================================="
echo "Real Estate Platform - Docker Compose Test"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_success "Docker is running"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi

print_success "Docker Compose is installed"

# Navigate to project root
cd "$(dirname "$0")/.."

print_info "Starting services with Docker Compose..."
docker-compose up -d

echo ""
print_info "Waiting for services to be healthy..."
sleep 30

# Test PostgreSQL
print_info "Testing PostgreSQL..."
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    print_success "PostgreSQL is healthy"
else
    print_error "PostgreSQL is not responding"
    exit 1
fi

# Test PostGIS extension
print_info "Testing PostGIS extension..."
if docker-compose exec -T postgres psql -U postgres -d realestate -c "SELECT PostGIS_Version();" > /dev/null 2>&1; then
    print_success "PostGIS extension is installed"
else
    print_error "PostGIS extension is not available"
    exit 1
fi

# Test Redis
print_info "Testing Redis..."
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    print_success "Redis is healthy"
else
    print_error "Redis is not responding"
    exit 1
fi

# Test Kafka
print_info "Testing Kafka..."
if docker-compose exec -T kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1; then
    print_success "Kafka is healthy"
else
    print_error "Kafka is not responding"
    exit 1
fi

# Test Property Service
print_info "Testing Property Service..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    print_success "Property Service is healthy"
else
    print_error "Property Service is not responding"
    exit 1
fi

# Test Valuation Service
print_info "Testing Valuation Service..."
if curl -f http://localhost:8000/api/v1/valuations/health > /dev/null 2>&1; then
    print_success "Valuation Service is healthy"
else
    print_error "Valuation Service is not responding"
    exit 1
fi

# Test MLflow
print_info "Testing MLflow..."
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    print_success "MLflow is healthy"
else
    print_info "MLflow is not responding (optional service)"
fi

echo ""
echo "========================================="
echo "Service Status Summary"
echo "========================================="
docker-compose ps

echo ""
echo "========================================="
echo "All tests passed!"
echo "========================================="
echo ""
echo "Services are running at:"
echo "  - Property Service:   http://localhost:8080"
echo "  - Valuation Service:  http://localhost:8000"
echo "  - Frontend:           http://localhost:3000"
echo "  - MLflow:             http://localhost:5000"
echo "  - PostgreSQL:         localhost:5432"
echo "  - Redis:              localhost:6379"
echo "  - Kafka:              localhost:29092"
echo ""
echo "To view logs: docker-compose logs -f [service-name]"
echo "To stop services: docker-compose down"
echo ""
