# Real Estate Platform - PostgreSQL Database Package

Complete PostgreSQL database schema and seed data for the Next-Generation Real Estate Platform.

## 📦 Package Contents

```
database/
├── schema-clean.sql           # Complete PostgreSQL schema (40+ tables)
├── seed-data.sql              # Sample data for development/testing
├── deploy.sh                  # Automated deployment script
├── DEPLOYMENT_GUIDE.md        # Comprehensive deployment documentation
└── README.md                  # This file
```

## 🚀 Quick Start (3 Commands)

```bash
# 1. Set your database connection string
export DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# 2. Run automated deployment
./database/deploy.sh

# 3. Verify installation
psql $DATABASE_URL -c "SELECT COUNT(*) FROM properties;"
```

## 📋 What's Included

### Schema Features

- ✅ **40+ Tables** - Complete real estate platform schema
- ✅ **90+ Enum Types** - Type-safe data constraints
- ✅ **PostGIS Integration** - Advanced geospatial queries
- ✅ **GNN Support** - Graph Neural Network tables for property valuations
- ✅ **Optimized Indexes** - Performance-tuned for common queries
- ✅ **Automatic Triggers** - Timestamp updates and location calculations
- ✅ **Materialized Views** - Pre-computed statistics
- ✅ **Full-Text Search** - Indexed property descriptions

### Core Modules

| Module | Tables | Description |
|--------|--------|-------------|
| **Core** | users, properties | User accounts and property listings |
| **Valuations** | property_valuations, gnn_* | ML-powered property valuations (Zestimate-style) |
| **Transactions** | transactions, payments, escrow_* | Sale/rent processing and escrow |
| **Search & Alerts** | saved_searches, property_alerts | User search preferences and notifications |
| **Engagement** | favorites, appointments, offers | User interactions with properties |
| **Reviews** | property_reviews, agent_reviews | Ratings and feedback |
| **Builders** | builders, builder_projects, milestones | Construction project management |
| **Shortlets** | shortlet_properties, shortlet_bookings | Short-term rental platform |
| **Documents** | documents | File storage references (S3) |
| **Analytics** | property_views, user_activity | Usage tracking and insights |

### Sample Data

The seed data includes:
- **11 Users** - Admins, agents, builders, and buyers
- **8 Properties** - Across Lagos, Abuja, and Port Harcourt
- **3 Valuations** - ML-generated property estimates
- **GNN Graph Data** - Spatial relationships between properties
- **3 Builder Projects** - With milestones and progress tracking
- **Appointments, Offers, Reviews** - Complete user journey examples

## 🎯 Deployment Options

### Option 1: Automated Script (Recommended)

```bash
export DATABASE_URL="your_connection_string"
./database/deploy.sh
```

The script will:
1. Test database connection
2. Check/install PostGIS extension
3. Deploy complete schema
4. Load seed data (optional)
5. Verify installation
6. Generate deployment log

### Option 2: Manual Deployment

```bash
# Deploy schema
psql $DATABASE_URL -f database/schema-clean.sql

# Load seed data
psql $DATABASE_URL -f database/seed-data.sql
```

### Option 3: GUI Tools

Use DBeaver, pgAdmin, or TablePlus:
1. Connect to your database
2. Open SQL Editor
3. Execute `schema-clean.sql`
4. Execute `seed-data.sql`

## 🗄️ Database Providers

### Recommended for Development

**Neon** (https://neon.tech)
- ✅ Serverless PostgreSQL
- ✅ PostGIS included
- ✅ Free tier: 3GB storage
- ✅ Auto-scaling
- ✅ Instant provisioning

**Supabase** (https://supabase.com)
- ✅ PostgreSQL + PostGIS
- ✅ Free tier: 500MB
- ✅ Built-in auth (optional)
- ✅ Real-time subscriptions
- ✅ REST API auto-generated

### Production Options

- AWS RDS PostgreSQL
- Azure Database for PostgreSQL
- Google Cloud SQL for PostgreSQL
- DigitalOcean Managed PostgreSQL
- Heroku Postgres

## 📊 Database Schema Highlights

### Geospatial Features

```sql
-- Properties have PostGIS geography points
CREATE TABLE properties (
    ...
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location GEOGRAPHY(POINT, 4326),  -- PostGIS
    h3_index VARCHAR(20),              -- Uber H3 for clustering
    ...
);

-- Find properties within 5km
SELECT * FROM properties
WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(3.4286, 6.4474), 4326)::geography,
    5000
);
```

### Graph Neural Network Support

```sql
-- Property nodes with embeddings
CREATE TABLE gnn_property_nodes (
    property_id INTEGER,
    feature_vector DECIMAL(10, 6)[],
    embedding_vector DECIMAL(10, 6)[],
    degree_centrality DECIMAL(10, 6),
    pagerank_score DECIMAL(10, 6),
    ...
);

-- Spatial relationships
CREATE TABLE gnn_property_edges (
    source_property_id INTEGER,
    target_property_id INTEGER,
    distance_meters DECIMAL(10, 2),
    similarity_score DECIMAL(5, 4),
    edge_type VARCHAR(50),  -- 'spatial', 'feature_similar'
    ...
);
```

### ML Valuations (Zestimate-style)

```sql
CREATE TABLE property_valuations (
    property_id INTEGER,
    estimated_value DECIMAL(15, 2),
    confidence_score DECIMAL(5, 4),
    value_range_low DECIMAL(15, 2),
    value_range_high DECIMAL(15, 2),
    model_type VARCHAR(50),  -- 'gnn', 'ensemble', 'hybrid'
    comparable_sales_weight DECIMAL(5, 4),
    location_weight DECIMAL(5, 4),
    ...
);
```

## 🔍 Sample Queries

### Find Properties Near Location

```sql
SELECT 
    id, title, city, price,
    ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(3.4286, 6.4474), 4326)::geography
    ) / 1000 as distance_km
FROM properties
WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(3.4286, 6.4474), 4326)::geography,
    10000  -- 10km
)
ORDER BY distance_km;
```

### Property Stats by City

```sql
SELECT * FROM property_stats_by_city;
-- Pre-built view with avg/min/max prices per city
```

### Active Listings with Agent Info

```sql
SELECT * FROM active_listings;
-- Pre-built view joining properties and agents
```

### GNN Graph Analysis

```sql
SELECT 
    p1.title as source,
    p2.title as target,
    e.distance_meters,
    e.similarity_score,
    e.edge_type
FROM gnn_property_edges e
JOIN properties p1 ON e.source_property_id = p1.id
JOIN properties p2 ON e.target_property_id = p2.id
WHERE e.edge_type = 'spatial'
ORDER BY e.distance_meters;
```

## 🔐 Security

- ✅ SSL/TLS required for all connections
- ✅ No hardcoded credentials
- ✅ Row-level security ready
- ✅ Prepared statements prevent SQL injection
- ✅ Audit triggers available

## 📈 Performance

### Included Optimizations

- **GIST Indexes** - Geospatial queries
- **GIN Indexes** - Full-text search, JSONB
- **B-tree Indexes** - Foreign keys, filters
- **Partial Indexes** - Status-based queries
- **Materialized Views** - Pre-computed stats

### Expected Performance

- Property search: < 50ms
- Geospatial queries: < 100ms
- Valuation lookup: < 20ms
- Full-text search: < 150ms

## 🧪 Testing

### Verify Installation

```bash
# Run verification queries
psql $DATABASE_URL << 'EOF'
-- Check table count
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Check PostGIS
SELECT PostGIS_version();

-- Check sample data
SELECT COUNT(*) FROM properties;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM property_valuations;

-- Test geospatial query
SELECT id, title, ST_AsText(location) FROM properties LIMIT 3;
EOF
```

### Run Test Queries

```bash
# Test all major features
psql $DATABASE_URL -f database/test_queries.sql
```

## 📚 Documentation

- **DEPLOYMENT_GUIDE.md** - Comprehensive deployment instructions
- **schema-clean.sql** - Inline comments explain each table
- **seed-data.sql** - Sample data with realistic examples

## 🔄 Migrations

For future schema changes:

```bash
# Create migration
cat > database/migrations/001_add_feature.sql << 'EOF'
ALTER TABLE properties ADD COLUMN new_field TEXT;
CREATE INDEX idx_properties_new_field ON properties(new_field);
EOF

# Apply migration
psql $DATABASE_URL -f database/migrations/001_add_feature.sql
```

## 🐛 Troubleshooting

### PostGIS Not Available

```sql
-- Check if PostGIS is installed
SELECT * FROM pg_available_extensions WHERE name = 'postgis';

-- Install PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Connection Errors

Ensure your connection string includes SSL:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

### Permission Issues

```sql
GRANT ALL PRIVILEGES ON DATABASE your_db TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

## 📞 Support

For issues:
1. Check DEPLOYMENT_GUIDE.md for detailed instructions
2. Review PostgreSQL logs
3. Verify PostGIS installation
4. Check connection string format

## 📝 Version History

- **v1.0.0** (2025-01-21) - Initial release
  - 40+ tables
  - PostGIS integration
  - GNN support
  - Comprehensive seed data

## 📄 License

This database schema is part of the Real Estate Platform project.

---

**Ready to deploy?** Run `./database/deploy.sh` to get started! 🚀
