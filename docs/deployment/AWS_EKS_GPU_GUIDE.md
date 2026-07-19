# AWS EKS GPU Cluster Provisioning Guide

## Overview

This guide provides step-by-step instructions for provisioning a GPU-enabled Amazon EKS cluster for the OCR Service deployment. The cluster will use NVIDIA Tesla T4 GPUs for accelerated document processing.

## Prerequisites

- AWS CLI installed and configured
- kubectl installed (v1.28+)
- eksctl installed (v0.167.0+)
- AWS account with appropriate permissions
- Estimated cost: $0.526/hour per T4 GPU node ($378/month)

## Step 1: Create EKS Cluster with GPU Node Group

### 1.1 Create Cluster Configuration

```yaml
# eks-gpu-cluster.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: realestate-gpu-cluster
  region: us-east-1
  version: "1.28"

managedNodeGroups:
  # CPU nodes for general workloads
  - name: cpu-nodes
    instanceType: t3.xlarge
    desiredCapacity: 3
    minSize: 2
    maxSize: 5
    volumeSize: 100
    labels:
      workload-type: general
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/realestate-gpu-cluster: "owned"

  # GPU nodes for OCR Service
  - name: gpu-nodes-t4
    instanceType: g4dn.xlarge  # 1x NVIDIA T4 GPU, 4 vCPUs, 16GB RAM
    desiredCapacity: 2
    minSize: 1
    maxSize: 4
    volumeSize: 200
    labels:
      workload-type: gpu
      gpu-type: nvidia-t4
    taints:
      - key: nvidia.com/gpu
        value: "true"
        effect: NoSchedule
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/realestate-gpu-cluster: "owned"
```

### 1.2 Create Cluster

```bash
eksctl create cluster -f eks-gpu-cluster.yaml
```

**Expected time:** 15-20 minutes

## Step 2: Install NVIDIA Device Plugin

### 2.1 Apply NVIDIA Device Plugin

```bash
kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.5/nvidia-device-plugin.yml
```

### 2.2 Verify GPU Availability

```bash
kubectl get nodes "-o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu"
```

**Expected output:**
```
NAME                                          GPU
ip-192-168-1-10.us-east-1.compute.internal   1
ip-192-168-1-11.us-east-1.compute.internal   1
```

## Step 3: Install Cluster Autoscaler

### 3.1 Create IAM Policy

```bash
cat > cluster-autoscaler-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:DescribeAutoScalingInstances",
        "autoscaling:DescribeLaunchConfigurations",
        "autoscaling:DescribeScalingActivities",
        "autoscaling:DescribeTags",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeLaunchTemplateVersions"
      ],
      "Resource": ["*"]
    },
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup",
        "ec2:DescribeImages",
        "ec2:GetInstanceTypesFromInstanceRequirements",
        "eks:DescribeNodegroup"
      ],
      "Resource": ["*"]
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name AmazonEKSClusterAutoscalerPolicy \
  --policy-document file://cluster-autoscaler-policy.json
```

### 3.2 Deploy Cluster Autoscaler

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

kubectl -n kube-system annotate deployment.apps/cluster-autoscaler \
  cluster-autoscaler.kubernetes.io/safe-to-evict="false"

kubectl -n kube-system set image deployment.apps/cluster-autoscaler \
  cluster-autoscaler=registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.2
```

## Step 4: Deploy OCR Service

### 4.1 Create Namespace

```bash
kubectl create namespace realestate
```

### 4.2 Deploy OCR Service

```bash
cd services/ocr-service
kubectl apply -f k8s/gpu/deployment-gpu.yaml -n realestate
kubectl apply -f k8s/gpu/service.yaml -n realestate
kubectl apply -f k8s/gpu/hpa-gpu.yaml -n realestate
```

### 4.3 Verify Deployment

```bash
kubectl get pods -n realestate -l app=ocr-service-gpu
kubectl logs -f deployment/ocr-service-gpu -n realestate
```

## Step 5: Configure Monitoring

### 5.1 Install Prometheus GPU Exporter

```bash
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/dcgm-exporter/main/deployment/dcgm-exporter.yaml
```

### 5.2 Verify GPU Metrics

```bash
kubectl port-forward -n default svc/dcgm-exporter 9400:9400
curl http://localhost:9400/metrics | grep DCGM
```

## Cost Optimization

### Instance Type Comparison

| Instance Type | GPU | vCPUs | RAM | Cost/Hour | Cost/Month | Throughput (img/hr) |
|--------------|-----|-------|-----|-----------|------------|---------------------|
| g4dn.xlarge | 1x T4 | 4 | 16GB | $0.526 | $378 | 162,000 |
| g4dn.2xlarge | 1x T4 | 8 | 32GB | $0.752 | $540 | 162,000 |
| g4dn.12xlarge | 4x T4 | 48 | 192GB | $3.912 | $2,811 | 648,000 |
| p3.2xlarge | 1x V100 | 8 | 61GB | $3.06 | $2,200 | 250,000 |

**Recommendation:** Start with 2x g4dn.xlarge nodes for cost efficiency.

### Spot Instances

Save up to 70% by using Spot instances for non-critical workloads:

```yaml
managedNodeGroups:
  - name: gpu-nodes-t4-spot
    instanceType: g4dn.xlarge
    desiredCapacity: 2
    minSize: 0
    maxSize: 4
    spot: true
    labels:
      workload-type: gpu-spot
```

## Troubleshooting

### Issue: Pods stuck in Pending state

**Cause:** GPU nodes not available or tainted

**Solution:**
```bash
kubectl describe pod <pod-name> -n realestate
kubectl get nodes -l gpu-type=nvidia-t4
kubectl describe node <node-name>
```

### Issue: NVIDIA device plugin not running

**Cause:** Incorrect NVIDIA driver version

**Solution:**
```bash
kubectl delete daemonset nvidia-device-plugin-daemonset -n kube-system
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.5/nvidia-device-plugin.yml
```

### Issue: Out of GPU memory

**Cause:** Batch size too large

**Solution:** Reduce `DEEPSEEK_OCR_BATCH_SIZE` in deployment:
```bash
kubectl set env deployment/ocr-service-gpu DEEPSEEK_OCR_BATCH_SIZE=4 -n realestate
```

## Cleanup

```bash
# Delete OCR Service
kubectl delete namespace realestate

# Delete cluster
eksctl delete cluster --name realestate-gpu-cluster --region us-east-1
```

## Next Steps

1. Deploy staging environment
2. Run load tests with k6
3. Configure auto-scaling policies
4. Set up monitoring dashboards
5. Deploy to production

---

*Last updated: November 17, 2025*
