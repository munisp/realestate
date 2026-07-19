"""
CDC Consumer - Kafka to Delta Lake
Consumes CDC events from Debezium and writes to Bronze layer
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from delta import configure_spark_with_delta_pip
import json

# Initialize Spark with Delta Lake
builder = SparkSession.builder \
    .appName("CDC Consumer - Kafka to Delta Lake") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000") \
    .config("spark.hadoop.fs.s3a.access.key", "admin") \
    .config("spark.hadoop.fs.s3a.secret.key", "minio_admin_password") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.sql.streaming.checkpointLocation", "s3a://spark-checkpoints/cdc")

spark = configure_spark_with_delta_pip(builder).getOrCreate()

print("✅ Spark Structured Streaming session initialized")

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = "kafka:9092"
BRONZE_PATH = "s3a://lakehouse-bronze"

# ============================================================================
# CDC Stream: Properties
# ============================================================================

print("\n📡 Setting up CDC stream for properties...")

# Read from Kafka
properties_stream = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
    .option("subscribe", "postgis.spatial.properties_spatial") \
    .option("startingOffsets", "earliest") \
    .load()

# Define schema for Debezium CDC payload
debezium_schema = StructType([
    StructField("payload", StructType([
        StructField("after", StructType([
            StructField("id", IntegerType()),
            StructField("title", StringType()),
            StructField("description", StringType()),
            StructField("price", StringType()),  # Decimal as string
            StructField("property_type", StringType()),
            StructField("location", StringType()),  # GeoJSON
            StructField("boundary", StringType()),  # GeoJSON
            StructField("h3_index_7", StringType()),
            StructField("h3_index_9", StringType()),
            StructField("area", StringType()),
            StructField("bedrooms", IntegerType()),
            StructField("bathrooms", IntegerType()),
            StructField("created_at", LongType()),  # Microseconds since epoch
            StructField("updated_at", LongType()),
        ])),
        StructField("op", StringType()),  # c=create, u=update, d=delete
        StructField("ts_ms", LongType()),  # CDC timestamp
    ]))
])

# Parse Debezium JSON
properties_parsed = properties_stream \
    .select(from_json(col("value").cast("string"), debezium_schema).alias("data")) \
    .select("data.payload.*")

# Transform to Bronze schema
properties_bronze = properties_parsed \
    .select(
        col("after.id").alias("id"),
        col("after.title").alias("title"),
        col("after.description").alias("description"),
        col("after.price").cast("decimal(15,2)").alias("price"),
        col("after.property_type").alias("property_type"),
        col("after.location").alias("location"),
        col("after.boundary").alias("boundary"),
        col("after.h3_index_7").alias("h3_index_7"),
        col("after.h3_index_9").alias("h3_index_9"),
        col("after.area").cast("decimal(10,2)").alias("area"),
        col("after.bedrooms").alias("bedrooms"),
        col("after.bathrooms").alias("bathrooms"),
        (col("after.created_at") / 1000000).cast("timestamp").alias("created_at"),
        (col("after.updated_at") / 1000000).cast("timestamp").alias("updated_at"),
        (col("ts_ms") / 1000).cast("timestamp").alias("_cdc_timestamp"),
        col("op").alias("_cdc_operation")
    )

# Write to Delta Lake (Bronze layer)
properties_query = properties_bronze \
    .writeStream \
    .format("delta") \
    .outputMode("append") \
    .option("checkpointLocation", "s3a://spark-checkpoints/cdc/properties") \
    .option("path", f"{BRONZE_PATH}/properties") \
    .start()

print("✅ CDC stream for properties started")

# ============================================================================
# CDC Stream: Neighborhoods
# ============================================================================

print("\n📡 Setting up CDC stream for neighborhoods...")

neighborhoods_stream = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
    .option("subscribe", "postgis.spatial.neighborhoods") \
    .option("startingOffsets", "earliest") \
    .load()

neighborhoods_schema = StructType([
    StructField("payload", StructType([
        StructField("after", StructType([
            StructField("id", IntegerType()),
            StructField("name", StringType()),
            StructField("tier", StringType()),
            StructField("boundary", StringType()),
            StructField("median_price", StringType()),
            StructField("property_count", IntegerType()),
            StructField("created_at", LongType()),
            StructField("updated_at", LongType()),
        ])),
        StructField("op", StringType()),
        StructField("ts_ms", LongType()),
    ]))
])

neighborhoods_parsed = neighborhoods_stream \
    .select(from_json(col("value").cast("string"), neighborhoods_schema).alias("data")) \
    .select("data.payload.*")

neighborhoods_bronze = neighborhoods_parsed \
    .select(
        col("after.id").alias("id"),
        col("after.name").alias("name"),
        col("after.tier").alias("tier"),
        col("after.boundary").alias("boundary"),
        col("after.median_price").cast("decimal(15,2)").alias("median_price"),
        col("after.property_count").alias("property_count"),
        (col("after.created_at") / 1000000).cast("timestamp").alias("created_at"),
        (col("after.updated_at") / 1000000).cast("timestamp").alias("updated_at"),
        (col("ts_ms") / 1000).cast("timestamp").alias("_cdc_timestamp"),
        col("op").alias("_cdc_operation")
    )

neighborhoods_query = neighborhoods_bronze \
    .writeStream \
    .format("delta") \
    .outputMode("append") \
    .option("checkpointLocation", "s3a://spark-checkpoints/cdc/neighborhoods") \
    .option("path", f"{BRONZE_PATH}/neighborhoods") \
    .start()

print("✅ CDC stream for neighborhoods started")

# ============================================================================
# Monitor Streaming Queries
# ============================================================================

print("\n" + "="*80)
print("📊 CDC Streaming Queries Active")
print("="*80)

print("\n🔄 Monitoring streams (Ctrl+C to stop)...")
print(f"  - Properties: {properties_query.name}")
print(f"  - Neighborhoods: {neighborhoods_query.name}")

print("\n📈 Stream Progress:")

# Monitor both queries
try:
    while True:
        # Properties progress
        props_progress = properties_query.lastProgress
        if props_progress:
            print(f"\n[Properties] Processed {props_progress['numInputRows']} rows, "
                  f"Rate: {props_progress['processedRowsPerSecond']:.2f} rows/sec")
        
        # Neighborhoods progress
        hoods_progress = neighborhoods_query.lastProgress
        if hoods_progress:
            print(f"[Neighborhoods] Processed {hoods_progress['numInputRows']} rows, "
                  f"Rate: {hoods_progress['processedRowsPerSecond']:.2f} rows/sec")
        
        # Wait for next update
        properties_query.awaitTermination(timeout=30)
        
except KeyboardInterrupt:
    print("\n\n⏹️  Stopping CDC streams...")
    properties_query.stop()
    neighborhoods_query.stop()
    print("✅ CDC streams stopped")

spark.stop()
