#!/bin/bash

# Hyperledger Fabric Network Deployment Script
# Initializes and deploys property registry blockchain network

set -e

echo "🔗 Deploying Hyperledger Fabric Network..."

# Configuration
FABRIC_VERSION="2.5.0"
CA_VERSION="1.5.5"
NETWORK_NAME="property-network"
CHANNEL_NAME="propertychannel"
CHAINCODE_NAME="propertyregistry"
FABRIC_DIR="/opt/hyperledger/fabric-network"

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

# Create directory structure
echo "📁 Creating directory structure..."
sudo mkdir -p $FABRIC_DIR
cd $FABRIC_DIR

# Download Fabric binaries and Docker images
echo "📥 Downloading Hyperledger Fabric binaries..."
curl -sSL https://bit.ly/2ysbOFE | bash -s -- $FABRIC_VERSION $CA_VERSION

# Add binaries to PATH
export PATH=$FABRIC_DIR/bin:$PATH

# Generate crypto material
echo "🔐 Generating cryptographic material..."
cryptogen generate --config=./crypto-config.yaml --output="organizations"

# Generate genesis block
echo "📦 Generating genesis block..."
configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block

# Generate channel configuration
echo "📝 Generating channel configuration..."
configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME

# Generate anchor peer updates
configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP

# Start network
echo "🚀 Starting Fabric network..."
docker-compose -f docker-compose-net.yaml up -d

# Wait for network to be ready
echo "⏳ Waiting for network to start..."
sleep 10

# Create channel
echo "📡 Creating channel..."
peer channel create -o localhost:7050 -c $CHANNEL_NAME --ordererTLSHostnameOverride orderer.example.com -f ./channel-artifacts/${CHANNEL_NAME}.tx --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block --tls --cafile $FABRIC_DIR/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Join peers to channel
echo "🔗 Joining peers to channel..."
peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block

# Package chaincode
echo "📦 Packaging chaincode..."
cd ../blockchain/hyperledger-fabric/chaincode
GO111MODULE=on go mod vendor
cd $FABRIC_DIR
peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz --path ../blockchain/hyperledger-fabric/chaincode --lang golang --label ${CHAINCODE_NAME}_1.0

# Install chaincode on peers
echo "⚙️  Installing chaincode..."
peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

# Get package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep ${CHAINCODE_NAME}_1.0 | awk '{print $3}' | sed 's/,$//')

# Approve chaincode
echo "✅ Approving chaincode..."
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version 1.0 --package-id $PACKAGE_ID --sequence 1 --tls --cafile $FABRIC_DIR/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Commit chaincode
echo "🎯 Committing chaincode..."
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version 1.0 --sequence 1 --tls --cafile $FABRIC_DIR/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --peerAddresses localhost:7051 --tlsRootCertFiles $FABRIC_DIR/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

# Initialize ledger
echo "📝 Initializing ledger..."
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $FABRIC_DIR/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C $CHANNEL_NAME -n $CHAINCODE_NAME --peerAddresses localhost:7051 --tlsRootCertFiles $FABRIC_DIR/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt -c '{"function":"InitLedger","Args":[]}'

echo "
🎉 Hyperledger Fabric network deployed successfully!

Network Details:
- Channel: $CHANNEL_NAME
- Chaincode: $CHAINCODE_NAME
- Orderer: localhost:7050
- Peer: localhost:7051

To test the network:
peer chaincode query -C $CHANNEL_NAME -n $CHAINCODE_NAME -c '{\"function\":\"GetAllProperties\",\"Args\":[]}'

To view network status:
docker ps

To stop network:
cd $FABRIC_DIR && docker-compose -f docker-compose-net.yaml down
"
