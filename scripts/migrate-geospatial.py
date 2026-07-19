#!/usr/bin/env python3
"""
Geospatial Data Migration Script
Migrates property data from MySQL to PostGIS with H3 indexing
"""

import os
import sys
import json
import requests
from typing import List, Dict, Any
import mysql.connector
import psycopg2
from psycopg2.extras import execute_values
import h3

# Configuration
MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'port': int(os.getenv('MYSQL_PORT', 3306)),
    'user': os.getenv('MYSQL_USER', 'realestate_user'),
    'password': os.getenv('MYSQL_PASSWORD', 'realestate_pass'),
    'database': os.getenv('MYSQL_DATABASE', 'realestate'),
}

POSTGRES_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': int(os.getenv('POSTGRES_PORT', 5432)),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD', 'postgres'),
    'database': os.getenv('POSTGRES_DATABASE', 'geospatial'),
}

GEOSPATIAL_SERVICE_URL = os.getenv('GEOSPATIAL_SERVICE_URL', 'http://localhost:5003')
H3_RESOLUTION = 9  # ~0.5km hexagons

class GeospatialMigration:
    def __init__(self):
        self.mysql_conn = None
        self.postgres_conn = None
        
    def connect_databases(self):
        """Connect to MySQL and PostgreSQL"""
        print("Connecting to databases...")
        
        try:
            self.mysql_conn = mysql.connector.connect(**MYSQL_CONFIG)
            print("✓ Connected to MySQL")
        except Exception as e:
            print(f"✗ Failed to connect to MySQL: {e}")
            sys.exit(1)
            
        try:
            self.postgres_conn = psycopg2.connect(**POSTGRES_CONFIG)
            print("✓ Connected to PostgreSQL")
        except Exception as e:
            print(f"✗ Failed to connect to PostgreSQL: {e}")
            sys.exit(1)
    
    def setup_postgis(self):
        """Set up PostGIS database and tables"""
        print("\nSetting up PostGIS...")
        
        cursor = self.postgres_conn.cursor()
        
        # Enable PostGIS extension
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology;")
        print("✓ PostGIS extensions enabled")
        
        # Create properties table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS properties (
                id VARCHAR(255) PRIMARY KEY,
                title TEXT,
                description TEXT,
                price DECIMAL(15, 2),
                property_type VARCHAR(100),
                bedrooms INTEGER,
                bathrooms DECIMAL(3, 1),
                sqft INTEGER,
                lot_size INTEGER,
                year_built INTEGER,
                address TEXT,
                city VARCHAR(255),
                state VARCHAR(100),
                zip_code VARCHAR(20),
                location GEOGRAPHY(POINT, 4326),
                h3_index VARCHAR(20),
                user_id VARCHAR(255),
                status VARCHAR(50),
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            );
        """)
        print("✓ Properties table created")
        
        # Create spatial index
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_properties_location 
            ON properties USING GIST(location);
        """)
        
        # Create H3 index
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_properties_h3 
            ON properties(h3_index);
        """)
        print("✓ Spatial indexes created")
        
        self.postgres_conn.commit()
    
    def fetch_properties(self) -> List[Dict[str, Any]]:
        """Fetch all properties from MySQL"""
        print("\nFetching properties from MySQL...")
        
        cursor = self.mysql_conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                id, title, description, price, propertyType as property_type,
                bedrooms, bathrooms, sqft, lotSize as lot_size, yearBuilt as year_built,
                address, city, state, zipCode as zip_code,
                latitude as lat, longitude as lng,
                userId as user_id, status,
                createdAt as created_at, updatedAt as updated_at
            FROM properties
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """)
        
        properties = cursor.fetchall()
        print(f"✓ Fetched {len(properties)} properties")
        
        return properties
    
    def calculate_h3_index(self, lat: float, lng: float) -> str:
        """Calculate H3 index for coordinates"""
        return h3.geo_to_h3(lat, lng, H3_RESOLUTION)
    
    def migrate_properties(self, properties: List[Dict[str, Any]]):
        """Migrate properties to PostGIS"""
        print("\nMigrating properties to PostGIS...")
        
        cursor = self.postgres_conn.cursor()
        
        # Prepare data for bulk insert
        values = []
        for prop in properties:
            h3_index = self.calculate_h3_index(prop['lat'], prop['lng'])
            
            values.append((
                prop['id'],
                prop.get('title'),
                prop.get('description'),
                prop.get('price'),
                prop.get('property_type'),
                prop.get('bedrooms'),
                prop.get('bathrooms'),
                prop.get('sqft'),
                prop.get('lot_size'),
                prop.get('year_built'),
                prop.get('address'),
                prop.get('city'),
                prop.get('state'),
                prop.get('zip_code'),
                f"POINT({prop['lng']} {prop['lat']})",  # PostGIS format: lng lat
                h3_index,
                prop.get('user_id'),
                prop.get('status', 'active'),
                prop.get('created_at'),
                prop.get('updated_at'),
            ))
        
        # Bulk insert
        execute_values(
            cursor,
            """
            INSERT INTO properties (
                id, title, description, price, property_type,
                bedrooms, bathrooms, sqft, lot_size, year_built,
                address, city, state, zip_code, location, h3_index,
                user_id, status, created_at, updated_at
            ) VALUES %s
            ON CONFLICT (id) DO UPDATE SET
                location = EXCLUDED.location,
                h3_index = EXCLUDED.h3_index,
                updated_at = EXCLUDED.updated_at
            """,
            values,
            template="""(
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, ST_GeogFromText(%s), %s,
                %s, %s, %s, %s
            )"""
        )
        
        self.postgres_conn.commit()
        print(f"✓ Migrated {len(properties)} properties")
    
    def index_in_geospatial_service(self, properties: List[Dict[str, Any]]):
        """Index properties in geospatial service"""
        print("\nIndexing properties in geospatial service...")
        
        indexed_count = 0
        failed_count = 0
        
        for prop in properties:
            try:
                response = requests.post(
                    f"{GEOSPATIAL_SERVICE_URL}/index/property",
                    json={
                        'propertyId': prop['id'],
                        'location': {
                            'lat': prop['lat'],
                            'lng': prop['lng'],
                            'address': prop.get('address', ''),
                            'city': prop.get('city', ''),
                            'state': prop.get('state', ''),
                            'zipCode': prop.get('zip_code', ''),
                        },
                        'metadata': {
                            'propertyType': prop.get('property_type'),
                            'price': float(prop.get('price', 0)),
                            'bedrooms': prop.get('bedrooms'),
                            'bathrooms': float(prop.get('bathrooms', 0)),
                            'sqft': prop.get('sqft'),
                        }
                    },
                    timeout=5
                )
                
                if response.status_code == 200:
                    indexed_count += 1
                else:
                    failed_count += 1
                    
            except Exception as e:
                failed_count += 1
                if failed_count <= 5:  # Only print first 5 errors
                    print(f"  Warning: Failed to index property {prop['id']}: {e}")
        
        print(f"✓ Indexed {indexed_count} properties")
        if failed_count > 0:
            print(f"  ⚠ Failed to index {failed_count} properties (service may be offline)")
    
    def generate_statistics(self):
        """Generate migration statistics"""
        print("\n" + "="*50)
        print("Migration Statistics")
        print("="*50)
        
        cursor = self.postgres_conn.cursor()
        
        # Total properties
        cursor.execute("SELECT COUNT(*) FROM properties")
        total = cursor.fetchone()[0]
        print(f"Total properties: {total}")
        
        # Properties by city
        cursor.execute("""
            SELECT city, COUNT(*) as count
            FROM properties
            WHERE city IS NOT NULL
            GROUP BY city
            ORDER BY count DESC
            LIMIT 10
        """)
        print("\nTop 10 cities:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")
        
        # Properties by H3 index
        cursor.execute("""
            SELECT h3_index, COUNT(*) as count
            FROM properties
            GROUP BY h3_index
            ORDER BY count DESC
            LIMIT 5
        """)
        print("\nTop 5 H3 hexagons:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]} properties")
    
    def close_connections(self):
        """Close database connections"""
        if self.mysql_conn:
            self.mysql_conn.close()
        if self.postgres_conn:
            self.postgres_conn.close()
        print("\n✓ Database connections closed")

def main():
    print("="*50)
    print("Geospatial Data Migration")
    print("="*50)
    print()
    
    migration = GeospatialMigration()
    
    try:
        # Step 1: Connect to databases
        migration.connect_databases()
        
        # Step 2: Set up PostGIS
        migration.setup_postgis()
        
        # Step 3: Fetch properties from MySQL
        properties = migration.fetch_properties()
        
        if not properties:
            print("\n⚠ No properties found in MySQL. Exiting.")
            return
        
        # Step 4: Migrate to PostGIS
        migration.migrate_properties(properties)
        
        # Step 5: Index in geospatial service (optional, may fail if service is not running)
        try:
            migration.index_in_geospatial_service(properties)
        except Exception as e:
            print(f"\n⚠ Geospatial service indexing skipped: {e}")
        
        # Step 6: Generate statistics
        migration.generate_statistics()
        
        print("\n" + "="*50)
        print("✓ Migration completed successfully!")
        print("="*50)
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
        
    finally:
        migration.close_connections()

if __name__ == '__main__':
    main()
