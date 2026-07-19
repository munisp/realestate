# External PostgreSQL Database Setup Guide

## Quick Setup with Neon (Recommended - 5 minutes)

### Step 1: Create Neon Account
1. Go to https://neon.tech
2. Click "Sign Up" (free tier available)
3. Sign up with GitHub, Google, or email

### Step 2: Create Database
1. After login, click "Create Project"
2. Project settings:
   - **Project Name**: realestate-platform
   - **Region**: Choose closest to your users (US East recommended for Nigeria traffic)
   - **Postgres Version**: 15 or 16 (both work)
3. Click "Create Project"

### Step 3: Get Connection String
1. On the project dashboard, find "Connection Details"
2. Select "Connection string" tab
3. Copy the connection string - it looks like:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Step 4: Enable PostGIS Extension
1. In Neon dashboard, go to "SQL Editor"
2. Run this command:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Verify with:
   ```sql
   SELECT PostGIS_version();
   ```

### Step 5: Provide Connection String
**Copy your connection string and send it to me.** I will:
1. Securely add it to your environment variables
2. Run `pnpm db:push` to create all 142+ tables
3. Verify the migration
4. Test all functionality

---

## Alternative: Supabase (Also Free)

### Step 1: Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub

### Step 2: Create Project
1. Click "New Project"
2. Settings:
   - **Name**: realestate-platform
   - **Database Password**: (create a strong password)
   - **Region**: Choose closest region
3. Wait 2-3 minutes for provisioning

### Step 3: Get Connection String
1. Go to Project Settings → Database
2. Find "Connection string" section
3. Select "URI" mode
4. Copy the connection string (replace [YOUR-PASSWORD] with your actual password)

### Step 4: PostGIS is Pre-installed
Supabase includes PostGIS by default - no setup needed!

### Step 5: Provide Connection String
Send me the connection string and I'll complete the setup.

---

## Security Notes

- Connection strings contain credentials - treat them as secrets
- I will use Manus's secure environment variable system
- The string will not be committed to code
- SSL mode is required for secure connections

---

## What Happens Next

Once you provide the connection string:

1. ✅ I'll add it to your project's environment variables
2. ✅ Run `pnpm db:push` to create all tables
3. ✅ Verify PostGIS extension is working
4. ✅ Re-enable disabled routers
5. ✅ Test database connectivity
6. ✅ Seed sample data (optional)

**Estimated time**: 5 minutes after you provide the connection string

---

## Free Tier Limits

**Neon Free Tier:**
- 3 GB storage
- 1 compute unit
- Unlimited databases
- Perfect for development/MVP

**Supabase Free Tier:**
- 500 MB database space
- 1 GB file storage
- 50,000 monthly active users
- Perfect for development/MVP

Both are more than sufficient for initial development and testing.
