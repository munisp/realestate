# Sentry Monitoring Setup Guide

## Overview

Sentry is now integrated into the platform for real-time error tracking and performance monitoring. The integration is already coded and ready - you just need to configure your Sentry account.

---

## Quick Setup (5 minutes)

### Step 1: Create Sentry Account

1. Go to [https://sentry.io/signup/](https://sentry.io/signup/)
2. Sign up for a free account (supports 5K errors/month)
3. Create a new project:
   - Platform: **Node.js**
   - Project name: **realestate-platform**

### Step 2: Get Your DSN

After creating the project, Sentry will show you a **DSN** (Data Source Name). It looks like:
```
https://abc123def456@o123456.ingest.sentry.io/7891011
```

Copy this DSN - you'll need it in the next step.

### Step 3: Configure Environment Variables

Add these variables to your `.env` file:

```env
# Sentry Configuration
SENTRY_DSN=https://your-dsn-here@sentry.io/your-project-id
SENTRY_ENABLED=true
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
NODE_ENV=production
APP_VERSION=2.0.0
```

**Configuration explained:**
- `SENTRY_DSN` - Your unique Sentry project identifier
- `SENTRY_ENABLED` - Set to `true` to activate monitoring
- `SENTRY_TRACES_SAMPLE_RATE` - 0.1 = capture 10% of transactions (adjust based on traffic)
- `SENTRY_PROFILES_SAMPLE_RATE` - 0.1 = capture 10% of performance profiles
- `NODE_ENV` - Set to `production` for production deployments
- `APP_VERSION` - Current version for release tracking

### Step 4: Restart Application

```bash
cd /home/ubuntu/realestate-platform
pnpm dev
```

The monitoring system will automatically initialize on startup.

---

## What's Already Integrated

The platform already includes comprehensive Sentry integration:

### ✅ Error Tracking
- Automatic exception capture
- Error context and stack traces
- User identification
- Custom error filtering

### ✅ Performance Monitoring
- API request tracking
- Database query monitoring
- External API call tracking
- Slow request detection (> 1s)

### ✅ Custom Tracking
- Custom events and breadcrumbs
- User context tracking
- Transaction monitoring
- Memory usage tracking

---

## Monitoring Features

### 1. Request Tracking

Every API request is automatically tracked with:
- HTTP method and path
- Response status code
- Request duration
- Query parameters
- Headers (sanitized)

### 2. Error Tracking

All errors are captured with:
- Full stack trace
- User context (if authenticated)
- Request context
- Custom tags
- Environment information

### 3. Performance Monitoring

Automatic tracking of:
- **Slow API requests** (> 1 second)
- **Slow database queries** (> 500ms)
- **Slow external API calls** (> 2 seconds)
- **High memory usage** (> 1GB heap)

### 4. Database Query Monitoring

All database queries are tracked with:
- Query text
- Execution time
- Success/failure status
- Slow query alerts

### 5. External API Monitoring

External API calls are tracked with:
- Service name
- Endpoint
- Duration
- Success/failure status

---

## Testing the Integration

### Test 1: Trigger a Test Error

```bash
# Create a test endpoint that throws an error
curl -X POST http://localhost:3000/api/test-error
```

Check your Sentry dashboard - you should see the error appear within seconds.

### Test 2: Monitor API Performance

```bash
# Make some API requests
curl http://localhost:3000/api/properties
curl http://localhost:3000/api/analytics
```

Check Sentry's Performance tab to see transaction traces.

### Test 3: Check Slow Query Alerts

Run a slow database query and check Sentry for the warning.

---

## Sentry Dashboard

### Key Sections

1. **Issues** - All errors and exceptions
2. **Performance** - Transaction traces and slow operations
3. **Releases** - Track deployments and version changes
4. **Alerts** - Configure notifications for critical issues

### Recommended Alerts

Set up alerts for:
- Error rate > 10 errors/minute
- Response time > 2 seconds (95th percentile)
- Memory usage > 1.5GB
- Database query time > 1 second

---

## Advanced Configuration

### Custom Tags

Add custom tags in your code:

```typescript
import { monitoring } from './server/_core/monitoring';

monitoring.setTag('feature', 'property-search');
monitoring.setTag('user-tier', 'premium');
```

### Custom Events

Track custom events:

```typescript
monitoring.trackEvent('property-viewed', {
  propertyId: 123,
  userId: 456,
  source: 'search-results'
});
```

### User Context

Set user context (automatically done on auth):

```typescript
monitoring.setUser({
  id: user.id,
  email: user.email,
  username: user.name
});
```

### Performance Measurement

Measure custom operations:

```typescript
import { measurePerformance } from './server/_core/monitoring';

const result = await measurePerformance('ml-recommendation', async () => {
  return await getRecommendations(userId);
});
```

---

## Monitoring Best Practices

### 1. Sample Rates

**Development:**
```env
SENTRY_TRACES_SAMPLE_RATE=1.0  # 100% - capture everything
SENTRY_PROFILES_SAMPLE_RATE=1.0
```

**Production (Low Traffic):**
```env
SENTRY_TRACES_SAMPLE_RATE=0.5  # 50%
SENTRY_PROFILES_SAMPLE_RATE=0.5
```

**Production (High Traffic):**
```env
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10%
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### 2. Error Filtering

The integration already filters out:
- Network timeout errors (ECONNRESET, ETIMEDOUT)
- Common transient errors

Add more filters in `server/_core/monitoring.ts` if needed.

### 3. Performance Thresholds

Current thresholds (configurable in monitoring.ts):
- Slow API request: > 1000ms
- Slow database query: > 500ms
- Slow external API: > 2000ms
- High memory: > 1024MB

### 4. Release Tracking

Update `APP_VERSION` in `.env` for each deployment:
```env
APP_VERSION=2.0.1  # Increment on each release
```

This helps track which errors occur in which version.

---

## Cost Management

### Free Tier
- 5,000 errors/month
- 10,000 performance units/month
- 1 user
- 30-day data retention

### Paid Plans
- **Team**: $26/month - 50K errors, 100K performance units
- **Business**: $80/month - 100K errors, 500K performance units

### Optimization Tips

1. **Adjust sample rates** - Lower rates for high-traffic apps
2. **Filter noisy errors** - Exclude common transient errors
3. **Use error grouping** - Group similar errors together
4. **Set up quotas** - Limit errors per project

---

## Troubleshooting

### Sentry Not Capturing Errors

**Check:**
1. `SENTRY_ENABLED=true` in `.env`
2. `SENTRY_DSN` is correct
3. Application restarted after configuration
4. Check console for "[Monitoring] Sentry initialized successfully"

### Too Many Events

**Solutions:**
1. Lower sample rates (0.1 or 0.05)
2. Add more error filters
3. Increase error grouping
4. Set up rate limiting in Sentry dashboard

### Missing Performance Data

**Check:**
1. `SENTRY_TRACES_SAMPLE_RATE` > 0
2. Performance monitoring enabled in Sentry project settings
3. Transactions are being created (check logs)

---

## Integration Code Reference

All monitoring code is in:
```
server/_core/monitoring.ts
```

Key functions:
- `monitoring.initialize()` - Initialize Sentry
- `monitoring.trackError()` - Track custom errors
- `monitoring.trackEvent()` - Track custom events
- `monitoring.setUser()` - Set user context
- `monitoring.apiPerformanceMiddleware()` - Track API performance
- `withMonitoring()` - Wrap functions with error tracking
- `measurePerformance()` - Measure execution time

---

## Next Steps

1. ✅ Create Sentry account
2. ✅ Get DSN
3. ✅ Configure `.env`
4. ✅ Restart application
5. ✅ Verify in Sentry dashboard
6. ✅ Set up alerts
7. ✅ Monitor production

---

## Support

- **Sentry Docs**: https://docs.sentry.io/
- **Node.js Integration**: https://docs.sentry.io/platforms/node/
- **Performance Monitoring**: https://docs.sentry.io/product/performance/

---

**Status**: ✅ Integration Complete - Configuration Required  
**Estimated Setup Time**: 5 minutes  
**Difficulty**: Easy
