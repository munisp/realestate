# Lakehouse Deployment Guide

**Version:** 1.0.0  
**Date:** November 20, 2025  
**Platform:** Real Estate Analytics Lakehouse  

---

## 🎯 Overview

This guide provides step-by-step instructions to deploy the complete lakehouse infrastructure integrating **PostGIS** (operational), **Apache Sedona** (analytics), and **Delta Lake** (unified storage).

### Architecture Summary

```
PostGIS (Real-time) ──CDC──> Kafka ──Spark──> Delta Lake (Bronze/Silver/Gold) ──Sedona──> Analytics
                                                         │
                                                         └──Reverse ETL──> PostGIS (Cached Aggregates)
```

---

## 📋 Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 8 cores | 16 cores |
| RAM | 16 GB | 32 GB |
| Storage | 500 GB SSD | 1 TB NVMe SSD |
| Network | 1 Gbps | 10 Gbps |

### Software Requirements

- **Docker** 24.0+ with Docker Compose
- **PostgreSQL** 15+ with PostGIS 3.3+
- **Python** 3.9+
- **Java** 11+ (for Spark)
- **Git**

---

## 🚀 Deployment Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/realestate-platform.git
cd realestate-platform
```

---

### Step 2: Configure Environment

Create `.env` file:

```bash
# PostGIS Configuration
POSTGIS_HOST=localhost
POSTGIS_PORT=5432
POSTGIS_DB=realestate_spatial
POSTGIS_USER=postgres
POSTGIS_PASSWORD=your_secure_password

# MinIO (S3) Configuration
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=your_secure_password
MINIO_ENDPOINT=http://localhost:9000

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Spark Configuration
SPARK_MASTER_URL=spark://localhost:7077
SPARK_WORKER_MEMORY=4G
SPARK_WORKER_CORES=2

# Airflow Configuration
AIRFLOW__CORE__EXECUTOR=LocalExecutor
AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql+psycopg2://airflow:airflow@localhost:5434/airflow
```

---

### Step 3: Deploy PostGIS

```bash
# Start PostGIS container
docker-compose -f docker-compose.postgis.yml up -d

# Wait for PostGIS to be ready
docker exec -it realestate-postgis pg_isready -U postgres

# Initialize spatial schema
docker exec -i realestate-postgis psql -U postgres -d realestate_spatial < scripts/postgis-init/01-init-schema.sql
docker exec -i realestate-postgis psql -U postgres -d realestate_spatial < scripts/postgis-init/02-martin-views.sql

# Enable WAL for CDC
docker exec -it realestate-postgis psql -U postgres -c "ALTER SYSTEM SET wal_level = logical;"
docker exec -it realestate-postgis psql -U postgres -c "ALTER SYSTEM SET max_replication_slots = 10;"
docker restart realestate-postgis

# Create publication for Debezium
docker exec -it realestate-postgis psql -U postgres -d realestate_spatial -c "CREATE PUBLICATION dbz_publication FOR ALL TABLES;"
```

---

### Step 4: Deploy Lakehouse Infrastructure

```bash
# Start all lakehouse services
docker-compose -f docker-compose.lakehouse.yml up -d

# Verify all services are running
docker-compose -f docker-compose.lakehouse.yml ps

# Expected output:
# - minio (running)
# - zookeeper (running)
# - kafka (running)
# - debezium (running)
# - spark-master (running)
# - spark-worker-1 (running)
# - spark-worker-2 (running)
# - hive-metastore (running)
# - airflow-webserver (running)
# - airflow-scheduler (running)
```

---

### Step 5: Initialize Delta Lake Schemas

```bash
# Submit schema initialization job to Spark
docker exec -it realestate-spark-master spark-submit \
  --master spark://spark-master:7077 \
  --packages io.delta:delta-core_2.12:2.4.0 \
  --conf spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension \
  --conf spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog \
  /opt/spark-apps/init_delta_schemas.py

# Verify tables created
docker exec -it realestate-minio mc ls myminio/lakehouse-bronze
docker exec -it realestate-minio mc ls myminio/lakehouse-silver
docker exec -it realestate-minio mc ls myminio/lakehouse-gold
```

---

### Step 6: Configure CDC Pipeline

```bash
# Run CDC setup script
chmod +x scripts/setup-cdc.sh
./scripts/setup-cdc.sh

# Verify Debezium connector status
curl -s http://localhost:8083/connectors/postgis-source-connector/status | jq '.'

# Expected output:
# {
#   "name": "postgis-source-connector",
#   "connector": {
#     "state": "RUNNING",
#     "worker_id": "..."
#   },
#   "tasks": [
#     {
#       "id": 0,
#       "state": "RUNNING",
#       "worker_id": "..."
#     }
#   ]
# }
```

---

### Step 7: Start CDC Consumer

```bash
# Start Spark Structured Streaming job for CDC consumption
docker exec -d realestate-spark-master spark-submit \
  --master spark://spark-master:7077 \
  --packages io.delta:delta-core_2.12:2.4.0,org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0 \
  --conf spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension \
  --conf spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog \
  /opt/spark-apps/cdc_consumer.py

# Monitor CDC consumer logs
docker logs -f realestate-spark-master
```

---

### Step 8: Test CDC Pipeline

```bash
# Insert test property into PostGIS
docker exec -it realestate-postgis psql -U postgres -d realestate_spatial <<EOF
INSERT INTO spatial.properties_spatial (
  title, price, property_type, location, h3_index_7, h3_index_9
) VALUES (
  'Test Property',
  100000000,
  'residential',
  ST_SetSRID(ST_MakePoint(3.3792, 6.5244), 4326)::geography,
  '871f1e64dffffff',
  '891f1e649bfffff'
);
EOF

# Wait 5 seconds for CDC propagation
sleep 5

# Verify data in Bronze layer
docker exec -it realestate-spark-master spark-shell \
  --packages io.delta:delta-core_2.12:2.4.0 \
  --conf spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension \
  --conf spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog

# In Spark shell:
scala> spark.read.format("delta").load("s3a://lakehouse-bronze/properties").show()
```

---

### Step 9: Run Analytics Jobs

```bash
# Run neighborhood analytics job
docker exec -it realestate-spark-master spark-submit \
  --master spark://spark-master:7077 \
  --packages io.delta:delta-core_2.12:2.4.0,org.apache.sedona:sedona-spark-3.4_2.12:1.5.0 \
  --conf spark.serializer=org.apache.spark.serializer.KryoSerializer \
  --conf spark.kryo.registrator=org.apache.sedona.core.serde.SedonaKryoRegistrator \
  /opt/spark-apps/neighborhood_analytics.py

# Verify Gold layer output
docker exec -it realestate-minio mc ls myminio/lakehouse-gold/neighborhood_stats/
```

---

### Step 10: Configure Airflow

```bash
# Access Airflow UI
open http://localhost:8081

# Default credentials:
# Username: admin
# Password: admin

# Enable DAG
# 1. Navigate to DAGs page
# 2. Find "daily_analytics_pipeline"
# 3. Toggle ON

# Trigger manual run
airflow dags trigger daily_analytics_pipeline

# Monitor execution
airflow dags list-runs -d daily_analytics_pipeline
```

---

## 🔍 Verification Checklist

### Infrastructure Health

```bash
# Check all containers
docker-compose -f docker-compose.lakehouse.yml ps

# Check MinIO buckets
docker exec -it realestate-minio mc ls myminio/

# Check Kafka topics
docker exec -it realestate-kafka kafka-topics --list --bootstrap-server localhost:9092

# Check Spark cluster
curl http://localhost:8080  # Spark Master UI

# Check Airflow
curl http://localhost:8081/health
```

### Data Pipeline Health

```bash
# Check CDC connector
curl http://localhost:8083/connectors/postgis-source-connector/status

# Check Delta Lake tables
docker exec -it realestate-spark-master spark-sql \
  --packages io.delta:delta-core_2.12:2.4.0 \
  -e "SHOW TABLES IN bronze;"

# Check Gold layer row counts
docker exec -it realestate-spark-master spark-sql \
  --packages io.delta:delta-core_2.12:2.4.0 \
  -e "SELECT COUNT(*) FROM gold.neighborhood_stats;"
```

---

## 📊 Monitoring & Observability

### Spark UI

- **Master:** http://localhost:8080
- **Worker 1:** http://localhost:8081
- **Worker 2:** http://localhost:8082

### MinIO Console

- **URL:** http://localhost:9001
- **Credentials:** admin / minio_admin_password

### Airflow UI

- **URL:** http://localhost:8081
- **Credentials:** admin / admin

### Debezium Connect

- **URL:** http://localhost:8083
- **API:** `curl http://localhost:8083/connectors`

---

## 🔧 Troubleshooting

### Issue: CDC not working

**Symptoms:** No data in Bronze layer after inserting into PostGIS

**Solution:**
```bash
# Check Debezium connector status
curl http://localhost:8083/connectors/postgis-source-connector/status

# Check Kafka topic for messages
docker exec -it realestate-kafka kafka-console-consumer \
  --topic postgis.spatial.properties_spatial \
  --from-beginning \
  --bootstrap-server localhost:9092 \
  --max-messages 10

# Restart Debezium if needed
docker restart realestate-debezium
```

### Issue: Spark job fails with S3 connection error

**Symptoms:** `java.net.ConnectException: Connection refused (Connection refused)`

**Solution:**
```bash
# Verify MinIO is running
docker ps | grep minio

# Check MinIO endpoint in Spark config
# Should be: http://minio:9000 (not localhost)

# Test MinIO connectivity from Spark container
docker exec -it realestate-spark-master curl http://minio:9000/minio/health/live
```

### Issue: Delta Lake table not found

**Symptoms:** `AnalysisException: Table or view not found`

**Solution:**
```bash
# Re-run schema initialization
docker exec -it realestate-spark-master spark-submit \
  --packages io.delta:delta-core_2.12:2.4.0 \
  /opt/spark-apps/init_delta_schemas.py

# Verify tables exist
docker exec -it realestate-minio mc ls myminio/lakehouse-bronze/
```

---

## 📈 Performance Tuning

### Spark Configuration

Edit `docker-compose.lakehouse.yml`:

```yaml
spark-worker-1:
  environment:
    - SPARK_WORKER_MEMORY=8G  # Increase from 2G
    - SPARK_WORKER_CORES=4    # Increase from 2
```

### Kafka Configuration

```yaml
kafka:
  environment:
    - KAFKA_NUM_PARTITIONS=10  # Increase parallelism
    - KAFKA_DEFAULT_REPLICATION_FACTOR=1
```

### Delta Lake Optimization

```python
# In Spark jobs, add:
spark.conf.set("spark.databricks.delta.optimizeWrite.enabled", "true")
spark.conf.set("spark.databricks.delta.autoCompact.enabled", "true")
```

---

## 💰 Cost Optimization

### Storage Tiering

```bash
# Configure MinIO lifecycle policies
docker exec -it realestate-minio mc ilm add \
  --expiry-days 90 \
  myminio/lakehouse-bronze

docker exec -it realestate-minio mc ilm add \
  --expiry-days 180 \
  myminio/lakehouse-silver

# Gold layer: Keep indefinitely
```

### Compute Scaling

```bash
# Scale Spark workers dynamically
docker-compose -f docker-compose.lakehouse.yml up -d --scale spark-worker=4

# Reduce workers during off-peak
docker-compose -f docker-compose.lakehouse.yml up -d --scale spark-worker=1
```

---

## 🔒 Security Best Practices

### 1. Change Default Passwords

```bash
# Update .env file
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)
POSTGIS_PASSWORD=$(openssl rand -base64 32)
AIRFLOW_PASSWORD=$(openssl rand -base64 32)
```

### 2. Enable TLS

```yaml
# docker-compose.lakehouse.yml
minio:
  environment:
    - MINIO_SERVER_URL=https://minio.yourdomain.com
  volumes:
    - ./certs:/root/.minio/certs
```

### 3. Network Isolation

```yaml
networks:
  lakehouse:
    driver: bridge
    internal: true  # No external access
  
  public:
    driver: bridge  # Only for API gateway
```

---

## 📚 Additional Resources

### Documentation

- [PostGIS Integration](./POSTGIS_SEDONA_LAKEHOUSE_INTEGRATION.md)
- [Martin Tile Server](./MARTIN_MAPLIBRE_GUIDE.md)
- [MapLibre Production](./MAPLIBRE_PRODUCTION_READY.md)

### External Links

- [Apache Sedona Docs](https://sedona.apache.org/latest/)
- [Delta Lake Docs](https://docs.delta.io/)
- [Debezium Docs](https://debezium.io/documentation/)
- [Apache Airflow Docs](https://airflow.apache.org/docs/)

---

## ✅ Next Steps

1. **Load Production Data** - Migrate existing properties to PostGIS
2. **Configure Monitoring** - Set up Prometheus + Grafana
3. **Implement Backup** - Schedule Delta Lake snapshots
4. **Optimize Queries** - Add indexes and partitioning
5. **Scale Infrastructure** - Add more Spark workers for production load

---

**Status:** Deployment Guide Complete  
**Support:** For issues, contact platform-team@yourdomain.com  
**Last Updated:** November 20, 2025
