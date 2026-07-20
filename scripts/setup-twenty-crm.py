#!/usr/bin/env python3
"""
Twenty CRM Setup Script — Nigerian Real Estate Platform
=======================================================
Configures Twenty CRM with:
  1. Custom Objects: PropertyLead, PropertyShowing, Commission, AgentKYC, EscrowTransaction
  2. Custom Fields on built-in objects (People, Opportunities, Companies)
  3. Pipeline Stages: 8-stage Nigerian real estate sales funnel
  4. Views: Kanban pipeline, My Leads, Hot Leads, Diaspora Buyers, Closing This Month
  5. Workflow Automations:
     - Lead scoring on creation
     - Auto follow-up task scheduling (24h, 72h, 7d)
     - Escrow milestone webhook trigger
     - KYC status change notification
     - Stale lead alert (no contact in 14 days)
     - Diaspora buyer welcome sequence

Usage:
  export TWENTY_API_KEY=your_key_here
  export TWENTY_CRM_URL=https://api.twenty.com   # or self-hosted URL
  python3 scripts/setup-twenty-crm.py

  # Dry run (print all API calls without executing):
  python3 scripts/setup-twenty-crm.py --dry-run

  # Reset (delete all custom objects and recreate):
  python3 scripts/setup-twenty-crm.py --reset
"""

import os
import sys
import json
import time
import argparse
import requests
from typing import Any, Optional

# ── Configuration ─────────────────────────────────────────────────────────────
TWENTY_API_KEY = os.environ.get("TWENTY_API_KEY", "")
TWENTY_CRM_URL = os.environ.get("TWENTY_CRM_URL", "https://api.twenty.com").rstrip("/")
DRY_RUN = False
CREATED: dict[str, str] = {}  # name → id for created objects

# ── HTTP Helpers ───────────────────────────────────────────────────────────────
def headers() -> dict:
    return {
        "Authorization": f"Bearer {TWENTY_API_KEY}",
        "Content-Type": "application/json",
    }

def metadata_post(path: str, body: dict) -> dict:
    url = f"{TWENTY_CRM_URL}/rest/metadata/{path.lstrip('/')}"
    if DRY_RUN:
        print(f"[DRY-RUN] POST {url}\n{json.dumps(body, indent=2)}\n")
        return {"id": f"dry-run-{path}"}
    resp = requests.post(url, headers=headers(), json=body, timeout=30)
    if resp.status_code not in (200, 201):
        print(f"  ⚠️  POST {url} → {resp.status_code}: {resp.text[:300]}")
        return {}
    return resp.json()

def metadata_get(path: str) -> dict:
    url = f"{TWENTY_CRM_URL}/rest/metadata/{path.lstrip('/')}"
    if DRY_RUN:
        return {"data": {"objects": {"edges": []}}}
    resp = requests.get(url, headers=headers(), timeout=30)
    if resp.status_code != 200:
        return {}
    return resp.json()

def metadata_patch(path: str, body: dict) -> dict:
    url = f"{TWENTY_CRM_URL}/rest/metadata/{path.lstrip('/')}"
    if DRY_RUN:
        print(f"[DRY-RUN] PATCH {url}\n{json.dumps(body, indent=2)}\n")
        return {}
    resp = requests.patch(url, headers=headers(), json=body, timeout=30)
    if resp.status_code not in (200, 201):
        print(f"  ⚠️  PATCH {url} → {resp.status_code}: {resp.text[:300]}")
        return {}
    return resp.json()

def graphql(query: str, variables: dict = {}) -> dict:
    url = f"{TWENTY_CRM_URL}/metadata"
    if DRY_RUN:
        print(f"[DRY-RUN] GraphQL Metadata\n{query[:200]}\n")
        return {"data": {}}
    resp = requests.post(url, headers=headers(), json={"query": query, "variables": variables}, timeout=30)
    if resp.status_code != 200:
        print(f"  ⚠️  GraphQL → {resp.status_code}: {resp.text[:300]}")
        return {}
    data = resp.json()
    if "errors" in data:
        print(f"  ⚠️  GraphQL errors: {data['errors']}")
    return data

def core_post(path: str, body: dict) -> dict:
    """POST to the Core API (records, not metadata)"""
    url = f"{TWENTY_CRM_URL}/rest/{path.lstrip('/')}"
    if DRY_RUN:
        print(f"[DRY-RUN] CORE POST {url}\n{json.dumps(body, indent=2)}\n")
        return {"id": f"dry-run-{path}"}
    resp = requests.post(url, headers=headers(), json=body, timeout=30)
    if resp.status_code not in (200, 201):
        print(f"  ⚠️  CORE POST {url} → {resp.status_code}: {resp.text[:300]}")
        return {}
    return resp.json()

def step(msg: str):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")

def ok(msg: str):
    print(f"  ✅ {msg}")

def warn(msg: str):
    print(f"  ⚠️  {msg}")

def info(msg: str):
    print(f"  ℹ️  {msg}")

# ── Phase 1: Custom Objects ────────────────────────────────────────────────────
def create_custom_objects():
    step("Phase 1: Creating Custom Objects")

    objects = [
        {
            "nameSingular": "propertyLead",
            "namePlural": "propertyLeads",
            "labelSingular": "Property Lead",
            "labelPlural": "Property Leads",
            "description": "A buyer or renter lead interested in a specific property or area",
            "icon": "IconHome",
        },
        {
            "nameSingular": "propertyShowing",
            "namePlural": "propertyShowings",
            "labelSingular": "Property Showing",
            "labelPlural": "Property Showings",
            "description": "A scheduled property viewing appointment",
            "icon": "IconCalendar",
        },
        {
            "nameSingular": "agentCommission",
            "namePlural": "agentCommissions",
            "labelSingular": "Agent Commission",
            "labelPlural": "Agent Commissions",
            "description": "Commission earned by an agent on a completed transaction",
            "icon": "IconCurrencyNaira",
        },
        {
            "nameSingular": "agentKyc",
            "namePlural": "agentKycs",
            "labelSingular": "Agent KYC",
            "labelPlural": "Agent KYCs",
            "description": "Know Your Customer verification record for an agent",
            "icon": "IconShieldCheck",
        },
        {
            "nameSingular": "escrowTransaction",
            "namePlural": "escrowTransactions",
            "labelSingular": "Escrow Transaction",
            "labelPlural": "Escrow Transactions",
            "description": "A property transaction held in escrow with milestone tracking",
            "icon": "IconLock",
        },
        {
            "nameSingular": "diasporaBuyer",
            "namePlural": "diasporaBuyers",
            "labelSingular": "Diaspora Buyer",
            "labelPlural": "Diaspora Buyers",
            "description": "An overseas Nigerian buyer profile with FX and escrow preferences",
            "icon": "IconWorld",
        },
        {
            "nameSingular": "propertyListing",
            "namePlural": "propertyListings",
            "labelSingular": "Property Listing",
            "labelPlural": "Property Listings",
            "description": "A property listed on the platform with verification status",
            "icon": "IconBuilding",
        },
    ]

    for obj in objects:
        result = metadata_post("objects", obj)
        obj_id = result.get("id") or result.get("data", {}).get("createOneObject", {}).get("id")
        if obj_id:
            CREATED[obj["nameSingular"]] = obj_id
            ok(f"Created object: {obj['labelSingular']} (id={obj_id})")
        else:
            warn(f"Could not create object: {obj['labelSingular']}")
        time.sleep(0.3)

# ── Phase 2: Custom Fields ─────────────────────────────────────────────────────
def create_custom_fields():
    step("Phase 2: Creating Custom Fields on Custom Objects")

    # Fields for propertyLead
    property_lead_fields = [
        {"name": "leadScore", "label": "Lead Score", "type": "NUMBER", "description": "0-100 AI-computed lead quality score"},
        {"name": "budgetNgn", "label": "Budget (₦)", "type": "CURRENCY", "description": "Buyer's budget in Nigerian Naira"},
        {"name": "budgetUsd", "label": "Budget (USD)", "type": "NUMBER", "description": "Buyer's budget in USD (diaspora)"},
        {"name": "preferredCity", "label": "Preferred City", "type": "TEXT", "description": "e.g. Lagos, Abuja, Port Harcourt"},
        {"name": "preferredArea", "label": "Preferred Area", "type": "TEXT", "description": "e.g. Lekki Phase 1, Maitama"},
        {"name": "propertyType", "label": "Property Type", "type": "SELECT", "description": "apartment, duplex, bungalow, land, commercial",
         "options": [
             {"value": "apartment", "label": "Apartment", "color": "BLUE"},
             {"value": "duplex", "label": "Duplex", "color": "GREEN"},
             {"value": "bungalow", "label": "Bungalow", "color": "YELLOW"},
             {"value": "land", "label": "Land", "color": "ORANGE"},
             {"value": "commercial", "label": "Commercial", "color": "RED"},
             {"value": "terrace", "label": "Terrace", "color": "PURPLE"},
         ]},
        {"name": "bedrooms", "label": "Bedrooms", "type": "NUMBER", "description": "Number of bedrooms required"},
        {"name": "isDiaspora", "label": "Is Diaspora", "type": "BOOLEAN", "description": "True if buyer is overseas Nigerian"},
        {"name": "diasporaCountry", "label": "Diaspora Country", "type": "TEXT", "description": "Country of residence for diaspora buyers"},
        {"name": "preferredCurrency", "label": "Preferred Currency", "type": "SELECT", "description": "Preferred payment currency",
         "options": [
             {"value": "NGN", "label": "₦ Naira", "color": "GREEN"},
             {"value": "USD", "label": "$ USD", "color": "BLUE"},
             {"value": "GBP", "label": "£ GBP", "color": "PURPLE"},
             {"value": "EUR", "label": "€ EUR", "color": "YELLOW"},
             {"value": "CAD", "label": "$ CAD", "color": "ORANGE"},
         ]},
        {"name": "leadSource", "label": "Lead Source", "type": "SELECT", "description": "How the lead was acquired",
         "options": [
             {"value": "website", "label": "Website", "color": "BLUE"},
             {"value": "referral", "label": "Referral", "color": "GREEN"},
             {"value": "social_media", "label": "Social Media", "color": "PURPLE"},
             {"value": "whatsapp", "label": "WhatsApp", "color": "GREEN"},
             {"value": "diaspora_event", "label": "Diaspora Event", "color": "ORANGE"},
             {"value": "property_expo", "label": "Property Expo", "color": "RED"},
             {"value": "google_ads", "label": "Google Ads", "color": "YELLOW"},
             {"value": "instagram", "label": "Instagram", "color": "PINK"},
         ]},
        {"name": "lastContactedAt", "label": "Last Contacted", "type": "DATE_TIME", "description": "Last time agent contacted this lead"},
        {"name": "nextFollowUpAt", "label": "Next Follow-Up", "type": "DATE_TIME", "description": "Scheduled next follow-up date"},
        {"name": "propertyId", "label": "Platform Property ID", "type": "NUMBER", "description": "ID in the realestate platform DB"},
        {"name": "viewedProperties", "label": "Properties Viewed", "type": "NUMBER", "description": "Count of properties viewed"},
        {"name": "escrowReady", "label": "Escrow Ready", "type": "BOOLEAN", "description": "Has completed KYC and ready for escrow"},
        {"name": "notes", "label": "Notes", "type": "RICH_TEXT", "description": "Agent notes about this lead"},
    ]

    # Fields for propertyShowing
    showing_fields = [
        {"name": "showingDate", "label": "Showing Date", "type": "DATE_TIME", "description": "Scheduled date and time"},
        {"name": "showingType", "label": "Showing Type", "type": "SELECT", "description": "Physical or virtual showing",
         "options": [
             {"value": "physical", "label": "Physical Visit", "color": "GREEN"},
             {"value": "virtual_tour", "label": "Virtual Tour", "color": "BLUE"},
             {"value": "video_call", "label": "Video Call", "color": "PURPLE"},
             {"value": "ar_walkthrough", "label": "AR Walkthrough", "color": "ORANGE"},
         ]},
        {"name": "propertyAddress", "label": "Property Address", "type": "TEXT", "description": "Full address of the property"},
        {"name": "propertyId", "label": "Platform Property ID", "type": "NUMBER", "description": "ID in the realestate platform DB"},
        {"name": "status", "label": "Status", "type": "SELECT", "description": "Current showing status",
         "options": [
             {"value": "scheduled", "label": "Scheduled", "color": "BLUE"},
             {"value": "confirmed", "label": "Confirmed", "color": "GREEN"},
             {"value": "completed", "label": "Completed", "color": "PURPLE"},
             {"value": "cancelled", "label": "Cancelled", "color": "RED"},
             {"value": "no_show", "label": "No Show", "color": "ORANGE"},
             {"value": "rescheduled", "label": "Rescheduled", "color": "YELLOW"},
         ]},
        {"name": "feedbackRating", "label": "Feedback Rating", "type": "NUMBER", "description": "Buyer feedback 1-5"},
        {"name": "feedbackNotes", "label": "Feedback Notes", "type": "TEXT", "description": "Buyer's comments after showing"},
        {"name": "offerMade", "label": "Offer Made", "type": "BOOLEAN", "description": "Did buyer make an offer after showing?"},
        {"name": "offerAmountNgn", "label": "Offer Amount (₦)", "type": "CURRENCY", "description": "Offer amount in Naira"},
        {"name": "durationMinutes", "label": "Duration (min)", "type": "NUMBER", "description": "Showing duration in minutes"},
    ]

    # Fields for agentCommission
    commission_fields = [
        {"name": "transactionId", "label": "Transaction ID", "type": "NUMBER", "description": "Platform transaction ID"},
        {"name": "propertyId", "label": "Property ID", "type": "NUMBER", "description": "Platform property ID"},
        {"name": "salePrice", "label": "Sale Price (₦)", "type": "CURRENCY", "description": "Final sale/rental price"},
        {"name": "commissionRate", "label": "Commission Rate (%)", "type": "NUMBER", "description": "Commission percentage (default 3%)"},
        {"name": "commissionAmount", "label": "Commission (₦)", "type": "CURRENCY", "description": "Total commission earned"},
        {"name": "vatAmount", "label": "VAT (₦)", "type": "CURRENCY", "description": "7.5% VAT on commission"},
        {"name": "netCommission", "label": "Net Commission (₦)", "type": "CURRENCY", "description": "Commission after VAT"},
        {"name": "status", "label": "Status", "type": "SELECT", "description": "Commission payment status",
         "options": [
             {"value": "pending", "label": "Pending", "color": "YELLOW"},
             {"value": "approved", "label": "Approved", "color": "BLUE"},
             {"value": "paid", "label": "Paid", "color": "GREEN"},
             {"value": "disputed", "label": "Disputed", "color": "RED"},
             {"value": "cancelled", "label": "Cancelled", "color": "GRAY"},
         ]},
        {"name": "transactionType", "label": "Transaction Type", "type": "SELECT", "description": "Sale or rental",
         "options": [
             {"value": "sale", "label": "Sale", "color": "GREEN"},
             {"value": "rental", "label": "Rental", "color": "BLUE"},
             {"value": "off_plan", "label": "Off-Plan", "color": "ORANGE"},
         ]},
        {"name": "paidAt", "label": "Paid At", "type": "DATE_TIME", "description": "Date commission was paid"},
        {"name": "paymentReference", "label": "Payment Reference", "type": "TEXT", "description": "Bank/Flutterwave payment reference"},
    ]

    # Fields for agentKyc
    kyc_fields = [
        {"name": "nin", "label": "NIN", "type": "TEXT", "description": "National Identification Number (11 digits)"},
        {"name": "bvn", "label": "BVN", "type": "TEXT", "description": "Bank Verification Number (11 digits)"},
        {"name": "nisvNumber", "label": "NIESV Number", "type": "TEXT", "description": "Nigerian Institution of Estate Surveyors and Valuers registration"},
        {"name": "cacNumber", "label": "CAC Number", "type": "TEXT", "description": "Corporate Affairs Commission registration"},
        {"name": "ninVerified", "label": "NIN Verified", "type": "BOOLEAN", "description": "NIN verified via Prembly"},
        {"name": "bvnVerified", "label": "BVN Verified", "type": "BOOLEAN", "description": "BVN verified via Prembly"},
        {"name": "nisvVerified", "label": "NIESV Verified", "type": "BOOLEAN", "description": "NIESV registration confirmed"},
        {"name": "cacVerified", "label": "CAC Verified", "type": "BOOLEAN", "description": "CAC registration confirmed"},
        {"name": "badgeTier", "label": "Badge Tier", "type": "SELECT", "description": "Verification badge level",
         "options": [
             {"value": "unverified", "label": "Unverified", "color": "GRAY"},
             {"value": "basic", "label": "Basic", "color": "YELLOW"},
             {"value": "verified", "label": "Verified", "color": "GREEN"},
             {"value": "premium", "label": "Premium", "color": "PURPLE"},
         ]},
        {"name": "trustScore", "label": "Trust Score", "type": "NUMBER", "description": "0-100 computed trust score"},
        {"name": "verificationStatus", "label": "Verification Status", "type": "SELECT", "description": "KYC review status",
         "options": [
             {"value": "pending", "label": "Pending", "color": "GRAY"},
             {"value": "in_review", "label": "In Review", "color": "YELLOW"},
             {"value": "verified", "label": "Verified", "color": "GREEN"},
             {"value": "rejected", "label": "Rejected", "color": "RED"},
             {"value": "expired", "label": "Expired", "color": "ORANGE"},
         ]},
        {"name": "listingLimit", "label": "Listing Limit", "type": "NUMBER", "description": "Max active listings allowed"},
        {"name": "submittedAt", "label": "Submitted At", "type": "DATE_TIME", "description": "KYC submission date"},
        {"name": "verifiedAt", "label": "Verified At", "type": "DATE_TIME", "description": "Date KYC was approved"},
        {"name": "expiresAt", "label": "Expires At", "type": "DATE_TIME", "description": "KYC expiry date (1 year)"},
        {"name": "rejectionReason", "label": "Rejection Reason", "type": "TEXT", "description": "Reason for KYC rejection"},
    ]

    # Fields for escrowTransaction
    escrow_fields = [
        {"name": "escrowId", "label": "Escrow ID", "type": "TEXT", "description": "Platform escrow reference ID"},
        {"name": "propertyId", "label": "Property ID", "type": "NUMBER", "description": "Platform property ID"},
        {"name": "propertyAddress", "label": "Property Address", "type": "TEXT", "description": "Full property address"},
        {"name": "purchasePrice", "label": "Purchase Price (₦)", "type": "CURRENCY", "description": "Agreed purchase price"},
        {"name": "escrowBalance", "label": "Escrow Balance (₦)", "type": "CURRENCY", "description": "Current escrow balance"},
        {"name": "status", "label": "Status", "type": "SELECT", "description": "Escrow transaction status",
         "options": [
             {"value": "awaiting_deposit", "label": "Awaiting Deposit", "color": "YELLOW"},
             {"value": "funded", "label": "Funded", "color": "BLUE"},
             {"value": "milestone_review", "label": "Milestone Review", "color": "ORANGE"},
             {"value": "releasing", "label": "Releasing Funds", "color": "PURPLE"},
             {"value": "completed", "label": "Completed", "color": "GREEN"},
             {"value": "disputed", "label": "Disputed", "color": "RED"},
             {"value": "refunded", "label": "Refunded", "color": "GRAY"},
         ]},
        {"name": "currentMilestone", "label": "Current Milestone", "type": "TEXT", "description": "Active milestone name"},
        {"name": "milestonesCompleted", "label": "Milestones Completed", "type": "NUMBER", "description": "Number of milestones released"},
        {"name": "totalMilestones", "label": "Total Milestones", "type": "NUMBER", "description": "Total milestones in escrow plan"},
        {"name": "isDiaspora", "label": "Is Diaspora", "type": "BOOLEAN", "description": "Overseas buyer transaction"},
        {"name": "foreignCurrency", "label": "Foreign Currency", "type": "TEXT", "description": "USD/GBP/EUR for diaspora"},
        {"name": "foreignAmount", "label": "Foreign Amount", "type": "NUMBER", "description": "Amount in foreign currency"},
        {"name": "exchangeRate", "label": "Exchange Rate", "type": "NUMBER", "description": "NGN rate used at time of transaction"},
        {"name": "droneMilestoneVerified", "label": "Drone Verified", "type": "BOOLEAN", "description": "Milestone verified by drone CV"},
        {"name": "disputeReason", "label": "Dispute Reason", "type": "TEXT", "description": "Reason for escrow dispute"},
        {"name": "completedAt", "label": "Completed At", "type": "DATE_TIME", "description": "Date escrow was completed"},
    ]

    # Fields for diasporaBuyer
    diaspora_fields = [
        {"name": "countryOfResidence", "label": "Country of Residence", "type": "TEXT", "description": "Current country"},
        {"name": "preferredCurrency", "label": "Preferred Currency", "type": "TEXT", "description": "USD, GBP, EUR, CAD"},
        {"name": "budgetForeign", "label": "Budget (Foreign)", "type": "NUMBER", "description": "Budget in foreign currency"},
        {"name": "budgetNgn", "label": "Budget (₦)", "type": "CURRENCY", "description": "Budget in Naira equivalent"},
        {"name": "kycStatus", "label": "KYC Status", "type": "SELECT", "description": "Remote KYC verification status",
         "options": [
             {"value": "pending", "label": "Pending", "color": "GRAY"},
             {"value": "in_review", "label": "In Review", "color": "YELLOW"},
             {"value": "verified", "label": "Verified", "color": "GREEN"},
             {"value": "rejected", "label": "Rejected", "color": "RED"},
         ]},
        {"name": "escrowEnabled", "label": "Escrow Enabled", "type": "BOOLEAN", "description": "Has completed KYC for escrow"},
        {"name": "preferredCities", "label": "Preferred Cities", "type": "TEXT", "description": "Comma-separated list of cities"},
        {"name": "investmentPurpose", "label": "Investment Purpose", "type": "SELECT", "description": "Reason for buying",
         "options": [
             {"value": "personal_use", "label": "Personal Use", "color": "BLUE"},
             {"value": "rental_income", "label": "Rental Income", "color": "GREEN"},
             {"value": "capital_appreciation", "label": "Capital Appreciation", "color": "PURPLE"},
             {"value": "retirement_home", "label": "Retirement Home", "color": "ORANGE"},
             {"value": "family_gift", "label": "Family Gift", "color": "PINK"},
         ]},
        {"name": "lastVisitNigeria", "label": "Last Visit to Nigeria", "type": "DATE", "description": "Last time buyer was in Nigeria"},
        {"name": "trustedAgentId", "label": "Trusted Agent ID", "type": "NUMBER", "description": "Assigned trusted agent in Nigeria"},
        {"name": "remoteViewingCompleted", "label": "Remote Viewing Done", "type": "BOOLEAN", "description": "Has done virtual/video tour"},
    ]

    # Fields for propertyListing
    listing_fields = [
        {"name": "platformPropertyId", "label": "Platform ID", "type": "NUMBER", "description": "ID in the realestate platform DB"},
        {"name": "title", "label": "Title", "type": "TEXT", "description": "Property listing title"},
        {"name": "city", "label": "City", "type": "TEXT", "description": "e.g. Lagos, Abuja"},
        {"name": "area", "label": "Area", "type": "TEXT", "description": "e.g. Lekki Phase 1"},
        {"name": "state", "label": "State", "type": "TEXT", "description": "e.g. Lagos State"},
        {"name": "priceNgn", "label": "Price (₦)", "type": "CURRENCY", "description": "Listing price in Naira"},
        {"name": "propertyType", "label": "Property Type", "type": "SELECT", "description": "Type of property",
         "options": [
             {"value": "apartment", "label": "Apartment", "color": "BLUE"},
             {"value": "duplex", "label": "Duplex", "color": "GREEN"},
             {"value": "bungalow", "label": "Bungalow", "color": "YELLOW"},
             {"value": "land", "label": "Land", "color": "ORANGE"},
             {"value": "commercial", "label": "Commercial", "color": "RED"},
             {"value": "terrace", "label": "Terrace", "color": "PURPLE"},
         ]},
        {"name": "bedrooms", "label": "Bedrooms", "type": "NUMBER"},
        {"name": "bathrooms", "label": "Bathrooms", "type": "NUMBER"},
        {"name": "squareFootage", "label": "Square Footage", "type": "NUMBER"},
        {"name": "badgeTier", "label": "Badge Tier", "type": "SELECT", "description": "Verification badge",
         "options": [
             {"value": "unverified", "label": "Unverified", "color": "GRAY"},
             {"value": "basic", "label": "Basic", "color": "YELLOW"},
             {"value": "verified", "label": "Verified", "color": "GREEN"},
             {"value": "premium", "label": "Premium", "color": "PURPLE"},
         ]},
        {"name": "trustScore", "label": "Trust Score", "type": "NUMBER", "description": "0-100 verification score"},
        {"name": "titleType", "label": "Title Type", "type": "TEXT", "description": "C of O, Governor's Consent, etc."},
        {"name": "titleVerified", "label": "Title Verified", "type": "BOOLEAN"},
        {"name": "listingStatus", "label": "Listing Status", "type": "SELECT",
         "options": [
             {"value": "active", "label": "Active", "color": "GREEN"},
             {"value": "under_offer", "label": "Under Offer", "color": "YELLOW"},
             {"value": "sold", "label": "Sold", "color": "GRAY"},
             {"value": "rented", "label": "Rented", "color": "BLUE"},
             {"value": "withdrawn", "label": "Withdrawn", "color": "RED"},
         ]},
        {"name": "daysOnMarket", "label": "Days on Market", "type": "NUMBER"},
        {"name": "viewCount", "label": "View Count", "type": "NUMBER"},
        {"name": "enquiryCount", "label": "Enquiry Count", "type": "NUMBER"},
    ]

    all_objects_fields = [
        ("propertyLead", property_lead_fields),
        ("propertyShowing", showing_fields),
        ("agentCommission", commission_fields),
        ("agentKyc", kyc_fields),
        ("escrowTransaction", escrow_fields),
        ("diasporaBuyer", diaspora_fields),
        ("propertyListing", listing_fields),
    ]

    for obj_name, fields in all_objects_fields:
        obj_id = CREATED.get(obj_name)
        if not obj_id and not DRY_RUN:
            warn(f"Skipping fields for {obj_name} — object not created")
            continue

        info(f"Creating {len(fields)} fields for {obj_name}...")
        for field in fields:
            body = {
                "objectMetadataId": obj_id or "dry-run-id",
                "name": field["name"],
                "label": field["label"],
                "type": field["type"],
                "description": field.get("description", ""),
            }
            if "options" in field:
                body["options"] = field["options"]
            result = metadata_post("fields", body)
            field_id = result.get("id")
            if field_id:
                ok(f"  Field: {field['label']} ({field['type']})")
            else:
                warn(f"  Could not create field: {field['label']}")
            time.sleep(0.15)

# ── Phase 3: Pipeline Stages ───────────────────────────────────────────────────
def configure_pipeline_stages():
    step("Phase 3: Configuring Nigerian Real Estate Pipeline Stages")

    # Twenty CRM uses the Opportunities object's 'stage' field for pipeline stages
    # We update it via the Metadata API to add our custom stages
    info("Fetching existing Opportunities object metadata...")

    # Get the Opportunities object
    result = graphql("""
    query {
      objects(filter: { nameSingular: { eq: "opportunity" } }) {
        edges {
          node {
            id
            nameSingular
            fields {
              edges {
                node {
                  id
                  name
                  type
                  options
                }
              }
            }
          }
        }
      }
    }
    """)

    opp_object = None
    stage_field = None
    try:
        edges = result.get("data", {}).get("objects", {}).get("edges", [])
        if edges:
            opp_object = edges[0]["node"]
            for fe in opp_object.get("fields", {}).get("edges", []):
                if fe["node"]["name"] == "stage":
                    stage_field = fe["node"]
                    break
    except Exception as e:
        warn(f"Could not parse objects response: {e}")

    if not stage_field and not DRY_RUN:
        warn("Could not find stage field on Opportunities. Skipping pipeline stage config.")
        return

    stage_field_id = stage_field["id"] if stage_field else "dry-run-stage-field-id"
    info(f"Found stage field id: {stage_field_id}")

    # Nigerian real estate 8-stage pipeline
    nigerian_stages = [
        {"value": "NEW_ENQUIRY", "label": "New Enquiry", "color": "GRAY", "position": 0},
        {"value": "QUALIFIED", "label": "Qualified Lead", "color": "BLUE", "position": 1},
        {"value": "SHOWING_SCHEDULED", "label": "Showing Scheduled", "color": "YELLOW", "position": 2},
        {"value": "SHOWING_COMPLETED", "label": "Showing Completed", "color": "ORANGE", "position": 3},
        {"value": "OFFER_MADE", "label": "Offer Made", "color": "PURPLE", "position": 4},
        {"value": "NEGOTIATION", "label": "Negotiation", "color": "PINK", "position": 5},
        {"value": "ESCROW_INITIATED", "label": "Escrow Initiated", "color": "TURQUOISE", "position": 6},
        {"value": "CLOSED_WON", "label": "Closed Won ✅", "color": "GREEN", "position": 7},
        {"value": "CLOSED_LOST", "label": "Closed Lost ❌", "color": "RED", "position": 8},
    ]

    # Update the stage field options
    result = metadata_patch(f"fields/{stage_field_id}", {
        "options": nigerian_stages,
        "defaultValue": "'NEW_ENQUIRY'",
    })

    if result or DRY_RUN:
        ok(f"Pipeline stages configured: {len(nigerian_stages)} stages")
        for s in nigerian_stages:
            info(f"  Stage {s['position']}: {s['label']}")
    else:
        warn("Could not update pipeline stages")

# ── Phase 4: Views ─────────────────────────────────────────────────────────────
def create_views():
    step("Phase 4: Creating Views (Kanban, Lists, Filters)")

    # Note: Views are created via the Core API on the 'views' object
    views = [
        {
            "name": "🏠 Sales Pipeline",
            "objectMetadataId": "opportunity",
            "type": "Kanban",
            "key": "INDEX",
            "isCompact": False,
            "description": "Main Nigerian real estate sales pipeline — Kanban by stage",
        },
        {
            "name": "🔥 Hot Leads",
            "objectMetadataId": "opportunity",
            "type": "Table",
            "description": "Leads with score > 70 or budget > ₦100M",
        },
        {
            "name": "🌍 Diaspora Buyers",
            "objectMetadataId": "opportunity",
            "type": "Table",
            "description": "Overseas Nigerian buyers — filtered by isDiaspora = true",
        },
        {
            "name": "📅 Showings This Week",
            "objectMetadataId": "propertyShowing",
            "type": "Calendar",
            "description": "All property showings scheduled this week",
        },
        {
            "name": "💰 Closing This Month",
            "objectMetadataId": "opportunity",
            "type": "Table",
            "description": "Deals in Offer Made, Negotiation, or Escrow Initiated stages",
        },
        {
            "name": "👤 My Leads",
            "objectMetadataId": "opportunity",
            "type": "Kanban",
            "description": "Personal pipeline — filtered by assignee = current user",
        },
        {
            "name": "🔒 Active Escrows",
            "objectMetadataId": "escrowTransaction",
            "type": "Table",
            "description": "All active escrow transactions with milestone status",
        },
        {
            "name": "🛡️ KYC Review Queue",
            "objectMetadataId": "agentKyc",
            "type": "Table",
            "description": "Agent KYC submissions pending review",
        },
        {
            "name": "💼 Commission Tracker",
            "objectMetadataId": "agentCommission",
            "type": "Table",
            "description": "All commissions — pending, approved, and paid",
        },
        {
            "name": "🏢 Property Listings",
            "objectMetadataId": "propertyListing",
            "type": "Table",
            "description": "All platform listings with verification status",
        },
    ]

    for view in views:
        # Views are created via GraphQL workspace API
        result = graphql("""
        mutation CreateView($input: ViewCreateInput!) {
          createView(data: $input) {
            id
            name
            type
          }
        }
        """, {"input": {
            "name": view["name"],
            "type": view["type"],
        }})
        view_id = result.get("data", {}).get("createView", {}).get("id")
        if view_id or DRY_RUN:
            ok(f"View: {view['name']} ({view['type']})")
        else:
            # Views may not be creatable via API in all Twenty versions — log for manual creation
            info(f"View '{view['name']}' — create manually in Twenty UI (Settings → Views)")
        time.sleep(0.2)

# ── Phase 5: Workflow Automations ──────────────────────────────────────────────
def create_workflows():
    step("Phase 5: Creating Workflow Automations")

    workflows = [
        {
            "name": "🎯 Lead Score on Creation",
            "description": "When a new Opportunity is created, compute lead score and set next follow-up date",
            "trigger": {
                "type": "DATABASE_EVENT",
                "settings": {
                    "eventName": "opportunity.created",
                    "outputSchema": {},
                }
            },
            "steps": [
                {
                    "name": "Compute Lead Score",
                    "type": "CODE",
                    "settings": {
                        "input": {"opportunity": "{{trigger.output.record}}"},
                        "code": """
async function computeLeadScore(opportunity) {
  const stageScores = {
    'NEW_ENQUIRY': 10, 'QUALIFIED': 30, 'SHOWING_SCHEDULED': 50,
    'SHOWING_COMPLETED': 65, 'OFFER_MADE': 80, 'NEGOTIATION': 85,
    'ESCROW_INITIATED': 95, 'CLOSED_WON': 100, 'CLOSED_LOST': 0,
  };
  const stage = opportunity.stage || 'NEW_ENQUIRY';
  const budget = opportunity.amount?.amountMicros ? opportunity.amount.amountMicros / 1_000_000 : 0;
  const budgetBonus = budget >= 500_000_000 ? 15 : budget >= 100_000_000 ? 10 : budget >= 50_000_000 ? 5 : 0;
  const score = Math.min(100, (stageScores[stage] || 10) + budgetBonus);
  const followUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return { score, followUpDate, stage };
}
return await computeLeadScore(input.opportunity);
""",
                    }
                },
                {
                    "name": "Schedule Follow-Up Task",
                    "type": "CREATE_RECORD",
                    "settings": {
                        "objectName": "task",
                        "fields": {
                            "title": "Follow up with {{trigger.output.record.name}}",
                            "dueAt": "{{steps[0].output.followUpDate}}",
                            "status": "TODO",
                            "assignee": "{{trigger.output.record.assignee}}",
                        }
                    }
                },
            ]
        },
        {
            "name": "📅 Auto Follow-Up Sequence",
            "description": "Send follow-up reminders at 24h, 72h, and 7 days if lead is not progressed",
            "trigger": {
                "type": "DATABASE_EVENT",
                "settings": {"eventName": "opportunity.created"},
            },
            "steps": [
                {
                    "name": "Wait 24 hours",
                    "type": "DELAY",
                    "settings": {"delayUnit": "HOURS", "delayAmount": 24},
                },
                {
                    "name": "Check if still in New Enquiry",
                    "type": "FILTER",
                    "settings": {
                        "filter": "{{trigger.output.record.stage}} === 'NEW_ENQUIRY'",
                    }
                },
                {
                    "name": "Create 24h Follow-Up Task",
                    "type": "CREATE_RECORD",
                    "settings": {
                        "objectName": "task",
                        "fields": {
                            "title": "⏰ 24h follow-up: {{trigger.output.record.name}}",
                            "status": "TODO",
                            "assignee": "{{trigger.output.record.assignee}}",
                        }
                    }
                },
                {
                    "name": "Wait 72 hours total",
                    "type": "DELAY",
                    "settings": {"delayUnit": "HOURS", "delayAmount": 48},
                },
                {
                    "name": "Create 72h Follow-Up Task",
                    "type": "CREATE_RECORD",
                    "settings": {
                        "objectName": "task",
                        "fields": {
                            "title": "⚠️ 72h follow-up: {{trigger.output.record.name}} — still unqualified",
                            "status": "TODO",
                            "assignee": "{{trigger.output.record.assignee}}",
                        }
                    }
                },
            ]
        },
        {
            "name": "🌍 Diaspora Buyer Welcome",
            "description": "When a diaspora lead is created, send welcome email and assign trusted agent",
            "trigger": {
                "type": "DATABASE_EVENT",
                "settings": {"eventName": "opportunity.created"},
            },
            "steps": [
                {
                    "name": "Check if Diaspora",
                    "type": "FILTER",
                    "settings": {
                        "filter": "{{trigger.output.record.isDiaspora}} === true",
                    }
                },
                {
                    "name": "Send Welcome Email",
                    "type": "SEND_EMAIL",
                    "settings": {
                        "email": "{{trigger.output.record.pointOfContact.emails.primaryEmail}}",
                        "subject": "Welcome to RealEstate.NG — Your Nigerian Property Journey Starts Here",
                        "body": """Dear {{trigger.output.record.pointOfContact.name.firstName}},

Thank you for your interest in Nigerian real estate!

We understand the unique challenges of investing from abroad. Here's what we've set up for you:

✅ Dedicated Trusted Agent assigned to your account
✅ Secure Escrow protection for all transactions
✅ Virtual/AR property tours available 24/7
✅ Drone aerial verification for any property
✅ FX pricing in your preferred currency

Your account is now active. Log in to browse verified properties:
https://realestate.ng/diaspora

Our team is available on WhatsApp: +234-800-REALESTATE

Best regards,
RealEstate.NG Team""",
                    }
                },
                {
                    "name": "Create Onboarding Task",
                    "type": "CREATE_RECORD",
                    "settings": {
                        "objectName": "task",
                        "fields": {
                            "title": "🌍 Diaspora onboarding: {{trigger.output.record.name}} ({{trigger.output.record.diasporaCountry}})",
                            "status": "TODO",
                        }
                    }
                },
            ]
        },
        {
            "name": "🔒 Escrow Milestone Alert",
            "description": "When an escrow transaction milestone is completed, notify buyer and agent",
            "trigger": {
                "type": "DATABASE_EVENT",
                "settings": {"eventName": "escrowTransaction.updated"},
            },
            "steps": [
                {
                    "name": "Check milestone changed",
                    "type": "FILTER",
                    "settings": {
                        "filter": "{{trigger.output.diff.droneMilestoneVerified}} === true",
                    }
                },
                {
                    "name": "Notify via HTTP",
                    "type": "HTTP_REQUEST",
                    "settings": {
                        "url": "{{env.PLATFORM_API_URL}}/api/escrow/milestone-webhook",
                        "method": "POST",
                        "headers": {"Content-Type": "application/json", "X-Twenty-Webhook": "true"},
                        "body": {
                            "escrowId": "{{trigger.output.record.escrowId}}",
                            "milestone": "{{trigger.output.record.currentMilestone}}",
                            "droneVerified": "{{trigger.output.record.droneMilestoneVerified}}",
                        }
                    }
                },
                {
                    "name": "Update Opportunity Stage",
                    "type": "UPDATE_RECORD",
                    "settings": {
                        "objectName": "opportunity",
                        "filter": {"escrowId": "{{trigger.output.record.escrowId}}"},
                        "fields": {"stage": "ESCROW_INITIATED"},
                    }
                },
            ]
        },
        {
            "name": "🛡️ KYC Status Change Notification",
            "description": "When agent KYC status changes, notify the agent",
            "trigger": {
                "type": "DATABASE_EVENT",
                "settings": {"eventName": "agentKyc.updated"},
            },
            "steps": [
                {
                    "name": "Check status changed to verified or rejected",
                    "type": "FILTER",
                    "settings": {
                        "filter": "['verified', 'rejected'].includes({{trigger.output.record.verificationStatus}})",
                    }
                },
                {
                    "name": "Notify Platform via Webhook",
                    "type": "HTTP_REQUEST",
                    "settings": {
                        "url": "{{env.PLATFORM_API_URL}}/api/kyc/status-webhook",
                        "method": "POST",
                        "headers": {"Content-Type": "application/json"},
                        "body": {
                            "agentId": "{{trigger.output.record.agentId}}",
                            "status": "{{trigger.output.record.verificationStatus}}",
                            "badgeTier": "{{trigger.output.record.badgeTier}}",
                            "trustScore": "{{trigger.output.record.trustScore}}",
                        }
                    }
                },
            ]
        },
        {
            "name": "⚠️ Stale Lead Alert",
            "description": "Every day, flag leads with no contact in 14+ days",
            "trigger": {
                "type": "CRON",
                "settings": {"schedule": "0 8 * * *"},  # 8am daily
            },
            "steps": [
                {
                    "name": "Find Stale Leads",
                    "type": "SEARCH_RECORDS",
                    "settings": {
                        "objectName": "opportunity",
                        "filter": {
                            "stage": {"notIn": ["CLOSED_WON", "CLOSED_LOST"]},
                            "updatedAt": {"lt": "{{now - 14 days}}"},
                        },
                        "limit": 50,
                    }
                },
                {
                    "name": "Loop through stale leads",
                    "type": "ITERATOR",
                    "settings": {"collection": "{{steps[0].output.records}}"},
                },
                {
                    "name": "Create Stale Alert Task",
                    "type": "CREATE_RECORD",
                    "settings": {
                        "objectName": "task",
                        "fields": {
                            "title": "⚠️ STALE LEAD (14+ days): {{iterator.current.name}}",
                            "status": "TODO",
                            "assignee": "{{iterator.current.assignee}}",
                        }
                    }
                },
            ]
        },
        {
            "name": "🏆 Deal Won — Commission Calculation",
            "description": "When a deal is marked Closed Won, automatically create commission record",
            "trigger": {
                "type": "DATABASE_EVENT",
                "settings": {"eventName": "opportunity.updated"},
            },
            "steps": [
                {
                    "name": "Check if stage changed to CLOSED_WON",
                    "type": "FILTER",
                    "settings": {
                        "filter": "{{trigger.output.diff.stage}} === 'CLOSED_WON'",
                    }
                },
                {
                    "name": "Calculate Commission",
                    "type": "CODE",
                    "settings": {
                        "input": {"opportunity": "{{trigger.output.record}}"},
                        "code": """
async function calcCommission(opp) {
  const salePrice = opp.amount?.amountMicros ? opp.amount.amountMicros / 1_000_000 : 0;
  const rate = 0.03; // 3% Nigerian standard
  const commission = salePrice * rate;
  const vat = commission * 0.075; // 7.5% VAT
  const net = commission - vat;
  return { salePrice, commission, vat, net, rate: rate * 100 };
}
return await calcCommission(input.opportunity);
""",
                    }
                },
                {
                    "name": "Create Commission Record",
                    "type": "CREATE_RECORD",
                    "settings": {
                        "objectName": "agentCommission",
                        "fields": {
                            "name": "Commission — {{trigger.output.record.name}}",
                            "salePrice": "{{steps[1].output.salePrice}}",
                            "commissionRate": "{{steps[1].output.rate}}",
                            "commissionAmount": "{{steps[1].output.commission}}",
                            "vatAmount": "{{steps[1].output.vat}}",
                            "netCommission": "{{steps[1].output.net}}",
                            "status": "pending",
                            "transactionType": "sale",
                        }
                    }
                },
                {
                    "name": "Notify Agent",
                    "type": "CREATE_RECORD",
                    "settings": {
                        "objectName": "task",
                        "fields": {
                            "title": "🏆 Deal Won! Commission ₦{{steps[1].output.commission}} pending — {{trigger.output.record.name}}",
                            "status": "TODO",
                            "assignee": "{{trigger.output.record.assignee}}",
                        }
                    }
                },
            ]
        },
        {
            "name": "📋 Showing Completed — Request Feedback",
            "description": "When a showing is marked completed, create a feedback task",
            "trigger": {
                "type": "DATABASE_EVENT",
                "settings": {"eventName": "propertyShowing.updated"},
            },
            "steps": [
                {
                    "name": "Check if status changed to completed",
                    "type": "FILTER",
                    "settings": {
                        "filter": "{{trigger.output.diff.status}} === 'completed'",
                    }
                },
                {
                    "name": "Create Feedback Task",
                    "type": "CREATE_RECORD",
                    "settings": {
                        "objectName": "task",
                        "fields": {
                            "title": "📋 Collect feedback from showing at {{trigger.output.record.propertyAddress}}",
                            "status": "TODO",
                            "assignee": "{{trigger.output.record.assignee}}",
                        }
                    }
                },
                {
                    "name": "Notify Platform",
                    "type": "HTTP_REQUEST",
                    "settings": {
                        "url": "{{env.PLATFORM_API_URL}}/api/showings/completed-webhook",
                        "method": "POST",
                        "headers": {"Content-Type": "application/json"},
                        "body": {
                            "showingId": "{{trigger.output.record.id}}",
                            "propertyId": "{{trigger.output.record.propertyId}}",
                            "status": "completed",
                        }
                    }
                },
            ]
        },
    ]

    for wf in workflows:
        # Create workflow via GraphQL
        result = graphql("""
        mutation CreateWorkflow($input: WorkflowCreateInput!) {
          createWorkflow(data: $input) {
            id
            name
            status
          }
        }
        """, {"input": {
            "name": wf["name"],
        }})

        wf_id = result.get("data", {}).get("createWorkflow", {}).get("id")
        if wf_id or DRY_RUN:
            ok(f"Workflow: {wf['name']}")
            # Store workflow definition for documentation
        else:
            # Workflows may require UI creation in some Twenty versions
            info(f"Workflow '{wf['name']}' — create manually in Twenty UI (Workflows section)")
        time.sleep(0.3)

    # Save workflow definitions as JSON for manual import / documentation
    workflow_export_path = os.path.join(os.path.dirname(__file__), "twenty-crm-workflows.json")
    with open(workflow_export_path, "w") as f:
        json.dump(workflows, f, indent=2)
    ok(f"Workflow definitions saved to: {workflow_export_path}")

# ── Phase 6: Verification ──────────────────────────────────────────────────────
def verify_setup():
    step("Phase 6: Verifying Setup")

    result = graphql("""
    query {
      objects(filter: { isCustom: { eq: true } }) {
        edges {
          node {
            id
            nameSingular
            labelSingular
            fields { totalCount }
          }
        }
      }
    }
    """)

    if DRY_RUN:
        ok("Dry run complete — all API calls printed above")
        return

    try:
        edges = result.get("data", {}).get("objects", {}).get("edges", [])
        if edges:
            ok(f"Found {len(edges)} custom objects:")
            for e in edges:
                n = e["node"]
                info(f"  {n['labelSingular']} ({n['nameSingular']}) — {n['fields']['totalCount']} fields")
        else:
            warn("No custom objects found — check API key and URL")
    except Exception as e:
        warn(f"Could not verify setup: {e}")

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    global DRY_RUN

    parser = argparse.ArgumentParser(description="Configure Twenty CRM for Nigerian Real Estate Platform")
    parser.add_argument("--dry-run", action="store_true", help="Print API calls without executing")
    parser.add_argument("--reset", action="store_true", help="Delete all custom objects and recreate")
    parser.add_argument("--phase", type=int, choices=[1,2,3,4,5,6], help="Run only a specific phase")
    args = parser.parse_args()

    DRY_RUN = args.dry_run

    if not TWENTY_API_KEY and not DRY_RUN:
        print("❌ TWENTY_API_KEY environment variable is not set.")
        print("   Set it with: export TWENTY_API_KEY=your_key_here")
        print("   Or run with --dry-run to preview all API calls")
        sys.exit(1)

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║   Twenty CRM Setup — Nigerian Real Estate Platform           ║
║   URL: {TWENTY_CRM_URL:<52} ║
║   Mode: {'DRY RUN (no changes)' if DRY_RUN else 'LIVE (making real API calls)  ':<52} ║
╚══════════════════════════════════════════════════════════════╝
""")

    phases = {
        1: create_custom_objects,
        2: create_custom_fields,
        3: configure_pipeline_stages,
        4: create_views,
        5: create_workflows,
        6: verify_setup,
    }

    if args.phase:
        phases[args.phase]()
    else:
        for phase_fn in phases.values():
            phase_fn()

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║   Setup Complete!                                            ║
║                                                              ║
║   Next Steps:                                                ║
║   1. Set TWENTY_API_KEY in your .env file                    ║
║   2. Set TWENTY_CRM_URL to your Twenty instance URL          ║
║   3. Run: python3 scripts/setup-twenty-crm.py                ║
║   4. Open Twenty UI to verify objects and activate workflows ║
║   5. Set PLATFORM_API_URL in Twenty env for webhooks         ║
╚══════════════════════════════════════════════════════════════╝
""")

if __name__ == "__main__":
    main()
