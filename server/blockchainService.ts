/**
 * Hyperledger Fabric Blockchain Service
 * Provides integration with property registry chaincode
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const FABRIC_NETWORK_PATH = process.env.FABRIC_NETWORK_PATH || '/opt/hyperledger/fabric-network';
const CHANNEL_NAME = process.env.FABRIC_CHANNEL || 'propertychannel';
const CHAINCODE_NAME = process.env.FABRIC_CHAINCODE || 'propertyregistry';
const ORG_NAME = process.env.FABRIC_ORG || 'Org1';

export interface BlockchainProperty {
  propertyId: string;
  address: string;
  owner: string;
  previousOwner?: string;
  price: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  propertyType: string;
  status: string;
  titleHash: string;
  createdAt: string;
  updatedAt: string;
  transferCount: number;
}

export interface BlockchainTransaction {
  transactionId: string;
  propertyId: string;
  fromOwner: string;
  toOwner: string;
  price: number;
  timestamp: string;
  txType: string;
  escrowAddress?: string;
  status: string;
}

/**
 * Execute Fabric peer command
 */
async function executeFabricCommand(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: FABRIC_NETWORK_PATH,
      env: {
        ...process.env,
        CORE_PEER_LOCALMSPID: `${ORG_NAME}MSP`,
        CORE_PEER_MSPCONFIGPATH: `${FABRIC_NETWORK_PATH}/organizations/peerOrganizations/${ORG_NAME.toLowerCase()}.example.com/users/Admin@${ORG_NAME.toLowerCase()}.example.com/msp`,
      },
    });

    if (stderr && !stderr.includes('INFO')) {
      console.warn('Fabric command warning:', stderr);
    }

    return stdout.trim();
  } catch (error: any) {
    console.error('Fabric command error:', error);
    throw new Error(`Blockchain operation failed: ${error.message}`);
  }
}

/**
 * Register a new property on the blockchain
 */
export async function registerProperty(property: {
  propertyId: string;
  address: string;
  owner: string;
  price: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  propertyType: string;
  titleHash: string;
}): Promise<string> {
  const command = `peer chaincode invoke \\
    -o localhost:7050 \\
    --ordererTLSHostnameOverride orderer.example.com \\
    --tls \\
    --cafile ${FABRIC_NETWORK_PATH}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \\
    -C ${CHANNEL_NAME} \\
    -n ${CHAINCODE_NAME} \\
    --peerAddresses localhost:7051 \\
    --tlsRootCertFiles ${FABRIC_NETWORK_PATH}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \\
    -c '{"function":"RegisterProperty","Args":["${property.propertyId}","${property.address}","${property.owner}","${property.price}","${property.squareFeet}","${property.bedrooms}","${property.bathrooms}","${property.yearBuilt}","${property.propertyType}","${property.titleHash}"]}'`;

  const result = await executeFabricCommand(command);
  return result;
}

/**
 * Read property from blockchain
 */
export async function readProperty(propertyId: string): Promise<BlockchainProperty | null> {
  try {
    const command = `peer chaincode query \\
      -C ${CHANNEL_NAME} \\
      -n ${CHAINCODE_NAME} \\
      -c '{"function":"ReadProperty","Args":["${propertyId}"]}'`;

    const result = await executeFabricCommand(command);
    return JSON.parse(result);
  } catch (error) {
    console.error('Failed to read property from blockchain:', error);
    return null;
  }
}

/**
 * Transfer property ownership
 */
export async function transferProperty(
  propertyId: string,
  newOwner: string,
  price: number,
  escrowAddress: string
): Promise<string> {
  const command = `peer chaincode invoke \\
    -o localhost:7050 \\
    --ordererTLSHostnameOverride orderer.example.com \\
    --tls \\
    --cafile ${FABRIC_NETWORK_PATH}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \\
    -C ${CHANNEL_NAME} \\
    -n ${CHAINCODE_NAME} \\
    --peerAddresses localhost:7051 \\
    --tlsRootCertFiles ${FABRIC_NETWORK_PATH}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \\
    -c '{"function":"TransferProperty","Args":["${propertyId}","${newOwner}","${price}","${escrowAddress}"]}'`;

  const result = await executeFabricCommand(command);
  return result;
}

/**
 * Update property status
 */
export async function updatePropertyStatus(propertyId: string, status: string): Promise<string> {
  const command = `peer chaincode invoke \\
    -o localhost:7050 \\
    --ordererTLSHostnameOverride orderer.example.com \\
    --tls \\
    --cafile ${FABRIC_NETWORK_PATH}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \\
    -C ${CHANNEL_NAME} \\
    -n ${CHAINCODE_NAME} \\
    --peerAddresses localhost:7051 \\
    --tlsRootCertFiles ${FABRIC_NETWORK_PATH}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \\
    -c '{"function":"UpdatePropertyStatus","Args":["${propertyId}","${status}"]}'`;

  const result = await executeFabricCommand(command);
  return result;
}

/**
 * Get property transaction history
 */
export async function getPropertyHistory(propertyId: string): Promise<BlockchainTransaction[]> {
  try {
    const command = `peer chaincode query \\
      -C ${CHANNEL_NAME} \\
      -n ${CHAINCODE_NAME} \\
      -c '{"function":"GetPropertyHistory","Args":["${propertyId}"]}'`;

    const result = await executeFabricCommand(command);
    return JSON.parse(result);
  } catch (error) {
    console.error('Failed to get property history:', error);
    return [];
  }
}

/**
 * Get all properties from blockchain
 */
export async function getAllProperties(): Promise<BlockchainProperty[]> {
  try {
    const command = `peer chaincode query \\
      -C ${CHANNEL_NAME} \\
      -n ${CHAINCODE_NAME} \\
      -c '{"function":"GetAllProperties","Args":[]}'`;

    const result = await executeFabricCommand(command);
    return JSON.parse(result);
  } catch (error) {
    console.error('Failed to get all properties:', error);
    return [];
  }
}

/**
 * Check if blockchain service is available
 */
export async function isBlockchainAvailable(): Promise<boolean> {
  try {
    const command = 'peer version';
    await executeFabricCommand(command);
    return true;
  } catch (error) {
    return false;
  }
}
