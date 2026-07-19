# Google Maps API Setup Guide

Complete guide for setting up Google Maps API for Zestimate ML services.

---

## Overview

The Zestimate ML services require Google Maps API access for:
- **Aerial imagery** (Maps Static API)
- **Street view photos** (Street View Static API)
- **Points of Interest data** (Places API)
- **Address geocoding** (Geocoding API)

**Estimated Cost:** ~$31 per 1,000 property valuations

---

## Step 1: Create Google Cloud Project

### 1.1 Sign in to Google Cloud Console

Visit [https://console.cloud.google.com/](https://console.cloud.google.com/) and sign in with your Google account.

### 1.2 Create a New Project

1. Click the project dropdown at the top of the page
2. Click **"New Project"**
3. Enter project name: `realestate-platform-maps`
4. Select billing account (or create one)
5. Click **"Create"**

### 1.3 Enable Billing

1. Navigate to **Billing** in the left sidebar
2. Link a billing account to your project
3. **Note:** Google provides $200/month free credit for Maps APIs

---

## Step 2: Enable Required APIs

### 2.1 Navigate to APIs & Services

1. Click **"APIs & Services"** in the left sidebar
2. Click **"Library"**

### 2.2 Enable Each API

Search for and enable the following APIs:

#### ✅ Maps Static API
- **Purpose:** Aerial imagery of properties
- **Cost:** $0.007 per request (after free tier)
- **Free tier:** 28,500 requests/month ($200 credit)

#### ✅ Street View Static API
- **Purpose:** Street-level property photos
- **Cost:** $0.007 per request (after free tier)
- **Free tier:** 28,500 requests/month ($200 credit)

#### ✅ Places API
- **Purpose:** Points of Interest (schools, restaurants, etc.)
- **Cost:** $0.0035 per request (after free tier)
- **Free tier:** 57,000 requests/month ($200 credit)

#### ✅ Geocoding API
- **Purpose:** Convert addresses to coordinates
- **Cost:** $0.005 per request (after free tier)
- **Free tier:** 40,000 requests/month ($200 credit)

---

## Step 3: Create API Key

### 3.1 Generate API Key

1. Go to **APIs & Services > Credentials**
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the API key immediately (you'll need it)
4. Click **"Restrict Key"** (highly recommended)

### 3.2 Restrict API Key (Security)

#### Application Restrictions

Choose one:

**Option A: HTTP Referrers (for web applications)**
```
https://yourdomain.com/*
https://*.yourdomain.com/*
```

**Option B: IP Addresses (for backend services - RECOMMENDED)**
```
123.456.789.0/24  # Your server IP range
```

#### API Restrictions

1. Select **"Restrict key"**
2. Choose the 4 APIs you enabled:
   - Maps Static API
   - Street View Static API
   - Places API
   - Geocoding API
3. Click **"Save"**

---

## Step 4: Configure Environment Variables

### 4.1 Add to .env File

```bash
# Google Maps API Key (REQUIRED)
GOOGLE_MAPS_API_KEY=AIzaSyC_your_actual_api_key_here

# Optional: Use OpenStreetMap instead (free, but lower quality)
USE_OSM=false

# ML Service URLs (adjust for your deployment)
GNN_SERVICE_URL=http://localhost:5003
CV_SERVICE_URL=http://localhost:5004
ALTDATA_SERVICE_URL=http://localhost:5005
ENSEMBLE_SERVICE_URL=http://localhost:5006
BIAS_SERVICE_URL=http://localhost:5007
```

### 4.2 Verify Configuration

Test your API key:

```bash
curl "https://maps.googleapis.com/maps/api/staticmap?center=6.5244,3.3792&zoom=18&size=400x400&maptype=satellite&key=YOUR_API_KEY"
```

You should receive an image response (not an error).

---

## Step 5: Set Usage Quotas (Cost Control)

### 5.1 Navigate to Quotas

1. Go to **APIs & Services > Quotas**
2. Select each API

### 5.2 Set Daily Limits

Recommended daily limits to control costs:

| API | Recommended Limit | Monthly Cost (if exceeded) |
|-----|-------------------|----------------------------|
| Maps Static API | 1,000/day | ~$210/month |
| Street View Static API | 1,000/day | ~$210/month |
| Places API | 5,000/day | ~$525/month |
| Geocoding API | 1,000/day | ~$150/month |

**Total:** ~$1,095/month (if all quotas exceeded daily)

### 5.3 Set Budget Alerts

1. Go to **Billing > Budgets & alerts**
2. Click **"Create Budget"**
3. Set monthly budget: `$100` (or your preferred amount)
4. Add alert thresholds: 50%, 75%, 90%, 100%
5. Add email notification recipients

---

## Step 6: Monitor Usage

### 6.1 View API Usage

1. Go to **APIs & Services > Dashboard**
2. View requests per API
3. Monitor quota usage

### 6.2 Cost Estimation

**Example: 1,000 property valuations**

| Service | Requests | Cost |
|---------|----------|------|
| Aerial imagery | 1,000 | $7.00 |
| Street view | 1,000 | $7.00 |
| POI data (5 per property) | 5,000 | $17.50 |
| Geocoding | 1,000 | $5.00 |
| **Total** | **8,000** | **$36.50** |

**With $200 free credit:** First ~5,500 valuations are free each month

---

## Step 7: Optimize Costs

### 7.1 Enable Caching

Cache API responses to reduce redundant requests:

```bash
# Enable Redis caching
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379

# Cache TTLs
AERIAL_IMAGE_CACHE_TTL=2592000  # 30 days
STREET_VIEW_CACHE_TTL=2592000   # 30 days
POI_DATA_CACHE_TTL=604800       # 7 days
```

**Savings:** 70-90% reduction in API costs

### 7.2 Use OpenStreetMap for Aerial Imagery

OpenStreetMap is free but lower quality:

```bash
USE_OSM=true  # Use OSM instead of Google Maps for aerial imagery
```

**Savings:** ~$7 per 1,000 valuations

### 7.3 Batch Requests

Use batch geocoding when possible:

```python
# Instead of 100 separate requests
for address in addresses:
    geocode(address)  # 100 requests

# Use batch geocoding
geocode_batch(addresses)  # 1 request
```

---

## Step 8: Security Best Practices

### 8.1 Never Commit API Keys

Add to `.gitignore`:

```
.env
.env.local
.env.production
```

### 8.2 Rotate Keys Regularly

1. Create new API key every 90 days
2. Update environment variables
3. Delete old key after verification

### 8.3 Monitor for Abuse

1. Set up billing alerts
2. Review API usage weekly
3. Check for unusual spikes

---

## Troubleshooting

### Error: "REQUEST_DENIED"

**Cause:** API key restrictions or API not enabled

**Solution:**
1. Verify API is enabled in Google Cloud Console
2. Check API key restrictions match your server IP/domain
3. Ensure billing is enabled

### Error: "OVER_QUERY_LIMIT"

**Cause:** Exceeded daily quota

**Solution:**
1. Increase quota in Google Cloud Console
2. Enable caching to reduce requests
3. Implement rate limiting

### Error: "INVALID_REQUEST"

**Cause:** Malformed API request

**Solution:**
1. Check request parameters
2. Verify coordinates are valid (lat/lng)
3. Check API documentation

---

## Cost Calculator

Use this formula to estimate monthly costs:

```
Monthly Valuations = X
Aerial Imagery Cost = X × $0.007
Street View Cost = X × $0.007
POI Data Cost = X × 5 × $0.0035
Geocoding Cost = X × $0.005

Total Monthly Cost = (X × $0.007) + (X × $0.007) + (X × 5 × $0.0035) + (X × $0.005)
                   = X × $0.0365

Example:
- 1,000 valuations/month = $36.50/month
- 5,000 valuations/month = $182.50/month (free with $200 credit)
- 10,000 valuations/month = $365/month
```

---

## Alternative: OpenStreetMap (Free)

If Google Maps costs are prohibitive, use OpenStreetMap:

### Pros
- ✅ Completely free
- ✅ No API key required
- ✅ No rate limits

### Cons
- ❌ Lower image quality
- ❌ Less frequent updates
- ❌ No street view
- ❌ Limited POI data

### Configuration

```bash
USE_OSM=true
GOOGLE_MAPS_API_KEY=  # Leave empty
```

---

## Support

- **Google Maps Platform Support:** https://developers.google.com/maps/support
- **Pricing Calculator:** https://mapsplatform.google.com/pricing/
- **Documentation:** https://developers.google.com/maps/documentation

---

**Last Updated:** 2025-11-20
