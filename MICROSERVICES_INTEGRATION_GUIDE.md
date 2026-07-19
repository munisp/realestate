# Microservices Integration Guide

Complete guide for integrating TypeScript application with Go/Python microservices and lakehouse analytics.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Service Clients](#service-clients)
3. [Kafka Event Publishing](#kafka-event-publishing)
4. [Usage Examples](#usage-examples)
5. [Deployment](#deployment)
6. [Monitoring](#monitoring)

---

## Architecture Overview

### Integration Layers

```
┌──────────────────────────────────────────────────────────────┐
│                    TypeScript Frontend (React)                │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│              TypeScript Backend (Express + tRPC)              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │          Service Clients (serviceClients.ts)           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │ HTTP Clients │  │ gRPC Clients │  │ Kafka Pub    │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────┬─────────────┬─────────────┬──────────────┬────────┘
           │             │             │              │
    ┌──────▼──────┐ ┌───▼────┐  ┌────▼─────┐  ┌─────▼──────┐
    │  Python AI  │ │ Go     │  │ Kafka    │  │ PostGIS    │
    │  Services   │ │ Services│  │ Topics   │  │ Geospatial │
    │  (HTTP)     │ │ (gRPC) │  │          │  │            │
    └─────────────┘ └────────┘  └────┬─────┘  └────────────┘
                                      │
                        ┌─────────────▼──────────────┐
                        │   Lakehouse (Delta Lake)   │
                        │  ┌────────┐  ┌────────┐    │
                        │  │ Bronze │→ │ Silver │→   │
                        │  └────────┘  └────┬───┘    │
                        │                   ▼        │
                        │              ┌────────┐    │
                        │              │  Gold  │    │
                        │              └────────┘    │
                        └────────────────────────────┘
```

---

## Service Clients

### Installation

Dependencies are already installed:
```bash
pnpm add @grpc/grpc-js @grpc/proto-loader kafkajs axios
```

### Python Service Clients (HTTP/REST)

#### ML Valuation Service

```typescript
import { mlValuationClient } from '../server/_core/serviceClients';

// Valuate a single property
const valuation = await mlValuationClient.valuateProperty({
  propertyId: 'prop_123',
  features: {
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    location: {
      lat: 37.7749,
      lng: -122.4194
    },
    propertyType: 'single_family',
    yearBuilt: 2010,
    lotSize: 5000
  }
});

console.log('Estimated Value:', valuation.estimatedValue);
console.log('Confidence:', valuation.confidence);
console.log('Price Range:', valuation.priceRange);
console.log('Comparables:', valuation.comparables);

// Batch valuate multiple properties
const valuations = await mlValuationClient.batchValuate([
  { propertyId: 'prop_1', features: {...} },
  { propertyId: 'prop_2', features: {...} },
]);

// Get market trends
const trends = await mlValuationClient.getMarketTrends('san-francisco', '6months');
```

#### OCR Service

```typescript
import { ocrClient } from '../server/_core/serviceClients';

// Process a document
const result = await ocrClient.processDocument({
  documentUrl: 'https://storage.example.com/docs/id_front.jpg',
  documentType: 'id',
  extractFace: true
});

console.log('Extracted Data:', result.structuredData);
console.log('Confidence:', result.confidence);

// Verify face match
const verification = await ocrClient.verifyFaceMatch(
  result.documentId,
  'https://storage.example.com/selfies/user_123.jpg'
);

console.log('Face Match:', verification.match);
console.log('Similarity:', verification.similarity);
```

#### Fraud Detection Service

```typescript
import { fraudDetectionClient } from '../server/_core/serviceClients';

// Check a transaction for fraud
const fraudCheck = await fraudDetectionClient.checkTransaction({
  userId: 'user_123',
  transactionId: 'txn_456',
  amount: 500000,
  transactionType: 'purchase',
  metadata: {
    ipAddress: '192.168.1.1',
    deviceId: 'device_789',
    location: {
      lat: 37.7749,
      lng: -122.4194
    }
  }
});

console.log('Risk Score:', fraudCheck.riskScore);
console.log('Risk Level:', fraudCheck.riskLevel);
console.log('Recommendation:', fraudCheck.recommendation);
console.log('Flags:', fraudCheck.flags);

// Get user risk profile
const profile = await fraudDetectionClient.getUserRiskProfile('user_123');
console.log('Overall Risk Score:', profile.overallRiskScore);
```

#### Geospatial Service

```typescript
import { geospatialClient } from '../server/_core/serviceClients';

// Search properties nearby
const nearby = await geospatialClient.searchNearby({
  center: {
    lat: 37.7749,
    lng: -122.4194
  },
  radius: 5000, // 5km
  filters: {
    propertyType: ['single_family', 'condo'],
    priceRange: {
      min: 300000,
      max: 800000
    },
    bedrooms: 3
  },
  limit: 50
});

console.log('Found Properties:', nearby.properties.length);
console.log('Total:', nearby.total);

// Search within polygon
const polygon = [
  { lat: 37.7749, lng: -122.4194 },
  { lat: 37.7849, lng: -122.4094 },
  { lat: 37.7649, lng: -122.4094 },
];
const inPolygon = await geospatialClient.searchPolygon(polygon);

// Get heatmap data
const heatmap = await geospatialClient.getHeatmap({
  north: 37.8,
  south: 37.7,
  east: -122.3,
  west: -122.5
}, 8); // H3 resolution

// Get neighborhood statistics
const stats = await geospatialClient.getNeighborhoodStats('8928308280fffff');
console.log('Average Price:', stats.averagePrice);
console.log('Price per sqft:', stats.pricePerSqft);
```

### Go Service Clients (gRPC)

#### Payment Service

```typescript
import { paymentClient } from '../server/_core/serviceClients';

// Process a payment
const payment = await paymentClient.processPayment({
  userId: 'user_123',
  amount: 1000,
  currency: 'USD',
  paymentMethod: 'stripe'
});

console.log('Transaction ID:', payment.transactionId);
console.log('Status:', payment.success);
```

**Note**: Full gRPC implementation requires `.proto` files. Current implementation is a placeholder.

---

## Kafka Event Publishing

### Connect to Kafka

```typescript
import { kafkaPublisher } from '../server/_core/kafkaPublisher';

// Connect (happens automatically on first publish)
await kafkaPublisher.connect();
```

### Publish Events

#### Property Events

```typescript
// Property created
await kafkaPublisher.publishPropertyCreated({
  propertyId: 'prop_123',
  userId: 'user_456',
  title: 'Beautiful 3BR Home',
  description: 'Spacious home in great neighborhood',
  price: 500000,
  location: {
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    lat: 37.7749,
    lng: -122.4194
  },
  features: {
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    propertyType: 'single_family',
    yearBuilt: 2010
  }
});

// Property updated
await kafkaPublisher.publishPropertyUpdated({
  propertyId: 'prop_123',
  userId: 'user_456',
  changes: {
    price: 480000,
    description: 'Updated description'
  },
  previousValues: {
    price: 500000,
    description: 'Old description'
  }
});
```

#### User Events

```typescript
// User registered
await kafkaPublisher.publishUserRegistered({
  userId: 'user_123',
  email: 'john@example.com',
  name: 'John Doe',
  role: 'user',
  registrationMethod: 'oauth'
});
```

#### Transaction Events

```typescript
// Transaction completed
await kafkaPublisher.publishTransactionCompleted({
  transactionId: 'txn_789',
  propertyId: 'prop_123',
  buyerId: 'user_456',
  sellerId: 'user_789',
  amount: 500000,
  currency: 'USD',
  completedAt: new Date().toISOString()
});
```

#### Valuation Events

```typescript
// Valuation requested
await kafkaPublisher.publishValuationRequested({
  valuationId: 'val_123',
  propertyId: 'prop_456',
  requestedBy: 'user_789',
  features: {
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800
  }
});
```

---

## Usage Examples

### Example 1: Property Creation with Full Integration

```typescript
import { protectedProcedure } from '../server/_core/trpc';
import { kafkaPublisher } from '../server/_core/kafkaPublisher';
import { mlValuationClient, geospatialClient } from '../server/_core/serviceClients';
import { z } from 'zod';

export const propertyRouter = router({
  create: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string(),
      price: z.number(),
      location: z.object({
        address: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        lat: z.number(),
        lng: z.number(),
      }),
      features: z.object({
        bedrooms: z.number(),
        bathrooms: z.number(),
        sqft: z.number(),
        propertyType: z.string(),
        yearBuilt: z.number().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Create property in database
      const property = await db.createProperty({
        ...input,
        userId: ctx.user.id,
      });

      // 2. Get ML valuation
      const valuation = await mlValuationClient.valuateProperty({
        propertyId: property.id,
        features: input.features,
        location: input.location,
      });

      // 3. Index in geospatial service
      await geospatialClient.indexProperty({
        propertyId: property.id,
        location: input.location,
      });

      // 4. Publish event to Kafka (flows to lakehouse)
      await kafkaPublisher.publishPropertyCreated({
        propertyId: property.id,
        userId: ctx.user.id,
        ...input,
      });

      return {
        property,
        valuation,
      };
    }),
});
```

### Example 2: Document Verification with OCR

```typescript
import { ocrClient, fraudDetectionClient } from '../server/_core/serviceClients';

export const verificationRouter = router({
  verifyIdentity: protectedProcedure
    .input(z.object({
      documentUrl: z.string(),
      selfieUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Extract data from ID document
      const ocrResult = await ocrClient.processDocument({
        documentUrl: input.documentUrl,
        documentType: 'id',
        extractFace: true,
      });

      // 2. Verify face match
      const faceMatch = await ocrClient.verifyFaceMatch(
        ocrResult.documentId,
        input.selfieUrl
      );

      // 3. Run fraud check
      const fraudCheck = await fraudDetectionClient.checkTransaction({
        userId: ctx.user.id,
        transactionId: `verify_${Date.now()}`,
        amount: 0,
        transactionType: 'verification',
        metadata: {
          documentType: 'id',
          faceMatchScore: faceMatch.similarity,
        },
      });

      // 4. Save verification result
      await db.saveVerification({
        userId: ctx.user.id,
        documentData: ocrResult.structuredData,
        faceMatch: faceMatch.match,
        fraudScore: fraudCheck.riskScore,
        verified: faceMatch.match && fraudCheck.riskLevel !== 'critical',
      });

      return {
        verified: faceMatch.match && fraudCheck.riskLevel !== 'critical',
        confidence: ocrResult.confidence,
        faceMatch: faceMatch.match,
        riskLevel: fraudCheck.riskLevel,
      };
    }),
});
```

### Example 3: Geospatial Search

```typescript
import { geospatialClient } from '../server/_core/serviceClients';

export const searchRouter = router({
  searchNearby: publicProcedure
    .input(z.object({
      lat: z.number(),
      lng: z.number(),
      radius: z.number(),
      filters: z.object({
        priceRange: z.object({
          min: z.number(),
          max: z.number(),
        }).optional(),
        bedrooms: z.number().optional(),
        propertyType: z.array(z.string()).optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      // Search using geospatial service
      const results = await geospatialClient.searchNearby({
        center: {
          lat: input.lat,
          lng: input.lng,
        },
        radius: input.radius,
        filters: input.filters,
        limit: 50,
      });

      // Enrich with database data
      const propertyIds = results.properties.map(p => p.id);
      const properties = await db.getPropertiesByIds(propertyIds);

      return {
        properties: properties.map(p => ({
          ...p,
          distance: results.properties.find(r => r.id === p.id)?.distance,
        })),
        total: results.total,
      };
    }),
});
```

---

## Deployment

### 1. Start Infrastructure Services

```bash
# Start all services with Docker Compose
cd /home/ubuntu/realestate-platform
docker-compose up -d

# Or start specific services
docker-compose up -d kafka redis postgres mysql

# Start Python AI services
docker-compose up -d ml-valuation-service ocr-service fraud-detection-service

# Start Go services
docker-compose up -d payment-service notification-service image-service
```

### 2. Verify Services

```bash
# Check service health
docker-compose ps

# View logs
docker-compose logs -f ml-valuation-service
docker-compose logs -f kafka

# Test Kafka
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

### 3. Configure Environment Variables

Add to `.env`:
```bash
# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=realestate-platform

# Python Services
ML_VALUATION_SERVICE_URL=http://localhost:5000
OCR_SERVICE_URL=http://localhost:5001
FRAUD_DETECTION_SERVICE_URL=http://localhost:5002
GEOSPATIAL_SERVICE_URL=http://localhost:5003

# Go Services
PAYMENT_SERVICE_HOST=localhost
PAYMENT_SERVICE_PORT=50051
PAYMENT_SERVICE_HTTP_PORT=8080

NOTIFICATION_SERVICE_HOST=localhost
NOTIFICATION_SERVICE_PORT=50052
NOTIFICATION_SERVICE_HTTP_PORT=8081

IMAGE_SERVICE_HOST=localhost
IMAGE_SERVICE_PORT=50053
IMAGE_SERVICE_HTTP_PORT=8082
```

### 4. Start Lakehouse (Optional)

```bash
# Start lakehouse services
cd lakehouse
docker-compose -f docker-compose.lakehouse.yml up -d

# Start Flink for real-time processing
docker-compose -f docker-compose.lakehouse.yml up -d flink-jobmanager flink-taskmanager

# Start Spark for batch processing
docker-compose -f docker-compose.lakehouse.yml up -d spark-master spark-worker
```

---

## Monitoring

### Service Health Checks

```typescript
// Add health check endpoint
export const healthRouter = router({
  checkServices: protectedProcedure
    .query(async () => {
      const checks = {
        mlValuation: false,
        ocr: false,
        fraudDetection: false,
        geospatial: false,
        kafka: false,
      };

      try {
        await mlValuationClient.getMarketTrends('test', '1month');
        checks.mlValuation = true;
      } catch (e) {}

      try {
        await kafkaPublisher.connect();
        checks.kafka = true;
      } catch (e) {}

      // ... other checks

      return checks;
    }),
});
```

### Metrics

- **Kafka**: Monitor lag, throughput, error rates
- **Services**: Monitor response times, error rates, availability
- **Lakehouse**: Monitor data freshness, processing lag

---

## Troubleshooting

### Service Not Responding

```bash
# Check if service is running
docker-compose ps ml-valuation-service

# Check logs
docker-compose logs ml-valuation-service

# Restart service
docker-compose restart ml-valuation-service
```

### Kafka Connection Issues

```bash
# Check Kafka is running
docker-compose ps kafka

# Check topics
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# View consumer groups
docker-compose exec kafka kafka-consumer-groups --list --bootstrap-server localhost:9092
```

### Geospatial Queries Failing

```bash
# Check PostGIS is running
docker-compose ps postgres

# Connect to PostGIS
docker-compose exec postgres psql -U postgres -d realestate

# Check PostGIS extension
SELECT PostGIS_version();
```

---

## Next Steps

1. **Deploy APIsix Gateway**: Route all traffic through API gateway
2. **Add Dapr Service Mesh**: Implement service discovery and resilience
3. **Set up Monitoring**: Deploy Prometheus + Grafana
4. **Implement Lakehouse**: Start Bronze/Silver/Gold data pipeline
5. **Add Temporal**: Orchestrate long-running workflows

---

**Last Updated**: November 17, 2025  
**Version**: 1.0
