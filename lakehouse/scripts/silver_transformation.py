"""
Silver Layer Transformation - Clean and Enrich Data
Transforms Bronze layer data into cleaned, validated, and enriched Silver layer
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from pyspark.sql.window import Window
from delta import *
import json

# Initialize Spark
builder = SparkSession.builder \
    .appName("Silver Layer Transformation") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000") \
    .config("spark.hadoop.fs.s3a.access.key", "admin") \
    .config("spark.hadoop.fs.s3a.secret.key", "admin123") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")

spark = configure_spark_with_delta_pip(builder).getOrCreate()

# Property events transformation
def transform_property_events():
    """Transform property events to Silver layer"""
    
    # Read from Bronze
    bronze_df = spark.read.format("delta").load("s3a://bronze/property_events")
    
    # Parse JSON data field
    property_schema = StructType([
        StructField("property_id", StringType()),
        StructField("title", StringType()),
        StructField("price", LongType()),
        StructField("bedrooms", IntegerType()),
        StructField("bathrooms", IntegerType()),
        StructField("square_feet", IntegerType()),
        StructField("property_type", StringType()),
        StructField("status", StringType()),
        StructField("latitude", DoubleType()),
        StructField("longitude", DoubleType()),
        StructField("address", StringType()),
        StructField("city", StringType()),
        StructField("state", StringType()),
        StructField("country", StringType()),
        StructField("postal_code", StringType())
    ])
    
    # Parse and clean
    silver_df = bronze_df \
        .withColumn("property_data", from_json(col("data"), property_schema)) \
        .select(
            col("event_id"),
            col("event_type"),
            col("timestamp").alias("event_timestamp"),
            col("property_data.*")
        ) \
        .filter(col("property_id").isNotNull()) \
        .dropDuplicates(["property_id", "event_timestamp"]) \
        .withColumn("price_per_sqft", 
                   when(col("square_feet") > 0, col("price") / col("square_feet"))
                   .otherwise(None)) \
        .withColumn("year", year(col("event_timestamp"))) \
        .withColumn("month", month(col("event_timestamp"))) \
        .withColumn("processing_timestamp", current_timestamp())
    
    # Data quality checks
    silver_df = silver_df \
        .filter(col("price") > 0) \
        .filter(col("bedrooms") >= 0) \
        .filter(col("bathrooms") >= 0) \
        .filter(col("square_feet") > 0) \
        .filter(col("latitude").between(-90, 90)) \
        .filter(col("longitude").between(-180, 180))
    
    # Write to Silver layer
    silver_df.write \
        .format("delta") \
        .mode("overwrite") \
        .partitionBy("year", "month", "state") \
        .save("s3a://silver/properties")
    
    print(f"Transformed {silver_df.count()} property events to Silver layer")

# User events transformation
def transform_user_events():
    """Transform user events to Silver layer"""
    
    bronze_df = spark.read.format("delta").load("s3a://bronze/user_events")
    
    user_schema = StructType([
        StructField("user_id", StringType()),
        StructField("action", StringType()),
        StructField("property_id", StringType()),
        StructField("session_id", StringType()),
        StructField("device_type", StringType()),
        StructField("ip_address", StringType())
    ])
    
    silver_df = bronze_df \
        .withColumn("user_data", from_json(col("data"), user_schema)) \
        .select(
            col("event_id"),
            col("event_type"),
            col("timestamp").alias("event_timestamp"),
            col("user_data.*")
        ) \
        .filter(col("user_id").isNotNull()) \
        .dropDuplicates(["event_id"]) \
        .withColumn("year", year(col("event_timestamp"))) \
        .withColumn("month", month(col("event_timestamp"))) \
        .withColumn("day", dayofmonth(col("event_timestamp"))) \
        .withColumn("hour", hour(col("event_timestamp"))) \
        .withColumn("processing_timestamp", current_timestamp())
    
    silver_df.write \
        .format("delta") \
        .mode("overwrite") \
        .partitionBy("year", "month", "day") \
        .save("s3a://silver/user_events")
    
    print(f"Transformed {silver_df.count()} user events to Silver layer")

# Transaction events transformation
def transform_transaction_events():
    """Transform transaction events to Silver layer"""
    
    bronze_df = spark.read.format("delta").load("s3a://bronze/transaction_events")
    
    transaction_schema = StructType([
        StructField("transaction_id", StringType()),
        StructField("property_id", StringType()),
        StructField("buyer_id", StringType()),
        StructField("seller_id", StringType()),
        StructField("amount", LongType()),
        StructField("status", StringType()),
        StructField("closing_date", TimestampType())
    ])
    
    silver_df = bronze_df \
        .withColumn("transaction_data", from_json(col("data"), transaction_schema)) \
        .select(
            col("event_id"),
            col("event_type"),
            col("timestamp").alias("event_timestamp"),
            col("transaction_data.*")
        ) \
        .filter(col("transaction_id").isNotNull()) \
        .dropDuplicates(["transaction_id", "event_timestamp"]) \
        .withColumn("year", year(col("event_timestamp"))) \
        .withColumn("month", month(col("event_timestamp"))) \
        .withColumn("processing_timestamp", current_timestamp())
    
    # Data quality
    silver_df = silver_df.filter(col("amount") > 0)
    
    silver_df.write \
        .format("delta") \
        .mode("overwrite") \
        .partitionBy("year", "month") \
        .save("s3a://silver/transactions")
    
    print(f"Transformed {silver_df.count()} transaction events to Silver layer")

# Valuation events transformation
def transform_valuation_events():
    """Transform valuation events to Silver layer"""
    
    bronze_df = spark.read.format("delta").load("s3a://bronze/valuation_events")
    
    valuation_schema = StructType([
        StructField("valuation_id", StringType()),
        StructField("property_id", StringType()),
        StructField("estimated_value", LongType()),
        StructField("confidence_score", DoubleType()),
        StructField("model_version", StringType())
    ])
    
    silver_df = bronze_df \
        .withColumn("valuation_data", from_json(col("data"), valuation_schema)) \
        .select(
            col("event_id"),
            col("event_type"),
            col("timestamp").alias("event_timestamp"),
            col("valuation_data.*")
        ) \
        .filter(col("valuation_id").isNotNull()) \
        .dropDuplicates(["valuation_id"]) \
        .withColumn("year", year(col("event_timestamp"))) \
        .withColumn("month", month(col("event_timestamp"))) \
        .withColumn("processing_timestamp", current_timestamp())
    
    # Data quality
    silver_df = silver_df \
        .filter(col("estimated_value") > 0) \
        .filter(col("confidence_score").between(0, 1))
    
    silver_df.write \
        .format("delta") \
        .mode("overwrite") \
        .partitionBy("year", "month") \
        .save("s3a://silver/valuations")
    
    print(f"Transformed {silver_df.count()} valuation events to Silver layer")

# Run all transformations
if __name__ == "__main__":
    print("Starting Silver layer transformations...")
    
    transform_property_events()
    transform_user_events()
    transform_transaction_events()
    transform_valuation_events()
    
    print("Silver layer transformations completed!")
