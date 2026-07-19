#!/bin/bash

# PostGIS to Lakehouse CDC Setup Script
# Configures Debezium connector for Change Data Capture

set -e

echo "🚀 Setting up CDC from PostGIS to Lakehouse..."

# Configuration
DEBEZIUM_URL="http://localhost:8083"
POSTGIS_HOST="${POSTGIS_HOST:-localhost}"
POSTGIS_PORT="${POSTGIS_PORT:-5432}"
POSTGIS_DB="${POSTGIS_DB:-realestate_spatial}"
POSTGIS_USER="${POSTGIS_USER:-postgres}"
POSTGIS_PASSWORD="${POSTGIS_PASSWORD:-postgis_dev_password}"

# Wait for Debezium to be ready
echo "⏳ Waiting for Debezium Connect to be ready..."
until curl -f -s "${DEBEZIUM_URL}/" > /dev/null; do
  echo "Waiting for Debezium..."
  sleep 5
done
echo "✅ Debezium is ready"

# Create Debezium connector for PostGIS
echo "📝 Creating Debezium connector..."
curl -X POST "${DEBEZIUM_URL}/connectors" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "postgis-source-connector",
    "config": {
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "plugin.name": "pgoutput",
      "database.hostname": "'"${POSTGIS_HOST}"'",
      "database.port": "'"${POSTGIS_PORT}"'",
      "database.user": "'"${POSTGIS_USER}"'",
      "database.password": "'"${POSTGIS_PASSWORD}"'",
      "database.dbname": "'"${POSTGIS_DB}"'",
      "database.server.name": "postgis",
      "table.include.list": "spatial.properties_spatial,spatial.neighborhoods,spatial.h3_clusters_7,spatial.h3_clusters_9",
      "publication.name": "dbz_publication",
      "slot.name": "debezium_slot",
      "publication.autocreate.mode": "filtered",
      "heartbeat.interval.ms": "10000",
      "transforms": "unwrap",
      "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
      "transforms.unwrap.drop.tombstones": "false",
      "key.converter": "org.apache.kafka.connect.json.JsonConverter",
      "value.converter": "org.apache.kafka.connect.json.JsonConverter",
      "key.converter.schemas.enable": "false",
      "value.converter.schemas.enable": "false"
    }
  }'

echo ""
echo "✅ Debezium connector created successfully"

# Check connector status
echo "📊 Checking connector status..."
curl -s "${DEBEZIUM_URL}/connectors/postgis-source-connector/status" | jq '.'

echo ""
echo "🎉 CDC setup complete!"
echo ""
echo "📋 Kafka topics created:"
echo "  - postgis.spatial.properties_spatial"
echo "  - postgis.spatial.neighborhoods"
echo "  - postgis.spatial.h3_clusters_7"
echo "  - postgis.spatial.h3_clusters_9"
echo ""
echo "🔍 Monitor CDC:"
echo "  - Debezium UI: http://localhost:8083"
echo "  - Kafka topics: docker exec -it realestate-kafka kafka-topics --list --bootstrap-server localhost:9092"
echo "  - Consumer test: docker exec -it realestate-kafka kafka-console-consumer --topic postgis.spatial.properties_spatial --from-beginning --bootstrap-server localhost:9092"
