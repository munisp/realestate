"""
Real Listing Data Pipeline
===========================
Ingests real property listings from the PostgreSQL database, scores their
data quality, enriches them with geospatial and market context, and triggers
incremental ML model retraining when sufficient new data has accumulated.

Pipeline stages:
  1. Ingest — pull new/updated listings from PostgreSQL
  2. Quality Score — compute a 0–100 data quality score per listing
  3. Enrich — add geospatial context (LGA, state, estate), price/sqm,
               market comparables, and CBN exchange rate
  4. Feature Store — write enriched features to PostgreSQL feature tables
  5. Drift Detection — compare new listing distribution to training baseline
  6. Retraining Trigger — fire incremental GNN retraining when:
       a) >= 500 new listings since last training, OR
       b) price drift > 15% in any city, OR
       c) scheduled weekly run

Usage:
  python listing_data_pipeline.py --mode ingest       # Ingest + quality score
  python listing_data_pipeline.py --mode enrich       # Enrich existing listings
  python listing_data_pipeline.py --mode retrain      # Force retraining
  python listing_data_pipeline.py --mode full         # All stages (default)
  python listing_data_pipeline.py --mode status       # Print pipeline status
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import psycopg2
import psycopg2.extras
import requests

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("listing_pipeline")

# ── Config ────────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/realestate")
MLFLOW_URL = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5001")
CBN_EXCHANGE_API = os.getenv("CBN_EXCHANGE_API", "https://api.exchangerate-api.com/v4/latest/USD")
RETRAIN_THRESHOLD_LISTINGS = int(os.getenv("RETRAIN_THRESHOLD_LISTINGS", "500"))
PRICE_DRIFT_THRESHOLD = float(os.getenv("PRICE_DRIFT_THRESHOLD", "0.15"))  # 15%

# Nigerian city coordinates for geospatial enrichment
NIGERIAN_CITIES = {
    "Lagos": {"lat": 6.5244, "lng": 3.3792, "state": "Lagos", "zone": "South West"},
    "Abuja": {"lat": 9.0579, "lng": 7.4951, "state": "FCT", "zone": "North Central"},
    "Port Harcourt": {"lat": 4.8156, "lng": 7.0498, "state": "Rivers", "zone": "South South"},
    "Kano": {"lat": 12.0022, "lng": 8.5920, "state": "Kano", "zone": "North West"},
    "Ibadan": {"lat": 7.3775, "lng": 3.9470, "state": "Oyo", "zone": "South West"},
    "Benin City": {"lat": 6.3350, "lng": 5.6270, "state": "Edo", "zone": "South South"},
    "Enugu": {"lat": 6.4584, "lng": 7.5464, "state": "Enugu", "zone": "South East"},
    "Kaduna": {"lat": 10.5222, "lng": 7.4383, "state": "Kaduna", "zone": "North West"},
    "Warri": {"lat": 5.5167, "lng": 5.7500, "state": "Delta", "zone": "South South"},
    "Calabar": {"lat": 4.9517, "lng": 8.3220, "state": "Cross River", "zone": "South South"},
}

# Price benchmarks per sqm in NGN (updated quarterly)
PRICE_BENCHMARKS_PER_SQM = {
    "Lagos": {
        "Victoria Island": 2_500_000, "Ikoyi": 2_200_000, "Lekki Phase 1": 1_800_000,
        "Banana Island": 3_500_000, "Ikeja GRA": 1_200_000, "Magodo": 900_000,
        "Surulere": 600_000, "Yaba": 550_000, "default": 750_000,
    },
    "Abuja": {
        "Maitama": 1_500_000, "Asokoro": 1_400_000, "Wuse 2": 1_200_000,
        "Gwarinpa": 700_000, "Jabi": 900_000, "default": 600_000,
    },
    "Port Harcourt": {"GRA": 800_000, "Trans Amadi": 600_000, "default": 400_000},
    "Kano": {"Nassarawa GRA": 400_000, "default": 250_000},
    "Ibadan": {"Bodija": 350_000, "Agodi GRA": 400_000, "default": 200_000},
    "default": 300_000,
}


# ── Database helpers ──────────────────────────────────────────────────────────
def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


def get_new_listings(since: Optional[datetime] = None, limit: int = 10_000) -> pd.DataFrame:
    """Pull listings from PostgreSQL that haven't been processed yet."""
    since = since or (datetime.utcnow() - timedelta(days=7))
    query = """
        SELECT
            p.id, p.title, p.description, p.address, p.city, p.state,
            p.price, p.currency, p."propertyType", p."listingType",
            p.bedrooms, p.bathrooms, p."squareFeet", p."lotSize",
            p.latitude, p.longitude, p."yearBuilt", p."parkingSpaces",
            p.amenities, p."imageUrls", p.status, p."createdAt", p."updatedAt",
            p."agentId",
            u.email AS agent_email,
            u."createdAt" AS agent_since,
            COUNT(DISTINCT pi.id) AS image_count,
            COUNT(DISTINCT pv.id) AS view_count
        FROM properties p
        LEFT JOIN users u ON p."agentId" = u.id
        LEFT JOIN property_images pi ON pi."propertyId" = p.id
        LEFT JOIN property_views pv ON pv."propertyId" = p.id
        WHERE p."updatedAt" > %s
          AND p.status IN ('active', 'pending')
        GROUP BY p.id, u.email, u."createdAt"
        ORDER BY p."updatedAt" DESC
        LIMIT %s
    """
    try:
        conn = get_connection()
        df = pd.read_sql(query, conn, params=(since, limit))
        conn.close()
        logger.info(f"Fetched {len(df)} listings from database")
        return df
    except Exception as e:
        logger.warning(f"Database unavailable ({e}), using empty DataFrame")
        return pd.DataFrame()


def get_pipeline_state() -> Dict[str, Any]:
    """Read pipeline state from PostgreSQL (last run, counts, etc.)."""
    query = """
        SELECT key, value FROM pipeline_state
        WHERE key IN ('last_ingest_at', 'last_retrain_at', 'listings_since_retrain',
                      'baseline_price_by_city', 'total_real_listings')
    """
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(query)
        rows = cur.fetchall()
        conn.close()
        return {r["key"]: r["value"] for r in rows}
    except Exception:
        return {}


def save_pipeline_state(key: str, value: Any):
    """Upsert a pipeline state key."""
    upsert = """
        INSERT INTO pipeline_state (key, value, updated_at)
        VALUES (%s, %s, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    """
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(upsert, (key, json.dumps(value)))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Could not save pipeline state: {e}")


def save_quality_scores(scores: List[Dict]):
    """Write quality scores back to the properties table."""
    update = """
        UPDATE properties
        SET "dataQualityScore" = %s, "qualityFlags" = %s, "enrichedAt" = NOW()
        WHERE id = %s
    """
    try:
        conn = get_connection()
        cur = conn.cursor()
        for s in scores:
            cur.execute(update, (s["score"], json.dumps(s["flags"]), s["id"]))
        conn.commit()
        conn.close()
        logger.info(f"Saved quality scores for {len(scores)} listings")
    except Exception as e:
        logger.warning(f"Could not save quality scores: {e}")


def save_enriched_features(features: List[Dict]):
    """Write enriched features to the listing_features table."""
    upsert = """
        INSERT INTO listing_features (
            property_id, price_per_sqm, market_price_per_sqm, price_deviation_pct,
            estate_name, lga, geospatial_zone, usd_price, completeness_score,
            days_on_market, comparable_count, enriched_at
        ) VALUES (
            %(property_id)s, %(price_per_sqm)s, %(market_price_per_sqm)s,
            %(price_deviation_pct)s, %(estate_name)s, %(lga)s, %(geospatial_zone)s,
            %(usd_price)s, %(completeness_score)s, %(days_on_market)s,
            %(comparable_count)s, NOW()
        )
        ON CONFLICT (property_id) DO UPDATE SET
            price_per_sqm = EXCLUDED.price_per_sqm,
            market_price_per_sqm = EXCLUDED.market_price_per_sqm,
            price_deviation_pct = EXCLUDED.price_deviation_pct,
            usd_price = EXCLUDED.usd_price,
            enriched_at = NOW()
    """
    try:
        conn = get_connection()
        cur = conn.cursor()
        psycopg2.extras.execute_batch(cur, upsert, features)
        conn.commit()
        conn.close()
        logger.info(f"Saved enriched features for {len(features)} listings")
    except Exception as e:
        logger.warning(f"Could not save enriched features: {e}")


# ── Quality Scoring ───────────────────────────────────────────────────────────
def compute_quality_score(row: pd.Series) -> Dict[str, Any]:
    """
    Score a listing 0–100 based on completeness, consistency, and trust signals.

    Scoring dimensions:
      - Completeness (40 pts): required fields, images, description length
      - Consistency (30 pts): price vs. market benchmark, sqm vs. bedrooms ratio
      - Trust (30 pts): agent verification status, listing age, view count
    """
    score = 0
    flags = []

    # ── Completeness (40 pts) ─────────────────────────────────────────────────
    # Required fields (20 pts)
    required = ["title", "address", "city", "price", "bedrooms", "bathrooms", "squareFeet"]
    present = sum(1 for f in required if row.get(f) and str(row[f]).strip())
    score += (present / len(required)) * 20
    if present < len(required):
        missing = [f for f in required if not row.get(f)]
        flags.append(f"missing_fields:{','.join(missing)}")

    # Images (10 pts)
    img_count = int(row.get("image_count") or 0)
    if img_count >= 10:
        score += 10
    elif img_count >= 5:
        score += 7
    elif img_count >= 1:
        score += 3
    else:
        flags.append("no_images")

    # Description length (10 pts)
    desc = str(row.get("description") or "")
    if len(desc) >= 200:
        score += 10
    elif len(desc) >= 100:
        score += 6
    elif len(desc) >= 50:
        score += 3
    else:
        flags.append("thin_description")

    # ── Consistency (30 pts) ──────────────────────────────────────────────────
    price = float(row.get("price") or 0)
    sqm = float(row.get("squareFeet") or 0)
    bedrooms = int(row.get("bedrooms") or 0)
    city = str(row.get("city") or "")

    # Price vs. market benchmark (15 pts)
    city_benchmarks = PRICE_BENCHMARKS_PER_SQM.get(city, {})
    market_psm = city_benchmarks.get("default", PRICE_BENCHMARKS_PER_SQM["default"])
    if sqm > 0 and price > 0:
        listing_psm = price / sqm
        deviation = abs(listing_psm - market_psm) / market_psm
        if deviation < 0.3:
            score += 15
        elif deviation < 0.6:
            score += 8
        else:
            score += 2
            flags.append(f"price_outlier:{deviation:.0%}_from_market")

    # Bedrooms vs. sqm ratio (15 pts)
    if bedrooms > 0 and sqm > 0:
        sqm_per_bed = sqm / bedrooms
        if 20 <= sqm_per_bed <= 150:  # Reasonable Nigerian range
            score += 15
        elif 10 <= sqm_per_bed <= 250:
            score += 8
        else:
            score += 2
            flags.append(f"unusual_sqm_per_bed:{sqm_per_bed:.0f}")

    # ── Trust (30 pts) ────────────────────────────────────────────────────────
    # Geolocation (10 pts)
    lat = row.get("latitude")
    lng = row.get("longitude")
    if lat and lng:
        try:
            lat_f, lng_f = float(lat), float(lng)
            # Check within Nigeria bounding box
            if 4.0 <= lat_f <= 14.0 and 2.5 <= lng_f <= 15.0:
                score += 10
            else:
                flags.append("coordinates_outside_nigeria")
                score += 2
        except (ValueError, TypeError):
            flags.append("invalid_coordinates")
    else:
        flags.append("no_coordinates")

    # View count (10 pts — proxy for real listing vs. spam)
    view_count = int(row.get("view_count") or 0)
    if view_count >= 50:
        score += 10
    elif view_count >= 10:
        score += 6
    elif view_count >= 1:
        score += 3

    # Agent tenure (10 pts)
    agent_since = row.get("agent_since")
    if agent_since:
        try:
            tenure_days = (datetime.utcnow() - pd.Timestamp(agent_since).to_pydatetime().replace(tzinfo=None)).days
            if tenure_days >= 365:
                score += 10
            elif tenure_days >= 90:
                score += 6
            elif tenure_days >= 30:
                score += 3
            else:
                flags.append("new_agent")
        except Exception:
            pass

    return {
        "id": int(row["id"]),
        "score": min(100, round(score, 1)),
        "flags": flags,
    }


# ── Enrichment ────────────────────────────────────────────────────────────────
def get_usd_rate() -> float:
    """Fetch current USD/NGN rate from CBN exchange API."""
    try:
        resp = requests.get(CBN_EXCHANGE_API, timeout=5)
        data = resp.json()
        # Rate is USD to other currencies; we want NGN per USD
        ngn_per_usd = data.get("rates", {}).get("NGN", 1600.0)
        logger.info(f"USD/NGN rate: {ngn_per_usd}")
        return float(ngn_per_usd)
    except Exception:
        logger.warning("Could not fetch exchange rate, using default 1600")
        return 1600.0


def enrich_listing(row: pd.Series, usd_rate: float) -> Dict[str, Any]:
    """Compute enriched features for a single listing."""
    city = str(row.get("city") or "")
    price = float(row.get("price") or 0)
    sqm = float(row.get("squareFeet") or 0)
    address = str(row.get("address") or "")

    # Price per sqm
    price_per_sqm = price / sqm if sqm > 0 else 0

    # Market benchmark
    city_benchmarks = PRICE_BENCHMARKS_PER_SQM.get(city, {})
    # Try to match estate from address
    market_psm = city_benchmarks.get("default", PRICE_BENCHMARKS_PER_SQM["default"])
    estate_name = None
    for estate, psm in city_benchmarks.items():
        if estate != "default" and estate.lower() in address.lower():
            market_psm = psm
            estate_name = estate
            break

    price_deviation = ((price_per_sqm - market_psm) / market_psm * 100) if market_psm > 0 else 0

    # Geospatial zone
    city_info = NIGERIAN_CITIES.get(city, {})
    geospatial_zone = city_info.get("zone", "Unknown")
    lga = city_info.get("state", "Unknown")  # Simplified — real LGA needs PostGIS lookup

    # USD price
    usd_price = price / usd_rate if usd_rate > 0 else 0

    # Days on market
    created_at = row.get("createdAt")
    days_on_market = 0
    if created_at:
        try:
            dom = (datetime.utcnow() - pd.Timestamp(created_at).to_pydatetime().replace(tzinfo=None)).days
            days_on_market = max(0, dom)
        except Exception:
            pass

    # Completeness score (0–1)
    fields = ["title", "description", "address", "price", "bedrooms", "bathrooms",
              "squareFeet", "latitude", "longitude"]
    completeness = sum(1 for f in fields if row.get(f)) / len(fields)

    return {
        "property_id": int(row["id"]),
        "price_per_sqm": round(price_per_sqm, 2),
        "market_price_per_sqm": float(market_psm),
        "price_deviation_pct": round(price_deviation, 2),
        "estate_name": estate_name or "",
        "lga": lga,
        "geospatial_zone": geospatial_zone,
        "usd_price": round(usd_price, 2),
        "completeness_score": round(completeness, 3),
        "days_on_market": days_on_market,
        "comparable_count": 0,  # Populated by GNN service
    }


# ── Drift Detection ───────────────────────────────────────────────────────────
def detect_price_drift(df: pd.DataFrame, baseline: Dict[str, float]) -> Dict[str, float]:
    """
    Compare current median prices by city to the training baseline.
    Returns a dict of city → drift percentage.
    """
    drift = {}
    if df.empty:
        return drift

    current = df.groupby("city")["price"].median().to_dict()
    for city, current_median in current.items():
        if city in baseline and baseline[city] > 0:
            d = abs(current_median - baseline[city]) / baseline[city]
            drift[city] = round(d, 4)
            if d > PRICE_DRIFT_THRESHOLD:
                logger.warning(f"Price drift detected in {city}: {d:.1%} (threshold: {PRICE_DRIFT_THRESHOLD:.1%})")

    return drift


# ── Retraining Trigger ────────────────────────────────────────────────────────
def trigger_retraining(reason: str):
    """
    Trigger incremental GNN retraining via the training pipeline.
    In production, this posts to an internal job queue (Kafka/Fluvio).
    In development, it calls the training pipeline directly.
    """
    logger.info(f"Triggering GNN retraining. Reason: {reason}")

    # Post to internal job queue if available
    job_queue_url = os.getenv("JOB_QUEUE_URL")
    if job_queue_url:
        try:
            resp = requests.post(
                f"{job_queue_url}/jobs",
                json={"type": "gnn_retrain", "reason": reason, "mode": "incremental"},
                timeout=5,
            )
            if resp.ok:
                logger.info(f"Retraining job queued: {resp.json()}")
                return
        except Exception as e:
            logger.warning(f"Job queue unavailable: {e}")

    # Fallback: run training pipeline in subprocess
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, "training_pipeline.py", "--mode", "gnn", "--epochs", "20"],
            cwd=os.path.dirname(__file__),
            capture_output=True,
            text=True,
            timeout=3600,
        )
        if result.returncode == 0:
            logger.info("Incremental GNN retraining completed successfully")
            save_pipeline_state("last_retrain_at", datetime.utcnow().isoformat())
            save_pipeline_state("listings_since_retrain", 0)
        else:
            logger.error(f"Retraining failed: {result.stderr[:500]}")
    except subprocess.TimeoutExpired:
        logger.error("Retraining timed out after 1 hour")
    except Exception as e:
        logger.error(f"Could not trigger retraining: {e}")


# ── Pipeline stages ───────────────────────────────────────────────────────────
def run_ingest(since: Optional[datetime] = None) -> pd.DataFrame:
    """Stage 1: Ingest + quality score."""
    logger.info("=== Stage 1: Ingest ===")
    df = get_new_listings(since=since)
    if df.empty:
        logger.info("No new listings to process")
        return df

    # Quality scoring
    logger.info(f"Scoring quality for {len(df)} listings...")
    scores = [compute_quality_score(row) for _, row in df.iterrows()]

    # Summary stats
    score_values = [s["score"] for s in scores]
    logger.info(f"Quality scores — mean: {np.mean(score_values):.1f}, "
                f"min: {np.min(score_values):.1f}, max: {np.max(score_values):.1f}")
    logger.info(f"High quality (≥70): {sum(1 for s in score_values if s >= 70)}/{len(score_values)}")

    save_quality_scores(scores)

    # Update pipeline state
    state = get_pipeline_state()
    prev_count = int(state.get("listings_since_retrain", "0") or 0)
    save_pipeline_state("listings_since_retrain", prev_count + len(df))
    save_pipeline_state("last_ingest_at", datetime.utcnow().isoformat())
    save_pipeline_state("total_real_listings", int(state.get("total_real_listings", "0") or 0) + len(df))

    return df


def run_enrich(df: pd.DataFrame) -> List[Dict]:
    """Stage 2: Enrich listings with market context."""
    logger.info("=== Stage 2: Enrich ===")
    if df.empty:
        return []

    usd_rate = get_usd_rate()
    features = [enrich_listing(row, usd_rate) for _, row in df.iterrows()]
    save_enriched_features(features)

    # Update baseline prices by city
    city_medians = df.groupby("city")["price"].median().to_dict()
    save_pipeline_state("baseline_price_by_city", city_medians)

    logger.info(f"Enriched {len(features)} listings")
    return features


def run_drift_check(df: pd.DataFrame) -> bool:
    """Stage 3: Check for price drift. Returns True if retraining needed."""
    logger.info("=== Stage 3: Drift Detection ===")
    if df.empty:
        return False

    state = get_pipeline_state()
    baseline_raw = state.get("baseline_price_by_city", "{}")
    try:
        baseline = json.loads(baseline_raw) if isinstance(baseline_raw, str) else baseline_raw
    except Exception:
        baseline = {}

    if not baseline:
        logger.info("No baseline yet — skipping drift check")
        return False

    drift = detect_price_drift(df, baseline)
    significant_drift = {c: d for c, d in drift.items() if d > PRICE_DRIFT_THRESHOLD}

    if significant_drift:
        logger.warning(f"Significant price drift in: {significant_drift}")
        return True

    logger.info(f"No significant price drift detected. Max drift: {max(drift.values(), default=0):.1%}")
    return False


def run_retrain_check(force: bool = False):
    """Stage 4: Trigger retraining if thresholds met."""
    logger.info("=== Stage 4: Retraining Check ===")
    state = get_pipeline_state()
    listings_since = int(state.get("listings_since_retrain", "0") or 0)

    if force:
        trigger_retraining("forced")
    elif listings_since >= RETRAIN_THRESHOLD_LISTINGS:
        trigger_retraining(f"threshold_reached:{listings_since}_listings")
    else:
        logger.info(f"No retraining needed. Listings since last retrain: {listings_since}/{RETRAIN_THRESHOLD_LISTINGS}")


def print_status():
    """Print pipeline status."""
    state = get_pipeline_state()
    print("\n=== Listing Data Pipeline Status ===")
    print(f"  Last ingest:          {state.get('last_ingest_at', 'Never')}")
    print(f"  Last retrain:         {state.get('last_retrain_at', 'Never')}")
    print(f"  Listings since retrain: {state.get('listings_since_retrain', 0)}/{RETRAIN_THRESHOLD_LISTINGS}")
    print(f"  Total real listings:  {state.get('total_real_listings', 0)}")
    baseline = state.get("baseline_price_by_city", {})
    if baseline:
        try:
            prices = json.loads(baseline) if isinstance(baseline, str) else baseline
            print(f"  Baseline prices by city:")
            for city, price in sorted(prices.items()):
                print(f"    {city}: ₦{price:,.0f}")
        except Exception:
            pass
    print()


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Real Listing Data Pipeline")
    parser.add_argument("--mode", choices=["ingest", "enrich", "retrain", "full", "status"],
                        default="full")
    parser.add_argument("--since", type=str, help="ISO datetime for incremental ingest")
    parser.add_argument("--force-retrain", action="store_true")
    args = parser.parse_args()

    since = datetime.fromisoformat(args.since) if args.since else None

    if args.mode == "status":
        print_status()
        return

    if args.mode in ("ingest", "full"):
        df = run_ingest(since=since)
    else:
        df = get_new_listings(since=since)

    if args.mode in ("enrich", "full"):
        run_enrich(df)

    if args.mode == "full":
        needs_retrain = run_drift_check(df)
        run_retrain_check(force=args.force_retrain or needs_retrain)
    elif args.mode == "retrain":
        run_retrain_check(force=True)

    logger.info("Pipeline complete")


if __name__ == "__main__":
    main()
