"""
Flink Real-time Analytics - Streaming Event Processing
Processes events in real-time for immediate insights and alerts
"""

from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import StreamTableEnvironment, EnvironmentSettings
from pyflink.table.expressions import col, lit
from pyflink.table.window import Tumble

def create_kafka_source_table(table_env, table_name, topic_name):
    """Create Kafka source table"""
    
    ddl = f"""
        CREATE TABLE {table_name} (
            event_id STRING,
            event_type STRING,
            entity_id STRING,
            entity_type STRING,
            event_timestamp TIMESTAMP(3),
            data STRING,
            metadata MAP<STRING, STRING>,
            WATERMARK FOR event_timestamp AS event_timestamp - INTERVAL '5' SECOND
        ) WITH (
            'connector' = 'kafka',
            'topic' = '{topic_name}',
            'properties.bootstrap.servers' = 'kafka:9092',
            'properties.group.id' = 'flink-realtime-analytics',
            'scan.startup.mode' = 'latest-offset',
            'format' = 'json'
        )
    """
    
    table_env.execute_sql(ddl)

def create_sink_table(table_env, table_name, topic_name):
    """Create Kafka sink table for results"""
    
    ddl = f"""
        CREATE TABLE {table_name} (
            metric_name STRING,
            metric_value DOUBLE,
            dimensions MAP<STRING, STRING>,
            window_start TIMESTAMP(3),
            window_end TIMESTAMP(3),
            processing_time TIMESTAMP(3)
        ) WITH (
            'connector' = 'kafka',
            'topic' = '{topic_name}',
            'properties.bootstrap.servers' = 'kafka:9092',
            'format' = 'json'
        )
    """
    
    table_env.execute_sql(ddl)

def property_view_analytics(table_env):
    """Real-time property view analytics"""
    
    # Create source table
    create_kafka_source_table(table_env, 'property_events', 'property-events')
    
    # Create sink table
    create_sink_table(table_env, 'property_view_metrics', 'realtime-metrics')
    
    # Calculate views per property per minute
    result = table_env.sql_query("""
        SELECT
            'property_views_per_minute' as metric_name,
            CAST(COUNT(*) AS DOUBLE) as metric_value,
            MAP['property_id', entity_id, 'window_type', 'tumbling_1min'] as dimensions,
            TUMBLE_START(event_timestamp, INTERVAL '1' MINUTE) as window_start,
            TUMBLE_END(event_timestamp, INTERVAL '1' MINUTE) as window_end,
            CURRENT_TIMESTAMP as processing_time
        FROM property_events
        WHERE event_type = 'property_viewed'
        GROUP BY
            entity_id,
            TUMBLE(event_timestamp, INTERVAL '1' MINUTE)
    """)
    
    # Write to sink
    result.execute_insert('property_view_metrics')

def search_pattern_analytics(table_env):
    """Real-time search pattern analytics"""
    
    create_kafka_source_table(table_env, 'user_events', 'user-events')
    create_sink_table(table_env, 'search_metrics', 'realtime-metrics')
    
    # Analyze search patterns
    result = table_env.sql_query("""
        SELECT
            'searches_per_minute' as metric_name,
            CAST(COUNT(*) AS DOUBLE) as metric_value,
            MAP['event_type', event_type] as dimensions,
            TUMBLE_START(event_timestamp, INTERVAL '1' MINUTE) as window_start,
            TUMBLE_END(event_timestamp, INTERVAL '1' MINUTE) as window_end,
            CURRENT_TIMESTAMP as processing_time
        FROM user_events
        WHERE event_type = 'search_performed'
        GROUP BY
            event_type,
            TUMBLE(event_timestamp, INTERVAL '1' MINUTE)
    """)
    
    result.execute_insert('search_metrics')

def transaction_monitoring(table_env):
    """Real-time transaction monitoring"""
    
    create_kafka_source_table(table_env, 'transaction_events', 'transaction-events')
    create_sink_table(table_env, 'transaction_metrics', 'realtime-metrics')
    
    # Monitor transaction status changes
    result = table_env.sql_query("""
        SELECT
            'transaction_status_changes' as metric_name,
            CAST(COUNT(*) AS DOUBLE) as metric_value,
            MAP['status', JSON_VALUE(data, '$.status'), 'event_type', event_type] as dimensions,
            TUMBLE_START(event_timestamp, INTERVAL '5' MINUTE) as window_start,
            TUMBLE_END(event_timestamp, INTERVAL '5' MINUTE) as window_end,
            CURRENT_TIMESTAMP as processing_time
        FROM transaction_events
        WHERE event_type IN ('transaction_created', 'transaction_completed', 'transaction_cancelled')
        GROUP BY
            JSON_VALUE(data, '$.status'),
            event_type,
            TUMBLE(event_timestamp, INTERVAL '5' MINUTE)
    """)
    
    result.execute_insert('transaction_metrics')

def price_change_detection(table_env):
    """Detect significant price changes in real-time"""
    
    create_kafka_source_table(table_env, 'property_price_events', 'property-events')
    create_sink_table(table_env, 'price_change_alerts', 'realtime-alerts')
    
    # Detect price changes > 10%
    result = table_env.sql_query("""
        SELECT
            'significant_price_change' as metric_name,
            CAST(JSON_VALUE(data, '$.price_change_pct') AS DOUBLE) as metric_value,
            MAP[
                'property_id', entity_id,
                'old_price', JSON_VALUE(data, '$.old_price'),
                'new_price', JSON_VALUE(data, '$.new_price')
            ] as dimensions,
            event_timestamp as window_start,
            event_timestamp as window_end,
            CURRENT_TIMESTAMP as processing_time
        FROM property_price_events
        WHERE event_type = 'price_updated'
            AND ABS(CAST(JSON_VALUE(data, '$.price_change_pct') AS DOUBLE)) > 10.0
    """)
    
    result.execute_insert('price_change_alerts')

def user_engagement_scoring(table_env):
    """Calculate real-time user engagement scores"""
    
    create_kafka_source_table(table_env, 'user_activity_events', 'user-events')
    create_sink_table(table_env, 'engagement_scores', 'realtime-metrics')
    
    # Calculate engagement score based on activity
    result = table_env.sql_query("""
        SELECT
            'user_engagement_score' as metric_name,
            CAST(
                SUM(
                    CASE event_type
                        WHEN 'property_viewed' THEN 1.0
                        WHEN 'property_favorited' THEN 3.0
                        WHEN 'search_performed' THEN 2.0
                        WHEN 'contact_agent' THEN 5.0
                        WHEN 'schedule_tour' THEN 7.0
                        ELSE 0.0
                    END
                ) AS DOUBLE
            ) as metric_value,
            MAP['user_id', entity_id] as dimensions,
            TUMBLE_START(event_timestamp, INTERVAL '15' MINUTE) as window_start,
            TUMBLE_END(event_timestamp, INTERVAL '15' MINUTE) as window_end,
            CURRENT_TIMESTAMP as processing_time
        FROM user_activity_events
        GROUP BY
            entity_id,
            TUMBLE(event_timestamp, INTERVAL '15' MINUTE)
        HAVING SUM(
            CASE event_type
                WHEN 'property_viewed' THEN 1.0
                WHEN 'property_favorited' THEN 3.0
                WHEN 'search_performed' THEN 2.0
                WHEN 'contact_agent' THEN 5.0
                WHEN 'schedule_tour' THEN 7.0
                ELSE 0.0
            END
        ) > 10.0
    """)
    
    result.execute_insert('engagement_scores')

def market_trend_detection(table_env):
    """Detect emerging market trends in real-time"""
    
    create_kafka_source_table(table_env, 'market_events', 'property-events')
    create_sink_table(table_env, 'market_trends', 'realtime-metrics')
    
    # Calculate average price trends by region
    result = table_env.sql_query("""
        SELECT
            'avg_price_by_region' as metric_name,
            AVG(CAST(JSON_VALUE(data, '$.price') AS DOUBLE)) as metric_value,
            MAP[
                'city', JSON_VALUE(data, '$.city'),
                'state', JSON_VALUE(data, '$.state'),
                'property_type', JSON_VALUE(data, '$.property_type')
            ] as dimensions,
            TUMBLE_START(event_timestamp, INTERVAL '1' HOUR) as window_start,
            TUMBLE_END(event_timestamp, INTERVAL '1' HOUR) as window_end,
            CURRENT_TIMESTAMP as processing_time
        FROM market_events
        WHERE event_type IN ('property_listed', 'property_sold')
        GROUP BY
            JSON_VALUE(data, '$.city'),
            JSON_VALUE(data, '$.state'),
            JSON_VALUE(data, '$.property_type'),
            TUMBLE(event_timestamp, INTERVAL '1' HOUR)
    """)
    
    result.execute_insert('market_trends')

def main():
    """Main entry point for Flink streaming jobs"""
    
    # Create execution environment
    env = StreamExecutionEnvironment.get_execution_environment()
    env.set_parallelism(4)
    
    # Create table environment
    settings = EnvironmentSettings.new_instance() \
        .in_streaming_mode() \
        .build()
    table_env = StreamTableEnvironment.create(env, settings)
    
    # Enable checkpointing for fault tolerance
    env.enable_checkpointing(60000)  # Checkpoint every minute
    
    print("Starting Flink real-time analytics jobs...")
    
    # Start all analytics jobs
    property_view_analytics(table_env)
    search_pattern_analytics(table_env)
    transaction_monitoring(table_env)
    price_change_detection(table_env)
    user_engagement_scoring(table_env)
    market_trend_detection(table_env)
    
    # Execute
    env.execute("Real-time Analytics Pipeline")

if __name__ == "__main__":
    main()
