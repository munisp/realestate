from database import clickhouse_client
from datetime import datetime, timedelta
from typing import List

class PropertyAnalytics:
    @staticmethod
    def get_property_views(property_id: str, days: int = 30):
        query = """
            SELECT
                count(*) as total_views,
                uniq(user_id) as unique_users,
                avg(duration_seconds) as avg_duration
            FROM property_views
            WHERE property_id = %(property_id)s
            AND date >= today() - %(days)s
        """
        result = clickhouse_client.execute(query, {
            'property_id': property_id,
            'days': days
        })
        return result[0] if result else (0, 0, 0)

    @staticmethod
    def get_top_properties(limit: int = 10, days: int = 7):
        query = """
            SELECT
                property_id,
                count(*) as view_count,
                uniq(user_id) as unique_users
            FROM property_views
            WHERE date >= today() - %(days)s
            GROUP BY property_id
            ORDER BY view_count DESC
            LIMIT %(limit)s
        """
        return clickhouse_client.execute(query, {
            'days': days,
            'limit': limit
        })

    @staticmethod
    def get_property_trends(property_id: str, days: int = 30):
        query = """
            SELECT
                toDate(timestamp) as date,
                count(*) as views,
                uniq(user_id) as unique_users
            FROM property_views
            WHERE property_id = %(property_id)s
            AND date >= today() - %(days)s
            GROUP BY date
            ORDER BY date
        """
        return clickhouse_client.execute(query, {
            'property_id': property_id,
            'days': days
        })
