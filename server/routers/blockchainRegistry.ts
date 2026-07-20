/**
 * Blockchain Registry Router
 * Uses the production SHA-256 Merkle-chain registry backed by PostgreSQL.
 * All isMockData flags are false — this is a live implementation.
 */
import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { getBlockchainRegistry } from '../services/blockchain/BlockchainRegistryService';
import crypto from 'crypto';
import { logger } from '../_core/logger';

export const blockchainRegistryRouter = router({
  /**
   * Check if blockchain service is available
   */
  isAvailable: publicProcedure.query(async () => {
    try {
      const registry = getBlockchainRegistry();
      await registry.initialize();
      const stats = await registry.getChainStats();
      return {
        available: true,
        message: `Production blockchain registry active — ${stats.totalBlocks} blocks, ${stats.totalTransactions} transactions`,
        stats,
        isMockData: false,
      };
    } catch (err) {
      logger.error('[BlockchainRegistry] Health check failed:', err);
      return { available: false, message: 'Registry initializing...', isMockData: false };
    }
  }),

  /**
   * Get property from blockchain
   */
  getProperty: publicProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ input }) => {
      const registry = getBlockchainRegistry();
      await registry.initialize();
      const result = await registry.verifyProperty(input.propertyId);
      if (!result.verified) {
        return {
          propertyId: input.propertyId,
          verified: false,
          message: 'Property not yet registered on blockchain',
          isMockData: false,
        };
      }
      return { ...result, isMockData: false };
    }),

  /**
   * Get property transaction history
   */
  getHistory: publicProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ input }) => {
      const registry = getBlockchainRegistry();
      await registry.initialize();
      const history = await registry.getPropertyHistory(input.propertyId);
      return {
        transactions: history.map((tx, i) => ({
          transactionId: `TX-${i}-${tx.propertyId}`,
          propertyId: tx.propertyId,
          fromOwner: tx.previousOwner || 'Original Owner',
          toOwner: tx.ownerName,
          titleNumber: tx.titleNumber,
          documentHash: tx.documentHash,
          timestamp: tx.registeredAt,
          txType: tx.transactionType,
          status: 'Confirmed',
          isMockData: false,
        })),
        isMockData: false,
      };
    }),

  /**
   * Get all registered properties
   */
  getAllProperties: publicProcedure.query(async () => {
    const registry = getBlockchainRegistry();
    await registry.initialize();
    const stats = await registry.getChainStats();
    return {
      totalRegistered: stats.totalTransactions,
      stats,
      isMockData: false,
    };
  }),

  /**
   * Register a property on the blockchain
   */
  registerProperty: protectedProcedure
    .input(z.object({
      propertyId: z.string(),
      titleNumber: z.string(),
      ownerName: z.string(),
      ownerNin: z.string(),
      ownerBvn: z.string().optional(),
      plotSize: z.number().default(0),
      location: z.string(),
      state: z.string(),
      lga: z.string().default('Unknown'),
      coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
      documentBase64: z.string().optional(),
      // Legacy fields for backward compatibility
      address: z.string().optional(),
      owner: z.string().optional(),
      price: z.number().optional(),
      squareFeet: z.number().optional(),
      bedrooms: z.number().optional(),
      bathrooms: z.number().optional(),
      yearBuilt: z.number().optional(),
      propertyType: z.string().optional(),
      titleHash: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const registry = getBlockchainRegistry();
      await registry.initialize();

      const documentHash = input.documentBase64
        ? crypto.createHash('sha256').update(input.documentBase64).digest('hex')
        : input.titleHash || crypto.createHash('sha256').update(`${input.propertyId}-${input.titleNumber || input.address}-${input.ownerNin || input.owner}`).digest('hex');

      const result = await registry.registerProperty({
        propertyId: input.propertyId,
        titleNumber: input.titleNumber || input.address || input.propertyId,
        ownerName: input.ownerName || input.owner || '',
        ownerNin: input.ownerNin || '',
        ownerBvn: input.ownerBvn,
        plotSize: input.plotSize || input.squareFeet || 0,
        location: input.location || input.address || '',
        state: input.state || 'Lagos',
        lga: input.lga || 'Unknown',
        coordinates: input.coordinates,
        documentHash,
        transactionType: 'REGISTER',
        metadata: {
          price: input.price,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          yearBuilt: input.yearBuilt,
          propertyType: input.propertyType,
        },
      });

      return {
        success: result.success,
        transactionId: result.transactionId,
        blockHash: result.blockHash,
        blockIndex: result.blockIndex,
        merkleRoot: result.merkleRoot,
        message: 'Property registered on blockchain',
        isMockData: false,
      };
    }),

  /**
   * Transfer property ownership
   */
  transferProperty: protectedProcedure
    .input(z.object({
      propertyId: z.string(),
      newOwner: z.string(),
      newOwnerNin: z.string().optional(),
      price: z.number().optional(),
      escrowAddress: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const registry = getBlockchainRegistry();
      await registry.initialize();
      const result = await registry.transferOwnership(input.propertyId, {
        ownerName: input.newOwner,
        ownerNin: input.newOwnerNin || '',
        metadata: { price: input.price, escrowAddress: input.escrowAddress },
      });
      return {
        success: result.success,
        transactionId: result.transactionId,
        blockHash: result.blockHash,
        message: 'Property ownership transferred',
        isMockData: false,
      };
    }),

  /**
   * Verify property title
   */
  verifyTitle: publicProcedure
    .input(z.object({
      propertyId: z.string(),
      titleHash: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const registry = getBlockchainRegistry();
      await registry.initialize();
      const result = await registry.verifyProperty(input.propertyId);
      return {
        verified: result.verified,
        chainIntegrity: result.chainIntegrity,
        currentOwner: result.currentOwner,
        blockHash: result.blockHash,
        message: result.verified ? 'Property verified on blockchain' : 'Property not found on blockchain',
        isMockData: false,
      };
    }),

  /**
   * Get blockchain chain statistics
   */
  getChainStats: publicProcedure.query(async () => {
    const registry = getBlockchainRegistry();
    await registry.initialize();
    return registry.getChainStats();
  }),

  /**
   * Verify chain integrity
   */
  verifyChain: publicProcedure.query(async () => {
    const registry = getBlockchainRegistry();
    await registry.initialize();
    const integrity = await registry.verifyChainIntegrity();
    return { chainIntegrity: integrity, isMockData: false };
  }),
});
