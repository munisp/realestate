# Workflow Orchestration - Complete Implementation

## Overview

This platform implements **30 end-to-end user journeys** orchestrated by **Temporal workflows** with full integration to existing microservices infrastructure (Kafka, Dapr, TigerBeetle, Redis, IPFS, etc.).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Mobile)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ useWorkflow  │  │   tRPC API   │  │  UI Components│          │
│  │    Hook      │──│   Workflows  │──│   & Pages     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                         tRPC over HTTP
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                      Backend (Node.js/Express)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Temporal Client (temporalClient.ts)              │   │
│  │  - Start workflows                                        │   │
│  │  - Signal workflows                                       │   │
│  │  - Query workflow status                                  │   │
│  └────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                    Temporal gRPC
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│              Temporal Server (workflow-orchestrator)             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Workflow Workers (Go)                   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │ Core (1-10)│  │Shortlet    │  │Builder     │         │   │
│  │  │ Workflows  │  │(11-20)     │  │(21-30)     │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  └────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                    Activity Execution
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Microservices Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Dapr    │  │  Kafka   │  │TigerBeetle│ │  Redis   │       │
│  │  (RPC)   │  │ (Events) │  │ (Ledger) │  │ (Cache)  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         23 Microservices (Go, Python, Node.js)           │   │
│  │  - property-service    - booking-service                 │   │
│  │  - user-service        - payment-service                 │   │
│  │  - developer-service   - notification-service            │   │
│  │  - analytics-service   - geospatial-service              │   │
│  │  - ml-valuation        - fraud-detection                 │   │
│  │  - ocr-service         - image-service                   │   │
│  │  - verification-service - crm-service                    │   │
│  │  - recommendation      - transaction-service             │   │
│  │  - ipfs-service        - tigerbeetle-service             │   │
│  │  - kyb-service         - lakehouse-service               │   │
│  │  - ray-cluster         - gpu-compute                     │   │
│  │  - smart-lock-api      - cleaning-service                │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 30 User Journeys

### Core Platform (1-10)

| # | Journey | Workflow | Key Services |
|---|---------|----------|--------------|
| 1 | Property Search | `PropertySearchWorkflow` | property-service, geospatial, ml-valuation, Redis |
| 2 | Property Valuation | `PropertyValuationWorkflow` | ml-valuation, analytics, Ray cluster |
| 3 | Tour Scheduling | `TourSchedulingWorkflow` | crm-service, notification, calendar API |
| 4 | Transaction | `TransactionWorkflow` | transaction-service, payment, TigerBeetle |
| 5 | Document Verification | `DocumentVerificationWorkflow` | ocr-service, fraud-detection, verification |
| 6 | Mortgage Pre-Approval | `MortgagePreApprovalWorkflow` | kyb-service, fraud-detection, document |
| 7 | Property Comparison | `PropertyComparisonWorkflow` | analytics, ml-valuation, export |
| 8 | Agent Matching | `AgentMatchingWorkflow` | recommendation, crm, ML |
| 9 | Neighborhood Analysis | `NeighborhoodAnalysisWorkflow` | geospatial (H3), analytics, external APIs |
| 10 | Investment Analysis | `InvestmentAnalysisWorkflow` | analytics, ml-valuation, Monte Carlo |

### Shortlet Platform (11-20)

| # | Journey | Workflow | Key Services |
|---|---------|----------|--------------|
| 11 | Shortlet Search | `ShortletSearchWorkflow` | booking-service, Redis, ML ranking |
| 12 | Shortlet Booking | `ShortletBookingWorkflow` | booking, payment, Stripe, TigerBeetle |
| 13 | Host Onboarding | `HostOnboardingWorkflow` | image-service, verification, fraud-detection |
| 14 | Guest Check-in | `GuestCheckinWorkflow` | smart-lock-api, notification, booking |
| 15 | Cleaning Scheduling | `CleaningSchedulingWorkflow` | cleaning-service, crm, photo verification |
| 16 | Dynamic Pricing | `DynamicPricingWorkflow` | analytics, ML pricing, competitor scraping |
| 17 | Review | `ReviewWorkflow` | fraud-detection, notification, rating update |
| 18 | Dispute Resolution | `DisputeResolutionWorkflow` | mediation, evidence upload, refund |
| 19 | Host Payout | `HostPayoutWorkflow` | payment, Stripe transfer, TigerBeetle |
| 20 | Property Management | `PropertyManagementWorkflow` | analytics, occupancy calc, reports |

### Builder Platform (21-30)

| # | Journey | Workflow | Key Services |
|---|---------|----------|--------------|
| 21 | Builder Discovery | `BuilderDiscoveryWorkflow` | developer-service, ML matching, portfolio |
| 22 | Quote Request | `QuoteRequestWorkflow` | crm-service, notification, quote management |
| 23 | Project Creation | `ProjectCreationWorkflow` | developer, IPFS, contract upload |
| 24 | Milestone Payment | `MilestonePaymentWorkflow` | payment, TigerBeetle escrow, Stripe |
| 25 | Inspection | `InspectionWorkflow` | verification, OCR photo validation |
| 26 | Escrow Release | `EscrowReleaseWorkflow` | TigerBeetle, Stripe transfer, ledger |
| 27 | Project Tracking | `ProjectTrackingWorkflow` | developer, analytics, budget/timeline |
| 28 | Builder Onboarding | `BuilderOnboardingWorkflow` | kyb-service, OCR, verification, admin review |
| 29 | Photo Update | `PhotoUpdateWorkflow` | image-service, IPFS, metadata extraction |
| 30 | Builder Analytics | `BuilderAnalyticsWorkflow` | analytics, revenue trends, export |

---

## Workflow Implementation

### File Structure

```
services/workflow-orchestrator/
├── main.go                          # Temporal worker entry point
├── config/
│   └── config.go                    # Configuration (Kafka, Dapr, Redis, etc.)
├── workflows/
│   ├── core_platform.go             # Workflows 1-10
│   ├── shortlet_platform.go         # Workflows 11-20
│   ├── shortlet_booking.go          # Workflow 12 (detailed)
│   ├── builder_platform.go          # Workflows 21-30
│   ├── milestone_payment.go         # Workflow 24 (detailed)
│   └── activities.go                # All activity implementations
└── go.mod

server/
├── _core/
│   └── temporalClient.ts            # Temporal client for Node.js backend
└── routers/
    └── workflows.ts                 # tRPC workflow router

client/src/
└── hooks/
    └── useWorkflow.ts               # React hook for workflow execution
```

### Example: Shortlet Booking Workflow

**Workflow Steps:**
1. Check property availability via Dapr → booking-service
2. Calculate dynamic pricing via ML pricing service
3. Create booking record in database
4. Create Stripe checkout session
5. Wait for payment confirmation (signal)
6. Record payment in TigerBeetle ledger
7. Confirm booking and update status
8. Generate confirmation code (Redis)
9. Send confirmation email/SMS (notification-service)
10. Publish Kafka event for analytics
11. Update CRM with booking data
12. Schedule check-in reminder (24h before)

**Integration Points:**
- **Dapr**: Service-to-service RPC (booking-service, payment-service)
- **Kafka**: Event publishing (booking.confirmed, payment.received)
- **TigerBeetle**: Financial ledger (payment records, balance updates)
- **Redis**: Caching (confirmation codes, session data)
- **Stripe**: Payment processing (checkout, webhooks)
- **Notification Service**: Email/SMS/push notifications

### Example: Milestone Payment Workflow

**Workflow Steps:**
1. Validate milestone status via developer-service
2. Create escrow account in TigerBeetle
3. Create Stripe checkout session
4. Wait for payment confirmation (signal)
5. Fund escrow account in TigerBeetle
6. Update milestone status to "funded"
7. Notify builder
8. Publish Kafka events
9. Update CRM
10. Wait for milestone completion (signal)
11. Trigger inspection workflow (child workflow)
12. Wait for client approval (signal with 7-day auto-approve)
13. Release escrow to builder (child workflow)
14. Update milestone to "completed"
15. Publish completion events

**Child Workflows:**
- `InspectionWorkflow`: Assign inspector → Wait for report → Validate photos → Approve/Reject
- `EscrowReleaseWorkflow`: Validate escrow → Stripe transfer → Update ledger → Notify builder

---

## Frontend Integration

### Using Workflows in React

```typescript
import { useWorkflow } from '@/hooks/useWorkflow';

function ShortletBookingPage() {
  const { startShortletBooking, confirmBookingPayment, isStartingBooking } = useWorkflow();

  const handleBooking = async () => {
    startShortletBooking({
      propertyId: 123,
      checkIn: '2025-06-01',
      checkOut: '2025-06-07',
      numberOfGuests: 2,
    });
  };

  return (
    <button onClick={handleBooking} disabled={isStartingBooking}>
      {isStartingBooking ? 'Processing...' : 'Book Now'}
    </button>
  );
}
```

### Workflow Status Polling

```typescript
import { useWorkflowPolling } from '@/hooks/useWorkflow';

function BookingStatus({ workflowId }: { workflowId: string }) {
  const status = useWorkflowPolling(workflowId, 5000); // Poll every 5s

  if (!status) return <div>Loading...</div>;

  return (
    <div>
      <p>Status: {status.status}</p>
      {status.result && <pre>{JSON.stringify(status.result, null, 2)}</pre>}
    </div>
  );
}
```

---

## Mobile Integration

### React Native Workflow Hook

```typescript
// Similar to web, but using React Native specific APIs
import { useWorkflow } from '@/hooks/useWorkflow';

function ShortletBookingScreen() {
  const { startShortletBooking } = useWorkflow();

  const handleBooking = () => {
    startShortletBooking({
      propertyId: propertyId,
      checkIn: selectedCheckIn.toISOString(),
      checkOut: selectedCheckOut.toISOString(),
      numberOfGuests: guestCount,
    });
  };

  return (
    <TouchableOpacity onPress={handleBooking}>
      <Text>Book Now</Text>
    </TouchableOpacity>
  );
}
```

---

## Deployment

### 1. Start Temporal Server

```bash
# Using Docker Compose
cd /home/ubuntu/realestate-platform/services
docker-compose up -d temporal temporal-ui
```

### 2. Start Workflow Orchestrator

```bash
cd /home/ubuntu/realestate-platform/services/workflow-orchestrator
go run main.go
```

### 3. Start Supporting Services

```bash
# Kafka
docker-compose up -d kafka zookeeper

# Dapr
dapr init

# TigerBeetle
docker-compose up -d tigerbeetle-service

# Redis
docker-compose up -d redis
```

### 4. Start Backend

```bash
cd /home/ubuntu/realestate-platform
pnpm dev
```

---

## Monitoring & Observability

### Temporal UI
- Access at: `http://localhost:8088`
- View workflow executions, history, and status
- Inspect workflow timelines and event logs

### Kafka Topics
- `property.searched`
- `shortlet.searched`
- `booking.confirmed`
- `milestone.funded`
- `milestone.completed`
- `escrow.released`
- `payment.received`
- `inspection.completed`

### TigerBeetle Ledger
- All financial transactions recorded
- Escrow account management
- Payment audit trail

### Prometheus Metrics
- Workflow execution duration
- Activity success/failure rates
- Service invocation latency
- Kafka message throughput

---

## Testing

### Unit Tests (Workflow Logic)

```go
func TestShortletBookingWorkflow(t *testing.T) {
	testSuite := &testsuite.WorkflowTestSuite{}
	env := testSuite.NewTestWorkflowEnvironment()

	// Mock activities
	env.OnActivity("CheckShortletAvailability", mock.Anything, mock.Anything).Return(true, nil)
	env.OnActivity("CalculateShortletPrice", mock.Anything, mock.Anything).Return(map[string]int{"total": 50000}, nil)

	env.ExecuteWorkflow(ShortletBookingWorkflow, ShortletBookingInput{
		PropertyID: 1,
		GuestID: 1,
		CheckIn: time.Now(),
		CheckOut: time.Now().Add(7 * 24 * time.Hour),
	})

	require.True(t, env.IsWorkflowCompleted())
}
```

### Integration Tests (End-to-End)

```typescript
// Test complete booking flow
describe('Shortlet Booking Workflow', () => {
  it('should complete booking with payment', async () => {
    const { workflowId } = await startShortletBooking({
      propertyId: 1,
      checkIn: '2025-06-01',
      checkOut: '2025-06-07',
      numberOfGuests: 2,
    });

    // Simulate payment confirmation
    await confirmBookingPayment({
      workflowId,
      paymentId: 'pi_test_123',
    });

    // Poll for completion
    const result = await getWorkflowResult(workflowId);
    expect(result.success).toBe(true);
    expect(result.bookingId).toBeGreaterThan(0);
  });
});
```

---

## Error Handling

### Retry Policies
All workflows use exponential backoff retry:
- Initial interval: 1 second
- Backoff coefficient: 2.0
- Maximum interval: 1 minute
- Maximum attempts: 3

### Timeouts
- Activity timeout: 5-10 minutes (configurable)
- Workflow timeout: 24 hours (long-running workflows)
- Signal timeout: 7 days (user approval workflows)

### Compensation
Failed workflows trigger compensation activities:
- Cancel Stripe checkout
- Release escrow holds
- Revert database changes
- Send failure notifications

---

## Performance Optimization

### Caching Strategy
- Redis caching for search results (5 min TTL)
- Property availability cache (1 min TTL)
- ML model predictions cache (1 hour TTL)

### Parallel Execution
- Multiple properties enriched in parallel
- Batch Kafka event publishing
- Concurrent activity execution where possible

### Database Optimization
- Indexed queries for property search
- Materialized views for analytics
- Read replicas for heavy queries

---

## Security

### Authentication
- JWT tokens for API access
- Temporal namespace isolation
- Service-to-service mTLS via Dapr

### Authorization
- Role-based access control (RBAC)
- Workflow execution permissions
- Activity-level authorization

### Data Protection
- Encrypted Kafka messages
- TLS for all service communication
- PII encryption at rest

---

## Future Enhancements

1. **Workflow Versioning**: Support multiple workflow versions in production
2. **A/B Testing**: Run experimental workflows alongside production
3. **SLA Monitoring**: Track workflow SLA compliance
4. **Auto-scaling**: Dynamic worker scaling based on load
5. **Multi-region**: Geo-distributed Temporal clusters

---

## Support

For workflow-related issues:
1. Check Temporal UI for workflow execution history
2. Review Kafka topics for event flow
3. Inspect TigerBeetle ledger for financial records
4. Check service logs in observability stack

---

## Summary

This implementation provides:
- ✅ **30 complete user journeys** orchestrated by Temporal
- ✅ **Full microservices integration** (Kafka, Dapr, TigerBeetle, Redis, IPFS)
- ✅ **Frontend/mobile hooks** for easy workflow execution
- ✅ **Production-ready** with monitoring, testing, and error handling
- ✅ **Scalable architecture** supporting millions of workflow executions
