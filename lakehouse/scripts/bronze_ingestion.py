"""
Bronze Layer Ingestion - Kafka to Delta Lake
Ingests raw events from Kafka topics into Bronze layer
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from delta import *

# Initialize Spark with Delta Lake
builder = SparkSession.builder \
    .appName("Bronze Layer Ingestion") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000") \
    .config("spark.hadoop.fs.s3a.access.key", "admin") \
    .config("spark.hadoop.fs.s3a.secret.key", "admin123") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")

spark = configure_spark_with_delta_pip(builder).getOrCreate()

# Kafka configuration
KAFKA_BROKERS = "kafka:9092"
CHECKPOINT_LOCATION = "s3a://checkpoints/bronze"

# Define event schema
event_schema = StructType([
    StructField("event_id", StringType(), False),
    StructField("event_type", StringType(), False),
    StructField("entity_id", StringType(), False),
    StructField("entity_type", StringType(), False),
    StructField("timestamp", TimestampType(), False),
    StructField("data", StringType(), True),
    StructField("metadata", MapType(StringType(), StringType()), True)
])

def ingest_topic(topic_name, output_path):
    """Ingest data from Kafka topic to Bronze layer"""
    
    # Read from Kafka
    df = spark \
        .readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BROKERS) \
        .option("subscribe", topic_name) \
        .option("startingOffsets", "earliest") \
        .load()
    
    # Parse JSON and add metadata
    parsed_df = df \
        .select(
            from_json(col("value").cast("string"), event_schema).alias("event"),
            col("topic"),
            col("partition"),
            col("offset"),
            col("timestamp").alias("kafka_timestamp")
        ) \
        .select(
            col("event.*"),
            col("topic"),
            col("partition"),
            col("offset"),
            col("kafka_timestamp"),
            current_timestamp().alias("ingestion_timestamp")
        ) \
        .withColumn("year", year(col("timestamp"))) \
        .withColumn("month", month(col("timestamp"))) \
        .withColumn("day", dayofmonth(col("timestamp")))
    
    # Write to Delta Lake with partitioning
    query = parsed_df \
        .writeStream \
        .format("delta") \
        .outputMode("append") \
        .option("checkpointLocation", f"{CHECKPOINT_LOCATION}/{topic_name}") \
        .partitionBy("year", "month", "day") \
        .start(output_path)
    
    return query

# Ingest from all topics
topics = {
    "property-events": "s3a://bronze/property_events",
    "user-events": "s3a://bronze/user_events",
    "transaction-events": "s3a://bronze/transaction_events",
    "valuation-events": "s3a://bronze/valuation_events",
    "geospatial-events": "s3a://bronze/geospatial_events"
}

queries = []
for topic, path in topics.items():
    print(f"Starting ingestion for topic: {topic}")
    query = ingest_topic(topic, path)
    queries.append(query)

# Wait for all streams
for query in queries:
    query.awaitTermination()
