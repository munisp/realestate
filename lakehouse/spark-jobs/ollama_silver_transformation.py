"""
Ollama Conversation Silver Layer Transformation
Cleans and enriches raw conversation data from Bronze layer
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from delta.tables import DeltaTable
import os

# ============================================================================
# Configuration
# ============================================================================

BRONZE_PATH = os.getenv('BRONZE_PATH', 's3a://bronze/ollama/conversations')
SILVER_PATH = os.getenv('SILVER_PATH', 's3a://silver/ollama/conversations')

# ============================================================================
# Initialize Spark with Delta Lake
# ============================================================================

spark = SparkSession.builder \
    .appName("Ollama Silver Transformation") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.endpoint", os.getenv('MINIO_ENDPOINT', 'http://localhost:9000')) \
    .config("spark.hadoop.fs.s3a.access.key", os.getenv('MINIO_ACCESS_KEY', 'admin')) \
    .config("spark.hadoop.fs.s3a.secret.key", os.getenv('MINIO_SECRET_KEY', 'admin123456')) \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .getOrCreate()

# ============================================================================
# Read Bronze Layer Data
# ============================================================================

print("[Silver] Reading Bronze layer conversations...")

bronze_df = spark.read \
    .format("delta") \
    .load(BRONZE_PATH)

# ============================================================================
# Data Cleaning & Enrichment
# ============================================================================

print("[Silver] Transforming data...")

# Extract response content and metadata
silver_df = bronze_df \
    .withColumn("response_content", col("response.content")) \
    .withColumn("response_model", col("response.model")) \
    .withColumn("response_time_ms", col("metadata.response_time_ms")) \
    .withColumn("message_count", col("metadata.message_count")) \
    .withColumn("timestamp_dt", to_timestamp(col("timestamp"))) \
    .withColumn("date", to_date(col("timestamp_dt"))) \
    .withColumn("hour", hour(col("timestamp_dt"))) \
    .withColumn("day_of_week", dayofweek(col("timestamp_dt"))) \
    .withColumn("is_streaming", col("metadata.streaming").cast("boolean")) \
    .withColumn("response_length", length(col("response_content"))) \
    .withColumn("user_message_count", 
        size(filter(col("messages"), lambda x: x.role == "user"))
    ) \
    .withColumn("assistant_message_count",
        size(filter(col("messages"), lambda x: x.role == "assistant"))
    )

# Add conversation metrics
silver_df = silver_df \
    .withColumn("avg_response_time_ms", 
        avg(col("response_time_ms")).over(Window.partitionBy("user_id"))
    ) \
    .withColumn("total_conversations", 
        count("*").over(Window.partitionBy("user_id"))
    )

# Select final columns
silver_df = silver_df.select(
    col("event_id"),
    col("conversation_id"),
    col("user_id"),
    col("context"),
    col("model"),
    col("response_content"),
    col("response_model"),
    col("response_time_ms"),
    col("response_length"),
    col("message_count"),
    col("user_message_count"),
    col("assistant_message_count"),
    col("is_streaming"),
    col("timestamp_dt").alias("timestamp"),
    col("date"),
    col("hour"),
    col("day_of_week"),
    col("avg_response_time_ms"),
    col("total_conversations"),
)

# ============================================================================
# Write to Silver Layer (Delta Lake)
# ============================================================================

print(f"[Silver] Writing {silver_df.count()} records to Silver layer...")

silver_df.write \
    .format("delta") \
    .mode("append") \
    .partitionBy("date") \
    .save(SILVER_PATH)

print("[Silver] Transformation complete!")

# ============================================================================
# Optimize Delta Table
# ============================================================================

print("[Silver] Optimizing Delta table...")

DeltaTable.forPath(spark, SILVER_PATH) \
    .optimize() \
    .executeCompaction()

print("[Silver] Done!")

spark.stop()
