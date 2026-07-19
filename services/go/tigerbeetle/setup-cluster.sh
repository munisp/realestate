#!/bin/bash

# TigerBeetle Cluster Setup Script
# This script initializes a 3-node TigerBeetle cluster for development/testing

set -e

CLUSTER_ID=0
REPLICA_COUNT=3
DATA_DIR="./tigerbeetle-data"

echo "Setting up TigerBeetle cluster..."

# Create data directory
mkdir -p "$DATA_DIR"

# Check if TigerBeetle is installed
if ! command -v tigerbeetle &> /dev/null; then
    echo "TigerBeetle not found. Installing..."
    
    # Detect OS
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    if [ "$ARCH" = "x86_64" ]; then
        ARCH="x86_64"
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        ARCH="aarch64"
    fi
    
    # Download TigerBeetle
    DOWNLOAD_URL="https://github.com/tigerbeetle/tigerbeetle/releases/latest/download/tigerbeetle-${OS}-${ARCH}.zip"
    echo "Downloading from: $DOWNLOAD_URL"
    
    curl -L "$DOWNLOAD_URL" -o tigerbeetle.zip
    unzip -o tigerbeetle.zip
    chmod +x tigerbeetle
    sudo mv tigerbeetle /usr/local/bin/
    rm tigerbeetle.zip
    
    echo "TigerBeetle installed successfully"
fi

# Format data files for each replica
echo "Formatting replica data files..."

for i in 0 1 2; do
    DATA_FILE="$DATA_DIR/cluster_${CLUSTER_ID}_replica_${i}.tigerbeetle"
    
    if [ -f "$DATA_FILE" ]; then
        echo "Data file already exists: $DATA_FILE"
        read -p "Do you want to recreate it? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            continue
        fi
        rm "$DATA_FILE"
    fi
    
    tigerbeetle format \
        --cluster=$CLUSTER_ID \
        --replica=$i \
        --replica-count=$REPLICA_COUNT \
        "$DATA_FILE"
    
    echo "Created: $DATA_FILE"
done

echo ""
echo "TigerBeetle cluster setup complete!"
echo ""
echo "To start the cluster, run these commands in separate terminals:"
echo ""
echo "  Terminal 1:"
echo "  tigerbeetle start --addresses=127.0.0.1:3000,127.0.0.1:3001,127.0.0.1:3002 $DATA_DIR/cluster_${CLUSTER_ID}_replica_0.tigerbeetle"
echo ""
echo "  Terminal 2:"
echo "  tigerbeetle start --addresses=127.0.0.1:3000,127.0.0.1:3001,127.0.0.1:3002 $DATA_DIR/cluster_${CLUSTER_ID}_replica_1.tigerbeetle"
echo ""
echo "  Terminal 3:"
echo "  tigerbeetle start --addresses=127.0.0.1:3000,127.0.0.1:3001,127.0.0.1:3002 $DATA_DIR/cluster_${CLUSTER_ID}_replica_2.tigerbeetle"
echo ""
echo "Or use Docker Compose:"
echo "  docker-compose -f docker-compose.tigerbeetle-cluster.yml up"
echo ""
echo "Then update your environment:"
echo "  export TIGERBEETLE_ADDRESSES=127.0.0.1:3000,127.0.0.1:3001,127.0.0.1:3002"
echo ""
