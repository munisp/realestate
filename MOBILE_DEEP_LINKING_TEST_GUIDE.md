# Mobile Deep Linking Testing Guide

## Overview

Deep linking is fully configured for both iOS and Android. This guide helps you test the implementation to ensure seamless navigation from web to mobile app.

---

## Configuration Summary

### iOS Universal Links ✅
- **Domain**: `realestate.manus.space`
- **Associated Domains**: Configured in `mobile/app.json`
- **Supported Paths**: All property, search, and agent routes

### Android App Links ✅
- **Domain**: `realestate.manus.space`
- **Intent Filters**: Configured with autoVerify
- **Supported Paths**: `/property`, `/search`, `/agent`, etc.

### Custom Scheme ✅
- **Scheme**: `realestate://`
- **Fallback**: Works when universal/app links fail

---

## Supported Deep Link Routes

| Route | Description | Example |
|-------|-------------|---------|
| `/property/:id` | Property details | `https://realestate.manus.space/property/123` |
| `/search` | Search with filters | `https://realestate.manus.space/search?query=villa&location=lagos` |
| `/agent/:id` | Agent profile | `https://realestate.manus.space/agent/456` |
| `/favorites` | Saved properties | `https://realestate.manus.space/favorites` |
| `/messages/:id` | Conversation | `https://realestate.manus.space/messages/789` |
| `/profile` | User profile | `https://realestate.manus.space/profile` |
| `/notifications` | Notifications | `https://realestate.manus.space/notifications` |
| `/map` | Map view | `https://realestate.manus.space/map?lat=6.5244&lng=3.3792` |
| `/shortlet/:id` | Shortlet details | `https://realestate.manus.space/shortlet/101` |
| `/builder/project/:id` | Builder project | `https://realestate.manus.space/builder/project/202` |

---

## Testing Prerequisites

### 1. Build Mobile App

**For iOS:**
```bash
cd mobile
expo build:ios
# Or use EAS Build:
eas build --platform ios
```

**For Android:**
```bash
cd mobile
expo build:android
# Or use EAS Build:
eas build --platform android
```

### 2. Install App on Device

- **iOS**: Install via TestFlight or direct installation
- **Android**: Install APK directly or via Play Store (internal testing)

### 3. Verify Domain Association

**iOS:**
- Upload `apple-app-site-association` file to `https://realestate.manus.space/.well-known/`

**Android:**
- Upload `assetlinks.json` file to `https://realestate.manus.space/.well-known/`

---

## Testing Methods

### Method 1: QR Code Testing

1. Generate QR code for a property:
```typescript
import { generatePropertyQRData } from '@/navigation/DeepLinkHandler';

const qrData = generatePropertyQRData(123);
// Returns: https://realestate.manus.space/property/123
```

2. Scan QR code with phone camera
3. Tap the notification/link
4. App should open directly to property details

### Method 2: SMS/Email Testing

1. Send a link via SMS or email:
```
Check out this property: https://realestate.manus.space/property/123
```

2. Tap the link on mobile device
3. App should open (or prompt to open)

### Method 3: WhatsApp/Social Media Testing

1. Share property via WhatsApp:
```typescript
import { shareProperty } from '@/navigation/DeepLinkHandler';

await shareProperty(123, "Beautiful 3-Bedroom Villa");
```

2. Tap the link in WhatsApp
3. App should open

### Method 4: Push Notification Testing

1. Send push notification with deep link:
```json
{
  "title": "New Property Match",
  "body": "A new property matches your search",
  "data": {
    "url": "https://realestate.manus.space/property/123"
  }
}
```

2. Tap notification
3. App should open to property details

### Method 5: Browser Testing

1. Open Safari (iOS) or Chrome (Android)
2. Navigate to: `https://realestate.manus.space/property/123`
3. Add banner: "Open in App"
4. Tap banner
5. App should open

---

## iOS Universal Links Testing

### Step 1: Verify Associated Domains

Check `mobile/app.json`:
```json
{
  "ios": {
    "associatedDomains": [
      "applinks:realestate.manus.space"
    ]
  }
}
```

### Step 2: Create AASA File

Create `.well-known/apple-app-site-association` on your domain:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.realestate.platform",
        "paths": [
          "/property/*",
          "/search",
          "/agent/*",
          "/favorites",
          "/messages/*",
          "/profile",
          "/notifications",
          "/map",
          "/shortlet/*",
          "/builder/project/*"
        ]
      }
    ]
  }
}
```

Replace `TEAM_ID` with your Apple Team ID.

### Step 3: Test Universal Links

1. **Test with Notes app**:
   - Open Notes app on iPhone
   - Type: `https://realestate.manus.space/property/123`
   - Long press the link
   - Should show "Open in [App Name]"

2. **Test with Safari**:
   - Open Safari
   - Navigate to property page
   - Tap "Open in App" banner (if available)
   - Or copy link and paste in Notes to test

3. **Test with Messages**:
   - Send link via iMessage
   - Tap link
   - Should open app directly

### Step 4: Verify AASA File

```bash
# Check if AASA file is accessible
curl https://realestate.manus.space/.well-known/apple-app-site-association

# Validate with Apple's tool
# https://search.developer.apple.com/appsearch-validation-tool/
```

---

## Android App Links Testing

### Step 1: Verify Intent Filters

Check `mobile/app.json`:
```json
{
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          {
            "scheme": "https",
            "host": "realestate.manus.space",
            "pathPrefix": "/property"
          }
        ],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

### Step 2: Create Digital Asset Links File

Create `.well-known/assetlinks.json` on your domain:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.realestate.platform",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

Get SHA256 fingerprint:
```bash
keytool -list -v -keystore your-keystore.jks -alias your-alias
```

### Step 3: Test App Links

1. **Test with Chrome**:
   - Open Chrome on Android
   - Navigate to: `https://realestate.manus.space/property/123`
   - Should prompt to open in app

2. **Test with Gmail**:
   - Send email with link
   - Tap link in Gmail app
   - Should open app directly

3. **Test with ADB**:
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://realestate.manus.space/property/123" \
  com.realestate.platform
```

### Step 4: Verify Digital Asset Links

```bash
# Check if assetlinks.json is accessible
curl https://realestate.manus.space/.well-known/assetlinks.json

# Test with Google's tool
# https://developers.google.com/digital-asset-links/tools/generator
```

---

## Custom Scheme Testing

### Test Custom Scheme (Fallback)

1. **Test with ADB (Android)**:
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "realestate://property/123"
```

2. **Test with Safari (iOS)**:
   - Open Safari
   - Type in address bar: `realestate://property/123`
   - Should prompt to open app

3. **Test with HTML**:
```html
<a href="realestate://property/123">Open Property</a>
```

---

## Testing Checklist

### iOS Testing
- [ ] AASA file uploaded and accessible
- [ ] Associated domains configured in app
- [ ] Universal links work from Safari
- [ ] Universal links work from Messages
- [ ] Universal links work from Notes
- [ ] Universal links work from Mail
- [ ] Custom scheme works as fallback
- [ ] Deep link routing works correctly
- [ ] App opens to correct screen

### Android Testing
- [ ] assetlinks.json uploaded and accessible
- [ ] Intent filters configured in app
- [ ] App links work from Chrome
- [ ] App links work from Gmail
- [ ] App links work from Messages
- [ ] Custom scheme works as fallback
- [ ] Deep link routing works correctly
- [ ] App opens to correct screen

### Cross-Platform Testing
- [ ] QR codes work on both platforms
- [ ] SMS links work on both platforms
- [ ] Email links work on both platforms
- [ ] WhatsApp links work on both platforms
- [ ] Push notifications work on both platforms
- [ ] All supported routes tested
- [ ] Error handling tested (invalid links)
- [ ] Fallback to home screen works

---

## Troubleshooting

### iOS Universal Links Not Working

**Common Issues:**
1. AASA file not accessible or invalid JSON
2. Team ID mismatch in AASA file
3. Associated domains not configured correctly
4. App not installed via TestFlight or App Store
5. iOS caching old AASA file

**Solutions:**
1. Verify AASA file: `curl https://realestate.manus.space/.well-known/apple-app-site-association`
2. Check Team ID in Apple Developer account
3. Rebuild app with correct configuration
4. Uninstall and reinstall app
5. Wait 24 hours or use different domain for testing

### Android App Links Not Working

**Common Issues:**
1. assetlinks.json not accessible or invalid JSON
2. SHA256 fingerprint mismatch
3. autoVerify not set to true
4. App not installed from Play Store (for verification)
5. Android caching old assetlinks.json

**Solutions:**
1. Verify assetlinks.json: `curl https://realestate.manus.space/.well-known/assetlinks.json`
2. Get correct SHA256: `keytool -list -v -keystore your-keystore.jks`
3. Set autoVerify to true in intent filters
4. Test with internal testing track on Play Store
5. Clear app data and reinstall

### Deep Link Routing Not Working

**Check:**
1. Route pattern matches in `DeepLinkHandler.tsx`
2. Navigation structure matches route names
3. Required parameters are being passed
4. Error handling is working (check logs)

**Debug:**
```typescript
// Add logging in DeepLinkHandler.tsx
console.log('Deep link received:', url);
console.log('Parsed route:', route);
console.log('Navigation params:', params);
```

---

## Production Deployment

### Before Going Live

1. **Upload AASA file** to production domain
2. **Upload assetlinks.json** to production domain
3. **Update app.json** with production domain
4. **Test on production domain** before release
5. **Submit apps** to App Store and Play Store
6. **Monitor** deep link analytics

### Monitoring Deep Links

Track deep link usage:
```typescript
import { monitoring } from '@/core/monitoring';

monitoring.trackEvent('deep-link-opened', {
  url: deepLinkUrl,
  screen: targetScreen,
  source: 'universal-link' // or 'custom-scheme'
});
```

---

## Additional Resources

- **iOS Universal Links**: https://developer.apple.com/ios/universal-links/
- **Android App Links**: https://developer.android.com/training/app-links
- **Expo Linking**: https://docs.expo.dev/guides/linking/
- **React Navigation Deep Linking**: https://reactnavigation.org/docs/deep-linking/

---

**Status**: ✅ Configuration Complete - Testing Required  
**Estimated Testing Time**: 30-60 minutes  
**Platforms**: iOS & Android
