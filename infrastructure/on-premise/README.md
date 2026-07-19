# On-Premise GPU Cluster Deployment

Automated deployment scripts for building a production-ready OpenStack + Kubernetes GPU cluster for OCR and AI workloads.

## Quick Start

This deployment guide provides a complete, automated path from bare metal servers to a running GPU-accelerated Kubernetes cluster. The entire process takes approximately **4-6 hours** for initial setup, with most time spent on package downloads and OpenStack deployment.

### Prerequisites

Before beginning the deployment, ensure you have the following infrastructure ready:

**Hardware Requirements**:
- 3x control plane nodes (8 cores, 32 GB RAM, 500 GB SSD)
- 2x GPU worker nodes (16 cores, 64 GB RAM, 2x NVIDIA T4 GPUs, 1 TB SSD)
- 2x CPU worker nodes (12 cores, 48 GB RAM, 500 GB SSD)
- 3x storage nodes (8 cores, 32 GB RAM, 4x 4 TB HDD + 2x 500 GB NVMe)
- Network switches with 10/25 GbE connectivity

**Software Requirements**:
- Ubuntu 22.04 LTS installed on all nodes
- Root or sudo access on all nodes
- SSH key-based authentication configured
- Internet connectivity for package downloads

**Network Configuration**:
- VLAN 10: Management network (10.0.10.0/24)
- VLAN 20: Storage network (10.0.20.0/24)
- VLAN 30: Tenant network (10.0.30.0/24)
- VLAN 40: External network (public IPs)

## Deployment Steps

### Phase 1: OpenStack Deployment (2-3 hours)

The first phase deploys OpenStack using Kolla-Ansible, which containerizes all OpenStack services for easier management and upgrades.

```bash
# On the deployment node (can be one of the control plane nodes)
cd /home/ubuntu/realestate-platform/infrastructure/on-premise

# Step 1: Edit the multinode inventory file
vim /etc/kolla/multinode

# Update with your actual node hostnames/IPs:
[control]
controller-01
controller-02
controller-03

[compute]
gpu-worker-01
gpu-worker-02
cpu-worker-01
cpu-worker-02

[storage]
storage-01
storage-02
storage-03

# Step 2: Run OpenStack deployment
./deploy-openstack.sh

# This will:
# - Install Kolla-Ansible and dependencies
# - Generate OpenStack service passwords
# - Bootstrap all nodes
# - Deploy OpenStack services (Nova, Neutron, Cinder, Swift, Horizon)
# - Configure Horizon dashboard

# Expected duration: 2-3 hours
```

**Verification**:

```bash
# Source OpenStack credentials
source /etc/kolla/admin-openrc.sh

# Verify services
openstack service list
openstack compute service list
openstack network agent list

# Access Horizon dashboard
# URL: http://10.0.10.100 (or your INTERNAL_VIP)
# Username: admin
# Password: (found in /etc/kolla/passwords.yml)
```

### Phase 2: GPU Passthrough Configuration (30 minutes)

Configure OpenStack Nova to support PCI passthrough for NVIDIA GPUs, enabling virtual machines to access physical GPUs directly.

```bash
# Step 1: Configure GPU passthrough
./configure-gpu-passthrough.sh

# This will:
# - Configure Nova for PCI passthrough
# - Create GPU-enabled flavors
# - Reconfigure Nova services

# Step 2: Verify GPU configuration
openstack flavor list | grep gpu

# Expected output:
# gpu.t4.medium  | 32768 | 100  | 8    | (pci_passthrough:alias='t4:1')
# gpu.t4.large   | 65536 | 200  | 16   | (pci_passthrough:alias='t4:2')
```

**Troubleshooting**:

If GPUs are not detected:

```bash
# On GPU worker nodes, verify IOMMU is enabled
dmesg | grep -i iommu

# Check PCI devices
lspci | grep -i nvidia

# Verify VFIO driver binding
lspci -nnk -d 10de:
```

### Phase 3: Kubernetes Cluster Deployment (1-2 hours)

Deploy Kubernetes on OpenStack virtual machines with high availability control plane and GPU worker nodes.

```bash
# Step 1: Create Kubernetes VMs on OpenStack
./deploy-kubernetes.sh

# This will:
# - Create network infrastructure (network, subnet, router)
# - Create security groups
# - Upload Ubuntu 22.04 cloud image
# - Launch 3 control plane VMs
# - Launch 2 GPU worker VMs
# - Assign floating IPs

# Wait 2-3 minutes for VMs to boot
sleep 180

# Step 2: Get VM IP addresses
source /etc/kolla/admin-openrc.sh
openstack server list --name k8s-

# Step 3: Install Kubernetes on all nodes
# SSH to each node and run:
ssh ubuntu@<vm-floating-ip>
sudo -i
cd /root
wget https://raw.githubusercontent.com/your-repo/install-kubernetes.sh
chmod +x install-kubernetes.sh
./install-kubernetes.sh

# Or use Ansible for parallel installation:
ansible-playbook -i k8s-inventory install-k8s.yml
```

**Initialize Control Plane**:

```bash
# On the FIRST control plane node only
./init-control-plane.sh

# Save the join commands output!
# You'll need them to join other nodes

# Example join commands:
# Control plane: kubeadm join k8s-control-1:6443 --token abc123 \
#                --discovery-token-ca-cert-hash sha256:xyz... \
#                --control-plane --certificate-key def456

# Worker: kubeadm join k8s-control-1:6443 --token abc123 \
#         --discovery-token-ca-cert-hash sha256:xyz...
```

**Join Other Nodes**:

```bash
# On control plane nodes 2 and 3
kubeadm join k8s-control-1:6443 --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --control-plane --certificate-key <key>

# On GPU worker nodes
kubeadm join k8s-control-1:6443 --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>

# Verify cluster
kubectl get nodes

# Expected output:
# NAME              STATUS   ROLES           AGE   VERSION
# k8s-control-1     Ready    control-plane   10m   v1.28.x
# k8s-control-2     Ready    control-plane   8m    v1.28.x
# k8s-control-3     Ready    control-plane   6m    v1.28.x
# k8s-gpu-worker-1  Ready    <none>          4m    v1.28.x
# k8s-gpu-worker-2  Ready    <none>          4m    v1.28.x
```

### Phase 4: NVIDIA GPU Operator Installation (15-20 minutes)

Install the NVIDIA GPU Operator to automate GPU driver installation and device plugin deployment.

```bash
# On the control plane node
./install-gpu-operator.sh

# This will:
# - Install Helm
# - Add NVIDIA Helm repository
# - Deploy GPU Operator
# - Wait for GPU device plugin to be ready

# Verify GPU nodes
kubectl get nodes -l nvidia.com/gpu.present=true

# Check GPU resources
kubectl describe node k8s-gpu-worker-1 | grep nvidia.com/gpu

# Expected output:
#  nvidia.com/gpu:     2
#  nvidia.com/gpu:     2
```

**Test GPU Access**:

```bash
# Create a test pod
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  restartPolicy: OnFailure
  containers:
  - name: cuda-container
    image: nvcr.io/nvidia/k8s/cuda-sample:vectoradd-cuda11.7.1
    resources:
      limits:
        nvidia.com/gpu: 1
EOF

# Check logs
kubectl logs gpu-test

# Expected output: "Test PASSED"
```

### Phase 5: OCR Service Deployment (10 minutes)

Deploy the OCR service with GPU acceleration and horizontal pod autoscaling.

```bash
# Deploy OCR service
./deploy-ocr-service.sh

# This will:
# - Create production namespace
# - Deploy OCR service with GPU requests
# - Create ClusterIP service
# - Configure HorizontalPodAutoscaler

# Verify deployment
kubectl get pods -n production
kubectl get svc -n production
kubectl get hpa -n production

# Test GPU access in OCR pod
kubectl exec -it <ocr-pod-name> -n production -- nvidia-smi

# Expected output: GPU utilization dashboard
```

## Post-Deployment Configuration

### Install Monitoring Stack

Deploy Prometheus and Grafana for comprehensive cluster monitoring.

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Install NVIDIA DCGM Exporter for GPU metrics
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm install dcgm-exporter nvidia/dcgm-exporter \
  --namespace monitoring

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Login: admin / prom-operator
# Import NVIDIA GPU dashboard (ID: 12239)
```

### Configure Persistent Storage

Set up Ceph for persistent volume storage.

```bash
# Install Rook-Ceph operator
kubectl create -f https://raw.githubusercontent.com/rook/rook/v1.12.0/deploy/examples/crds.yaml
kubectl create -f https://raw.githubusercontent.com/rook/rook/v1.12.0/deploy/examples/operator.yaml

# Create Ceph cluster
kubectl create -f https://raw.githubusercontent.com/rook/rook/v1.12.0/deploy/examples/cluster.yaml

# Verify Ceph health
kubectl -n rook-ceph get cephcluster
```

### Set Up Ingress Controller

Deploy NGINX Ingress Controller for external access.

```bash
# Install NGINX Ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=LoadBalancer

# Verify installation
kubectl get svc -n ingress-nginx
```

## Operational Procedures

### Daily Health Checks

```bash
# Check cluster status
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running

# Check GPU utilization
kubectl exec -it <gpu-pod> -n production -- nvidia-smi

# Review monitoring dashboards
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

### Scaling Operations

**Scale OCR Service**:

```bash
# Manual scaling
kubectl scale deployment ocr-service -n production --replicas=4

# Update HPA
kubectl edit hpa ocr-service-hpa -n production
```

**Add GPU Worker Nodes**:

```bash
# Create new VM on OpenStack
openstack server create --flavor gpu.t4.medium \
  --image ubuntu-22.04 \
  --network k8s-network \
  --security-group k8s-cluster \
  --key-name k8s-keypair \
  k8s-gpu-worker-3

# Install Kubernetes and join cluster
# (follow Phase 3 steps)
```

### Backup and Recovery

**Backup etcd**:

```bash
# Create etcd snapshot
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot-$(date +%Y%m%d).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
```

**Restore etcd**:

```bash
# Stop kube-apiserver
mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/

# Restore snapshot
ETCDCTL_API=3 etcdctl snapshot restore /backup/etcd-snapshot.db \
  --data-dir=/var/lib/etcd-restore

# Update etcd manifest to use new data directory
# Restart kube-apiserver
mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/
```

## Troubleshooting

### Common Issues

**Issue**: Pods stuck in Pending state

```bash
# Check pod events
kubectl describe pod <pod-name> -n <namespace>

# Common causes:
# - Insufficient resources
# - Node selector mismatch
# - PVC not bound
```

**Issue**: GPU not accessible in pods

```bash
# Verify GPU Operator pods
kubectl get pods -n gpu-operator

# Check device plugin logs
kubectl logs -n gpu-operator <nvidia-device-plugin-pod>

# Verify GPU resources on node
kubectl describe node <gpu-node> | grep nvidia.com/gpu
```

**Issue**: High GPU memory usage

```bash
# Check GPU metrics
kubectl exec -it <gpu-pod> -n production -- nvidia-smi

# Review application logs
kubectl logs <gpu-pod> -n production --tail=100

# Consider scaling up replicas
kubectl scale deployment ocr-service -n production --replicas=4
```

## Cost Analysis

### Hardware Investment

| Component | Quantity | Unit Cost | Total |
|-----------|----------|-----------|-------|
| GPU Servers | 2 | $8,000 | $16,000 |
| Control Plane | 3 | $3,000 | $9,000 |
| CPU Workers | 2 | $2,500 | $5,000 |
| Storage Nodes | 3 | $4,000 | $12,000 |
| Networking | 1 | $5,000 | $5,000 |
| **Total** | | | **$47,000** |

### Operational Costs (Monthly)

| Item | Cost |
|------|------|
| Power (2kW @ $0.12/kWh) | $175 |
| Cooling | $100 |
| Internet (1 Gbps) | $500 |
| Maintenance | $200 |
| **Total** | **$975/month** |

### 3-Year TCO

- **Hardware**: $47,000
- **Operations (36 months)**: $35,100
- **Total**: **$82,100**
- **Monthly average**: **$2,281**

**Compared to cloud (AWS)**:
- Monthly cloud cost: ~$2,500
- 3-year cloud cost: ~$90,000
- **Savings**: $7,900 (9.6%)

## Security Hardening

### Network Policies

```bash
# Apply network policies
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ocr-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: ocr-service
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: api-gateway
    ports:
    - protocol: TCP
      port: 8000
EOF
```

### Pod Security Standards

```bash
# Enable Pod Security Admission
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

## Maintenance Schedule

### Daily
- Monitor cluster health dashboards
- Review GPU utilization metrics
- Check for pod failures

### Weekly
- Review capacity trends
- Apply non-critical security patches
- Test backup restoration

### Monthly
- Apply critical security updates
- Review and optimize resource allocation
- Conduct performance benchmarking

### Quarterly
- Hardware health inspection
- Firmware and driver updates
- Disaster recovery drill

## Support and Documentation

- **OpenStack Documentation**: https://docs.openstack.org/
- **Kubernetes Documentation**: https://kubernetes.io/docs/
- **NVIDIA GPU Operator**: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/
- **Kolla-Ansible Guide**: https://docs.openstack.org/kolla-ansible/

---

**Author**: Manus AI  
**Last Updated**: November 17, 2025  
**Version**: 1.0
