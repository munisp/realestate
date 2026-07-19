# Branding Customization Guide

## Overview

This guide helps you customize the Real Estate Platform with your company's branding, including logos, colors, fonts, and content.

## Quick Customization Checklist

- [ ] Update company logo and favicon
- [ ] Customize color scheme
- [ ] Update company information
- [ ] Add production property images
- [ ] Customize email templates
- [ ] Update terms of service and privacy policy
- [ ] Configure social media links
- [ ] Set up custom domain

---

## 1. Logo & Favicon

### Web Frontend

**Logo Location**: `client/public/logo.svg`
**Favicon**: `client/public/favicon.ico`

```bash
# Replace logo (SVG recommended for scalability)
cp your-logo.svg client/public/logo.svg

# Replace favicon (generate from https://realfavicongenerator.net/)
cp favicon.ico client/public/favicon.ico
cp favicon-16x16.png client/public/
cp favicon-32x32.png client/public/
cp apple-touch-icon.png client/public/
```

**Update Logo Reference**:
Edit `client/src/const.ts`:
```typescript
export const APP_LOGO = '/logo.svg';
export const APP_TITLE = 'Your Company Name';
```

### Mobile App

**iOS**:
```bash
# Add logo to mobile/ios/RealEstateApp/Images.xcassets/AppIcon.appiconset/
# Use different sizes: 1024x1024, 180x180, 120x120, 87x87, 80x80, 60x60, 58x58, 40x40, 29x29, 20x20
```

**Android**:
```bash
# Add logo to mobile/android/app/src/main/res/
# mipmap-xxxhdpi/ (192x192)
# mipmap-xxhdpi/ (144x144)
# mipmap-xhdpi/ (96x96)
# mipmap-hdpi/ (72x72)
# mipmap-mdpi/ (48x48)
```

---

## 2. Color Scheme

### Web Frontend

Edit `client/src/index.css`:

```css
:root {
  /* Primary Brand Color */
  --primary: 220 90% 56%;        /* Your brand blue */
  --primary-foreground: 0 0% 100%;
  
  /* Secondary Color */
  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;
  
  /* Accent Color */
  --accent: 210 40% 96%;
  --accent-foreground: 222 47% 11%;
  
  /* Background Colors */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  
  /* Card Colors */
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  
  /* Borders */
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 220 90% 56%;
}

/* Dark mode (optional) */
.dark {
  --primary: 220 90% 56%;
  --background: 222 47% 11%;
  --foreground: 213 31% 91%;
  /* ... customize dark mode colors */
}
```

### Color Palette Generator

Use tools like:
- https://coolors.co/ - Generate color palettes
- https://paletton.com/ - Color scheme designer
- https://material.io/design/color - Material Design color tool

---

## 3. Typography

### Web Frontend

Edit `client/index.html` to add Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Update `client/src/index.css`:

```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-heading: 'Inter', system-ui, sans-serif;
}

body {
  font-family: var(--font-sans);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}
```

---

## 4. Company Information

### Update Contact Details

Edit `client/src/const.ts`:

```typescript
export const COMPANY_INFO = {
  name: 'Your Company Name',
  email: 'contact@yourcompany.com',
  phone: '+1 (555) 123-4567',
  address: '123 Main St, City, State 12345',
  social: {
    facebook: 'https://facebook.com/yourcompany',
    twitter: 'https://twitter.com/yourcompany',
    linkedin: 'https://linkedin.com/company/yourcompany',
    instagram: 'https://instagram.com/yourcompany',
  },
};
```

### Update Footer

Edit `client/src/components/Footer.tsx` to use company information.

---

## 5. Property Images

### Add High-Quality Images

```bash
# Add property images to client/public/images/properties/
# Recommended sizes:
# - Thumbnails: 400x300px
# - Detail view: 1200x800px
# - Hero images: 1920x1080px

# Optimize images before uploading
# Use tools like:
# - TinyPNG (https://tinypng.com/)
# - ImageOptim (https://imageoptim.com/)
# - Squoosh (https://squoosh.app/)
```

### Image Naming Convention

```
property-{id}-{index}.jpg
property-1-1.jpg  (main image)
property-1-2.jpg  (additional image)
property-1-3.jpg  (additional image)
```

---

## 6. Email Templates

### Customize Email Branding

Edit `services/notification-service/templates/`:

**Header Template** (`header.html`):
```html
<div style="background-color: #YOUR_BRAND_COLOR; padding: 20px;">
  <img src="https://yourcompany.com/logo.png" alt="Your Company" height="50">
</div>
```

**Footer Template** (`footer.html`):
```html
<div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
  <p>© 2025 Your Company Name. All rights reserved.</p>
  <p>
    <a href="https://yourcompany.com">Website</a> |
    <a href="https://yourcompany.com/privacy">Privacy Policy</a> |
    <a href="https://yourcompany.com/terms">Terms of Service</a>
  </p>
</div>
```

---

## 7. Legal Pages

### Terms of Service

Create `client/public/terms.html` or use a route in your app.

### Privacy Policy

Create `client/public/privacy.html` or use a route in your app.

### Cookie Policy

Create `client/public/cookies.html` if using cookies.

**Resources**:
- https://www.termsfeed.com/ - Generate legal documents
- https://www.iubenda.com/ - Privacy policy generator

---

## 8. SEO & Meta Tags

### Update Meta Tags

Edit `client/index.html`:

```html
<head>
  <title>Your Company - Real Estate Platform</title>
  <meta name="description" content="Find your dream home with Your Company. Browse thousands of properties with AI-powered search and valuations.">
  <meta name="keywords" content="real estate, property, homes for sale, apartments">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://yourcompany.com/">
  <meta property="og:title" content="Your Company - Real Estate Platform">
  <meta property="og:description" content="Find your dream home with Your Company">
  <meta property="og:image" content="https://yourcompany.com/og-image.jpg">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://yourcompany.com/">
  <meta property="twitter:title" content="Your Company - Real Estate Platform">
  <meta property="twitter:description" content="Find your dream home with Your Company">
  <meta property="twitter:image" content="https://yourcompany.com/twitter-image.jpg">
</head>
```

---

## 9. Custom Domain

### DNS Configuration

Point your domain to the platform:

```
A     @              → YOUR_LOAD_BALANCER_IP
A     www            → YOUR_LOAD_BALANCER_IP
A     api            → YOUR_LOAD_BALANCER_IP
CNAME grafana        → YOUR_LOAD_BALANCER
CNAME prometheus     → YOUR_LOAD_BALANCER
```

### SSL Certificate

```bash
# Using cert-manager
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: yourcompany-tls
  namespace: realestate-production
spec:
  secretName: yourcompany-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - yourcompany.com
  - www.yourcompany.com
  - api.yourcompany.com
EOF
```

---

## 10. Analytics & Tracking

### Google Analytics

Add to `client/index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Facebook Pixel

```html
<!-- Facebook Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>
```

---

## 11. Mobile App Branding

### iOS

Edit `mobile/ios/RealEstateApp/Info.plist`:

```xml
<key>CFBundleDisplayName</key>
<string>Your Company</string>
<key>CFBundleName</key>
<string>YourCompany</string>
```

### Android

Edit `mobile/android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">Your Company</string>
</resources>
```

Edit `mobile/android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.yourcompany.realestate"
    }
}
```

---

## 12. Deployment

After customizing branding:

```bash
# Rebuild web frontend
cd client
npm run build

# Rebuild mobile apps
cd mobile
# iOS
cd ios && pod install && cd ..
npx react-native run-ios --configuration Release

# Android
npx react-native run-android --variant=release

# Deploy to production
cd deployment
./deploy-production.sh
```

---

## Checklist

Before going live:

- [ ] Logo updated on all platforms
- [ ] Favicon generated and added
- [ ] Color scheme customized
- [ ] Typography configured
- [ ] Company information updated
- [ ] Contact details correct
- [ ] Social media links added
- [ ] Property images uploaded and optimized
- [ ] Email templates branded
- [ ] Terms of Service added
- [ ] Privacy Policy added
- [ ] Cookie Policy added (if applicable)
- [ ] Meta tags updated for SEO
- [ ] Custom domain configured
- [ ] SSL certificate installed
- [ ] Analytics tracking added
- [ ] Mobile app names updated
- [ ] App store assets prepared
- [ ] All branding tested on desktop
- [ ] All branding tested on mobile
- [ ] All branding tested on tablet

---

## Resources

- **Logo Design**: Canva, Figma, Adobe Illustrator
- **Color Palettes**: Coolors, Adobe Color, Paletton
- **Fonts**: Google Fonts, Adobe Fonts
- **Images**: Unsplash, Pexels, Shutterstock
- **Icons**: Font Awesome, Heroicons, Lucide
- **Legal**: TermsFeed, Iubenda, PrivacyPolicies.com

---

## Support

For branding assistance:
- Design team: design@yourcompany.com
- Marketing team: marketing@yourcompany.com
- Technical support: support@yourcompany.com
