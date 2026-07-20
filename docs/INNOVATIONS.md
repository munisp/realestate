# Platform Innovations

This document describes the 10 innovations implemented in this release, their architecture, configuration, and usage.

---

## Innovation 1: AI-Powered Property Valuation Chat

**Router:** `server/routers/valuationChat.ts`

An interactive streaming chat interface powered by a local Ollama LLM that answers property valuation questions in real time. The model is grounded with live market data from the database — comparable sales, price per sqm trends, and neighbourhood averages — before generating its response. This prevents hallucination and ensures answers are specific to the Nigerian market.

| Feature | Detail |
|---|---|
| Model | Ollama `llama3.2` (configurable via `OLLAMA_MODEL`) |
| Streaming | Server-Sent Events via tRPC subscription |
| Context window | Last 10 messages + live market data |
| Fallback | Returns static valuation estimate if Ollama unavailable |

**Key procedures:** `startSession`, `sendMessage`, `getHistory`, `getQuickValuation`

---

## Innovation 2: Real-Time Collaborative Property Comparison Board

**Router:** `server/routers/collaborativeBoard.ts`

Multiple users (e.g., a couple, a family, an investment team) can compare properties on a shared board simultaneously. Changes sync in real time via WebSocket. The board uses a CRDT-inspired last-write-wins merge strategy so concurrent edits never conflict.

| Feature | Detail |
|---|---|
| Sync | WebSocket broadcast via `realtimeRouter` |
| Conflict resolution | Last-write-wins with vector clock timestamps |
| Max properties per board | 10 |
| Sharing | Public share link with optional password |

**Key procedures:** `createBoard`, `addProperty`, `removeProperty`, `updateNotes`, `getBoard`, `shareBoard`

---

## Innovation 3: Predictive Maintenance Scoring Engine

**Router:** `server/routers/maintenanceScore.ts`

Calculates a 0–100 health score for each property by modelling the age and expected lifespan of 6 building systems (roof, plumbing, electrical, structure, HVAC, finishes) against Nigerian climate conditions and construction standards. Outputs a per-system breakdown, 5-year cost forecast (inflation-adjusted at 8%/year), and a valuation impact estimate.

| System | Expected Lifespan | Replacement Cost Basis |
|---|---|---|
| Roof | 20 years (tropical) | ₦15,000/m² |
| Plumbing | 30 years | ₦8,000/m² |
| Electrical | 25 years | ₦10,000/m² |
| Structure | 60 years | ₦45,000/m² |
| HVAC | 15 years | ₦5,000/m² |
| Finishes | 10 years | ₦12,000/m² |

**Key procedures:** `getScore`, `batchScores`, `submitInspectionReport`, `getCostForecast`

---

## Innovation 4: Blockchain-Anchored Document Notarization

**Router:** `server/routers/documentNotarization.ts`

Creates tamper-proof, timestamped proof-of-existence for property documents (title deeds, survey plans, sale agreements) by anchoring SHA-256 hashes to a public blockchain. The raw document never leaves the client — only its hash is submitted.

**Anchor modes:**
- **Blockchain (primary):** Polygon Mumbai/Mainnet via Infura — requires `INFURA_POLYGON_URL` and `NOTARY_WALLET_PRIVATE_KEY`
- **Merkle tree (fallback):** Batches hashes into a Merkle root stored in PostgreSQL — works offline

**Key procedures:** `notarize`, `verify`, `getById`, `listForProperty`, `listMine`

---

## Innovation 5: Smart Price-Drop Alert with ML Confidence Score

**Router:** `server/routers/smartPriceAlert.ts`

Goes beyond simple "price changed" notifications by scoring each price drop 0–100 based on 6 signals: drop magnitude, days on market, price vs. market average, location tier, social signals (saves/views), and seller behaviour history. Alerts are tiered as **hot** (≥80), **good** (≥65), **watch** (≥45), or **skip**.

**Key procedures:** `scoreDropEvent`, `subscribeToAlerts`, `getHotDeals`, `getPriceHistory`, `getMySubscriptions`

---

## Innovation 6: AR/3D Virtual Staging Metadata API

**Router:** `server/routers/arVirtualStaging.ts`

Enables agents and sellers to create AR-ready virtual staging scenes for empty properties. The API manages Three.js/React Three Fiber scene descriptors (JSON) describing furniture placement, materials, and lighting. An AI layout suggester (Ollama) recommends furniture arrangements based on room dimensions and style preference.

**Furniture catalog:** 10 pieces with Nigerian/African style options, priced in NGN.

**Key procedures:** `getCatalog`, `createScene`, `getScene`, `updateScene`, `suggestLayout`, `exportGltfDescriptor`

---

## Innovation 7: Neighbourhood Livability Score Aggregator

**Router:** `server/routers/livabilityScore.ts`

Fuses data from OpenStreetMap (live), user-submitted ratings, and property price trends to produce a comprehensive 0–100 livability score across 8 dimensions. Results are cached for 24 hours per location.

| Dimension | Weight | Data Source |
|---|---|---|
| Safety & Security | 20% | User ratings |
| Healthcare Access | 15% | OpenStreetMap |
| Education Quality | 12% | OpenStreetMap |
| Transport & Connectivity | 15% | OpenStreetMap |
| Shopping & Amenities | 13% | OpenStreetMap |
| Environmental Quality | 10% | OpenStreetMap |
| Infrastructure Reliability | 8% | User ratings |
| Investment Potential | 7% | Property listings |

**Key procedures:** `getScore`, `getScoreForProperty`, `submitRating`, `compareLocations`

---

## Innovation 8: Automated Lease/Contract Clause Risk Analyser

**Router:** `server/routers/contractRiskAnalyser.ts`

Analyses property contracts and lease agreements for risky, unusual, or unfair clauses using a two-pass approach: fast regex pattern matching for known red flags, followed by LLM analysis (Ollama) for contextual understanding. Outputs a structured risk report with plain-English explanations and suggested revisions.

**Risk levels:** `safe` → `caution` → `high_risk` → `red_flag`

**Known red flag patterns include:** rights waivers, blanket liability exclusions, eviction without notice, unlimited rent increases, arbitrary deposit forfeiture, unrestricted landlord entry.

> **Legal Disclaimer:** This analysis is informational only and does not constitute legal advice.

**Key procedures:** `analyseContract`, `getAnalysis`, `listMine`, `getCommonRisks`

---

## Innovation 9: Carbon Footprint Calculator

**Router:** `server/routers/carbonFootprint.ts`

Calculates the estimated annual carbon footprint (kg CO₂e) of living in a property, covering home energy (grid + generator), daily commute, embodied carbon, and pool emissions. Uses Nigeria-specific emission factors (NERC grid data, IPCC).

| Factor | Emission Factor |
|---|---|
| Nigeria grid | 0.431 kg CO₂e/kWh |
| Diesel generator | 0.702 kg CO₂e/kWh |
| Petrol car | 0.192 kg CO₂e/km |
| BRT/bus | 0.089 kg CO₂e/km/passenger |
| Motorcycle (okada) | 0.103 kg CO₂e/km |

**Key procedures:** `calculate`, `compareProperties`, `getAverageByCity`

---

## Innovation 10: Federated Identity Wallet (DID/VC)

**Router:** `server/routers/identityWallet.ts`

Implements a W3C-compliant Decentralised Identity (DID) wallet enabling self-sovereign identity for platform users. Users hold cryptographic credentials (Verifiable Credentials) that they can selectively disclose to counterparties without revealing unnecessary personal data.

**Supported credential types:**

| Credential | Issuer | Required For |
|---|---|---|
| KYC Verified | Platform | High-value transactions, mortgage |
| Agent Licence | Agent Registry | Listing properties |
| Income Proof | Partner Banks | Mortgage application |
| NIN Verified | NIMC | Full KYC |
| Property Ownership | Platform | Selling, refinancing |
| FMBN Eligible | FMBN | NHF mortgage |

**Key procedures:** `getOrCreateDID`, `getWallet`, `issueKYCCredential`, `issuePropertyOwnershipCredential`, `createPresentation`, `verifyPresentation`, `revokeCredential`

---

## Supporting Enhancements

### Cursor-Based Pagination (`server/_core/pagination.ts`)
Replaces offset pagination with O(1) cursor-based pagination. Use `paginate()` or `paginatedQuery()` in any router. Cursors are base64url-encoded and opaque to clients.

### Request Deduplication (`server/_core/requestDedup.ts`)
Wraps critical mutations with idempotency key checking. Clients send `X-Idempotency-Key: <uuid>` to prevent double-processing on retries. Keys expire after 24 hours.

### Image CDN (`server/_core/imageCdn.ts`)
Unified image URL builder supporting Cloudflare Images, imgproxy (self-hosted), and S3/MinIO fallback. Use `getPropertyImageSet()` to generate thumbnail, card, hero, srcSet, and blur placeholder URLs in one call.

---

## Environment Variables

See `.env.production.example` for all required and optional variables. Key additions for innovations:

```
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2
INFURA_POLYGON_URL=
NOTARY_WALLET_PRIVATE_KEY=
PLATFORM_DID=did:key:zPlatformRealEstateNG
CLOUDFLARE_IMAGES_ACCOUNT_ID=
CLOUDFLARE_IMAGES_DELIVERY_URL=
IMGPROXY_URL=
```

## Database Migrations

Run in order:
```bash
psql $DATABASE_URL -f drizzle/migrations/0006_innovations.sql
psql $DATABASE_URL -f drizzle/migrations/0007_enhancements.sql
```
