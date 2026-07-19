"""
Ollama Conversation Gold Layer Aggregation
Creates ML-ready datasets for model fine-tuning and analytics
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from pyspark.sql.window import Window
from delta.tables import DeltaTable
import os

# ============================================================================
# Configuration
# ============================================================================

SILVER_PATH = os.getenv('SILVER_PATH', 's3a://silver/ollama/conversations')
GOLD_PATH_FINETUNING = os.getenv('GOLD_PATH_FINETUNING', 's3a://gold/ollama/finetuning_data')
GOLD_PATH_ANALYTICS = os.getenv('GOLD_PATH_ANALYTICS', 's3a://gold/ollama/analytics')

# ============================================================================
# Initialize Spark with Delta Lake
# ============================================================================

spark = SparkSession.builder \
    .appName("Ollama Gold Aggregation") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.endpoint", os.getenv('MINIO_ENDPOINT', 'http://localhost:9000')) \
    .config("spark.hadoop.fs.s3a.access.key", os.getenv('MINIO_ACCESS_KEY', 'admin')) \
    .config("spark.hadoop.fs.s3a.secret.key", os.getenv('MINIO_SECRET_KEY', 'admin123456')) \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .getOrCreate()

# ============================================================================
# Read Silver Layer Data
# ============================================================================

print("[Gold] Reading Silver layer conversations...")

silver_df = spark.read \
    .format("delta") \
    .load(SILVER_PATH)

# ============================================================================
# 1. Fine-Tuning Dataset (JSONL format for Ollama)
# ============================================================================

print("[Gold] Creating fine-tuning dataset...")

# Format conversations for fine-tuning
# Each row becomes a training example in the format Ollama expects
finetuning_df = silver_df \
    .filter(col("response_length") > 50) \
    .filter(col("response_time_ms") < 30000) \
    .select(
        col("conversation_id"),
        col("context"),
        col("messages"),
        col("response_content"),
        col("timestamp"),
    ) \
    .withColumn("training_example", 
        struct(
            col("context").alias("system_context"),
            col("messages"),
            col("response_content").alias("expected_response")
        )
    )

# Write fine-tuning data
print(f"[Gold] Writing {finetuning_df.count()} fine-tuning examples...")

finetuning_df.write \
    .format("delta") \
    .mode("overwrite") \
    .save(GOLD_PATH_FINETUNING)

# ============================================================================
# 2. Analytics Aggregations
# ============================================================================

print("[Gold] Creating analytics aggregations...")

# Daily conversation metrics
daily_metrics = silver_df \
    .groupBy("date", "context") \
    .agg(
        count("*").alias("total_conversations"),
        countDistinct("user_id").alias("unique_users"),
        avg("response_time_ms").alias("avg_response_time_ms"),
        percentile_approx("response_time_ms", 0.95).alias("p95_response_time_ms"),
        avg("response_length").alias("avg_response_length"),
        avg("message_count").alias("avg_message_count"),
        sum(when(col("is_streaming"), 1).otherwise(0)).alias("streaming_conversations"),
    ) \
    .orderBy("date", "context")

# Hourly conversation patterns
hourly_patterns = silver_df \
    .groupBy("hour", "day_of_week", "context") \
    .agg(
        count("*").alias("conversation_count"),
        avg("response_time_ms").alias("avg_response_time_ms"),
    ) \
    .orderBy("day_of_week", "hour")

# User engagement metrics
user_metrics = silver_df \
    .groupBy("user_id") \
    .agg(
        count("*").alias("total_conversations"),
        countDistinct("date").alias("active_days"),
        collect_set("context").alias("contexts_used"),
        avg("response_time_ms").alias("avg_response_time_ms"),
        sum("message_count").alias("total_messages"),
        min("timestamp").alias("first_conversation"),
        max("timestamp").alias("last_conversation"),
    )

# Context popularity and performance
context_metrics = silver_df \
    .groupBy("context") \
    .agg(
        count("*").alias("total_conversations"),
        countDistinct("user_id").alias("unique_users"),
        avg("response_time_ms").alias("avg_response_time_ms"),
        avg("response_length").alias("avg_response_length"),
        avg("message_count").alias("avg_message_count"),
    ) \
    .orderBy(desc("total_conversations"))

# ============================================================================
# Write Analytics to Gold Layer
# ============================================================================

print("[Gold] Writing analytics aggregations...")

# Daily metrics
daily_metrics.write \
    .format("delta") \
    .mode("overwrite") \
    .save(f"{GOLD_PATH_ANALYTICS}/daily_metrics")

# Hourly patterns
hourly_patterns.write \
    .format("delta") \
    .mode("overwrite") \
    .save(f"{GOLD_PATH_ANALYTICS}/hourly_patterns")

# User metrics
user_metrics.write \
    .format("delta") \
    .mode("overwrite") \
    .save(f"{GOLD_PATH_ANALYTICS}/user_metrics")

# Context metrics
context_metrics.write \
    .format("delta") \
    .mode("overwrite") \
    .save(f"{GOLD_PATH_ANALYTICS}/context_metrics")

# ============================================================================
# Create Summary Statistics
# ============================================================================

print("[Gold] Creating summary statistics...")

summary = silver_df.agg(
    count("*").alias("total_conversations"),
    countDistinct("user_id").alias("total_users"),
    countDistinct("conversation_id").alias("unique_conversations"),
    avg("response_time_ms").alias("avg_response_time_ms"),
    min("timestamp").alias("earliest_conversation"),
    max("timestamp").alias("latest_conversation"),
).collect()[0]

print(f"""
[Gold] Summary Statistics:
- Total Conversations: {summary['total_conversations']}
- Total Users: {summary['total_users']}
- Unique Conversations: {summary['unique_conversations']}
- Avg Response Time: {summary['avg_response_time_ms']:.2f}ms
- Date Range: {summary['earliest_conversation']} to {summary['latest_conversation']}
""")

print("[Gold] Aggregation complete!")

spark.stop()
