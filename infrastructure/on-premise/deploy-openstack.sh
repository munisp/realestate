#!/bin/bash
set -e

# OpenStack Deployment Automation Script
# Automates deployment of OpenStack with Kolla-Ansible

echo "=========================================="
echo "OpenStack Deployment Automation"
echo "=========================================="

# Configuration
KOLLA_VERSION="zed"
INTERNAL_VIP="10.0.10.100"
NETWORK_INTERFACE="eno1"
EXTERNAL_INTERFACE="eno2"

# Step 1: Install dependencies
echo "[1/7] Installing dependencies..."
apt update
apt install -y python3-pip git chrony

pip3 install -U pip
pip3 install 'ansible>=4,<6'
pip3 install kolla-ansible

# Step 2: Create Kolla configuration
echo "[2/7] Creating Kolla configuration..."
mkdir -p /etc/kolla
cp -r /usr/local/share/kolla-ansible/etc_examples/kolla/* /etc/kolla/
cp /usr/local/share/kolla-ansible/ansible/inventory/multinode /etc/kolla/

# Step 3: Configure globals.yml
echo "[3/7] Configuring globals.yml..."
cat > /etc/kolla/globals.yml << EOF
---
kolla_base_distro: "ubuntu"
openstack_release: "${KOLLA_VERSION}"
kolla_internal_vip_address: "${INTERNAL_VIP}"
network_interface: "${NETWORK_INTERFACE}"
neutron_external_interface: "${EXTERNAL_INTERFACE}"
enable_haproxy: "yes"
enable_cinder: "yes"
enable_cinder_backend_lvm: "yes"
enable_swift: "yes"
enable_neutron_provider_networks: "yes"
nova_compute_virt_type: "kvm"
enable_nova_serialconsole: "yes"
enable_horizon: "yes"
enable_heat: "yes"
enable_octavia: "no"
EOF

# Step 4: Generate passwords
echo "[4/7] Generating passwords..."
kolla-genpwd

# Step 5: Bootstrap servers
echo "[5/7] Bootstrapping servers..."
kolla-ansible -i /etc/kolla/multinode bootstrap-servers

# Step 6: Run prechecks
echo "[6/7] Running prechecks..."
kolla-ansible -i /etc/kolla/multinode prechecks

# Step 7: Deploy OpenStack
echo "[7/7] Deploying OpenStack (this may take 30-60 minutes)..."
kolla-ansible -i /etc/kolla/multinode deploy

# Post-deployment
echo "Running post-deployment tasks..."
kolla-ansible -i /etc/kolla/multinode post-deploy

# Install OpenStack CLI
pip3 install python-openstackclient python-cinderclient python-neutronclient

echo "=========================================="
echo "OpenStack deployment complete!"
echo "=========================================="
echo "Horizon dashboard: http://${INTERNAL_VIP}"
echo "Admin credentials: /etc/kolla/admin-openrc.sh"
echo ""
echo "Next steps:"
echo "1. source /etc/kolla/admin-openrc.sh"
echo "2. Run ./configure-gpu-passthrough.sh"
echo "=========================================="

