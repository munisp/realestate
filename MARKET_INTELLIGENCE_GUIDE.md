# Market Intelligence System - Complete Guide

This guide covers the three major enhancements to the competitor tracking system: Market Intelligence Dashboard, RapidAPI Integration, and Email Notifications.

## 📊 Overview

The Market Intelligence system provides shortlet property owners with:

1. **Real-time Competitor Analysis** - Track pricing from Airbnb and Booking.com
2. **AI-Powered Pricing Recommendations** - Get data-driven pricing suggestions
3. **Automated Email Alerts** - Receive notifications about market changes
4. **Interactive Dashboard** - Visualize market trends and competitor data

---

## 🎯 Feature 1: Market Intelligence Dashboard

### What It Does

The Market Intelligence dashboard provides a comprehensive view of your property's competitive position in the market.

### Key Features

- **Property Selection**: Choose which property to analyze
- **Market Metrics**: View average prices, demand scores, and occupancy rates
- **Price Distribution**: See how the market is segmented (budget, mid-range, premium)
- **Pricing Recommendations**: Get AI-powered pricing suggestions with confidence scores
- **Competitor Listings**: Browse similar properties with pricing and ratings
- **Interactive Charts**: Visualize price trends and market data

### How to Access

1. Navigate to `/market-intelligence` in your browser
2. Select a property from the dropdown
3. View the analysis across three tabs:
   - **Overview**: Market metrics and distribution
   - **Pricing**: Detailed pricing recommendations
   - **Competitors**: List of similar properties

### Dashboard Sections

#### Overview Tab

- **Market Metrics Cards**:
  - Average Price: Mean price of similar listings
  - Demand Score: Market demand indicator (0-100)
  - Occupancy Rate: Estimated occupancy percentage
  - Seasonality Factor: Current season multiplier

- **Price Distribution Chart**: Doughnut chart showing market segmentation
- **Competitor Sources**: Breakdown by platform (Airbnb, Booking.com)

#### Pricing Tab

- **Price Comparison**: Current vs recommended price
- **Change Indicator**: Percentage and amount change
- **Confidence Level**: AI confidence in recommendation (0-100%)
- **Market Position**: Below/at/above market
- **Reasoning**: Explanation of recommendation factors
- **Dynamic Pricing Factors**: Weekend, seasonal, and demand multipliers

#### Competitors Tab

- **Price Chart**: Bar chart of competitor prices
- **Competitor List**: Detailed cards with:
  - Property name and source
  - Bedrooms, bathrooms, guest capacity
  - Rating and review count
  - Nightly price
  - Direct link to listing

### Technical Details

**Frontend**: `/client/src/pages/MarketIntelligence.tsx`
**Route**: `/market-intelligence`
**Dependencies**: Chart.js for visualizations

**tRPC Endpoints Used**:
- `shortlet.getMyProperties` - Fetch user's properties
- `competitorTracking.getMarketAnalysis` - Get market statistics
- `competitorTracking.getPricingRecommendation` - Get pricing advice
- `competitorTracking.getCompetitorListings` - Fetch competitor data

---

## 🔌 Feature 2: RapidAPI Integration

### What It Does

Connects to real Airbnb data via RapidAPI to fetch actual competitor pricing instead of using mock data.

### Setup Instructions

#### Step 1: Get RapidAPI Key

1. Visit [RapidAPI.com](https://rapidapi.com/)
2. Sign up for a free account
3. Search for "Airbnb" in the marketplace
4. Subscribe to an Airbnb API (recommended: "Airbnb Search")
5. Copy your API key from the endpoint examples

#### Step 2: Add API Key to Project

**Option A: Through Management UI (Recommended)**

1. Open your project in Manus
2. Click **Settings** → **Secrets**
3. Add new secret:
   - Key: `RAPIDAPI_KEY`
   - Value: Your API key
4. Save and restart

**Option B: Environment Variable (Local Development)**

Add to `.env.local`:
```
RAPIDAPI_KEY=your_api_key_here
```

#### Step 3: Verify Integration

The system automatically detects the API key:
- **With Key**: Uses real Airbnb data
- **Without Key**: Uses mock data for testing

Check the server logs:
```
[AirbnbIntegration] Real API mode enabled
```

### How It Works

**Automatic Fallback System**:
1. Checks for `RAPIDAPI_KEY` environment variable
2. If present: Makes real API calls to Airbnb
3. If absent: Uses mock data generator
4. On error: Falls back to cached or mock data

**Caching Strategy**:
- Response cache duration: 6 hours
- Expired cache used on API failures
- Cache key based on search parameters

**Rate Limiting**:
- Respects RapidAPI plan limits
- Implements exponential backoff on errors
- Returns cached data when rate limited

### API Endpoints

**Search Listings**:
```
POST https://airbnb13.p.rapidapi.com/search-location
```

**Parameters**:
- `location`: City name
- `checkin`: Check-in date (YYYY-MM-DD)
- `checkout`: Check-out date (YYYY-MM-DD)
- `adults`: Number of guests
- `currency`: NGN (Nigerian Naira)

### Cost Estimation

**Free Tier**: 100-500 requests/month
- Good for: 1-3 properties with daily updates
- Cost: $0/month

**Basic Tier**: 1,000-5,000 requests/month
- Good for: 4-10 properties with daily updates
- Cost: ~$10-20/month

**Pro Tier**: 10,000+ requests/month
- Good for: 20+ properties or property managers
- Cost: ~$50+/month

### Optimization Tips

1. **Reduce Refresh Frequency**: Change from daily to every 2-3 days
2. **Leverage Caching**: Increase cache duration to 12-24 hours
3. **Selective Refresh**: Only refresh active/available properties
4. **Batch Requests**: Group properties in same city

### Troubleshooting

**"API Key Invalid"**:
- Verify key in RapidAPI dashboard
- Check for extra spaces when copying
- Ensure you're subscribed to the API

**"Rate Limit Exceeded"**:
- Wait for quota reset (usually monthly)
- Upgrade to higher tier plan
- Reduce refresh frequency

**"No Results Found"**:
- Verify city name spelling
- Try broader search criteria
- Check if Airbnb has listings in that area

### Technical Details

**Service**: `/server/services/airbnbIntegrationService.ts`
**Cache**: In-memory Map with timestamp tracking
**Fallback**: Mock data generator for development

---

## 📧 Feature 3: Email Notifications

### What It Does

Sends automated email alerts to property owners about market changes, pricing opportunities, and weekly performance summaries.

### Email Types

#### 1. Price Alert Email

**Triggered When**: Market conditions change significantly

**Contains**:
- Current vs recommended price comparison
- Change percentage and amount
- Market position (below/at/above market)
- Competitor count
- Detailed reasoning for recommendation
- Link to full analysis

**Subject**: `💰 Price Increase/Decrease Recommended for [Property Name]`

#### 2. Optimization Opportunity Email

**Triggered When**: Revenue optimization opportunities detected

**Contains**:
- Potential additional revenue estimate
- List of recommended actions
- Impact assessment for each action
- Link to optimization dashboard

**Subject**: `🚀 [X] Ways to Boost Revenue for [Property Name]`

#### 3. Weekly Summary Email

**Triggered When**: End of week (scheduled)

**Contains**:
- Total revenue, bookings, occupancy
- Per-property performance breakdown
- Market insights and trends
- Link to full dashboard

**Subject**: `📊 Your Weekly Property Performance Summary ([Date Range])`

### Setup Instructions

#### Step 1: Get Resend API Key

1. Visit [Resend.com](https://resend.com/)
2. Sign up for a free account (3,000 emails/month)
3. Verify your sending domain (or use resend's test domain)
4. Copy your API key from the dashboard

#### Step 2: Add API Key to Project

**Through Management UI**:

1. Settings → Secrets
2. Add new secret:
   - Key: `RESEND_API_KEY`
   - Value: Your Resend API key
3. Save and restart

**Optional**: Set custom from address
- Key: `EMAIL_FROM`
- Value: `noreply@yourdomain.com`

#### Step 3: Verify Email Service

The system automatically detects the API key:
- **With Key**: Sends real emails
- **Without Key**: Logs emails to console (mock mode)

Check the server logs:
```
[EmailService] Real email mode enabled
```

### How to Send Emails

**From Backend Code**:

```typescript
import { 
  sendShortletPriceAlertEmail,
  sendShortletOptimizationEmail,
  sendShortletWeeklySummaryEmail 
} from '../services/emailService';

// Send price alert
await sendShortletPriceAlertEmail('user@example.com', {
  propertyName: 'Luxury 2BR in Lekki',
  currentPrice: 35000,
  recommendedPrice: 40000,
  priceChange: 5000,
  changePercent: 14.3,
  competitorCount: 15,
  marketPosition: 'below market',
  reasoning: [
    'Competitor prices increased by 12% this week',
    'High demand detected in your area',
    'Similar properties are priced 15% higher'
  ],
  dashboardUrl: 'https://yoursite.com/market-intelligence'
});
```

**From tRPC Procedures**:

```typescript
// In your router
sendPriceAlert: protectedProcedure
  .input(z.object({ propertyId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    // Get property and analysis data
    const property = await getProperty(input.propertyId);
    const analysis = await getMarketAnalysis(property);
    
    // Send email
    await sendShortletPriceAlertEmail(ctx.user.email, {
      propertyName: property.title,
      // ... other data
    });
    
    return { success: true };
  })
```

### Email Templates

All email templates use:
- **Responsive HTML**: Works on desktop and mobile
- **Inline CSS**: Compatible with all email clients
- **Professional Design**: Gradient headers, clear CTAs
- **Brand Colors**: Purple/blue theme consistent with platform

**Template Locations**:
- Price Alert: `sendShortletPriceAlertEmail()`
- Optimization: `sendShortletOptimizationEmail()`
- Weekly Summary: `sendShortletWeeklySummaryEmail()`

### Delivery Tracking

The system tracks all email deliveries in the database:

**Tracked Data**:
- Recipient email
- Subject line
- Delivery status (delivered/failed/bounced)
- Timestamps (sent, delivered, bounced)
- Error messages (if failed)

**Query Delivery Logs**:
```typescript
import { emailDeliveryLog } from '../drizzle/schema';

const logs = await db
  .select()
  .from(emailDeliveryLog)
  .where(eq(emailDeliveryLog.userId, userId))
  .orderBy(desc(emailDeliveryLog.sentAt))
  .limit(50);
```

### Cost Estimation

**Resend Pricing**:
- **Free Tier**: 3,000 emails/month
  - Good for: Up to 100 users with weekly summaries
  - Cost: $0/month

- **Pro Tier**: 50,000 emails/month
  - Good for: Up to 1,500 users
  - Cost: $20/month

- **Business Tier**: 1,000,000 emails/month
  - Good for: Large-scale operations
  - Cost: $100/month

### Best Practices

1. **Frequency Management**: Don't spam users
   - Price alerts: Max 1 per day per property
   - Optimization: Max 1 per week per property
   - Weekly summary: Once per week

2. **Personalization**: Use user's name and property details

3. **Clear CTAs**: Always include link to dashboard

4. **Unsubscribe**: Provide easy opt-out option

5. **Testing**: Use mock mode for development

### Troubleshooting

**Emails Not Sending**:
- Check `RESEND_API_KEY` is set correctly
- Verify sending domain is verified in Resend
- Check server logs for error messages

**Emails Going to Spam**:
- Verify your sending domain with SPF/DKIM
- Use professional from address
- Avoid spam trigger words
- Include unsubscribe link

**Delivery Failures**:
- Check recipient email is valid
- Verify email size is under 10MB
- Check Resend dashboard for bounce reasons

### Technical Details

**Service**: `/server/services/emailService.ts`
**Functions**:
- `sendShortletPriceAlertEmail()`
- `sendShortletOptimizationEmail()`
- `sendShortletWeeklySummaryEmail()`

**Dependencies**: `resend` npm package

---

## 🚀 Complete Integration Example

### Automated Price Alert System

Here's how to set up an automated system that checks prices daily and sends alerts:

```typescript
// server/jobs/dailyPriceCheck.ts

import { getDb } from '../db';
import { shortletProperties } from '../../drizzle/schema';
import { competitorTrackingService } from '../services/competitorTrackingService';
import { sendShortletPriceAlertEmail } from '../services/emailService';

export async function runDailyPriceCheck() {
  const db = await getDb();
  if (!db) return;

  // Get all active properties
  const properties = await db
    .select()
    .from(shortletProperties)
    .where(eq(shortletProperties.status, 'active'));

  for (const property of properties) {
    // Get pricing recommendation
    const recommendation = await competitorTrackingService.getPricingRecommendation({
      city: property.city,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      guests: property.maxGuests,
      currentPrice: property.nightlyRate,
      propertyQuality: 'standard',
    });

    // Check if price change is significant (>10%)
    const changePercent = Math.abs(
      ((recommendation.recommendedPrice - property.nightlyRate) / property.nightlyRate) * 100
    );

    if (changePercent > 10) {
      // Send alert email
      await sendShortletPriceAlertEmail(property.ownerEmail, {
        propertyName: property.title,
        currentPrice: property.nightlyRate,
        recommendedPrice: recommendation.recommendedPrice,
        priceChange: recommendation.recommendedPrice - property.nightlyRate,
        changePercent,
        competitorCount: 15, // From market analysis
        marketPosition: recommendation.competitivePosition,
        reasoning: recommendation.reasoning,
        dashboardUrl: `${process.env.VITE_APP_URL}/market-intelligence`,
      });

      console.log(`Price alert sent for property: ${property.title}`);
    }
  }
}

// Schedule to run daily at 9 AM
// Use cron or your preferred scheduler
```

### Weekly Summary Generator

```typescript
// server/jobs/weeklySummary.ts

import { getDb } from '../db';
import { bookings, shortletProperties } from '../../drizzle/schema';
import { sendShortletWeeklySummaryEmail } from '../services/emailService';
import { subDays, format } from 'date-fns';

export async function sendWeeklySummaries() {
  const db = await getDb();
  if (!db) return;

  const weekStart = subDays(new Date(), 7);
  const weekEnd = new Date();

  // Group properties by owner
  const owners = await db
    .selectDistinct({ email: shortletProperties.ownerEmail, name: shortletProperties.ownerName })
    .from(shortletProperties);

  for (const owner of owners) {
    // Get owner's properties
    const properties = await db
      .select()
      .from(shortletProperties)
      .where(eq(shortletProperties.ownerEmail, owner.email));

    // Calculate metrics for each property
    const propertyStats = await Promise.all(
      properties.map(async (property) => {
        const weekBookings = await db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.propertyId, property.id),
              gte(bookings.checkIn, weekStart),
              lte(bookings.checkOut, weekEnd)
            )
          );

        const revenue = weekBookings.reduce((sum, b) => sum + b.totalPrice, 0);
        const occupancyRate = weekBookings.length / 7; // Simplified

        return {
          name: property.title,
          bookings: weekBookings.length,
          revenue,
          occupancyRate,
          averagePrice: revenue / (weekBookings.length || 1),
        };
      })
    );

    // Calculate totals
    const totalRevenue = propertyStats.reduce((sum, p) => sum + p.revenue, 0);
    const totalBookings = propertyStats.reduce((sum, p) => sum + p.bookings, 0);
    const averageOccupancy = propertyStats.reduce((sum, p) => sum + p.occupancyRate, 0) / propertyStats.length;

    // Send summary email
    await sendShortletWeeklySummaryEmail(owner.email, {
      ownerName: owner.name,
      weekStart: format(weekStart, 'MMM dd, yyyy'),
      weekEnd: format(weekEnd, 'MMM dd, yyyy'),
      properties: propertyStats,
      totalRevenue,
      totalBookings,
      averageOccupancy,
      marketInsights: [
        'Weekend bookings increased by 15% compared to last week',
        'Your average price is 8% above market average',
        'Consider adjusting prices for mid-week to improve occupancy',
      ],
      dashboardUrl: `${process.env.VITE_APP_URL}/owner-dashboard`,
    });

    console.log(`Weekly summary sent to: ${owner.email}`);
  }
}

// Schedule to run every Monday at 8 AM
```

---

## 📝 Summary

### What You've Built

1. **Market Intelligence Dashboard**: Interactive UI for analyzing competitor pricing
2. **RapidAPI Integration**: Real Airbnb data with automatic fallback
3. **Email Notifications**: Automated alerts for price changes and opportunities

### Required Setup

1. **RapidAPI Key**: For real competitor data (optional, works without)
2. **Resend API Key**: For email notifications (optional, logs to console without)

### Next Steps

1. Add API keys through Settings → Secrets
2. Test the Market Intelligence dashboard
3. Set up automated jobs for daily price checks
4. Configure weekly summary emails
5. Monitor email delivery logs
6. Adjust caching and refresh frequencies based on usage

### Support

- **RapidAPI Issues**: Check [RAPIDAPI_SETUP.md](./RAPIDAPI_SETUP.md)
- **Email Issues**: Verify Resend dashboard and domain settings
- **Dashboard Issues**: Check browser console for errors

---

**Last Updated**: 2024
**Version**: 1.0
