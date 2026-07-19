# Government Registry Integration

This directory contains the implementation for integrating with Nigerian state land registries.

## Structure

```
governmentRegistry/
├── base/
│   ├── GovernmentRegistryClient.ts    # Base client with common functionality
│   ├── types.ts                        # Shared TypeScript interfaces
│   └── errors.ts                       # Custom error classes
├── implementations/
│   ├── LagosRegistryClient.ts          # Lagos State implementation
│   ├── FCTRegistryClient.ts            # FCT Abuja implementation
│   ├── RiversRegistryClient.ts         # Rivers State implementation
│   ├── KanoRegistryClient.ts           # Kano State implementation
│   └── OyoRegistryClient.ts            # Oyo State implementation
├── RegistryFactory.ts                  # Factory to instantiate clients
├── RegistryAggregator.ts               # Aggregate results from multiple registries
└── README.md                           # This file
```

## Usage

### Basic Usage

```typescript
import { RegistryFactory } from './RegistryFactory';

// Get a client for a specific state
const lagosClient = RegistryFactory.getClient('LAGOS');

// Verify a Certificate of Occupancy
const result = await lagosClient.verifyCofO('LG-COFO-2024-12345');

console.log(`C of O is ${result.isValid ? 'valid' : 'invalid'}`);
console.log(`Verification Score: ${result.verificationScore}/100`);
```

### Aggregated Verification

```typescript
import { RegistryAggregator } from './RegistryAggregator';

// Verify across multiple registries for consensus
const aggregator = new RegistryAggregator();
const result = await aggregator.verifyCofOAcrossStates('LG-COFO-2024-12345', ['LAGOS', 'FCT']);

console.log(`Consensus: ${result.consensus.isValid ? 'Valid' : 'Invalid'}`);
console.log(`Confidence: ${result.consensus.confidence}%`);
```

### Get Land Record

```typescript
const landRecord = await lagosClient.getLandRecord('LG-P-2024-001');

console.log(`Owner: ${landRecord.currentOwner.name}`);
console.log(`Land Size: ${landRecord.landSize} ${landRecord.landSizeUnit}`);
console.log(`Registration Date: ${landRecord.registrationDate}`);
```

### Get Ownership History

```typescript
const history = await lagosClient.getOwnershipHistory('LG-P-2024-001');

history.forEach((record, index) => {
  console.log(`Transfer ${index + 1}:`);
  console.log(`  Date: ${record.transferDate}`);
  console.log(`  From: ${record.fromOwner}`);
  console.log(`  To: ${record.toOwner}`);
  console.log(`  Type: ${record.transferType}`);
});
```

## Configuration

Set the following environment variables for each state:

```bash
# Lagos State
LAGOS_REGISTRY_CLIENT_ID=your_client_id
LAGOS_REGISTRY_CLIENT_SECRET=your_client_secret
LAGOS_REGISTRY_API_KEY=your_api_key
LAGOS_REGISTRY_BASE_URL=https://api.lagoslandbureau.gov.ng/v1

# FCT Abuja
FCT_REGISTRY_API_KEY=your_api_key
FCT_REGISTRY_ORG_ID=your_org_id
FCT_REGISTRY_BASE_URL=https://api.fct.gov.ng/land-registry/v1

# ... (similar for other states)
```

## Implementation Status

| State | Status | Features |
|-------|--------|----------|
| Lagos | 🚧 Planned | C of O verification, Land records, Ownership history |
| FCT Abuja | 🚧 Planned | C of O verification, Land records, Ownership history |
| Rivers | 🚧 Planned | C of O verification, Land records |
| Kano | 🚧 Planned | C of O verification, Land records |
| Oyo | 🚧 Planned | C of O verification, Land records |

## Error Handling

All clients throw `RegistryError` objects with the following structure:

```typescript
{
  code: string;           // Error code
  message: string;        // Human-readable message
  state: string;          // State identifier
  timestamp: Date;        // When error occurred
  retryable: boolean;     // Whether request can be retried
  fallbackAvailable: boolean; // Whether fallback mechanism exists
  originalError?: any;    // Original error object
}
```

## Rate Limiting

Each client implements rate limiting according to the state's API limits:

- Lagos: 100 requests/minute
- FCT: 50 requests/minute
- Rivers: 30 requests/minute
- Kano: 40 requests/minute
- Oyo: 60 requests/minute

Requests are automatically queued and processed within rate limits.

## Caching

Verification results are cached for 1 hour by default. Configure via:

```bash
REGISTRY_CACHE_TTL=3600  # seconds
```

## Testing

Run tests with:

```bash
npm test -- server/services/governmentRegistry
```

## Future Enhancements

1. Add support for more states
2. Implement webhook handlers for async verification
3. Add bulk verification endpoints
4. Integrate with blockchain for immutable records
5. Add machine learning for fraud detection

## Support

For issues or questions, contact the platform development team.
