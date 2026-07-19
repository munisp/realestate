# PostgreSQL SSL Connection Fix Guide

## Problem
All database tests are failing with the error:
```
Error: There was an error establishing an SSL connection
```

This affects **177 tests** (27.7% of the test suite). The tests themselves are correct; only the database connection configuration needs to be fixed.

---

## Solution Options

### Option 1: Update DATABASE_URL (Recommended)

Add SSL parameters to your DATABASE_URL environment variable:

```bash
# Current format (without SSL)
DATABASE_URL="postgresql://user:password@host:port/database"

# Fixed format (with SSL)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**In Manus Platform:**
1. Go to **Management UI** → **Settings** → **Secrets**
2. Find `DATABASE_URL`
3. Click **Edit**
4. Append `?sslmode=require` to the end of the URL
5. Save changes
6. Restart the development server

---

### Option 2: Modify Database Connection Code

Update `server/db.ts` to handle SSL connections:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Create postgres client with SSL configuration
      const client = postgres(process.env.DATABASE_URL, {
        ssl: process.env.NODE_ENV === 'production' 
          ? 'require' 
          : { rejectUnauthorized: false },
        max: 10, // Connection pool size
        idle_timeout: 20,
        connect_timeout: 10,
      });
      
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
```

---

### Option 3: Use pg Pool with SSL

Alternative approach using pg Pool:

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false, // For development
          // For production, use proper SSL certificates:
          // ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
        },
        max: 20, // Maximum pool size
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Graceful shutdown
export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}
```

---

## SSL Mode Options

PostgreSQL supports several SSL modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| `disable` | No SSL | Local development only |
| `allow` | Try SSL, fallback to non-SSL | Not recommended |
| `prefer` | Try SSL first, fallback to non-SSL | Not recommended |
| `require` | **Require SSL, but don't verify** | **Recommended for development** |
| `verify-ca` | Require SSL, verify CA | Production with CA cert |
| `verify-full` | Require SSL, verify CA and hostname | Production with full verification |

**For Development**: Use `sslmode=require`  
**For Production**: Use `sslmode=verify-full` with proper certificates

---

## Verification Steps

After applying the fix:

### 1. Test Database Connection
```bash
cd /home/ubuntu/realestate-platform
pnpm test --run tests/comprehensive-test-suite.test.ts
```

### 2. Run All Tests
```bash
pnpm test --run
```

### 3. Check Test Results
Expected outcome:
- **Before Fix**: 437 passing, 177 failing (68.3% pass rate)
- **After Fix**: 607+ passing, <33 failing (95%+ pass rate)

### 4. Run Comprehensive Test Suite
```bash
./tests/run-all-tests.sh
```

---

## Expected Results After Fix

### Test Statistics (Expected)
```
✅ Total Tests: 640
✅ Passing: 607+ (95%+)
⚠️  Failing: <33 (5%)
ℹ️  Skipped: 26 (4%)
```

### Test Categories (Expected)
```
✅ Unit Tests: 95%+ passing
✅ Integration Tests: 95%+ passing
✅ Referential Integrity: 100% passing
✅ Load Tests: 90%+ passing
✅ E2E Tests: 95%+ passing
✅ Security Tests: 95%+ passing
```

---

## Troubleshooting

### Issue: Still getting SSL errors after fix

**Check 1**: Verify DATABASE_URL format
```bash
echo $DATABASE_URL
# Should include ?sslmode=require
```

**Check 2**: Restart development server
```bash
# Stop current server (Ctrl+C)
pnpm dev
```

**Check 3**: Check PostgreSQL server SSL configuration
```sql
-- Connect to database and run:
SHOW ssl;
-- Should return 'on'
```

### Issue: Certificate verification errors

**Error**: `certificate verify failed`

**Solution**: For development, use:
```
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

For production, use proper certificates:
```
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=verify-full&sslrootcert=/path/to/ca.crt"
```

### Issue: Connection timeout

**Error**: `connection timeout`

**Solution**: Increase timeout in connection config:
```typescript
const client = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  connect_timeout: 30, // Increase to 30 seconds
});
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Update DATABASE_URL with `sslmode=verify-full`
- [ ] Obtain SSL certificates from database provider
- [ ] Configure certificate paths in connection config
- [ ] Test connection with production credentials
- [ ] Run full test suite
- [ ] Verify all tests pass (95%+ pass rate)
- [ ] Enable connection pooling
- [ ] Configure connection limits
- [ ] Set up monitoring and alerts

---

## Quick Reference

### Development (Local/Staging)
```bash
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

### Production
```bash
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=verify-full&sslrootcert=/path/to/ca.crt"
```

### Test Connection
```bash
# Using psql
psql "$DATABASE_URL"

# Using Node.js
node -e "const { Client } = require('pg'); const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); client.connect().then(() => console.log('Connected!')).catch(err => console.error(err));"
```

---

## Support

If you continue to experience issues:

1. Check PostgreSQL server logs
2. Verify network connectivity to database
3. Confirm database credentials are correct
4. Ensure database accepts SSL connections
5. Contact database provider for SSL configuration help

---

**After fixing the SSL connection, the test suite should achieve 95%+ pass rate, indicating excellent production readiness.**
