import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import * as blockchainService from '../blockchainService';

export const blockchainRegistryRouter = router({
  /**
   * Check if blockchain service is available
   */
  isAvailable: publicProcedure.query(async () => {
    const available = await blockchainService.isBlockchainAvailable();
    return {
      available,
      message: available
        ? 'Blockchain service is running'
        : 'Blockchain service is not available. Using fallback data.',
    };
  }),

  /**
   * Get property from blockchain
   */
  getProperty: publicProcedure
    .input(z.object({
      propertyId: z.string(),
    }))
    .query(async ({ input }) => {
      const property = await blockchainService.readProperty(input.propertyId);
      
      if (!property) {
        // Return mock data if blockchain is not available
        return {
          propertyId: input.propertyId,
          address: '123 Main St, Lagos, Nigeria',
          owner: 'John Doe',
          previousOwner: 'Jane Smith',
          price: 500000,
          squareFeet: 2500,
          bedrooms: 3,
          bathrooms: 2,
          yearBuilt: 2020,
          propertyType: 'Residential',
          status: 'Active',
          titleHash: '0x' + Math.random().toString(36).substring(2, 15),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          transferCount: 2,
          isMockData: true,
        };
      }

      return {
        ...property,
        isMockData: false,
      };
    }),

  /**
   * Get property transaction history
   */
  getHistory: publicProcedure
    .input(z.object({
      propertyId: z.string(),
    }))
    .query(async ({ input }) => {
      const history = await blockchainService.getPropertyHistory(input.propertyId);
      
      if (history.length === 0) {
        // Return mock data if blockchain is not available
        return {
          transactions: [
            {
              transactionId: 'tx_' + Math.random().toString(36).substring(2, 15),
              propertyId: input.propertyId,
              fromOwner: 'Jane Smith',
              toOwner: 'John Doe',
              price: 500000,
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              txType: 'Transfer',
              status: 'Completed',
            },
            {
              transactionId: 'tx_' + Math.random().toString(36).substring(2, 15),
              propertyId: input.propertyId,
              fromOwner: 'Builder Corp',
              toOwner: 'Jane Smith',
              price: 450000,
              timestamp: new Date(Date.now() - 86400000 * 365).toISOString(),
              txType: 'Transfer',
              status: 'Completed',
            },
          ],
          isMockData: true,
        };
      }

      return {
        transactions: history,
        isMockData: false,
      };
    }),

  /**
   * Get all properties from blockchain
   */
  getAllProperties: publicProcedure.query(async () => {
    const properties = await blockchainService.getAllProperties();
    
    if (properties.length === 0) {
      // Return mock data if blockchain is not available
      return {
        properties: [
          {
            propertyId: 'prop_001',
            address: '123 Main St, Lagos, Nigeria',
            owner: 'John Doe',
            price: 500000,
            squareFeet: 2500,
            bedrooms: 3,
            bathrooms: 2,
            yearBuilt: 2020,
            propertyType: 'Residential',
            status: 'Active',
            titleHash: '0x' + Math.random().toString(36).substring(2, 15),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            transferCount: 2,
          },
          {
            propertyId: 'prop_002',
            address: '456 Oak Ave, Abuja, Nigeria',
            owner: 'Jane Smith',
            price: 750000,
            squareFeet: 3200,
            bedrooms: 4,
            bathrooms: 3,
            yearBuilt: 2021,
            propertyType: 'Residential',
            status: 'Active',
            titleHash: '0x' + Math.random().toString(36).substring(2, 15),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            transferCount: 1,
          },
        ],
        isMockData: true,
      };
    }

    return {
      properties,
      isMockData: false,
    };
  }),

  /**
   * Register property on blockchain (protected)
   */
  registerProperty: protectedProcedure
    .input(z.object({
      propertyId: z.string(),
      address: z.string(),
      owner: z.string(),
      price: z.number(),
      squareFeet: z.number(),
      bedrooms: z.number(),
      bathrooms: z.number(),
      yearBuilt: z.number(),
      propertyType: z.string(),
      titleHash: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await blockchainService.registerProperty(input);
        return {
          success: true,
          transactionId: result,
          message: 'Property registered on blockchain',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to register property. Blockchain service may be unavailable.',
        };
      }
    }),

  /**
   * Transfer property ownership (protected)
   */
  transferProperty: protectedProcedure
    .input(z.object({
      propertyId: z.string(),
      newOwner: z.string(),
      price: z.number(),
      escrowAddress: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await blockchainService.transferProperty(
          input.propertyId,
          input.newOwner,
          input.price,
          input.escrowAddress
        );
        return {
          success: true,
          transactionId: result,
          message: 'Property ownership transferred',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to transfer property. Blockchain service may be unavailable.',
        };
      }
    }),

  /**
   * Verify property title
   */
  verifyTitle: publicProcedure
    .input(z.object({
      propertyId: z.string(),
      titleHash: z.string(),
    }))
    .query(async ({ input }) => {
      const property = await blockchainService.readProperty(input.propertyId);
      
      if (!property) {
        return {
          verified: false,
          message: 'Property not found on blockchain',
        };
      }

      const verified = property.titleHash === input.titleHash;

      return {
        verified,
        message: verified
          ? 'Title hash matches blockchain record'
          : 'Title hash does not match blockchain record',
        blockchainHash: property.titleHash,
        providedHash: input.titleHash,
      };
    }),
});
