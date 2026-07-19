#!/bin/bash
set -euo pipefail

# GPU Cluster Cost Monitoring Script

# Cost per hour by instance type
declare -A HOURLY_COSTS
HOURLY_COSTS[g4dn.xlarge]=0.526
HOURLY_COSTS[g4dn.2xlarge]=0.752
HOURLY_COSTS[n1-standard-4]=0.35
HOURLY_COSTS[Standard_NC4as_T4_v3]=0.45

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# Get current cluster costs
get_cluster_costs() {
    log_info "Calculating cluster costs..."
    
    TOTAL_COST_PER_HOUR=0
    
    echo "Node Costs:"
    echo "========================================="
    
    kubectl get nodes -o json | jq -r '.items[] | "\(.metadata.labels."node.kubernetes.io/instance-type") \(.metadata.name)"' | while read -r INSTANCE_TYPE NODE_NAME; do
        COST=${HOURLY_COSTS[$INSTANCE_TYPE]:-0}
        COST_PER_DAY=$(echo "$COST * 24" | bc)
        COST_PER_MONTH=$(echo "$COST * 730" | bc)
        
        echo "Node: $NODE_NAME"
        echo "  Instance Type: $INSTANCE_TYPE"
        echo "  Cost: \$${COST}/hour (\$${COST_PER_DAY}/day, \$${COST_PER_MONTH}/month)"
        echo ""
        
        TOTAL_COST_PER_HOUR=$(echo "$TOTAL_COST_PER_HOUR + $COST" | bc)
    done
    
    TOTAL_COST_PER_DAY=$(echo "$TOTAL_COST_PER_HOUR * 24" | bc)
    TOTAL_COST_PER_MONTH=$(echo "$TOTAL_COST_PER_HOUR * 730" | bc)
    
    echo "========================================="
    echo "Total Cluster Cost:"
    echo "  Per Hour:  \$${TOTAL_COST_PER_HOUR}"
    echo "  Per Day:   \$${TOTAL_COST_PER_DAY}"
    echo "  Per Month: \$${TOTAL_COST_PER_MONTH}"
    echo "========================================="
}

# Get GPU utilization
get_gpu_utilization() {
    log_info "Checking GPU utilization..."
    
    # This requires DCGM exporter to be installed
    if kubectl get pods -n default -l app=dcgm-exporter &> /dev/null; then
        echo "GPU Utilization (requires DCGM exporter):"
        kubectl port-forward -n default svc/dcgm-exporter 9400:9400 &
        PF_PID=$!
        sleep 2
        
        curl -s http://localhost:9400/metrics | grep "DCGM_FI_DEV_GPU_UTIL" || echo "No utilization data available"
        
        kill $PF_PID 2>/dev/null || true
    else
        echo "DCGM exporter not installed. Install with:"
        echo "  kubectl apply -f https://raw.githubusercontent.com/NVIDIA/dcgm-exporter/main/deployment/dcgm-exporter.yaml"
    fi
}

# Cost optimization recommendations
cost_optimization_recommendations() {
    echo ""
    echo "Cost Optimization Recommendations:"
    echo "========================================="
    
    GPU_NODES=$(kubectl get nodes -l gpu-type=nvidia-t4 --no-headers | wc -l)
    
    if [ "$GPU_NODES" -gt 2 ]; then
        echo "• Consider using Spot/Preemptible instances for 70-90% savings"
    fi
    
    echo "• Enable cluster autoscaler to scale down during low usage"
    echo "• Monitor GPU utilization and right-size node pools"
    echo "• Use node auto-provisioning for dynamic workloads"
    echo "• Set up budget alerts in cloud provider console"
    echo "========================================="
}

# Main
main() {
    get_cluster_costs
    get_gpu_utilization
    cost_optimization_recommendations
}

main
