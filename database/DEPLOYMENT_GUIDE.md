# PostgreSQL Database Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Real Estate Platform PostgreSQL database from scratch. The database includes 40+ tables with comprehensive seed data for immediate testing and development.

---

## Prerequisites

- **PostgreSQL 15+** (PostgreSQL 14 also works but 15+ recommended)
- **PostGIS Extension** (for geospatial features)
- **Database Access**: Connection string with CREATE/DROP privileges
- **Recommended Providers**:
  - Neon (https://neon.tech) - Serverless PostgreSQL with PostGIS
  - Supabase (https://supabase.com) - PostgreSQL with PostGIS pre-installed
  - AWS RDS PostgreSQL
  - Azure Database for PostgreSQL
  - Google Cloud SQL for PostgreSQL

---

## Quick Start (5 Minutes)

### Option 1: Using psql Command Line

```bash
# 1. Set your connection string
export DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# 2. Create schema
psql $DATABASE_URL -f database/schema-clean.sql

# 3. Load seed data
psql $DATABASE_URL -f database/seed-data.sql

# 4. Verify installation
psql $DATABASE_URL -c "SELECT COUNT(*) FROM properties;"
```

### Option 2: Using GUI Tools (DBeaver, pgAdmin, TablePlus)

1. **Connect to your database** using your connection string
2. **Open SQL Editor**
3. **Execute `schema-clean.sql`** (creates all tables, indexes, views)
4. **Execute `seed-data.sql`** (loads sample data)
5. **Verify** by running: `SELECT * FROM properties LIMIT 5;`

---

## Detailed Deployment Steps

### Step 1: Obtain PostgreSQL Database

#### Option A: Neon (Recommended for Development)

1. Visit https://neon.tech
2. Sign up (free tier available)
3. Create new project:
   - **Name**: realestate-platform
   - **Region**: Choose closest to your users
   - **Postgres Version**: 15 or 16
4. Copy connection string from dashboard
5. Enable PostGIS:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT PostGIS_version(); -- Verify
   ```

#### Option B: Supabase

1. Visit https://supabase.com
2. Sign up with GitHub
3. Create new project:
   - **Name**: realestate-platform
   - **Database Password**: (create strong password)
   - **Region**: Choose closest region
4. Go to Settings → Database → Connection string
5. Copy URI and replace `[YOUR-PASSWORD]` with actual password
6. PostGIS is pre-installed (no setup needed)

#### Option C: Local PostgreSQL

```bash
# Install PostgreSQL and PostGIS (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql-15 postgresql-15-postgis-3

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb realestate_platform

# Enable PostGIS
sudo -u postgres psql realestate_platform -c "CREATE EXTENSION postgis;"

# Create user (optional)
sudo -u postgres psql -c "CREATE USER realestate WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE realestate_platform TO realestate;"
```

---

### Step 2: Deploy Schema

The `schema-clean.sql` file creates:
- ✅ 40+ tables with proper relationships
- ✅ 90+ enum types for data consistency
- ✅ PostGIS geography columns for spatial queries
- ✅ Indexes for performance optimization
- ✅ Triggers for automatic timestamp updates
- ✅ Views for common queries
- ✅ Comments for documentation

**Execute the schema:**

```bash
psql $DATABASE_URL -f database/schema-clean.sql
```

**Expected output:**
```
CREATE EXTENSION
CREATE TYPE
CREATE TYPE
...
CREATE TABLE
CREATE TABLE
...
CREATE INDEX
CREATE INDEX
...
CREATE TRIGGER
CREATE VIEW
```

**Verify schema creation:**

```sql
-- Check table count
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Expected: 40+ tables

-- Check PostGIS
SELECT PostGIS_version();
-- Expected: POSTGIS="3.x.x ..."

-- List all tables
\dt
```

---

### Step 3: Load Seed Data

The `seed-data.sql` file includes:
- ✅ 11 users (admin, agents, builders, buyers)
- ✅ 8 properties across Lagos, Abuja, Port Harcourt
- ✅ Property valuations (Zestimate-style)
- ✅ GNN graph data (nodes and edges)
- ✅ Saved searches and alerts
- ✅ Appointments and offers
- ✅ Builder projects and milestones
- ✅ Reviews and ratings
- ✅ Notifications and activity logs

**Execute seed data:**

```bash
psql $DATABASE_URL -f database/seed-data.sql
```

**Expected output:**
```
INSERT 0 11  -- users
INSERT 0 5   -- properties (Lagos)
INSERT 0 2   -- properties (Abuja)
INSERT 0 1   -- properties (Port Harcourt)
...
table_name          | record_count
--------------------+-------------
Users               |           11
Properties          |            8
Property Valuations |            3
GNN Nodes           |            3
GNN Edges           |            5
Saved Searches      |            3
Favorites           |            5
Appointments        |            3
Offers              |            2
Reviews             |            2
Builders            |            2
Builder Projects    |            3
Notifications       |            3
```

---

### Step 4: Verify Installation

Run these queries to confirm everything is working:

```sql
-- 1. Check properties with geospatial data
SELECT 
    id, title, city, 
    ST_AsText(location) as coordinates
FROM properties 
LIMIT 3;

-- 2. Check property valuations
SELECT 
    p.title,
    pv.estimated_value,
    pv.confidence_score,
    pv.model_type
FROM properties p
JOIN property_valuations pv ON p.id = pv.property_id;

-- 3. Check GNN graph structure
SELECT 
    p1.title as source_property,
    p2.title as target_property,
    e.distance_meters,
    e.similarity_score,
    e.edge_type
FROM gnn_property_edges e
JOIN properties p1 ON e.source_property_id = p1.id
JOIN properties p2 ON e.target_property_id = p2.id;

-- 4. Check active listings view
SELECT * FROM active_listings LIMIT 3;

-- 5. Check property stats by city
SELECT * FROM property_stats_by_city;
```

---

## Database Schema Overview

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User accounts | Roles: user, admin, agent, builder, inspector |
| `properties` | Property listings | PostGIS location, H3 index, blockchain support |
| `property_valuations` | ML valuations | Zestimate-style with confidence scores |
| `gnn_property_nodes` | Graph features | Node embeddings and centrality metrics |
| `gnn_property_edges` | Spatial relationships | Distance-based and similarity-based edges |
| `transactions` | Property transactions | Sale/rent/lease tracking |
| `payments` | Payment processing | Multi-gateway support (Stripe, Flutterwave, Paystack) |
| `escrow_accounts` | Escrow management | Milestone-based releases |
| `offers` | Purchase offers | Counter-offer support |
| `appointments` | Property viewings | In-person and virtual tours |
| `saved_searches` | User search alerts | Configurable frequency |
| `favorites` | Saved properties | User wishlists |
| `property_reviews` | Property ratings | Verified buyer reviews |
| `builders` | Builder profiles | Verification status |
| `builder_projects` | Construction projects | Milestone tracking |
| `shortlet_properties` | Short-term rentals | Airbnb-style bookings |
| `documents` | File storage | S3 references |
| `notifications` | User notifications | Multi-type alerts |

### Geospatial Features

The database includes advanced geospatial capabilities:

```sql
-- Find properties within 5km of a point
SELECT * FROM properties
WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(3.4286, 6.4474), 4326)::geography,
    5000  -- 5km in meters
);

-- Find nearest properties
SELECT 
    id, title,
    ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(3.4286, 6.4474), 4326)::geography
    ) / 1000 as distance_km
FROM properties
ORDER BY distance_km
LIMIT 10;

-- Properties within polygon (neighborhood boundary)
SELECT * FROM properties
WHERE ST_Within(
    location::geometry,
    ST_GeomFromText('POLYGON((...))', 4326)
);
```

---

## Environment Configuration

After deploying the database, update your application's environment variables:

```bash
# .env (DO NOT COMMIT)
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
```

For the Manus platform, provide the connection string via the secrets management interface.

---

## Migration Strategy

### For Existing Deployments

If you already have a database and want to migrate:

```bash
# 1. Backup existing data
pg_dump $OLD_DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Export critical data
psql $OLD_DATABASE_URL -c "COPY users TO STDOUT CSV HEADER" > users_export.csv
psql $OLD_DATABASE_URL -c "COPY properties TO STDOUT CSV HEADER" > properties_export.csv

# 3. Deploy new schema
psql $NEW_DATABASE_URL -f database/schema-clean.sql

# 4. Import your data (adjust column mappings as needed)
psql $NEW_DATABASE_URL -c "\COPY users FROM 'users_export.csv' CSV HEADER"
psql $NEW_DATABASE_URL -c "\COPY properties FROM 'properties_export.csv' CSV HEADER"
```

### Schema Updates

For future schema changes, use migrations:

```bash
# Create migration file
cat > database/migrations/001_add_feature.sql << 'EOF'
-- Add new column
ALTER TABLE properties ADD COLUMN new_feature TEXT;

-- Create index
CREATE INDEX idx_properties_new_feature ON properties(new_feature);
EOF

# Apply migration
psql $DATABASE_URL -f database/migrations/001_add_feature.sql
```

---

## Performance Optimization

### Recommended Indexes (Already Included)

The schema includes optimized indexes for:
- ✅ Geospatial queries (GIST indexes)
- ✅ Full-text search (GIN indexes)
- ✅ JSONB columns (GIN indexes)
- ✅ Foreign keys
- ✅ Frequently filtered columns

### Query Performance Tips

```sql
-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE
SELECT * FROM properties 
WHERE city = 'Lagos' AND price < 100000000;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Connection Pooling

For production deployments, use connection pooling:

```javascript
// Example with node-postgres
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Backup and Recovery

### Automated Backups

Most managed PostgreSQL services provide automatic backups:

- **Neon**: Automatic daily backups (7-day retention on free tier)
- **Supabase**: Daily backups (7-day retention on free tier)
- **AWS RDS**: Configurable automated backups

### Manual Backup

```bash
# Full database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Schema only
pg_dump --schema-only $DATABASE_URL > schema_backup.sql

# Data only
pg_dump --data-only $DATABASE_URL > data_backup.sql
```

### Restore from Backup

```bash
# Restore full backup
psql $DATABASE_URL < backup_20250121_120000.sql

# Restore compressed backup
gunzip -c backup_20250121_120000.sql.gz | psql $DATABASE_URL
```

---

## Monitoring and Maintenance

### Health Checks

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 minutes';
```

### Vacuum and Analyze

```sql
-- Analyze tables for query planner
ANALYZE;

-- Vacuum to reclaim space
VACUUM ANALYZE;

-- Full vacuum (requires exclusive lock)
VACUUM FULL;
```

---

## Troubleshooting

### Common Issues

#### 1. PostGIS Extension Not Found

```sql
-- Check available extensions
SELECT * FROM pg_available_extensions WHERE name LIKE '%postgis%';

-- Install PostGIS (if available)
CREATE EXTENSION IF NOT EXISTS postgis;
```

#### 2. SSL Connection Errors

Ensure your connection string includes `?sslmode=require`:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

#### 3. Permission Denied

```sql
-- Grant privileges to user
GRANT ALL PRIVILEGES ON DATABASE realestate_platform TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

#### 4. Out of Connections

Increase connection pool size or use connection pooling (PgBouncer).

---

## Security Best Practices

1. **Never commit connection strings** to version control
2. **Use SSL/TLS** for all database connections (`sslmode=require`)
3. **Rotate passwords** regularly
4. **Use read-only users** for analytics/reporting
5. **Enable row-level security** for multi-tenant scenarios
6. **Audit sensitive operations** using triggers
7. **Backup regularly** and test restore procedures

---

## Next Steps

After deploying the database:

1. ✅ Update application environment variables
2. ✅ Test database connectivity from application
3. ✅ Run application migrations (if using Drizzle ORM)
4. ✅ Verify all features work correctly
5. ✅ Set up monitoring and alerts
6. ✅ Configure automated backups
7. ✅ Document any custom configurations

---

## Support

For issues or questions:
- Check PostgreSQL logs
- Review query performance with EXPLAIN ANALYZE
- Consult provider documentation (Neon, Supabase, etc.)
- Review PostGIS documentation for geospatial queries

---

## File Structure

```
database/
├── schema-clean.sql          # Complete PostgreSQL schema
├── seed-data.sql             # Sample data for testing
├── DEPLOYMENT_GUIDE.md       # This file
└── migrations/               # Future schema changes
    └── 001_example.sql
```

---

**Last Updated**: January 21, 2025  
**Schema Version**: 1.0.0  
**PostgreSQL Version**: 15+  
**PostGIS Version**: 3.x
