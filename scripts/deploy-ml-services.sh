#!/bin/bash

###############################################################################
# ML Services Deployment Script
#
# Automates deployment of all 5 ML microservices with health checks
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.ml.yml"
MAX_WAIT_TIME=120  # seconds

# Service health check endpoints
declare -A SERVICES=(
    ["gnn-service"]="http://localhost:5003/health"
    ["cv-service"]="http://localhost:5004/health"
    ["altdata-service"]="http://localhost:5005/health"
    ["ensemble-service"]="http://localhost:5006/health"
    ["bias-service"]="http://localhost:5007/health"
    ["mlflow"]="http://localhost:5001/health"
    ["redis"]="redis://localhost:6380"
)

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check .env file
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warning ".env file not found. Creating from .env.example..."
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            log_warning "Please update .env with your configuration"
        else
            log_error ".env.example not found"
            exit 1
        fi
    fi
    
    # Check required environment variables
    source "$PROJECT_ROOT/.env"
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL not set in .env"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

build_services() {
    log_info "Building ML services..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    log_success "Services built successfully"
}

start_services() {
    log_info "Starting ML services..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" up -d
    log_success "Services started"
}

wait_for_service() {
    local service_name=$1
    local health_url=$2
    local elapsed=0
    
    log_info "Waiting for $service_name to be healthy..."
    
    while [ $elapsed -lt $MAX_WAIT_TIME ]; do
        if [ "$service_name" == "redis" ]; then
            # Special check for Redis
            if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping &> /dev/null; then
                log_success "$service_name is healthy"
                return 0
            fi
        else
            # HTTP health check
            if curl -sf "$health_url" &> /dev/null; then
                log_success "$service_name is healthy"
                return 0
            fi
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    
    echo ""
    log_error "$service_name failed to become healthy after ${MAX_WAIT_TIME}s"
    return 1
}

check_all_services() {
    log_info "Performing health checks..."
    
    local failed_services=()
    
    for service in "${!SERVICES[@]}"; do
        if ! wait_for_service "$service" "${SERVICES[$service]}"; then
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "All services are healthy!"
        return 0
    else
        log_error "Failed services: ${failed_services[*]}"
        return 1
    fi
}

show_service_status() {
    log_info "Service Status:"
    echo ""
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
}

show_service_logs() {
    local service=$1
    log_info "Showing logs for $service (last 50 lines):"
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 "$service"
}

test_services() {
    log_info "Testing service endpoints..."
    
    # Test GNN service
    log_info "Testing GNN service..."
    curl -X POST http://localhost:5003/valuation \
        -H "Content-Type: application/json" \
        -d '{
            "property_id": 1,
            "latitude": 6.5244,
            "longitude": 3.3792,
            "square_feet": 2500,
            "bedrooms": 3,
            "bathrooms": 2,
            "year_built": 2015
        }' | jq '.' || log_warning "GNN service test failed"
    
    echo ""
    log_success "Service tests completed"
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
    echo ""
    log_info "=========================================="
    log_info "  ML Services Deployment"
    log_info "=========================================="
    echo ""
    
    # Step 1: Check prerequisites
    check_prerequisites
    echo ""
    
    # Step 2: Build services
    build_services
    echo ""
    
    # Step 3: Start services
    start_services
    echo ""
    
    # Step 4: Wait for services to be healthy
    if ! check_all_services; then
        log_error "Deployment failed - some services are unhealthy"
        show_service_status
        echo ""
        log_info "To view logs for a specific service, run:"
        log_info "  docker-compose -f $COMPOSE_FILE logs <service-name>"
        exit 1
    fi
    echo ""
    
    # Step 5: Show status
    show_service_status
    echo ""
    
    # Step 6: Test services
    test_services
    echo ""
    
    # Success message
    log_success "=========================================="
    log_success "  Deployment Complete!"
    log_success "=========================================="
    echo ""
    log_info "Service URLs:"
    log_info "  GNN Valuation:     http://localhost:5003"
    log_info "  Computer Vision:   http://localhost:5004"
    log_info "  Alternative Data:  http://localhost:5005"
    log_info "  Ensemble:          http://localhost:5006"
    log_info "  Bias Correction:   http://localhost:5007"
    log_info "  MLflow UI:         http://localhost:5001"
    log_info "  Redis:             redis://localhost:6380"
    echo ""
    log_info "Next steps:"
    log_info "  1. Run data collection: node scripts/collect-training-data.mjs"
    log_info "  2. Train models: ./scripts/train-all-models.sh"
    log_info "  3. Monitor in MLflow: http://localhost:5001"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --rebuild      Rebuild services without cache"
        echo "  --logs SERVICE View logs for a specific service"
        echo "  --stop         Stop all services"
        echo "  --restart      Restart all services"
        echo ""
        exit 0
        ;;
    --rebuild)
        build_services
        start_services
        check_all_services
        ;;
    --logs)
        if [ -z "$2" ]; then
            log_error "Please specify a service name"
            exit 1
        fi
        show_service_logs "$2"
        ;;
    --stop)
        log_info "Stopping all services..."
        docker-compose -f "$COMPOSE_FILE" down
        log_success "Services stopped"
        ;;
    --restart)
        log_info "Restarting all services..."
        docker-compose -f "$COMPOSE_FILE" restart
        check_all_services
        ;;
    *)
        main
        ;;
esac
