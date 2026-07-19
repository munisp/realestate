#!/bin/bash
set -euo pipefail

# GPU Cluster Validation and Health Check Script
# Works with AWS EKS, GCP GKE, and Azure AKS

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check cluster connectivity
check_cluster_connectivity() {
    echo "Checking cluster connectivity..."
    
    if kubectl cluster-info &> /dev/null; then
        log_pass "Cluster is accessible"
    else
        log_fail "Cannot connect to cluster"
        return 1
    fi
}

# Check GPU nodes
check_gpu_nodes() {
    echo "Checking GPU nodes..."
    
    GPU_NODES=$(kubectl get nodes -l gpu-type=nvidia-t4 --no-headers 2>/dev/null | wc -l)
    
    if [ "$GPU_NODES" -gt 0 ]; then
        log_pass "Found $GPU_NODES GPU node(s)"
    else
        log_fail "No GPU nodes found"
    fi
}

# Check GPU allocation
check_gpu_allocation() {
    echo "Checking GPU allocation..."
    
    TOTAL_GPUS=$(kubectl get nodes -o json | jq '[.items[].status.allocatable."nvidia.com/gpu" | tonumber] | add' 2>/dev/null || echo 0)
    
    if [ "$TOTAL_GPUS" -gt 0 ]; then
        log_pass "Total GPUs available: $TOTAL_GPUS"
    else
        log_fail "No GPUs allocated"
    fi
}

# Check NVIDIA device plugin
check_nvidia_plugin() {
    echo "Checking NVIDIA device plugin..."
    
    PLUGIN_PODS=$(kubectl get pods -n kube-system -l name=nvidia-device-plugin-ds --no-headers 2>/dev/null | wc -l)
    
    if [ "$PLUGIN_PODS" -gt 0 ]; then
        READY_PODS=$(kubectl get pods -n kube-system -l name=nvidia-device-plugin-ds --no-headers 2>/dev/null | grep "Running" | wc -l)
        
        if [ "$READY_PODS" -eq "$PLUGIN_PODS" ]; then
            log_pass "NVIDIA device plugin running ($READY_PODS/$PLUGIN_PODS pods ready)"
        else
            log_warn "NVIDIA device plugin partially ready ($READY_PODS/$PLUGIN_PODS pods)"
        fi
    else
        log_fail "NVIDIA device plugin not found"
    fi
}

# Check cluster autoscaler
check_cluster_autoscaler() {
    echo "Checking cluster autoscaler..."
    
    if kubectl get deployment cluster-autoscaler -n kube-system &> /dev/null; then
        REPLICAS=$(kubectl get deployment cluster-autoscaler -n kube-system -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
        
        if [ "$REPLICAS" -gt 0 ]; then
            log_pass "Cluster autoscaler is running"
        else
            log_warn "Cluster autoscaler deployment exists but not ready"
        fi
    else
        log_warn "Cluster autoscaler not installed (optional)"
    fi
}

# Check metrics server
check_metrics_server() {
    echo "Checking metrics server..."
    
    if kubectl get deployment metrics-server -n kube-system &> /dev/null; then
        REPLICAS=$(kubectl get deployment metrics-server -n kube-system -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
        
        if [ "$REPLICAS" -gt 0 ]; then
            log_pass "Metrics server is running"
        else
            log_warn "Metrics server deployment exists but not ready"
        fi
    else
        log_warn "Metrics server not installed (optional)"
    fi
}

# Check namespace
check_namespace() {
    echo "Checking realestate namespace..."
    
    if kubectl get namespace realestate &> /dev/null; then
        log_pass "Namespace 'realestate' exists"
    else
        log_fail "Namespace 'realestate' not found"
    fi
}

# Check node health
check_node_health() {
    echo "Checking node health..."
    
    TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)
    READY_NODES=$(kubectl get nodes --no-headers | grep " Ready" | wc -l)
    
    if [ "$READY_NODES" -eq "$TOTAL_NODES" ]; then
        log_pass "All nodes ready ($READY_NODES/$TOTAL_NODES)"
    else
        log_warn "Some nodes not ready ($READY_NODES/$TOTAL_NODES)"
    fi
}

# Test GPU pod scheduling
test_gpu_pod_scheduling() {
    echo "Testing GPU pod scheduling..."
    
    cat <<EOF | kubectl apply -f - &> /dev/null
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test-pod
  namespace: default
spec:
  restartPolicy: Never
  containers:
  - name: cuda-test
    image: nvidia/cuda:11.8.0-base-ubuntu22.04
    command: ["nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1
  nodeSelector:
    gpu-type: nvidia-t4
  tolerations:
  - key: nvidia.com/gpu
    operator: Exists
    effect: NoSchedule
EOF

    sleep 5
    
    POD_STATUS=$(kubectl get pod gpu-test-pod -n default -o jsonpath='{.status.phase}' 2>/dev/null || echo "NotFound")
    
    if [ "$POD_STATUS" = "Succeeded" ] || [ "$POD_STATUS" = "Running" ]; then
        log_pass "GPU pod scheduling successful"
        kubectl logs gpu-test-pod -n default 2>/dev/null | grep "NVIDIA-SMI" &> /dev/null && log_pass "nvidia-smi executed successfully"
    elif [ "$POD_STATUS" = "Pending" ]; then
        log_warn "GPU pod is pending (may need more time)"
    else
        log_fail "GPU pod scheduling failed (status: $POD_STATUS)"
    fi
    
    # Cleanup
    kubectl delete pod gpu-test-pod -n default &> /dev/null || true
}

# Display cluster info
display_cluster_info() {
    echo ""
    echo "========================================="
    echo "Cluster Information"
    echo "========================================="
    
    echo "Nodes:"
    kubectl get nodes -o wide
    
    echo ""
    echo "GPU Allocation:"
    kubectl get nodes "-o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu,INSTANCE:.metadata.labels.node\.kubernetes\.io/instance-type"
    
    echo ""
    echo "System Pods:"
    kubectl get pods -n kube-system -l name=nvidia-device-plugin-ds
    
    echo "========================================="
}

# Display summary
display_summary() {
    echo ""
    echo "========================================="
    echo "Validation Summary"
    echo "========================================="
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo "========================================="
    
    if [ "$FAILED" -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed!${NC}"
        echo "Cluster is ready for OCR service deployment"
        return 0
    else
        echo -e "${RED}✗ Some checks failed${NC}"
        echo "Please review the errors above"
        return 1
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "GPU Cluster Validation"
    echo "========================================="
    echo ""
    
    check_cluster_connectivity || exit 1
    check_gpu_nodes
    check_gpu_allocation
    check_nvidia_plugin
    check_cluster_autoscaler
    check_metrics_server
    check_namespace
    check_node_health
    test_gpu_pod_scheduling
    
    display_cluster_info
    display_summary
}

main
