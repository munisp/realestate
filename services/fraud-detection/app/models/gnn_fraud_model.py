import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv, GATConv, SAGEConv, global_mean_pool
from torch_geometric.data import Data, Batch
import numpy as np
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class TransactionGNN(nn.Module):
    """
    Graph Neural Network for fraud detection in property transactions.
    Uses Graph Attention Networks (GAT) to capture complex relationships
    between users, properties, and transactions.
    """
    
    def __init__(self, num_node_features: int, hidden_channels: int = 128, num_classes: int = 2):
        super(TransactionGNN, self).__init__()
        
        # GAT layers for attention-based message passing
        self.conv1 = GATConv(num_node_features, hidden_channels, heads=8, dropout=0.6)
        self.conv2 = GATConv(hidden_channels * 8, hidden_channels, heads=8, dropout=0.6)
        self.conv3 = GATConv(hidden_channels * 8, hidden_channels, heads=1, concat=False, dropout=0.6)
        
        # Batch normalization
        self.bn1 = nn.BatchNorm1d(hidden_channels * 8)
        self.bn2 = nn.BatchNorm1d(hidden_channels * 8)
        self.bn3 = nn.BatchNorm1d(hidden_channels)
        
        # MLP for final classification
        self.fc1 = nn.Linear(hidden_channels, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, num_classes)
        
        self.dropout = nn.Dropout(0.5)
        
    def forward(self, x, edge_index, batch=None):
        # First GAT layer
        x = F.elu(self.conv1(x, edge_index))
        x = self.bn1(x)
        x = self.dropout(x)
        
        # Second GAT layer
        x = F.elu(self.conv2(x, edge_index))
        x = self.bn2(x)
        x = self.dropout(x)
        
        # Third GAT layer
        x = F.elu(self.conv3(x, edge_index))
        x = self.bn3(x)
        
        # Global pooling if batch is provided (for graph-level prediction)
        if batch is not None:
            x = global_mean_pool(x, batch)
        
        # MLP classifier
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        x = self.dropout(x)
        x = self.fc3(x)
        
        return F.log_softmax(x, dim=1)


class GraphSAGEFraudDetector(nn.Module):
    """
    GraphSAGE-based fraud detector for scalable fraud detection.
    Better for large-scale graphs with many nodes.
    """
    
    def __init__(self, num_node_features: int, hidden_channels: int = 128):
        super(GraphSAGEFraudDetector, self).__init__()
        
        self.conv1 = SAGEConv(num_node_features, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)
        self.conv3 = SAGEConv(hidden_channels, hidden_channels)
        
        self.bn1 = nn.BatchNorm1d(hidden_channels)
        self.bn2 = nn.BatchNorm1d(hidden_channels)
        self.bn3 = nn.BatchNorm1d(hidden_channels)
        
        self.fc1 = nn.Linear(hidden_channels, 64)
        self.fc2 = nn.Linear(64, 2)
        
        self.dropout = nn.Dropout(0.5)
        
    def forward(self, x, edge_index, batch=None):
        x = F.relu(self.conv1(x, edge_index))
        x = self.bn1(x)
        x = self.dropout(x)
        
        x = F.relu(self.conv2(x, edge_index))
        x = self.bn2(x)
        x = self.dropout(x)
        
        x = F.relu(self.conv3(x, edge_index))
        x = self.bn3(x)
        
        if batch is not None:
            x = global_mean_pool(x, batch)
        
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        
        return F.log_softmax(x, dim=1)


class LSTMFraudDetector(nn.Module):
    """
    LSTM-based fraud detector for sequential transaction patterns.
    Captures temporal patterns in user transaction history.
    """
    
    def __init__(self, input_size: int, hidden_size: int = 128, num_layers: int = 2):
        super(LSTMFraudDetector, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(
            input_size,
            hidden_size,
            num_layers,
            batch_first=True,
            dropout=0.3,
            bidirectional=True
        )
        
        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_size * 2,
            num_heads=8,
            dropout=0.3
        )
        
        self.fc1 = nn.Linear(hidden_size * 2, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, 2)
        
        self.dropout = nn.Dropout(0.5)
        
    def forward(self, x):
        # LSTM layers
        lstm_out, (hidden, cell) = self.lstm(x)
        
        # Self-attention
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        
        # Take the last output
        last_output = attn_out[:, -1, :]
        
        # MLP classifier
        x = F.relu(self.fc1(last_output))
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        x = self.dropout(x)
        x = self.fc3(x)
        
        return F.log_softmax(x, dim=1)


class TransformerFraudDetector(nn.Module):
    """
    Transformer-based fraud detector for complex pattern recognition.
    Uses multi-head attention to capture long-range dependencies.
    """
    
    def __init__(self, input_size: int, d_model: int = 128, nhead: int = 8, num_layers: int = 4):
        super(TransformerFraudDetector, self).__init__()
        
        self.embedding = nn.Linear(input_size, d_model)
        self.pos_encoder = PositionalEncoding(d_model)
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=512,
            dropout=0.3,
            activation='gelu'
        )
        
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers
        )
        
        self.fc1 = nn.Linear(d_model, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, 2)
        
        self.dropout = nn.Dropout(0.5)
        
    def forward(self, x):
        # Embedding
        x = self.embedding(x)
        x = self.pos_encoder(x)
        
        # Transformer encoder
        x = self.transformer_encoder(x)
        
        # Global average pooling
        x = torch.mean(x, dim=1)
        
        # MLP classifier
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        x = self.dropout(x)
        x = self.fc3(x)
        
        return F.log_softmax(x, dim=1)


class PositionalEncoding(nn.Module):
    """Positional encoding for transformer."""
    
    def __init__(self, d_model: int, max_len: int = 5000):
        super(PositionalEncoding, self).__init__()
        
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-np.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        
        pe = pe.unsqueeze(0)
        self.register_buffer('pe', pe)
        
    def forward(self, x):
        return x + self.pe[:, :x.size(1), :]


class HybridFraudDetector:
    """
    Hybrid fraud detection system combining GNN, LSTM, Transformer, and traditional ML.
    Implements ensemble learning for robust fraud detection.
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Initialize models
        self.gnn_model = TransactionGNN(
            num_node_features=config.get('num_node_features', 64),
            hidden_channels=config.get('hidden_channels', 128)
        ).to(self.device)
        
        self.lstm_model = LSTMFraudDetector(
            input_size=config.get('input_size', 32),
            hidden_size=config.get('hidden_size', 128)
        ).to(self.device)
        
        self.transformer_model = TransformerFraudDetector(
            input_size=config.get('input_size', 32),
            d_model=config.get('d_model', 128)
        ).to(self.device)
        
        # Ensemble weights
        self.ensemble_weights = {
            'gnn': 0.4,
            'lstm': 0.3,
            'transformer': 0.3
        }
        
        logger.info(f"Hybrid fraud detector initialized on {self.device}")
    
    def train(self, train_loader, val_loader, epochs: int = 50):
        """Train all models in the ensemble."""
        # Train GNN
        logger.info("Training GNN model...")
        self._train_gnn(train_loader, val_loader, epochs)
        
        # Train LSTM
        logger.info("Training LSTM model...")
        self._train_lstm(train_loader, val_loader, epochs)
        
        # Train Transformer
        logger.info("Training Transformer model...")
        self._train_transformer(train_loader, val_loader, epochs)
        
        logger.info("All models trained successfully")
    
    def _train_gnn(self, train_loader, val_loader, epochs):
        optimizer = torch.optim.Adam(self.gnn_model.parameters(), lr=0.001, weight_decay=5e-4)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=5)
        
        for epoch in range(epochs):
            self.gnn_model.train()
            total_loss = 0
            
            for batch in train_loader:
                batch = batch.to(self.device)
                optimizer.zero_grad()
                
                out = self.gnn_model(batch.x, batch.edge_index, batch.batch)
                loss = F.nll_loss(out, batch.y)
                
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
            
            # Validation
            val_loss = self._validate_gnn(val_loader)
            scheduler.step(val_loss)
            
            if (epoch + 1) % 10 == 0:
                logger.info(f"GNN Epoch {epoch+1}/{epochs}, Train Loss: {total_loss/len(train_loader):.4f}, Val Loss: {val_loss:.4f}")
    
    def _train_lstm(self, train_loader, val_loader, epochs):
        optimizer = torch.optim.Adam(self.lstm_model.parameters(), lr=0.001)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=5)
        
        for epoch in range(epochs):
            self.lstm_model.train()
            total_loss = 0
            
            for batch_x, batch_y in train_loader:
                batch_x, batch_y = batch_x.to(self.device), batch_y.to(self.device)
                optimizer.zero_grad()
                
                out = self.lstm_model(batch_x)
                loss = F.nll_loss(out, batch_y)
                
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
            
            val_loss = self._validate_lstm(val_loader)
            scheduler.step(val_loss)
            
            if (epoch + 1) % 10 == 0:
                logger.info(f"LSTM Epoch {epoch+1}/{epochs}, Train Loss: {total_loss/len(train_loader):.4f}, Val Loss: {val_loss:.4f}")
    
    def _train_transformer(self, train_loader, val_loader, epochs):
        optimizer = torch.optim.Adam(self.transformer_model.parameters(), lr=0.0001)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=5)
        
        for epoch in range(epochs):
            self.transformer_model.train()
            total_loss = 0
            
            for batch_x, batch_y in train_loader:
                batch_x, batch_y = batch_x.to(self.device), batch_y.to(self.device)
                optimizer.zero_grad()
                
                out = self.transformer_model(batch_x)
                loss = F.nll_loss(out, batch_y)
                
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
            
            val_loss = self._validate_transformer(val_loader)
            scheduler.step(val_loss)
            
            if (epoch + 1) % 10 == 0:
                logger.info(f"Transformer Epoch {epoch+1}/{epochs}, Train Loss: {total_loss/len(train_loader):.4f}, Val Loss: {val_loss:.4f}")
    
    def _validate_gnn(self, val_loader):
        self.gnn_model.eval()
        total_loss = 0
        
        with torch.no_grad():
            for batch in val_loader:
                batch = batch.to(self.device)
                out = self.gnn_model(batch.x, batch.edge_index, batch.batch)
                loss = F.nll_loss(out, batch.y)
                total_loss += loss.item()
        
        return total_loss / len(val_loader)
    
    def _validate_lstm(self, val_loader):
        self.lstm_model.eval()
        total_loss = 0
        
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(self.device), batch_y.to(self.device)
                out = self.lstm_model(batch_x)
                loss = F.nll_loss(out, batch_y)
                total_loss += loss.item()
        
        return total_loss / len(val_loader)
    
    def _validate_transformer(self, val_loader):
        self.transformer_model.eval()
        total_loss = 0
        
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(self.device), batch_y.to(self.device)
                out = self.transformer_model(batch_x)
                loss = F.nll_loss(out, batch_y)
                total_loss += loss.item()
        
        return total_loss / len(val_loader)
    
    def predict(self, graph_data, sequence_data) -> Dict[str, float]:
        """
        Ensemble prediction combining all models.
        
        Returns:
            Dictionary with fraud probability and individual model scores
        """
        self.gnn_model.eval()
        self.lstm_model.eval()
        self.transformer_model.eval()
        
        with torch.no_grad():
            # GNN prediction
            graph_data = graph_data.to(self.device)
            gnn_out = self.gnn_model(graph_data.x, graph_data.edge_index)
            gnn_prob = torch.exp(gnn_out)[0, 1].item()
            
            # LSTM prediction
            sequence_data = sequence_data.to(self.device)
            lstm_out = self.lstm_model(sequence_data)
            lstm_prob = torch.exp(lstm_out)[0, 1].item()
            
            # Transformer prediction
            transformer_out = self.transformer_model(sequence_data)
            transformer_prob = torch.exp(transformer_out)[0, 1].item()
            
            # Ensemble prediction
            ensemble_prob = (
                self.ensemble_weights['gnn'] * gnn_prob +
                self.ensemble_weights['lstm'] * lstm_prob +
                self.ensemble_weights['transformer'] * transformer_prob
            )
            
            return {
                'fraud_probability': ensemble_prob,
                'gnn_score': gnn_prob,
                'lstm_score': lstm_prob,
                'transformer_score': transformer_prob,
                'is_fraud': ensemble_prob > 0.5
            }
    
    def save_models(self, path: str):
        """Save all models."""
        torch.save({
            'gnn': self.gnn_model.state_dict(),
            'lstm': self.lstm_model.state_dict(),
            'transformer': self.transformer_model.state_dict(),
            'ensemble_weights': self.ensemble_weights
        }, path)
        logger.info(f"Models saved to {path}")
    
    def load_models(self, path: str):
        """Load all models."""
        checkpoint = torch.load(path, map_location=self.device)
        self.gnn_model.load_state_dict(checkpoint['gnn'])
        self.lstm_model.load_state_dict(checkpoint['lstm'])
        self.transformer_model.load_state_dict(checkpoint['transformer'])
        self.ensemble_weights = checkpoint['ensemble_weights']
        logger.info(f"Models loaded from {path}")
