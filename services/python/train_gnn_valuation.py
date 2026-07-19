"""
GNN Valuation Model Training Script
====================================
Trains a GraphSAGE model for property valuation using spatial relationships.
"""

import torch
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv
from torch_geometric.data import Data
import numpy as np
import json
import os
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import mysql.connector
from geopy.distance import geodesic

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'realestate')
}

class PropertyGraphSAGE(torch.nn.Module):
    """GraphSAGE model for property valuation"""
    
    def __init__(self, num_features, hidden_channels=64):
        super(PropertyGraphSAGE, self).__init__()
        self.conv1 = SAGEConv(num_features, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)
        self.conv3 = SAGEConv(hidden_channels, 32)
        self.lin = torch.nn.Linear(32, 1)
        
    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.3, training=self.training)
        
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.3, training=self.training)
        
        x = self.conv3(x, edge_index)
        x = F.relu(x)
        
        x = self.lin(x)
        return x


def load_property_data():
    """Load property data from database"""
    print("📊 Loading property data from database...")
    
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        # Load properties with complete data
        query = """
        SELECT 
            id, price, bedrooms, bathrooms, sqft, 
            latitude, longitude, yearBuilt, lotSize, propertyType
        FROM properties
        WHERE price > 0 AND bedrooms > 0 AND bathrooms > 0 
            AND sqft > 0 AND latitude IS NOT NULL AND longitude IS NOT NULL
        LIMIT 1000
        """
        
        cursor.execute(query)
        properties = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        print(f"✅ Loaded {len(properties)} properties")
        return properties
        
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        print("⚠️  Using synthetic data for training...")
        return generate_synthetic_data()


def generate_synthetic_data(num_properties=500):
    """Generate synthetic property data for training"""
    print("🔧 Generating synthetic training data...")
    
    properties = []
    # Lagos coordinates
    base_lat, base_lon = 6.5244, 3.3792
    
    for i in range(num_properties):
        # Random location within ~20km radius
        lat = base_lat + np.random.uniform(-0.2, 0.2)
        lon = base_lon + np.random.uniform(-0.2, 0.2)
        
        bedrooms = np.random.randint(1, 6)
        bathrooms = np.random.randint(1, 5)
        sqft = np.random.randint(500, 5000)
        year_built = np.random.randint(1980, 2024)
        lot_size = sqft * np.random.uniform(1.5, 3.0)
        
        # Price based on features with some noise
        base_price = (
            bedrooms * 5000000 +
            bathrooms * 3000000 +
            sqft * 50000 +
            (2024 - year_built) * -100000
        )
        price = int(base_price * np.random.uniform(0.8, 1.2))
        
        properties.append({
            'id': i + 1,
            'price': price,
            'bedrooms': bedrooms,
            'bathrooms': bathrooms,
            'sqft': sqft,
            'latitude': str(lat),
            'longitude': str(lon),
            'yearBuilt': year_built,
            'lotSize': int(lot_size),
            'propertyType': np.random.choice(['single_family', 'condo', 'townhouse'])
        })
    
    print(f"✅ Generated {len(properties)} synthetic properties")
    return properties


def build_graph(properties, k=5):
    """Build k-nearest neighbor graph based on spatial proximity"""
    print(f"🔗 Building spatial graph (k={k} neighbors)...")
    
    # Extract features
    features = []
    prices = []
    coords = []
    
    for prop in properties:
        # Node features: [bedrooms, bathrooms, sqft, age, lot_size, price_per_sqft]
        age = 2024 - (prop['yearBuilt'] or 2000)
        price_per_sqft = prop['price'] / prop['sqft'] if prop['sqft'] > 0 else 0
        
        features.append([
            prop['bedrooms'],
            prop['bathrooms'],
            prop['sqft'],
            age,
            prop['lotSize'] or 0,
            price_per_sqft
        ])
        
        prices.append(prop['price'])
        coords.append((float(prop['latitude']), float(prop['longitude'])))
    
    # Normalize features
    scaler = StandardScaler()
    features = scaler.fit_transform(features)
    
    # Build k-NN edges based on geographic distance
    edge_list = []
    edge_weights = []
    
    for i, coord_i in enumerate(coords):
        distances = []
        for j, coord_j in enumerate(coords):
            if i != j:
                dist = geodesic(coord_i, coord_j).kilometers
                distances.append((j, dist))
        
        # Get k nearest neighbors
        distances.sort(key=lambda x: x[1])
        for j, dist in distances[:k]:
            edge_list.append([i, j])
            # Weight inversely proportional to distance
            weight = 1.0 / (1.0 + dist)
            edge_weights.append(weight)
    
    # Convert to PyTorch tensors
    x = torch.FloatTensor(features)
    y = torch.FloatTensor(prices).view(-1, 1)
    edge_index = torch.LongTensor(edge_list).t().contiguous()
    edge_attr = torch.FloatTensor(edge_weights).view(-1, 1)
    
    data = Data(x=x, edge_index=edge_index, edge_attr=edge_attr, y=y)
    
    print(f"✅ Graph built: {data.num_nodes} nodes, {data.num_edges} edges")
    return data, scaler


def train_model(data, epochs=200, lr=0.01):
    """Train the GraphSAGE model"""
    print(f"🚀 Training GraphSAGE model for {epochs} epochs...")
    
    # Split data
    num_nodes = data.num_nodes
    indices = torch.randperm(num_nodes)
    
    train_size = int(0.7 * num_nodes)
    val_size = int(0.15 * num_nodes)
    
    train_mask = torch.zeros(num_nodes, dtype=torch.bool)
    val_mask = torch.zeros(num_nodes, dtype=torch.bool)
    test_mask = torch.zeros(num_nodes, dtype=torch.bool)
    
    train_mask[indices[:train_size]] = True
    val_mask[indices[train_size:train_size+val_size]] = True
    test_mask[indices[train_size+val_size:]] = True
    
    # Initialize model
    model = PropertyGraphSAGE(num_features=data.num_node_features)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)
    
    best_val_loss = float('inf')
    best_model_state = None
    
    for epoch in range(1, epochs + 1):
        # Training
        model.train()
        optimizer.zero_grad()
        
        out = model(data.x, data.edge_index)
        loss = F.mse_loss(out[train_mask], data.y[train_mask])
        
        loss.backward()
        optimizer.step()
        
        # Validation
        model.eval()
        with torch.no_grad():
            out = model(data.x, data.edge_index)
            val_loss = F.mse_loss(out[val_mask], data.y[val_mask])
            
            # Calculate MAE and MAPE
            mae = torch.abs(out[val_mask] - data.y[val_mask]).mean()
            mape = (torch.abs((out[val_mask] - data.y[val_mask]) / data.y[val_mask])).mean() * 100
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_model_state = model.state_dict().copy()
        
        if epoch % 20 == 0:
            print(f"Epoch {epoch:03d} | Train Loss: {loss:.2f} | Val Loss: {val_loss:.2f} | MAE: {mae:.2f} | MAPE: {mape:.2f}%")
    
    # Load best model
    model.load_state_dict(best_model_state)
    
    # Final evaluation on test set
    model.eval()
    with torch.no_grad():
        out = model(data.x, data.edge_index)
        test_loss = F.mse_loss(out[test_mask], data.y[test_mask])
        test_mae = torch.abs(out[test_mask] - data.y[test_mask]).mean()
        test_mape = (torch.abs((out[test_mask] - data.y[test_mask]) / data.y[test_mask])).mean() * 100
        
        # Calculate R² score
        ss_res = ((data.y[test_mask] - out[test_mask]) ** 2).sum()
        ss_tot = ((data.y[test_mask] - data.y[test_mask].mean()) ** 2).sum()
        r2 = 1 - (ss_res / ss_tot)
    
    print(f"\n✅ Training complete!")
    print(f"Test Loss: {test_loss:.2f}")
    print(f"Test MAE: {test_mae:.2f}")
    print(f"Test MAPE: {test_mape:.2f}%")
    print(f"Test R²: {r2:.4f}")
    
    return model, {
        'test_loss': float(test_loss),
        'test_mae': float(test_mae),
        'test_mape': float(test_mape),
        'r2_score': float(r2),
        'num_train': int(train_mask.sum()),
        'num_val': int(val_mask.sum()),
        'num_test': int(test_mask.sum())
    }


def save_model(model, scaler, metrics):
    """Save trained model and metadata"""
    print("💾 Saving model...")
    
    model_dir = '/home/ubuntu/realestate-platform/services/python/models'
    os.makedirs(model_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_version = f"graphsage_v{timestamp}"
    
    # Save model weights
    model_path = f"{model_dir}/{model_version}.pth"
    torch.save(model.state_dict(), model_path)
    
    # Save scaler
    import pickle
    scaler_path = f"{model_dir}/{model_version}_scaler.pkl"
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler, f)
    
    # Save metadata
    metadata = {
        'model_version': model_version,
        'architecture': 'GraphSAGE',
        'num_features': 6,
        'hidden_channels': 64,
        'training_date': timestamp,
        'metrics': metrics
    }
    
    metadata_path = f"{model_dir}/{model_version}_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✅ Model saved: {model_version}")
    print(f"   - Weights: {model_path}")
    print(f"   - Scaler: {scaler_path}")
    print(f"   - Metadata: {metadata_path}")
    
    return model_version


if __name__ == '__main__':
    print("=" * 60)
    print("GNN Property Valuation Model Training")
    print("=" * 60)
    print()
    
    # Load data
    properties = load_property_data()
    
    if len(properties) < 10:
        print("❌ Not enough property data for training")
        exit(1)
    
    # Build graph
    data, scaler = build_graph(properties, k=5)
    
    # Train model
    model, metrics = train_model(data, epochs=200, lr=0.01)
    
    # Save model
    model_version = save_model(model, scaler, metrics)
    
    print()
    print("=" * 60)
    print(f"✅ Training complete! Model version: {model_version}")
    print("=" * 60)
