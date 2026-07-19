# GPU Training Pipeline Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Graph Neural Network (GNN) training pipeline on GPU infrastructure. The system uses **PyTorch Geometric** with **GraphSAGE** models to learn spatial property relationships and generate accurate valuations.

---

## Architecture

The training pipeline consists of four main components:

1. **Data Preparation** - Extract property features, build spatial graphs, generate training datasets
2. **Model Training** - Train GraphSAGE models on GPU with spatial dependencies
3. **Model Evaluation** - Validate accuracy, calculate confidence scores, A/B test against baseline
4. **Model Deployment** - Export trained models, integrate with inference service, monitor performance

---

## Infrastructure Requirements

### Recommended AWS Configuration

**Instance Type**: `g4dn.xlarge`

| Component | Specification |
|-----------|---------------|
| GPU | 1x NVIDIA T4 (16GB VRAM) |
| vCPUs | 4 cores |
| RAM | 16 GB |
| Storage | 125 GB NVMe SSD |
| Network | Up to 25 Gbps |
| Cost | ~$0.526/hour (~$380/month) |

**Alternative Options**:
- **g4dn.2xlarge** - 1x T4, 8 vCPUs, 32GB RAM ($0.752/hour) - Better for larger datasets
- **p3.2xlarge** - 1x V100, 8 vCPUs, 61GB RAM ($3.06/hour) - Faster training, higher cost
- **g5.xlarge** - 1x A10G, 4 vCPUs, 16GB RAM ($1.006/hour) - Latest generation GPU

### Storage Requirements

- **Training Data**: 5-10 GB (100K properties with features)
- **Model Checkpoints**: 500 MB - 2 GB per model
- **OSM Data**: 2-5 GB (Lagos, Abuja, Port Harcourt street networks)
- **Logs & Metrics**: 1-2 GB per month

**Recommended**: 100 GB EBS gp3 volume ($8/month)

---

## Step 1: Launch GPU Instance

### AWS EC2 Setup

```bash
# Launch instance with AWS CLI
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \  # Ubuntu 22.04 Deep Learning AMI
  --instance-type g4dn.xlarge \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":100,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=GNN-Training-Server}]'
```

### Connect to Instance

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<instance-public-ip>

# Verify GPU availability
nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 525.85.12    Driver Version: 525.85.12    CUDA Version: 12.0     |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# |===============================+======================+======================|
# |   0  Tesla T4            Off  | 00000000:00:1E.0 Off |                    0 |
# | N/A   32C    P8     9W /  70W |      0MiB / 15360MiB |      0%      Default |
# +-------------------------------+----------------------+----------------------+
```

---

## Step 2: Install Dependencies

### System Packages

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
  python3.10 \
  python3.10-venv \
  python3-pip \
  git \
  wget \
  curl \
  build-essential \
  libspatialindex-dev \
  libgeos-dev \
  osmium-tool

# Install PostgreSQL client for database access
sudo apt install -y postgresql-client
```

### Python Environment

```bash
# Create virtual environment
python3.10 -m venv ~/gnn-env
source ~/gnn-env/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install PyTorch with CUDA support
pip install torch==2.1.0 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install PyTorch Geometric
pip install torch-geometric==2.4.0
pip install pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv -f https://data.pyg.org/whl/torch-2.1.0+cu118.html

# Install additional dependencies
pip install \
  numpy==1.24.3 \
  pandas==2.0.3 \
  scikit-learn==1.3.0 \
  networkx==3.1 \
  osmnx==1.6.0 \
  geopandas==0.13.2 \
  shapely==2.0.1 \
  psycopg2-binary==2.9.7 \
  python-dotenv==1.0.0 \
  mlflow==2.7.1 \
  tensorboard==2.14.0

# Verify installation
python -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA Available: {torch.cuda.is_available()}')"
python -c "import torch_geometric; print(f'PyG: {torch_geometric.__version__}')"
```

---

## Step 3: Download Training Code

```bash
# Clone repository or copy training scripts
mkdir -p ~/gnn-training
cd ~/gnn-training

# Copy training scripts from your project
# You can use scp or git to transfer files
scp -i your-key.pem -r /path/to/services/python/train_gnn.py ubuntu@<instance-ip>:~/gnn-training/
scp -i your-key.pem -r /path/to/services/python/osm_downloader.py ubuntu@<instance-ip>:~/gnn-training/
```

**Key Files**:
- `train_gnn.py` - Main training script with GraphSAGE model
- `osm_downloader.py` - Download street networks for spatial graphs
- `data_preparation.py` - Extract features, build graphs
- `model_evaluation.py` - Calculate metrics, generate reports

---

## Step 4: Download OSM Data

```bash
# Download street networks for Nigerian cities
cd ~/gnn-training

# Run OSM downloader
python osm_downloader.py \
  --cities Lagos Abuja "Port Harcourt" \
  --output-dir ./osm_data \
  --network-type drive \
  --simplify

# Expected output:
# Downloading Lagos street network...
# Saved to osm_data/lagos_drive.graphml
# Downloading Abuja street network...
# Saved to osm_data/abuja_drive.graphml
# Downloading Port Harcourt street network...
# Saved to osm_data/port_harcourt_drive.graphml
```

**Network Types**:
- `drive` - Driveable streets (for commute analysis)
- `walk` - Walkable paths (for walkability scores)
- `all` - All street types (comprehensive analysis)

---

## Step 5: Prepare Training Data

### Database Connection

Create `.env` file with database credentials:

```bash
cat > .env << EOF
DATABASE_URL=mysql://username:password@your-tidb-host:4000/zkbrrysicrb9abrgwe2sbz
MLFLOW_TRACKING_URI=http://localhost:5001
EOF
```

### Extract Property Features

```bash
# Run data preparation script
python data_preparation.py \
  --database-url "$DATABASE_URL" \
  --osm-dir ./osm_data \
  --output-dir ./training_data \
  --k-neighbors 10 \
  --max-distance 5000

# Output files:
# training_data/property_features.csv - Property attributes
# training_data/spatial_graph.pkl - K-nearest neighbor graph
# training_data/train_test_split.json - Data split indices
```

**Feature Engineering**:
- Property attributes (price, bedrooms, bathrooms, sqft, year built)
- Location features (latitude, longitude, H3 index)
- Neighborhood features (avg price, property density, POI counts)
- Spatial features (distance to CBD, distance to transit, road network centrality)

---

## Step 6: Train GNN Model

### Start MLflow Tracking Server

```bash
# Terminal 1: Start MLflow
mlflow server \
  --backend-store-uri sqlite:///mlflow.db \
  --default-artifact-root ./mlruns \
  --host 0.0.0.0 \
  --port 5001

# Access UI at http://<instance-ip>:5001
```

### Run Training

```bash
# Terminal 2: Start training
python train_gnn.py \
  --data-dir ./training_data \
  --model-type graphsage \
  --hidden-channels 128 \
  --num-layers 3 \
  --dropout 0.2 \
  --learning-rate 0.001 \
  --batch-size 512 \
  --epochs 200 \
  --early-stopping-patience 20 \
  --device cuda \
  --experiment-name "nigeria-property-valuation"

# Expected output:
# Epoch 1/200 | Train Loss: 0.4523 | Val Loss: 0.4012 | Val MAPE: 18.3%
# Epoch 2/200 | Train Loss: 0.3891 | Val Loss: 0.3654 | Val MAPE: 16.7%
# ...
# Epoch 87/200 | Train Loss: 0.1234 | Val Loss: 0.1456 | Val MAPE: 8.2%
# Early stopping triggered. Best epoch: 67
# Model saved to ./models/graphsage_best.pth
```

### Hyperparameter Tuning

```bash
# Run multiple experiments with different hyperparameters
for hidden in 64 128 256; do
  for layers in 2 3 4; do
    python train_gnn.py \
      --hidden-channels $hidden \
      --num-layers $layers \
      --experiment-name "hparam-search-h${hidden}-l${layers}"
  done
done

# Compare results in MLflow UI
```

---

## Step 7: Model Evaluation

### Calculate Metrics

```bash
python model_evaluation.py \
  --model-path ./models/graphsage_best.pth \
  --test-data ./training_data \
  --output-dir ./evaluation

# Outputs:
# evaluation/metrics.json - MAPE, RMSE, R², confidence scores
# evaluation/predictions.csv - Actual vs predicted values
# evaluation/error_analysis.html - Interactive error visualization
```

**Target Metrics**:
- **MAPE** (Mean Absolute Percentage Error): < 10%
- **RMSE** (Root Mean Squared Error): < ₦5M for Lagos properties
- **R² Score**: > 0.85
- **Confidence Coverage**: 90% of predictions within confidence interval

### A/B Testing Framework

```bash
# Compare GNN vs traditional ML
python ab_test.py \
  --model-a ./models/graphsage_best.pth \
  --model-b ./models/xgboost_baseline.pkl \
  --test-data ./training_data \
  --output-dir ./ab_results

# Results saved to ab_results/comparison_report.html
```

---

## Step 8: Model Deployment

### Export Model for Inference

```bash
# Convert PyTorch model to TorchScript for production
python export_model.py \
  --model-path ./models/graphsage_best.pth \
  --output-path ./models/graphsage_production.pt \
  --example-input ./training_data/example_graph.pkl

# Model exported: graphsage_production.pt (125 MB)
```

### Upload to Production Server

```bash
# Copy model to production inference service
scp ./models/graphsage_production.pt \
  ubuntu@<production-server>:/opt/gnn-service/models/

# Copy spatial graph data
scp ./training_data/spatial_graph.pkl \
  ubuntu@<production-server>:/opt/gnn-service/data/

# Restart inference service
ssh ubuntu@<production-server> 'sudo systemctl restart gnn-valuation-service'
```

### Update Database Schema

```sql
-- Record model version in database
INSERT INTO gnn_model_training_runs (
  model_type,
  version,
  training_date,
  hyperparameters,
  performance_metrics,
  model_path,
  status
) VALUES (
  'graphsage',
  'v1.2.0',
  NOW(),
  '{"hidden_channels": 128, "num_layers": 3, "dropout": 0.2}',
  '{"mape": 8.2, "rmse": 4500000, "r2": 0.87}',
  '/opt/gnn-service/models/graphsage_production.pt',
  'active'
);
```

---

## Step 9: Monitoring & Retraining

### Set Up Monitoring

```bash
# Install monitoring tools
pip install prometheus-client grafana-api

# Start metrics exporter
python metrics_exporter.py \
  --model-path ./models/graphsage_production.pt \
  --port 9090

# Metrics available at http://<instance-ip>:9090/metrics
```

**Key Metrics to Monitor**:
- Inference latency (target: < 100ms)
- Prediction accuracy (MAPE drift < 2%)
- Model confidence scores (avg > 0.75)
- GPU utilization (target: 60-80% during training)
- Memory usage (< 12GB VRAM)

### Automated Retraining

```bash
# Create cron job for monthly retraining
crontab -e

# Add line:
0 2 1 * * /home/ubuntu/gnn-env/bin/python /home/ubuntu/gnn-training/train_gnn.py --auto-retrain >> /var/log/gnn-training.log 2>&1
```

**Retraining Triggers**:
- Monthly schedule (1st of each month at 2 AM)
- Accuracy degradation (MAPE increases by >2%)
- New data availability (>10K new property sales)
- Market regime change (price volatility >20%)

---

## Cost Optimization

### Spot Instances

Save 70% on compute costs using AWS Spot Instances:

```bash
# Launch spot instance
aws ec2 request-spot-instances \
  --spot-price "0.20" \
  --instance-count 1 \
  --type "one-time" \
  --launch-specification file://spot-config.json

# spot-config.json:
{
  "ImageId": "ami-0c55b159cbfafe1f0",
  "InstanceType": "g4dn.xlarge",
  "KeyName": "your-key-pair",
  "SecurityGroupIds": ["sg-xxxxxxxxx"],
  "SubnetId": "subnet-xxxxxxxxx"
}
```

**Cost Comparison**:
- On-Demand: $0.526/hour = $380/month
- Spot Instance: $0.158/hour = $114/month (70% savings)
- Reserved Instance (1-year): $0.315/hour = $228/month (40% savings)

### Training Optimization

**Reduce Training Time**:
- Use mixed precision training (FP16): 2x speedup
- Increase batch size to 1024: 1.5x speedup
- Use gradient accumulation: Same accuracy, less memory
- Enable TensorFloat-32: 1.3x speedup on Ampere GPUs

```python
# Mixed precision training
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

for epoch in range(num_epochs):
    for batch in train_loader:
        optimizer.zero_grad()
        
        with autocast():
            output = model(batch)
            loss = criterion(output, batch.y)
        
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
```

---

## Troubleshooting

### GPU Out of Memory

**Error**: `CUDA out of memory. Tried to allocate 2.00 GiB`

**Solutions**:
1. Reduce batch size: `--batch-size 256`
2. Reduce hidden channels: `--hidden-channels 64`
3. Enable gradient checkpointing
4. Use CPU offloading for large graphs

```python
# Gradient checkpointing
from torch.utils.checkpoint import checkpoint

def forward(self, x, edge_index):
    x = checkpoint(self.conv1, x, edge_index)
    x = checkpoint(self.conv2, x, edge_index)
    return x
```

### Slow Training

**Issue**: Training takes >12 hours for 200 epochs

**Solutions**:
1. Use DataLoader with multiple workers: `num_workers=4`
2. Pin memory: `pin_memory=True`
3. Increase batch size (if memory allows)
4. Use NeighborLoader for large graphs

```python
from torch_geometric.loader import NeighborLoader

train_loader = NeighborLoader(
    data,
    num_neighbors=[10, 10],  # 2-hop neighbors
    batch_size=512,
    shuffle=True,
    num_workers=4,
    pin_memory=True
)
```

### Model Not Converging

**Issue**: Validation loss plateaus at high value (MAPE >15%)

**Solutions**:
1. Increase model capacity: `--hidden-channels 256 --num-layers 4`
2. Add residual connections
3. Use learning rate scheduling
4. Check for data leakage in train/test split
5. Normalize features properly

```python
# Learning rate scheduler
from torch.optim.lr_scheduler import ReduceLROnPlateau

scheduler = ReduceLROnPlateau(
    optimizer,
    mode='min',
    factor=0.5,
    patience=10,
    verbose=True
)

for epoch in range(num_epochs):
    train_loss = train_epoch()
    val_loss = validate()
    scheduler.step(val_loss)
```

---

## Production Checklist

- [ ] GPU instance launched and accessible
- [ ] PyTorch + PyTorch Geometric installed with CUDA support
- [ ] OSM data downloaded for all target cities
- [ ] Training data prepared with spatial graphs
- [ ] MLflow tracking server running
- [ ] Model trained with MAPE < 10%
- [ ] Model evaluation completed with confidence scores
- [ ] A/B testing shows improvement over baseline
- [ ] Model exported to TorchScript format
- [ ] Model deployed to production inference service
- [ ] Monitoring dashboard configured
- [ ] Automated retraining scheduled
- [ ] Cost optimization (spot instances) enabled
- [ ] Documentation updated with model version

---

## Next Steps

1. **Scale to More Cities** - Add Kano, Ibadan, Enugu to training data
2. **Temporal Models** - Implement T-GCN for price trend prediction
3. **Multi-Task Learning** - Train single model for valuation + trend + risk
4. **Active Learning** - Prioritize labeling for properties with low confidence
5. **Federated Learning** - Train on distributed data without centralization

---

## Support & Resources

- **PyTorch Geometric Documentation**: https://pytorch-geometric.readthedocs.io/
- **AWS EC2 GPU Instances**: https://aws.amazon.com/ec2/instance-types/g4/
- **MLflow Documentation**: https://mlflow.org/docs/latest/index.html
- **OSMnx Documentation**: https://osmnx.readthedocs.io/

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Author**: Manus AI
