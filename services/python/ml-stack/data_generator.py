"""
Synthetic Nigerian Real Estate & Financial Data Generator
=========================================================
Generates realistic training data for:
  1. Fraud Detection Model  (transaction-level features)
  2. Credit Scoring Model   (borrower-level features)
  3. GNN Property Valuation (property graph with spatial edges)

Data distributions are calibrated to:
  - Nigerian property market (Lagos, Abuja, PH, Ibadan, Kano, Enugu)
  - CBN/NBS income statistics (2022-2024)
  - FMBN/mortgage default rates (~8.3% NPL ratio)
  - Nigerian real estate price indices (Knight Frank Nigeria 2023)
  - Typical fraud patterns in Nigerian fintech (NIBSS 2023 report)

Usage:
  python data_generator.py --output-dir ./data --samples 50000
"""

import numpy as np
import pandas as pd
import json
import os
import argparse
from datetime import datetime, timedelta
from typing import Tuple, Dict, List
import random
import hashlib

# ── Reproducibility ────────────────────────────────────────────────────────
SEED = 42
np.random.seed(SEED)
random.seed(SEED)

# ── Nigerian Market Constants ──────────────────────────────────────────────

CITIES = {
    "Lagos": {
        "weight": 0.38,
        "zones": {
            "Ikoyi": {"price_mult": 4.5, "lat_range": (6.44, 6.46), "lng_range": (3.42, 3.44)},
            "Victoria Island": {"price_mult": 4.2, "lat_range": (6.42, 6.44), "lng_range": (3.39, 3.42)},
            "Lekki Phase 1": {"price_mult": 3.2, "lat_range": (6.44, 6.47), "lng_range": (3.46, 3.52)},
            "Lekki Phase 2": {"price_mult": 2.5, "lat_range": (6.44, 6.47), "lng_range": (3.52, 3.60)},
            "Ajah": {"price_mult": 1.8, "lat_range": (6.46, 6.49), "lng_range": (3.60, 3.68)},
            "Surulere": {"price_mult": 1.4, "lat_range": (6.49, 6.52), "lng_range": (3.34, 3.38)},
            "Yaba": {"price_mult": 1.5, "lat_range": (6.50, 6.52), "lng_range": (3.36, 3.39)},
            "Ikeja": {"price_mult": 1.6, "lat_range": (6.59, 6.62), "lng_range": (3.33, 3.36)},
            "Agege": {"price_mult": 0.8, "lat_range": (6.61, 6.64), "lng_range": (3.30, 3.33)},
            "Alimosho": {"price_mult": 0.7, "lat_range": (6.60, 6.65), "lng_range": (3.25, 3.30)},
        },
        "base_price_per_sqm": 450_000,  # NGN per sqm
    },
    "Abuja": {
        "weight": 0.22,
        "zones": {
            "Maitama": {"price_mult": 4.0, "lat_range": (9.07, 9.09), "lng_range": (7.47, 7.50)},
            "Asokoro": {"price_mult": 3.8, "lat_range": (9.04, 9.06), "lng_range": (7.52, 7.55)},
            "Wuse 2": {"price_mult": 3.0, "lat_range": (9.06, 9.08), "lng_range": (7.46, 7.49)},
            "Garki": {"price_mult": 2.2, "lat_range": (9.02, 9.05), "lng_range": (7.47, 7.50)},
            "Gwarinpa": {"price_mult": 1.5, "lat_range": (9.10, 9.13), "lng_range": (7.37, 7.41)},
            "Kubwa": {"price_mult": 0.9, "lat_range": (9.14, 9.18), "lng_range": (7.32, 7.36)},
        },
        "base_price_per_sqm": 380_000,
    },
    "Port Harcourt": {
        "weight": 0.15,
        "zones": {
            "GRA Phase 2": {"price_mult": 3.2, "lat_range": (4.79, 4.81), "lng_range": (7.00, 7.03)},
            "GRA Phase 1": {"price_mult": 2.8, "lat_range": (4.77, 4.79), "lng_range": (6.99, 7.02)},
            "Trans Amadi": {"price_mult": 1.8, "lat_range": (4.82, 4.85), "lng_range": (7.01, 7.04)},
            "Rumuola": {"price_mult": 1.2, "lat_range": (4.83, 4.86), "lng_range": (7.02, 7.05)},
            "Diobu": {"price_mult": 0.9, "lat_range": (4.74, 4.77), "lng_range": (6.99, 7.02)},
        },
        "base_price_per_sqm": 280_000,
    },
    "Ibadan": {
        "weight": 0.10,
        "zones": {
            "Bodija": {"price_mult": 2.2, "lat_range": (7.40, 7.43), "lng_range": (3.89, 3.92)},
            "Jericho": {"price_mult": 2.0, "lat_range": (7.39, 7.42), "lng_range": (3.87, 3.90)},
            "Oluyole": {"price_mult": 1.4, "lat_range": (7.36, 7.39), "lng_range": (3.86, 3.89)},
            "Agodi": {"price_mult": 1.6, "lat_range": (7.39, 7.42), "lng_range": (3.90, 3.93)},
        },
        "base_price_per_sqm": 180_000,
    },
    "Kano": {
        "weight": 0.08,
        "zones": {
            "Nassarawa": {"price_mult": 2.0, "lat_range": (12.00, 12.03), "lng_range": (8.52, 8.55)},
            "Bompai": {"price_mult": 1.5, "lat_range": (12.01, 12.04), "lng_range": (8.50, 8.53)},
            "Fagge": {"price_mult": 1.0, "lat_range": (11.99, 12.02), "lng_range": (8.51, 8.54)},
        },
        "base_price_per_sqm": 150_000,
    },
    "Enugu": {
        "weight": 0.07,
        "zones": {
            "GRA": {"price_mult": 2.5, "lat_range": (6.45, 6.47), "lng_range": (7.49, 7.52)},
            "Independence Layout": {"price_mult": 2.0, "lat_range": (6.44, 6.46), "lng_range": (7.47, 7.50)},
            "New Haven": {"price_mult": 1.5, "lat_range": (6.46, 6.48), "lng_range": (7.50, 7.53)},
        },
        "base_price_per_sqm": 160_000,
    },
}

PROPERTY_TYPES = {
    "apartment": 0.35,
    "detached_house": 0.20,
    "semi_detached": 0.18,
    "terrace": 0.15,
    "bungalow": 0.07,
    "duplex": 0.05,
}

BEDROOM_DIST = {1: 0.15, 2: 0.30, 3: 0.30, 4: 0.15, 5: 0.07, 6: 0.03}

# ── Property Data Generator ────────────────────────────────────────────────

def generate_property_data(n: int = 10000) -> pd.DataFrame:
    """Generate synthetic Nigerian property listings with realistic price distributions."""
    records = []
    city_names = list(CITIES.keys())
    city_weights = [CITIES[c]["weight"] for c in city_names]

    for i in range(n):
        city_name = np.random.choice(city_names, p=city_weights)
        city = CITIES[city_name]
        zone_name = np.random.choice(list(city["zones"].keys()))
        zone = city["zones"][zone_name]

        prop_type = np.random.choice(list(PROPERTY_TYPES.keys()), p=list(PROPERTY_TYPES.values()))
        bedrooms = np.random.choice(list(BEDROOM_DIST.keys()), p=list(BEDROOM_DIST.values()))
        bathrooms = max(1, bedrooms - np.random.randint(0, 2))

        # Sqft based on type and bedrooms
        sqm_base = {
            "apartment": 60 + bedrooms * 25,
            "bungalow": 80 + bedrooms * 30,
            "terrace": 100 + bedrooms * 35,
            "semi_detached": 120 + bedrooms * 40,
            "duplex": 150 + bedrooms * 45,
            "detached_house": 180 + bedrooms * 50,
        }[prop_type]
        sqm = int(np.random.normal(sqm_base, sqm_base * 0.15))
        sqm = max(30, sqm)

        # Price calculation with realistic noise
        base_price = city["base_price_per_sqm"] * zone["price_mult"] * sqm
        price_noise = np.random.lognormal(0, 0.25)  # Log-normal noise
        price = int(base_price * price_noise)

        # Age of property
        year_built = int(np.random.choice(
            range(1970, 2025),
            p=np.array([0.5 if y < 1990 else (2.0 if y >= 2010 else 1.0) for y in range(1970, 2025)]) / sum([0.5 if y < 1990 else (2.0 if y >= 2010 else 1.0) for y in range(1970, 2025)])
        ))

        # Location with jitter
        lat = np.random.uniform(*zone["lat_range"])
        lng = np.random.uniform(*zone["lng_range"])

        # Days on market (exponential — most sell quickly, some linger)
        days_on_market = int(np.random.exponential(45))

        # Views and saves (correlated with price and location)
        views = int(np.random.poisson(50 + (1 / (price / 1e7 + 1)) * 100))
        saves = int(views * np.random.beta(2, 8))

        # Features
        has_pool = prop_type in ["detached_house"] and np.random.random() < 0.3
        has_generator = np.random.random() < 0.7  # Very common in Nigeria
        has_borehole = np.random.random() < 0.6
        has_security = np.random.random() < 0.8
        is_serviced = zone["price_mult"] > 2.5 and np.random.random() < 0.6

        records.append({
            "property_id": f"prop_{i:06d}",
            "city": city_name,
            "zone": zone_name,
            "property_type": prop_type,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "sqm": sqm,
            "price": price,
            "price_per_sqm": price // sqm,
            "year_built": year_built,
            "age_years": 2024 - year_built,
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "days_on_market": days_on_market,
            "views": views,
            "saves": saves,
            "has_pool": int(has_pool),
            "has_generator": int(has_generator),
            "has_borehole": int(has_borehole),
            "has_security": int(has_security),
            "is_serviced": int(is_serviced),
            "floor_count": max(1, int(np.random.choice([1, 2, 3, 4], p=[0.4, 0.35, 0.15, 0.10]))),
            "parking_spaces": max(0, int(np.random.choice([0, 1, 2, 3, 4], p=[0.1, 0.3, 0.35, 0.2, 0.05]))),
            "price_mult": zone["price_mult"],
        })

    return pd.DataFrame(records)


# ── Transaction / Fraud Data Generator ────────────────────────────────────

def generate_transaction_data(n: int = 50000, fraud_rate: float = 0.035) -> pd.DataFrame:
    """
    Generate synthetic Nigerian real estate transaction data with fraud labels.

    Fraud patterns calibrated to NIBSS 2023 fraud report:
      - Account takeover (40% of fraud)
      - Identity theft (25%)
      - Mortgage fraud (20%)
      - Money laundering (15%)

    Fraud rate ~3.5% (slightly above Nigerian average to ensure model training signal)
    """
    n_fraud = int(n * fraud_rate)
    n_legit = n - n_fraud

    def make_transaction(is_fraud: bool) -> Dict:
        # User profile
        user_age = int(np.random.normal(38 if not is_fraud else 32, 8))
        user_age = max(18, min(75, user_age))

        # Income (NGN/year) — NBS 2023 distribution
        if not is_fraud:
            income_bracket = np.random.choice(
                ["low", "lower_mid", "mid", "upper_mid", "high"],
                p=[0.30, 0.25, 0.25, 0.15, 0.05]
            )
            income_map = {
                "low": np.random.uniform(600_000, 1_800_000),
                "lower_mid": np.random.uniform(1_800_000, 3_600_000),
                "mid": np.random.uniform(3_600_000, 7_200_000),
                "upper_mid": np.random.uniform(7_200_000, 18_000_000),
                "high": np.random.uniform(18_000_000, 120_000_000),
            }
            annual_income = income_map[income_bracket]
        else:
            # Fraudsters often have inconsistent income claims
            annual_income = np.random.choice([
                np.random.uniform(300_000, 600_000),   # Under-declared
                np.random.uniform(50_000_000, 200_000_000),  # Over-declared
            ], p=[0.6, 0.4])

        # Transaction amount
        if not is_fraud:
            # Legitimate: amount proportional to income (3-8x annual income for property)
            amount = annual_income * np.random.uniform(2, 8)
            amount = max(500_000, min(amount, 500_000_000))
        else:
            fraud_type = np.random.choice(
                ["account_takeover", "identity_theft", "mortgage_fraud", "laundering"],
                p=[0.40, 0.25, 0.20, 0.15]
            )
            if fraud_type == "account_takeover":
                amount = np.random.uniform(1_000_000, 15_000_000)
            elif fraud_type == "identity_theft":
                amount = np.random.uniform(5_000_000, 50_000_000)
            elif fraud_type == "mortgage_fraud":
                amount = np.random.uniform(20_000_000, 150_000_000)
            else:  # laundering
                amount = np.random.uniform(100_000_000, 500_000_000)

        # Account age (days)
        account_age_days = int(np.random.exponential(800 if not is_fraud else 120))
        account_age_days = max(1, account_age_days)

        # Transaction velocity (transactions in last 30 days)
        velocity_30d = int(np.random.poisson(3 if not is_fraud else 12))

        # Device/session features
        is_new_device = np.random.random() < (0.05 if not is_fraud else 0.65)
        is_vpn = np.random.random() < (0.02 if not is_fraud else 0.45)
        is_unusual_hour = np.random.random() < (0.08 if not is_fraud else 0.40)

        # Payment method
        payment_method = np.random.choice(
            ["bank_transfer", "mortgage", "installment", "crypto", "cash"],
            p=[0.55, 0.25, 0.12, 0.03, 0.05] if not is_fraud else [0.20, 0.10, 0.05, 0.35, 0.30]
        )

        # Time since last transaction (hours)
        time_since_last_txn = np.random.exponential(72 if not is_fraud else 8)

        # KYC completion
        kyc_score = np.random.beta(8, 2) if not is_fraud else np.random.beta(2, 5)

        # Credit score (300-850 range, Nigerian equivalent)
        credit_score = int(np.random.normal(620 if not is_fraud else 480, 80))
        credit_score = max(300, min(850, credit_score))

        # Number of previous transactions
        prev_transactions = int(np.random.exponential(15 if not is_fraud else 3))

        # Address match (billing vs property)
        address_match = np.random.random() < (0.92 if not is_fraud else 0.35)

        # Document verification score
        doc_score = np.random.beta(9, 1) if not is_fraud else np.random.beta(3, 4)

        # City
        city = np.random.choice(
            list(CITIES.keys()),
            p=[CITIES[c]["weight"] for c in CITIES.keys()]
        )

        return {
            "user_age": user_age,
            "annual_income": round(annual_income, 2),
            "transaction_amount": round(amount, 2),
            "amount_to_income_ratio": round(amount / max(annual_income, 1), 4),
            "account_age_days": account_age_days,
            "velocity_30d": velocity_30d,
            "is_new_device": int(is_new_device),
            "is_vpn": int(is_vpn),
            "is_unusual_hour": int(is_unusual_hour),
            "payment_method": payment_method,
            "payment_method_risk": {"bank_transfer": 0, "mortgage": 0, "installment": 1, "crypto": 3, "cash": 2}[payment_method],
            "time_since_last_txn_hours": round(time_since_last_txn, 2),
            "kyc_score": round(kyc_score, 4),
            "credit_score": credit_score,
            "prev_transactions": prev_transactions,
            "address_match": int(address_match),
            "doc_verification_score": round(doc_score, 4),
            "city": city,
            "is_fraud": int(is_fraud),
        }

    legit = [make_transaction(False) for _ in range(n_legit)]
    fraud = [make_transaction(True) for _ in range(n_fraud)]
    all_txns = legit + fraud
    random.shuffle(all_txns)

    df = pd.DataFrame(all_txns)
    # One-hot encode payment_method
    df = pd.get_dummies(df, columns=["payment_method", "city"], drop_first=False)
    return df


# ── Credit Scoring Data Generator ─────────────────────────────────────────

def generate_credit_data(n: int = 30000, default_rate: float = 0.083) -> pd.DataFrame:
    """
    Generate synthetic Nigerian mortgage/loan applicant data.

    Default rate 8.3% calibrated to FMBN NPL ratio (2023).
    Features based on typical Nigerian mortgage underwriting criteria.
    """
    n_default = int(n * default_rate)
    n_good = n - n_default

    def make_applicant(is_default: bool) -> Dict:
        # Demographics
        age = int(np.random.normal(42 if not is_default else 36, 9))
        age = max(21, min(65, age))

        employment_type = np.random.choice(
            ["civil_servant", "private_sector", "self_employed", "contractor", "unemployed"],
            p=[0.30, 0.35, 0.20, 0.10, 0.05] if not is_default else [0.15, 0.20, 0.35, 0.15, 0.15]
        )

        # Years employed
        years_employed = max(0, int(np.random.normal(8 if not is_default else 3, 4)))

        # Income
        income_mult = {"civil_servant": 1.0, "private_sector": 1.4, "self_employed": 1.2, "contractor": 1.1, "unemployed": 0.3}[employment_type]
        monthly_income = int(np.random.lognormal(np.log(200_000 * income_mult), 0.6))
        monthly_income = max(30_000, monthly_income)

        # Loan details
        loan_amount = monthly_income * np.random.uniform(30, 120 if not is_default else 200)
        property_value = loan_amount * np.random.uniform(1.1, 1.5)
        ltv = loan_amount / property_value  # Loan-to-Value ratio

        # Existing debts
        existing_debt_ratio = np.random.beta(2, 6) if not is_default else np.random.beta(5, 3)

        # Credit history
        credit_score = int(np.random.normal(640 if not is_default else 490, 75))
        credit_score = max(300, min(850, credit_score))

        missed_payments_12m = int(np.random.poisson(0.2 if not is_default else 3.5))
        bankruptcy_history = int(np.random.random() < (0.01 if not is_default else 0.18))

        # Assets
        has_other_property = np.random.random() < (0.35 if not is_default else 0.12)
        savings_months = np.random.exponential(6 if not is_default else 1.5)

        # NHF (National Housing Fund) contribution
        nhf_contributor = np.random.random() < (0.45 if not is_default else 0.20)

        # Guarantor
        has_guarantor = np.random.random() < (0.40 if not is_default else 0.15)

        # City
        city = np.random.choice(list(CITIES.keys()), p=[CITIES[c]["weight"] for c in CITIES.keys()])

        # Loan term
        loan_term_years = int(np.random.choice([5, 10, 15, 20, 25], p=[0.10, 0.20, 0.30, 0.25, 0.15]))

        # Monthly payment / income ratio (DTI)
        monthly_rate = 0.18 / 12  # ~18% average Nigerian mortgage rate
        n_payments = loan_term_years * 12
        monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate)**n_payments) / ((1 + monthly_rate)**n_payments - 1)
        dti = monthly_payment / monthly_income

        return {
            "age": age,
            "employment_type": employment_type,
            "years_employed": years_employed,
            "monthly_income": monthly_income,
            "loan_amount": round(loan_amount, 2),
            "property_value": round(property_value, 2),
            "ltv_ratio": round(ltv, 4),
            "existing_debt_ratio": round(existing_debt_ratio, 4),
            "dti_ratio": round(dti, 4),
            "credit_score": credit_score,
            "missed_payments_12m": missed_payments_12m,
            "bankruptcy_history": bankruptcy_history,
            "has_other_property": int(has_other_property),
            "savings_months": round(savings_months, 2),
            "nhf_contributor": int(nhf_contributor),
            "has_guarantor": int(has_guarantor),
            "loan_term_years": loan_term_years,
            "city": city,
            "is_default": int(is_default),
        }

    good = [make_applicant(False) for _ in range(n_good)]
    bad = [make_applicant(True) for _ in range(n_default)]
    all_apps = good + bad
    random.shuffle(all_apps)

    df = pd.DataFrame(all_apps)
    df = pd.get_dummies(df, columns=["employment_type", "city"], drop_first=False)
    return df


# ── GNN Graph Builder ──────────────────────────────────────────────────────

def build_property_graph(properties_df: pd.DataFrame, max_neighbors: int = 8, radius_km: float = 2.0) -> Dict:
    """
    Build a property graph for GNN training.

    Nodes: properties (with feature vectors)
    Edges: spatial proximity (within radius_km) + same zone + same type

    Returns dict with:
      - node_features: np.ndarray (N x F)
      - edge_index: np.ndarray (2 x E)
      - edge_weights: np.ndarray (E,)
      - targets: np.ndarray (N,) — log-normalized prices
      - feature_names: list
    """
    from sklearn.preprocessing import StandardScaler

    print(f"Building property graph for {len(properties_df)} nodes...")

    # Node features
    feature_cols = [
        "bedrooms", "bathrooms", "sqm", "age_years",
        "has_pool", "has_generator", "has_borehole", "has_security", "is_serviced",
        "floor_count", "parking_spaces", "price_mult",
        "days_on_market", "views", "saves",
    ]

    # Add city and type one-hot
    city_dummies = pd.get_dummies(properties_df["city"], prefix="city")
    type_dummies = pd.get_dummies(properties_df["property_type"], prefix="type")

    feature_df = pd.concat([properties_df[feature_cols], city_dummies, type_dummies], axis=1)
    feature_names = list(feature_df.columns)

    scaler = StandardScaler()
    node_features = scaler.fit_transform(feature_df.values.astype(np.float32))

    # Targets: log-normalized price (in millions NGN)
    targets = np.log1p(properties_df["price"].values / 1_000_000).astype(np.float32)

    # Build edges using spatial proximity
    lats = properties_df["lat"].values
    lngs = properties_df["lng"].values
    zones = properties_df["zone"].values
    cities = properties_df["city"].values

    edges_src = []
    edges_dst = []
    edge_weights = []

    # Use a grid-based approach for efficiency (avoid O(N^2))
    # Group by city first, then compute distances within city
    for city_name in properties_df["city"].unique():
        city_mask = cities == city_name
        city_indices = np.where(city_mask)[0]
        city_lats = lats[city_indices]
        city_lngs = lngs[city_indices]

        for i, idx_i in enumerate(city_indices):
            # Approximate distance using Euclidean in lat/lng space
            # 1 degree lat ≈ 111km, 1 degree lng ≈ 111*cos(lat)km at Nigerian latitudes
            lat_scale = 111.0
            lng_scale = 111.0 * np.cos(np.radians(city_lats[i]))

            dlat = (city_lats - city_lats[i]) * lat_scale
            dlng = (city_lngs - city_lngs[i]) * lng_scale
            distances = np.sqrt(dlat**2 + dlng**2)

            # Find neighbors within radius
            neighbor_mask = (distances < radius_km) & (distances > 0)
            neighbor_local_indices = np.where(neighbor_mask)[0]

            # Limit to max_neighbors closest
            if len(neighbor_local_indices) > max_neighbors:
                neighbor_distances = distances[neighbor_local_indices]
                top_k = np.argsort(neighbor_distances)[:max_neighbors]
                neighbor_local_indices = neighbor_local_indices[top_k]

            for j in neighbor_local_indices:
                idx_j = city_indices[j]
                weight = np.exp(-distances[j] / radius_km)  # Exponential decay
                edges_src.append(idx_i)
                edges_dst.append(idx_j)
                edge_weights.append(weight)

    edge_index = np.array([edges_src, edges_dst], dtype=np.int64)
    edge_weights_arr = np.array(edge_weights, dtype=np.float32)

    print(f"  Nodes: {len(properties_df)}, Edges: {len(edges_src)}, Avg degree: {len(edges_src)/len(properties_df):.1f}")

    return {
        "node_features": node_features,
        "edge_index": edge_index,
        "edge_weights": edge_weights_arr,
        "targets": targets,
        "feature_names": feature_names,
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "n_features": len(feature_names),
    }


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate synthetic Nigerian real estate training data")
    parser.add_argument("--output-dir", default="./data", help="Output directory")
    parser.add_argument("--properties", type=int, default=15000, help="Number of property records")
    parser.add_argument("--transactions", type=int, default=50000, help="Number of transaction records")
    parser.add_argument("--credit", type=int, default=30000, help="Number of credit applicant records")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    np.random.seed(args.seed)
    random.seed(args.seed)

    os.makedirs(args.output_dir, exist_ok=True)

    print("=" * 60)
    print("Nigerian Real Estate Synthetic Data Generator")
    print("=" * 60)

    # 1. Property data
    print(f"\n[1/4] Generating {args.properties:,} property records...")
    props_df = generate_property_data(args.properties)
    props_path = os.path.join(args.output_dir, "properties.parquet")
    props_df.to_parquet(props_path, index=False)
    print(f"  Saved to {props_path}")
    print(f"  Price range: ₦{props_df['price'].min()/1e6:.1f}M - ₦{props_df['price'].max()/1e6:.0f}M")
    print(f"  Median price: ₦{props_df['price'].median()/1e6:.1f}M")
    print(f"  City distribution:\n{props_df['city'].value_counts().to_string()}")

    # 2. Transaction / fraud data
    print(f"\n[2/4] Generating {args.transactions:,} transaction records (fraud rate ~3.5%)...")
    txn_df = generate_transaction_data(args.transactions)
    txn_path = os.path.join(args.output_dir, "transactions.parquet")
    txn_df.to_parquet(txn_path, index=False)
    fraud_count = txn_df["is_fraud"].sum()
    print(f"  Saved to {txn_path}")
    print(f"  Fraud cases: {fraud_count:,} ({fraud_count/len(txn_df)*100:.1f}%)")

    # 3. Credit data
    print(f"\n[3/4] Generating {args.credit:,} credit applicant records (default rate ~8.3%)...")
    credit_df = generate_credit_data(args.credit)
    credit_path = os.path.join(args.output_dir, "credit.parquet")
    credit_df.to_parquet(credit_path, index=False)
    default_count = credit_df["is_default"].sum()
    print(f"  Saved to {credit_path}")
    print(f"  Default cases: {default_count:,} ({default_count/len(credit_df)*100:.1f}%)")

    # 4. GNN graph
    print(f"\n[4/4] Building property graph for GNN training...")
    graph = build_property_graph(props_df)
    graph_path = os.path.join(args.output_dir, "property_graph.npz")
    np.savez_compressed(
        graph_path,
        node_features=graph["node_features"],
        edge_index=graph["edge_index"],
        edge_weights=graph["edge_weights"],
        targets=graph["targets"],
    )
    # Save metadata
    meta_path = os.path.join(args.output_dir, "graph_metadata.json")
    with open(meta_path, "w") as f:
        json.dump({
            "feature_names": graph["feature_names"],
            "n_features": graph["n_features"],
            "n_nodes": len(props_df),
            "n_edges": graph["edge_index"].shape[1],
            "scaler_mean": graph["scaler_mean"],
            "scaler_scale": graph["scaler_scale"],
        }, f, indent=2)
    print(f"  Graph saved to {graph_path}")
    print(f"  Metadata saved to {meta_path}")

    print("\n" + "=" * 60)
    print("Data generation complete!")
    print(f"  Properties:   {len(props_df):,} records")
    print(f"  Transactions: {len(txn_df):,} records")
    print(f"  Credit:       {len(credit_df):,} records")
    print(f"  Graph nodes:  {len(props_df):,}, edges: {graph['edge_index'].shape[1]:,}")
    print("=" * 60)


if __name__ == "__main__":
    main()
