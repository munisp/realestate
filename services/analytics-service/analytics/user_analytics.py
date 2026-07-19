from database import clickhouse_client

class UserAnalytics:
    @staticmethod
    def get_user_journey(user_id: str, days: int = 30):
        query = """
            SELECT
                event_type,
                timestamp,
                page_url,
                properties
            FROM user_events
            WHERE user_id = %(user_id)s
            AND date >= today() - %(days)s
            ORDER BY timestamp
        """
        return clickhouse_client.execute(query, {
            'user_id': user_id,
            'days': days
        })

    @staticmethod
    def get_conversion_funnel(days: int = 30):
        query = """
            SELECT
                event_type,
                count(*) as count
            FROM user_events
            WHERE date >= today() - %(days)s
            AND event_type IN ('page_view', 'property_view', 'inquiry', 'application', 'transaction')
            GROUP BY event_type
        """
        return clickhouse_client.execute(query, {'days': days})
