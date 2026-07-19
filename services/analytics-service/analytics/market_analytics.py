from database import clickhouse_client

class MarketAnalytics:
    @staticmethod
    def get_market_trends(city: str = None, days: int = 30):
        query = """
            SELECT
                date,
                avg(avg_price) as avg_price,
                sum(total_listings) as total_listings,
                sum(total_views) as total_views,
                sum(total_transactions) as total_transactions
            FROM market_metrics
            WHERE date >= today() - %(days)s
        """
        params = {'days': days}
        
        if city:
            query += " AND city = %(city)s"
            params['city'] = city
            
        query += " GROUP BY date ORDER BY date"
        
        return clickhouse_client.execute(query, params)

    @staticmethod
    def get_price_distribution(property_type: str = None):
        query = """
            SELECT
                quantile(0.25)(avg_price) as q25,
                quantile(0.50)(avg_price) as median,
                quantile(0.75)(avg_price) as q75,
                avg(avg_price) as mean
            FROM market_metrics
            WHERE date >= today() - 30
        """
        params = {}
        
        if property_type:
            query += " AND property_type = %(property_type)s"
            params['property_type'] = property_type
            
        result = clickhouse_client.execute(query, params)
        return result[0] if result else (0, 0, 0, 0)
