#!/bin/bash
set -euo pipefail

# GCP GKE GPU Cluster Automated Provisioning Script

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-realestate-gpu-cluster}"
REGION="${GCP_REGION:-us-central1}"
PROJECT_ID="${GCP_PROJECT_ID}"
K8S_VERSION="${K8S_VERSION:-1.28}"
GPU_MACHINE_TYPE="${GPU_MACHINE_TYPE:-n1-standard-4}"
GPU_NODE_COUNT="${GPU_NODE_COUNT:-2}"

GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if [ -z "$PROJECT_ID" ]; then
        echo "ERROR: GCP_PROJECT_ID environment variable not set"
        exit 1
    fi
    
    if ! command -v gcloud &> /dev/null; then
        echo "ERROR: gcloud CLI not found"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        echo "ERROR: kubectl not found"
        exit 1
    fi
    
    log_info "Prerequisites satisfied ✓"
}

# Enable APIs
enable_apis() {
    log_info "Enabling required APIs..."
    
    gcloud services enable container.googleapis.com --project=${PROJECT_ID}
    gcloud services enable compute.googleapis.com --project=${PROJECT_ID}
    
    log_info "APIs enabled ✓"
}

# Create cluster
create_cluster() {
    log_info "Creating GKE cluster..."
    
    gcloud container clusters create ${CLUSTER_NAME} \
      --project=${PROJECT_ID} \
      --region ${REGION} \
      --machine-type n1-standard-4 \
      --num-nodes 3 \
      --enable-autoscaling \
      --min-nodes 2 \
      --max-nodes 5 \
      --enable-stackdriver-kubernetes \
      --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
      --workload-pool=${PROJECT_ID}.svc.id.goog \
      --enable-shielded-nodes \
      --shielded-secure-boot \
      --shielded-integrity-monitoring
    
    log_info "Cluster created ✓"
}

# Add GPU node pool
add_gpu_nodepool() {
    log_info "Adding GPU node pool..."
    
    gcloud container node-pools create gpu-pool-t4 \
      --project=${PROJECT_ID} \
      --cluster ${CLUSTER_NAME} \
      --region ${REGION} \
      --accelerator type=nvidia-tesla-t4,count=1 \
      --machine-type ${GPU_MACHINE_TYPE} \
      --num-nodes ${GPU_NODE_COUNT} \
      --min-nodes 1 \
      --max-nodes 4 \
      --enable-autoscaling \
      --disk-size 200 \
      --disk-type pd-ssd \
      --node-taints nvidia.com/gpu=true:NoSchedule \
      --node-labels workload-type=gpu,gpu-type=nvidia-t4
    
    log_info "GPU node pool added ✓"
}

# Get credentials
get_credentials() {
    log_info "Getting cluster credentials..."
    
    gcloud container clusters get-credentials ${CLUSTER_NAME} \
      --region ${REGION} \
      --project=${PROJECT_ID}
    
    log_info "Credentials configured ✓"
}

# Install NVIDIA driver
install_nvidia_driver() {
    log_info "Installing NVIDIA GPU driver..."
    
    kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/container-engine-accelerators/master/nvidia-driver-installer/cos/daemonset-preloaded-latest.yaml
    
    sleep 30
    kubectl rollout status daemonset/nvidia-driver-installer -n kube-system --timeout=600s
    
    log_info "NVIDIA driver installed ✓"
}

# Verify GPU
verify_gpu() {
    log_info "Verifying GPU availability..."
    
    kubectl get nodes "-o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu"
    
    log_info "GPU verification complete ✓"
}

# Create namespace
create_namespace() {
    kubectl create namespace realestate --dry-run=client -o yaml | kubectl apply -f -
    kubectl label namespace realestate env=production --overwrite
}

# Main
main() {
    check_prerequisites
    enable_apis
    create_cluster
    add_gpu_nodepool
    get_credentials
    install_nvidia_driver
    verify_gpu
    create_namespace
    
    log_info "GKE GPU cluster provisioning complete!"
}

main
