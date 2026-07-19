# GNN Alert Notifications Implementation

## Overview

The GNN Alert Notifications system enables real-time email and SMS notifications when properties matching user-defined criteria are identified by the Graph Neural Network analysis engine.

## Architecture

### Components

1. **Email Service** (`server/services/gnnAlertEmailService.ts`)
   - Professional HTML email templates
   - Plain text fallback generation
   - Property card rendering with investment metrics
   - SendGrid integration via core email service

2. **Alert Evaluation Service** (`server/services/gnnAlertService.ts`)
   - Evaluates properties against alert criteria
   - Triggers notifications when matches are found
   - Implements rate limiting to prevent spam
   - Tracks delivery status

3. **Scheduled Job** (`server/services/gnnAlertsScheduler.ts`)
   - Runs every 5 minutes
   - Evaluates all active subscriptions
   - Coordinates notification delivery

## Email Template Features

### Visual Design
- **Gradient header** with alert name and emoji
- **AI-powered insights callout** explaining GNN technology
- **Property cards** with:
  - Property images (when available)
  - Address and location
  - Price and specifications
  - Investment metrics (score, undervalued %, trend strength)
  - Color-coded insight badges
  - Match reasoning
  - Direct property links

### Content Structure
```
┌─────────────────────────────────────┐
│   🎯 GNN Alert Triggered            │
│   [Alert Name]                      │
├─────────────────────────────────────┤
│ Hi [User Name],                     │
│                                     │
│ Great news! Your GNN alert found    │
│ [N] properties matching criteria.   │
│                                     │
│ 💡 AI-Powered Insights              │
│ [GNN explanation]                   │
│                                     │
│ Matching Properties:                │
│ ┌─────────────────────────────┐   │
│ │ [Property Image]            │   │
│ │ Address, City               │   │
│ │ ₦Price | Beds | Baths | SF  │   │
│ │ 🟢 Investment Score: 85/100 │   │
│ │ 🟡 Undervalued by 15%       │   │
│ │ 🔵 Market Trend: +12.5%     │   │
│ │ Why this matches: [reason]  │   │
│ │ [View Property Button]      │   │
│ └─────────────────────────────┘   │
│                                     │
│ [View All Alerts Button]            │
│                                     │
│ Manage Preferences | Manage Alerts  │
└─────────────────────────────────────┘
```

## Alert Matching Logic

### Evaluation Process

1. **Property Analysis**
   - Get investment score from GNN service
   - Analyze market trends
   - Evaluate neighborhood intelligence

2. **Match Detection**
   - **Undervalued Properties**: ≥10% below market value
   - **Investment Opportunities**: Score ≥70/100
   - **Market Trends**: Positive trend with ≥0.5 strength
   - **Growth Potential**: Neighborhood score ≥70/100

3. **Criteria Filtering**
   - Check against user-defined thresholds:
     - `minInvestmentScore`
     - `minUndervaluedPercent`
     - `minTrendStrength`
     - `minGrowthPotential`

4. **Rate Limiting**
   - Maximum 1 alert per hour per subscription
   - Prevents notification spam

## Notification Delivery

### Email Delivery Flow

```typescript
// 1. Evaluate property
const matches = await gnnAlertService.evaluatePropertyForAlerts(propertyId);

// 2. Check criteria
const shouldTrigger = shouldTriggerAlert(match, criteria, subscription);

// 3. Create trigger record
const trigger = await db.insert(gnnAlertTriggers).values({...});

// 4. Send notifications
const sent = await sendAlertNotifications(subscription, match, trigger.id);

// 5. Update status
await db.update(gnnAlertTriggers).set({
  notificationSent: 1,
  notificationSentAt: new Date(),
});
```

### Delivery Tracking

The system tracks:
- **Trigger Record**: Created for each alert match
- **Notification Status**: Success/failure of email delivery
- **Timestamp**: When notification was sent
- **Last Alert Sent**: Per subscription to enforce rate limits

## Configuration

### Environment Variables

```bash
# Required for email notifications
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com

# Application URL for email links
VITE_APP_URL=https://yourdomain.com
```

### SendGrid Setup

1. **Create SendGrid Account**
   - Sign up at https://sendgrid.com
   - Verify your sender email address

2. **Generate API Key**
   - Navigate to Settings → API Keys
   - Create new API key with "Mail Send" permissions
   - Copy the key (shown only once)

3. **Add to Environment**
   - Add `SENDGRID_API_KEY` to project secrets
   - Add `FROM_EMAIL` with verified sender address

4. **Test Delivery**
   ```bash
   node --import tsx test-gnn-email.mjs
   ```

## SMS Integration (Future)

The system includes SMS notification placeholders ready for integration:

```typescript
// Current: Mock implementation
export async function sendGNNAlertSMS(phoneNumber: string, data: {...}): Promise<{...}> {
  console.log('[GNN Alert SMS] Sending SMS to:', phoneNumber);
  return { success: true };
}

// Future: Twilio integration
import twilio from 'twilio';
const client = twilio(accountSid, authToken);
await client.messages.create({
  body: message,
  from: twilioPhoneNumber,
  to: phoneNumber,
});
```

### To Enable SMS:
1. Install Twilio SDK: `pnpm add twilio`
2. Add environment variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
3. Update `sendGNNAlertSMS` function
4. Add phone number field to users table

## Database Schema

### Alert Triggers Table
```sql
gnn_alert_triggers
├── id (serial)
├── subscriptionId (int) → gnn_alert_subscriptions.id
├── propertyId (int) → properties.id
├── triggerType (varchar) -- 'undervalued', 'investment_opportunity', etc.
├── triggerValue (jsonb) -- Match details
├── notificationSent (boolean)
├── notificationSentAt (timestamp)
├── userViewed (boolean)
├── viewedAt (timestamp)
└── createdAt (timestamp)
```

### Alert Subscriptions Table
```sql
gnn_alert_subscriptions
├── id (serial)
├── userId (int)
├── name (varchar)
├── criteria (jsonb) -- Alert criteria
├── isActive (boolean)
├── lastAlertSentAt (timestamp) -- For rate limiting
└── ...
```

## Testing

### Manual Email Test

```bash
# Create test script
cat > test-gnn-email.mjs << 'EOF'
import { sendGNNAlertEmail } from './server/services/gnnAlertEmailService.ts';

const testData = {
  userName: 'Test User',
  alertName: 'High ROI Properties',
  matchCount: 1,
  properties: [{
    propertyId: 1,
    address: '123 Test Street',
    city: 'Lagos',
    price: 50000000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1500,
    investmentScore: 85,
    undervaluedPercentage: 15,
    reason: 'Test property match',
  }],
  alertUrl: 'http://localhost:3000/gnn-alerts',
};

const result = await sendGNNAlertEmail('test@example.com', testData);
console.log('Result:', result);
EOF

# Run test
node --import tsx test-gnn-email.mjs
```

### Integration Testing

The scheduled job runs automatically every 5 minutes. Monitor logs:

```bash
# Watch for alert evaluations
tail -f logs/server.log | grep "GnnAlertService"

# Check notification delivery
tail -f logs/server.log | grep "GNN Alert"
```

## Performance Considerations

### Rate Limiting
- **Per Subscription**: Max 1 alert per hour
- **Global**: Scheduled job runs every 5 minutes
- **Batch Processing**: Evaluates all subscriptions in single run

### Optimization Opportunities
1. **Caching**: Cache GNN analysis results for frequently evaluated properties
2. **Batching**: Group multiple property matches into single email
3. **Priority Queue**: Prioritize high-value matches
4. **Async Processing**: Move notification delivery to background queue

## Monitoring

### Key Metrics
- **Evaluation Log**: `gnn_alert_evaluation_log` table
  - Properties evaluated
  - Alerts triggered
  - Notifications sent
  - Execution time
  - Error count

### Health Checks
```typescript
// Check recent evaluations
const recentEvals = await db.select()
  .from(gnnAlertEvaluationLog)
  .orderBy(desc(gnnAlertEvaluationLog.createdAt))
  .limit(10);

// Check delivery success rate
const successRate = notificationsSent / alertsTriggered;
```

## Troubleshooting

### Email Not Sending

**Symptom**: `SendGrid API key not configured`
**Solution**: Add `SENDGRID_API_KEY` to environment variables

**Symptom**: `@sendgrid/mail not installed`
**Solution**: Run `pnpm add @sendgrid/mail`

**Symptom**: Email sent but not received
**Solution**: 
- Check spam folder
- Verify sender email is verified in SendGrid
- Check SendGrid activity logs

### Alerts Not Triggering

**Symptom**: No alerts created
**Solution**:
- Verify subscriptions are active (`isActive = 1`)
- Check criteria thresholds aren't too restrictive
- Ensure properties exist in database
- Review evaluation logs for errors

**Symptom**: Alerts created but notifications not sent
**Solution**:
- Check user has valid email address
- Verify rate limiting isn't blocking (check `lastAlertSentAt`)
- Review notification service logs

## Future Enhancements

### Planned Features
1. **Batch Notifications**: Group multiple matches into digest emails
2. **User Preferences**: 
   - Notification frequency (instant, daily, weekly)
   - Channel preferences (email, SMS, in-app)
   - Quiet hours
3. **Rich Notifications**:
   - Push notifications via web push API
   - In-app notification center
   - Slack/Discord webhooks
4. **Analytics**:
   - Open rates
   - Click-through rates
   - Conversion tracking
5. **A/B Testing**: Test different email templates and subject lines

## API Reference

### Send GNN Alert Email

```typescript
import { sendGNNAlertEmail } from './server/services/gnnAlertEmailService';

await sendGNNAlertEmail(
  'user@example.com',
  {
    userName: string;
    alertName: string;
    matchCount: number;
    properties: Array<{
      propertyId: number;
      address: string;
      city: string;
      price: number;
      bedrooms: number;
      bathrooms: number;
      squareFeet: number;
      primaryImage?: string;
      investmentScore?: number;
      undervaluedPercentage?: number;
      trendStrength?: number;
      reason: string;
    }>;
    alertUrl: string;
  }
);
```

### Evaluate Property for Alerts

```typescript
import { gnnAlertService } from './server/services/gnnAlertService';

const matches = await gnnAlertService.evaluatePropertyForAlerts(propertyId);
// Returns: GnnAlertMatch[]
```

### Evaluate All Subscriptions

```typescript
import { gnnAlertService } from './server/services/gnnAlertService';

const result = await gnnAlertService.evaluateAllSubscriptions();
// Returns: { triggersCreated: number; notificationsSent: number }
```

## Support

For issues or questions:
- Review logs in `logs/server.log`
- Check database records in `gnn_alert_triggers` and `gnn_alert_evaluation_log`
- Test email service with `test-gnn-email.mjs`
- Verify environment variables are set correctly
