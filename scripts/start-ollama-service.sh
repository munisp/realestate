#!/bin/bash

# Start Ollama Python Service
# Starts the enhanced Flask service with Kafka integration

set -e

echo "========================================="
echo "Starting Ollama Python Service"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SERVICE_DIR="/home/ubuntu/realestate-platform/python-services/ollama-chatbot"
VENV_DIR="$SERVICE_DIR/venv"
LOG_DIR="$SERVICE_DIR/logs"
PID_FILE="/tmp/ollama-service.pid"

# Create logs directory
mkdir -p "$LOG_DIR"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${RED}✗${NC} Ollama is not running"
    echo "Please start Ollama first:"
    echo "  ./scripts/setup-ollama.sh"
    exit 1
fi

echo -e "${GREEN}✓${NC} Ollama is running"

# Check if virtual environment exists
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    cd "$SERVICE_DIR"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements_enhanced.txt
    echo -e "${GREEN}✓${NC} Virtual environment created"
else
    echo -e "${GREEN}✓${NC} Virtual environment exists"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Set environment variables
export OLLAMA_API_URL=${OLLAMA_API_URL:-http://localhost:11434}
export OLLAMA_MODEL=${OLLAMA_MODEL:-llama2}
export KAFKA_ENABLED=${KAFKA_ENABLED:-false}
export KAFKA_BROKERS=${KAFKA_BROKERS:-localhost:29092}
export MLFLOW_TRACKING_URI=${MLFLOW_TRACKING_URI:-http://localhost:5050}
export PORT=${PORT:-5004}

echo ""
echo "Configuration:"
echo "  - Ollama API: $OLLAMA_API_URL"
echo "  - Model: $OLLAMA_MODEL"
echo "  - Kafka Enabled: $KAFKA_ENABLED"
echo "  - Port: $PORT"
echo ""

# Check if service is already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}Service is already running (PID: $OLD_PID)${NC}"
        echo "To restart, first stop it:"
        echo "  kill $OLD_PID"
        exit 1
    else
        rm "$PID_FILE"
    fi
fi

# Start service
echo "Starting Ollama service..."
cd "$SERVICE_DIR"

# Use gunicorn for production
if command -v gunicorn &> /dev/null; then
    gunicorn -w 4 -b 0.0.0.0:$PORT \
        --access-logfile "$LOG_DIR/access.log" \
        --error-logfile "$LOG_DIR/error.log" \
        --daemon \
        --pid "$PID_FILE" \
        app_enhanced:app
    
    echo -e "${GREEN}✓${NC} Service started with gunicorn (PID: $(cat $PID_FILE))"
else
    # Fallback to Flask development server
    echo -e "${YELLOW}⚠${NC} gunicorn not found, using Flask development server"
    python app_enhanced.py > "$LOG_DIR/app.log" 2>&1 &
    echo $! > "$PID_FILE"
    echo -e "${GREEN}✓${NC} Service started (PID: $(cat $PID_FILE))"
fi

# Wait for service to be ready
echo "Waiting for service to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Service is ready"
        break
    fi
    sleep 1
done

# Check health
echo ""
echo "Health check:"
curl -s http://localhost:$PORT/health | python3 -m json.tool

echo ""
echo "========================================="
echo -e "${GREEN}Ollama service is running!${NC}"
echo "========================================="
echo ""
echo "Service URL: http://localhost:$PORT"
echo "Health: http://localhost:$PORT/health"
echo "Logs: $LOG_DIR/"
echo ""
echo "To stop the service:"
echo "  kill \$(cat $PID_FILE)"
echo ""
echo "To view logs:"
echo "  tail -f $LOG_DIR/app.log"
echo ""
