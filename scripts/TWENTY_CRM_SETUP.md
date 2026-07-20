# Twenty CRM Setup Guide — Nigerian Real Estate Platform

## Overview

This guide documents the complete Twenty CRM configuration for the RealEstate.NG platform. The setup script (`setup-twenty-crm.py`) automates the creation of all custom objects, fields, pipeline stages, views, and workflow automations via the Twenty CRM Metadata API.

---

## Prerequisites

| Requirement | Details |
|---|---|
| Twenty CRM instance | Cloud (`https://api.twenty.com`) or self-hosted |
| API Key | Settings → API & Webhooks → Generate API Key |
| Python 3.9+ | `pip install requests` |
| Environment Variables | `TWENTY_API_KEY`, `TWENTY_CRM_URL`, `PLATFORM_API_URL` |

---

## Quick Start

```bash
# 1. Set environment variables
export TWENTY_API_KEY=your_api_key_here
export TWENTY_CRM_URL=https://api.twenty.com   # or your self-hosted URL
export PLATFORM_API_URL=https://your-platform.com

# 2. Preview all API calls (no changes made)
python3 scripts/setup-twenty-crm.py --dry-run

# 3. Run the full setup
python3 scripts/setup-twenty-crm.py

# 4. Run a specific phase only
python3 scripts/setup-twenty-crm.py --phase 5   # workflows only
```

---

## Custom Objects Created

### 1. Property Lead (`propertyLead`)
Tracks buyer/renter leads with Nigerian market-specific fields.

| Field | Type | Description |
|---|---|---|
| Lead Score | NUMBER | 0–100 AI-computed quality score |
| Budget (₦) | CURRENCY | Buyer's budget in Naira |
| Budget (USD) | NUMBER | For diaspora buyers |
| Preferred City | TEXT | e.g. Lagos, Abuja |
| Preferred Area | TEXT | e.g. Lekki Phase 1 |
| Property Type | SELECT | apartment, duplex, bungalow, land, commercial, terrace |
| Bedrooms | NUMBER | Required bedroom count |
| Is Diaspora | BOOLEAN | Overseas Nigerian buyer flag |
| Diaspora Country | TEXT | Country of residence |
| Preferred Currency | SELECT | NGN, USD, GBP, EUR, CAD |
| Lead Source | SELECT | website, referral, WhatsApp, diaspora event, etc. |
| Last Contacted | DATE_TIME | Last agent contact date |
| Next Follow-Up | DATE_TIME | Scheduled follow-up date |
| Platform Property ID | NUMBER | ID in the realestate platform DB |
| Escrow Ready | BOOLEAN | Has completed KYC for escrow |
| Notes | RICH_TEXT | Agent notes |

### 2. Property Showing (`propertyShowing`)
Manages all property viewing appointments.

| Field | Type | Description |
|---|---|---|
| Showing Date | DATE_TIME | Scheduled date and time |
| Showing Type | SELECT | Physical, Virtual Tour, Video Call, AR Walkthrough |
| Property Address | TEXT | Full address |
| Status | SELECT | scheduled, confirmed, completed, cancelled, no_show, rescheduled |
| Feedback Rating | NUMBER | Buyer rating 1–5 |
| Offer Made | BOOLEAN | Did buyer make an offer? |
| Offer Amount (₦) | CURRENCY | Offer amount in Naira |
| Duration (min) | NUMBER | Showing duration |

### 3. Agent Commission (`agentCommission`)
Tracks all agent commissions with Nigerian tax compliance.

| Field | Type | Description |
|---|---|---|
| Sale Price (₦) | CURRENCY | Final transaction price |
| Commission Rate (%) | NUMBER | Default 3% |
| Commission (₦) | CURRENCY | Gross commission |
| VAT (₦) | CURRENCY | 7.5% VAT on commission |
| Net Commission (₦) | CURRENCY | After VAT |
| Status | SELECT | pending, approved, paid, disputed, cancelled |
| Transaction Type | SELECT | sale, rental, off-plan |
| Payment Reference | TEXT | Bank/Flutterwave reference |

### 4. Agent KYC (`agentKyc`)
Manages agent identity verification workflow.

| Field | Type | Description |
|---|---|---|
| NIN | TEXT | National Identification Number |
| BVN | TEXT | Bank Verification Number |
| NIESV Number | TEXT | Professional body registration |
| CAC Number | TEXT | Corporate Affairs Commission |
| NIN Verified | BOOLEAN | Verified via Prembly API |
| BVN Verified | BOOLEAN | Verified via Prembly API |
| Badge Tier | SELECT | unverified, basic, verified, premium |
| Trust Score | NUMBER | 0–100 computed score |
| Verification Status | SELECT | pending, in_review, verified, rejected, expired |
| Listing Limit | NUMBER | Max active listings allowed |
| Expires At | DATE_TIME | Re-verify after 1 year |

### 5. Escrow Transaction (`escrowTransaction`)
Tracks all property transactions in escrow with milestone management.

| Field | Type | Description |
|---|---|---|
| Escrow ID | TEXT | Platform escrow reference |
| Purchase Price (₦) | CURRENCY | Agreed price |
| Escrow Balance (₦) | CURRENCY | Current balance |
| Status | SELECT | awaiting_deposit, funded, milestone_review, releasing, completed, disputed, refunded |
| Current Milestone | TEXT | Active milestone name |
| Milestones Completed | NUMBER | Released milestones count |
| Is Diaspora | BOOLEAN | Overseas buyer flag |
| Foreign Currency | TEXT | USD/GBP/EUR |
| Exchange Rate | NUMBER | NGN rate at transaction time |
| Drone Verified | BOOLEAN | Milestone verified by drone CV |

### 6. Diaspora Buyer (`diasporaBuyer`)
Dedicated profile for overseas Nigerian investors.

| Field | Type | Description |
|---|---|---|
| Country of Residence | TEXT | Current country |
| Preferred Currency | TEXT | USD, GBP, EUR, CAD |
| Budget (Foreign) | NUMBER | Budget in foreign currency |
| KYC Status | SELECT | pending, in_review, verified, rejected |
| Escrow Enabled | BOOLEAN | Has completed KYC |
| Investment Purpose | SELECT | personal use, rental income, capital appreciation, retirement, family gift |
| Trusted Agent ID | NUMBER | Assigned agent in Nigeria |

### 7. Property Listing (`propertyListing`)
Mirrors platform listings in CRM for agent management.

| Field | Type | Description |
|---|---|---|
| Platform ID | NUMBER | ID in platform DB |
| Price (₦) | CURRENCY | Listing price |
| Badge Tier | SELECT | unverified, basic, verified, premium |
| Trust Score | NUMBER | 0–100 |
| Title Type | TEXT | C of O, Governor's Consent, etc. |
| Listing Status | SELECT | active, under_offer, sold, rented, withdrawn |
| Days on Market | NUMBER | Auto-computed |
| View Count | NUMBER | Platform view count |

---

## Pipeline Stages (8-Stage Nigerian Real Estate Funnel)

| # | Stage | Colour | Description |
|---|---|---|---|
| 0 | New Enquiry | Gray | Initial contact, unqualified |
| 1 | Qualified Lead | Blue | Budget and intent confirmed |
| 2 | Showing Scheduled | Yellow | Property viewing booked |
| 3 | Showing Completed | Orange | Viewing done, awaiting decision |
| 4 | Offer Made | Purple | Buyer has submitted an offer |
| 5 | Negotiation | Pink | Price/terms being negotiated |
| 6 | Escrow Initiated | Turquoise | Transaction in escrow |
| 7 | Closed Won ✅ | Green | Deal completed |
| 8 | Closed Lost ❌ | Red | Deal fell through |

---

## Views Configured

| View Name | Object | Layout | Filter |
|---|---|---|---|
| 🏠 Sales Pipeline | Opportunities | Kanban | All active |
| 🔥 Hot Leads | Opportunities | Table | Score > 70 or Budget > ₦100M |
| 🌍 Diaspora Buyers | Opportunities | Table | isDiaspora = true |
| 📅 Showings This Week | PropertyShowing | Calendar | This week |
| 💰 Closing This Month | Opportunities | Table | Stage = Offer Made/Negotiation/Escrow |
| 👤 My Leads | Opportunities | Kanban | Assignee = current user |
| 🔒 Active Escrows | EscrowTransaction | Table | Status ≠ completed/refunded |
| 🛡️ KYC Review Queue | AgentKYC | Table | Status = in_review |
| 💼 Commission Tracker | AgentCommission | Table | All commissions |
| 🏢 Property Listings | PropertyListing | Table | All listings |

---

## Workflow Automations

### 1. 🎯 Lead Score on Creation
- **Trigger:** Opportunity created
- **Actions:** Compute lead score (stage + budget bonus), schedule 24h follow-up task
- **Business Rule:** Score = stage base (10–95) + budget bonus (up to +15 for ₦500M+)

### 2. 📅 Auto Follow-Up Sequence
- **Trigger:** Opportunity created
- **Actions:** Wait 24h → check if still New Enquiry → create task; wait 72h → create escalation task
- **Business Rule:** Leads not progressed within 24h get automatic follow-up reminders

### 3. 🌍 Diaspora Buyer Welcome
- **Trigger:** Opportunity created with isDiaspora = true
- **Actions:** Send welcome email, create onboarding task
- **Business Rule:** Diaspora buyers get dedicated onboarding with FX and escrow information

### 4. 🔒 Escrow Milestone Alert
- **Trigger:** EscrowTransaction updated with droneMilestoneVerified = true
- **Actions:** POST webhook to platform API, update Opportunity stage to Escrow Initiated
- **Business Rule:** Drone CV verification automatically triggers escrow milestone release

### 5. 🛡️ KYC Status Change Notification
- **Trigger:** AgentKYC updated to verified or rejected
- **Actions:** POST webhook to platform API with new badge tier and trust score
- **Business Rule:** Platform DB is updated immediately when KYC status changes in Twenty

### 6. ⚠️ Stale Lead Alert
- **Trigger:** Daily at 8:00 AM (CRON)
- **Actions:** Find leads not updated in 14+ days, create stale alert task for each
- **Business Rule:** No lead should go uncontacted for more than 14 days

### 7. 🏆 Deal Won — Commission Calculation
- **Trigger:** Opportunity stage changed to CLOSED_WON
- **Actions:** Calculate 3% commission + 7.5% VAT, create AgentCommission record, notify agent
- **Business Rule:** Nigerian standard 3% commission with 7.5% VAT deduction

### 8. 📋 Showing Completed — Request Feedback
- **Trigger:** PropertyShowing status changed to completed
- **Actions:** Create feedback collection task, POST webhook to platform
- **Business Rule:** Every completed showing triggers a feedback collection workflow

---

## Environment Variables Required

```bash
# Twenty CRM
TWENTY_API_KEY=your_twenty_api_key
TWENTY_CRM_URL=https://api.twenty.com   # or self-hosted URL

# Platform (for webhook callbacks)
PLATFORM_API_URL=https://your-platform.com

# Prembly (for KYC verification)
PREMBLY_API_KEY=your_prembly_key
PREMBLY_APP_ID=your_prembly_app_id
```

---

## Webhook Endpoints (Platform Must Expose)

The following endpoints must be available for Twenty CRM workflows to call back:

| Endpoint | Method | Trigger |
|---|---|---|
| `/api/escrow/milestone-webhook` | POST | Drone CV milestone verified |
| `/api/kyc/status-webhook` | POST | Agent KYC status changed |
| `/api/showings/completed-webhook` | POST | Property showing completed |
| `/api/leads/stage-webhook` | POST | Lead stage changed |

---

## Manual Steps (Twenty UI)

Some configurations require manual setup in the Twenty UI after running the script:

1. **Activate Workflows:** Go to Workflows → each workflow → toggle Active
2. **Set View Filters:** Open each view → Filters → configure per the table above
3. **Enable Kanban:** Open Sales Pipeline view → Options → Layout → Kanban
4. **Set Aggregations:** On Kanban columns → click count → select Sum of Amount
5. **Configure Email:** Settings → Email → connect Gmail/Outlook for workflow emails
6. **Set Webhook URLs:** In workflow HTTP Request steps, update `PLATFORM_API_URL`
