import os
"""
Daily Analytics Pipeline DAG
Orchestrates Bronze → Silver → Gold transformations
"""

from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago
from datetime import timedelta
import requests

# Default arguments
default_args = {
    'owner': 'realestate-platform',
    'depends_on_past': False,
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

# DAG definition
dag = DAG(
    'daily_analytics_pipeline',
    default_args=default_args,
    description='Daily geospatial analytics pipeline',
    schedule_interval='0 2 * * *',  # Run at 2 AM daily
    start_date=days_ago(1),
    catchup=False,
    tags=['analytics', 'geospatial', 'sedona'],
)

# ============================================================================
# Task 1: Bronze to Silver Transformation
# ============================================================================

bronze_to_silver = SparkSubmitOperator(
    task_id='bronze_to_silver',
    application='/opt/spark-apps/bronze_to_silver.py',
    conn_id='spark_default',
    conf={
        'spark.serializer': 'org.apache.spark.serializer.KryoSerializer',
        'spark.kryo.registrator': 'org.apache.sedona.core.serde.SedonaKryoRegistrator',
        'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
        'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',
        'spark.hadoop.fs.s3a.endpoint': 'http://minio:9000',
        'spark.hadoop.fs.s3a.access.key': os.environ.get('MINIO_ACCESS_KEY', 'admin'),
        'spark.hadoop.fs.s3a.secret.key': os.environ.get('MINIO_SECRET_KEY', ''),
        'spark.hadoop.fs.s3a.path.style.access': 'true',
    },
    packages='io.delta:delta-core_2.12:2.4.0,org.apache.sedona:sedona-spark-3.4_2.12:1.5.0',
    dag=dag,
)

# ============================================================================
# Task 2: Neighborhood Analytics
# ============================================================================

neighborhood_analytics = SparkSubmitOperator(
    task_id='neighborhood_analytics',
    application='/opt/spark-apps/neighborhood_analytics.py',
    conn_id='spark_default',
    conf={
        'spark.serializer': 'org.apache.spark.serializer.KryoSerializer',
        'spark.kryo.registrator': 'org.apache.sedona.core.serde.SedonaKryoRegistrator',
        'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
        'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',
        'spark.hadoop.fs.s3a.endpoint': 'http://minio:9000',
        'spark.hadoop.fs.s3a.access.key': os.environ.get('MINIO_ACCESS_KEY', 'admin'),
        'spark.hadoop.fs.s3a.secret.key': os.environ.get('MINIO_SECRET_KEY', ''),
        'spark.hadoop.fs.s3a.path.style.access': 'true',
    },
    packages='io.delta:delta-core_2.12:2.4.0,org.apache.sedona:sedona-spark-3.4_2.12:1.5.0',
    dag=dag,
)

# ============================================================================
# Task 3: Price Trend Analysis
# ============================================================================

price_trends = SparkSubmitOperator(
    task_id='price_trends',
    application='/opt/spark-apps/price_trends.py',
    conn_id='spark_default',
    conf={
        'spark.serializer': 'org.apache.spark.serializer.KryoSerializer',
        'spark.kryo.registrator': 'org.apache.sedona.core.serde.SedonaKryoRegistrator',
        'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
        'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',
        'spark.hadoop.fs.s3a.endpoint': 'http://minio:9000',
        'spark.hadoop.fs.s3a.access.key': os.environ.get('MINIO_ACCESS_KEY', 'admin'),
        'spark.hadoop.fs.s3a.secret.key': os.environ.get('MINIO_SECRET_KEY', ''),
        'spark.hadoop.fs.s3a.path.style.access': 'true',
    },
    packages='io.delta:delta-core_2.12:2.4.0,org.apache.sedona:sedona-spark-3.4_2.12:1.5.0',
    dag=dag,
)

# ============================================================================
# Task 4: Reverse ETL to PostGIS
# ============================================================================

def reverse_etl_to_postgis():
    """Push Gold layer aggregates back to PostGIS for fast API queries"""
    import psycopg2
    from pyspark.sql import SparkSession
    
    # Read from Gold layer
    spark = SparkSession.builder.getOrCreate()
    neighborhood_stats = spark.read.format("delta").load("s3a://lakehouse-gold/neighborhood_stats")
    
    # Write to PostGIS
    neighborhood_stats.write \
        .format("jdbc") \
        .option("url", "jdbc:postgresql://postgis:5432/realestate_spatial") \
        .option("dbtable", "spatial.neighborhood_stats_cache") \
        .option("user", "postgres") \
        .option("password", os.environ.get("POSTGIS_PASSWORD", "")) \
        .mode("overwrite") \
        .save()
    
    # Refresh materialized view
    conn = psycopg2.connect(
        host="postgis",
        database="realestate_spatial",
        user="postgres",
        password=os.environ.get("POSTGIS_PASSWORD", "")
    )
    cur = conn.cursor()
    cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY spatial.neighborhood_stats_mv;")
    conn.commit()
    cur.close()
    conn.close()
    
    print("✅ Reverse ETL to PostGIS completed")

reverse_etl = PythonOperator(
    task_id='reverse_etl_to_postgis',
    python_callable=reverse_etl_to_postgis,
    dag=dag,
)

# ============================================================================
# Task 5: Data Quality Checks
# ============================================================================

def data_quality_checks():
    """Validate data quality in Gold layer"""
    from pyspark.sql import SparkSession
    from pyspark.sql.functions import col, count, when, isnan
    
    spark = SparkSession.builder.getOrCreate()
    
    # Check neighborhood stats
    stats_df = spark.read.format("delta").load("s3a://lakehouse-gold/neighborhood_stats")
    
    # Null checks
    null_counts = stats_df.select([
        count(when(col(c).isNull(), c)).alias(c) for c in stats_df.columns
    ]).collect()[0].asDict()
    
    # Validate no critical nulls
    critical_fields = ['h3_index_7', 'property_count', 'avg_price']
    for field in critical_fields:
        if null_counts[field] > 0:
            raise ValueError(f"Data quality check failed: {field} has {null_counts[field]} nulls")
    
    # Validate property counts
    total_properties = stats_df.agg({"property_count": "sum"}).collect()[0][0]
    if total_properties == 0:
        raise ValueError("Data quality check failed: No properties in neighborhood stats")
    
    print(f"✅ Data quality checks passed ({total_properties:,} total properties)")

quality_checks = PythonOperator(
    task_id='data_quality_checks',
    python_callable=data_quality_checks,
    dag=dag,
)

# ============================================================================
# Task 6: Send Completion Notification
# ============================================================================

def send_completion_notification(**context):
    """Notify completion via webhook or email"""
    execution_date = context['execution_date']
    
    message = f"""
    ✅ Daily Analytics Pipeline Completed
    
    Execution Date: {execution_date}
    
    Tasks Completed:
    - Bronze → Silver transformation
    - Neighborhood analytics
    - Price trend analysis
    - Reverse ETL to PostGIS
    - Data quality checks
    
    Gold layer updated and ready for queries.
    """
    
    print(message)
    
    # Optional: Send to notification service
    # requests.post('https://your-notification-endpoint', json={'message': message})

notify = PythonOperator(
    task_id='send_completion_notification',
    python_callable=send_completion_notification,
    provide_context=True,
    dag=dag,
)

# ============================================================================
# Task Dependencies
# ============================================================================

# Linear pipeline
bronze_to_silver >> neighborhood_analytics >> price_trends >> reverse_etl >> quality_checks >> notify

# Alternative: Parallel execution of analytics tasks
# bronze_to_silver >> [neighborhood_analytics, price_trends] >> reverse_etl >> quality_checks >> notify
