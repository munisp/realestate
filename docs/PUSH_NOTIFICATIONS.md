# Push Notifications Implementation Guide

## Overview

The platform now includes a complete browser push notification system that enables instant alerts for property updates, messages, offers, and other important events. Users can receive notifications even when the browser tab is not active.

## Features

### ✅ Implemented Features

1. **Web Push API Integration**
   - Service worker for background notifications
   - VAPID authentication for secure push delivery
   - Support for Chrome, Firefox, Edge, and Safari

2. **Notification Types**
   - Property alerts (new listings, price changes)
   - New messages
   - Offer updates
   - Showing reminders
   - Document ready notifications
   - System notifications

3. **User Interface Components**
   - Permission prompt card (appears after 5 seconds on home page)
   - Compact notification banner
   - Comprehensive notification settings page
   - Test notification button

4. **Notification Preferences**
   - Enable/disable push, email, and SMS channels
   - Category-specific preferences (property alerts, messages, documents, escrow, marketing)
   - Per-user preference storage in database

5. **Service Worker Features**
   - Background notification handling
   - Click-to-navigate functionality
   - Action buttons (View, Dismiss)
   - Notification grouping by property/message

## Architecture

### Backend Components

1. **`server/pushNotificationService.ts`**
   - Core push notification service
   - Functions: `subscribeToPush()`, `unsubscribeFromPush()`, `sendPushNotification()`, `sendBulkPushNotification()`
   - Uses `web-push` npm package for Web Push Protocol

2. **`server/routers/push.ts`**
   - tRPC router for push notification endpoints
   - Endpoints: `subscribe`, `unsubscribe`, `getSubscriptions`, `sendTest`, `logClick`

3. **`server/routers/notifications.ts`**
   - tRPC router for notification preferences
   - Endpoints: `getPreferences`, `updatePreferences`

4. **Database Tables**
   - `pushSubscriptions`: Stores user push subscription details (endpoint, keys, device info)
   - `pushNotificationLog`: Logs all sent notifications with status tracking
   - `userNotificationPreferences`: User notification channel and category preferences

### Frontend Components

1. **`client/public/sw.js`**
   - Service worker handling background push events
   - Notification click handlers
   - Action button handling

2. **`client/src/hooks/usePushNotifications.ts`**
   - React hook for push notification management
   - Functions: `subscribe()`, `unsubscribe()`, `requestPermission()`
   - State: `isSupported`, `isSubscribed`, `permission`, `isLoading`

3. **`client/src/components/PushNotificationPrompt.tsx`**
   - `PushNotificationPrompt`: Card-style prompt with benefits list
   - `PushNotificationBanner`: Compact top banner

4. **`client/src/pages/NotificationSettings.tsx`**
   - Full notification preferences management page
   - Channel toggles (push, email, SMS)
   - Category preferences
   - Test notification button

## Usage

### For Users

1. **Enable Push Notifications**
   - Click "Enable Notifications" button on the prompt (appears after 5 seconds on home page)
   - Or visit `/notifications` settings page
   - Grant browser permission when prompted

2. **Manage Preferences**
   - Go to `/notifications` page
   - Toggle notification channels (push, email, SMS)
   - Enable/disable specific categories (property alerts, messages, etc.)
   - Test notifications with "Send Test" button

3. **Receive Notifications**
   - Notifications appear as browser notifications
   - Click to navigate to relevant page
   - Action buttons for quick actions

### For Developers

#### Sending Push Notifications

```typescript
import { sendPushNotification } from './server/pushNotificationService';

// Send to single user
await sendPushNotification(userId, {
  title: 'New Property Match!',
  body: '3-bedroom house in Lagos matches your saved search',
  icon: '/property-icon.png',
  data: {
    url: '/property/123',
    propertyId: 123,
  },
  notificationType: 'property_alert',
});

// Send to multiple users
await sendBulkPushNotification([userId1, userId2, userId3], {
  title: 'Price Drop Alert',
  body: 'Property you saved just dropped by ₦5M',
  notificationType: 'price_change',
  data: {
    propertyId: 456,
  },
});
```

#### Integration Points

**Property Alerts**
```typescript
// When new property matches saved search
import { sendPushNotification } from './server/pushNotificationService';

const matchingUsers = await getUsersWithMatchingSavedSearches(property);
for (const user of matchingUsers) {
  await sendPushNotification(user.id, {
    title: 'New Property Match!',
    body: `${property.bedrooms} bed, ${property.bathrooms} bath in ${property.city}`,
    notificationType: 'property_alert',
    data: { propertyId: property.id },
  });
}
```

**New Messages**
```typescript
// When user receives a new message
await sendPushNotification(recipientId, {
  title: `New message from ${senderName}`,
  body: message.preview,
  notificationType: 'new_message',
  data: { messageId: message.id, url: '/messages' },
});
```

**Offer Updates**
```typescript
// When offer status changes
await sendPushNotification(buyerId, {
  title: 'Offer Update',
  body: `Your offer on ${property.address} has been ${status}`,
  notificationType: 'offer_update',
  data: { offerId: offer.id, propertyId: property.id },
});
```

## Configuration

### VAPID Keys

The system uses VAPID (Voluntary Application Server Identification) keys for secure push delivery. Default keys are included for development.

**For Production:**

1. Generate new VAPID keys:
```bash
npx web-push generate-vapid-keys
```

2. Add to environment variables:
```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

### Service Worker Registration

The service worker is automatically registered when users visit the site. It's located at `/sw.js` and handles all push events.

## Database Schema

### pushSubscriptions Table

```sql
CREATE TABLE pushSubscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,  -- Public key
  auth TEXT NOT NULL,     -- Auth secret
  userAgent TEXT,
  deviceType VARCHAR(50), -- desktop, mobile, tablet
  isActive INT DEFAULT 1,
  lastUsed TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### pushNotificationLog Table

```sql
CREATE TABLE pushNotificationLog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  subscriptionId INT,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  badge TEXT,
  data TEXT,  -- JSON
  notificationType ENUM('property_alert', 'new_message', 'offer_update', ...),
  status ENUM('sent', 'failed', 'clicked') DEFAULT 'sent',
  errorMessage TEXT,
  clickedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### userNotificationPreferences Table

```sql
CREATE TABLE userNotificationPreferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL UNIQUE,
  emailEnabled INT DEFAULT 1,
  smsEnabled INT DEFAULT 0,
  pushEnabled INT DEFAULT 1,
  escrowUpdates INT DEFAULT 1,
  documentSigning INT DEFAULT 1,
  propertyAlerts INT DEFAULT 1,
  messageNotifications INT DEFAULT 1,
  marketingEmails INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 50+ | ✅ Full | Best support |
| Firefox 44+ | ✅ Full | Full support |
| Edge 17+ | ✅ Full | Full support |
| Safari 16+ | ✅ Full | macOS Ventura+ and iOS 16.4+ |
| Opera 37+ | ✅ Full | Full support |
| IE | ❌ None | Not supported |

## Testing

### Manual Testing

1. **Enable Notifications**
   - Visit home page
   - Wait for prompt or go to `/notifications`
   - Click "Enable Notifications"
   - Grant browser permission

2. **Send Test Notification**
   - Go to `/notifications`
   - Click "Send Test" button
   - Check browser for notification

3. **Test Click Handling**
   - Click on notification
   - Verify navigation to correct page

### Automated Testing

```typescript
// Test notification sending
const result = await sendPushNotification(testUserId, {
  title: 'Test',
  body: 'Test notification',
  notificationType: 'system',
});

expect(result.sent).toBe(1);
expect(result.failed).toBe(0);
```

## Troubleshooting

### Notifications Not Appearing

1. **Check browser permissions**
   - Ensure notifications are allowed in browser settings
   - Check if permission was denied

2. **Verify subscription**
   - Check if user is subscribed: `trpc.push.getSubscriptions.useQuery()`
   - Resubscribe if needed

3. **Check service worker**
   - Open DevTools → Application → Service Workers
   - Verify service worker is active
   - Check for errors in console

### Service Worker Not Registering

1. **HTTPS Required**
   - Service workers require HTTPS (except localhost)
   - Verify site is served over HTTPS

2. **File Path**
   - Service worker must be at `/sw.js` in public directory
   - Check file exists at `client/public/sw.js`

### Notifications Not Clickable

1. **Check data payload**
   - Verify `data.url` or `data.propertyId` is set
   - Check service worker click handler

2. **Browser console**
   - Open DevTools during notification click
   - Check for navigation errors

## Best Practices

1. **Request Permission at Right Time**
   - Don't ask immediately on page load
   - Wait for user engagement (5 seconds delay implemented)
   - Explain benefits before asking

2. **Respect User Preferences**
   - Always check user preferences before sending
   - Honor opt-out requests immediately
   - Provide easy way to manage preferences

3. **Keep Notifications Relevant**
   - Only send important updates
   - Personalize based on user activity
   - Don't spam users

4. **Handle Failures Gracefully**
   - Log failed notifications
   - Mark invalid subscriptions as inactive
   - Retry with exponential backoff

5. **Monitor Performance**
   - Track delivery rates
   - Monitor click-through rates
   - Analyze user engagement

## Future Enhancements

- [ ] Rich notifications with images
- [ ] Notification scheduling
- [ ] Notification batching (group similar notifications)
- [ ] A/B testing for notification content
- [ ] Analytics dashboard for notification performance
- [ ] SMS integration for critical alerts
- [ ] Email fallback when push fails
- [ ] Notification history page
- [ ] Custom notification sounds
- [ ] Notification priority levels

## API Reference

### tRPC Endpoints

#### `push.subscribe`
Subscribe user to push notifications or get VAPID public key.

```typescript
// Get public key
const { publicKey } = await trpc.push.subscribe.mutate({
  action: 'getPublicKey',
});

// Subscribe
const { success } = await trpc.push.subscribe.mutate({
  action: 'subscribe',
  subscription: {
    endpoint: '...',
    keys: { p256dh: '...', auth: '...' },
  },
  userAgent: navigator.userAgent,
});
```

#### `push.unsubscribe`
Unsubscribe from push notifications.

```typescript
const { success } = await trpc.push.unsubscribe.mutate({
  endpoint: subscription.endpoint,
});
```

#### `push.sendTest`
Send test notification to current user.

```typescript
const result = await trpc.push.sendTest.mutate();
// Returns: { sent: 1, failed: 0 }
```

#### `notifications.getPreferences`
Get user's notification preferences.

```typescript
const prefs = await trpc.notifications.getPreferences.useQuery();
// Returns: { emailEnabled: true, pushEnabled: true, ... }
```

#### `notifications.updatePreferences`
Update notification preferences.

```typescript
await trpc.notifications.updatePreferences.mutate({
  pushEnabled: true,
  propertyAlerts: false,
});
```

## Resources

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Push API MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [web-push npm package](https://www.npmjs.com/package/web-push)
