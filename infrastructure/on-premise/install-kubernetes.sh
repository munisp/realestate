#!/bin/bash
set -e

# Kubernetes Installation Script
# Installs and configures Kubernetes on all cluster nodes

echo "=========================================="
echo "Kubernetes Installation"
echo "=========================================="

# This script should be run on each node (control plane and workers)
# Or use Ansible to run on all nodes simultaneously

K8S_VERSION="1.28"

# Step 1: Disable swap
echo "[1/8] Disabling swap..."
swapoff -a
sed -i '/ swap / s/^/#/' /etc/fstab

# Step 2: Load kernel modules
echo "[2/8] Loading kernel modules..."
cat <<EOF | tee /etc/modules-load.d/containerd.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

# Step 3: Configure sysctl
echo "[3/8] Configuring sysctl..."
cat <<EOF | tee /etc/sysctl.d/99-kubernetes-cri.conf
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF

sysctl --system

# Step 4: Install containerd
echo "[4/8] Installing containerd..."
apt update
apt install -y containerd

mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
systemctl enable containerd

# Step 5: Install Kubernetes packages
echo "[5/8] Installing Kubernetes packages..."
apt install -y apt-transport-https ca-certificates curl gpg

mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v${K8S_VERSION}/deb/Release.key | \
  gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v${K8S_VERSION}/deb/ /" | \
  tee /etc/apt/sources.list.d/kubernetes.list

apt update
apt install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl

# Step 6: Enable kubelet
echo "[6/8] Enabling kubelet..."
systemctl enable kubelet

# Step 7: Configure crictl
echo "[7/8] Configuring crictl..."
cat > /etc/crictl.yaml <<EOF
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
EOF

# Step 8: Install additional tools
echo "[8/8] Installing additional tools..."
apt install -y jq vim htop

echo "=========================================="
echo "Kubernetes installation complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  ON FIRST CONTROL PLANE NODE:"
echo "    Run: ./init-control-plane.sh"
echo ""
echo "  ON OTHER CONTROL PLANE NODES:"
echo "    Use the join command from init output"
echo ""
echo "  ON WORKER NODES:"
echo "    Use the worker join command from init output"
echo "=========================================="

