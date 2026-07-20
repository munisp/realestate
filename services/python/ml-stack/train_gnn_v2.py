"""
GNN Property Valuation — v2 Training Script
============================================
Key improvements over v1:
  - Proper StandardScaler on node features (critical for GNN convergence)
  - Denser graph: k=8 nearest neighbours by location (more signal)
  - Smaller dataset (2000 nodes) for fast CPU training
  - Deeper MLP head for better regression
  - Gradient clipping + weight decay
  - Target: R² > 0.85, MAPE < 20%
"""
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.neighbors import NearestNeighbors

MODEL_DIR = Path("./models")
DATA_DIR = Path("./data")
MODEL_DIR.mkdir(exist_ok=True)

# ── Load and prepare data ──────────────────────────────────────────────────
graph_data = np.load(DATA_DIR / "property_graph.npz")
with open(DATA_DIR / "graph_metadata.json") as f:
    metadata = json.load(f)

node_features_raw = graph_data["node_features"]
targets_raw = graph_data["targets"]  # already log1p(price_millions)

# Use 2000-node subset
N = 2000
np.random.seed(42)
idx = np.random.choice(len(node_features_raw), N, replace=False)
X_raw = node_features_raw[idx]
y = targets_raw[idx]

# Normalize features — CRITICAL for GNN convergence
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_raw).astype(np.float32)

# Build denser k-NN graph (k=8) using scaled features
print(f"[GNN-v2] Building k=8 nearest-neighbour graph on {N} nodes...")
nbrs = NearestNeighbors(n_neighbors=9, algorithm="auto").fit(X_scaled)
distances, indices = nbrs.kneighbors(X_scaled)

src_list, dst_list, w_list = [], [], []
for i in range(N):
    for j_idx in range(1, 9):  # skip self (index 0)
        j = indices[i, j_idx]
        d = distances[i, j_idx]
        w = np.exp(-d)  # Gaussian kernel weight
        src_list.append(i)
        dst_list.append(j)
        w_list.append(w)

src = np.array(src_list)
dst = np.array(dst_list)
w = np.array(w_list, dtype=np.float32)
print(f"  Edges: {len(src):,} ({len(src)/N:.1f} per node avg)")

# Build normalized adjacency
A = np.zeros((N, N), dtype=np.float32)
A[src, dst] = w
A[dst, src] = w  # symmetric
np.fill_diagonal(A, 1.0)
D = A.sum(axis=1)
D_inv_sqrt = np.where(D > 0, 1.0 / np.sqrt(D), 0.0)
A_norm = (D_inv_sqrt[:, None] * A * D_inv_sqrt[None, :]).astype(np.float32)

X_t = torch.FloatTensor(X_scaled)
y_t = torch.FloatTensor(y)
adj_t = torch.FloatTensor(A_norm)

all_idx = np.arange(N)
train_idx, temp_idx = train_test_split(all_idx, test_size=0.2, random_state=42)
val_idx, test_idx = train_test_split(temp_idx, test_size=0.5, random_state=42)
print(f"  Train: {len(train_idx)}, Val: {len(val_idx)}, Test: {len(test_idx)}")

# ── Model ──────────────────────────────────────────────────────────────────
class GCNLayer(nn.Module):
    def __init__(self, in_dim, out_dim):
        super().__init__()
        self.W = nn.Linear(in_dim, out_dim, bias=False)
        self.b = nn.Parameter(torch.zeros(out_dim))
        nn.init.xavier_uniform_(self.W.weight)
    def forward(self, x, adj):
        return self.W(adj @ x) + self.b

class PropertyGNNv2(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.gcn1 = GCNLayer(input_dim, 256)
        self.gcn2 = GCNLayer(256, 128)
        self.gcn3 = GCNLayer(128, 64)
        self.bn1 = nn.BatchNorm1d(256)
        self.bn2 = nn.BatchNorm1d(128)
        self.bn3 = nn.BatchNorm1d(64)
        self.skip1 = nn.Linear(input_dim, 256)
        self.skip2 = nn.Linear(256, 128)
        self.skip3 = nn.Linear(128, 64)
        self.act = nn.GELU()
        self.drop = nn.Dropout(0.15)
        self.head = nn.Sequential(
            nn.Linear(64, 32), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(32, 16), nn.GELU(),
            nn.Linear(16, 1)
        )

    def forward(self, x, adj):
        h1 = self.act(self.bn1(self.gcn1(x, adj))) + self.skip1(x)
        h1 = self.drop(h1)
        h2 = self.act(self.bn2(self.gcn2(h1, adj))) + self.skip2(h1)
        h2 = self.drop(h2)
        h3 = self.act(self.bn3(self.gcn3(h2, adj))) + self.skip3(h2)
        h3 = self.drop(h3)
        return self.head(h3).squeeze(-1)

input_dim = X_scaled.shape[1]
model = PropertyGNNv2(input_dim)
optimizer = optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-3)
scheduler = optim.lr_scheduler.OneCycleLR(optimizer, max_lr=2e-3, total_steps=300, pct_start=0.1)

# ── Training ───────────────────────────────────────────────────────────────
best_val_mae = float("inf")
best_epoch = 0
patience = 30
patience_counter = 0

print(f"\n[GNN-v2] Training PropertyGNNv2 ({input_dim} features, {N} nodes)")
for epoch in range(1, 301):
    model.train()
    optimizer.zero_grad()
    preds = model(X_t, adj_t)
    loss = nn.MSELoss()(preds[train_idx], y_t[train_idx])
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 0.5)
    optimizer.step()
    scheduler.step()

    model.eval()
    with torch.no_grad():
        all_preds = model(X_t, adj_t)
        vp_log = all_preds[val_idx].numpy()
        vt_log = y_t[val_idx].numpy()
        vp = np.expm1(vp_log)
        vt = np.expm1(vt_log)
        val_mae = mean_absolute_error(vt, vp)
        val_r2 = r2_score(vt_log, vp_log)

    if epoch % 30 == 0 or epoch == 1:
        print(f"  Epoch {epoch:3d}/300 | Loss: {loss.item():.4f} | Val MAE: ₦{val_mae:.1f}M | R²: {val_r2:.4f}")

    if val_mae < best_val_mae:
        best_val_mae = val_mae
        best_epoch = epoch
        patience_counter = 0
        torch.save({
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "val_mae": val_mae,
            "val_r2": val_r2,
            "input_dim": input_dim,
            "hidden_dims": [256, 128, 64],
            "feature_names": metadata["feature_names"],
            "scaler_mean": scaler.mean_.tolist(),
            "scaler_scale": scaler.scale_.tolist(),
            "n_nodes_trained": N,
        }, MODEL_DIR / "gnn_best.pt")
    else:
        patience_counter += 1
        if patience_counter >= patience and epoch > 100:
            print(f"  Early stopping at epoch {epoch} (best: {best_epoch})")
            break

# ── Test evaluation ────────────────────────────────────────────────────────
ckpt = torch.load(MODEL_DIR / "gnn_best.pt", map_location="cpu", weights_only=False)
model.load_state_dict(ckpt["model_state_dict"])
model.eval()
with torch.no_grad():
    all_preds = model(X_t, adj_t)
    tp_log = all_preds[test_idx].numpy()
    tt_log = y_t[test_idx].numpy()
    tp = np.expm1(tp_log)
    tt = np.expm1(tt_log)
    test_mae = mean_absolute_error(tt, tp)
    test_mape = np.mean(np.abs((tt - tp) / (tt + 1e-8))) * 100
    test_r2 = r2_score(tt_log, tp_log)

print(f"\n[GNN-v2] Test Results:")
print(f"  MAE:  ₦{test_mae:.1f}M")
print(f"  MAPE: {test_mape:.1f}%")
print(f"  R²:   {test_r2:.4f}")
print(f"  Best Val MAE: ₦{best_val_mae:.1f}M (epoch {best_epoch})")

# Save metadata
gnn_meta = {
    "model_type": "PropertyGNNv2",
    "version": "2.0.0",
    "architecture": "GCN[256,128,64]+MLP[32,16,1]",
    "feature_names": metadata["feature_names"],
    "scaler_mean": scaler.mean_.tolist(),
    "scaler_scale": scaler.scale_.tolist(),
    "metrics": {
        "test_mae_millions": float(test_mae),
        "test_mape": float(test_mape),
        "test_r2": float(test_r2),
        "best_val_mae": float(best_val_mae),
        "best_epoch": best_epoch,
    },
    "params": {"epochs": 300, "n_nodes_subset": N, "lr": 2e-3, "k_neighbours": 8},
    "trained_at": str(np.datetime64("now")),
    "n_nodes_trained": N,
    "target_transform": "log1p(price_millions_ngn)",
    "graph_construction": "k=8 nearest neighbours by feature similarity",
}
with open(MODEL_DIR / "gnn_metadata.json", "w") as f:
    json.dump(gnn_meta, f, indent=2)

print(f"\n[GNN-v2] Saved gnn_best.pt and gnn_metadata.json to {MODEL_DIR}/")
