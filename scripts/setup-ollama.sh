#!/bin/bash

# Ollama Setup Script
# Installs Ollama, pulls base model, and configures service

set -e

echo "========================================="
echo "Ollama Setup Script"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✓${NC} Ollama is already installed"
    ollama --version
else
    echo -e "${YELLOW}Installing Ollama...${NC}"
    curl -fsSL https://ollama.ai/install.sh | sh
    echo -e "${GREEN}✓${NC} Ollama installed successfully"
fi

echo ""
echo "Starting Ollama service..."
# Start Ollama in background
ollama serve > /tmp/ollama.log 2>&1 &
OLLAMA_PID=$!
echo -e "${GREEN}✓${NC} Ollama service started (PID: $OLLAMA_PID)"

# Wait for Ollama to be ready
echo "Waiting for Ollama API to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Ollama API is ready"
        break
    fi
    sleep 1
done

echo ""
echo "Pulling base model (llama2)..."
ollama pull llama2

echo ""
echo "========================================="
echo -e "${GREEN}Ollama setup complete!${NC}"
echo "========================================="
echo ""
echo "Ollama API: http://localhost:11434"
echo "Available models:"
ollama list
echo ""
echo "To pull additional models:"
echo "  ollama pull mistral"
echo "  ollama pull codellama"
echo "  ollama pull llava"
echo ""
