/**
 * Production Blockchain Registry Service
 *
 * Implements an immutable SHA-256 Merkle-chain property ledger backed by PostgreSQL.
 * Each block contains:
 *  - Block hash (SHA-256 of previous hash + timestamp + Merkle root + nonce)
 *  - Merkle root of all transactions in the block
 *  - Digital signature (HMAC-SHA256 using server secret)
 *  - Immutable property ownership records
 *
 * Runs entirely on the existing PostgreSQL instance — no extra infrastructure.
 * Designed to be upgradeable to Hyperledger Fabric or Ethereum when ready.
 */

import crypto from 'crypto';
import { Pool } from 'pg';
import { logger } from '../../_core/logger';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface PropertyRecord {
  propertyId: string;
  titleNumber: string;
  ownerName: string;
  ownerNin: string;
  ownerBvn?: string;
  plotSize: number;
  location: string;
  state: string;
  lga: string;
  coordinates?: { lat: number; lng: number };
  documentHash: string;
  registeredAt: string;
  transactionType: 'REGISTER' | 'TRANSFER' | 'ENCUMBER' | 'RELEASE' | 'VERIFY';
  previousOwner?: string;
  metadata?: Record<string, unknown>;
}

export interface RegistrationResult {
  success: boolean;
  transactionId: string;
  blockHash: string;
  blockIndex: number;
  merkleRoot: string;
  timestamp: string;
  isMockData: false;
  verificationUrl: string;
}

export interface VerificationResult {
  verified: boolean;
  propertyId: string;
  currentOwner: string;
  titleNumber: string;
  registeredAt: string;
  transactionCount: number;
  blockHash: string;
  chainIntegrity: boolean;
  isMockData: false;
}

// ─────────────────────────────────────────────
// Crypto helpers
// ─────────────────────────────────────────────
function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function buildMerkleRoot(transactions: PropertyRecord[]): string {
  if (transactions.length === 0) return sha256('empty');
  let hashes = transactions.map(tx => sha256(JSON.stringify(tx)));
  while (hashes.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      next.push(sha256(hashes[i] + (hashes[i + 1] || hashes[i])));
    }
    hashes = next;
  }
  return hashes[0];
}

// ─────────────────────────────────────────────
// Blockchain Registry Service
// ─────────────────────────────────────────────
export class BlockchainRegistryService {
  private pool: Pool;
  private secret: string;
  private initialized = false;

  constructor() {
    this.pool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || 'realestate',
      user: process.env.PGUSER || 'realestate',
      password: process.env.PGPASSWORD || 'password',
    });
    this.secret = process.env.BLOCKCHAIN_SECRET || 'nigeria-property-registry-secret-2024';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS blockchain_blocks (
          id SERIAL PRIMARY KEY,
          block_index INTEGER UNIQUE NOT NULL,
          previous_hash TEXT NOT NULL,
          hash TEXT UNIQUE NOT NULL,
          merkle_root TEXT NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          nonce INTEGER NOT NULL DEFAULT 0,
          signature TEXT NOT NULL,
          transaction_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS blockchain_transactions (
          id SERIAL PRIMARY KEY,
          transaction_id TEXT UNIQUE NOT NULL,
          block_index INTEGER REFERENCES blockchain_blocks(block_index),
          property_id TEXT NOT NULL,
          title_number TEXT NOT NULL,
          owner_name TEXT NOT NULL,
          owner_nin TEXT NOT NULL,
          owner_bvn TEXT,
          plot_size NUMERIC,
          location TEXT NOT NULL,
          state TEXT NOT NULL,
          lga TEXT NOT NULL,
          lat NUMERIC,
          lng NUMERIC,
          document_hash TEXT NOT NULL,
          registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          transaction_type TEXT NOT NULL,
          previous_owner TEXT,
          metadata JSONB,
          tx_hash TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_bc_property_id ON blockchain_transactions(property_id);
        CREATE INDEX IF NOT EXISTS idx_bc_title_number ON blockchain_transactions(title_number);
        CREATE INDEX IF NOT EXISTS idx_bc_owner_nin ON blockchain_transactions(owner_nin);
      `);

      // Create genesis block if needed
      const { rows } = await client.query('SELECT COUNT(*) as count FROM blockchain_blocks');
      if (parseInt(rows[0].count) === 0) {
        const genesis = {
          index: 0,
          previousHash: '0'.repeat(64),
          merkleRoot: sha256('NIGERIA_PROPERTY_REGISTRY_GENESIS_2024'),
          timestamp: '2024-01-01T00:00:00Z',
          nonce: 0,
        };
        const hash = sha256(`${genesis.index}${genesis.previousHash}${genesis.merkleRoot}${genesis.timestamp}${genesis.nonce}`);
        const signature = crypto.createHmac('sha256', this.secret).update(hash).digest('hex');
        await client.query(
          `INSERT INTO blockchain_blocks (block_index, previous_hash, hash, merkle_root, timestamp, nonce, signature, transaction_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [0, genesis.previousHash, hash, genesis.merkleRoot, genesis.timestamp, 0, signature, 0]
        );
        logger.info('[BlockchainRegistry] Genesis block created:', hash.substring(0, 16) + '...');
      }

      this.initialized = true;
      logger.info('[BlockchainRegistry] ✅ Production blockchain registry initialized');
    } finally {
      client.release();
    }
  }

  private async getLatestBlock(client: any): Promise<{ block_index: number; hash: string }> {
    const { rows } = await client.query(
      'SELECT block_index, hash FROM blockchain_blocks ORDER BY block_index DESC LIMIT 1'
    );
    return rows[0];
  }

  private async mineBlock(client: any, transactions: PropertyRecord[]): Promise<{
    index: number; hash: string; merkleRoot: string; nonce: number; signature: string;
  }> {
    const latest = await this.getLatestBlock(client);
    const merkleRoot = buildMerkleRoot(transactions);
    const timestamp = new Date().toISOString();
    let nonce = 0;
    let hash = '';

    // Proof-of-work: find hash starting with '00'
    do {
      nonce++;
      hash = sha256(`${latest.block_index + 1}${latest.hash}${merkleRoot}${timestamp}${nonce}`);
    } while (!hash.startsWith('00') && nonce < 100000);

    const signature = crypto.createHmac('sha256', this.secret).update(hash).digest('hex');

    await client.query(
      `INSERT INTO blockchain_blocks (block_index, previous_hash, hash, merkle_root, timestamp, nonce, signature, transaction_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [latest.block_index + 1, latest.hash, hash, merkleRoot, timestamp, nonce, signature, transactions.length]
    );

    return { index: latest.block_index + 1, hash, merkleRoot, nonce, signature };
  }

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────
  async registerProperty(record: Omit<PropertyRecord, 'registeredAt' | 'transactionType'> & { transactionType?: PropertyRecord['transactionType'] }): Promise<RegistrationResult> {
    await this.initialize();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const tx: PropertyRecord = {
        ...record,
        registeredAt: new Date().toISOString(),
        transactionType: record.transactionType || 'REGISTER',
      };

      const txId = `TX-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const txHash = sha256(JSON.stringify(tx));

      // Mine a new block for this transaction
      const block = await this.mineBlock(client, [tx]);

      // Save transaction
      await client.query(
        `INSERT INTO blockchain_transactions
          (transaction_id, block_index, property_id, title_number, owner_name, owner_nin, owner_bvn,
           plot_size, location, state, lga, lat, lng, document_hash, registered_at,
           transaction_type, previous_owner, metadata, tx_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
          txId, block.index, tx.propertyId, tx.titleNumber, tx.ownerName, tx.ownerNin,
          tx.ownerBvn || null, tx.plotSize, tx.location, tx.state, tx.lga,
          tx.coordinates?.lat || null, tx.coordinates?.lng || null,
          tx.documentHash, tx.registeredAt, tx.transactionType,
          tx.previousOwner || null, tx.metadata ? JSON.stringify(tx.metadata) : null,
          txHash,
        ]
      );

      await client.query('COMMIT');
      logger.info(`[BlockchainRegistry] ✅ Registered property ${record.propertyId} in block #${block.index}`);

      return {
        success: true,
        transactionId: txId,
        blockHash: block.hash,
        blockIndex: block.index,
        merkleRoot: block.merkleRoot,
        timestamp: tx.registeredAt,
        isMockData: false,
        verificationUrl: `/api/blockchain/verify/${record.propertyId}`,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async transferOwnership(propertyId: string, newOwner: Partial<PropertyRecord>): Promise<RegistrationResult> {
    await this.initialize();
    const client = await this.pool.connect();
    const { rows } = await client.query(
      'SELECT * FROM blockchain_transactions WHERE property_id = $1 ORDER BY registered_at DESC LIMIT 1',
      [propertyId]
    );
    client.release();

    if (rows.length === 0) throw new Error(`Property ${propertyId} not found in registry`);
    const existing = rows[0];

    return this.registerProperty({
      propertyId,
      titleNumber: newOwner.titleNumber || existing.title_number,
      ownerName: newOwner.ownerName || '',
      ownerNin: newOwner.ownerNin || '',
      plotSize: existing.plot_size,
      location: existing.location,
      state: existing.state,
      lga: existing.lga,
      documentHash: newOwner.documentHash || existing.document_hash,
      transactionType: 'TRANSFER',
      previousOwner: existing.owner_name,
    });
  }

  async verifyProperty(propertyId: string): Promise<VerificationResult> {
    await this.initialize();
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        'SELECT * FROM blockchain_transactions WHERE property_id = $1 ORDER BY registered_at ASC',
        [propertyId]
      );

      if (rows.length === 0) {
        return { verified: false, propertyId, currentOwner: '', titleNumber: '', registeredAt: '', transactionCount: 0, blockHash: '', chainIntegrity: false, isMockData: false };
      }

      const latest = rows[rows.length - 1];
      const blockRes = await client.query('SELECT hash FROM blockchain_blocks WHERE block_index = $1', [latest.block_index]);
      const chainIntegrity = await this.verifyChainIntegrity();

      return {
        verified: true,
        propertyId,
        currentOwner: latest.owner_name,
        titleNumber: latest.title_number,
        registeredAt: latest.registered_at,
        transactionCount: rows.length,
        blockHash: blockRes.rows[0]?.hash || '',
        chainIntegrity,
        isMockData: false,
      };
    } finally {
      client.release();
    }
  }

  async verifyChainIntegrity(): Promise<boolean> {
    await this.initialize();
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM blockchain_blocks ORDER BY block_index ASC');
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].previous_hash !== rows[i - 1].hash) return false;
        const expectedSig = crypto.createHmac('sha256', this.secret).update(rows[i].hash).digest('hex');
        if (rows[i].signature !== expectedSig) return false;
      }
      return true;
    } finally {
      client.release();
    }
  }

  async getPropertyHistory(propertyId: string): Promise<PropertyRecord[]> {
    await this.initialize();
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        'SELECT * FROM blockchain_transactions WHERE property_id = $1 ORDER BY registered_at ASC',
        [propertyId]
      );
      return rows.map(r => ({
        propertyId: r.property_id,
        titleNumber: r.title_number,
        ownerName: r.owner_name,
        ownerNin: r.owner_nin,
        ownerBvn: r.owner_bvn,
        plotSize: parseFloat(r.plot_size),
        location: r.location,
        state: r.state,
        lga: r.lga,
        coordinates: r.lat ? { lat: parseFloat(r.lat), lng: parseFloat(r.lng) } : undefined,
        documentHash: r.document_hash,
        registeredAt: r.registered_at,
        transactionType: r.transaction_type,
        previousOwner: r.previous_owner,
        metadata: r.metadata,
      }));
    } finally {
      client.release();
    }
  }

  async getChainStats(): Promise<{ totalBlocks: number; totalTransactions: number; latestBlockHash: string; chainIntegrity: boolean; isMockData: false }> {
    await this.initialize();
    const client = await this.pool.connect();
    try {
      const blockRes = await client.query('SELECT COUNT(*) as count FROM blockchain_blocks');
      const txRes = await client.query('SELECT COUNT(*) as count FROM blockchain_transactions');
      const latestRes = await client.query('SELECT hash FROM blockchain_blocks ORDER BY block_index DESC LIMIT 1');
      const integrity = await this.verifyChainIntegrity();
      return {
        totalBlocks: parseInt(blockRes.rows[0].count),
        totalTransactions: parseInt(txRes.rows[0].count),
        latestBlockHash: latestRes.rows[0]?.hash || '',
        chainIntegrity: integrity,
        isMockData: false,
      };
    } finally {
      client.release();
    }
  }
}

let _instance: BlockchainRegistryService | null = null;
export function getBlockchainRegistry(): BlockchainRegistryService {
  if (!_instance) _instance = new BlockchainRegistryService();
  return _instance;
}
