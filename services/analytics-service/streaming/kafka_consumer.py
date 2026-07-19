from kafka import KafkaConsumer as Consumer
import json
import os
import logging
from database import clickhouse_client

logger = logging.getLogger(__name__)

class KafkaConsumer:
    def __init__(self):
        self.brokers = os.getenv("KAFKA_BROKERS", "localhost:9092").split(",")
        self.consumer = None

    def start(self):
        self.consumer = Consumer(
            'property.views',
            'user.events',
            bootstrap_servers=self.brokers,
            group_id='analytics-service',
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )

        logger.info("Kafka consumer started")

        for message in self.consumer:
            try:
                self.process_message(message)
            except Exception as e:
                logger.error(f"Error processing message: {e}")

    def process_message(self, message):
        topic = message.topic
        data = message.value

        if topic == 'property.views':
            self.process_property_view(data)
        elif topic == 'user.events':
            self.process_user_event(data)

    def process_property_view(self, data):
        clickhouse_client.insert('property_views', [(
            data['property_id'],
            data.get('user_id'),
            data['session_id'],
            data['timestamp'],
            data['duration_seconds'],
            data['source'],
            data['device_type']
        )])

    def process_user_event(self, data):
        clickhouse_client.insert('user_events', [(
            data['event_type'],
            data.get('user_id'),
            data['session_id'],
            data['timestamp'],
            json.dumps(data.get('properties', {})),
            data['page_url'],
            data.get('referrer')
        )])

kafka_consumer = KafkaConsumer()
