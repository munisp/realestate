# RapidAPI Integration Guide

This guide explains how to integrate real Airbnb data into the competitor tracking system using RapidAPI.

## Overview

The platform uses RapidAPI's Airbnb API to fetch real competitor pricing data for shortlet properties. This enables accurate market analysis and pricing recommendations based on live market conditions.

## Getting Your API Key

### Step 1: Sign Up for RapidAPI

1. Visit [RapidAPI](https://rapidapi.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

### Step 2: Subscribe to Airbnb API

1. Search for "Airbnb" in the RapidAPI marketplace
2. Choose one of these recommended APIs:
   - **Airbnb Search** (Recommended for pricing data)
   - **Airbnb Listings API**
   - **Airbnb Data Scraper**

3. Click "Subscribe to Test" or "Pricing"
4. Select a pricing plan:
   - **Free Tier**: 100-500 requests/month (good for testing)
   - **Basic Tier**: 1,000-5,000 requests/month (recommended for production)
   - **Pro Tier**: 10,000+ requests/month (for high-volume usage)

### Step 3: Get Your API Key

1. After subscribing, go to the API's "Endpoints" tab
2. Look for the "X-RapidAPI-Key" in the code examples
3. Copy your API key (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

## Adding the API Key to Your Project

### Option 1: Through Management UI (Recommended)

1. Open your project in the Manus platform
2. Click on the **Settings** panel in the Management UI
3. Navigate to the **Secrets** section
4. Click "Add Secret"
5. Enter:
   - **Key**: `RAPIDAPI_KEY`
   - **Value**: Your RapidAPI key (paste the key you copied)
6. Click "Save"

The system will automatically restart and begin using real Airbnb data.

### Option 2: Through Environment Variables (Local Development)

If you're running the project locally:

1. Create a `.env.local` file in the project root (if it doesn't exist)
2. Add this line:
   ```
   RAPIDAPI_KEY=your_rapidapi_key_here
   ```
3. Restart your development server

## How It Works

### Automatic Fallback System

The competitor tracking service has built-in intelligence:

1. **With API Key**: Fetches real Airbnb listings data
2. **Without API Key**: Uses mock data for testing/development

This means:
- ✅ The system works immediately without configuration
- ✅ You can test features with mock data
- ✅ Add the API key when ready for production
- ✅ No code changes required

### API Usage

The system makes API calls in these scenarios:

1. **Manual Refresh**: When you click "Refresh Data" in Market Intelligence
2. **Scheduled Updates**: Daily automated competitor price refresh (configurable)
3. **Property Analysis**: When viewing pricing recommendations

### Rate Limiting & Caching

To optimize API usage and stay within your plan limits:

1. **Response Caching**: API responses are cached for 6 hours
2. **Batch Requests**: Multiple properties in the same city are fetched together
3. **Smart Scheduling**: Automated refreshes are spread throughout the day
4. **Error Handling**: Failed requests don't count against your quota

## API Endpoints Used

The integration uses these RapidAPI endpoints:

### 1. Search Listings
```
GET /api/v1/searchPropertyByPlace
```
**Parameters**:
- `location`: City name (e.g., "Lagos, Nigeria")
- `checkin`: Check-in date (YYYY-MM-DD)
- `checkout`: Check-out date (YYYY-MM-DD)
- `adults`: Number of guests
- `bedrooms`: Number of bedrooms
- `bathrooms`: Number of bathrooms

**Response**: Array of property listings with pricing

### 2. Property Details (Optional)
```
GET /api/v1/getPropertyDetails
```
**Parameters**:
- `propertyId`: Airbnb property ID

**Response**: Detailed property information including amenities, reviews, and pricing calendar

## Cost Estimation

### Example Usage Scenarios

**Small Host (1-3 properties)**
- Daily refreshes: 3 properties × 1 request × 30 days = 90 requests/month
- Manual checks: ~10 requests/month
- **Total**: ~100 requests/month → **Free Tier**

**Medium Host (4-10 properties)**
- Daily refreshes: 10 properties × 1 request × 30 days = 300 requests/month
- Manual checks: ~50 requests/month
- **Total**: ~350 requests/month → **Free Tier or Basic Tier**

**Property Manager (20+ properties)**
- Daily refreshes: 20 properties × 1 request × 30 days = 600 requests/month
- Manual checks: ~100 requests/month
- **Total**: ~700 requests/month → **Basic Tier ($10-20/month)**

### Cost Optimization Tips

1. **Adjust Refresh Frequency**:
   - Daily: Standard (recommended)
   - Every 2 days: Reduces usage by 50%
   - Weekly: Reduces usage by 85%

2. **Use Selective Refresh**:
   - Only refresh active properties
   - Pause tracking for booked properties

3. **Leverage Caching**:
   - Cache duration: 6 hours (default)
   - Increase to 12-24 hours for slower markets

## Monitoring API Usage

### Check Your Usage

1. Log in to [RapidAPI Dashboard](https://rapidapi.com/developer/dashboard)
2. Go to "My Apps"
3. View usage statistics and remaining quota

### Platform Monitoring

The system tracks API usage internally:

1. **Dashboard**: View API call statistics in Market Intelligence
2. **Alerts**: Get notified when approaching quota limits
3. **Logs**: Check API response times and error rates

## Troubleshooting

### "API Key Invalid" Error

**Cause**: The API key is incorrect or expired

**Solution**:
1. Verify the key in RapidAPI dashboard
2. Check for extra spaces when copying
3. Ensure you're subscribed to the API
4. Update the key in Settings → Secrets

### "Rate Limit Exceeded" Error

**Cause**: You've exceeded your plan's request limit

**Solution**:
1. Wait for your quota to reset (usually monthly)
2. Upgrade to a higher tier plan
3. Reduce refresh frequency
4. Enable longer cache duration

### "No Results Found" Error

**Cause**: No Airbnb listings match your search criteria

**Solution**:
1. Verify the city name is correct
2. Try broader search criteria (fewer filters)
3. Check if Airbnb has listings in that area
4. Use mock data for testing

### API Requests Timing Out

**Cause**: RapidAPI or Airbnb service is slow/down

**Solution**:
1. Check [RapidAPI Status](https://status.rapidapi.com/)
2. Retry after a few minutes
3. System will automatically fall back to cached data

## Alternative APIs

If you prefer a different provider, these APIs are also compatible:

1. **Booking.com API** (via RapidAPI)
   - Similar pricing structure
   - Good for European markets
   - Requires separate integration

2. **Airbnb Official API**
   - Requires partnership agreement
   - Best for large-scale operations
   - Contact Airbnb for access

3. **Custom Web Scraping**
   - Build your own scraper
   - Requires maintenance
   - May violate terms of service

## Support

### Getting Help

1. **RapidAPI Support**: [support@rapidapi.com](mailto:support@rapidapi.com)
2. **API Documentation**: Check the API's "About" and "Endpoints" tabs
3. **Community Forum**: RapidAPI Community discussions

### Platform Support

For issues with the integration:
1. Check the system logs in the developer console
2. Review error messages in Market Intelligence dashboard
3. Contact platform support with API error details

## Best Practices

### Security

- ✅ Never commit API keys to version control
- ✅ Use environment variables for all secrets
- ✅ Rotate keys periodically (every 6-12 months)
- ✅ Use separate keys for development and production

### Performance

- ✅ Cache responses to reduce API calls
- ✅ Batch requests when possible
- ✅ Use background jobs for bulk updates
- ✅ Monitor response times and set timeouts

### Reliability

- ✅ Implement retry logic for failed requests
- ✅ Have fallback data sources
- ✅ Log all API errors for debugging
- ✅ Set up alerts for API failures

## Next Steps

After setting up your API key:

1. ✅ Visit the Market Intelligence dashboard
2. ✅ Select a property to analyze
3. ✅ Click "Refresh Data" to fetch real competitor data
4. ✅ Review pricing recommendations
5. ✅ Set up automated daily refreshes
6. ✅ Configure email notifications for price changes

---

**Last Updated**: 2024
**Version**: 1.0
