# Azure AKS GPU Cluster Provisioning Guide

## Overview

This guide provides step-by-step instructions for provisioning a GPU-enabled Azure Kubernetes Service (AKS) cluster for the OCR Service deployment using NVIDIA Tesla T4 GPUs.

## Prerequisites

- Azure CLI installed and configured
- kubectl installed (v1.28+)
- Azure subscription with appropriate permissions
- Estimated cost: $0.45/hour per T4 GPU node ($324/month)

## Step 1: Create Resource Group

```bash
az group create \
  --name realestate-gpu-rg \
  --location eastus
```

## Step 2: Create AKS Cluster with GPU Node Pool

### 2.1 Create Cluster

```bash
az aks create \
  --resource-group realestate-gpu-rg \
  --name realestate-gpu-cluster \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 5 \
  --network-plugin azure \
  --enable-managed-identity \
  --enable-addons monitoring \
  --generate-ssh-keys
```

**Expected time:** 10-15 minutes

### 2.2 Add GPU Node Pool

```bash
az aks nodepool add \
  --resource-group realestate-gpu-rg \
  --cluster-name realestate-gpu-cluster \
  --name gput4pool \
  --node-count 2 \
  --node-vm-size Standard_NC4as_T4_v3 \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 4 \
  --node-taints nvidia.com/gpu=true:NoSchedule \
  --labels workload-type=gpu gpu-type=nvidia-t4
```

**Expected time:** 5-10 minutes

### 2.3 Get Cluster Credentials

```bash
az aks get-credentials \
  --resource-group realestate-gpu-rg \
  --name realestate-gpu-cluster
```

## Step 3: Install NVIDIA Device Plugin

### 3.1 Apply NVIDIA Device Plugin

```bash
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.5/nvidia-device-plugin.yml
```

### 3.2 Verify GPU Availability

```bash
kubectl get nodes "-o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu"
```

**Expected output:**
```
NAME                                GPU
aks-gput4pool-12345678-vmss000000  1
aks-gput4pool-12345678-vmss000001  1
```

## Step 4: Configure Azure Container Registry (ACR)

### 4.1 Create ACR

```bash
az acr create \
  --resource-group realestate-gpu-rg \
  --name realestateacr \
  --sku Standard
```

### 4.2 Attach ACR to AKS

```bash
az aks update \
  --resource-group realestate-gpu-rg \
  --name realestate-gpu-cluster \
  --attach-acr realestateacr
```

### 4.3 Build and Push OCR Service Image

```bash
cd services/ocr-service
az acr build --registry realestateacr \
  --image ocr-service:gpu-latest \
  --file Dockerfile.gpu .
```

## Step 5: Deploy OCR Service

### 5.1 Create Namespace

```bash
kubectl create namespace realestate
```

### 5.2 Update Deployment with ACR Image

Edit `k8s/gpu/deployment-gpu.yaml`:
```yaml
spec:
  template:
    spec:
      containers:
      - name: ocr-service
        image: realestateacr.azurecr.io/ocr-service:gpu-latest
```

### 5.3 Deploy OCR Service

```bash
kubectl apply -f k8s/gpu/deployment-gpu.yaml -n realestate
kubectl apply -f k8s/gpu/service.yaml -n realestate
kubectl apply -f k8s/gpu/hpa-gpu.yaml -n realestate
```

### 5.4 Verify Deployment

```bash
kubectl get pods -n realestate -l app=ocr-service-gpu -o wide
kubectl logs -f deployment/ocr-service-gpu -n realestate
```

## Step 6: Configure Monitoring

### 6.1 Install NVIDIA DCGM Exporter

```bash
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/dcgm-exporter/main/deployment/dcgm-exporter.yaml
```

### 6.2 Verify GPU Metrics in Azure Monitor

```bash
az monitor metrics list \
  --resource /subscriptions/SUBSCRIPTION_ID/resourceGroups/realestate-gpu-rg/providers/Microsoft.ContainerService/managedClusters/realestate-gpu-cluster \
  --metric-names "node_gpu_utilization"
```

## Cost Optimization

### VM Size Comparison

| VM Size | GPU | vCPUs | RAM | Cost/Hour | Cost/Month | Throughput (img/hr) |
|---------|-----|-------|-----|-----------|------------|---------------------|
| Standard_NC4as_T4_v3 | 1x T4 | 4 | 28GB | $0.45 | $324 | 162,000 |
| Standard_NC8as_T4_v3 | 1x T4 | 8 | 56GB | $0.90 | $648 | 162,000 |
| Standard_NC6s_v3 | 1x V100 | 6 | 112GB | $3.06 | $2,203 | 250,000 |

**Recommendation:** Start with Standard_NC4as_T4_v3 for optimal cost/performance.

### Spot Instances

Save up to 90% with Azure Spot VMs:

```bash
az aks nodepool add \
  --resource-group realestate-gpu-rg \
  --cluster-name realestate-gpu-cluster \
  --name gput4spot \
  --priority Spot \
  --eviction-policy Delete \
  --spot-max-price -1 \
  --node-vm-size Standard_NC4as_T4_v3 \
  --enable-cluster-autoscaler \
  --min-count 0 \
  --max-count 4
```

## Troubleshooting

### Issue: GPU nodes not available

**Cause:** Quota limit exceeded

**Solution:**
```bash
az vm list-usage --location eastus -o table | grep "Standard NC"
```

Request quota increase at: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade/newsupportrequest

### Issue: NVIDIA driver not loaded

**Cause:** Incorrect VM size or driver installation failed

**Solution:**
```bash
kubectl get nodes -l workload-type=gpu
kubectl describe node <node-name> | grep nvidia
```

Verify VM size supports GPU:
```bash
az vm list-sizes --location eastus | grep NC
```

### Issue: ACR authentication failed

**Cause:** AKS not attached to ACR

**Solution:**
```bash
az aks update \
  --resource-group realestate-gpu-rg \
  --name realestate-gpu-cluster \
  --attach-acr realestateacr
```

## Cleanup

```bash
# Delete OCR Service
kubectl delete namespace realestate

# Delete GPU node pool
az aks nodepool delete \
  --resource-group realestate-gpu-rg \
  --cluster-name realestate-gpu-cluster \
  --name gput4pool

# Delete cluster
az aks delete \
  --resource-group realestate-gpu-rg \
  --name realestate-gpu-cluster

# Delete resource group
az group delete --name realestate-gpu-rg
```

## Next Steps

1. Configure Azure Front Door for global load balancing
2. Set up Azure Key Vault for secrets management
3. Enable Azure Policy for governance
4. Configure Azure Monitor dashboards
5. Deploy to production

---

*Last updated: November 17, 2025*
