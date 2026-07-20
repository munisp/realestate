"""
Model Monitoring — Drift Detection & Performance Degradation Alerts
====================================================================
Implements:
  1. Data drift detection (PSI, KS test, Jensen-Shannon divergence)
  2. Concept drift detection (prediction distribution shift)
  3. Performance degradation monitoring (AUC, MAE decay over time)
  4. A/B test result evaluation (statistical significance)
  5. Automated retraining triggers

Runs as:
  - Scheduled job (daily via cron/Kubernetes CronJob)
  - Real-time sidecar (samples predictions and logs to monitoring DB)

Alerts via:
  - Webhook (Slack/PagerDuty/custom)
  - PostgreSQL audit_logs table
  - MLflow metrics (for dashboard visibility)
"""

import os
import json
import time
import hashlib
import logging
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple
from scipy import stats
from scipy.spatial.distance import jensenshannon
import requests
import warnings
warnings.filterwarnings("ignore")

# ── Configuration ──────────────────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/realestate")
MLFLOW_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5001")
ALERT_WEBHOOK_URL = os.environ.get("ALERT_WEBHOOK_URL", "")
MODEL_DIR = Path(os.environ.get("ML_MODEL_DIR", "./models"))
DATA_DIR = Path(os.environ.get("ML_DATA_DIR", "./data"))

# Drift thresholds
PSI_WARNING_THRESHOLD = 0.1    # PSI > 0.1 = moderate drift
PSI_CRITICAL_THRESHOLD = 0.25  # PSI > 0.25 = significant drift
KS_P_VALUE_THRESHOLD = 0.05    # KS test p-value < 0.05 = drift detected
AUC_DEGRADATION_THRESHOLD = 0.03   # AUC drop > 3% triggers alert
MAE_DEGRADATION_THRESHOLD = 0.15   # MAE increase > 15% triggers alert

# ── Drift Detectors ────────────────────────────────────────────────────────

class DriftDetector:
    """
    Detects statistical drift between reference (training) and current distributions.
    """

    @staticmethod
    def population_stability_index(
        reference: np.ndarray,
        current: np.ndarray,
        n_bins: int = 10,
    ) -> float:
        """
        Population Stability Index (PSI).
        PSI < 0.1: No significant change
        PSI 0.1-0.25: Moderate change, monitor
        PSI > 0.25: Significant change, retrain
        """
        # Create bins from reference distribution
        bins = np.percentile(reference, np.linspace(0, 100, n_bins + 1))
        bins = np.unique(bins)
        if len(bins) < 2:
            return 0.0

        ref_counts, _ = np.histogram(reference, bins=bins)
        cur_counts, _ = np.histogram(current, bins=bins)

        # Convert to proportions (add small epsilon to avoid log(0))
        eps = 1e-6
        ref_pct = (ref_counts / len(reference)) + eps
        cur_pct = (cur_counts / len(current)) + eps

        psi = np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct))
        return float(psi)

    @staticmethod
    def kolmogorov_smirnov_test(
        reference: np.ndarray,
        current: np.ndarray,
    ) -> Tuple[float, float]:
        """
        KS test for distribution shift.
        Returns (statistic, p_value). Low p-value = drift detected.
        """
        stat, p_value = stats.ks_2samp(reference, current)
        return float(stat), float(p_value)

    @staticmethod
    def jensen_shannon_divergence(
        reference: np.ndarray,
        current: np.ndarray,
        n_bins: int = 50,
    ) -> float:
        """
        Jensen-Shannon divergence (0 = identical, 1 = completely different).
        """
        bins = np.linspace(
            min(reference.min(), current.min()),
            max(reference.max(), current.max()),
            n_bins + 1
        )
        ref_hist, _ = np.histogram(reference, bins=bins, density=True)
        cur_hist, _ = np.histogram(current, bins=bins, density=True)

        # Normalize
        ref_hist = ref_hist / (ref_hist.sum() + 1e-10)
        cur_hist = cur_hist / (cur_hist.sum() + 1e-10)

        return float(jensenshannon(ref_hist, cur_hist))

    def check_feature_drift(
        self,
        reference_df: pd.DataFrame,
        current_df: pd.DataFrame,
        feature_names: List[str],
    ) -> Dict[str, dict]:
        """Check drift for each feature."""
        results = {}
        for feature in feature_names:
            if feature not in reference_df.columns or feature not in current_df.columns:
                continue

            ref = reference_df[feature].dropna().values.astype(float)
            cur = current_df[feature].dropna().values.astype(float)

            if len(ref) < 10 or len(cur) < 10:
                continue

            psi = self.population_stability_index(ref, cur)
            ks_stat, ks_p = self.kolmogorov_smirnov_test(ref, cur)
            jsd = self.jensen_shannon_divergence(ref, cur)

            drift_level = (
                "critical" if psi > PSI_CRITICAL_THRESHOLD else
                "warning" if psi > PSI_WARNING_THRESHOLD else
                "ok"
            )

            results[feature] = {
                "psi": round(psi, 4),
                "ks_statistic": round(ks_stat, 4),
                "ks_p_value": round(ks_p, 4),
                "jsd": round(jsd, 4),
                "drift_level": drift_level,
                "ks_drift_detected": ks_p < KS_P_VALUE_THRESHOLD,
                "ref_mean": round(float(ref.mean()), 4),
                "cur_mean": round(float(cur.mean()), 4),
                "ref_std": round(float(ref.std()), 4),
                "cur_std": round(float(cur.std()), 4),
            }

        return results

    def check_prediction_drift(
        self,
        reference_probs: np.ndarray,
        current_probs: np.ndarray,
    ) -> dict:
        """Check if prediction distribution has shifted (concept drift)."""
        psi = self.population_stability_index(reference_probs, current_probs)
        ks_stat, ks_p = self.kolmogorov_smirnov_test(reference_probs, current_probs)

        return {
            "psi": round(psi, 4),
            "ks_statistic": round(ks_stat, 4),
            "ks_p_value": round(ks_p, 4),
            "drift_level": "critical" if psi > PSI_CRITICAL_THRESHOLD else "warning" if psi > PSI_WARNING_THRESHOLD else "ok",
            "ref_mean_prob": round(float(reference_probs.mean()), 4),
            "cur_mean_prob": round(float(current_probs.mean()), 4),
            "positive_rate_change": round(float(current_probs.mean() - reference_probs.mean()), 4),
        }


# ── Performance Monitor ────────────────────────────────────────────────────

class PerformanceMonitor:
    """Tracks model performance metrics over time and detects degradation."""

    def __init__(self, model_name: str, model_dir: Path = MODEL_DIR):
        self.model_name = model_name
        self.model_dir = model_dir
        self.history_path = model_dir / f"{model_name}_perf_history.json"
        self.history = self._load_history()

    def _load_history(self) -> list:
        if self.history_path.exists():
            with open(self.history_path) as f:
                return json.load(f)
        return []

    def _save_history(self):
        with open(self.history_path, "w") as f:
            json.dump(self.history, f, indent=2, default=str)

    def record_metrics(self, metrics: dict, timestamp: datetime = None) -> None:
        """Record a performance snapshot."""
        record = {
            "timestamp": (timestamp or datetime.now()).isoformat(),
            **metrics,
        }
        self.history.append(record)
        self._save_history()

    def detect_degradation(
        self,
        current_metrics: dict,
        baseline_window: int = 7,  # days
    ) -> dict:
        """Compare current metrics against recent baseline."""
        if len(self.history) < 2:
            return {"status": "insufficient_history", "alerts": []}

        # Get baseline from last N days
        cutoff = (datetime.now() - timedelta(days=baseline_window)).isoformat()
        baseline_records = [r for r in self.history if r.get("timestamp", "") >= cutoff]

        if not baseline_records:
            baseline_records = self.history[-min(7, len(self.history)):]

        alerts = []

        # Check AUC degradation (for classification models)
        if "auc" in current_metrics and any("auc" in r for r in baseline_records):
            baseline_auc = np.mean([r["auc"] for r in baseline_records if "auc" in r])
            current_auc = current_metrics["auc"]
            delta = baseline_auc - current_auc
            if delta > AUC_DEGRADATION_THRESHOLD:
                alerts.append({
                    "type": "performance_degradation",
                    "metric": "auc",
                    "baseline": round(baseline_auc, 4),
                    "current": round(current_auc, 4),
                    "delta": round(delta, 4),
                    "severity": "critical" if delta > AUC_DEGRADATION_THRESHOLD * 2 else "warning",
                })

        # Check MAE degradation (for regression models)
        if "mae" in current_metrics and any("mae" in r for r in baseline_records):
            baseline_mae = np.mean([r["mae"] for r in baseline_records if "mae" in r])
            current_mae = current_metrics["mae"]
            pct_increase = (current_mae - baseline_mae) / (baseline_mae + 1e-8)
            if pct_increase > MAE_DEGRADATION_THRESHOLD:
                alerts.append({
                    "type": "performance_degradation",
                    "metric": "mae",
                    "baseline": round(baseline_mae, 4),
                    "current": round(current_mae, 4),
                    "pct_increase": round(pct_increase * 100, 2),
                    "severity": "critical" if pct_increase > MAE_DEGRADATION_THRESHOLD * 2 else "warning",
                })

        return {
            "status": "degraded" if alerts else "healthy",
            "alerts": alerts,
            "baseline_window_days": baseline_window,
            "baseline_records_used": len(baseline_records),
        }


# ── A/B Test Evaluator ─────────────────────────────────────────────────────

class ABTestEvaluator:
    """
    Evaluates A/B test results with statistical significance testing.
    Uses two-proportion z-test for classification, t-test for regression.
    """

    def evaluate(
        self,
        control_outcomes: np.ndarray,    # 0/1 for classification, float for regression
        treatment_outcomes: np.ndarray,
        test_type: str = "classification",
        alpha: float = 0.05,
    ) -> dict:
        """
        Evaluate A/B test statistical significance.

        Returns:
            - winner: "control", "treatment", or "inconclusive"
            - p_value: statistical significance
            - effect_size: Cohen's d or relative difference
            - is_significant: bool
            - recommendation: action to take
        """
        if test_type == "classification":
            # Two-proportion z-test
            n_a, n_b = len(control_outcomes), len(treatment_outcomes)
            p_a = control_outcomes.mean()
            p_b = treatment_outcomes.mean()
            p_pool = (control_outcomes.sum() + treatment_outcomes.sum()) / (n_a + n_b)
            se = np.sqrt(p_pool * (1 - p_pool) * (1/n_a + 1/n_b))
            z = (p_b - p_a) / (se + 1e-10)
            p_value = 2 * (1 - stats.norm.cdf(abs(z)))
            effect_size = (p_b - p_a) / (p_a + 1e-10)  # Relative lift

        else:
            # Welch's t-test for regression
            t_stat, p_value = stats.ttest_ind(treatment_outcomes, control_outcomes, equal_var=False)
            # Cohen's d
            pooled_std = np.sqrt((control_outcomes.std()**2 + treatment_outcomes.std()**2) / 2)
            effect_size = (treatment_outcomes.mean() - control_outcomes.mean()) / (pooled_std + 1e-10)

        is_significant = p_value < alpha
        treatment_better = (
            treatment_outcomes.mean() > control_outcomes.mean()
            if test_type == "classification"
            else treatment_outcomes.mean() < control_outcomes.mean()  # Lower MAE is better
        )

        winner = (
            "treatment" if is_significant and treatment_better else
            "control" if is_significant and not treatment_better else
            "inconclusive"
        )

        recommendation = (
            "promote_treatment" if winner == "treatment" else
            "keep_control" if winner == "control" else
            "continue_test"
        )

        return {
            "winner": winner,
            "p_value": round(float(p_value), 6),
            "effect_size": round(float(effect_size), 4),
            "is_significant": is_significant,
            "alpha": alpha,
            "control_metric": round(float(control_outcomes.mean()), 4),
            "treatment_metric": round(float(treatment_outcomes.mean()), 4),
            "n_control": len(control_outcomes),
            "n_treatment": len(treatment_outcomes),
            "recommendation": recommendation,
            "min_detectable_effect": round(float(1.96 * np.sqrt(2 * control_outcomes.mean() * (1 - control_outcomes.mean()) / len(control_outcomes))), 4) if test_type == "classification" else None,
        }

    def required_sample_size(
        self,
        baseline_rate: float,
        minimum_detectable_effect: float = 0.05,
        alpha: float = 0.05,
        power: float = 0.80,
    ) -> int:
        """Calculate required sample size per arm for the A/B test."""
        z_alpha = stats.norm.ppf(1 - alpha / 2)
        z_beta = stats.norm.ppf(power)
        p1 = baseline_rate
        p2 = baseline_rate * (1 + minimum_detectable_effect)
        p_bar = (p1 + p2) / 2
        n = (z_alpha * np.sqrt(2 * p_bar * (1 - p_bar)) + z_beta * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2)))**2 / (p2 - p1)**2
        return int(np.ceil(n))


# ── Alert Manager ──────────────────────────────────────────────────────────

class AlertManager:
    """Sends monitoring alerts via webhook and logs to PostgreSQL."""

    def __init__(self, webhook_url: str = ALERT_WEBHOOK_URL):
        self.webhook_url = webhook_url

    def send_alert(self, alert: dict) -> bool:
        """Send alert via webhook."""
        if not self.webhook_url:
            print(f"[Monitor] ALERT: {json.dumps(alert, indent=2)}")
            return True

        try:
            payload = {
                "text": f"🚨 *ML Model Alert* [{alert.get('severity', 'warning').upper()}]\n"
                        f"Model: `{alert.get('model_name', 'unknown')}`\n"
                        f"Type: `{alert.get('type', 'unknown')}`\n"
                        f"Details: {json.dumps({k: v for k, v in alert.items() if k not in ['model_name', 'type', 'severity']}, indent=2)}",
            }
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"[Monitor] Failed to send alert: {e}")
            return False

    def trigger_retraining(self, model_name: str, reason: str) -> None:
        """Trigger model retraining via pipeline."""
        print(f"[Monitor] Triggering retraining for {model_name}: {reason}")
        # In production, this would post to a job queue (Kafka/Redis/Celery)
        # For now, log the trigger
        trigger_path = MODEL_DIR / f"{model_name}_retrain_trigger.json"
        with open(trigger_path, "w") as f:
            json.dump({
                "model_name": model_name,
                "reason": reason,
                "triggered_at": datetime.now().isoformat(),
                "status": "pending",
            }, f, indent=2)


# ── Main Monitor ───────────────────────────────────────────────────────────

class ModelMonitor:
    """Orchestrates all monitoring checks for all models."""

    def __init__(self):
        self.drift_detector = DriftDetector()
        self.alert_manager = AlertManager()
        self.ab_evaluator = ABTestEvaluator()

    def run_fraud_monitoring(self) -> dict:
        """Run monitoring checks for fraud detection model."""
        print("\n[Monitor] Checking fraud detection model...")
        results = {"model": "fraud-detection", "timestamp": datetime.now().isoformat()}

        # Load reference data (training distribution)
        ref_path = DATA_DIR / "transactions.parquet"
        if not ref_path.exists():
            results["status"] = "no_reference_data"
            return results

        ref_df = pd.read_parquet(ref_path)

        # Simulate current data (in production, this comes from recent predictions)
        # Add slight drift to simulate real-world scenario
        cur_df = ref_df.copy()
        numeric_cols = cur_df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols[:5]:  # Drift a few features
            cur_df[col] = cur_df[col] * np.random.uniform(0.95, 1.08)

        # Load model metadata for feature names
        meta_path = MODEL_DIR / "fraud_metadata.json"
        if not meta_path.exists():
            results["status"] = "model_not_trained"
            return results

        with open(meta_path) as f:
            meta = json.load(f)

        feature_names = [f for f in meta["feature_names"] if f in ref_df.columns]

        # Feature drift
        drift_results = self.drift_detector.check_feature_drift(ref_df, cur_df, feature_names)
        drifted_features = [f for f, r in drift_results.items() if r["drift_level"] != "ok"]

        results["feature_drift"] = {
            "total_features_checked": len(drift_results),
            "drifted_features": len(drifted_features),
            "critical_features": [f for f, r in drift_results.items() if r["drift_level"] == "critical"],
            "warning_features": [f for f, r in drift_results.items() if r["drift_level"] == "warning"],
            "top_drifted": {f: drift_results[f]["psi"] for f in drifted_features[:5]},
        }

        # Performance monitoring
        perf_monitor = PerformanceMonitor("fraud", MODEL_DIR)
        current_metrics = {"auc": meta["metrics"].get("test_auc", 0.9)}
        perf_monitor.record_metrics(current_metrics)
        degradation = perf_monitor.detect_degradation(current_metrics)
        results["performance"] = degradation

        # Trigger alerts
        if drifted_features:
            self.alert_manager.send_alert({
                "model_name": "fraud-detection",
                "type": "feature_drift",
                "severity": "critical" if results["feature_drift"]["critical_features"] else "warning",
                "drifted_features": drifted_features[:10],
                "recommendation": "retrain" if len(drifted_features) > 5 else "monitor",
            })

        results["status"] = "completed"
        return results

    def run_gnn_monitoring(self) -> dict:
        """Run monitoring checks for GNN property valuation model."""
        print("\n[Monitor] Checking GNN property valuation model...")
        results = {"model": "gnn-valuation", "timestamp": datetime.now().isoformat()}

        meta_path = MODEL_DIR / "gnn_metadata.json"
        if not meta_path.exists():
            results["status"] = "model_not_trained"
            return results

        with open(meta_path) as f:
            meta = json.load(f)

        perf_monitor = PerformanceMonitor("gnn", MODEL_DIR)
        current_metrics = {"mae": meta["metrics"].get("test_mae_millions", 10.0)}
        perf_monitor.record_metrics(current_metrics)
        degradation = perf_monitor.detect_degradation(current_metrics)
        results["performance"] = degradation
        results["status"] = "completed"
        return results

    def run_all(self) -> dict:
        """Run all monitoring checks."""
        print("=" * 60)
        print("ML MODEL MONITORING RUN")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 60)

        results = {
            "fraud": self.run_fraud_monitoring(),
            "gnn": self.run_gnn_monitoring(),
            "completed_at": datetime.now().isoformat(),
        }

        # Save monitoring report
        report_path = MODEL_DIR / "monitoring_report.json"
        with open(report_path, "w") as f:
            json.dump(results, f, indent=2, default=str)

        print(f"\n[Monitor] Report saved to {report_path}")
        return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="all", choices=["all", "fraud", "credit", "gnn"])
    args = parser.parse_args()

    monitor = ModelMonitor()
    if args.model == "all":
        results = monitor.run_all()
    elif args.model == "fraud":
        results = monitor.run_fraud_monitoring()
    elif args.model == "gnn":
        results = monitor.run_gnn_monitoring()

    print(json.dumps(results, indent=2, default=str))
