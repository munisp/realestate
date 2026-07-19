#!/bin/bash
set -euo pipefail

# AWS EKS GPU Cluster Destruction Script

CLUSTER_NAME="${CLUSTER_NAME:-realestate-gpu-cluster}"
REGION="${AWS_REGION:-us-east-1}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Confirm destruction
confirm_destruction() {
    echo "========================================="
    echo "WARNING: Cluster Destruction"
    echo "========================================="
    echo "This will permanently delete:"
    echo "  - Cluster: ${CLUSTER_NAME}"
    echo "  - Region: ${REGION}"
    echo "  - All workloads and data"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log_info "Destruction cancelled"
        exit 0
    fi
}

# Delete cluster
delete_cluster() {
    log_info "Deleting EKS cluster..."
    
    if eksctl delete cluster --name ${CLUSTER_NAME} --region ${REGION}; then
        log_info "Cluster deleted successfully ✓"
    else
        log_error "Failed to delete cluster"
        exit 1
    fi
}

# Cleanup IAM policies
cleanup_iam() {
    log_info "Cleaning up IAM policies..."
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/AmazonEKSClusterAutoscalerPolicy"
    
    # Check if policy exists and has no attachments
    if aws iam get-policy --policy-arn ${POLICY_ARN} &> /dev/null; then
        ATTACHMENTS=$(aws iam list-entities-for-policy --policy-arn ${POLICY_ARN} --query 'PolicyRoles' --output text)
        
        if [ -z "$ATTACHMENTS" ]; then
            aws iam delete-policy --policy-arn ${POLICY_ARN}
            log_info "IAM policy deleted ✓"
        else
            log_warn "IAM policy has attachments, skipping deletion"
        fi
    fi
}

# Main execution
main() {
    confirm_destruction
    delete_cluster
    cleanup_iam
    
    log_info "Cluster destruction complete!"
}

main
