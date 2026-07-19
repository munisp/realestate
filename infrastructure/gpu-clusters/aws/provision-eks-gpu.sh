#!/bin/bash
set -euo pipefail

# AWS EKS GPU Cluster Automated Provisioning Script
# This script automates the complete setup of a GPU-enabled EKS cluster

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-realestate-gpu-cluster}"
REGION="${AWS_REGION:-us-east-1}"
K8S_VERSION="${K8S_VERSION:-1.28}"
GPU_INSTANCE_TYPE="${GPU_INSTANCE_TYPE:-g4dn.xlarge}"
GPU_NODE_COUNT="${GPU_NODE_COUNT:-2}"
GPU_NODE_MIN="${GPU_NODE_MIN:-1}"
GPU_NODE_MAX="${GPU_NODE_MAX:-4}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # Check eksctl
    if ! command -v eksctl &> /dev/null; then
        log_error "eksctl not found. Please install: https://eksctl.io/"
        exit 1
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure'"
        exit 1
    fi
    
    log_info "All prerequisites satisfied ✓"
}

# Create cluster configuration
create_cluster_config() {
    log_info "Creating cluster configuration..."
    
    cat > eks-gpu-cluster.yaml << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: ${CLUSTER_NAME}
  region: ${REGION}
  version: "${K8S_VERSION}"

iam:
  withOIDC: true

managedNodeGroups:
  # CPU nodes for general workloads
  - name: cpu-nodes
    instanceType: t3.xlarge
    desiredCapacity: 3
    minSize: 2
    maxSize: 5
    volumeSize: 100
    volumeType: gp3
    labels:
      workload-type: general
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/${CLUSTER_NAME}: "owned"
    iam:
      withAddonPolicies:
        autoScaler: true
        cloudWatch: true
        ebs: true

  # GPU nodes for OCR Service
  - name: gpu-nodes-t4
    instanceType: ${GPU_INSTANCE_TYPE}
    desiredCapacity: ${GPU_NODE_COUNT}
    minSize: ${GPU_NODE_MIN}
    maxSize: ${GPU_NODE_MAX}
    volumeSize: 200
    volumeType: gp3
    labels:
      workload-type: gpu
      gpu-type: nvidia-t4
    taints:
      - key: nvidia.com/gpu
        value: "true"
        effect: NoSchedule
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/${CLUSTER_NAME}: "owned"
    iam:
      withAddonPolicies:
        autoScaler: true
        cloudWatch: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver
    serviceAccountRoleARN: arn:aws:iam::ACCOUNT_ID:role/AmazonEKS_EBS_CSI_DriverRole
EOF

    log_info "Cluster configuration created ✓"
}

# Create cluster
create_cluster() {
    log_info "Creating EKS cluster (this will take 15-20 minutes)..."
    
    if eksctl create cluster -f eks-gpu-cluster.yaml; then
        log_info "Cluster created successfully ✓"
    else
        log_error "Failed to create cluster"
        exit 1
    fi
}

# Install NVIDIA device plugin
install_nvidia_plugin() {
    log_info "Installing NVIDIA device plugin..."
    
    kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.5/nvidia-device-plugin.yml
    
    # Wait for daemonset to be ready
    log_info "Waiting for NVIDIA device plugin to be ready..."
    kubectl rollout status daemonset/nvidia-device-plugin-daemonset -n kube-system --timeout=300s
    
    log_info "NVIDIA device plugin installed ✓"
}

# Verify GPU availability
verify_gpu() {
    log_info "Verifying GPU availability..."
    
    GPU_COUNT=$(kubectl get nodes -o json | jq '[.items[].status.allocatable."nvidia.com/gpu" | tonumber] | add')
    
    if [ "$GPU_COUNT" -ge "$GPU_NODE_COUNT" ]; then
        log_info "GPU verification successful: $GPU_COUNT GPUs available ✓"
    else
        log_warn "Expected $GPU_NODE_COUNT GPUs, found $GPU_COUNT"
    fi
    
    # Display GPU nodes
    kubectl get nodes "-o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu,INSTANCE:.metadata.labels.node\.kubernetes\.io/instance-type"
}

# Install cluster autoscaler
install_cluster_autoscaler() {
    log_info "Installing cluster autoscaler..."
    
    # Create IAM policy
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

    # Create policy if it doesn't exist
    if ! aws iam get-policy --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/AmazonEKSClusterAutoscalerPolicy" &> /dev/null; then
        aws iam create-policy \
          --policy-name AmazonEKSClusterAutoscalerPolicy \
          --policy-document file://cluster-autoscaler-policy.json
    fi
    
    # Deploy cluster autoscaler
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
    
    kubectl -n kube-system annotate deployment.apps/cluster-autoscaler \
      cluster-autoscaler.kubernetes.io/safe-to-evict="false" --overwrite
    
    kubectl -n kube-system set image deployment.apps/cluster-autoscaler \
      cluster-autoscaler=registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.2
    
    kubectl -n kube-system set env deployment.apps/cluster-autoscaler \
      AWS_REGION=${REGION}
    
    # Edit deployment to add cluster name
    kubectl -n kube-system patch deployment cluster-autoscaler -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"cluster-autoscaler\",\"command\":[\"./cluster-autoscaler\",\"--v=4\",\"--stderrthreshold=info\",\"--cloud-provider=aws\",\"--skip-nodes-with-local-storage=false\",\"--expander=least-waste\",\"--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/${CLUSTER_NAME}\"]}]}}}}"
    
    log_info "Cluster autoscaler installed ✓"
}

# Install metrics server
install_metrics_server() {
    log_info "Installing metrics server..."
    
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    
    log_info "Metrics server installed ✓"
}

# Create namespace
create_namespace() {
    log_info "Creating realestate namespace..."
    
    kubectl create namespace realestate --dry-run=client -o yaml | kubectl apply -f -
    kubectl label namespace realestate env=production --overwrite
    
    log_info "Namespace created ✓"
}

# Display cluster info
display_cluster_info() {
    log_info "Cluster provisioning complete!"
    echo ""
    echo "========================================="
    echo "Cluster Information"
    echo "========================================="
    echo "Cluster Name: ${CLUSTER_NAME}"
    echo "Region: ${REGION}"
    echo "Kubernetes Version: ${K8S_VERSION}"
    echo ""
    echo "Nodes:"
    kubectl get nodes -o wide
    echo ""
    echo "GPU Allocation:"
    kubectl get nodes "-o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu"
    echo ""
    echo "========================================="
    echo "Next Steps:"
    echo "1. Deploy OCR service: kubectl apply -f services/ocr-service/k8s/gpu/"
    echo "2. Verify GPU allocation: kubectl describe pod <ocr-pod> -n realestate"
    echo "3. Monitor cluster: kubectl get pods -n realestate"
    echo "========================================="
}

# Save cluster config
save_cluster_config() {
    log_info "Saving cluster configuration..."
    
    cat > cluster-info.json << EOF
{
  "cluster_name": "${CLUSTER_NAME}",
  "region": "${REGION}",
  "k8s_version": "${K8S_VERSION}",
  "gpu_instance_type": "${GPU_INSTANCE_TYPE}",
  "gpu_node_count": ${GPU_NODE_COUNT},
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "estimated_cost_per_month": $(echo "${GPU_NODE_COUNT} * 378" | bc)
}
EOF
    
    log_info "Configuration saved to cluster-info.json ✓"
}

# Main execution
main() {
    echo "========================================="
    echo "AWS EKS GPU Cluster Provisioning"
    echo "========================================="
    echo ""
    
    check_prerequisites
    create_cluster_config
    create_cluster
    install_nvidia_plugin
    verify_gpu
    install_cluster_autoscaler
    install_metrics_server
    create_namespace
    save_cluster_config
    display_cluster_info
}

# Run main function
main
