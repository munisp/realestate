#!/bin/bash
set -e

# Initialize Kubernetes Control Plane
# Run this on the FIRST control plane node only

echo "=========================================="
echo "Initializing Kubernetes Control Plane"
echo "=========================================="

# Configuration
CONTROL_PLANE_ENDPOINT="k8s-control-1:6443"
POD_NETWORK_CIDR="10.244.0.0/16"

# Initialize cluster
echo "Initializing cluster..."
kubeadm init \
  --control-plane-endpoint="${CONTROL_PLANE_ENDPOINT}" \
  --upload-certs \
  --pod-network-cidr="${POD_NETWORK_CIDR}"

# Configure kubectl
echo "Configuring kubectl..."
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config

# Install Calico CNI
echo "Installing Calico CNI..."
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/tigera-operator.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/custom-resources.yaml

echo "=========================================="
echo "Control plane initialized successfully!"
echo "=========================================="
echo ""
echo "IMPORTANT: Save the join commands above!"
echo ""
echo "To join other control plane nodes:"
echo "  kubeadm join ... --control-plane --certificate-key ..."
echo ""
echo "To join worker nodes:"
echo "  kubeadm join ... "
echo ""
echo "Next step: Run ./install-gpu-operator.sh"
echo "=========================================="

