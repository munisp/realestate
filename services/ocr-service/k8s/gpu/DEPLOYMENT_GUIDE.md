# OCR Service GPU Deployment Guide

## Prerequisites

1. **Kubernetes cluster with GPU nodes**
   - NVIDIA Tesla T4, A100, or V100 GPUs
   - NVIDIA device plugin installed
   - GPU node labels configured

2. **Install NVIDIA Device Plugin**
   ```bash
   kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/nvidia-device-plugin.yml
   ```

3. **Verify GPU availability**
   ```bash
   kubectl get nodes -o json | jq '.items[].status.allocatable."nvidia.com/gpu"'
   ```

## Deployment Steps

### 1. Build GPU-enabled Docker image

```bash
cd services/ocr-service
docker build -f Dockerfile.gpu -t realestate/ocr-service:gpu-latest .
docker push realestate/ocr-service:gpu-latest
```

### 2. Create namespace

```bash
kubectl create namespace realestate
```

### 3. Deploy OCR Service with GPU

```bash
kubectl apply -f k8s/gpu/deployment-gpu.yaml
```

### 4. Verify deployment

```bash
# Check pods are running on GPU nodes
kubectl get pods -n realestate -o wide

# Check GPU allocation
kubectl describe pod <ocr-pod-name> -n realestate | grep nvidia.com/gpu

# Check logs
kubectl logs -f deployment/ocr-service-gpu -n realestate
```

### 5. Test GPU acceleration

```bash
# Port forward to test locally
kubectl port-forward svc/ocr-service-gpu 8000:80 -n realestate

# Test OCR endpoint
curl -X POST http://localhost:8000/api/ocr/batch \
  -F "images=@sample-passport.jpg" \
  -F "images=@sample-nin.jpg"
```

## Performance Tuning

### Batch Size Optimization

Adjust `DEEPSEEK_OCR_BATCH_SIZE` based on GPU memory:

- **Tesla T4 (16GB)**: batch_size=8
- **A100 (40GB)**: batch_size=16
- **A100 (80GB)**: batch_size=32

### Model Caching

Models are cached in persistent volume to avoid re-downloading:

```bash
# Check cache size
kubectl exec -it <ocr-pod> -n realestate -- du -sh /models
```

### Monitoring GPU Utilization

```bash
# Install NVIDIA DCGM Exporter for Prometheus
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/dcgm-exporter/main/dcgm-exporter.yaml

# Query GPU metrics
kubectl port-forward -n gpu-operator svc/dcgm-exporter 9400:9400
curl http://localhost:9400/metrics | grep DCGM
```

## Cost Optimization

### Spot Instances

Use spot instances for GPU nodes to reduce costs by 70%:

```yaml
nodeSelector:
  node.kubernetes.io/instance-type: g4dn.xlarge  # AWS
  cloud.google.com/gke-preemptible: "true"  # GCP
```

### Auto-scaling

HPA configured to scale based on:
- CPU utilization (70%)
- Memory utilization (80%)
- GPU utilization (75%)

Scales from 2 to 10 replicas based on load.

## Troubleshooting

### Pod stuck in Pending

```bash
kubectl describe pod <pod-name> -n realestate
# Check for: "0/3 nodes are available: 3 Insufficient nvidia.com/gpu"
# Solution: Add more GPU nodes or reduce replicas
```

### OOM (Out of Memory)

```bash
# Reduce batch size
kubectl set env deployment/ocr-service-gpu DEEPSEEK_OCR_BATCH_SIZE=4 -n realestate
```

### Slow inference

```bash
# Check GPU utilization
kubectl exec -it <pod-name> -n realestate -- nvidia-smi

# If utilization < 50%, increase batch size
kubectl set env deployment/ocr-service-gpu DEEPSEEK_OCR_BATCH_SIZE=16 -n realestate
```

## Performance Benchmarks

### Expected Throughput

| GPU Type | Batch Size | Images/Second | Latency (p95) |
|----------|-----------|---------------|---------------|
| Tesla T4 | 8         | 45            | 180ms         |
| A100 40GB| 16        | 120           | 135ms         |
| A100 80GB| 32        | 200           | 160ms         |

### Cost Comparison

| Deployment | Cost/Hour | Images/Hour | Cost per 1000 Images |
|------------|-----------|-------------|----------------------|
| CPU-only   | $0.10     | 1,800       | $0.056               |
| T4 GPU     | $0.35     | 162,000     | $0.002               |
| A100 GPU   | $1.20     | 432,000     | $0.003               |

**Recommendation**: Use T4 GPUs for best cost/performance ratio.
