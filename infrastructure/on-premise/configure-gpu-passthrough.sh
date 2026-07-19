#!/bin/bash
set -e

# GPU Passthrough Configuration Script
# Configures OpenStack Nova for GPU PCI passthrough

echo "=========================================="
echo "GPU Passthrough Configuration"
echo "=========================================="

# Step 1: Configure Nova for PCI passthrough
echo "[1/4] Configuring Nova for PCI passthrough..."
mkdir -p /etc/kolla/config/nova

# NVIDIA T4 GPU configuration
cat > /etc/kolla/config/nova/nova-compute.conf << EOF
[pci]
passthrough_whitelist = {"vendor_id": "10de", "product_id": "1eb8"}
alias = {"vendor_id":"10de", "product_id":"1eb8", "device_type":"type-PCI", "name":"t4"}

[filter_scheduler]
enabled_filters = RetryFilter, AvailabilityZoneFilter, ComputeFilter, ComputeCapabilitiesFilter, ImagePropertiesFilter, ServerGroupAntiAffinityFilter, ServerGroupAffinityFilter, PciPassthroughFilter
available_filters = nova.scheduler.filters.all_filters
EOF

# Step 2: Reconfigure Nova
echo "[2/4] Reconfiguring Nova..."
kolla-ansible -i /etc/kolla/multinode reconfigure -t nova

# Step 3: Create GPU flavor
echo "[3/4] Creating GPU flavor..."
source /etc/kolla/admin-openrc.sh

openstack flavor create --ram 32768 --disk 100 --vcpus 8 gpu.t4.medium
openstack flavor set gpu.t4.medium --property "pci_passthrough:alias"="t4:1"

openstack flavor create --ram 65536 --disk 200 --vcpus 16 gpu.t4.large
openstack flavor set gpu.t4.large --property "pci_passthrough:alias"="t4:2"

# Step 4: Verify configuration
echo "[4/4] Verifying GPU configuration..."
openstack flavor list | grep gpu
openstack hypervisor show gpu-worker-01 -c service_host -c state -c status

echo "=========================================="
echo "GPU passthrough configuration complete!"
echo "=========================================="
echo "Available GPU flavors:"
echo "  - gpu.t4.medium (1x T4, 8 vCPU, 32 GB RAM)"
echo "  - gpu.t4.large (2x T4, 16 vCPU, 64 GB RAM)"
echo ""
echo "Next step: Run ./deploy-kubernetes.sh"
echo "=========================================="

