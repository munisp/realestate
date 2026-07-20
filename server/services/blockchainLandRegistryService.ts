import crypto from "crypto";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { logger } from "../_core/logger";
import {
  landRecords,
  certificateOfOccupancy,
  landOwnershipHistory,
  type LandRecord,
  type CertificateOfOccupancy,
  type LandOwnershipHistory,
} from "../../drizzle/schema";

/**
 * Blockchain Land Registry Service
 * Integrates with Hyperledger Fabric for immutable land record storage
 * 
 * This service provides a bridge between the PostgreSQL database and
 * Hyperledger Fabric blockchain for land registry operations.
 */

export interface BlockchainLandRecord {
  parcelId: string;
  currentOwner: string;
  landSize: number;
  location: {
    address: string;
    city: string;
    state: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  cofONumber?: string;
  cofOStatus?: string;
  registeredAt: string;
  lastUpdated: string;
  transactionHash: string;
}

export interface BlockchainTransaction {
  transactionId: string;
  timestamp: string;
  blockNumber: number;
  transactionHash: string;
  status: "pending" | "confirmed" | "failed";
}

export interface OwnershipTransferRecord {
  parcelId: string;
  previousOwner: string;
  newOwner: string;
  transferDate: string;
  transferType: string;
  salePrice?: number;
  transactionHash: string;
}

/**
 * Mock Hyperledger Fabric Client
 * In production, this would use the actual Fabric SDK
 */
class HyperledgerFabricClient {
  private networkName: string;
  private channelName: string;
  private chaincodeName: string;

  constructor() {
    this.networkName = "land-registry-network";
    this.channelName = "land-records-channel";
    this.chaincodeName = "land-registry-chaincode";
  }

  /**
   * Generate a mock transaction hash
   */
  private generateTransactionHash(data: any): string {
    const dataString = JSON.stringify(data);
    return crypto.createHash("sha256").update(dataString).digest("hex");
  }

  /**
   * Generate a mock transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Simulate blockchain transaction delay
   */
  private async simulateBlockchainDelay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
  }

  /**
   * Register land record on blockchain
   */
  async registerLandRecord(
    landRecord: LandRecord,
    cofO?: CertificateOfOccupancy
  ): Promise<BlockchainTransaction> {
    await this.simulateBlockchainDelay();

    const blockchainData: BlockchainLandRecord = {
      parcelId: landRecord.parcelId,
      currentOwner: landRecord.currentOwnerId?.toString() || "unknown",
      landSize: parseFloat(landRecord.landSize?.toString() || "0"),
      location: {
        address: landRecord.address,
        city: landRecord.city,
        state: landRecord.state,
        coordinates: landRecord.latitude && landRecord.longitude
          ? {
              latitude: parseFloat(landRecord.latitude.toString()),
              longitude: parseFloat(landRecord.longitude.toString()),
            }
          : undefined,
      },
      cofONumber: cofO?.cofONumber,
      cofOStatus: cofO?.status,
      registeredAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      transactionHash: "",
    };

    const transactionHash = this.generateTransactionHash(blockchainData);
    blockchainData.transactionHash = transactionHash;

    const transaction: BlockchainTransaction = {
      transactionId: this.generateTransactionId(),
      timestamp: new Date().toISOString(),
      blockNumber: Math.floor(Math.random() * 1000000) + 1,
      transactionHash,
      status: "confirmed",
    };

    logger.info(`[Blockchain] Land record registered: ${landRecord.parcelId}`);
    logger.info(`[Blockchain] Transaction: ${transaction.transactionId}`);

    return transaction;
  }

  /**
   * Record ownership transfer on blockchain
   */
  async recordOwnershipTransfer(
    transfer: LandOwnershipHistory
  ): Promise<BlockchainTransaction> {
    await this.simulateBlockchainDelay();

    const transferRecord: OwnershipTransferRecord = {
      parcelId: transfer.landRecordId.toString(),
      previousOwner: transfer.previousOwnerId?.toString() || transfer.previousOwnerName || "unknown",
      newOwner: transfer.newOwnerId?.toString() || transfer.newOwnerName,
      transferDate: transfer.transferDate.toISOString(),
      transferType: transfer.transferType,
      salePrice: transfer.salePrice ? parseFloat(transfer.salePrice.toString()) : undefined,
      transactionHash: "",
    };

    const transactionHash = this.generateTransactionHash(transferRecord);
    transferRecord.transactionHash = transactionHash;

    const transaction: BlockchainTransaction = {
      transactionId: this.generateTransactionId(),
      timestamp: new Date().toISOString(),
      blockNumber: Math.floor(Math.random() * 1000000) + 1,
      transactionHash,
      status: "confirmed",
    };

    logger.info(`[Blockchain] Ownership transfer recorded for parcel: ${transfer.landRecordId}`);
    logger.info(`[Blockchain] Transaction: ${transaction.transactionId}`);

    return transaction;
  }

  /**
   * Store C of O verification hash on blockchain
   */
  async storeCofOVerificationHash(
    cofO: CertificateOfOccupancy,
    verificationScore: number
  ): Promise<BlockchainTransaction> {
    await this.simulateBlockchainDelay();

    const verificationData = {
      cofONumber: cofO.cofONumber,
      documentHash: cofO.documentHash,
      verificationScore,
      verifiedAt: new Date().toISOString(),
      issuingAuthority: cofO.issuingAuthority,
      status: cofO.status,
    };

    const transactionHash = this.generateTransactionHash(verificationData);

    const transaction: BlockchainTransaction = {
      transactionId: this.generateTransactionId(),
      timestamp: new Date().toISOString(),
      blockNumber: Math.floor(Math.random() * 1000000) + 1,
      transactionHash,
      status: "confirmed",
    };

    logger.info(`[Blockchain] C of O verification stored: ${cofO.cofONumber}`);
    logger.info(`[Blockchain] Transaction: ${transaction.transactionId}`);

    return transaction;
  }

  /**
   * Query land record from blockchain
   */
  async queryLandRecord(parcelId: string): Promise<BlockchainLandRecord | null> {
    await this.simulateBlockchainDelay();

    // In production, this would query the actual blockchain
    // For now, return null to indicate not found
    logger.info(`[Blockchain] Querying land record: ${parcelId}`);
    return null;
  }

  /**
   * Get transaction history for a land record
   */
  async getTransactionHistory(parcelId: string): Promise<BlockchainTransaction[]> {
    await this.simulateBlockchainDelay();

    // Mock transaction history
    logger.info(`[Blockchain] Fetching transaction history: ${parcelId}`);
    return [];
  }

  /**
   * Verify blockchain transaction
   */
  async verifyTransaction(transactionHash: string): Promise<boolean> {
    await this.simulateBlockchainDelay();

    // In production, this would verify the transaction on the blockchain
    logger.info(`[Blockchain] Verifying transaction: ${transactionHash}`);
    return true;
  }
}

// Singleton instance
const fabricClient = new HyperledgerFabricClient();

/**
 * Register land record on blockchain and update database
 */
export async function registerLandOnBlockchain(
  landRecordId: number
): Promise<{
  success: boolean;
  transactionHash?: string;
  transactionId?: string;
  error?: string;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Fetch land record
    const [landRecord] = await db
      .select()
      .from(landRecords)
      .where(eq(landRecords.id, landRecordId))
      .limit(1);

    if (!landRecord) {
      return { success: false, error: "Land record not found" };
    }

    // Check if already on blockchain
    if (landRecord.isOnBlockchain) {
      return {
        success: true,
        transactionHash: landRecord.blockchainHash || undefined,
        transactionId: landRecord.blockchainTransactionId || undefined,
      };
    }

    // Fetch associated C of O if exists
    let cofO: CertificateOfOccupancy | undefined;
    const cofORecords = await db
      .select()
      .from(certificateOfOccupancy)
      .where(eq(certificateOfOccupancy.landRecordId, landRecordId))
      .limit(1);

    if (cofORecords.length > 0) {
      cofO = cofORecords[0];
    }

    // Register on blockchain
    const transaction = await fabricClient.registerLandRecord(landRecord, cofO);

    // Update database
    await db
      .update(landRecords)
      .set({
        blockchainHash: transaction.transactionHash,
        blockchainTransactionId: transaction.transactionId,
        isOnBlockchain: true,
        updatedAt: new Date(),
      })
      .where(eq(landRecords.id, landRecordId));

    return {
      success: true,
      transactionHash: transaction.transactionHash,
      transactionId: transaction.transactionId,
    };
  } catch (error) {
    logger.error("[Blockchain] Error registering land record:", { error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Record ownership transfer on blockchain
 */
export async function recordOwnershipTransferOnBlockchain(
  transferId: number
): Promise<{
  success: boolean;
  transactionHash?: string;
  transactionId?: string;
  error?: string;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Fetch transfer record
    const [transfer] = await db
      .select()
      .from(landOwnershipHistory)
      .where(eq(landOwnershipHistory.id, transferId))
      .limit(1);

    if (!transfer) {
      return { success: false, error: "Transfer record not found" };
    }

    // Check if already on blockchain
    if (transfer.isOnBlockchain) {
      return {
        success: true,
        transactionHash: transfer.blockchainTransactionHash || undefined,
      };
    }

    // Record on blockchain
    const transaction = await fabricClient.recordOwnershipTransfer(transfer);

    // Update database
    await db
      .update(landOwnershipHistory)
      .set({
        blockchainTransactionHash: transaction.transactionHash,
        isOnBlockchain: true,
        updatedAt: new Date(),
      })
      .where(eq(landOwnershipHistory.id, transferId));

    // Also update the land record's current owner
    await db
      .update(landRecords)
      .set({
        currentOwnerId: transfer.newOwnerId,
        updatedAt: new Date(),
      })
      .where(eq(landRecords.id, transfer.landRecordId));

    return {
      success: true,
      transactionHash: transaction.transactionHash,
      transactionId: transaction.transactionId,
    };
  } catch (error) {
    logger.error("[Blockchain] Error recording ownership transfer:", { error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Store C of O verification on blockchain
 */
export async function storeCofOVerificationOnBlockchain(
  cofOId: number,
  verificationScore: number
): Promise<{
  success: boolean;
  transactionHash?: string;
  transactionId?: string;
  error?: string;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Fetch C of O record
    const [cofO] = await db
      .select()
      .from(certificateOfOccupancy)
      .where(eq(certificateOfOccupancy.id, cofOId))
      .limit(1);

    if (!cofO) {
      return { success: false, error: "C of O record not found" };
    }

    // Check if already on blockchain
    if (cofO.isOnBlockchain) {
      return {
        success: true,
        transactionHash: cofO.blockchainHash || undefined,
      };
    }

    // Store on blockchain
    const transaction = await fabricClient.storeCofOVerificationHash(
      cofO,
      verificationScore
    );

    // Update database
    await db
      .update(certificateOfOccupancy)
      .set({
        blockchainHash: transaction.transactionHash,
        isOnBlockchain: true,
        updatedAt: new Date(),
      })
      .where(eq(certificateOfOccupancy.id, cofOId));

    return {
      success: true,
      transactionHash: transaction.transactionHash,
      transactionId: transaction.transactionId,
    };
  } catch (error) {
    logger.error("[Blockchain] Error storing C of O verification:", { error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Query land record from blockchain
 */
export async function queryBlockchainLandRecord(
  parcelId: string
): Promise<BlockchainLandRecord | null> {
  try {
    return await fabricClient.queryLandRecord(parcelId);
  } catch (error) {
    logger.error("[Blockchain] Error querying land record:", { error: String(error) });
    return null;
  }
}

/**
 * Get blockchain transaction history
 */
export async function getBlockchainTransactionHistory(
  parcelId: string
): Promise<BlockchainTransaction[]> {
  try {
    return await fabricClient.getTransactionHistory(parcelId);
  } catch (error) {
    logger.error("[Blockchain] Error fetching transaction history:", { error: String(error) });
    return [];
  }
}

/**
 * Verify blockchain transaction
 */
export async function verifyBlockchainTransaction(
  transactionHash: string
): Promise<boolean> {
  try {
    return await fabricClient.verifyTransaction(transactionHash);
  } catch (error) {
    logger.error("[Blockchain] Error verifying transaction:", { error: String(error) });
    return false;
  }
}

/**
 * Generate audit trail for land record
 */
export interface AuditTrailEntry {
  timestamp: string;
  action: string;
  actor: string;
  details: any;
  transactionHash?: string;
}

export async function generateAuditTrail(
  landRecordId: number
): Promise<AuditTrailEntry[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const auditTrail: AuditTrailEntry[] = [];

  // Get land record creation
  const [landRecord] = await db
    .select()
    .from(landRecords)
    .where(eq(landRecords.id, landRecordId))
    .limit(1);

  if (landRecord) {
    auditTrail.push({
      timestamp: landRecord.createdAt.toISOString(),
      action: "Land Record Created",
      actor: "System",
      details: {
        parcelId: landRecord.parcelId,
        address: landRecord.address,
      },
      transactionHash: landRecord.blockchainHash || undefined,
    });
  }

  // Get ownership transfers
  const transfers = await db
    .select()
    .from(landOwnershipHistory)
    .where(eq(landOwnershipHistory.landRecordId, landRecordId));

  for (const transfer of transfers) {
    auditTrail.push({
      timestamp: transfer.transferDate.toISOString(),
      action: `Ownership Transfer (${transfer.transferType})`,
      actor: transfer.newOwnerName,
      details: {
        previousOwner: transfer.previousOwnerName,
        newOwner: transfer.newOwnerName,
        salePrice: transfer.salePrice,
      },
      transactionHash: transfer.blockchainTransactionHash || undefined,
    });
  }

  // Sort by timestamp
  auditTrail.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return auditTrail;
}
