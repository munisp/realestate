# Ollama Integration Deployment Guide

Complete guide for deploying and managing Ollama-powered AI chatbot with lakehouse integration for the Real Estate Platform.

---

## Architecture Overview

```
TypeScript (tRPC) ←→ Python Ollama Service ←→ Ollama API
                              ↓
                         Kafka (Events)
                              ↓
                    Bronze Layer (Delta Lake)
                              ↓
                    Silver Layer (Spark Transform)
                              ↓
                    Gold Layer (ML Features)
                              ↓
                    Fine-Tuning Pipeline
                              ↓
                    MLflow (Model Registry)
```

---

## Components

### 1. **Python Ollama Service** (`python-services/ollama-chatbot/`)
- Flask API wrapping Ollama
- Conversation logging to Kafka
- MLflow integration for model tracking
- Endpoints: `/chat`, `/analyze/property`, `/explain/document`, `/recommend/properties`

### 2. **TypeScript Integration** (`server/routers/`)
- `aiChatbot.ts` - User-facing chat endpoints
- `ollamaModelManagement.ts` - Admin model management

### 3. **Lakehouse Pipeline** (`lakehouse/spark-jobs/`)
- `ollama_silver_transformation.py` - Clean and enrich conversations
- `ollama_gold_aggregation.py` - Create ML-ready datasets

### 4. **Fine-Tuning** (`python-services/ollama-chatbot/finetune_model.py`)
- Load training data from Gold layer
- Create Ollama Modelfile
- Fine-tune custom models

---

## Prerequisites

### Software Requirements
- Docker & Docker Compose
- Ollama CLI (`curl https://ollama.ai/install.sh | sh`)
- Python 3.9+ (for local development)
- Node.js 18+ (already installed)

### Infrastructure Requirements
- Kafka cluster (from `docker-compose.ml-infra.yml`)
- MinIO (S3-compatible storage)
- Apache Spark cluster
- MLflow tracking server

---

## Deployment Steps

### Step 1: Start Lakehouse Infrastructure

```bash
cd /home/ubuntu/realestate-platform

# Start Kafka, MinIO, Spark, MLflow
docker-compose -f docker-compose.ml-infra.yml up -d

# Verify services are running
docker-compose -f docker-compose.ml-infra.yml ps
```

**Expected services:**
- Kafka: `localhost:29092`
- MinIO: `localhost:9000` (UI: `localhost:9001`)
- Spark Master: `localhost:8081`
- MLflow: `localhost:5050`

### Step 2: Install and Start Ollama

```bash
# Install Ollama (if not already installed)
curl https://ollama.ai/install.sh | sh

# Pull base model
ollama pull llama2

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

### Step 3: Deploy Python Ollama Service

```bash
cd python-services/ollama-chatbot

# Install dependencies
pip install -r requirements_enhanced.txt

# Set environment variables
export OLLAMA_API_URL=http://localhost:11434
export OLLAMA_MODEL=llama2
export KAFKA_ENABLED=true
export KAFKA_BROKERS=localhost:29092
export MLFLOW_TRACKING_URI=http://localhost:5050
export PORT=5004

# Start service
python app_enhanced.py

# Or use gunicorn for production
gunicorn -w 4 -b 0.0.0.0:5004 app_enhanced:app
```

### Step 4: Configure TypeScript Backend

Update `.env` or environment variables:

```bash
OLLAMA_SERVICE_URL=http://localhost:5004
```

Restart the development server:

```bash
pnpm dev
```

### Step 5: Create Delta Lake Tables

```bash
# Create Bronze layer for conversations
spark-submit --packages io.delta:delta-core_2.12:2.4.0 \
  lakehouse/scripts/create_bronze_tables.py

# Verify tables exist in MinIO
mc ls minio/bronze/ollama/
```

### Step 6: Run Lakehouse Pipeline

```bash
# Transform Bronze → Silver
spark-submit \
  --packages io.delta:delta-core_2.12:2.4.0 \
  lakehouse/spark-jobs/ollama_silver_transformation.py

# Aggregate Silver → Gold
spark-submit \
  --packages io.delta:delta-core_2.12:2.4.0 \
  lakehouse/spark-jobs/ollama_gold_aggregation.py
```

### Step 7: Fine-Tune Custom Model

```bash
cd python-services/ollama-chatbot

# Fine-tune using lakehouse data
python finetune_model.py \
  --base-model llama2 \
  --output-model realestate-assistant \
  --data-source lakehouse \
  --limit 1000

# Update service to use fine-tuned model
export OLLAMA_MODEL=realestate-assistant
```

---

## Usage

### From Frontend (TypeScript)

```typescript
import { trpc } from '@/lib/trpc';

// Send chat message
const { data } = await trpc.aiChatbot.chat.useMutation({
  messages: [
    { role: 'user', content: 'Find me a 3-bedroom house in Lagos' }
  ],
  context: 'property_search',
});

// Analyze property
const { data } = await trpc.aiChatbot.analyzeProperty.useMutation({
  property: {
    price: 50000000,
    location: 'Lagos',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 2000,
    type: 'Single Family',
  },
});

// Model management (admin only)
const { data } = await trpc.ollamaModelManagement.listModels.useQuery();
const { data } = await trpc.ollamaModelManagement.triggerFineTuning.useMutation({
  baseModel: 'llama2',
  outputModelName: 'realestate-assistant-v2',
  dataSource: 'lakehouse',
});
```

### Direct Python API

```bash
# Chat
curl -X POST http://localhost:5004/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "context": "general",
    "user_id": "123"
  }'

# Health check
curl http://localhost:5004/health
```

---

## Monitoring & Analytics

### MLflow UI
Access model tracking at: `http://localhost:5050`

- View fine-tuning runs
- Compare model versions
- Download model artifacts

### Conversation Analytics

Query Gold layer for insights:

```python
from delta import DeltaTable

# Daily metrics
daily_metrics = DeltaTable.forPath(
    spark,
    "s3a://gold/ollama/analytics/daily_metrics"
).toDF()

daily_metrics.show()
```

### Kafka Topics

Monitor conversation events:

```bash
# List topics
kafka-topics --bootstrap-server localhost:29092 --list

# Consume conversation events
kafka-console-consumer \
  --bootstrap-server localhost:29092 \
  --topic ollama.conversations \
  --from-beginning
```

---

## Model Fine-Tuning Workflow

### 1. Collect Conversation Data
- Users interact with chatbot via TypeScript frontend
- Conversations logged to Kafka → Bronze layer
- Spark transforms data → Silver layer
- Aggregations create training dataset → Gold layer

### 2. Prepare Training Data
```bash
spark-submit lakehouse/spark-jobs/ollama_gold_aggregation.py
```

### 3. Fine-Tune Model
```bash
python python-services/ollama-chatbot/finetune_model.py \
  --base-model llama2 \
  --output-model realestate-assistant-v2 \
  --data-source lakehouse
```

### 4. Deploy New Model
```bash
# Update environment variable
export OLLAMA_MODEL=realestate-assistant-v2

# Restart service
pkill -f app_enhanced.py
python app_enhanced.py
```

### 5. A/B Test Models
```typescript
// Admin dashboard
await trpc.abTesting.createExperiment.useMutation({
  name: 'Ollama Model Comparison',
  variants: [
    { name: 'llama2', weight: 0.5 },
    { name: 'realestate-assistant-v2', weight: 0.5 },
  ],
});
```

---

## Troubleshooting

### Ollama Service Not Responding

```bash
# Check if Ollama is running
ps aux | grep ollama

# Restart Ollama
ollama serve

# Check logs
journalctl -u ollama -f
```

### Kafka Connection Failed

```bash
# Verify Kafka is running
docker-compose -f docker-compose.ml-infra.yml ps kafka

# Check Kafka logs
docker-compose -f docker-compose.ml-infra.yml logs kafka

# Test connection
kafka-broker-api-versions --bootstrap-server localhost:29092
```

### Python Service Errors

```bash
# Check service logs
tail -f python-services/ollama-chatbot/logs/app.log

# Test Ollama connection
curl http://localhost:11434/api/tags

# Verify Kafka producer
python -c "from kafka import KafkaProducer; print('Kafka OK')"
```

### Spark Jobs Failing

```bash
# Check Spark master logs
docker-compose -f docker-compose.ml-infra.yml logs spark-master

# Verify MinIO connectivity
mc ls minio/bronze/

# Run job with verbose logging
spark-submit --conf spark.driver.extraJavaOptions="-Dlog4j.configuration=file:log4j.properties" \
  lakehouse/spark-jobs/ollama_silver_transformation.py
```

---

## Production Considerations

### Security
- Enable authentication for Ollama API
- Use TLS for Kafka connections
- Encrypt sensitive conversation data
- Implement rate limiting on chat endpoints

### Scalability
- Deploy multiple Ollama service replicas
- Use Kafka partitioning for high throughput
- Scale Spark cluster for large datasets
- Cache frequent queries with Redis

### Cost Optimization
- Use smaller models for simple queries
- Implement conversation caching
- Set retention policies for Delta Lake
- Monitor token usage and response times

### Compliance
- Implement PII detection and masking
- Add conversation audit logs
- Enable user data deletion (GDPR)
- Store conversation consent

---

## Environment Variables Reference

### Python Ollama Service
```bash
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:29092
MLFLOW_TRACKING_URI=http://localhost:5050
PORT=5004
```

### TypeScript Backend
```bash
OLLAMA_SERVICE_URL=http://localhost:5004
```

### Spark Jobs
```bash
BRONZE_PATH=s3a://bronze/ollama/conversations
SILVER_PATH=s3a://silver/ollama/conversations
GOLD_PATH_FINETUNING=s3a://gold/ollama/finetuning_data
GOLD_PATH_ANALYTICS=s3a://gold/ollama/analytics
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin123456
```

---

## Next Steps

1. **Enable Streaming Responses** - Implement SSE for real-time chat
2. **Add Voice Input** - Integrate Whisper for voice-to-text
3. **Multi-Modal Support** - Add image analysis with LLaVA
4. **Conversation Memory** - Implement long-term conversation context
5. **Custom Embeddings** - Use property embeddings for better recommendations

---

## Support

For issues or questions:
- Check logs in `python-services/ollama-chatbot/logs/`
- Review Spark job outputs in MinIO
- Consult MLflow UI for model metrics
- Contact platform admin for infrastructure issues
