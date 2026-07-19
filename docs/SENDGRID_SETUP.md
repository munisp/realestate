# SendGrid Email Integration Guide

**Platform**: Next-Generation Real Estate Platform  
**Service**: Email Notifications via SendGrid  
**Status**: Mock Service Active (Real SendGrid Optional)

---

## Overview

The platform includes a flexible email service that automatically switches between:
- **Mock Service** (Development): Logs emails to console without sending
- **SendGrid Service** (Production): Sends real emails via SendGrid API

**Current Mode**: Mock Service (no configuration required)

---

## Email Features

### Property Alerts
- Price drop notifications
- New listing alerts
- Similar property recommendations
- Saved search matches

### Booking & Transactions
- Viewing appointment confirmations
- Booking reminders (24 hours before)
- Transaction status updates
- Payment confirmations

### User Communications
- Welcome emails
- Password reset links
- Email verification
- Account notifications

### Admin Digests
- Weekly platform statistics
- New user signups
- Revenue reports
- System health alerts

---

## Mock Service (Current Setup)

The mock email service is automatically active when `SENDGRID_API_KEY` is not configured.

### How It Works

```typescript
// Emails are logged to console instead of being sent
console.log('📧 [Mock Email Service] Email would be sent:');
console.log('  To: user@example.com');
console.log('  Subject: Price Drop Alert: Luxury Apartment in Lagos');
console.log('  Status: ✅ Logged (not actually sent)');
```

### Benefits
- ✅ No external dependencies
- ✅ Zero cost
- ✅ Instant feedback in logs
- ✅ Perfect for development/testing
- ✅ No rate limits

### Testing Mock Emails

```bash
# Start the application
pnpm dev

# Trigger an email (e.g., create a property alert)
# Check console output for email logs

# Example output:
# 📧 [Mock Email Service] Email would be sent:
#   To: user@example.com
#   From: noreply@realestate-platform.com
#   Subject: New Listing Alert: Modern 3-Bedroom Condo in Lekki
#   HTML Length: 2,456 characters
#   Status: ✅ Logged (not actually sent)
```

---

## SendGrid Setup (Optional for Production)

### Step 1: Create SendGrid Account

1. Visit [SendGrid Signup](https://signup.sendgrid.com/)
2. Choose plan:
   - **Free**: 100 emails/day (perfect for testing)
   - **Essentials**: $19.95/month, 50,000 emails/month
   - **Pro**: $89.95/month, 1.5M emails/month

### Step 2: Get API Key

1. Log in to SendGrid dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Select **Full Access** (or **Restricted Access** with Mail Send permissions)
5. Name it (e.g., "RealEstate Platform Production")
6. Copy the API key (you won't see it again!)

### Step 3: Verify Sender Email

SendGrid requires sender verification to prevent spam:

#### Option A: Single Sender Verification (Quick)
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter your email (e.g., `noreply@yourdomain.com`)
4. Check your inbox and click verification link
5. ✅ Ready to send!

#### Option B: Domain Authentication (Professional)
1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add DNS records provided by SendGrid:
   ```
   CNAME em1234.yourdomain.com → u1234567.wl123.sendgrid.net
   CNAME s1._domainkey.yourdomain.com → s1.domainkey.u1234567.wl123.sendgrid.net
   CNAME s2._domainkey.yourdomain.com → s2.domainkey.u1234567.wl123.sendgrid.net
   ```
5. Wait for DNS propagation (5-30 minutes)
6. Verify in SendGrid dashboard
7. ✅ Professional email delivery!

### Step 4: Configure Environment Variables

Add to `.env` file:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com  # Must be verified in SendGrid
```

### Step 5: Restart Application

```bash
# The email service will automatically switch to SendGrid
pnpm dev

# You should see in logs:
# 📧 [Email Service] Using SendGrid (real emails)
```

---

## Usage Examples

### Send Property Alert

```typescript
import { sendPropertyAlertEmail } from './server/_core/emailService';

await sendPropertyAlertEmail(
  'user@example.com',
  'Luxury 3-Bedroom Apartment in Victoria Island',
  'https://platform.com/properties/12345',
  'price_drop'
);
```

### Send Booking Confirmation

```typescript
import { sendBookingConfirmationEmail } from './server/_core/emailService';

await sendBookingConfirmationEmail(
  'user@example.com',
  'Modern Condo in Lekki',
  new Date('2025-01-20'),
  '2:00 PM'
);
```

### Send Admin Digest

```typescript
import { sendAdminDigestEmail } from './server/_core/emailService';

await sendAdminDigestEmail(
  'admin@yourdomain.com',
  {
    newProperties: 47,
    newUsers: 123,
    newTransactions: 8,
    totalRevenue: 2450000,
  }
);
```

### Custom Email

```typescript
import { emailService } from './server/_core/emailService';

await emailService.send({
  to: 'user@example.com',
  subject: 'Custom Email Subject',
  html: '<h1>Hello!</h1><p>This is a custom email.</p>',
  text: 'Hello! This is a custom email.',
  from: 'custom@yourdomain.com',  // Optional, defaults to FROM_EMAIL
  replyTo: 'support@yourdomain.com',  // Optional
});
```

---

## Email Templates

All email templates use responsive HTML with:
- Mobile-friendly design
- Professional branding
- Clear call-to-action buttons
- Unsubscribe links (for compliance)

### Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="max-width: 600px; margin: 0 auto;">
  <!-- Header with gradient -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px;">
    <h1 style="color: white;">Email Title</h1>
  </div>
  
  <!-- Content -->
  <div style="padding: 30px; background: #f9fafb;">
    <p>Email content...</p>
    <a href="#" style="background: #667eea; color: white; padding: 12px 30px;">Call to Action</a>
  </div>
  
  <!-- Footer -->
  <div style="text-align: center; color: #9ca3af; font-size: 12px;">
    <p>© 2025 Real Estate Platform</p>
  </div>
</body>
</html>
```

---

## Best Practices

### Deliverability

1. **Use Domain Authentication**: Improves inbox placement by 40%
2. **Verify Sender Email**: Required by SendGrid
3. **Include Unsubscribe Link**: Required by law (CAN-SPAM, GDPR)
4. **Avoid Spam Words**: "Free", "Click here", "Act now"
5. **Test Before Sending**: Use [Mail Tester](https://www.mail-tester.com/)

### Rate Limits

**Free Tier**:
- 100 emails/day
- No burst limit
- Suitable for: Small projects, testing

**Essentials ($19.95/month)**:
- 50,000 emails/month (~1,600/day)
- 600 emails/minute burst
- Suitable for: Growing platforms

**Pro ($89.95/month)**:
- 1.5M emails/month (~50,000/day)
- 3,000 emails/minute burst
- Suitable for: Production platforms

### Error Handling

The email service automatically handles errors:

```typescript
const result = await emailService.send({...});

if (result.success) {
  console.log('✅ Email sent:', result.messageId);
} else {
  console.error('❌ Email failed:', result.error);
  // Fallback: Log to database for retry
}
```

### Monitoring

SendGrid provides analytics:
- Delivery rate
- Open rate
- Click rate
- Bounce rate
- Spam reports

Access at: https://app.sendgrid.com/statistics

---

## Troubleshooting

### Issue: Emails Not Sending

**Check**:
1. Is `SENDGRID_API_KEY` set correctly?
2. Is sender email verified in SendGrid?
3. Check SendGrid dashboard for errors
4. Check application logs for error messages

**Solution**:
```bash
# Verify environment variable
echo $SENDGRID_API_KEY

# Check logs
pm2 logs | grep "Email Service"

# Test SendGrid API directly
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@yourdomain.com"},
    "subject": "Test Email",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

### Issue: Emails Going to Spam

**Solutions**:
1. Set up domain authentication (DKIM, SPF, DMARC)
2. Warm up your sending domain gradually
3. Avoid spam trigger words
4. Include plain text version
5. Add unsubscribe link
6. Monitor spam complaints in SendGrid

### Issue: Rate Limit Exceeded

**Solutions**:
1. Upgrade SendGrid plan
2. Implement email queuing:
   ```typescript
   // Queue emails instead of sending immediately
   await emailQueue.add({ to, subject, html });
   ```
3. Batch send non-urgent emails
4. Use SendGrid's batch API for bulk sends

---

## Switching Between Mock and Real

### Development → Production

```bash
# Before (Mock)
# No SENDGRID_API_KEY set
pnpm dev
# Output: 📧 [Email Service] Using Mock Service

# After (Real)
export SENDGRID_API_KEY=SG.xxx...
export FROM_EMAIL=noreply@yourdomain.com
pnpm dev
# Output: 📧 [Email Service] Using SendGrid (real emails)
```

### Production → Development

```bash
# Temporarily use mock in production for testing
export SENDGRID_API_KEY=mock
pnpm start
# Output: 📧 [Email Service] Using Mock Service
```

---

## Cost Estimation

### Free Tier
- **Cost**: $0/month
- **Limit**: 100 emails/day (3,000/month)
- **Use Case**: Development, small projects

### Essentials
- **Cost**: $19.95/month
- **Limit**: 50,000 emails/month
- **Per Email**: $0.0004
- **Use Case**: Growing platforms with <1,500 daily users

### Pro
- **Cost**: $89.95/month
- **Limit**: 1.5M emails/month
- **Per Email**: $0.00006
- **Use Case**: Large platforms with 10,000+ daily users

### Example Costs

**Scenario 1: 1,000 users, 5 emails/user/month**
- Total: 5,000 emails/month
- Plan: Free tier (sufficient)
- Cost: $0/month

**Scenario 2: 5,000 users, 8 emails/user/month**
- Total: 40,000 emails/month
- Plan: Essentials
- Cost: $19.95/month

**Scenario 3: 50,000 users, 10 emails/user/month**
- Total: 500,000 emails/month
- Plan: Pro
- Cost: $89.95/month

---

## Compliance

### CAN-SPAM Act (US)
- ✅ Include physical address in footer
- ✅ Provide unsubscribe link
- ✅ Honor unsubscribe requests within 10 days
- ✅ Use accurate "From" name and subject

### GDPR (EU)
- ✅ Obtain explicit consent before sending
- ✅ Allow users to access their data
- ✅ Provide data deletion option
- ✅ Include privacy policy link

### Implementation

```typescript
// Email footer with compliance links
const footer = `
  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>Real Estate Platform Inc.</p>
    <p>123 Business Street, Lagos, Nigeria</p>
    <p>
      <a href="/privacy">Privacy Policy</a> | 
      <a href="/unsubscribe?token=${unsubscribeToken}">Unsubscribe</a>
    </p>
  </div>
`;
```

---

## Support

### SendGrid Support
- **Documentation**: https://docs.sendgrid.com/
- **Support Portal**: https://support.sendgrid.com/
- **Status Page**: https://status.sendgrid.com/

### Platform Support
- **Email**: support@yourdomain.com
- **Documentation**: `/docs`
- **GitHub Issues**: https://github.com/your-org/realestate-platform/issues

---

**Document Version**: 1.0  
**Last Updated**: January 17, 2025  
**Maintained By**: Platform Development Team
