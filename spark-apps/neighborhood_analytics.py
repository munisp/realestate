"""
Neighborhood Analytics with Apache Sedona
Aggregates property statistics by H3 hexagons and neighborhoods
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.window import Window
from sedona.register import SedonaRegistrator
from sedona.utils import SedonaKryoRegistrator, KryoSerializer
from delta import configure_spark_with_delta_pip
import sys
from datetime import date

# Initialize Spark with Sedona + Delta Lake
builder = SparkSession.builder \
    .appName("Neighborhood Analytics") \
    .config("spark.serializer", KryoSerializer.getName) \
    .config("spark.kryo.registrator", SedonaKryoRegistrator.getName) \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000") \
    .config("spark.hadoop.fs.s3a.access.key", "admin") \
    .config("spark.hadoop.fs.s3a.secret.key", "minio_admin_password") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")

spark = configure_spark_with_delta_pip(builder).getOrCreate()
SedonaRegistrator.registerAll(spark)

print("✅ Spark session initialized with Sedona + Delta Lake")

# S3 paths
SILVER_PATH = "s3a://lakehouse-silver"
GOLD_PATH = "s3a://lakehouse-gold"

# ============================================================================
# Load Silver Layer Data
# ============================================================================

print("\n📖 Loading silver layer data...")

properties_df = spark.read.format("delta").load(f"{SILVER_PATH}/properties_enriched")
print(f"✅ Loaded {properties_df.count()} properties from silver layer")

# ============================================================================
# Neighborhood Statistics Aggregation
# ============================================================================

print("\n📊 Calculating neighborhood statistics...")

# Group by H3 index (level 7 - neighborhood scale)
neighborhood_stats = properties_df \
    .groupBy("h3_index_7", "neighborhood_name") \
    .agg(
        count("*").alias("property_count"),
        avg("price").alias("avg_price"),
        expr("percentile_approx(price, 0.5)").alias("median_price"),
        min("price").alias("min_price"),
        max("price").alias("max_price"),
        stddev("price").alias("price_stddev"),
        avg("price_per_sqm").alias("avg_price_per_sqm"),
        sum(when(col("property_type") == "residential", 1).otherwise(0)).alias("residential_count"),
        sum(when(col("property_type") == "commercial", 1).otherwise(0)).alias("commercial_count"),
        sum(when(col("property_type") == "land", 1).otherwise(0)).alias("land_count"),
        sum(when(col("property_type") == "industrial", 1).otherwise(0)).alias("industrial_count")
    ) \
    .withColumn("calculation_date", lit(date.today()))

print(f"✅ Calculated statistics for {neighborhood_stats.count()} neighborhoods")

# Write to Gold layer
neighborhood_stats.write \
    .format("delta") \
    .mode("overwrite") \
    .option("path", f"{GOLD_PATH}/neighborhood_stats") \
    .partitionBy("calculation_date") \
    .saveAsTable("gold.neighborhood_stats")

print("✅ Saved to gold.neighborhood_stats")

# ============================================================================
# Price Heatmap (H3 Level 8 - finer granularity)
# ============================================================================

print("\n🗺️  Generating price heatmap...")

# Register properties as temp view for Sedona SQL
properties_df.createOrReplaceTempView("properties")

# Use Sedona to generate H3 level 8 indexes
heatmap_df = spark.sql("""
    SELECT 
        ST_H3CellIDs(ST_GeomFromWKT(location_geom), 8, false)[0] as h3_index_8,
        COUNT(*) as property_count,
        AVG(price) as avg_price,
        PERCENTILE_APPROX(price, 0.25) as price_quartile_25,
        PERCENTILE_APPROX(price, 0.50) as price_quartile_50,
        PERCENTILE_APPROX(price, 0.75) as price_quartile_75
    FROM properties
    WHERE location_geom IS NOT NULL
    GROUP BY h3_index_8
""")

# Calculate normalized heat score (0-100)
max_price = heatmap_df.agg(max("avg_price")).collect()[0][0]
min_price = heatmap_df.agg(min("avg_price")).collect()[0][0]

heatmap_df = heatmap_df \
    .withColumn("heat_score", 
        ((col("avg_price") - lit(min_price)) / (lit(max_price) - lit(min_price))) * 100
    ) \
    .withColumn("calculation_date", lit(date.today()))

print(f"✅ Generated heatmap with {heatmap_df.count()} H3 cells")

# Write to Gold layer
heatmap_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("path", f"{GOLD_PATH}/price_heatmap") \
    .partitionBy("calculation_date") \
    .saveAsTable("gold.price_heatmap")

print("✅ Saved to gold.price_heatmap")

# ============================================================================
# Spatial Clustering Analysis
# ============================================================================

print("\n🔍 Performing spatial clustering analysis...")

# Use Sedona's DBSCAN clustering
clustering_df = spark.sql("""
    SELECT 
        *,
        ST_ClusterDBSCAN(ST_GeomFromWKT(location_geom), 0.01, 5) OVER() as cluster_id
    FROM properties
    WHERE location_geom IS NOT NULL
""")

# Analyze clusters
cluster_stats = clustering_df \
    .filter(col("cluster_id").isNotNull()) \
    .groupBy("cluster_id") \
    .agg(
        count("*").alias("cluster_size"),
        avg("price").alias("avg_price"),
        expr("ST_Envelope_Aggr(ST_GeomFromWKT(location_geom))").alias("cluster_boundary")
    ) \
    .filter(col("cluster_size") >= 5)  # Only clusters with 5+ properties

print(f"✅ Identified {cluster_stats.count()} property clusters")

# ============================================================================
# Summary Statistics
# ============================================================================

print("\n" + "="*80)
print("📈 Analytics Summary")
print("="*80)

# Overall statistics
total_properties = properties_df.count()
total_neighborhoods = neighborhood_stats.count()
total_heatmap_cells = heatmap_df.count()

print(f"\n📊 Processed Data:")
print(f"  - Total Properties: {total_properties:,}")
print(f"  - Neighborhoods (H3-7): {total_neighborhoods}")
print(f"  - Heatmap Cells (H3-8): {total_heatmap_cells:,}")

# Price statistics
price_stats = properties_df.agg(
    avg("price").alias("avg"),
    expr("percentile_approx(price, 0.5)").alias("median"),
    min("price").alias("min"),
    max("price").alias("max")
).collect()[0]

print(f"\n💰 Price Statistics:")
print(f"  - Average: ₦{price_stats['avg']:,.2f}")
print(f"  - Median: ₦{price_stats['median']:,.2f}")
print(f"  - Min: ₦{price_stats['min']:,.2f}")
print(f"  - Max: ₦{price_stats['max']:,.2f}")

# Property type distribution
type_dist = properties_df.groupBy("property_type").count().collect()
print(f"\n🏘️  Property Type Distribution:")
for row in type_dist:
    print(f"  - {row['property_type']}: {row['count']:,}")

print("\n✅ Neighborhood analytics job completed successfully!")

spark.stop()
