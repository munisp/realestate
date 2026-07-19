"""
GNN Model Training Script

Trains a Graph Neural Network for property valuation using neighborhood influence.
"""

import argparse
import pandas as pd
import torch
import torch.nn.functional as F
from torch_geometric.data import Data
from torch_geometric.nn import GCNConv, global_mean_pool
import mlflow
import mlflow.pytorch
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import numpy as np
from datetime import datetime

# ============================================================================
# GNN Model Architecture
# ============================================================================

class PropertyGNN(torch.nn.Module):
    """
    Graph Convolutional Network for property valuation
    """
    def __init__(self, num_node_features, hidden_channels=64):
        super(PropertyGNN, self).__init__()
        self.conv1 = GCNConv(num_node_features, hidden_channels)
        self.conv2 = GCNConv(hidden_channels, hidden_channels)
        self.conv3 = GCNConv(hidden_channels, hidden_channels)
        self.lin = torch.nn.Linear(hidden_channels, 1)
        
    def forward(self, x, edge_index, batch):
        # Graph convolution layers
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.2, training=self.training)
        
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.2, training=self.training)
        
        x = self.conv3(x, edge_index)
        x = F.relu(x)
        
        # Global pooling
        x = global_mean_pool(x, batch)
        
        # Final prediction
        x = self.lin(x)
        return x


# ============================================================================
# Data Loading
# ============================================================================

def load_graph_data(sales_csv, graph_csv):
    """
    Load property sales and neighborhood graph data
    """
    print("📊 Loading data...")
    
    # Load sales data
    sales_df = pd.read_csv(sales_csv)
    print(f"   Loaded {len(sales_df)} properties")
    
    # Load neighborhood graph
    graph_df = pd.read_csv(graph_csv)
    print(f"   Loaded {len(graph_df)} edges")
    
    return sales_df, graph_df


def prepare_graph_dataset(sales_df, graph_df):
    """
    Convert pandas DataFrames to PyTorch Geometric Data objects
    """
    print("🔧 Preparing graph dataset...")
    
    # Create node features
    feature_cols = ['square_feet', 'bedrooms', 'bathrooms', 'year_built', 'latitude', 'longitude']
    
    # Handle missing values
    for col in feature_cols:
        sales_df[col] = sales_df[col].fillna(sales_df[col].median())
    
    # Normalize features
    scaler = StandardScaler()
    X = scaler.fit_transform(sales_df[feature_cols])
    
    # Create property ID to index mapping
    property_to_idx = {pid: idx for idx, pid in enumerate(sales_df['id'])}
    
    # Create edge index
    edge_list = []
    for _, row in graph_df.iterrows():
        src_idx = property_to_idx.get(row['property_id'])
        tgt_idx = property_to_idx.get(row['neighbor_id'])
        if src_idx is not None and tgt_idx is not None:
            edge_list.append([src_idx, tgt_idx])
            edge_list.append([tgt_idx, src_idx])  # Undirected graph
    
    edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
    
    # Create node features tensor
    x = torch.tensor(X, dtype=torch.float)
    
    # Create target tensor (log of price for better distribution)
    y = torch.tensor(np.log1p(sales_df['actual_price'].values), dtype=torch.float).unsqueeze(1)
    
    # Create PyTorch Geometric Data object
    data = Data(x=x, edge_index=edge_index, y=y)
    
    print(f"   Nodes: {data.num_nodes}")
    print(f"   Edges: {data.num_edges}")
    print(f"   Features: {data.num_node_features}")
    
    return data, scaler


# ============================================================================
# Training
# ============================================================================

def train_epoch(model, data, optimizer, device):
    """Train for one epoch"""
    model.train()
    optimizer.zero_grad()
    
    # Forward pass
    out = model(data.x, data.edge_index, torch.zeros(data.num_nodes, dtype=torch.long))
    loss = F.mse_loss(out, data.y)
    
    # Backward pass
    loss.backward()
    optimizer.step()
    
    return loss.item()


def evaluate(model, data, device):
    """Evaluate model"""
    model.eval()
    with torch.no_grad():
        out = model(data.x, data.edge_index, torch.zeros(data.num_nodes, dtype=torch.long))
        loss = F.mse_loss(out, data.y)
        
        # Calculate MAPE
        actual = torch.expm1(data.y)
        predicted = torch.expm1(out)
        mape = torch.mean(torch.abs((actual - predicted) / actual)) * 100
        
    return loss.item(), mape.item()


def train_model(data, epochs=100, lr=0.001, hidden_channels=64):
    """
    Train GNN model
    """
    print(f"🚀 Training GNN model for {epochs} epochs...")
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"   Device: {device}")
    
    # Move data to device
    data = data.to(device)
    
    # Initialize model
    model = PropertyGNN(
        num_node_features=data.num_node_features,
        hidden_channels=hidden_channels
    ).to(device)
    
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)
    
    # Training loop
    best_loss = float('inf')
    for epoch in range(1, epochs + 1):
        loss = train_epoch(model, data, optimizer, device)
        
        if epoch % 10 == 0:
            val_loss, mape = evaluate(model, data, device)
            print(f"   Epoch {epoch:03d} | Loss: {loss:.4f} | Val Loss: {val_loss:.4f} | MAPE: {mape:.2f}%")
            
            # Log to MLflow
            mlflow.log_metric("train_loss", loss, step=epoch)
            mlflow.log_metric("val_loss", val_loss, step=epoch)
            mlflow.log_metric("mape", mape, step=epoch)
            
            if val_loss < best_loss:
                best_loss = val_loss
                torch.save(model.state_dict(), '/models/gnn_model.pt')
                print(f"   ✅ Model saved (best val loss: {best_loss:.4f})")
    
    return model


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Train GNN model for property valuation')
    parser.add_argument('--sales-data', type=str, default='/data/historical_sales.csv',
                        help='Path to historical sales CSV')
    parser.add_argument('--graph-data', type=str, default='/data/neighborhood_graph.csv',
                        help='Path to neighborhood graph CSV')
    parser.add_argument('--epochs', type=int, default=100,
                        help='Number of training epochs')
    parser.add_argument('--lr', type=float, default=0.001,
                        help='Learning rate')
    parser.add_argument('--hidden-channels', type=int, default=64,
                        help='Hidden layer size')
    
    args = parser.parse_args()
    
    # Start MLflow run
    mlflow.set_experiment("gnn-valuation")
    with mlflow.start_run():
        # Log parameters
        mlflow.log_param("epochs", args.epochs)
        mlflow.log_param("lr", args.lr)
        mlflow.log_param("hidden_channels", args.hidden_channels)
        
        # Load data
        sales_df, graph_df = load_graph_data(args.sales_data, args.graph_data)
        
        # Prepare graph dataset
        data, scaler = prepare_graph_dataset(sales_df, graph_df)
        
        # Train model
        model = train_model(
            data,
            epochs=args.epochs,
            lr=args.lr,
            hidden_channels=args.hidden_channels
        )
        
        # Final evaluation
        val_loss, mape = evaluate(model, data, torch.device('cpu'))
        print(f"\n✅ Training complete!")
        print(f"   Final Val Loss: {val_loss:.4f}")
        print(f"   Final MAPE: {mape:.2f}%")
        
        # Log final metrics
        mlflow.log_metric("final_val_loss", val_loss)
        mlflow.log_metric("final_mape", mape)
        
        # Log model
        mlflow.pytorch.log_model(model, "model")
        
        print(f"\n💾 Model saved to /models/gnn_model.pt")
        print(f"📊 View results in MLflow UI: http://localhost:5001")


if __name__ == "__main__":
    main()
