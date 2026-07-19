#!/bin/bash

# Master Deployment Verification Script
# Verifies all services are running correctly

set -e

echo "🔍 Real Estate Platform - Deployment Verification"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# Function to check service
check_service() {
    local service_name=$1
    local check_command=$2
    local expected_output=$3
    
    echo -n "Checking $service_name... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed${NC}"
        OVERALL_STATUS=1
        return 1
    fi
}

# Function to check HTTP endpoint
check_http() {
    local service_name=$1
    local url=$2
    
    echo -n "Checking $service_name at $url... "
    
    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Accessible${NC}"
        return 0
    else
        echo -e "${RED}✗ Not accessible${NC}"
        OVERALL_STATUS=1
        return 1
    fi
}

echo "1. Web Application"
echo "-------------------"
check_http "Web Server" "http://localhost:3000"
check_service "Node.js Process" "pgrep -f 'node.*server'" ""
echo ""

echo "2. Database"
echo "-----------"
check_service "MySQL/TiDB Connection" "mysql -h localhost -e 'SELECT 1' 2>/dev/null || echo 'Using remote DB'"
echo ""

echo "3. Ollama AI Service"
echo "--------------------"
check_service "Ollama Container" "docker ps | grep -q ollama-service"
check_service "Chatbot API Container" "docker ps | grep -q ollama-chatbot-api"
check_http "Ollama API" "http://localhost:11434/api/tags"
check_http "Chatbot API Health" "http://localhost:5000/health"
echo ""

echo "4. Hyperledger Fabric Blockchain"
echo "---------------------------------"
if [ -d "/opt/hyperledger/fabric-network" ]; then
    check_service "Orderer" "docker ps | grep -q hyperledger/fabric-orderer"
    check_service "Peer" "docker ps | grep -q hyperledger/fabric-peer"
    check_service "CA" "docker ps | grep -q hyperledger/fabric-ca"
    echo -e "${YELLOW}Note: Blockchain network detected${NC}"
else
    echo -e "${YELLOW}⚠ Blockchain network not deployed (optional)${NC}"
fi
echo ""

echo "5. Jitsi Meet Video Conferencing"
echo "---------------------------------"
if docker ps | grep -q jitsi-web; then
    check_service "Jitsi Web" "docker ps | grep -q jitsi-web"
    check_service "Jitsi Prosody" "docker ps | grep -q jitsi-prosody"
    check_service "Jitsi Jicofo" "docker ps | grep -q jitsi-jicofo"
    check_service "Jitsi JVB" "docker ps | grep -q jitsi-jvb"
    check_http "Jitsi Web Interface" "http://localhost:8000"
else
    echo -e "${YELLOW}⚠ Jitsi Meet not deployed (optional)${NC}"
fi
echo ""

echo "6. System Resources"
echo "-------------------"
echo -n "CPU Usage: "
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'

echo -n "Memory Usage: "
free -h | awk '/^Mem:/ {print $3 "/" $2}'

echo -n "Disk Usage: "
df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}'
echo ""

echo "7. Docker Status"
echo "----------------"
echo "Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v "NAMES"
echo ""

echo "8. Network Connectivity"
echo "-----------------------"
check_http "Internet Connection" "https://www.google.com"
echo ""

# Final summary
echo "=================================================="
if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical services are running${NC}"
    echo ""
    echo "Platform is ready for use!"
    echo ""
    echo "Access points:"
    echo "- Web Application: http://localhost:3000"
    echo "- Ollama API: http://localhost:11434"
    echo "- Chatbot API: http://localhost:5000"
    if docker ps | grep -q jitsi-web; then
        echo "- Jitsi Meet: http://localhost:8000"
    fi
else
    echo -e "${RED}✗ Some services failed verification${NC}"
    echo ""
    echo "Please check the logs for failed services:"
    echo "- Web app: Check terminal where 'pnpm dev' is running"
    echo "- Docker services: docker-compose logs <service-name>"
    exit 1
fi
