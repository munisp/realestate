#!/bin/bash

# Ollama Service Deployment Script
# Deploys Ollama AI service with Docker Compose

set -e

echo "🚀 Deploying Ollama AI Service..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create network if it doesn't exist
if ! docker network ls | grep -q realestate-network; then
    echo "📡 Creating Docker network..."
    docker network create realestate-network
fi

# Navigate to Ollama Docker directory
cd "$(dirname "$0")/../docker/ollama"

# Pull latest images
echo "📥 Pulling Docker images..."
docker-compose pull

# Start services
echo "🔧 Starting Ollama services..."
docker-compose up -d ollama ollama-chatbot

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to be ready..."
sleep 10

# Download models
echo "📦 Downloading AI models (this may take a while)..."
docker exec ollama-service ollama pull llama2
docker exec ollama-service ollama pull mistral

# Verify services
echo "✅ Verifying services..."
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama service is running"
else
    echo "❌ Ollama service failed to start"
    exit 1
fi

if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Ollama chatbot API is running"
else
    echo "❌ Ollama chatbot API failed to start"
    exit 1
fi

echo "
🎉 Ollama AI Service deployed successfully!

Services:
- Ollama API: http://localhost:11434
- Chatbot API: http://localhost:5000

Available models:
- llama2 (default)
- mistral

To test the service:
curl -X POST http://localhost:5000/chat \\
  -H 'Content-Type: application/json' \\
  -d '{
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello!\"}],
    \"context\": \"general\"
  }'

To view logs:
docker-compose logs -f

To stop services:
docker-compose down
"
