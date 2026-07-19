#!/bin/bash
set -euo pipefail

# Azure AKS GPU Cluster Automated Provisioning Script

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-realestate-gpu-rg}"
CLUSTER_NAME="${CLUSTER_NAME:-realestate-gpu-cluster}"
LOCATION="${AZURE_LOCATION:-eastus}"
K8S_VERSION="${K8S_VERSION:-1.28}"
GPU_VM_SIZE="${GPU_VM_SIZE:-Standard_NC4as_T4_v3}"
GPU_NODE_COUNT="${GPU_NODE_COUNT:-2}"

GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v az &> /dev/null; then
        echo "ERROR: Azure CLI not found"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        echo "ERROR: kubectl not found"
        exit 1
    fi
    
    if ! az account show &> /dev/null; then
        echo "ERROR: Not logged in to Azure. Run 'az login'"
        exit 1
    fi
    
    log_info "Prerequisites satisfied ✓"
}

# Create resource group
create_resource_group() {
    log_info "Creating resource group..."
    
    az group create \
      --name ${RESOURCE_GROUP} \
      --location ${LOCATION}
    
    log_info "Resource group created ✓"
}

# Create cluster
create_cluster() {
    log_info "Creating AKS cluster..."
    
    az aks create \
      --resource-group ${RESOURCE_GROUP} \
      --name ${CLUSTER_NAME} \
      --node-count 3 \
      --node-vm-size Standard_D4s_v3 \
      --enable-cluster-autoscaler \
      --min-count 2 \
      --max-count 5 \
      --network-plugin azure \
      --enable-managed-identity \
      --enable-addons monitoring \
      --generate-ssh-keys
    
    log_info "Cluster created ✓"
}

# Add GPU node pool
add_gpu_nodepool() {
    log_info "Adding GPU node pool..."
    
    az aks nodepool add \
      --resource-group ${RESOURCE_GROUP} \
      --cluster-name ${CLUSTER_NAME} \
      --name gput4pool \
      --node-count ${GPU_NODE_COUNT} \
      --node-vm-size ${GPU_VM_SIZE} \
      --enable-cluster-autoscaler \
      --min-count 1 \
      --max-count 4 \
      --node-taints nvidia.com/gpu=true:NoSchedule \
      --labels workload-type=gpu gpu-type=nvidia-t4
    
    log_info "GPU node pool added ✓"
}

# Get credentials
get_credentials() {
    log_info "Getting cluster credentials..."
    
    az aks get-credentials \
      --resource-group ${RESOURCE_GROUP} \
      --name ${CLUSTER_NAME}
    
    log_info "Credentials configured ✓"
}

# Install NVIDIA device plugin
install_nvidia_plugin() {
    log_info "Installing NVIDIA device plugin..."
    
    kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.5/nvidia-device-plugin.yml
    
    sleep 30
    kubectl rollout status daemonset/nvidia-device-plugin-daemonset -n kube-system --timeout=300s
    
    log_info "NVIDIA device plugin installed ✓"
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
    create_resource_group
    create_cluster
    add_gpu_nodepool
    get_credentials
    install_nvidia_plugin
    verify_gpu
    create_namespace
    
    log_info "AKS GPU cluster provisioning complete!"
}

main
