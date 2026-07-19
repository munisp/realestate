#!/bin/bash

# GNN Service Deployment Script
# This script deploys the Python GNN service for property valuation

set -e

echo "🚀 Starting GNN Service Deployment..."

# Configuration
GNN_SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GNN_SERVICE_PORT="${GNN_SERVICE_PORT:-5002}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="$GNN_SERVICE_DIR/venv"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Python is installed
if ! command -v $PYTHON_BIN &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

print_success "Python found: $($PYTHON_BIN --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating Python virtual environment..."
    $PYTHON_BIN -m venv "$VENV_DIR"
    print_success "Virtual environment created"
else
    print_warning "Virtual environment already exists"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
print_success "pip upgraded"

# Install dependencies
echo "Installing Python dependencies..."
if [ -f "$GNN_SERVICE_DIR/requirements-gnn.txt" ]; then
    pip install -r "$GNN_SERVICE_DIR/requirements-gnn.txt"
    print_success "Dependencies installed from requirements-gnn.txt"
else
    # Install core dependencies
    pip install flask flask-cors torch torch-geometric numpy redis requests gunicorn
    print_success "Core dependencies installed"
fi

# Check if the GNN service file exists
if [ ! -f "$GNN_SERVICE_DIR/gnn_service.py" ]; then
    print_error "GNN service file not found: $GNN_SERVICE_DIR/gnn_service.py"
    exit 1
fi

# Create logs directory
mkdir -p "$GNN_SERVICE_DIR/logs"

# Check if Redis is running (for caching)
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is running (caching enabled)"
    else
        print_warning "Redis is not running (caching disabled)"
    fi
else
    print_warning "Redis not installed (caching disabled)"
fi

# Start the service
echo ""
echo "Starting GNN Service on port $GNN_SERVICE_PORT..."
echo "Service directory: $GNN_SERVICE_DIR"
echo "Log file: $GNN_SERVICE_DIR/logs/gnn-service.log"
echo ""

# Check if service is already running
if lsof -Pi :$GNN_SERVICE_PORT -sTCP:LISTEN -t >/dev/null ; then
    print_warning "Port $GNN_SERVICE_PORT is already in use. Stopping existing service..."
    pkill -f "gnn_service.py" || true
    sleep 2
fi

# Start service with gunicorn for production
if command -v gunicorn &> /dev/null; then
    echo "Starting with Gunicorn (production mode)..."
    cd "$GNN_SERVICE_DIR"
    gunicorn -w 4 -b 0.0.0.0:$GNN_SERVICE_PORT \
        --timeout 120 \
        --access-logfile "$GNN_SERVICE_DIR/logs/access.log" \
        --error-logfile "$GNN_SERVICE_DIR/logs/error.log" \
        --log-level info \
        --daemon \
        gnn_service:app
    
    sleep 3
    
    # Verify service is running
    if lsof -Pi :$GNN_SERVICE_PORT -sTCP:LISTEN -t >/dev/null ; then
        print_success "GNN Service started successfully with Gunicorn"
    else
        print_error "Failed to start GNN Service"
        exit 1
    fi
else
    # Fallback to Flask development server
    print_warning "Gunicorn not found, starting with Flask development server..."
    cd "$GNN_SERVICE_DIR"
    nohup $PYTHON_BIN gnn_service.py > "$GNN_SERVICE_DIR/logs/gnn-service.log" 2>&1 &
    
    sleep 3
    
    # Verify service is running
    if lsof -Pi :$GNN_SERVICE_PORT -sTCP:LISTEN -t >/dev/null ; then
        print_success "GNN Service started successfully with Flask"
    else
        print_error "Failed to start GNN Service"
        exit 1
    fi
fi

# Health check
echo ""
echo "Performing health check..."
sleep 2

HEALTH_URL="http://localhost:$GNN_SERVICE_PORT/health"
if curl -s "$HEALTH_URL" | grep -q "healthy"; then
    print_success "Health check passed"
    echo ""
    echo "GNN Service is ready!"
    echo "  - Health: $HEALTH_URL"
    echo "  - Score Property: http://localhost:$GNN_SERVICE_PORT/api/score-property"
    echo "  - Batch Score: http://localhost:$GNN_SERVICE_PORT/api/batch-score"
    echo ""
    print_success "Deployment complete! 🎉"
else
    print_error "Health check failed"
    echo "Check logs at: $GNN_SERVICE_DIR/logs/gnn-service.log"
    exit 1
fi

# Display service info
echo ""
echo "Service Information:"
echo "  - PID: $(lsof -Pi :$GNN_SERVICE_PORT -sTCP:LISTEN -t)"
echo "  - Port: $GNN_SERVICE_PORT"
echo "  - Logs: $GNN_SERVICE_DIR/logs/"
echo ""
echo "To stop the service, run:"
echo "  pkill -f gnn_service.py"
echo ""
