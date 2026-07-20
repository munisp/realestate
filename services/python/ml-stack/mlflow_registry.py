"""
MLflow Model Registry & Experiment Tracking
============================================
Provides:
  - MLflow server configuration (PostgreSQL backend, S3/MinIO artifact store)
  - Model registration and versioning utilities
  - Model promotion workflow (Staging → Production)
  - Model comparison and A/B testing setup
  - Experiment management

Usage:
  # Start MLflow server:
  python mlflow_registry.py server

  # Register a trained model:
  python mlflow_registry.py register --model fraud --version 1.0.0

  # Promote to production:
  python mlflow_registry.py promote --model fraud-detection-v1 --version 2
"""

import mlflow
import mlflow.pytorch
from mlflow.tracking import MlflowClient
from mlflow.entities.model_registry import ModelVersion
import json
import os
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
import torch

# ── Configuration ──────────────────────────────────────────────────────────

MLFLOW_TRACKING_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5001")
MLFLOW_ARTIFACT_ROOT = os.environ.get("MLFLOW_ARTIFACT_ROOT", "s3://mlflow-artifacts")
MLFLOW_BACKEND_STORE = os.environ.get(
    "MLFLOW_BACKEND_STORE_URI",
    "postgresql://postgres:password@localhost:5432/mlflow"
)

# Registered model names
MODEL_NAMES = {
    "fraud": "fraud-detection-v1",
    "credit": "credit-scoring-v1",
    "gnn": "gnn-property-valuation-v1",
    "valuation": "ml-valuation-v1",
    "biometric": "biometric-auth-v1",
}

# ── Registry Client ────────────────────────────────────────────────────────

class ModelRegistry:
    def __init__(self, tracking_uri: str = MLFLOW_TRACKING_URI):
        mlflow.set_tracking_uri(tracking_uri)
        self.client = MlflowClient(tracking_uri=tracking_uri)
        self.tracking_uri = tracking_uri

    def ensure_experiment(self, name: str) -> str:
        """Get or create an experiment, return experiment ID."""
        experiment = self.client.get_experiment_by_name(name)
        if experiment is None:
            experiment_id = self.client.create_experiment(
                name,
                tags={
                    "project": "nigerian-realestate",
                    "created_at": datetime.now().isoformat(),
                }
            )
            print(f"[MLflow] Created experiment '{name}' (id: {experiment_id})")
            return experiment_id
        return experiment.experiment_id

    def register_model(
        self,
        run_id: str,
        model_artifact_path: str,
        model_name: str,
        description: str = "",
        tags: dict = None,
    ) -> ModelVersion:
        """Register a model from a run to the Model Registry."""
        model_uri = f"runs:/{run_id}/{model_artifact_path}"
        version = mlflow.register_model(model_uri, model_name)

        if description:
            self.client.update_model_version(
                name=model_name,
                version=version.version,
                description=description,
            )

        if tags:
            for key, value in tags.items():
                self.client.set_model_version_tag(model_name, version.version, key, str(value))

        print(f"[MLflow] Registered {model_name} version {version.version}")
        return version

    def register_local_model(
        self,
        model: torch.nn.Module,
        model_name: str,
        metadata: dict,
        experiment_name: str,
    ) -> ModelVersion:
        """Register a locally-trained PyTorch model directly."""
        self.ensure_experiment(experiment_name)
        mlflow.set_experiment(experiment_name)

        with mlflow.start_run(run_name=f"register_{model_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}") as run:
            # Log parameters
            mlflow.log_params(metadata.get("params", {}))
            # Log metrics
            mlflow.log_metrics(metadata.get("metrics", {}))
            # Log model
            mlflow.pytorch.log_model(model, "model")
            # Log metadata as artifact
            with open("/tmp/model_metadata.json", "w") as f:
                json.dump(metadata, f, indent=2)
            mlflow.log_artifact("/tmp/model_metadata.json")

            run_id = run.info.run_id

        version = self.register_model(
            run_id=run_id,
            model_artifact_path="model",
            model_name=model_name,
            description=metadata.get("description", ""),
            tags={
                "trained_at": metadata.get("trained_at", ""),
                "data_version": metadata.get("data_version", "v1"),
                "framework": "pytorch",
            },
        )
        return version

    def promote_to_staging(self, model_name: str, version: str) -> None:
        """Promote a model version to Staging."""
        self.client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage="Staging",
            archive_existing_versions=False,
        )
        print(f"[MLflow] {model_name} v{version} → Staging")

    def promote_to_production(self, model_name: str, version: str) -> None:
        """Promote a model version to Production (archives previous production)."""
        self.client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage="Production",
            archive_existing_versions=True,
        )
        print(f"[MLflow] {model_name} v{version} → Production (previous archived)")

    def archive_version(self, model_name: str, version: str) -> None:
        """Archive a model version."""
        self.client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage="Archived",
        )
        print(f"[MLflow] {model_name} v{version} → Archived")

    def get_production_model(self, model_name: str):
        """Load the current production model."""
        model_uri = f"models:/{model_name}/Production"
        try:
            model = mlflow.pytorch.load_model(model_uri)
            print(f"[MLflow] Loaded production model: {model_name}")
            return model
        except Exception as e:
            print(f"[MLflow] Failed to load production model {model_name}: {e}")
            return None

    def list_models(self) -> list:
        """List all registered models with their versions."""
        models = []
        for rm in self.client.search_registered_models():
            versions = self.client.get_latest_versions(rm.name)
            models.append({
                "name": rm.name,
                "description": rm.description,
                "versions": [
                    {
                        "version": v.version,
                        "stage": v.current_stage,
                        "run_id": v.run_id,
                        "created_at": v.creation_timestamp,
                    }
                    for v in versions
                ],
            })
        return models

    def compare_models(self, model_name: str, version_a: str, version_b: str) -> dict:
        """Compare metrics between two model versions."""
        def get_run_metrics(version: str) -> dict:
            mv = self.client.get_model_version(model_name, version)
            run = self.client.get_run(mv.run_id)
            return run.data.metrics

        metrics_a = get_run_metrics(version_a)
        metrics_b = get_run_metrics(version_b)

        comparison = {}
        all_keys = set(metrics_a.keys()) | set(metrics_b.keys())
        for key in all_keys:
            a = metrics_a.get(key)
            b = metrics_b.get(key)
            comparison[key] = {
                f"v{version_a}": a,
                f"v{version_b}": b,
                "delta": round(b - a, 6) if a is not None and b is not None else None,
                "winner": f"v{version_b}" if (b or 0) > (a or 0) else f"v{version_a}",
            }
        return comparison

    def create_ab_test(
        self,
        model_name: str,
        version_a: str,
        version_b: str,
        traffic_split: float = 0.5,
    ) -> dict:
        """Set up A/B test configuration between two model versions."""
        config = {
            "model_name": model_name,
            "version_a": version_a,
            "version_b": version_b,
            "traffic_split": traffic_split,  # fraction going to version_b
            "created_at": datetime.now().isoformat(),
            "status": "active",
        }

        # Tag both versions
        self.client.set_model_version_tag(model_name, version_a, "ab_test_role", "control")
        self.client.set_model_version_tag(model_name, version_b, "ab_test_role", "treatment")
        self.client.set_model_version_tag(model_name, version_b, "ab_test_traffic", str(traffic_split))

        print(f"[MLflow] A/B test configured: {model_name} v{version_a} (control) vs v{version_b} (treatment, {traffic_split*100:.0f}% traffic)")
        return config

    def log_prediction(
        self,
        model_name: str,
        version: str,
        input_hash: str,
        prediction: float,
        ground_truth: float = None,
        latency_ms: float = None,
    ) -> None:
        """Log a prediction for monitoring (writes to MLflow metrics)."""
        # In production, this would write to a time-series store
        # Here we log to a dedicated monitoring experiment
        try:
            mlflow.set_experiment(f"{model_name}-monitoring")
            with mlflow.start_run(run_name=f"prediction_{datetime.now().strftime('%Y%m%d')}"):
                mlflow.log_metrics({
                    "prediction": prediction,
                    **({"ground_truth": ground_truth} if ground_truth is not None else {}),
                    **({"latency_ms": latency_ms} if latency_ms is not None else {}),
                })
                mlflow.set_tags({
                    "model_version": version,
                    "input_hash": input_hash,
                })
        except Exception:
            pass  # Non-critical


# ── Docker Compose for MLflow Server ──────────────────────────────────────

MLFLOW_DOCKER_COMPOSE = """
version: '3.8'
services:
  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.14.1
    container_name: mlflow-server
    ports:
      - "5001:5000"
    environment:
      - MLFLOW_BACKEND_STORE_URI=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/mlflow
      - MLFLOW_DEFAULT_ARTIFACT_ROOT=s3://mlflow-artifacts
      - AWS_ACCESS_KEY_ID=${MINIO_ACCESS_KEY}
      - AWS_SECRET_ACCESS_KEY=${MINIO_SECRET_KEY}
      - MLFLOW_S3_ENDPOINT_URL=http://minio:9000
    command: >
      mlflow server
        --backend-store-uri postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/mlflow
        --default-artifact-root s3://mlflow-artifacts
        --host 0.0.0.0
        --port 5000
        --serve-artifacts
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  minio:
    image: minio/minio:RELEASE.2024-01-16T16-07-38Z
    container_name: mlflow-minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY:-minioadmin}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY:-minioadmin123}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  minio_data:
"""

MLFLOW_K8S_MANIFEST = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-server
  namespace: ml-platform
  labels:
    app: mlflow
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mlflow
  template:
    metadata:
      labels:
        app: mlflow
    spec:
      containers:
        - name: mlflow
          image: ghcr.io/mlflow/mlflow:v2.14.1
          ports:
            - containerPort: 5000
          env:
            - name: MLFLOW_BACKEND_STORE_URI
              valueFrom:
                secretKeyRef:
                  name: mlflow-secrets
                  key: backend-store-uri
            - name: MLFLOW_DEFAULT_ARTIFACT_ROOT
              value: "s3://mlflow-artifacts"
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: access-key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: secret-key
            - name: MLFLOW_S3_ENDPOINT_URL
              value: "http://minio-service:9000"
          command:
            - mlflow
            - server
            - --backend-store-uri
            - $(MLFLOW_BACKEND_STORE_URI)
            - --default-artifact-root
            - $(MLFLOW_DEFAULT_ARTIFACT_ROOT)
            - --host
            - "0.0.0.0"
            - --port
            - "5000"
            - --serve-artifacts
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 30
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 15
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow-service
  namespace: ml-platform
spec:
  selector:
    app: mlflow
  ports:
    - port: 5001
      targetPort: 5000
  type: ClusterIP
"""


def write_infrastructure_files():
    """Write MLflow docker-compose and k8s manifests."""
    base = Path(__file__).parent.parent.parent.parent  # project root
    infra = base / "infrastructure" / "mlflow"
    infra.mkdir(parents=True, exist_ok=True)

    (infra / "docker-compose.mlflow.yml").write_text(MLFLOW_DOCKER_COMPOSE)
    (infra / "kubernetes-mlflow.yaml").write_text(MLFLOW_K8S_MANIFEST)
    print(f"[MLflow] Infrastructure files written to {infra}/")


# ── CLI ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MLflow Model Registry CLI")
    subparsers = parser.add_subparsers(dest="command")

    # server
    server_parser = subparsers.add_parser("server", help="Start MLflow server")
    server_parser.add_argument("--port", type=int, default=5001)
    server_parser.add_argument("--backend-store", default="sqlite:///mlflow.db")
    server_parser.add_argument("--artifact-root", default="./mlruns")

    # list
    list_parser = subparsers.add_parser("list", help="List registered models")

    # promote
    promote_parser = subparsers.add_parser("promote", help="Promote model to production")
    promote_parser.add_argument("--model", required=True)
    promote_parser.add_argument("--version", required=True)
    promote_parser.add_argument("--stage", choices=["Staging", "Production"], default="Production")

    # compare
    compare_parser = subparsers.add_parser("compare", help="Compare two model versions")
    compare_parser.add_argument("--model", required=True)
    compare_parser.add_argument("--version-a", required=True)
    compare_parser.add_argument("--version-b", required=True)

    # infra
    infra_parser = subparsers.add_parser("infra", help="Write infrastructure files")

    args = parser.parse_args()

    if args.command == "server":
        cmd = [
            "mlflow", "server",
            "--backend-store-uri", args.backend_store,
            "--default-artifact-root", args.artifact_root,
            "--host", "0.0.0.0",
            "--port", str(args.port),
        ]
        print(f"[MLflow] Starting server on port {args.port}...")
        subprocess.run(cmd)

    elif args.command == "list":
        registry = ModelRegistry()
        models = registry.list_models()
        print(json.dumps(models, indent=2))

    elif args.command == "promote":
        registry = ModelRegistry()
        if args.stage == "Production":
            registry.promote_to_production(args.model, args.version)
        else:
            registry.promote_to_staging(args.model, args.version)

    elif args.command == "compare":
        registry = ModelRegistry()
        comparison = registry.compare_models(args.model, args.version_a, args.version_b)
        print(json.dumps(comparison, indent=2))

    elif args.command == "infra":
        write_infrastructure_files()

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
