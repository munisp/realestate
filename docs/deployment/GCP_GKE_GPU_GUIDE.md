# GCP GKE GPU Cluster Provisioning Guide

## Overview

This guide provides step-by-step instructions for provisioning a GPU-enabled Google Kubernetes Engine (GKE) cluster for the OCR Service deployment using NVIDIA Tesla T4 GPUs.

## Prerequisites

- gcloud CLI installed and configured
- kubectl installed (v1.28+)
- GCP project with Kubernetes Engine API enabled
- Estimated cost: $0.35/hour per T4 GPU node ($252/month)

## Step 1: Enable Required APIs

```bash
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
```

## Step 2: Create GKE Cluster with GPU Node Pool

### 2.1 Create Cluster

```bash
gcloud container clusters create realestate-gpu-cluster \
  --region us-central1 \
  --machine-type n1-standard-4 \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 5 \
  --enable-stackdriver-kubernetes \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --enable-shielded-nodes \
  --shielded-secure-boot \
  --shielded-integrity-monitoring
```

**Replace `PROJECT_ID` with your GCP project ID**

**Expected time:** 5-10 minutes

### 2.2 Add GPU Node Pool

```bash
gcloud container node-pools create gpu-pool-t4 \
  --cluster realestate-gpu-cluster \
  --region us-central1 \
  --accelerator type=nvidia-tesla-t4,count=1 \
  --machine-type n1-standard-4 \
  --num-nodes 2 \
  --min-nodes 1 \
  --max-nodes 4 \
  --enable-autoscaling \
  --disk-size 200 \
  --disk-type pd-ssd \
  --node-taints nvidia.com/gpu=true:NoSchedule \
  --node-labels workload-type=gpu,gpu-type=nvidia-t4
```

**Expected time:** 5-7 minutes

### 2.3 Get Cluster Credentials

```bash
gcloud container clusters get-credentials realestate-gpu-cluster --region us-central1
```

## Step 3: Install NVIDIA GPU Device Plugin

### 3.1 Apply NVIDIA Daemonset

```bash
kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/container-engine-accelerators/master/nvidia-driver-installer/cos/daemonset-preloaded-latest.yaml
```

### 3.2 Verify GPU Availability

```bash
kubectl get nodes "-o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu"
```

**Expected output:**
```
NAME                                                  GPU
gke-realestate-gpu-cluster-gpu-pool-t4-a1b2c3d4-e5f6  1
gke-realestate-gpu-cluster-gpu-pool-t4-g7h8i9j0-k1l2  1
```

## Step 4: Configure Workload Identity (Optional but Recommended)

### 4.1 Create Service Account

```bash
gcloud iam service-accounts create ocr-service-sa \
  --display-name="OCR Service Account"
```

### 4.2 Bind IAM Roles

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:ocr-service-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### 4.3 Create Kubernetes Service Account

```bash
kubectl create serviceaccount ocr-service-ksa -n realestate

gcloud iam service-accounts add-iam-policy-binding \
  ocr-service-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:PROJECT_ID.svc.id.goog[realestate/ocr-service-ksa]"

kubectl annotate serviceaccount ocr-service-ksa -n realestate \
  iam.gke.io/gcp-service-account=ocr-service-sa@PROJECT_ID.iam.gserviceaccount.com
```

## Step 5: Deploy OCR Service

### 5.1 Create Namespace

```bash
kubectl create namespace realestate
```

### 5.2 Deploy OCR Service

```bash
cd services/ocr-service
kubectl apply -f k8s/gpu/deployment-gpu.yaml -n realestate
kubectl apply -f k8s/gpu/service.yaml -n realestate
kubectl apply -f k8s/gpu/hpa-gpu.yaml -n realestate
```

### 5.3 Verify Deployment

```bash
kubectl get pods -n realestate -l app=ocr-service-gpu -o wide
kubectl logs -f deployment/ocr-service-gpu -n realestate
```

## Step 6: Configure Monitoring

### 6.1 Install NVIDIA DCGM Exporter

```bash
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/dcgm-exporter/main/deployment/dcgm-exporter.yaml
```

### 6.2 Verify GPU Metrics in Cloud Monitoring

```bash
gcloud logging read "resource.type=k8s_pod AND resource.labels.namespace_name=default AND labels.app=dcgm-exporter" --limit 10
```

## Cost Optimization

### Machine Type Comparison

| Machine Type | GPU | vCPUs | RAM | Cost/Hour | Cost/Month | Throughput (img/hr) |
|-------------|-----|-------|-----|-----------|------------|---------------------|
| n1-standard-4 + T4 | 1x T4 | 4 | 15GB | $0.35 | $252 | 162,000 |
| n1-standard-8 + T4 | 1x T4 | 8 | 30GB | $0.47 | $338 | 162,000 |
| a2-highgpu-1g + A100 | 1x A100 | 12 | 85GB | $3.67 | $2,640 | 432,000 |

**Recommendation:** Start with n1-standard-4 + T4 for best cost/performance.

### Preemptible GPU Nodes

Save up to 80% with preemptible instances:

```bash
gcloud container node-pools create gpu-pool-t4-preemptible \
  --cluster realestate-gpu-cluster \
  --region us-central1 \
  --accelerator type=nvidia-tesla-t4,count=1 \
  --machine-type n1-standard-4 \
  --preemptible \
  --num-nodes 2 \
  --min-nodes 0 \
  --max-nodes 4 \
  --enable-autoscaling
```

## Troubleshooting

### Issue: GPU driver installation failed

**Cause:** COS image version incompatibility

**Solution:**
```bash
kubectl delete daemonset nvidia-driver-installer -n kube-system
kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/container-engine-accelerators/master/nvidia-driver-installer/cos/daemonset-preloaded-latest.yaml
```

### Issue: Pods not scheduled on GPU nodes

**Cause:** Missing node selector or toleration

**Solution:** Add to deployment:
```yaml
nodeSelector:
  cloud.google.com/gke-accelerator: nvidia-tesla-t4
tolerations:
- key: nvidia.com/gpu
  operator: Exists
  effect: NoSchedule
```

### Issue: Out of GPU quota

**Cause:** GCP project GPU quota exceeded

**Solution:**
```bash
gcloud compute project-info describe --project=PROJECT_ID | grep -A 10 quota
```

Request quota increase at: https://console.cloud.google.com/iam-admin/quotas

## Cleanup

```bash
# Delete OCR Service
kubectl delete namespace realestate

# Delete GPU node pool
gcloud container node-pools delete gpu-pool-t4 \
  --cluster realestate-gpu-cluster \
  --region us-central1

# Delete cluster
gcloud container clusters delete realestate-gpu-cluster --region us-central1
```

## Next Steps

1. Configure Cloud Armor for DDoS protection
2. Set up Cloud CDN for static assets
3. Enable Binary Authorization for container security
4. Configure Cloud Logging and Monitoring dashboards
5. Deploy to production

---

*Last updated: November 17, 2025*
