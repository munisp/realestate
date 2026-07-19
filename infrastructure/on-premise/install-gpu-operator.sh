#!/bin/bash
set -e

# Install NVIDIA GPU Operator
# Automates GPU driver and device plugin installation

echo "=========================================="
echo "Installing NVIDIA GPU Operator"
echo "=========================================="

# Step 1: Install Helm
echo "[1/4] Installing Helm..."
if ! command -v helm &> /dev/null; then
  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

# Step 2: Add NVIDIA Helm repository
echo "[2/4] Adding NVIDIA Helm repository..."
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

# Step 3: Install GPU Operator
echo "[3/4] Installing GPU Operator..."
helm install gpu-operator nvidia/gpu-operator \
  -n gpu-operator --create-namespace \
  --set driver.enabled=true \
  --set toolkit.enabled=true \
  --set devicePlugin.enabled=true \
  --set migManager.enabled=false \
  --set operator.defaultRuntime=containerd

# Step 4: Wait for GPU Operator to be ready
echo "[4/4] Waiting for GPU Operator to be ready..."
kubectl wait --for=condition=ready pod \
  -l app=nvidia-device-plugin-daemonset \
  -n gpu-operator \
  --timeout=600s

echo "=========================================="
echo "GPU Operator installed successfully!"
echo "=========================================="
echo ""
echo "Verifying GPU nodes..."
kubectl get nodes -l nvidia.com/gpu.present=true

echo ""
echo "GPU resources on nodes:"
kubectl describe nodes | grep -A 5 "nvidia.com/gpu"

echo ""
echo "Next step: Run ./deploy-ocr-service.sh"
echo "=========================================="

