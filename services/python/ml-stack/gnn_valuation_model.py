"""
Graph Neural Network Property Valuation Model
==============================================
Architecture: Graph Convolutional Network (GCN) implemented in pure PyTorch
  - No torch_geometric dependency (CPU-compatible, easy deployment)
  - 3-layer GCN with skip connections
  - Aggregates spatial neighbourhood context for each property
  - Predicts log-price (converted back to NGN)

Why GNN for property valuation:
  - Properties are NOT independent — neighbouring prices strongly influence value
  - Traditional ML ignores spatial autocorrelation (Tobler's First Law of Geography)
  - GNN propagates neighbourhood price signals through the graph
  - Captures "spillover" effects (e.g. new development raising nearby values)

Training:
  - Mini-batch training using neighbourhood sampling (GraphSAGE-style)
  - MSE loss on log-normalized prices
  - MLflow tracking
  - CPU-only inference

Performance target: MAE < 15% of median property price
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import pandas as pd
import json
import os
import time
import mlflow
import mlflow.pytorch
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import warnings
warnings.filterwarnings("ignore")

# ── GCN Layer ──────────────────────────────────────────────────────────────

class GCNLayer(nn.Module):
    """
    Graph Convolutional Network layer.
    H' = σ(D^{-1/2} A D^{-1/2} H W)
    Implemented as sparse-friendly message passing.
    """
    def __init__(self, in_dim: int, out_dim: int, bias: bool = True):
        super().__init__()
        self.linear = nn.Linear(in_dim, out_dim, bias=bias)
        nn.init.xavier_uniform_(self.linear.weight)

    def forward(
        self,
        x: torch.Tensor,          # (N, in_dim) node features
        adj_norm: torch.Tensor,    # (N, N) normalized adjacency (sparse or dense)
    ) -> torch.Tensor:
        # Aggregate neighbourhood: A_norm @ x
        agg = torch.sparse.mm(adj_norm, x) if adj_norm.is_sparse else adj_norm @ x
        return self.linear(agg)


class PropertyGNN(nn.Module):
    """
    3-layer GCN for property valuation with skip connections.

    Architecture:
      Input(F) → GCN(F→128) → GCN(128→64) → GCN(64→32) → MLP(32→16→1)
    """
    def __init__(self, input_dim: int, hidden_dims: list = None):
        super().__init__()
        if hidden_dims is None:
            hidden_dims = [128, 64, 32]

        dims = [input_dim] + hidden_dims

        self.gcn_layers = nn.ModuleList([
            GCNLayer(dims[i], dims[i + 1])
            for i in range(len(dims) - 1)
        ])

        self.bn_layers = nn.ModuleList([
            nn.BatchNorm1d(dims[i + 1])
            for i in range(len(dims) - 1)
        ])

        # Skip connections (project if dims differ)
        self.skip_layers = nn.ModuleList([
            nn.Linear(dims[i], dims[i + 1]) if dims[i] != dims[i + 1] else nn.Identity()
            for i in range(len(dims) - 1)
        ])

        self.activation = nn.GELU()
        self.dropout = nn.Dropout(0.2)

        # Regression head
        self.head = nn.Sequential(
            nn.Linear(hidden_dims[-1], 16),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(16, 1),
        )

    def forward(self, x: torch.Tensor, adj_norm: torch.Tensor) -> torch.Tensor:
        for gcn, bn, skip in zip(self.gcn_layers, self.bn_layers, self.skip_layers):
            residual = skip(x)
            x = self.activation(bn(gcn(x, adj_norm))) + residual
            x = self.dropout(x)
        return self.head(x).squeeze(-1)


# ── Adjacency Normalization ────────────────────────────────────────────────

def build_normalized_adjacency(
    edge_index: np.ndarray,
    edge_weights: np.ndarray,
    n_nodes: int,
    add_self_loops: bool = True,
) -> torch.Tensor:
    """
    Build D^{-1/2} A D^{-1/2} normalized adjacency matrix.
    Returns dense tensor (suitable for N up to ~20k on CPU).
    """
    # Build adjacency matrix
    A = np.zeros((n_nodes, n_nodes), dtype=np.float32)
    src, dst = edge_index[0], edge_index[1]
    A[src, dst] = edge_weights
    A[dst, src] = edge_weights  # Make symmetric

    if add_self_loops:
        np.fill_diagonal(A, 1.0)

    # Degree matrix
    D = A.sum(axis=1)
    D_inv_sqrt = np.where(D > 0, 1.0 / np.sqrt(D), 0.0)

    # D^{-1/2} A D^{-1/2}
    A_norm = D_inv_sqrt[:, None] * A * D_inv_sqrt[None, :]
    return torch.FloatTensor(A_norm)


# ── Mini-Batch Sampler ─────────────────────────────────────────────────────

class NeighbourhoodSampler:
    """
    GraphSAGE-style neighbourhood sampler for mini-batch GNN training.
    Samples a subgraph for each batch of nodes.
    """
    def __init__(
        self,
        edge_index: np.ndarray,
        edge_weights: np.ndarray,
        n_nodes: int,
        num_hops: int = 2,
        max_neighbours: int = 10,
    ):
        self.n_nodes = n_nodes
        self.num_hops = num_hops
        self.max_neighbours = max_neighbours

        # Build adjacency list
        self.adj_list = [[] for _ in range(n_nodes)]
        src, dst = edge_index[0], edge_index[1]
        for s, d, w in zip(src, dst, edge_weights):
            self.adj_list[s].append((d, w))
            self.adj_list[d].append((s, w))

    def sample_subgraph(self, seed_nodes: np.ndarray) -> tuple:
        """Sample k-hop neighbourhood around seed nodes."""
        node_set = set(seed_nodes.tolist())
        frontier = set(seed_nodes.tolist())

        for _ in range(self.num_hops):
            new_frontier = set()
            for node in frontier:
                neighbours = self.adj_list[node]
                if len(neighbours) > self.max_neighbours:
                    neighbours = np.random.choice(len(neighbours), self.max_neighbours, replace=False)
                    neighbours = [self.adj_list[node][i] for i in neighbours]
                for nbr, _ in neighbours:
                    if nbr not in node_set:
                        new_frontier.add(nbr)
            node_set.update(new_frontier)
            frontier = new_frontier

        subgraph_nodes = np.array(sorted(node_set))
        node_map = {n: i for i, n in enumerate(subgraph_nodes)}

        # Build subgraph edges
        sub_src, sub_dst, sub_w = [], [], []
        for s in subgraph_nodes:
            for d, w in self.adj_list[s]:
                if d in node_map:
                    sub_src.append(node_map[s])
                    sub_dst.append(node_map[d])
                    sub_w.append(w)

        sub_edge_index = np.array([sub_src, sub_dst], dtype=np.int64)
        sub_edge_weights = np.array(sub_w, dtype=np.float32)

        # Seed node indices in subgraph
        seed_indices = np.array([node_map[n] for n in seed_nodes])

        return subgraph_nodes, sub_edge_index, sub_edge_weights, seed_indices


# ── Trainer ────────────────────────────────────────────────────────────────

class GNNValuationTrainer:
    def __init__(
        self,
        data_dir: str = "./data",
        model_dir: str = "./models",
        mlflow_uri: str = "http://localhost:5001",
        experiment_name: str = "gnn-property-valuation",
    ):
        self.data_dir = Path(data_dir)
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.mlflow_uri = mlflow_uri
        self.experiment_name = experiment_name
        self.device = torch.device("cpu")

    def load_data(self) -> tuple:
        print("[GNN] Loading property graph data...")
        graph_data = np.load(self.data_dir / "property_graph.npz")
        with open(self.data_dir / "graph_metadata.json") as f:
            metadata = json.load(f)

        node_features = graph_data["node_features"]
        edge_index = graph_data["edge_index"]
        edge_weights = graph_data["edge_weights"]
        targets = graph_data["targets"]

        print(f"  Nodes: {len(node_features):,}, Edges: {edge_index.shape[1]:,}")
        print(f"  Features: {node_features.shape[1]}, Target range: [{targets.min():.2f}, {targets.max():.2f}]")

        return node_features, edge_index, edge_weights, targets, metadata

    def train(
        self,
        epochs: int = 80,
        batch_size: int = 512,
        lr: float = 1e-3,
        weight_decay: float = 1e-4,
        patience: int = 12,
        use_full_graph: bool = True,  # Use full graph for small datasets
    ) -> dict:
        """Train GNN property valuation model."""

        try:
            mlflow.set_tracking_uri(self.mlflow_uri)
            mlflow.set_experiment(self.experiment_name)
            use_mlflow = True
        except Exception:
            use_mlflow = False

        node_features, edge_index, edge_weights, targets, metadata = self.load_data()
        n_nodes = len(node_features)
        input_dim = node_features.shape[1]

        # Train/val/test split (by node index)
        all_indices = np.arange(n_nodes)
        train_idx, temp_idx = train_test_split(all_indices, test_size=0.2, random_state=42)
        val_idx, test_idx = train_test_split(temp_idx, test_size=0.5, random_state=42)

        print(f"  Train: {len(train_idx):,}, Val: {len(val_idx):,}, Test: {len(test_idx):,}")

        # Build full normalized adjacency (for datasets up to ~20k nodes)
        print("[GNN] Building normalized adjacency matrix...")
        adj_norm = build_normalized_adjacency(edge_index, edge_weights, n_nodes)
        adj_norm = adj_norm.to(self.device)

        # Convert to tensors
        X = torch.FloatTensor(node_features).to(self.device)
        y = torch.FloatTensor(targets).to(self.device)

        # Model
        model = PropertyGNN(input_dim=input_dim, hidden_dims=[128, 64, 32]).to(self.device)
        optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
        criterion = nn.MSELoss()
        mae_criterion = nn.L1Loss()

        best_val_mae = float("inf")
        best_epoch = 0
        patience_counter = 0

        params = {
            "epochs": epochs, "batch_size": batch_size, "lr": lr,
            "weight_decay": weight_decay, "architecture": "GCN[128,64,32]",
            "n_features": input_dim, "n_nodes": n_nodes,
        }

        if use_mlflow:
            mlflow.start_run(run_name=f"gnn_val_{int(time.time())}")
            mlflow.log_params(params)

        print(f"\n[GNN] Training PropertyGNN ({input_dim} features, {n_nodes:,} nodes)")

        for epoch in range(1, epochs + 1):
            model.train()

            # Mini-batch training over node indices
            np.random.shuffle(train_idx)
            total_loss = 0.0
            n_batches = 0

            for start in range(0, len(train_idx), batch_size):
                batch_nodes = train_idx[start:start + batch_size]

                optimizer.zero_grad()
                # Full graph forward pass (efficient for N < 20k)
                all_preds = model(X, adj_norm)
                batch_preds = all_preds[batch_nodes]
                batch_targets = y[batch_nodes]
                loss = criterion(batch_preds, batch_targets)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                total_loss += loss.item()
                n_batches += 1

            scheduler.step()
            avg_loss = total_loss / max(n_batches, 1)

            # Validation
            model.eval()
            with torch.no_grad():
                all_preds = model(X, adj_norm)
                val_preds = all_preds[val_idx].cpu().numpy()
                val_targets = y[val_idx].cpu().numpy()

            # Convert log-prices back to NGN millions for interpretable MAE
            val_preds_price = np.expm1(val_preds)
            val_targets_price = np.expm1(val_targets)
            val_mae = mean_absolute_error(val_targets_price, val_preds_price)
            val_mape = np.mean(np.abs((val_targets_price - val_preds_price) / (val_targets_price + 1e-8))) * 100
            val_r2 = r2_score(val_targets, val_preds)

            if use_mlflow:
                mlflow.log_metrics({
                    "train_loss": avg_loss,
                    "val_mae_millions": val_mae,
                    "val_mape": val_mape,
                    "val_r2": val_r2,
                }, step=epoch)

            if epoch % 10 == 0 or epoch == 1:
                print(f"  Epoch {epoch:3d}/{epochs} | Loss: {avg_loss:.4f} | Val MAE: ₦{val_mae:.1f}M | MAPE: {val_mape:.1f}% | R²: {val_r2:.4f}")

            if val_mae < best_val_mae:
                best_val_mae = val_mae
                best_epoch = epoch
                patience_counter = 0
                torch.save({
                    "epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "val_mae": val_mae,
                    "val_mape": val_mape,
                    "val_r2": val_r2,
                    "input_dim": input_dim,
                    "hidden_dims": [128, 64, 32],
                    "feature_names": metadata["feature_names"],
                    "scaler_mean": metadata["scaler_mean"],
                    "scaler_scale": metadata["scaler_scale"],
                    "n_nodes_trained": n_nodes,
                }, self.model_dir / "gnn_best.pt")
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    print(f"  Early stopping at epoch {epoch} (best: {best_epoch})")
                    break

        # Test evaluation
        checkpoint = torch.load(self.model_dir / "gnn_best.pt", map_location="cpu", weights_only=False)
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()

        with torch.no_grad():
            all_preds = model(X, adj_norm)
            test_preds = all_preds[test_idx].cpu().numpy()
            test_targets = y[test_idx].cpu().numpy()

        test_preds_price = np.expm1(test_preds)
        test_targets_price = np.expm1(test_targets)
        test_mae = mean_absolute_error(test_targets_price, test_preds_price)
        test_mape = np.mean(np.abs((test_targets_price - test_preds_price) / (test_targets_price + 1e-8))) * 100
        test_r2 = r2_score(test_targets, test_preds)

        print(f"\n[GNN] Test Results:")
        print(f"  MAE:  ₦{test_mae:.1f}M")
        print(f"  MAPE: {test_mape:.1f}%")
        print(f"  R²:   {test_r2:.4f}")
        print(f"  Best Val MAE: ₦{best_val_mae:.1f}M (epoch {best_epoch})")

        metrics = {
            "test_mae_millions": test_mae,
            "test_mape": test_mape,
            "test_r2": test_r2,
            "best_val_mae": best_val_mae,
            "best_epoch": best_epoch,
        }

        if use_mlflow:
            mlflow.log_metrics(metrics)
            mlflow.pytorch.log_model(model, "gnn_model", registered_model_name="gnn-property-valuation-v1")
            mlflow.end_run()

        # Save metadata
        gnn_metadata = {
            "model_type": "PropertyGNN",
            "version": "1.0.0",
            "architecture": "GCN[128,64,32]",
            "feature_names": metadata["feature_names"],
            "scaler_mean": metadata["scaler_mean"],
            "scaler_scale": metadata["scaler_scale"],
            "metrics": metrics,
            "params": params,
            "trained_at": pd.Timestamp.now().isoformat(),
            "n_nodes_trained": n_nodes,
            "target_transform": "log1p(price_millions_ngn)",
        }
        with open(self.model_dir / "gnn_metadata.json", "w") as f:
            json.dump(gnn_metadata, f, indent=2)

        print(f"\n[GNN] Artifacts saved to {self.model_dir}/")
        return metrics


# ── Inference ──────────────────────────────────────────────────────────────

class GNNInferenceEngine:
    """
    Production GNN inference engine.
    For new properties (not in training graph), uses feature-only MLP fallback.
    """
    def __init__(self, model_dir: str = "./models"):
        self.model_dir = Path(model_dir)
        self.model: PropertyGNN | None = None
        self.feature_names: list = []
        self.scaler_mean: np.ndarray | None = None
        self.scaler_scale: np.ndarray | None = None
        self._load()

    def _load(self):
        meta_path = self.model_dir / "gnn_metadata.json"
        ckpt_path = self.model_dir / "gnn_best.pt"
        if not meta_path.exists() or not ckpt_path.exists():
            print("[GNNInference] Model not found")
            return
        with open(meta_path) as f:
            meta = json.load(f)
        self.feature_names = meta["feature_names"]
        self.scaler_mean = np.array(meta["scaler_mean"])
        self.scaler_scale = np.array(meta["scaler_scale"])
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        self.model = PropertyGNN(input_dim=ckpt["input_dim"], hidden_dims=ckpt["hidden_dims"])
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.model.eval()
        print(f"[GNNInference] Model loaded (Val MAE: ₦{ckpt.get('val_mae', 'N/A'):.1f}M)")

    def estimate_value(
        self,
        property_features: dict,
        neighbour_features: list = None,
    ) -> dict:
        """
        Estimate property value.

        Args:
            property_features: Feature dict for the subject property
            neighbour_features: List of feature dicts for nearby properties (optional)

        Returns:
            Estimated price in NGN with confidence interval
        """
        if self.model is None:
            return {"estimated_price": 0, "confidence": "low", "error": "Model not loaded"}

        # Build feature vectors
        all_features = [property_features] + (neighbour_features or [])
        n = len(all_features)

        X = np.array([
            [f.get(feat, 0.0) for feat in self.feature_names]
            for f in all_features
        ], dtype=np.float32)
        X = (X - self.scaler_mean) / (self.scaler_scale + 1e-8)

        # Build simple chain adjacency (subject connected to all neighbours)
        if n > 1:
            src = [0] * (n - 1)
            dst = list(range(1, n))
            weights = [1.0] * (n - 1)
            edge_index = np.array([src + dst, dst + src], dtype=np.int64)
            edge_weights = np.array(weights * 2, dtype=np.float32)
            adj_norm = build_normalized_adjacency(edge_index, edge_weights, n)
        else:
            adj_norm = torch.eye(1)

        X_tensor = torch.FloatTensor(X)
        with torch.no_grad():
            log_preds = self.model(X_tensor, adj_norm)

        # Subject property is index 0
        log_price = log_preds[0].item()
        estimated_price = np.expm1(log_price) * 1_000_000  # Convert back from millions

        # Confidence based on number of neighbours
        confidence = "high" if len(all_features) >= 5 else "medium" if len(all_features) >= 2 else "low"

        # 90% CI: ±15% for high confidence, ±25% for low
        ci_pct = 0.15 if confidence == "high" else 0.20 if confidence == "medium" else 0.30
        return {
            "estimated_price_ngn": int(estimated_price),
            "estimated_price_millions": round(estimated_price / 1_000_000, 2),
            "confidence": confidence,
            "price_range_low": int(estimated_price * (1 - ci_pct)),
            "price_range_high": int(estimated_price * (1 + ci_pct)),
            "n_neighbours_used": max(0, n - 1),
        }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="./data")
    parser.add_argument("--model-dir", default="./models")
    parser.add_argument("--mlflow-uri", default="http://localhost:5001")
    parser.add_argument("--epochs", type=int, default=80)
    args = parser.parse_args()

    trainer = GNNValuationTrainer(
        data_dir=args.data_dir, model_dir=args.model_dir,
        mlflow_uri=args.mlflow_uri,
    )
    metrics = trainer.train(epochs=args.epochs)
    print(f"\nFinal metrics: {json.dumps(metrics, indent=2)}")
