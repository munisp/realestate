"""
Fast GNN training on a smaller subgraph (3000 nodes) for quick weight generation.
Full training on 15k nodes takes ~30 min on CPU — this produces valid weights in ~3 min.
"""
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

MODEL_DIR = Path("./models")
DATA_DIR = Path("./data")
MODEL_DIR.mkdir(exist_ok=True)

# Load data
graph_data = np.load(DATA_DIR / "property_graph.npz")
with open(DATA_DIR / "graph_metadata.json") as f:
    metadata = json.load(f)

node_features = graph_data["node_features"]
edge_index = graph_data["edge_index"]
edge_weights = graph_data["edge_weights"]
targets = graph_data["targets"]

# Use a 3000-node subgraph for fast training
N_SUBSET = 3000
np.random.seed(42)
subset_idx = np.random.choice(len(node_features), N_SUBSET, replace=False)
subset_set = set(subset_idx.tolist())

# Filter edges to only those within subset
node_map = {old: new for new, old in enumerate(subset_idx)}
sub_src, sub_dst, sub_w = [], [], []
for i in range(edge_index.shape[1]):
    s, d = edge_index[0, i], edge_index[1, i]
    if s in node_map and d in node_map:
        sub_src.append(node_map[s])
        sub_dst.append(node_map[d])
        sub_w.append(edge_weights[i])

X_sub = node_features[subset_idx]
y_sub = targets[subset_idx]
n_nodes = len(X_sub)
input_dim = X_sub.shape[1]

print(f"[GNN-Fast] Subgraph: {n_nodes} nodes, {len(sub_src)} edges, {input_dim} features")

# Build normalized adjacency
A = np.zeros((n_nodes, n_nodes), dtype=np.float32)
if sub_src:
    A[sub_src, sub_dst] = sub_w
    A[sub_dst, sub_src] = sub_w
np.fill_diagonal(A, 1.0)
D = A.sum(axis=1)
D_inv_sqrt = np.where(D > 0, 1.0 / np.sqrt(D), 0.0)
A_norm = D_inv_sqrt[:, None] * A * D_inv_sqrt[None, :]
adj_norm = torch.FloatTensor(A_norm)

X = torch.FloatTensor(X_sub)
y = torch.FloatTensor(y_sub)

all_idx = np.arange(n_nodes)
train_idx, temp_idx = train_test_split(all_idx, test_size=0.2, random_state=42)
val_idx, test_idx = train_test_split(temp_idx, test_size=0.5, random_state=42)

# GCN model
class GCNLayer(nn.Module):
    def __init__(self, in_dim, out_dim):
        super().__init__()
        self.linear = nn.Linear(in_dim, out_dim)
        nn.init.xavier_uniform_(self.linear.weight)
    def forward(self, x, adj):
        return self.linear(adj @ x)

class PropertyGNN(nn.Module):
    def __init__(self, input_dim, hidden_dims=[128, 64, 32]):
        super().__init__()
        dims = [input_dim] + hidden_dims
        self.gcn_layers = nn.ModuleList([GCNLayer(dims[i], dims[i+1]) for i in range(len(dims)-1)])
        self.bn_layers = nn.ModuleList([nn.BatchNorm1d(dims[i+1]) for i in range(len(dims)-1)])
        self.skip_layers = nn.ModuleList([
            nn.Linear(dims[i], dims[i+1]) if dims[i] != dims[i+1] else nn.Identity()
            for i in range(len(dims)-1)
        ])
        self.act = nn.GELU()
        self.drop = nn.Dropout(0.2)
        self.head = nn.Sequential(nn.Linear(hidden_dims[-1], 16), nn.GELU(), nn.Dropout(0.1), nn.Linear(16, 1))

    def forward(self, x, adj):
        for gcn, bn, skip in zip(self.gcn_layers, self.bn_layers, self.skip_layers):
            x = self.act(bn(gcn(x, adj))) + skip(x)
            x = self.drop(x)
        return self.head(x).squeeze(-1)

model = PropertyGNN(input_dim=input_dim)
optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=200)

best_val_mae = float("inf")
best_epoch = 0
patience = 12
patience_counter = 0

print(f"[GNN-Fast] Training for up to 60 epochs...")
for epoch in range(1, 201):
    model.train()
    optimizer.zero_grad()
    preds = model(X, adj_norm)
    loss = nn.MSELoss()(preds[train_idx], y[train_idx])
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()
    scheduler.step()

    model.eval()
    with torch.no_grad():
        all_preds = model(X, adj_norm)
        vp = np.expm1(all_preds[val_idx].numpy())
        vt = np.expm1(y[val_idx].numpy())
        val_mae = mean_absolute_error(vt, vp)
        val_r2 = r2_score(y[val_idx].numpy(), all_preds[val_idx].numpy())

    if epoch % 25 == 0 or epoch == 1:
        print(f"  Epoch {epoch:3d}/200 | Loss: {loss.item():.4f} | Val MAE: ₦{val_mae:.1f}M | R²: {val_r2:.4f}")

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
            "hidden_dims": [128, 64, 32],
            "feature_names": metadata["feature_names"],
            "scaler_mean": metadata["scaler_mean"],
            "scaler_scale": metadata["scaler_scale"],
            "n_nodes_trained": n_nodes,
        }, MODEL_DIR / "gnn_best.pt")
    else:
        patience_counter += 1
        if patience_counter >= patience and epoch > 60:
            print(f"  Early stopping at epoch {epoch} (best: {best_epoch})")
            break

# Test eval
ckpt = torch.load(MODEL_DIR / "gnn_best.pt", map_location="cpu", weights_only=False)
model.load_state_dict(ckpt["model_state_dict"])
model.eval()
with torch.no_grad():
    all_preds = model(X, adj_norm)
    tp = np.expm1(all_preds[test_idx].numpy())
    tt = np.expm1(y[test_idx].numpy())
    test_mae = mean_absolute_error(tt, tp)
    test_mape = np.mean(np.abs((tt - tp) / (tt + 1e-8))) * 100
    test_r2 = r2_score(y[test_idx].numpy(), all_preds[test_idx].numpy())

print(f"\n[GNN-Fast] Test Results:")
print(f"  MAE:  ₦{test_mae:.1f}M")
print(f"  MAPE: {test_mape:.1f}%")
print(f"  R²:   {test_r2:.4f}")

# Save metadata
gnn_meta = {
    "model_type": "PropertyGNN",
    "version": "1.0.0",
    "architecture": "GCN[128,64,32]",
    "feature_names": metadata["feature_names"],
    "scaler_mean": metadata["scaler_mean"],
    "scaler_scale": metadata["scaler_scale"],
    "metrics": {
        "test_mae_millions": float(test_mae),
        "test_mape": float(test_mape),
        "test_r2": float(test_r2),
        "best_val_mae": float(best_val_mae),
        "best_epoch": best_epoch,
    },
    "params": {"epochs": 200, "n_nodes_subset": n_nodes, "lr": 1e-3},
    "trained_at": str(np.datetime64("now")),
    "n_nodes_trained": n_nodes,
    "target_transform": "log1p(price_millions_ngn)",
    "note": "Trained on 3k-node subgraph for speed; retrain on full 15k graph for production",
}
with open(MODEL_DIR / "gnn_metadata.json", "w") as f:
    json.dump(gnn_meta, f, indent=2)

print(f"\n[GNN-Fast] Saved gnn_best.pt and gnn_metadata.json to {MODEL_DIR}/")
