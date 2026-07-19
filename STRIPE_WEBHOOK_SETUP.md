# Stripe Webhook Configuration Guide

This guide explains how to configure Stripe webhooks for the real estate platform to enable automated payment processing, escrow management, and payout scheduling.

## Overview

The platform uses Stripe webhooks to handle:
- **Shortlet Bookings**: Instant booking confirmations and payment processing
- **Builder Project Payments**: Escrow funding and milestone-based releases
- **Automated Payouts**: Scheduled payouts to hosts and builders
- **Refunds**: Automated refund processing

## Prerequisites

1. **Stripe Account**: Create a Stripe account at https://dashboard.stripe.com
2. **API Keys**: Get your API keys from Dashboard → Developers → API keys
3. **Connected Accounts** (for payouts): Set up Stripe Connect for builders/hosts

## Step 1: Configure Environment Variables

Add these variables to your `.env` file or Management UI Settings → Secrets:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production

# Stripe Webhook Secret (get this in Step 2)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 2: Set Up Webhook Endpoint in Stripe Dashboard

### 2.1 Get Your Webhook URL

Your webhook endpoint URL is:
```
https://your-domain.com/api/webhooks/stripe
```

For development with ngrok:
```
https://your-ngrok-url.ngrok.io/api/webhooks/stripe
```

### 2.2 Register Webhook in Stripe Dashboard

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter your webhook URL
4. Select events to listen to (see Step 3)
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to your environment as `STRIPE_WEBHOOK_SECRET`

## Step 3: Select Webhook Events

Subscribe to these events in your Stripe webhook configuration:

### Payment Events
- ✅ `checkout.session.completed` - Booking/payment completed
- ✅ `payment_intent.succeeded` - Payment successful
- ✅ `payment_intent.payment_failed` - Payment failed
- ✅ `charge.refunded` - Refund processed

### Payout Events (for escrow releases)
- ✅ `transfer.created` - Funds transferred to builder/host
- ✅ `payout.paid` - Payout completed

## Step 4: Test Webhooks Locally

### Using Stripe CLI (Recommended)

1. Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Copy the webhook signing secret from the output:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

5. Add to `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

6. Trigger test events:
```bash
# Test booking payment
stripe trigger checkout.session.completed

# Test payment success
stripe trigger payment_intent.succeeded

# Test refund
stripe trigger charge.refunded
```

### Using ngrok (Alternative)

1. Install ngrok: https://ngrok.com/download

2. Start your local server:
```bash
pnpm dev
```

3. Expose local server:
```bash
ngrok http 3000
```

4. Use the ngrok URL in Stripe Dashboard:
```
https://abc123.ngrok.io/api/webhooks/stripe
```

## Step 5: Webhook Event Handlers

The platform automatically handles these events:

### `checkout.session.completed`
- Creates payment record
- Confirms shortlet booking
- Funds escrow for builder projects

### `payment_intent.succeeded`
- Updates payment status to "completed"
- Triggers confirmation emails

### `payment_intent.payment_failed`
- Updates payment status to "failed"
- Cancels booking
- Sends failure notification

### `charge.refunded`
- Updates payment status to "refunded"
- Releases escrow back to buyer
- Sends refund confirmation

### `transfer.created`
- Releases escrow funds to builder/host
- Updates escrow status to "released"
- Triggers payout notification

### `payout.paid`
- Logs successful payout
- Sends payout confirmation to builder/host

## Step 6: Escrow Workflow

### For Shortlet Bookings

1. **Guest books property** → Checkout session created
2. **Payment succeeds** → Funds held by platform
3. **Check-in completed** → Funds released to host (97% to host, 3% platform fee)
4. **Automated payout** → Host receives funds in 2-3 business days

### For Builder Projects

1. **Buyer pays milestone** → Checkout session created
2. **Payment succeeds** → Funds held in escrow
3. **Milestone completed** → Inspector verifies work
4. **Buyer approves** → Funds released to builder
5. **Automated payout** → Builder receives funds in 2-3 business days

## Step 7: Stripe Connect Setup (for Payouts)

### Enable Stripe Connect

1. Go to https://dashboard.stripe.com/connect/accounts/overview
2. Click **"Get started"**
3. Choose **"Standard"** account type (recommended)
4. Complete onboarding

### Onboard Builders/Hosts

Use the Stripe Connect onboarding flow:

```typescript
// In your backend API
const accountLink = await stripe.accountLinks.create({
  account: 'acct_...', // Builder's connected account ID
  refresh_url: 'https://your-domain.com/builder/dashboard',
  return_url: 'https://your-domain.com/builder/dashboard?onboarding=complete',
  type: 'account_onboarding',
});

// Redirect builder to accountLink.url
```

### Store Connected Account ID

Save the Stripe connected account ID in your database:

```sql
UPDATE builders
SET stripeConnectedAccountId = 'acct_...'
WHERE id = 123;
```

## Step 8: Production Checklist

Before going live:

- [ ] Switch to live API keys (`sk_live_...` and `pk_live_...`)
- [ ] Update webhook endpoint to production URL
- [ ] Re-generate webhook signing secret for production
- [ ] Test complete payment flow in live mode
- [ ] Set up webhook monitoring and alerts
- [ ] Configure payout schedule (daily, weekly, monthly)
- [ ] Review Stripe fees and pricing
- [ ] Complete Stripe account verification
- [ ] Enable 3D Secure for card payments
- [ ] Set up fraud detection rules

## Step 9: Monitoring and Debugging

### View Webhook Logs

1. Go to https://dashboard.stripe.com/webhooks
2. Click on your endpoint
3. View **"Events"** tab for delivery history

### Common Issues

**Webhook signature verification failed**
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Ensure raw body is used (not parsed JSON)
- Verify webhook endpoint is registered before `express.json()`

**Events not received**
- Check webhook URL is publicly accessible
- Verify firewall/security groups allow Stripe IPs
- Check server logs for errors

**Duplicate events**
- Implement idempotency using `event.id`
- Store processed event IDs in database

### Webhook Retry Logic

Stripe automatically retries failed webhooks:
- Immediate retry
- 1 hour later
- 3 hours later
- 6 hours later
- 12 hours later
- 24 hours later

Return `200 OK` quickly (within 5 seconds) to acknowledge receipt.

## Step 10: Security Best Practices

1. **Always verify webhook signatures**
   ```typescript
   const event = stripe.webhooks.constructEvent(
     req.body,
     sig,
     webhookSecret
   );
   ```

2. **Use HTTPS in production**
   - Stripe requires HTTPS for webhook endpoints

3. **Implement idempotency**
   - Check if event was already processed
   - Use `event.id` as unique identifier

4. **Rate limiting**
   - Protect webhook endpoint from abuse
   - Use API gateway rate limits

5. **Error handling**
   - Log all webhook errors
   - Set up alerts for repeated failures
   - Implement manual retry mechanism

## Testing Scenarios

### Test Shortlet Booking

1. Navigate to `/shortlet`
2. Select property and dates
3. Click "Book Now"
4. Complete Stripe checkout
5. Verify booking status changes to "confirmed"
6. Check payment record in database

### Test Builder Project Payment

1. Navigate to `/my-projects`
2. Select project milestone
3. Click "Pay Milestone"
4. Complete Stripe checkout
5. Verify escrow account created
6. Approve milestone completion
7. Check funds released to builder

### Test Refund

1. Go to Stripe Dashboard → Payments
2. Find payment
3. Click "Refund"
4. Verify booking status changes to "cancelled"
5. Check refund notification sent

## Support

For Stripe-specific issues:
- Documentation: https://stripe.com/docs/webhooks
- Support: https://support.stripe.com

For platform-specific issues:
- Check server logs: `pnpm logs`
- Review webhook handler: `server/webhooks/stripe.ts`
- Test locally with Stripe CLI

## Summary

✅ **Webhook endpoint**: `/api/webhooks/stripe`
✅ **Events subscribed**: 6 critical events
✅ **Escrow workflow**: Automated milestone-based releases
✅ **Payouts**: Automated via Stripe Connect
✅ **Security**: Signature verification enabled
✅ **Monitoring**: Stripe Dashboard + server logs

Your platform is now ready for production payment processing! 🎉
