# On-Premise OpenStack + Kubernetes GPU Cluster Deployment Guide

Complete guide for deploying a production-ready GPU cluster using OpenStack and Kubernetes for OCR and AI workloads.

## Architecture Overview

The on-premise infrastructure consists of three layers that work together to provide a scalable, cost-effective GPU computing environment. The foundation layer uses **OpenStack** to manage physical hardware resources including compute nodes with NVIDIA GPUs, storage systems, and networking infrastructure. This provides Infrastructure-as-a-Service capabilities with flexible resource allocation and multi-tenancy support.

The orchestration layer deploys **Kubernetes** on top of OpenStack virtual machines to manage containerized workloads. Kubernetes handles automatic scaling, load balancing, and service discovery for the OCR microservices. The NVIDIA GPU Operator integrates GPU resources into Kubernetes, enabling containers to access GPU acceleration for machine learning inference.

The application layer runs the OCR service, face matching service, and document processing pipeline as containerized microservices. These services leverage GPU acceleration for real-time document analysis while Kubernetes ensures high availability and automatic recovery from failures.

### Component Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Infrastructure** | OpenStack (Yoga/Zed) | Hardware virtualization and resource management |
| **Compute** | Nova | VM provisioning and lifecycle management |
| **Networking** | Neutron | Software-defined networking and security groups |
| **Storage** | Cinder + Swift | Block storage for VMs and object storage for documents |
| **Orchestration** | Kubernetes 1.28+ | Container orchestration and workload management |
| **GPU Integration** | NVIDIA GPU Operator | GPU device plugin and driver management |
| **Container Runtime** | containerd | Lightweight container execution |
| **Service Mesh** | Istio (optional) | Advanced traffic management and observability |

## Hardware Requirements

### Minimum Production Setup

The minimum viable production setup requires three distinct node types to ensure high availability and proper workload isolation. Control plane nodes manage the Kubernetes cluster state and should have redundancy to prevent single points of failure. GPU worker nodes provide the computational power for OCR and AI workloads, while CPU worker nodes handle non-GPU tasks like web servers and databases.

**Control Plane Nodes** (3 nodes for HA):
- **CPU**: 8 cores (Intel Xeon or AMD EPYC)
- **RAM**: 32 GB DDR4
- **Storage**: 500 GB NVMe SSD (OS + etcd)
- **Network**: Dual 10 GbE NICs (bonded for redundancy)
- **Purpose**: Kubernetes control plane, OpenStack controllers

**GPU Worker Nodes** (2-4 nodes):
- **CPU**: 16 cores (Intel Xeon or AMD EPYC)
- **RAM**: 64 GB DDR4
- **GPU**: 2x NVIDIA T4 (16 GB) or 1x A10 (24 GB) per node
- **Storage**: 1 TB NVMe SSD (OS + container images)
- **Network**: Dual 25 GbE NICs
- **Purpose**: OCR inference, face matching, ML workloads

**CPU Worker Nodes** (2-3 nodes):
- **CPU**: 12 cores
- **RAM**: 48 GB DDR4
- **Storage**: 500 GB SSD
- **Network**: Dual 10 GbE NICs
- **Purpose**: API servers, databases, message queues

**Storage Nodes** (3 nodes for Ceph):
- **CPU**: 8 cores
- **RAM**: 32 GB DDR4
- **Storage**: 4x 4 TB SAS/SATA HDDs + 2x 500 GB NVMe (cache)
- **Network**: Dual 10 GbE NICs
- **Purpose**: Distributed storage (Ceph for block and object storage)

### Network Architecture

The network architecture uses VLANs to isolate different traffic types and ensure security. The management network carries administrative traffic for OpenStack and Kubernetes control planes. The storage network provides dedicated bandwidth for Ceph replication and client traffic. The tenant network handles application traffic between services, while the external network connects to the internet and on-premise data center.

**VLAN Segmentation**:
- **VLAN 10**: Management network (10.0.10.0/24)
- **VLAN 20**: Storage network (10.0.20.0/24)
- **VLAN 30**: Tenant/overlay network (10.0.30.0/24)
- **VLAN 40**: External/provider network (public IPs)

**Network Bandwidth Requirements**:
- Control plane: 10 Gbps
- GPU workers: 25 Gbps (high throughput for image processing)
- Storage: 10 Gbps (Ceph replication)

## OpenStack Installation

### Step 1: Prepare Base Infrastructure

Begin by installing Ubuntu 22.04 LTS on all nodes with consistent network configuration. Each node requires proper hostname resolution, NTP synchronization, and SSH key-based authentication. The installation process uses Ansible playbooks to ensure consistency across all nodes.

```bash
# On all nodes: Install Ubuntu 22.04 LTS
# Configure network interfaces
cat > /etc/netplan/01-netcfg.yaml << EOF
network:
  version: 2
  ethernets:
    eno1:
      dhcp4: no
      addresses: [10.0.10.10/24]  # Management IP
      gateway4: 10.0.10.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
    eno2:
      dhcp4: no
      addresses: [10.0.20.10/24]  # Storage network
EOF

netplan apply

# Set hostname
hostnamectl set-hostname controller-01

# Update /etc/hosts on all nodes
cat >> /etc/hosts << EOF
10.0.10.10 controller-01
10.0.10.11 controller-02
10.0.10.12 controller-03
10.0.10.20 gpu-worker-01
10.0.10.21 gpu-worker-02
10.0.10.30 cpu-worker-01
10.0.10.31 cpu-worker-02
10.0.10.40 storage-01
10.0.10.41 storage-02
10.0.10.42 storage-03
EOF

# Install prerequisites
apt update && apt upgrade -y
apt install -y python3-pip git chrony
```

### Step 2: Deploy OpenStack with Kolla-Ansible

Kolla-Ansible automates OpenStack deployment using Docker containers, simplifying installation and upgrades. The deployment uses a multi-node configuration with high availability for control plane services.

```bash
# On deployment node
pip3 install kolla-ansible

# Create configuration directory
mkdir -p /etc/kolla
cp -r /usr/local/share/kolla-ansible/etc_examples/kolla/* /etc/kolla/
cp /usr/local/share/kolla-ansible/ansible/inventory/multinode /etc/kolla/

# Edit /etc/kolla/globals.yml
cat > /etc/kolla/globals.yml << EOF
---
kolla_base_distro: "ubuntu"
openstack_release: "zed"
kolla_internal_vip_address: "10.0.10.100"
network_interface: "eno1"
neutron_external_interface: "eno2"
enable_haproxy: "yes"
enable_cinder: "yes"
enable_cinder_backend_lvm: "yes"
enable_swift: "yes"
enable_neutron_provider_networks: "yes"
nova_compute_virt_type: "kvm"
enable_nova_serialconsole: "yes"
EOF

# Edit /etc/kolla/multinode inventory
cat > /etc/kolla/multinode << EOF
[control]
controller-01
controller-02
controller-03

[network]
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

[monitoring]
controller-01
EOF

# Generate passwords
kolla-genpwd

# Bootstrap servers
kolla-ansible -i /etc/kolla/multinode bootstrap-servers

# Pre-deployment checks
kolla-ansible -i /etc/kolla/multinode prechecks

# Deploy OpenStack
kolla-ansible -i /etc/kolla/multinode deploy

# Post-deployment
kolla-ansible -i /etc/kolla/multinode post-deploy
```

### Step 3: Configure OpenStack for GPU Passthrough

OpenStack Nova must be configured to support PCI passthrough for GPU devices. This allows virtual machines to access physical GPUs directly with near-native performance.

```bash
# On GPU worker nodes: Identify GPU PCI addresses
lspci | grep -i nvidia
# Output example: 3b:00.0 3D controller: NVIDIA Corporation TU104GL [Tesla T4]

# Configure IOMMU and VFIO
cat >> /etc/default/grub << EOF
GRUB_CMDLINE_LINUX="intel_iommu=on iommu=pt"
EOF

update-grub
reboot

# Verify IOMMU groups
find /sys/kernel/iommu_groups/ -type l

# On controller nodes: Configure Nova for PCI passthrough
# Edit /etc/kolla/config/nova/nova-compute.conf
mkdir -p /etc/kolla/config/nova
cat > /etc/kolla/config/nova/nova-compute.conf << EOF
[pci]
passthrough_whitelist = {"vendor_id": "10de", "product_id": "1eb8"}
alias = {"vendor_id":"10de", "product_id":"1eb8", "device_type":"type-PCI", "name":"t4"}
EOF

# Reconfigure Nova
kolla-ansible -i /etc/kolla/multinode reconfigure -t nova

# Create GPU flavor
source /etc/kolla/admin-openrc.sh
openstack flavor create --ram 32768 --disk 100 --vcpus 8 gpu.t4.medium
openstack flavor set gpu.t4.medium --property "pci_passthrough:alias"="t4:1"
```

## Kubernetes Deployment on OpenStack

### Step 1: Create OpenStack Resources

Provision virtual machines on OpenStack to serve as Kubernetes nodes. The control plane VMs run on CPU workers while GPU-enabled VMs are created on GPU worker nodes.

```bash
# Source OpenStack credentials
source /etc/kolla/admin-openrc.sh

# Create network and subnet
openstack network create k8s-network
openstack subnet create --network k8s-network \
  --subnet-range 192.168.100.0/24 \
  --gateway 192.168.100.1 \
  --dns-nameserver 8.8.8.8 \
  k8s-subnet

# Create router
openstack router create k8s-router
openstack router set --external-gateway public k8s-router
openstack router add subnet k8s-router k8s-subnet

# Create security group
openstack security group create k8s-cluster
openstack security group rule create --protocol tcp --dst-port 22 k8s-cluster
openstack security group rule create --protocol tcp --dst-port 6443 k8s-cluster
openstack security group rule create --protocol tcp --dst-port 2379:2380 k8s-cluster
openstack security group rule create --protocol tcp --dst-port 10250:10252 k8s-cluster
openstack security group rule create --protocol icmp k8s-cluster

# Upload Ubuntu 22.04 image
wget https://cloud-images.ubuntu.com/releases/22.04/release/ubuntu-22.04-server-cloudimg-amd64.img
openstack image create --disk-format qcow2 --container-format bare \
  --public --file ubuntu-22.04-server-cloudimg-amd64.img ubuntu-22.04

# Create SSH keypair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/k8s-key -N ""
openstack keypair create --public-key ~/.ssh/k8s-key.pub k8s-keypair

# Launch control plane VMs
for i in 1 2 3; do
  openstack server create --flavor m1.large \
    --image ubuntu-22.04 \
    --network k8s-network \
    --security-group k8s-cluster \
    --key-name k8s-keypair \
    k8s-control-$i
done

# Launch GPU worker VMs
for i in 1 2; do
  openstack server create --flavor gpu.t4.medium \
    --image ubuntu-22.04 \
    --network k8s-network \
    --security-group k8s-cluster \
    --key-name k8s-keypair \
    k8s-gpu-worker-$i
done

# Assign floating IPs
for vm in k8s-control-1 k8s-control-2 k8s-control-3 k8s-gpu-worker-1 k8s-gpu-worker-2; do
  floating_ip=$(openstack floating ip create public -f value -c floating_ip_address)
  openstack server add floating ip $vm $floating_ip
  echo "$vm: $floating_ip"
done
```

### Step 2: Install Kubernetes with kubeadm

Deploy a highly available Kubernetes cluster using kubeadm with stacked control plane nodes. This configuration provides redundancy while minimizing infrastructure requirements.

```bash
# On all Kubernetes nodes
# Install container runtime (containerd)
cat <<EOF | sudo tee /etc/modules-load.d/containerd.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

cat <<EOF | sudo tee /etc/sysctl.d/99-kubernetes-cri.conf
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF

sysctl --system

apt update
apt install -y containerd

mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd

# Install kubeadm, kubelet, kubectl
apt update
apt install -y apt-transport-https ca-certificates curl
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | \
  gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | \
  tee /etc/apt/sources.list.d/kubernetes.list

apt update
apt install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl

# On first control plane node
kubeadm init --control-plane-endpoint="k8s-control-1:6443" \
  --upload-certs \
  --pod-network-cidr=10.244.0.0/16

# Save the join commands output for other nodes

# Configure kubectl
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config

# Install CNI (Calico)
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/tigera-operator.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/custom-resources.yaml

# On other control plane nodes (use join command from init output)
kubeadm join k8s-control-1:6443 --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --control-plane --certificate-key <key>

# On worker nodes (use join command from init output)
kubeadm join k8s-control-1:6443 --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>
```

### Step 3: Install NVIDIA GPU Operator

The NVIDIA GPU Operator automates the deployment of all components required to run GPU-accelerated workloads on Kubernetes, including drivers, container runtime, device plugin, and monitoring tools.

```bash
# Add Helm repository
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

# Install GPU Operator
helm install --wait --generate-name \
  -n gpu-operator --create-namespace \
  nvidia/gpu-operator \
  --set driver.enabled=true \
  --set toolkit.enabled=true \
  --set devicePlugin.enabled=true \
  --set migManager.enabled=false

# Verify GPU nodes
kubectl get nodes -l nvidia.com/gpu.present=true

# Verify GPU resources
kubectl describe node k8s-gpu-worker-1 | grep nvidia.com/gpu

# Test GPU access
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

kubectl logs gpu-test
# Should show: Test PASSED
```

## OCR Service Deployment

### Kubernetes Manifests

Deploy the OCR service as a Kubernetes Deployment with GPU resource requests. The service uses horizontal pod autoscaling based on GPU utilization and request queue depth.

```yaml
# ocr-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ocr-service
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ocr-service
  template:
    metadata:
      labels:
        app: ocr-service
    spec:
      nodeSelector:
        nvidia.com/gpu.present: "true"
      containers:
      - name: ocr
        image: your-registry.com/ocr-service:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "8Gi"
            cpu: "2"
            nvidia.com/gpu: 1
          limits:
            memory: "16Gi"
            cpu: "4"
            nvidia.com/gpu: 1
        env:
        - name: CUDA_VISIBLE_DEVICES
          value: "0"
        - name: MODEL_PATH
          value: "/models/ocr-model"
        volumeMounts:
        - name: model-storage
          mountPath: /models
      volumes:
      - name: model-storage
        persistentVolumeClaim:
          claimName: ocr-models-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: ocr-service
  namespace: production
spec:
  selector:
    app: ocr-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ocr-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ocr-service
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: nvidia.com/gpu
      target:
        type: Utilization
        averageUtilization: 80
```

## Monitoring and Operations

### Prometheus + Grafana Stack

Deploy comprehensive monitoring for both infrastructure and application metrics using the Prometheus Operator and NVIDIA DCGM Exporter for GPU metrics.

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Install NVIDIA DCGM Exporter for GPU metrics
helm install dcgm-exporter nvidia/dcgm-exporter \
  --namespace monitoring

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Import NVIDIA GPU dashboard (ID: 12239)
```

### Key Metrics to Monitor

| Metric Category | Metrics | Alert Threshold |
|----------------|---------|-----------------|
| **GPU Utilization** | GPU usage %, GPU memory usage | >90% for 10 minutes |
| **OCR Performance** | Inference latency, throughput (docs/sec) | Latency >5s, throughput <10 docs/sec |
| **Cluster Health** | Node status, pod restarts, API latency | Any node NotReady, >5 restarts/hour |
| **Storage** | Ceph health, disk usage, IOPS | Ceph WARN status, >85% disk usage |
| **Network** | Bandwidth utilization, packet loss | >80% utilization, >1% packet loss |

## Cost Analysis: On-Premise vs Cloud

### Total Cost of Ownership (3 Years)

The on-premise deployment requires significant upfront capital expenditure but offers lower operational costs over time. Cloud deployments have minimal upfront costs but higher ongoing expenses due to GPU instance pricing.

**On-Premise Setup**:

| Component | Quantity | Unit Cost | Total Cost |
|-----------|----------|-----------|------------|
| GPU Servers (2x T4 each) | 2 | $8,000 | $16,000 |
| Control Plane Servers | 3 | $3,000 | $9,000 |
| CPU Worker Servers | 2 | $2,500 | $5,000 |
| Storage Servers (Ceph) | 3 | $4,000 | $12,000 |
| Network Equipment | 1 set | $5,000 | $5,000 |
| Rack & PDU | 1 | $2,000 | $2,000 |
| **Hardware Subtotal** | | | **$49,000** |
| Power (2kW @ $0.12/kWh) | 36 months | $175/month | $6,300 |
| Cooling & Facilities | 36 months | $100/month | $3,600 |
| Internet (1 Gbps) | 36 months | $500/month | $18,000 |
| Maintenance & Support | 36 months | $200/month | $7,200 |
| **3-Year TCO** | | | **$84,100** |
| **Monthly Average** | | | **$2,336** |

**Cloud Equivalent (AWS)**:

| Component | Configuration | Monthly Cost | 3-Year Cost |
|-----------|--------------|--------------|-------------|
| GPU Instances (2x g4dn.2xlarge) | 2x T4, 8 vCPU, 32 GB | $1,200 | $43,200 |
| Control Plane (3x t3.xlarge) | 4 vCPU, 16 GB each | $450 | $16,200 |
| Storage (2 TB EBS + S3) | gp3 + Standard S3 | $300 | $10,800 |
| Data Transfer (5 TB/month) | Outbound traffic | $450 | $16,200 |
| Load Balancer & Networking | ALB + VPC | $100 | $3,600 |
| **Monthly Total** | | **$2,500** | |
| **3-Year TCO** | | | **$90,000** |

**Cost Comparison**:

Over a three-year period, the on-premise deployment costs approximately **$84,100** compared to **$90,000** for cloud infrastructure, resulting in savings of **$5,900** (6.5%). However, the on-premise solution offers several advantages beyond cost savings including complete data sovereignty, no egress fees for large datasets, and the ability to scale without per-instance pricing.

The break-even point occurs at approximately **21 months**, after which the on-premise infrastructure becomes more cost-effective. For workloads expected to run longer than two years with consistent GPU requirements, on-premise deployment provides better economics.

## Troubleshooting Guide

### Common Issues and Solutions

**Issue**: GPU not detected in Kubernetes pods

**Solution**: Verify NVIDIA device plugin is running and GPU resources are advertised on nodes.

```bash
# Check device plugin
kubectl get pods -n gpu-operator | grep nvidia-device-plugin

# Verify GPU resources
kubectl describe node <gpu-node> | grep nvidia.com/gpu

# Check driver installation
kubectl exec -it <nvidia-driver-pod> -n gpu-operator -- nvidia-smi
```

**Issue**: OpenStack VM cannot access GPU (PCI passthrough failure)

**Solution**: Ensure IOMMU is enabled and PCI device is properly configured in Nova.

```bash
# Verify IOMMU
dmesg | grep -i iommu

# Check PCI device binding
lspci -nnk -d 10de:

# Verify Nova configuration
grep -r pci_passthrough /etc/kolla/config/nova/
```

**Issue**: Kubernetes control plane unreachable

**Solution**: Check HAProxy configuration and control plane node health.

```bash
# Verify HAProxy
systemctl status haproxy

# Check control plane pods
kubectl get pods -n kube-system | grep -E 'kube-apiserver|etcd'

# Test API server connectivity
curl -k https://<control-plane-ip>:6443/healthz
```

**Issue**: Poor OCR inference performance

**Solution**: Optimize batch size, check GPU utilization, and verify model loading.

```bash
# Monitor GPU utilization
kubectl exec -it <ocr-pod> -- nvidia-smi dmon -s u

# Check pod resource allocation
kubectl describe pod <ocr-pod> | grep -A 10 Limits

# Review application logs
kubectl logs <ocr-pod> --tail=100
```

## Maintenance Procedures

### Regular Maintenance Tasks

**Daily**:
- Monitor cluster health dashboards
- Review GPU utilization metrics
- Check for pod failures or restarts
- Verify backup completion

**Weekly**:
- Review capacity trends
- Update security patches (non-critical)
- Test disaster recovery procedures
- Audit access logs

**Monthly**:
- Apply critical security updates
- Review and optimize resource allocation
- Conduct performance benchmarking
- Update documentation

**Quarterly**:
- Hardware health inspection
- Firmware and driver updates
- Capacity planning review
- Disaster recovery drill

### Upgrade Procedures

**Kubernetes Upgrade**:

```bash
# Upgrade control plane nodes one at a time
kubectl drain <control-node> --ignore-daemonsets
apt update && apt install -y kubeadm=1.28.x-00
kubeadm upgrade apply v1.28.x
apt install -y kubelet=1.28.x-00 kubectl=1.28.x-00
systemctl daemon-reload && systemctl restart kubelet
kubectl uncordon <control-node>

# Upgrade worker nodes
kubectl drain <worker-node> --ignore-daemonsets
apt update && apt install -y kubeadm=1.28.x-00 kubelet=1.28.x-00
kubeadm upgrade node
systemctl daemon-reload && systemctl restart kubelet
kubectl uncordon <worker-node>
```

**NVIDIA GPU Operator Upgrade**:

```bash
# Upgrade GPU Operator
helm upgrade <release-name> nvidia/gpu-operator \
  -n gpu-operator \
  --set driver.version=<new-version>

# Monitor upgrade progress
kubectl get pods -n gpu-operator -w
```

## Security Hardening

### Network Security

Implement network policies to restrict traffic between namespaces and enforce least-privilege access for services.

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ocr-service-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: ocr-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: api-gateway
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: storage
    ports:
    - protocol: TCP
      port: 9000  # S3-compatible storage
```

### RBAC Configuration

Configure Role-Based Access Control to limit permissions for service accounts and users.

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ocr-service-sa
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ocr-service-role
  namespace: production
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ocr-service-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: ocr-service-sa
roleRef:
  kind: Role
  name: ocr-service-role
  apiGroup: rbac.authorization.k8s.io
```

## Disaster Recovery

### Backup Strategy

Implement automated backups for etcd, persistent volumes, and OpenStack databases using Velero and native OpenStack backup tools.

```bash
# Install Velero for Kubernetes backups
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.7.0 \
  --bucket k8s-backups \
  --secret-file ./credentials-velero \
  --use-volume-snapshots=false \
  --backup-location-config region=us-east-1,s3ForcePathStyle="true",s3Url=http://ceph-s3:9000

# Create daily backup schedule
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces production,monitoring

# Backup OpenStack databases
docker exec mariadb mysqldump --all-databases > /backup/openstack-$(date +%Y%m%d).sql
```

### Recovery Procedures

Document step-by-step recovery procedures for common failure scenarios including single node failure, control plane failure, and complete cluster loss.

**Single Node Failure**:
1. Identify failed node: `kubectl get nodes`
2. Drain workloads: `kubectl drain <node> --ignore-daemonsets --delete-emptydir-data`
3. Replace or repair hardware
4. Rejoin node to cluster: `kubeadm join ...`
5. Verify node health: `kubectl get nodes`

**Control Plane Failure**:
1. Restore etcd from backup: `etcdctl snapshot restore`
2. Restart control plane components
3. Verify cluster state: `kubectl get cs`
4. Restore workloads if needed: `velero restore create --from-backup <backup-name>`

---

**Author**: Manus AI  
**Last Updated**: November 17, 2025  
**Version**: 1.0
