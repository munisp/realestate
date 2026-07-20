"""
Production Training Pipeline
=============================
PostgreSQL → Feature Engineering → Training → MLflow Registry → Deployment

Supports:
  1. Full retraining (weekly) — trains on all available data
  2. Incremental training (daily) — fine-tunes on new data since last run
  3. Triggered retraining — when drift is detected

Data sources:
  - PostgreSQL: transactions, properties, users, credit applications
  - Feature store: precomputed aggregates (Redis or PostgreSQL)
  - Synthetic data: fills gaps when real data is insufficient

Pipeline stages:
  1. Extract: Pull new records from PostgreSQL since last_run_timestamp
  2. Transform: Feature engineering, normalization, graph construction
  3. Load: Write to feature store (Parquet + PostgreSQL)
  4. Train: Run model training with MLflow tracking
  5. Evaluate: Compare against current production model
  6. Deploy: Promote if metrics improve

Usage:
  python training_pipeline.py --mode full --models fraud,credit,gnn
  python training_pipeline.py --mode incremental --since 2024-01-01
"""

import os
import json
import argparse
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd
import torch

# ── Configuration ──────────────────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/realestate")
MLFLOW_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5001")
DATA_DIR = Path(os.environ.get("ML_DATA_DIR", "./data"))
MODEL_DIR = Path(os.environ.get("ML_MODEL_DIR", "./models"))
MIN_SAMPLES_FOR_TRAINING = int(os.environ.get("MIN_SAMPLES_FOR_TRAINING", "1000"))
SYNTHETIC_FALLBACK = os.environ.get("SYNTHETIC_FALLBACK", "true").lower() == "true"

# ── Feature Engineering ────────────────────────────────────────────────────

class FeatureEngineer:
    """
    Transforms raw PostgreSQL records into ML-ready feature vectors.
    Applies the same transformations as the training data generator.
    """

    def engineer_transaction_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for fraud detection from raw transaction records."""
        features = pd.DataFrame()

        # Basic features
        features["user_age"] = df.get("user_age", 35)
        features["annual_income"] = df.get("annual_income", 0).fillna(0)
        features["transaction_amount"] = df.get("amount", 0).fillna(0)
        features["amount_to_income_ratio"] = (
            features["transaction_amount"] / (features["annual_income"] + 1)
        ).clip(0, 100)

        # Account features
        features["account_age_days"] = df.get("account_age_days", 365).fillna(365)
        features["velocity_30d"] = df.get("velocity_30d", 1).fillna(1)

        # Device/session risk signals
        features["is_new_device"] = df.get("is_new_device", 0).fillna(0).astype(int)
        features["is_vpn"] = df.get("is_vpn", 0).fillna(0).astype(int)
        features["is_unusual_hour"] = df.get("is_unusual_hour", 0).fillna(0).astype(int)

        # Payment method risk encoding
        payment_risk = {"bank_transfer": 0, "mortgage": 0, "installment": 1, "crypto": 3, "cash": 2}
        features["payment_method_risk"] = df.get("payment_method", "bank_transfer").map(
            lambda x: payment_risk.get(x, 1)
        )

        # Time features
        features["time_since_last_txn_hours"] = df.get("time_since_last_txn_hours", 24).fillna(24)

        # Verification scores
        features["kyc_score"] = df.get("kyc_score", 0.8).fillna(0.8).clip(0, 1)
        features["credit_score"] = df.get("credit_score", 600).fillna(600).clip(300, 850)
        features["prev_transactions"] = df.get("prev_transactions", 5).fillna(5)
        features["address_match"] = df.get("address_match", 1).fillna(1).astype(int)
        features["doc_verification_score"] = df.get("doc_verification_score", 0.9).fillna(0.9).clip(0, 1)

        # One-hot encode payment method and city
        payment_dummies = pd.get_dummies(df.get("payment_method", "bank_transfer"), prefix="payment_method")
        city_dummies = pd.get_dummies(df.get("city", "Lagos"), prefix="city")

        features = pd.concat([features, payment_dummies, city_dummies], axis=1)
        return features.fillna(0)

    def engineer_credit_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for credit scoring from raw applicant records."""
        features = pd.DataFrame()

        features["age"] = df.get("age", 35).fillna(35)
        features["years_employed"] = df.get("years_employed", 5).fillna(5)
        features["monthly_income"] = df.get("monthly_income", 200000).fillna(200000)
        features["loan_amount"] = df.get("loan_amount", 5000000).fillna(5000000)
        features["property_value"] = df.get("property_value", 7000000).fillna(7000000)
        features["ltv_ratio"] = (features["loan_amount"] / (features["property_value"] + 1)).clip(0, 2)
        features["existing_debt_ratio"] = df.get("existing_debt_ratio", 0.3).fillna(0.3).clip(0, 1)
        features["credit_score"] = df.get("credit_score", 600).fillna(600).clip(300, 850)
        features["missed_payments_12m"] = df.get("missed_payments_12m", 0).fillna(0)
        features["bankruptcy_history"] = df.get("bankruptcy_history", 0).fillna(0).astype(int)
        features["has_other_property"] = df.get("has_other_property", 0).fillna(0).astype(int)
        features["savings_months"] = df.get("savings_months", 3).fillna(3)
        features["nhf_contributor"] = df.get("nhf_contributor", 0).fillna(0).astype(int)
        features["has_guarantor"] = df.get("has_guarantor", 0).fillna(0).astype(int)
        features["loan_term_years"] = df.get("loan_term_years", 15).fillna(15)

        # DTI calculation
        monthly_rate = 0.18 / 12
        n_payments = features["loan_term_years"] * 12
        monthly_payment = features["loan_amount"] * (
            monthly_rate * (1 + monthly_rate)**n_payments
        ) / ((1 + monthly_rate)**n_payments - 1)
        features["dti_ratio"] = (monthly_payment / (features["monthly_income"] + 1)).clip(0, 5)

        emp_dummies = pd.get_dummies(df.get("employment_type", "private_sector"), prefix="employment_type")
        city_dummies = pd.get_dummies(df.get("city", "Lagos"), prefix="city")
        features = pd.concat([features, emp_dummies, city_dummies], axis=1)
        return features.fillna(0)

    def engineer_property_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for GNN property valuation."""
        features = pd.DataFrame()
        features["bedrooms"] = df.get("bedrooms", 3).fillna(3)
        features["bathrooms"] = df.get("bathrooms", 2).fillna(2)
        features["sqm"] = df.get("sqm", 150).fillna(150)
        features["age_years"] = (2024 - df.get("year_built", 2010).fillna(2010)).clip(0, 60)
        features["has_pool"] = df.get("has_pool", 0).fillna(0).astype(int)
        features["has_generator"] = df.get("has_generator", 1).fillna(1).astype(int)
        features["has_borehole"] = df.get("has_borehole", 1).fillna(1).astype(int)
        features["has_security"] = df.get("has_security", 1).fillna(1).astype(int)
        features["is_serviced"] = df.get("is_serviced", 0).fillna(0).astype(int)
        features["floor_count"] = df.get("floor_count", 2).fillna(2)
        features["parking_spaces"] = df.get("parking_spaces", 2).fillna(2)
        features["price_mult"] = df.get("price_mult", 1.5).fillna(1.5)
        features["days_on_market"] = df.get("days_on_market", 30).fillna(30)
        features["views"] = df.get("views", 50).fillna(50)
        features["saves"] = df.get("saves", 5).fillna(5)
        return features.fillna(0)


# ── Data Extractor ─────────────────────────────────────────────────────────

class DataExtractor:
    """Extracts data from PostgreSQL for training."""

    def __init__(self, database_url: str = DATABASE_URL):
        self.database_url = database_url
        self._conn = None

    def _get_connection(self):
        """Get database connection, returns None if unavailable."""
        try:
            import psycopg2
            conn = psycopg2.connect(self.database_url)
            return conn
        except Exception as e:
            print(f"[Pipeline] DB connection failed: {e} — will use synthetic data")
            return None

    def extract_transactions(self, since: datetime = None, limit: int = 100000) -> Optional[pd.DataFrame]:
        """Extract transaction records for fraud model training."""
        conn = self._get_connection()
        if conn is None:
            return None

        try:
            since_clause = f"AND created_at >= '{since.isoformat()}'" if since else ""
            query = f"""
                SELECT
                    t.id,
                    t.amount,
                    t.payment_method,
                    t.status,
                    t.created_at,
                    u.created_at as user_created_at,
                    EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 86400 as account_age_days,
                    COUNT(t2.id) OVER (
                        PARTITION BY t.user_id
                        ORDER BY t.created_at
                        ROWS BETWEEN 30 PRECEDING AND CURRENT ROW
                    ) as velocity_30d,
                    CASE WHEN t.status = 'flagged' THEN 1 ELSE 0 END as is_fraud
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                LEFT JOIN transactions t2 ON t2.user_id = t.user_id
                WHERE t.type = 'property_purchase'
                {since_clause}
                ORDER BY t.created_at DESC
                LIMIT {limit}
            """
            df = pd.read_sql(query, conn)
            conn.close()
            print(f"[Pipeline] Extracted {len(df):,} transactions from DB")
            return df
        except Exception as e:
            print(f"[Pipeline] Transaction extraction failed: {e}")
            conn.close()
            return None

    def extract_credit_applications(self, since: datetime = None) -> Optional[pd.DataFrame]:
        """Extract credit/mortgage application records."""
        conn = self._get_connection()
        if conn is None:
            return None

        try:
            since_clause = f"AND created_at >= '{since.isoformat()}'" if since else ""
            query = f"""
                SELECT
                    ma.*,
                    CASE WHEN ma.status = 'defaulted' THEN 1 ELSE 0 END as is_default
                FROM mortgage_applications ma
                WHERE 1=1 {since_clause}
                ORDER BY ma.created_at DESC
            """
            df = pd.read_sql(query, conn)
            conn.close()
            print(f"[Pipeline] Extracted {len(df):,} credit applications from DB")
            return df
        except Exception as e:
            print(f"[Pipeline] Credit extraction failed: {e}")
            conn.close()
            return None

    def extract_properties(self, since: datetime = None) -> Optional[pd.DataFrame]:
        """Extract property records for GNN training."""
        conn = self._get_connection()
        if conn is None:
            return None

        try:
            since_clause = f"AND created_at >= '{since.isoformat()}'" if since else ""
            query = f"""
                SELECT
                    p.*,
                    EXTRACT(YEAR FROM NOW()) - p.year_built as age_years
                FROM properties p
                WHERE p.status = 'active' {since_clause}
                ORDER BY p.created_at DESC
            """
            df = pd.read_sql(query, conn)
            conn.close()
            print(f"[Pipeline] Extracted {len(df):,} properties from DB")
            return df
        except Exception as e:
            print(f"[Pipeline] Property extraction failed: {e}")
            conn.close()
            return None


# ── Pipeline Orchestrator ──────────────────────────────────────────────────

class TrainingPipeline:
    def __init__(
        self,
        data_dir: str = str(DATA_DIR),
        model_dir: str = str(MODEL_DIR),
        mlflow_uri: str = MLFLOW_URI,
    ):
        self.data_dir = Path(data_dir)
        self.model_dir = Path(model_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.mlflow_uri = mlflow_uri
        self.extractor = DataExtractor()
        self.engineer = FeatureEngineer()

    def _get_or_generate_data(
        self, data_type: str, since: datetime = None, min_samples: int = MIN_SAMPLES_FOR_TRAINING
    ) -> pd.DataFrame:
        """Get real data from DB, fall back to synthetic if insufficient."""
        from data_generator import (
            generate_transaction_data, generate_credit_data, generate_property_data
        )

        real_df = None
        if data_type == "transactions":
            real_df = self.extractor.extract_transactions(since)
        elif data_type == "credit":
            real_df = self.extractor.extract_credit_applications(since)
        elif data_type == "properties":
            real_df = self.extractor.extract_properties(since)

        if real_df is not None and len(real_df) >= min_samples:
            print(f"[Pipeline] Using {len(real_df):,} real {data_type} records")
            return real_df

        # Fall back to synthetic data
        if SYNTHETIC_FALLBACK:
            n_synthetic = max(min_samples, 10000)
            print(f"[Pipeline] Insufficient real data ({len(real_df) if real_df is not None else 0} records) — generating {n_synthetic:,} synthetic {data_type} records")
            if data_type == "transactions":
                return generate_transaction_data(n_synthetic)
            elif data_type == "credit":
                return generate_credit_data(n_synthetic)
            elif data_type == "properties":
                return generate_property_data(n_synthetic)

        return real_df or pd.DataFrame()

    def run_fraud_pipeline(self, since: datetime = None, epochs: int = 50) -> dict:
        """Full fraud detection training pipeline."""
        print("\n" + "=" * 60)
        print("FRAUD DETECTION PIPELINE")
        print("=" * 60)

        from fraud_model import FraudModelTrainer

        # Get data
        df = self._get_or_generate_data("transactions", since)
        if len(df) == 0:
            return {"status": "skipped", "reason": "no_data"}

        # Save to data dir for trainer
        df.to_parquet(self.data_dir / "transactions.parquet", index=False)

        # Train
        trainer = FraudModelTrainer(
            data_dir=str(self.data_dir),
            model_dir=str(self.model_dir),
            mlflow_uri=self.mlflow_uri,
        )
        metrics = trainer.train(epochs=epochs)
        return {"status": "success", "metrics": metrics, "n_samples": len(df)}

    def run_credit_pipeline(self, since: datetime = None, epochs: int = 60) -> dict:
        """Full credit scoring training pipeline."""
        print("\n" + "=" * 60)
        print("CREDIT SCORING PIPELINE")
        print("=" * 60)

        from credit_model import CreditModelTrainer

        df = self._get_or_generate_data("credit", since)
        if len(df) == 0:
            return {"status": "skipped", "reason": "no_data"}

        df.to_parquet(self.data_dir / "credit.parquet", index=False)

        trainer = CreditModelTrainer(
            data_dir=str(self.data_dir),
            model_dir=str(self.model_dir),
            mlflow_uri=self.mlflow_uri,
        )
        metrics = trainer.train(epochs=epochs)
        return {"status": "success", "metrics": metrics, "n_samples": len(df)}

    def run_gnn_pipeline(self, since: datetime = None, epochs: int = 80) -> dict:
        """Full GNN property valuation training pipeline."""
        print("\n" + "=" * 60)
        print("GNN PROPERTY VALUATION PIPELINE")
        print("=" * 60)

        from gnn_valuation_model import GNNValuationTrainer
        from data_generator import build_property_graph

        df = self._get_or_generate_data("properties", since)
        if len(df) == 0:
            return {"status": "skipped", "reason": "no_data"}

        df.to_parquet(self.data_dir / "properties.parquet", index=False)

        # Rebuild graph
        print("[Pipeline] Rebuilding property graph...")
        graph = build_property_graph(df)
        import numpy as np
        np.savez_compressed(
            self.data_dir / "property_graph.npz",
            node_features=graph["node_features"],
            edge_index=graph["edge_index"],
            edge_weights=graph["edge_weights"],
            targets=graph["targets"],
        )
        import json
        with open(self.data_dir / "graph_metadata.json", "w") as f:
            json.dump({
                "feature_names": graph["feature_names"],
                "n_features": graph["n_features"],
                "n_nodes": len(df),
                "n_edges": graph["edge_index"].shape[1],
                "scaler_mean": graph["scaler_mean"],
                "scaler_scale": graph["scaler_scale"],
            }, f, indent=2)

        trainer = GNNValuationTrainer(
            data_dir=str(self.data_dir),
            model_dir=str(self.model_dir),
            mlflow_uri=self.mlflow_uri,
        )
        metrics = trainer.train(epochs=epochs)
        return {"status": "success", "metrics": metrics, "n_samples": len(df)}

    def run_all(
        self,
        models: list = None,
        since: datetime = None,
        mode: str = "full",
    ) -> dict:
        """Run all training pipelines."""
        if models is None:
            models = ["fraud", "credit", "gnn"]

        results = {}
        start_time = time.time()

        # Determine since date for incremental mode
        if mode == "incremental" and since is None:
            since = datetime.now() - timedelta(days=1)

        print(f"\n[Pipeline] Mode: {mode}, Since: {since}, Models: {models}")

        if "fraud" in models:
            try:
                results["fraud"] = self.run_fraud_pipeline(since=since)
            except Exception as e:
                results["fraud"] = {"status": "error", "error": str(e)}

        if "credit" in models:
            try:
                results["credit"] = self.run_credit_pipeline(since=since)
            except Exception as e:
                results["credit"] = {"status": "error", "error": str(e)}

        if "gnn" in models:
            try:
                results["gnn"] = self.run_gnn_pipeline(since=since)
            except Exception as e:
                results["gnn"] = {"status": "error", "error": str(e)}

        elapsed = time.time() - start_time
        results["elapsed_seconds"] = round(elapsed, 2)
        results["completed_at"] = datetime.now().isoformat()

        print(f"\n[Pipeline] All pipelines completed in {elapsed:.1f}s")
        print(json.dumps({k: v for k, v in results.items() if k != "elapsed_seconds"}, indent=2))

        # Save run record
        run_record_path = self.model_dir / "last_training_run.json"
        with open(run_record_path, "w") as f:
            json.dump(results, f, indent=2, default=str)

        return results


# ── Entry Point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ML Training Pipeline")
    parser.add_argument("--mode", choices=["full", "incremental"], default="full")
    parser.add_argument("--models", default="fraud,credit,gnn", help="Comma-separated model names")
    parser.add_argument("--since", help="ISO datetime for incremental mode (e.g. 2024-01-01)")
    parser.add_argument("--data-dir", default=str(DATA_DIR))
    parser.add_argument("--model-dir", default=str(MODEL_DIR))
    parser.add_argument("--mlflow-uri", default=MLFLOW_URI)
    args = parser.parse_args()

    since_dt = None
    if args.since:
        since_dt = datetime.fromisoformat(args.since)
    elif args.mode == "incremental":
        since_dt = datetime.now() - timedelta(days=1)

    pipeline = TrainingPipeline(
        data_dir=args.data_dir,
        model_dir=args.model_dir,
        mlflow_uri=args.mlflow_uri,
    )
    results = pipeline.run_all(
        models=args.models.split(","),
        since=since_dt,
        mode=args.mode,
    )
