#!/bin/bash

# Start All GNN Services
# ----------------------
# Starts the three Python GNN services in the background

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting City2Graph GNN Services...${NC}"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create logs directory
mkdir -p logs

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 not found${NC}"
    exit 1
fi

# Check if required packages are installed
echo -e "${BLUE}Checking dependencies...${NC}"
python3 -c "import flask" 2>/dev/null || {
    echo -e "${RED}Error: Flask not installed. Run: pip3 install -r requirements.txt${NC}"
    exit 1
}

# Function to start a service
start_service() {
    local service_name=$1
    local service_file=$2
    local port=$3
    local pid_file="logs/${service_name}.pid"
    local log_file="logs/${service_name}.log"
    
    # Check if service is already running
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}${service_name} already running (PID: $pid)${NC}"
            return
        else
            rm "$pid_file"
        fi
    fi
    
    # Start the service
    echo -e "${BLUE}Starting ${service_name} on port ${port}...${NC}"
    PORT=$port python3 "$service_file" > "$log_file" 2>&1 &
    local pid=$!
    echo $pid > "$pid_file"
    
    # Wait a bit and check if it's still running
    sleep 2
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${GREEN}${service_name} started successfully (PID: $pid)${NC}"
    else
        echo -e "${RED}${service_name} failed to start. Check $log_file${NC}"
        rm "$pid_file"
        exit 1
    fi
}

# Start services
start_service "GNN-Valuation" "city2graph_gnn_service.py" 5008
start_service "Market-Trends" "market_trend_prediction.py" 5009
start_service "Neighborhood-Intelligence" "neighborhood_intelligence.py" 5010

echo ""
echo -e "${GREEN}All services started successfully!${NC}"
echo ""
echo "Service URLs:"
echo "  - GNN Valuation:            http://localhost:5008"
echo "  - Market Trends:            http://localhost:5009"
echo "  - Neighborhood Intelligence: http://localhost:5010"
echo ""
echo "Health checks:"
echo "  curl http://localhost:5008/health"
echo "  curl http://localhost:5009/health"
echo "  curl http://localhost:5010/health"
echo ""
echo "Logs:"
echo "  tail -f logs/GNN-Valuation.log"
echo "  tail -f logs/Market-Trends.log"
echo "  tail -f logs/Neighborhood-Intelligence.log"
echo ""
echo "To stop services: ./stop_gnn_services.sh"
