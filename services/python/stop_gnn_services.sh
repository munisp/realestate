#!/bin/bash

# Stop All GNN Services
# ---------------------
# Stops all running GNN services

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping City2Graph GNN Services...${NC}"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${BLUE}Stopping ${service_name} (PID: $pid)...${NC}"
            kill "$pid"
            sleep 1
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${RED}Force killing ${service_name}...${NC}"
                kill -9 "$pid"
            fi
            
            rm "$pid_file"
            echo -e "${GREEN}${service_name} stopped${NC}"
        else
            echo -e "${RED}${service_name} not running (stale PID file)${NC}"
            rm "$pid_file"
        fi
    else
        echo -e "${RED}${service_name} not running${NC}"
    fi
}

# Stop services
stop_service "GNN-Valuation"
stop_service "Market-Trends"
stop_service "Neighborhood-Intelligence"

echo ""
echo -e "${GREEN}All services stopped${NC}"
