"""
Delta Lake Schema Initialization
Creates Bronze, Silver, and Gold layer tables for the lakehouse
"""

from pyspark.sql import SparkSession
from pyspark.sql.types import *
from delta import configure_spark_with_delta_pip

# Initialize Spark with Delta Lake
builder = SparkSession.builder \
    .appName("Initialize Delta Lake Schemas") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000") \
    .config("spark.hadoop.fs.s3a.access.key", "admin") \
    .config("spark.hadoop.fs.s3a.secret.key", "minio_admin_password") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")

spark = configure_spark_with_delta_pip(builder).getOrCreate()

print("✅ Spark session initialized with Delta Lake")

# S3 paths
BRONZE_PATH = "s3a://lakehouse-bronze"
SILVER_PATH = "s3a://lakehouse-silver"
GOLD_PATH = "s3a://lakehouse-gold"

# ============================================================================
# BRONZE LAYER - Raw CDC data from PostGIS
# ============================================================================

print("\n📦 Creating Bronze Layer tables...")

# Bronze: Properties (raw CDC from PostGIS)
bronze_properties_schema = StructType([
    StructField("id", IntegerType(), False),
    StructField("title", StringType(), True),
    StructField("description", StringType(), True),
    StructField("price", DecimalType(15, 2), True),
    StructField("property_type", StringType(), True),
    StructField("location", StringType(), True),  # GeoJSON string from PostGIS
    StructField("boundary", StringType(), True),  # GeoJSON polygon
    StructField("h3_index_7", StringType(), True),
    StructField("h3_index_9", StringType(), True),
    StructField("area", DecimalType(10, 2), True),
    StructField("bedrooms", IntegerType(), True),
    StructField("bathrooms", IntegerType(), True),
    StructField("created_at", TimestampType(), True),
    StructField("updated_at", TimestampType(), True),
    StructField("_cdc_timestamp", TimestampType(), True),  # CDC metadata
    StructField("_cdc_operation", StringType(), True),  # INSERT, UPDATE, DELETE
])

spark.createDataFrame([], bronze_properties_schema) \
    .write \
    .format("delta") \
    .mode("overwrite") \
    .option("path", f"{BRONZE_PATH}/properties") \
    .saveAsTable("bronze.properties")

print("✅ Created bronze.properties")

# Bronze: Neighborhoods
bronze_neighborhoods_schema = StructType([
    StructField("id", IntegerType(), False),
    StructField("name", StringType(), True),
    StructField("tier", StringType(), True),
    StructField("boundary", StringType(), True),  # GeoJSON polygon
    StructField("median_price", DecimalType(15, 2), True),
    StructField("property_count", IntegerType(), True),
    StructField("created_at", TimestampType(), True),
    StructField("updated_at", TimestampType(), True),
    StructField("_cdc_timestamp", TimestampType(), True),
    StructField("_cdc_operation", StringType(), True),
])

spark.createDataFrame([], bronze_neighborhoods_schema) \
    .write \
    .format("delta") \
    .mode("overwrite") \
    .option("path", f"{BRONZE_PATH}/neighborhoods") \
    .saveAsTable("bronze.neighborhoods")

print("✅ Created bronze.neighborhoods")

# ============================================================================
# SILVER LAYER - Cleaned and enriched data
# ============================================================================

print("\n🥈 Creating Silver Layer tables...")

# Silver: Properties Enriched
silver_properties_schema = StructType([
    StructField("id", IntegerType(), False),
    StructField("title", StringType(), True),
    StructField("description", StringType(), True),
    StructField("price", DecimalType(15, 2), True),
    StructField("property_type", StringType(), True),
    StructField("location_lat", DoubleType(), True),
    StructField("location_lng", DoubleType(), True),
    StructField("location_geom", StringType(), True),  # WKT format for Sedona
    StructField("boundary_geom", StringType(), True),  # WKT polygon
    StructField("h3_index_7", StringType(), True),
    StructField("h3_index_9", StringType(), True),
    StructField("area", DecimalType(10, 2), True),
    StructField("bedrooms", IntegerType(), True),
    StructField("bathrooms", IntegerType(), True),
    StructField("price_per_sqm", DecimalType(10, 2), True),  # Calculated field
    StructField("price_tier", StringType(), True),  # budget, mid, premium, luxury
    StructField("neighborhood_id", IntegerType(), True),  # Enriched from spatial join
    StructField("neighborhood_name", StringType(), True),
    StructField("created_at", TimestampType(), True),
    StructField("updated_at", TimestampType(), True),
    StructField("processed_at", TimestampType(), True),
])

spark.createDataFrame([], silver_properties_schema) \
    .write \
    .format("delta") \
    .mode("overwrite") \
    .option("path", f"{SILVER_PATH}/properties_enriched") \
    .partitionBy("property_type", "price_tier") \
    .saveAsTable("silver.properties_enriched")

print("✅ Created silver.properties_enriched (partitioned by property_type, price_tier)")

# Silver: Spatial Features (for ML)
silver_spatial_features_schema = StructType([
    StructField("property_id", IntegerType(), False),
    StructField("h3_index_7", StringType(), True),
    StructField("nearby_properties_1km", IntegerType(), True),
    StructField("nearby_properties_5km", IntegerType(), True),
    StructField("avg_price_1km", DecimalType(15, 2), True),
    StructField("avg_price_5km", DecimalType(15, 2), True),
    StructField("distance_to_cbd", DoubleType(), True),
    StructField("distance_to_nearest_commercial", DoubleType(), True),
    StructField("walkability_score", IntegerType(), True),
    StructField("created_at", TimestampType(), True),
])

spark.createDataFrame([], silver_spatial_features_schema) \
    .write \
    .format("delta") \
    .mode("overwrite") \
    .option("path", f"{SILVER_PATH}/spatial_features") \
    .saveAsTable("silver.spatial_features")

print("✅ Created silver.spatial_features")

# ============================================================================
# GOLD LAYER - Business aggregates and analytics
# ============================================================================

print("\n🥇 Creating Gold Layer tables...")

# Gold: Neighborhood Statistics
gold_neighborhood_stats_schema = StructType([
    StructField("h3_index_7", StringType(), False),
    StructField("neighborhood_name", StringType(), True),
    StructField("property_count", IntegerType(), True),
    StructField("avg_price", DecimalType(15, 2), True),
    StructField("median_price", DecimalType(15, 2), True),
    StructField("min_price", DecimalType(15, 2), True),
    StructField("max_price", DecimalType(15, 2), True),
    StructField("price_stddev", DecimalType(15, 2), True),
    StructField("avg_price_per_sqm", DecimalType(10, 2), True),
    StructField("residential_count", IntegerType(), True),
    StructField("commercial_count", IntegerType(), True),
    StructField("land_count", IntegerType(), True),
    StructField("industrial_count", IntegerType(), True),
    StructField("calculation_date", DateType(), True),
])

spark.createDataFrame([], gold_neighborhood_stats_schema) \
    .write \
    .format("delta") \
    .mode("overwrite") \
    .option("path", f"{GOLD_PATH}/neighborhood_stats") \
    .partitionBy("calculation_date") \
    .saveAsTable("gold.neighborhood_stats")

print("✅ Created gold.neighborhood_stats (partitioned by calculation_date)")

# Gold: Price Heatmap (H3 level 8)
gold_price_heatmap_schema = StructType([
    StructField("h3_index_8", StringType(), False),
    StructField("property_count", IntegerType(), True),
    StructField("avg_price", DecimalType(15, 2), True),
    StructField("price_quartile_25", DecimalType(15, 2), True),
    StructField("price_quartile_50", DecimalType(15, 2), True),
    StructField("price_quartile_75", DecimalType(15, 2), True),
    StructField("heat_score", DoubleType(), True),  # Normalized 0-100
    StructField("calculation_date", DateType(), True),
])

spark.createDataFrame([], gold_price_heatmap_schema) \
    .write \
    .format("delta") \
    .mode("overwrite") \
    .option("path", f"{GOLD_PATH}/price_heatmap") \
    .partitionBy("calculation_date") \
    .saveAsTable("gold.price_heatmap")

print("✅ Created gold.price_heatmap (partitioned by calculation_date)")

# Gold: Price Trends (time series)
gold_price_trends_schema = StructType([
    StructField("h3_index_7", StringType(), False),
    StructField("date", DateType(), False),
    StructField("avg_price", DecimalType(15, 2), True),
    StructField("property_count", IntegerType(), True),
    StructField("yoy_growth_pct", DoubleType(), True),
    StructField("mom_growth_pct", DoubleType(), True),
])

spark.createDataFrame([], gold_price_trends_schema) \
    .write \
    .format("delta") \
    .mode("overwrite") \
    .option("path", f"{GOLD_PATH}/price_trends") \
    .partitionBy("date") \
    .saveAsTable("gold.price_trends")

print("✅ Created gold.price_trends (partitioned by date)")

# ============================================================================
# Summary
# ============================================================================

print("\n" + "="*80)
print("🎉 Delta Lake schema initialization complete!")
print("="*80)

print("\n📊 Tables created:")
print("\nBronze Layer (Raw CDC):")
print("  - bronze.properties")
print("  - bronze.neighborhoods")

print("\nSilver Layer (Cleaned & Enriched):")
print("  - silver.properties_enriched (partitioned)")
print("  - silver.spatial_features")

print("\nGold Layer (Business Aggregates):")
print("  - gold.neighborhood_stats (partitioned)")
print("  - gold.price_heatmap (partitioned)")
print("  - gold.price_trends (partitioned)")

print("\n💾 Storage paths:")
print(f"  - Bronze: {BRONZE_PATH}")
print(f"  - Silver: {SILVER_PATH}")
print(f"  - Gold: {GOLD_PATH}")

print("\n✅ Ready for CDC ingestion and analytics jobs!")

spark.stop()
