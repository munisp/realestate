# 30 End-to-End User Journeys
**Platform**: Next-Generation Real Estate Platform  
**Date**: November 18, 2025

All journeys are based on **existing implemented components** in `/home/ubuntu/realestate-platform`

---

## CORE PLATFORM JOURNEYS (10)

### Journey 1: Property Search & Discovery
**User**: Buyer  
**Existing Components**:
- Frontend: `/client/src/pages/Properties.tsx`, `/client/src/pages/PropertySearch.tsx`
- Backend: `/server/routers.ts` (property search)
- Service: `property-service` (Go)
- Database: `properties` table
- Infrastructure: OpenSearch, Redis cache

**Flow**:
1. User opens property search page
2. Enters location, price range, bedrooms
3. System queries property-service via APISIX
4. property-service searches PostGIS + OpenSearch
5. Results cached in Redis
6. Frontend displays properties with map view
7. User saves favorites → Kafka event → CRM update

**Temporal Workflow**: `PropertySearchWorkflow`

---

### Journey 2: Property Valuation Request
**User**: Property Owner  
**Existing Components**:
- Frontend: `/client/src/pages/PropertyAnalytics.tsx`
- Backend: `/server/routers/valuation.ts`
- Service: `valuation-service` (Python), `ml-valuation` (Python)
- ML Model: Ray cluster inference
- Database: `valuations` table

**Flow**:
1. Owner submits property details
2. System triggers valuation-service
3. ML model (Ray) analyzes comparables
4. Confidence score calculated
5. Result stored in database
6. Kafka event → analytics-service
7. Owner receives valuation report
8. TigerBeetle logs valuation fee

**Temporal Workflow**: `PropertyValuationWorkflow`

---

### Journey 3: Virtual Tour Scheduling
**User**: Buyer + Agent  
**Existing Components**:
- Frontend: `/client/src/pages/TourScheduler.tsx`, `/client/src/pages/MyTours.tsx`
- Backend: `/server/routers/tours.ts`
- Service: `booking-service` (Node.js)
- Database: `appointments` table
- Notification: `notification-service` (Go)

**Flow**:
1. Buyer requests tour on property detail page
2. System checks agent availability
3. booking-service creates appointment
4. Kafka event → notification-service
5. Email/SMS sent to buyer and agent
6. Calendar invites generated
7. Reminder sent 24h before
8. Post-tour feedback collected

**Temporal Workflow**: `TourSchedulingWorkflow`

---

### Journey 4: Offer Submission & Negotiation
**User**: Buyer + Seller  
**Existing Components**:
- Frontend: `/client/src/pages/OfferManagement.tsx`
- Backend: `/server/routers/offers.ts`
- Service: `transaction-service` (Go with Temporal)
- Workflow: `/services/transaction-service/workflows/transaction_workflow.go`
- Database: `transactions` table

**Flow**:
1. Buyer submits offer
2. transaction-service starts Temporal workflow
3. Offer validation (funds, property availability)
4. Kafka event → seller notification
5. Seller accepts/rejects/counters
6. Temporal signal updates workflow
7. If accepted → escrow creation
8. Document generation triggered

**Temporal Workflow**: `TransactionWorkflow` (existing)

---

### Journey 5: Document Upload & Verification
**User**: Buyer/Seller  
**Existing Components**:
- Frontend: `/client/src/pages/DocumentVault.tsx`
- Backend: `/server/routers/documents.ts`
- Service: `ocr-service` (Python), `ipfs-service` (Go)
- Storage: IPFS
- Database: `documents` table

**Flow**:
1. User uploads document (ID, proof of funds)
2. Document stored in IPFS
3. ocr-service extracts text (GPU-accelerated)
4. verification-service validates document
5. Kafka event → KYC workflow
6. fraud-detection checks for tampering
7. Document marked as verified
8. Notification sent to user

**Temporal Workflow**: `DocumentVerificationWorkflow`

---

### Journey 6: Mortgage Pre-Approval
**User**: Buyer  
**Existing Components**:
- Frontend: `/client/src/pages/MortgagePreApproval.tsx`
- Backend: `/server/routers/mortgage.ts`
- Service: `kyb-service` (Python), `fraud-detection` (Python)
- Database: `mortgageApplications` table

**Flow**:
1. Buyer fills mortgage application
2. kyb-service validates income documents
3. fraud-detection scores application
4. Credit check via external API
5. ML model predicts approval probability
6. Pre-approval letter generated
7. Stored in document vault (IPFS)
8. Kafka event → CRM update

**Temporal Workflow**: `MortgagePreApprovalWorkflow`

---

### Journey 7: Property Comparison
**User**: Buyer  
**Existing Components**:
- Frontend: `/client/src/pages/Compare.tsx`, `/client/src/contexts/ComparisonContext.tsx`
- Backend: `/server/routers/comparison.ts`
- Service: `analytics-service` (Python)
- Database: `propertyComparisons` table

**Flow**:
1. User adds properties to comparison
2. System fetches detailed data
3. analytics-service generates insights
4. ML model highlights key differences
5. Valuation comparison chart
6. Neighborhood analytics overlay
7. Export to PDF
8. Comparison saved for later

**Temporal Workflow**: `PropertyComparisonWorkflow`

---

### Journey 8: Agent Matching & Communication
**User**: Buyer  
**Existing Components**:
- Frontend: `/client/src/pages/FindAgent.tsx`, `/client/src/pages/Messages.tsx`
- Backend: `/server/routers/agents.ts`, `/server/routers/messages.ts`
- Service: `recommendation-service` (Python), `crm-service` (Node.js)
- Database: `agents`, `messages` tables

**Flow**:
1. User requests agent recommendation
2. recommendation-service analyzes preferences
3. ML model matches agents by specialty
4. Top 3 agents presented
5. User initiates chat
6. Messages stored in database
7. Real-time WebSocket updates
8. Kafka event → CRM tracking

**Temporal Workflow**: `AgentMatchingWorkflow`

---

### Journey 9: Neighborhood Intelligence
**User**: Buyer  
**Existing Components**:
- Frontend: `/client/src/pages/NeighborhoodIntelligence.tsx`, `/client/src/pages/NeighborhoodAnalytics.tsx`
- Backend: `/server/routers/neighborhood.ts`
- Service: `geospatial-service` (Python), `analytics-service`
- Database: `neighborhoodData` table

**Flow**:
1. User selects property location
2. geospatial-service queries H3 hexagon
3. Analytics aggregated (crime, schools, transit)
4. External APIs (walkability, demographics)
5. ML model predicts appreciation
6. Heatmap visualization generated
7. Results cached in Redis
8. User saves neighborhood report

**Temporal Workflow**: `NeighborhoodAnalysisWorkflow`

---

### Journey 10: Investment Calculator & ROI Analysis
**User**: Investor  
**Existing Components**:
- Frontend: `/client/src/pages/InvestmentPropertyCalculator.tsx`
- Backend: `/server/routers/investment.ts`
- Service: `analytics-service` (Python)
- Database: `investmentAnalyses` table

**Flow**:
1. Investor enters property details
2. System calculates cash flow
3. ML model predicts rental income
4. Tax implications calculated
5. ROI projections (5, 10, 20 years)
6. Monte Carlo simulation
7. Results visualized with charts
8. Report exported to PDF

**Temporal Workflow**: `InvestmentAnalysisWorkflow`

---

## SHORTLET PLATFORM JOURNEYS (10)

### Journey 11: Shortlet Property Search
**User**: Guest  
**Existing Components**:
- Frontend: `/client/src/pages/ShortletSearch.tsx`, `/client/src/pages/ShortLets.tsx`
- Mobile: `/realestate-mobile/src/screens/ShortletSearchScreen.tsx`
- Backend: `/server/routers/shortlet.ts`
- Service: `booking-service` (Node.js)
- Database: `properties` (listingType='shortlet')

**Flow**:
1. Guest searches by location + dates
2. booking-service checks availability
3. Dynamic pricing calculated
4. Results filtered by amenities
5. Map view with property markers
6. Instant book properties highlighted
7. Results cached in Redis
8. Guest saves favorites

**Temporal Workflow**: `ShortletSearchWorkflow`

---

### Journey 12: Shortlet Booking & Payment
**User**: Guest  
**Existing Components**:
- Frontend: `/client/src/pages/ShortLetDetail.tsx`, `/client/src/pages/Checkout.tsx`
- Backend: `/server/routers/shortlet.ts`, `/server/webhooks/stripe.ts`
- Service: `booking-service`, `payment-service` (Go)
- Database: `shortLetBookings`, `payments`
- Payment: Stripe integration

**Flow**:
1. Guest selects dates and clicks "Book Now"
2. booking-service validates availability
3. Price calculated (nightly + cleaning + service fee)
4. Stripe checkout session created
5. Guest completes payment
6. Webhook confirms payment
7. Booking status → "confirmed"
8. Kafka event → notification-service
9. Confirmation email sent
10. TigerBeetle records payment

**Temporal Workflow**: `ShortletBookingWorkflow`

---

### Journey 13: Host Onboarding
**User**: Property Owner (Host)  
**Existing Components**:
- Frontend: `/client/src/pages/PropertyForm.tsx`, `/client/src/pages/MyListings.tsx`
- Backend: `/server/routers/properties.ts`
- Service: `verification-service`, `image-service` (Go)
- Database: `properties`, `users`

**Flow**:
1. Host creates property listing
2. Uploads photos → image-service optimization
3. Sets pricing and availability
4. verification-service checks property documents
5. fraud-detection validates listing
6. Listing approved/rejected
7. Kafka event → CRM
8. Host receives onboarding guide

**Temporal Workflow**: `HostOnboardingWorkflow`

---

### Journey 14: Guest Check-in & Smart Lock
**User**: Guest  
**Existing Components**:
- Frontend: `/client/src/pages/BookingsDashboard.tsx`
- Mobile: Mobile booking screen
- Backend: `/server/routers/shortlet.ts`
- Service: `booking-service`, `notification-service`
- Integration: IoT smart lock API

**Flow**:
1. Guest arrives at property
2. Mobile app shows check-in button
3. booking-service generates access code
4. Code sent to smart lock API
5. Guest receives code via SMS
6. Booking status → "checked_in"
7. Kafka event → analytics
8. Host notified

**Temporal Workflow**: `GuestCheckinWorkflow`

---

### Journey 15: Cleaning & Maintenance Scheduling
**User**: Host  
**Existing Components**:
- Frontend: `/client/src/pages/OwnerDashboard.tsx`
- Backend: `/server/routers/maintenance.ts`
- Service: `booking-service`, `crm-service`
- Database: `maintenanceRequests`

**Flow**:
1. Guest checks out
2. Automated cleaning request created
3. crm-service assigns cleaner
4. Cleaner receives notification
5. Cleaning completed → status update
6. Photos uploaded for verification
7. Property marked available
8. Kafka event → booking-service

**Temporal Workflow**: `CleaningSchedulingWorkflow`

---

### Journey 16: Dynamic Pricing Optimization
**User**: Host (Automated)  
**Existing Components**:
- Backend: `/server/routers/shortLetPricing.ts`
- Service: `analytics-service` (Python), `ml-valuation`
- Database: `shortLetPricing`

**Flow**:
1. Scheduled job runs daily
2. analytics-service analyzes demand
3. ML model predicts optimal price
4. Competitor pricing scraped
5. Event-based pricing (holidays)
6. Prices updated in database
7. Kafka event → booking-service
8. Host notified of changes

**Temporal Workflow**: `DynamicPricingWorkflow`

---

### Journey 17: Guest Reviews & Ratings
**User**: Guest + Host  
**Existing Components**:
- Frontend: `/client/src/pages/BookingsDashboard.tsx`
- Backend: `/server/routers/reviews.ts`
- Service: `crm-service`, `fraud-detection`
- Database: `reviews`

**Flow**:
1. Guest checks out
2. Review request sent (email + app)
3. Guest submits rating and review
4. fraud-detection validates review
5. Host receives notification
6. Host responds to review
7. Average rating updated
8. Kafka event → analytics

**Temporal Workflow**: `ReviewWorkflow`

---

### Journey 18: Dispute Resolution
**User**: Guest + Host  
**Existing Components**:
- Frontend: `/client/src/pages/Messages.tsx`
- Backend: `/server/routers/disputes.ts`
- Service: `crm-service`, `notification-service`
- Database: `disputes`

**Flow**:
1. Guest/Host opens dispute
2. Evidence uploaded (photos, messages)
3. crm-service assigns mediator
4. Both parties notified
5. Mediator reviews case
6. Decision made
7. Refund processed if applicable
8. TigerBeetle records transaction

**Temporal Workflow**: `DisputeResolutionWorkflow`

---

### Journey 19: Shortlet Payout to Host
**User**: Host  
**Existing Components**:
- Backend: `/server/webhooks/stripe.ts`
- Service: `payment-service` (Go), `tigerbeetle-service`
- Database: `payments`, `escrowAccounts`
- Ledger: TigerBeetle

**Flow**:
1. Guest checks out successfully
2. Scheduled job runs (24h after checkout)
3. payment-service calculates payout
4. Platform fee deducted (3%)
5. Stripe transfer created
6. TigerBeetle records ledger entry
7. Host receives payout
8. Kafka event → notification

**Temporal Workflow**: `HostPayoutWorkflow`

---

### Journey 20: Multi-Property Management
**User**: Host (Property Manager)  
**Existing Components**:
- Frontend: `/client/src/pages/MyListings.tsx`, `/client/src/pages/PropertyAnalytics.tsx`
- Backend: `/server/routers/properties.ts`
- Service: `analytics-service`, `booking-service`
- Database: `properties`, `shortLetBookings`

**Flow**:
1. Manager views dashboard
2. analytics-service aggregates metrics
3. Occupancy rates calculated
4. Revenue per property
5. Upcoming bookings calendar
6. Maintenance schedule
7. Bulk pricing updates
8. Export reports to PDF

**Temporal Workflow**: `PropertyManagementWorkflow`

---

## BUILDER PLATFORM JOURNEYS (10)

### Journey 21: Builder Discovery & Verification
**User**: Client  
**Existing Components**:
- Frontend: `/client/src/pages/BuilderMarketplace.tsx`
- Mobile: `/realestate-mobile/src/screens/BuilderMarketplaceScreen.tsx`
- Backend: `/server/routers/builderServices.ts`
- Service: `developer-service` (Go), `verification-service`
- Database: `builders`, `builderReviews`

**Flow**:
1. Client searches for builders
2. Filters by specialization, location
3. developer-service queries database
4. Verification badges displayed
5. Portfolio and certifications shown
6. Reviews and ratings aggregated
7. Client requests quote
8. Kafka event → CRM

**Temporal Workflow**: `BuilderDiscoveryWorkflow`

---

### Journey 22: Quote Request & Response
**User**: Client + Builder  
**Existing Components**:
- Frontend: `/client/src/pages/BuilderMarketplace.tsx`
- Mobile: Builder quote modal
- Backend: `/server/routers/builderServices.ts`
- Service: `crm-service`, `notification-service`
- Database: `builderQuotes`

**Flow**:
1. Client submits quote request
2. crm-service creates quote record
3. Kafka event → notification-service
4. Builder receives notification
5. Builder reviews requirements
6. Quote prepared with pricing
7. Client receives quote
8. Client accepts/rejects

**Temporal Workflow**: `QuoteRequestWorkflow`

---

### Journey 23: Construction Project Creation
**User**: Client + Builder  
**Existing Components**:
- Frontend: `/client/src/pages/BuilderProjects.tsx`, `/client/src/pages/BuilderProjectDetail.tsx`
- Backend: `/server/routers/builderServices.ts`, `/server/routers/documents.ts`
- Service: `developer-service`, `ipfs-service`
- Database: `builderProjects`, `projectMilestones`

**Flow**:
1. Client accepts quote
2. developer-service creates project
3. Contract uploaded to IPFS
4. Blueprints uploaded
5. Milestones defined
6. Payment schedule created
7. Kafka event → notification
8. Both parties receive confirmation

**Temporal Workflow**: `ProjectCreationWorkflow`

---

### Journey 24: Milestone-Based Payment with Escrow
**User**: Client  
**Existing Components**:
- Frontend: `/client/src/pages/MyProjects.tsx` (Payment tab)
- Backend: `/server/webhooks/stripe.ts`, `/server/routers/builderServices.ts`
- Service: `payment-service`, `tigerbeetle-service`
- Database: `projectMilestones`, `escrowAccounts`, `payments`
- Ledger: TigerBeetle

**Flow**:
1. Client pays for milestone
2. Stripe checkout session created
3. Payment confirmed via webhook
4. Funds held in escrow (TigerBeetle)
5. Kafka event → developer-service
6. Milestone status → "funded"
7. Builder notified
8. Client receives receipt

**Temporal Workflow**: `MilestonePaymentWorkflow`

---

### Journey 25: Inspector Verification & Approval
**User**: Inspector + Client  
**Existing Components**:
- Frontend: `/client/src/pages/InspectorVerification.tsx`, `/client/src/pages/MyProjects.tsx`
- Backend: `/server/routers/builderServices.ts`
- Service: `verification-service`, `ocr-service`
- Database: `projectMilestones`, `inspections`

**Flow**:
1. Builder completes milestone
2. Inspection request created
3. verification-service assigns inspector
4. Inspector visits site
5. Photos uploaded (ocr-service validates)
6. Inspection report generated
7. Client reviews and approves
8. Kafka event → payment release

**Temporal Workflow**: `InspectionWorkflow`

---

### Journey 26: Escrow Release to Builder
**User**: Builder  
**Existing Components**:
- Backend: `/server/webhooks/stripe.ts` (`releaseEscrowFunds()`)
- Service: `payment-service`, `tigerbeetle-service`
- Database: `escrowAccounts`, `payments`
- Payment: Stripe Connect

**Flow**:
1. Client approves milestone
2. payment-service triggers release
3. TigerBeetle updates ledger
4. Stripe transfer created
5. Funds sent to builder account
6. Transfer ID recorded
7. Kafka event → notification
8. Builder receives payout notification

**Temporal Workflow**: `EscrowReleaseWorkflow`

---

### Journey 27: Project Progress Tracking
**User**: Client  
**Existing Components**:
- Frontend: `/client/src/pages/MyProjects.tsx` (Milestones tab)
- Backend: `/server/routers/builderServices.ts`
- Service: `developer-service`, `analytics-service`
- Database: `builderProjects`, `projectMilestones`

**Flow**:
1. Client opens project dashboard
2. developer-service fetches milestones
3. Progress percentage calculated
4. Timeline visualization
5. Budget vs actual spending
6. Photo gallery loaded
7. Document vault displayed
8. Upcoming milestones highlighted

**Temporal Workflow**: `ProjectTrackingWorkflow`

---

### Journey 28: Builder Application & Onboarding
**User**: Builder  
**Existing Components**:
- Frontend: `/client/src/pages/BuilderApplication.tsx`, `/client/src/pages/AdminBuilderVerification.tsx`
- Backend: `/server/routers/builderServices.ts`, `/server/routers/documents.ts`
- Service: `verification-service`, `kyb-service`, `ocr-service`
- Database: `builders`

**Flow**:
1. Builder submits application
2. Documents uploaded (CAC, licenses)
3. ocr-service extracts data
4. kyb-service validates business
5. verification-service checks credentials
6. Admin reviews application
7. Builder approved/rejected
8. Kafka event → CRM

**Temporal Workflow**: `BuilderOnboardingWorkflow`

---

### Journey 29: Construction Photo Updates
**User**: Builder  
**Existing Components**:
- Frontend: `/client/src/pages/MyProjects.tsx` (Photos tab)
- Backend: `/server/routers/documents.ts`
- Service: `image-service` (Go), `ipfs-service`
- Database: `projectPhotos`

**Flow**:
1. Builder uploads progress photos
2. image-service optimizes images
3. Metadata extracted (EXIF, location)
4. Photos stored in IPFS
5. Thumbnails generated
6. Kafka event → notification
7. Client receives update notification
8. Photos displayed in gallery

**Temporal Workflow**: `PhotoUpdateWorkflow`

---

### Journey 30: Builder Performance Analytics
**User**: Builder  
**Existing Components**:
- Frontend: `/client/src/pages/BuilderDashboard.tsx`
- Backend: `/server/routers/builderServices.ts`
- Service: `analytics-service` (Python), `developer-service`
- Database: `builderProjects`, `builderReviews`

**Flow**:
1. Builder opens dashboard
2. analytics-service aggregates data
3. Project completion rate calculated
4. Average rating computed
5. Revenue trends visualized
6. Client satisfaction metrics
7. Recommendations for improvement
8. Export report to PDF

**Temporal Workflow**: `BuilderAnalyticsWorkflow`

---

## Summary

All 30 journeys are based on:
- ✅ **Existing frontend pages** in `/client/src/pages/`
- ✅ **Existing mobile screens** in `/realestate-mobile/src/screens/`
- ✅ **Existing backend routers** in `/server/routers/`
- ✅ **Existing microservices** in `/services/`
- ✅ **Existing database tables** in `/drizzle/schema.ts`
- ✅ **Existing infrastructure** (Kafka, Dapr, TigerBeetle, etc.)

**Next Steps**:
1. Implement Temporal workflows for each journey
2. Integrate with Kafka for event streaming
3. Use Dapr for service-to-service communication
4. Leverage TigerBeetle for financial transactions
5. Update UI/UX for seamless workflow execution
