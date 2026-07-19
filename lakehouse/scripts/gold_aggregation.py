"""
Gold Layer Aggregation - Business Metrics and Features
Creates business-level aggregates and ML features from Silver layer
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from pyspark.sql.window import Window
from delta import *

# Initialize Spark
builder = SparkSession.builder \
    .appName("Gold Layer Aggregation") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000") \
    .config("spark.hadoop.fs.s3a.access.key", "admin") \
    .config("spark.hadoop.fs.s3a.secret.key", "admin123") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")

spark = configure_spark_with_delta_pip(builder).getOrCreate()

def create_market_trends():
    """Create market trends aggregates"""
    
    properties = spark.read.format("delta").load("s3a://silver/properties")
    transactions = spark.read.format("delta").load("s3a://silver/transactions")
    
    # Join properties with transactions
    market_data = properties.join(
        transactions,
        properties.property_id == transactions.property_id,
        "left"
    )
    
    # Aggregate by region and time
    market_trends = market_data \
        .groupBy("state", "city", "year", "month") \
        .agg(
            count("*").alias("total_listings"),
            avg("price").alias("avg_price"),
            min("price").alias("min_price"),
            max("price").alias("max_price"),
            stddev("price").alias("price_stddev"),
            avg("price_per_sqft").alias("avg_price_per_sqft"),
            avg("square_feet").alias("avg_square_feet"),
            avg("bedrooms").alias("avg_bedrooms"),
            avg("bathrooms").alias("avg_bathrooms"),
            countDistinct(when(col("status") == "sold", col("property_id"))).alias("sold_count"),
            countDistinct(when(col("status") == "active", col("property_id"))).alias("active_count")
        ) \
        .withColumn("median_price", expr("percentile_approx(price, 0.5)")) \
        .withColumn("inventory_turnover", 
                   when(col("active_count") > 0, col("sold_count") / col("active_count"))
                   .otherwise(0)) \
        .withColumn("processing_timestamp", current_timestamp())
    
    # Calculate month-over-month changes
    window_spec = Window.partitionBy("state", "city").orderBy("year", "month")
    
    market_trends = market_trends \
        .withColumn("prev_avg_price", lag("avg_price", 1).over(window_spec)) \
        .withColumn("price_change_pct", 
                   when(col("prev_avg_price").isNotNull(),
                        ((col("avg_price") - col("prev_avg_price")) / col("prev_avg_price")) * 100)
                   .otherwise(None))
    
    # Write to Gold layer
    market_trends.write \
        .format("delta") \
        .mode("overwrite") \
        .partitionBy("state", "year", "month") \
        .save("s3a://gold/market_trends")
    
    print(f"Created {market_trends.count()} market trend records")

def create_user_behavior_metrics():
    """Create user behavior analytics"""
    
    user_events = spark.read.format("delta").load("s3a://silver/user_events")
    
    # Session-level metrics
    session_metrics = user_events \
        .groupBy("user_id", "session_id", "year", "month", "day") \
        .agg(
            count("*").alias("total_events"),
            countDistinct("property_id").alias("properties_viewed"),
            min("event_timestamp").alias("session_start"),
            max("event_timestamp").alias("session_end"),
            collect_set("action").alias("actions")
        ) \
        .withColumn("session_duration_minutes",
                   (unix_timestamp("session_end") - unix_timestamp("session_start")) / 60)
    
    # User-level daily metrics
    user_daily_metrics = user_events \
        .groupBy("user_id", "year", "month", "day") \
        .agg(
            countDistinct("session_id").alias("sessions_count"),
            count("*").alias("total_events"),
            countDistinct("property_id").alias("unique_properties_viewed"),
            countDistinct(when(col("action") == "favorite", col("property_id"))).alias("properties_favorited"),
            countDistinct(when(col("action") == "search", col("event_id"))).alias("searches_performed")
        ) \
        .withColumn("processing_timestamp", current_timestamp())
    
    user_daily_metrics.write \
        .format("delta") \
        .mode("overwrite") \
        .partitionBy("year", "month", "day") \
        .save("s3a://gold/user_behavior_metrics")
    
    print(f"Created {user_daily_metrics.count()} user behavior metric records")

def create_transaction_funnel():
    """Create transaction funnel metrics"""
    
    user_events = spark.read.format("delta").load("s3a://silver/user_events")
    transactions = spark.read.format("delta").load("s3a://silver/transactions")
    
    # Funnel stages
    funnel = user_events \
        .groupBy("year", "month", "day") \
        .agg(
            countDistinct(when(col("action") == "view", col("user_id"))).alias("users_viewed"),
            countDistinct(when(col("action") == "favorite", col("user_id"))).alias("users_favorited"),
            countDistinct(when(col("action") == "contact_agent", col("user_id"))).alias("users_contacted"),
            countDistinct(when(col("action") == "schedule_tour", col("user_id"))).alias("users_scheduled_tour")
        )
    
    # Add transaction completions
    transaction_completions = transactions \
        .filter(col("status") == "completed") \
        .groupBy("year", "month") \
        .agg(countDistinct("buyer_id").alias("users_completed"))
    
    funnel_with_conversions = funnel \
        .join(transaction_completions, ["year", "month"], "left") \
        .fillna(0, ["users_completed"]) \
        .withColumn("view_to_favorite_rate", 
                   when(col("users_viewed") > 0, col("users_favorited") / col("users_viewed") * 100)
                   .otherwise(0)) \
        .withColumn("favorite_to_contact_rate",
                   when(col("users_favorited") > 0, col("users_contacted") / col("users_favorited") * 100)
                   .otherwise(0)) \
        .withColumn("contact_to_tour_rate",
                   when(col("users_contacted") > 0, col("users_scheduled_tour") / col("users_contacted") * 100)
                   .otherwise(0)) \
        .withColumn("tour_to_completion_rate",
                   when(col("users_scheduled_tour") > 0, col("users_completed") / col("users_scheduled_tour") * 100)
                   .otherwise(0)) \
        .withColumn("processing_timestamp", current_timestamp())
    
    funnel_with_conversions.write \
        .format("delta") \
        .mode("overwrite") \
        .partitionBy("year", "month") \
        .save("s3a://gold/transaction_funnel")
    
    print(f"Created {funnel_with_conversions.count()} funnel metric records")

def create_valuation_accuracy_metrics():
    """Create valuation model accuracy metrics"""
    
    valuations = spark.read.format("delta").load("s3a://silver/valuations")
    transactions = spark.read.format("delta").load("s3a://silver/transactions")
    
    # Join valuations with actual transaction prices
    valuation_accuracy = valuations.join(
        transactions.filter(col("status") == "completed"),
        "property_id"
    ) \
    .withColumn("error", col("amount") - col("estimated_value")) \
    .withColumn("error_pct", (col("error") / col("amount")) * 100) \
    .withColumn("abs_error_pct", abs(col("error_pct")))
    
    # Aggregate by model version and time
    accuracy_metrics = valuation_accuracy \
        .groupBy("model_version", "year", "month") \
        .agg(
            count("*").alias("total_valuations"),
            avg("error").alias("mean_error"),
            avg("abs_error_pct").alias("mean_absolute_percentage_error"),
            stddev("error").alias("error_stddev"),
            expr("percentile_approx(abs_error_pct, 0.5)").alias("median_abs_error_pct"),
            expr("percentile_approx(abs_error_pct, 0.9)").alias("p90_abs_error_pct"),
            avg("confidence_score").alias("avg_confidence_score")
        ) \
        .withColumn("processing_timestamp", current_timestamp())
    
    accuracy_metrics.write \
        .format("delta") \
        .mode("overwrite") \
        .partitionBy("model_version", "year", "month") \
        .save("s3a://gold/valuation_accuracy")
    
    print(f"Created {accuracy_metrics.count()} valuation accuracy metric records")

def create_ml_features():
    """Create ML training features"""
    
    properties = spark.read.format("delta").load("s3a://silver/properties")
    transactions = spark.read.format("delta").load("s3a://silver/transactions")
    user_events = spark.read.format("delta").load("s3a://silver/user_events")
    
    # Property features with engagement metrics
    property_engagement = user_events \
        .groupBy("property_id") \
        .agg(
            count("*").alias("total_views"),
            countDistinct("user_id").alias("unique_viewers"),
            countDistinct(when(col("action") == "favorite", col("user_id"))).alias("favorite_count")
        )
    
    # Join all features
    ml_features = properties \
        .join(property_engagement, "property_id", "left") \
        .join(transactions.filter(col("status") == "completed"), "property_id", "left") \
        .select(
            col("property_id"),
            col("price"),
            col("bedrooms"),
            col("bathrooms"),
            col("square_feet"),
            col("price_per_sqft"),
            col("property_type"),
            col("latitude"),
            col("longitude"),
            col("city"),
            col("state"),
            coalesce(col("total_views"), lit(0)).alias("total_views"),
            coalesce(col("unique_viewers"), lit(0)).alias("unique_viewers"),
            coalesce(col("favorite_count"), lit(0)).alias("favorite_count"),
            when(col("amount").isNotNull(), 1).otherwise(0).alias("is_sold"),
            col("amount").alias("sold_price"),
            col("event_timestamp")
        ) \
        .withColumn("days_on_market",
                   datediff(current_date(), col("event_timestamp"))) \
        .withColumn("processing_timestamp", current_timestamp())
    
    ml_features.write \
        .format("delta") \
        .mode("overwrite") \
        .partitionBy("state") \
        .save("s3a://gold/ml_features")
    
    print(f"Created {ml_features.count()} ML feature records")

# Run all aggregations
if __name__ == "__main__":
    print("Starting Gold layer aggregations...")
    
    create_market_trends()
    create_user_behavior_metrics()
    create_transaction_funnel()
    create_valuation_accuracy_metrics()
    create_ml_features()
    
    print("Gold layer aggregations completed!")
