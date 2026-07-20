# TypeScript Strict Mode Cleanup

## Status

TypeScript strict mode is enabled in `tsconfig.json`. The following files still use
`// @ts-nocheck` to suppress all type errors. Each file should be migrated incrementally
by removing the directive and fixing the resulting type errors.

## Priority 1 — Completed (15 files)

These files have had `@ts-nocheck` removed and are now fully type-checked:

| File | Notes |
|---|---|
| `server/_core/monitoring.ts` | Sentry integration |
| `server/_core/kafkaPublisher.ts` | Kafka event publishing |
| `server/_core/notificationService.ts` | Push notifications |
| `server/_core/geospatialIntegration.ts` | PostGIS/geospatial |
| `server/routers/payment.ts` | Payment processing |
| `server/routers/booking.ts` | Booking flow |
| `server/routers/advancedSearch.ts` | Property search |
| `server/routers/collaborativeFiltering.ts` | ML recommendations |
| `server/services/escrowService.ts` | Escrow management |
| `server/services/stripePaymentService.ts` | Stripe payments |
| `server/services/paymentProviders/StripePaymentProvider.ts` | Stripe provider |
| `server/services/paymentProviders/PaymentProviderFactory.ts` | Provider factory |
| `server/services/fraudDetectionService.ts` | Fraud detection |
| `server/services/offerService.ts` | Offer management |
| `server/jobs/scheduledJobs.ts` | Background jobs |

## Priority 2 — Remaining (80 files)

These files still use `@ts-nocheck`. Fix in order of risk:

### High priority (routers with user-facing data)
- `server/routers/tours.ts`
- `server/routers/virtualTours.ts`
- `server/routers/landRecords.ts`
- `server/routers/investorProfile.ts`
- `server/routers/hybridValuation.ts`
- `server/routers/marketTrends.ts`
- `server/routers/recommendations.ts`
- `server/routers/smartRecommendations.ts`
- `server/routers/zestimate.ts`
- `server/routers/pricing.ts`
- `server/routers/currency.ts`
- `server/routers/currencyHistory.ts`
- `server/routers/exchangeRateAlerts.ts`
- `server/routers/alertManagementRouter.ts`
- `server/routers/gnn.ts`
- `server/routers/governmentRegistry.ts`

### Medium priority (services)
- `server/services/appointmentService.ts`
- `server/services/approvalService.ts`
- `server/services/competitorInsightsService.ts`
- `server/services/competitorTrackingService.ts`
- `server/services/gnnService.ts`
- `server/services/mlTrainingPipeline.ts`
- `server/services/offerAnalyticsService.ts`
- `server/services/postgis.ts`
- `server/services/reEngagementService.ts`
- `server/services/recommendationDigest.ts`
- `server/services/scheduledCampaignService.ts`
- `server/services/valuationMonitoring.ts`
- `server/services/paymentProviders/FlutterwavePaymentProvider.ts`
- `server/services/paymentProviders/MojalooPaymentProvider.ts`
- `server/services/paymentProviders/PaystackPaymentProvider.ts`
- `server/services/paymentProviders/TigerBeetlePaymentProvider.ts`
- `server/services/fraudDetection/MLFraudDetectionService.ts`
- `server/services/fraudDetection/MLflowTrainingService.ts`
- `server/services/geospatial/GeospatialValidationService.ts`

### Lower priority (analytics, email, monitoring)
- All remaining files in `server/routers/email*.ts`
- `server/routers/abTesting.ts`
- `server/routers/feedbackAnalytics.ts`
- `server/routers/monitoring.ts`
- `server/routers/monitoringRouter.ts`
- `server/routers/mlTraining.ts`
- `server/jobs/dailyPriceCheck.ts`
- `server/jobs/valuationAlertScheduler.ts`
- `server/jobs/valuationMonitoringJob.ts`
- `server/schedulers/competitorTrackingScheduler.ts`
- `server/monitoring-db.ts`
- `server/pushNotificationService.ts`

## How to fix a file

1. Remove the `// @ts-nocheck` comment at the top of the file.
2. Run `pnpm run check` to see all type errors in that file.
3. Fix errors by:
   - Adding proper type annotations
   - Using type guards (`if (x instanceof Error)`)
   - Using optional chaining (`x?.y`)
   - Adding `as unknown as T` only as a last resort (document why)
4. Do NOT re-add `@ts-nocheck` — use `// @ts-ignore` with a comment on specific lines if truly unavoidable.
5. Commit the fix as a separate commit: `fix(types): remove @ts-nocheck from <filename>`
