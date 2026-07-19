# Short-Term Rental (Shortlet) Service Architecture

## Executive Summary

This document outlines the architecture for integrating short-term rental (shortlet) capabilities into the existing enterprise real estate platform. The design leverages the platform's existing microservices infrastructure while adding specialized components for booking management, calendar synchronization, dynamic pricing, and multi-platform integration (Airbnb, Booking.com, local platforms).

## Architecture Overview

### New Microservice: Booking Service (TypeScript)

The Booking Service handles all short-term rental operations, sitting alongside existing services (Property, User, Transaction, CRM, Developer, Analytics, Notification).

**Core Responsibilities:**
- Booking lifecycle management (inquiry, reservation, check-in, check-out)
- Calendar management and availability synchronization
- Dynamic pricing engine
- Channel manager integration (Airbnb, Booking.com)
- Guest verification and screening
- Host/property owner management
- Review and rating system
- Automated messaging and notifications

## Service Components

### 1. Booking Management Module

**Database Schema:**

```typescript
// Shortlet Property (extends base Property)
interface ShortletProperty {
  id: string;
  propertyId: string; // Links to main Property Service
  hostId: string;
  listingType: 'entire_place' | 'private_room' | 'shared_room';
  instantBookEnabled: boolean;
  minimumStay: number; // nights
  maximumStay: number; // nights
  checkInTime: string; // "14:00"
  checkOutTime: string; // "11:00"
  basePrice: number; // per night
  cleaningFee: number;
  securityDeposit: number;
  amenities: string[];
  houseRules: string[];
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

// Booking
interface Booking {
  id: string;
  propertyId: string;
  guestId: string;
  hostId: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  totalPrice: number;
  breakdown: {
    nightlyRate: number;
    numberOfNights: number;
    subtotal: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    total: number;
  };
  status: 'inquiry' | 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  cancellationReason?: string;
  specialRequests?: string;
  source: 'direct' | 'airbnb' | 'booking_com' | 'local_platform';
  externalBookingId?: string; // For channel manager sync
  createdAt: Date;
  updatedAt: Date;
}

// Calendar Availability
interface CalendarBlock {
  id: string;
  propertyId: string;
  date: Date;
  status: 'available' | 'booked' | 'blocked';
  price: number; // Can vary by date (dynamic pricing)
  minimumStay: number;
  bookingId?: string;
  notes?: string;
}

// Guest Profile
interface Guest {
  id: string;
  userId: string; // Links to User Service
  verificationStatus: 'unverified' | 'email_verified' | 'phone_verified' | 'id_verified' | 'fully_verified';
  governmentId?: string; // Encrypted
  profilePhoto?: string;
  bio?: string;
  languages: string[];
  totalBookings: number;
  averageRating: number;
  createdAt: Date;
}

// Review
interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  type: 'guest_to_host' | 'host_to_guest';
  rating: number; // 1-5
  cleanliness?: number;
  communication?: number;
  checkIn?: number;
  accuracy?: number;
  location?: number;
  value?: number;
  comment: string;
  response?: string;
  createdAt: Date;
}
```

### 2. Calendar & Availability Management

**Features:**
- Real-time availability tracking
- Multi-calendar synchronization (iCal import/export)
- Blocked dates management (maintenance, personal use)
- Minimum/maximum stay rules
- Same-day booking controls
- Advance notice requirements

**API Endpoints:**
```
GET    /api/bookings/calendar/:propertyId
POST   /api/bookings/calendar/:propertyId/block
DELETE /api/bookings/calendar/:propertyId/block/:blockId
GET    /api/bookings/availability/:propertyId?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
POST   /api/bookings/calendar/:propertyId/sync-ical
```

### 3. Dynamic Pricing Engine

**Pricing Factors:**
- Base price (set by host)
- Seasonal adjustments (peak/off-peak)
- Day of week variations (weekend premiums)
- Length of stay discounts (weekly, monthly)
- Last-minute discounts
- Early bird discounts
- Market demand (occupancy-based)
- Special events in area
- Competitor pricing

**Implementation:**
```typescript
interface PricingRule {
  id: string;
  propertyId: string;
  type: 'seasonal' | 'day_of_week' | 'length_of_stay' | 'last_minute' | 'early_bird' | 'event_based';
  startDate?: Date;
  endDate?: Date;
  daysOfWeek?: number[]; // 0-6
  minimumStay?: number;
  adjustmentType: 'percentage' | 'fixed';
  adjustmentValue: number;
  priority: number;
  active: boolean;
}

class DynamicPricingEngine {
  calculatePrice(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
    numberOfGuests: number
  ): PriceBreakdown {
    // 1. Get base price
    // 2. Apply seasonal rules
    // 3. Apply day-of-week rules
    // 4. Apply length-of-stay discounts
    // 5. Apply demand-based adjustments
    // 6. Calculate taxes and fees
    // 7. Return breakdown
  }
}
```

### 4. Channel Manager Integration

**Supported Platforms:**
- Airbnb (via API)
- Booking.com (via XML API)
- Local Nigerian platforms (custom integrations)
- Direct bookings (platform website/app)

**Synchronization:**
- Two-way calendar sync
- Real-time availability updates
- Pricing synchronization
- Booking import/export
- Review aggregation

**Implementation:**
```typescript
interface ChannelIntegration {
  platform: 'airbnb' | 'booking_com' | 'local';
  propertyId: string;
  externalListingId: string;
  apiCredentials: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
  };
  syncEnabled: boolean;
  lastSyncAt: Date;
}

class ChannelManager {
  async syncCalendar(propertyId: string, platform: string): Promise<void>;
  async importBooking(externalBookingId: string, platform: string): Promise<Booking>;
  async exportBooking(bookingId: string, platform: string): Promise<void>;
  async updateAvailability(propertyId: string, dates: Date[]): Promise<void>;
}
```

### 5. Payment Integration (Nigeria-Specific)

**Payment Gateways:**
- **Paystack** - Primary (cards, bank transfers, USSD, mobile money)
- **Flutterwave** - Secondary (multi-currency, international cards)
- **Bank Transfer** - Direct (for long-term bookings)
- **Cash** - On check-in (with escrow protection)

**Payment Flow:**
```
1. Guest makes booking → 50% deposit charged
2. Funds held in escrow (TigerBeetle ledger)
3. 24 hours before check-in → Remaining 50% charged
4. Check-in successful → Funds released to host (minus platform fee)
5. Check-out + 24 hours → Final settlement
6. Dispute period (7 days) → Refund window
```

**Escrow Management:**
```typescript
interface EscrowAccount {
  bookingId: string;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  platformFee: number;
  hostPayout: number;
  status: 'pending' | 'partial' | 'held' | 'released' | 'refunded';
  releaseDate: Date;
  transactions: EscrowTransaction[];
}

interface EscrowTransaction {
  id: string;
  type: 'deposit' | 'payment' | 'release' | 'refund' | 'fee';
  amount: number;
  from: string;
  to: string;
  timestamp: Date;
  ledgerEntryId: string; // TigerBeetle reference
}
```

### 6. Guest Verification & KYC

**Verification Levels:**
1. **Email Verification** - Required for all guests
2. **Phone Verification** - SMS OTP
3. **ID Verification** - Government-issued ID (NIN, Driver's License, Passport)
4. **Selfie Verification** - Liveness check
5. **Background Check** - Optional for hosts

**Integration with Ballerine:**
```typescript
interface VerificationRequest {
  guestId: string;
  verificationType: 'email' | 'phone' | 'id' | 'selfie' | 'background';
  documentType?: 'nin' | 'drivers_license' | 'passport' | 'voters_card';
  documentNumber?: string;
  documentImage?: string;
  selfieImage?: string;
}

class GuestVerificationService {
  async verifyEmail(guestId: string, email: string): Promise<boolean>;
  async verifyPhone(guestId: string, phone: string): Promise<boolean>;
  async verifyID(request: VerificationRequest): Promise<VerificationResult>;
  async performBackgroundCheck(guestId: string): Promise<BackgroundCheckResult>;
}
```

### 7. Automated Messaging & Notifications

**Message Templates:**
- Booking inquiry received
- Booking confirmed
- Payment reminder
- Check-in instructions (24 hours before)
- Check-in reminder (day of)
- Check-out reminder
- Review request (after check-out)
- Cancellation notification
- Host payout notification

**Multi-Channel Delivery:**
- In-app notifications
- Email (via SendGrid)
- SMS (via Termii, Africa's Talking)
- WhatsApp Business API
- Push notifications (mobile app)

**Implementation:**
```typescript
interface MessageTemplate {
  id: string;
  type: 'booking_inquiry' | 'booking_confirmed' | 'check_in_instructions' | 'review_request';
  channels: ('email' | 'sms' | 'whatsapp' | 'push' | 'in_app')[];
  subject: string;
  body: string; // Template with variables {{guestName}}, {{propertyName}}, etc.
  timing: {
    trigger: 'immediate' | 'scheduled';
    offset?: number; // hours before/after event
  };
  active: boolean;
}

class AutomatedMessagingService {
  async sendBookingConfirmation(bookingId: string): Promise<void>;
  async sendCheckInInstructions(bookingId: string): Promise<void>;
  async scheduleReviewRequest(bookingId: string): Promise<void>;
}
```

### 8. Review & Rating System

**Features:**
- Dual review system (guest reviews host, host reviews guest)
- 14-day review window after check-out
- Simultaneous publication (both reviews visible after both submitted or 14 days)
- Rating categories (cleanliness, communication, accuracy, etc.)
- Response to reviews
- Review moderation and reporting

**Analytics:**
```typescript
interface PropertyRatings {
  propertyId: string;
  overallRating: number;
  totalReviews: number;
  cleanliness: number;
  communication: number;
  checkIn: number;
  accuracy: number;
  location: number;
  value: number;
  responseRate: number; // % of reviews with host response
  responseTime: number; // average hours to respond
}
```

## Integration with Existing Services

### Property Service
- Extend property schema with shortlet-specific fields
- Add `listingType: 'sale' | 'long_term_rental' | 'short_term_rental'`
- Share property media, amenities, location data

### User Service
- Guest profiles extend user accounts
- Host profiles for property owners
- Verification status integration

### Transaction Service
- Booking payments flow through Transaction Service
- Temporal workflows for multi-step booking process
- Escrow management via TigerBeetle

### CRM Service
- Lead tracking for potential hosts
- Guest relationship management
- Host support tickets

### Analytics Service
- Occupancy rate tracking
- Revenue per available room (RevPAR)
- Average daily rate (ADR)
- Booking conversion funnel
- Market demand analysis
- Pricing optimization insights

### Notification Service
- Automated booking notifications
- Review reminders
- Payment alerts
- Host payout notifications

## Technology Stack

### Backend
- **Language**: TypeScript (Node.js)
- **Framework**: Express.js
- **Database**: PostgreSQL (with TimescaleDB for time-series pricing data)
- **Cache**: Redis (for availability lookups)
- **Message Queue**: Kafka (for event streaming)
- **Workflow**: Temporal (for booking state machine)

### APIs & Integrations
- **Airbnb API**: OAuth 2.0, REST API
- **Booking.com XML API**: SOAP/REST hybrid
- **Paystack SDK**: Node.js client
- **Flutterwave SDK**: Node.js client
- **iCal**: ical.js library for calendar sync
- **SMS**: Termii, Africa's Talking
- **WhatsApp**: WhatsApp Business API

### Infrastructure
- **Container**: Docker
- **Orchestration**: Kubernetes
- **Service Mesh**: Dapr
- **API Gateway**: Apache APISIX
- **Monitoring**: Prometheus + Grafana

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (APISIX)                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌───────▼────────┐
│ Booking Service│   │ Property Service│   │  User Service  │
│  (TypeScript)  │   │      (Go)       │   │     (Go)       │
└───────┬────────┘   └────────┬────────┘   └───────┬────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌───────▼────────┐
│   PostgreSQL   │   │     Redis       │   │     Kafka      │
│  (Bookings DB) │   │  (Availability) │   │   (Events)     │
└────────────────┘   └─────────────────┘   └────────────────┘
```

## API Endpoints

### Shortlet Property Management
```
POST   /api/shortlets/properties              # Create shortlet listing
GET    /api/shortlets/properties/:id          # Get shortlet details
PUT    /api/shortlets/properties/:id          # Update shortlet
DELETE /api/shortlets/properties/:id          # Deactivate shortlet
GET    /api/shortlets/properties              # Search shortlets
```

### Booking Management
```
POST   /api/bookings                          # Create booking
GET    /api/bookings/:id                      # Get booking details
PUT    /api/bookings/:id                      # Update booking
POST   /api/bookings/:id/cancel               # Cancel booking
GET    /api/bookings                          # List bookings (guest/host)
POST   /api/bookings/:id/check-in             # Mark checked in
POST   /api/bookings/:id/check-out            # Mark checked out
```

### Calendar & Availability
```
GET    /api/shortlets/properties/:id/calendar # Get calendar
POST   /api/shortlets/properties/:id/block    # Block dates
GET    /api/shortlets/availability            # Check availability
POST   /api/shortlets/properties/:id/pricing  # Update pricing rules
```

### Reviews
```
POST   /api/bookings/:id/reviews              # Submit review
GET    /api/shortlets/properties/:id/reviews  # Get property reviews
GET    /api/guests/:id/reviews                # Get guest reviews
POST   /api/reviews/:id/response              # Respond to review
```

### Channel Manager
```
POST   /api/channels/connect                  # Connect external platform
GET    /api/channels/listings                 # List channel connections
POST   /api/channels/sync/:propertyId         # Trigger sync
GET    /api/channels/bookings                 # Import external bookings
```

## Security Considerations

### Data Protection
- Encrypt sensitive guest data (ID numbers, payment info)
- PCI DSS compliance for payment processing
- GDPR/NDPR compliance for personal data
- Secure document storage (IPFS with encryption)

### Fraud Prevention
- Guest verification (email, phone, ID)
- Host verification (business registration for commercial hosts)
- Booking pattern analysis (fraud detection ML models)
- Payment fraud detection (via Paystack/Flutterwave)
- Review authenticity checks

### Access Control
- Role-based permissions (guest, host, admin)
- Property-level access control
- Booking data privacy (only parties involved can view)
- API rate limiting per user/IP

## Performance Optimization

### Caching Strategy
- **Redis**: Availability calendar (TTL: 5 minutes)
- **Redis**: Property search results (TTL: 15 minutes)
- **Redis**: Pricing calculations (TTL: 1 hour)
- **CDN**: Property images, static assets

### Database Optimization
- Index on `propertyId`, `checkInDate`, `checkOutDate`, `status`
- Partitioning: Bookings table by year
- TimescaleDB: Pricing history time-series data
- Read replicas for analytics queries

### Scalability
- Horizontal scaling: Booking Service (3-10 replicas)
- Auto-scaling: Based on booking volume
- Database sharding: By geographic region (Lagos, Abuja, PH)
- Kafka partitioning: By property ID

## Monitoring & Observability

### Key Metrics
- **Booking conversion rate**: Inquiries → Confirmed bookings
- **Occupancy rate**: Booked nights / Available nights
- **Average daily rate (ADR)**: Total revenue / Booked nights
- **RevPAR**: Revenue per available room
- **Cancellation rate**: Cancelled bookings / Total bookings
- **Response time**: Host response to inquiries
- **Payment success rate**: Successful payments / Attempted payments
- **API latency**: p50, p95, p99 response times

### Alerts
- Booking service downtime
- Payment gateway failures
- Calendar sync failures
- High cancellation rate (>15%)
- Low occupancy rate (<30%)
- Review score drop (<4.0)

## Migration Strategy

### Phase 1: Infrastructure Setup (Week 1-2)
- Deploy Booking Service
- Set up PostgreSQL database
- Configure Redis cache
- Integrate Kafka events

### Phase 2: Core Features (Week 3-6)
- Booking management
- Calendar & availability
- Payment integration (Paystack, Flutterwave)
- Guest verification

### Phase 3: Channel Manager (Week 7-10)
- Airbnb integration
- Booking.com integration
- Local platform integrations
- Calendar synchronization

### Phase 4: Advanced Features (Week 11-14)
- Dynamic pricing engine
- Automated messaging
- Review system
- Analytics dashboard

### Phase 5: Testing & Launch (Week 15-16)
- Load testing
- Security audit
- Beta launch (50 properties)
- Full launch

## Success Metrics

### Business Metrics
- **Target**: 1,000 shortlet listings in Year 1
- **Target**: 10,000 bookings in Year 1
- **Target**: ₦500 million GMV (Gross Merchandise Value)
- **Target**: 70% occupancy rate
- **Target**: 4.5+ average property rating

### Technical Metrics
- **API uptime**: 99.9%
- **Booking confirmation**: <2 seconds
- **Calendar sync**: <30 seconds
- **Payment success rate**: >95%
- **Zero data breaches**

## Conclusion

This architecture provides a robust, scalable foundation for integrating short-term rental capabilities into the existing platform. By leveraging microservices, modern payment systems, and channel manager integrations, the platform can compete effectively with Airbnb while offering Nigeria-specific features like mobile money support, local payment gateways, and flexible verification options.

The design prioritizes:
1. **Scalability**: Handle 10,000+ properties and 100,000+ bookings
2. **Reliability**: 99.9% uptime with fault tolerance
3. **Security**: PCI DSS compliance, fraud detection, data encryption
4. **User Experience**: Fast bookings, instant confirmations, automated communication
5. **Market Fit**: Nigeria-specific payment methods, verification, and regulations
