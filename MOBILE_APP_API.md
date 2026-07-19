# Mobile App API Documentation

This document provides comprehensive API documentation for building a mobile app companion for the Next-Generation Real Estate Platform.

## Base URL

```
Production: https://your-domain.manus.space
Development: http://localhost:3001
```

## Authentication

The platform uses JWT-based authentication with HTTP-only cookies. For mobile apps, you'll need to handle authentication differently:

### 1. OAuth Flow for Mobile

```typescript
// Step 1: Get OAuth URL
GET /api/oauth/login?redirect_uri=myapp://callback

// Step 2: Open in browser/webview
// User completes authentication

// Step 3: Handle callback
myapp://callback?code=AUTH_CODE

// Step 4: Exchange code for session
POST /api/oauth/callback
Body: { code: "AUTH_CODE" }
Response: { user: User, token: string }
```

### 2. Token Storage

Store the JWT token securely using:
- iOS: Keychain
- Android: EncryptedSharedPreferences

### 3. API Requests

Include the token in all authenticated requests:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

## Core API Endpoints

### Properties

#### List Properties
```typescript
GET /api/trpc/properties.list?input={"city":"Lagos","limit":20}

Response: {
  result: {
    data: Property[]
  }
}
```

#### Get Property Details
```typescript
GET /api/trpc/properties.getById?input={"id":123}

Response: {
  result: {
    data: Property
  }
}
```

#### Search Properties
```typescript
GET /api/trpc/properties.list?input={
  "city":"Lagos",
  "minPrice":5000000,
  "maxPrice":50000000,
  "bedrooms":3,
  "propertyType":"house",
  "limit":20
}
```

#### Get Similar Properties
```typescript
GET /api/trpc/properties.similar?input={"propertyId":123,"limit":6}

Response: {
  result: {
    data: Property[]
  }
}
```

#### Get Recommendations
```typescript
GET /api/trpc/properties.recommendations?input={"limit":10}
// Requires authentication

Response: {
  result: {
    data: Property[]
  }
}
```

### Favorites

#### List Favorites
```typescript
GET /api/trpc/favorites.list
// Requires authentication

Response: {
  result: {
    data: Favorite[]
  }
}
```

#### Add to Favorites
```typescript
POST /api/trpc/favorites.add
Body: {
  propertyId: 123,
  notes: "Great location"
}

Response: {
  result: {
    data: { success: true }
  }
}
```

#### Remove from Favorites
```typescript
POST /api/trpc/favorites.remove
Body: {
  propertyId: 123
}
```

### Saved Searches

#### List Saved Searches
```typescript
GET /api/trpc/savedSearches.list
// Requires authentication
```

#### Create Saved Search
```typescript
POST /api/trpc/savedSearches.create
Body: {
  name: "3BR Houses in Lagos",
  filters: {
    city: "Lagos",
    bedrooms: 3,
    propertyType: "house"
  }
}
```

### Messages

#### List Conversations
```typescript
GET /api/trpc/messages.conversations
// Requires authentication

Response: {
  result: {
    data: Conversation[]
  }
}
```

#### Get Messages
```typescript
GET /api/trpc/messages.getConversation?input={"userId":456}
// Requires authentication
```

#### Send Message
```typescript
POST /api/trpc/messages.send
Body: {
  receiverId: 456,
  content: "Is this property still available?",
  propertyId: 123
}
```

### Agents

#### List Agents
```typescript
GET /api/trpc/agents.list

Response: {
  result: {
    data: Agent[]
  }
}
```

#### Get Agent Details
```typescript
GET /api/trpc/agents.getById?input={"id":789}
```

### Analytics

#### Track Property View
```typescript
POST /api/trpc/properties.trackView
Body: {
  propertyId: 123,
  sessionId: "unique-session-id",
  viewDuration: 45
}
```

## Data Models

### Property
```typescript
interface Property {
  id: number;
  title: string;
  description: string;
  price: number;
  propertyType: "house" | "apartment" | "land" | "commercial";
  status: "available" | "pending" | "sold";
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  primaryImage: string;
  images: string; // JSON array
  features: string; // JSON array
  virtualTour360: string; // JSON array of URLs
  virtualTourVideo: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Favorite
```typescript
interface Favorite {
  id: number;
  userId: number;
  propertyId: number;
  notes: string;
  createdAt: Date;
  property: Property;
}
```

### Message
```typescript
interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  propertyId?: number;
  content: string;
  read: boolean;
  createdAt: Date;
}
```

### Agent
```typescript
interface Agent {
  id: number;
  userId: number;
  licenseNumber: string;
  agency: string;
  specialization: string; // JSON array
  bio: string;
  phone: string;
  website: string;
  serviceAreas: string;
  rating: number;
  totalSales: number;
  activeListings: number;
}
```

## Image Optimization

For mobile apps, use optimized image URLs:

```typescript
// Original
property.primaryImage

// Optimized for mobile (add query params)
`${property.primaryImage}?w=400&q=80` // List view
`${property.primaryImage}?w=800&q=90` // Detail view
```

## Push Notifications

### Setup

1. Register device token:
```typescript
POST /api/notifications/register
Body: {
  deviceToken: "FCM_OR_APNS_TOKEN",
  platform: "ios" | "android"
}
```

2. Subscribe to topics:
```typescript
POST /api/notifications/subscribe
Body: {
  topics: ["new_listings", "price_alerts", "messages"]
}
```

### Notification Types

- `new_listing`: New property matching saved searches
- `price_change`: Price change on favorited property
- `message`: New message from agent/user
- `booking_update`: Booking status change

## Real-time Features

### WebSocket Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://your-domain.manus.space', {
  auth: {
    token: JWT_TOKEN
  }
});

// Listen for new messages
socket.on('message:new', (message) => {
  console.log('New message:', message);
});

// Listen for property updates
socket.on('property:updated', (property) => {
  console.log('Property updated:', property);
});
```

## Rate Limiting

- Unauthenticated: 100 requests/hour
- Authenticated: 1000 requests/hour
- Search endpoints: 60 requests/minute

## Error Handling

All errors follow this format:

```typescript
{
  error: {
    code: "UNAUTHORIZED" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR",
    message: "Human-readable error message"
  }
}
```

## Best Practices

1. **Caching**: Cache property listings and images locally
2. **Pagination**: Use `limit` and `offset` for large lists
3. **Image Loading**: Use progressive loading with placeholders
4. **Offline Mode**: Store favorites and recent searches locally
5. **Analytics**: Track user interactions for better recommendations

## Example Mobile App Flow

### 1. User Login
```typescript
// Open OAuth in webview
const authUrl = await getOAuthUrl();
openWebView(authUrl);

// Handle callback
onCallback((code) => {
  const { token, user } = await exchangeCode(code);
  await secureStorage.set('auth_token', token);
  await secureStorage.set('user', JSON.stringify(user));
});
```

### 2. Browse Properties
```typescript
const properties = await api.properties.list({
  city: selectedCity,
  limit: 20,
  offset: page * 20
});

// Display in list with infinite scroll
```

### 3. View Property Details
```typescript
const property = await api.properties.getById({ id });

// Track view
await api.properties.trackView({
  propertyId: id,
  sessionId: deviceId,
  viewDuration: timeSpent
});

// Get similar properties
const similar = await api.properties.similar({
  propertyId: id,
  limit: 6
});
```

### 4. Save Favorite
```typescript
await api.favorites.add({
  propertyId: id,
  notes: userNotes
});

// Show success notification
showToast('Added to favorites');
```

### 5. Contact Agent
```typescript
await api.messages.send({
  receiverId: agent.userId,
  content: message,
  propertyId: property.id
});

// Navigate to messages
navigation.navigate('Messages');
```

## Support

For mobile app development support, contact the platform team or refer to the main API documentation.
