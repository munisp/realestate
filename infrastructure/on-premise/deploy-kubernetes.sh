#!/bin/bash
set -e

# Kubernetes Deployment Script
# Deploys Kubernetes cluster on OpenStack VMs

echo "=========================================="
echo "Kubernetes Cluster Deployment"
echo "=========================================="

# Configuration
K8S_VERSION="1.28"
CONTROL_PLANE_COUNT=3
GPU_WORKER_COUNT=2
POD_NETWORK_CIDR="10.244.0.0/16"

# Source OpenStack credentials
source /etc/kolla/admin-openrc.sh

# Step 1: Create network infrastructure
echo "[1/6] Creating network infrastructure..."
openstack network create k8s-network || true
openstack subnet create --network k8s-network \
  --subnet-range 192.168.100.0/24 \
  --gateway 192.168.100.1 \
  --dns-nameserver 8.8.8.8 \
  k8s-subnet || true

openstack router create k8s-router || true
openstack router set --external-gateway public k8s-router || true
openstack router add subnet k8s-router k8s-subnet || true

# Step 2: Create security group
echo "[2/6] Creating security group..."
openstack security group create k8s-cluster || true
openstack security group rule create --protocol tcp --dst-port 22 k8s-cluster || true
openstack security group rule create --protocol tcp --dst-port 6443 k8s-cluster || true
openstack security group rule create --protocol tcp --dst-port 2379:2380 k8s-cluster || true
openstack security group rule create --protocol tcp --dst-port 10250:10252 k8s-cluster || true
openstack security group rule create --protocol tcp --dst-port 30000:32767 k8s-cluster || true
openstack security group rule create --protocol icmp k8s-cluster || true
openstack security group rule create --protocol tcp --dst-port 1:65535 --remote-group k8s-cluster k8s-cluster || true

# Step 3: Upload cloud image
echo "[3/6] Uploading Ubuntu 22.04 cloud image..."
if ! openstack image show ubuntu-22.04 &>/dev/null; then
  wget -q https://cloud-images.ubuntu.com/releases/22.04/release/ubuntu-22.04-server-cloudimg-amd64.img
  openstack image create --disk-format qcow2 --container-format bare \
    --public --file ubuntu-22.04-server-cloudimg-amd64.img ubuntu-22.04
  rm ubuntu-22.04-server-cloudimg-amd64.img
fi

# Step 4: Create SSH keypair
echo "[4/6] Creating SSH keypair..."
if [ ! -f ~/.ssh/k8s-key ]; then
  ssh-keygen -t rsa -b 4096 -f ~/.ssh/k8s-key -N ""
fi
openstack keypair create --public-key ~/.ssh/k8s-key.pub k8s-keypair || true

# Step 5: Launch control plane VMs
echo "[5/6] Launching control plane VMs..."
for i in $(seq 1 $CONTROL_PLANE_COUNT); do
  if ! openstack server show k8s-control-$i &>/dev/null; then
    openstack server create --flavor m1.large \
      --image ubuntu-22.04 \
      --network k8s-network \
      --security-group k8s-cluster \
      --key-name k8s-keypair \
      k8s-control-$i
  fi
done

# Step 6: Launch GPU worker VMs
echo "[6/6] Launching GPU worker VMs..."
for i in $(seq 1 $GPU_WORKER_COUNT); do
  if ! openstack server show k8s-gpu-worker-$i &>/dev/null; then
    openstack server create --flavor gpu.t4.medium \
      --image ubuntu-22.04 \
      --network k8s-network \
      --security-group k8s-cluster \
      --key-name k8s-keypair \
      k8s-gpu-worker-$i
  fi
done

# Wait for VMs to be active
echo "Waiting for VMs to become active..."
sleep 30

# Assign floating IPs
echo "Assigning floating IPs..."
for vm in k8s-control-1 k8s-control-2 k8s-control-3 k8s-gpu-worker-1 k8s-gpu-worker-2; do
  if ! openstack server show $vm -c addresses | grep -q "public="; then
    floating_ip=$(openstack floating ip create public -f value -c floating_ip_address)
    openstack server add floating ip $vm $floating_ip
    echo "$vm: $floating_ip"
  fi
done

echo "=========================================="
echo "Kubernetes VMs deployed successfully!"
echo "=========================================="
echo ""
echo "VM Details:"
openstack server list --name k8s- -c Name -c Status -c Networks
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for VMs to finish booting"
echo "2. Run ./install-kubernetes.sh to install K8s on all nodes"
echo "=========================================="

