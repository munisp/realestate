import { describe, it, expect } from 'vitest';
import { appRouter } from '../../server/routers';

/**
 * Integration tests for blockchain registry functionality
 * Tests property verification and blockchain integration
 */

describe('Blockchain Registry Integration', () => {
  it('should check blockchain service availability', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.blockchainRegistry.isAvailable();
    
    expect(result).toBeDefined();
    expect(typeof result.available).toBe('boolean');
    expect(result.message).toBeDefined();
  });

  it('should get all blockchain properties', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.blockchainRegistry.getAllProperties();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should get property from blockchain by ID', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    // Get all properties first
    const properties = await caller.blockchainRegistry.getAllProperties();
    
    if (properties.length > 0) {
      const propertyId = properties[0].propertyId;
      
      const result = await caller.blockchainRegistry.getProperty({ propertyId });
      
      expect(result).toBeDefined();
      expect(result.propertyId).toBe(propertyId);
      expect(result.owner).toBeDefined();
      expect(result.registeredAt).toBeDefined();
    }
  });

  it('should get transaction history for property', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const properties = await caller.blockchainRegistry.getAllProperties();
    
    if (properties.length > 0) {
      const propertyId = properties[0].propertyId;
      
      const result = await caller.blockchainRegistry.getHistory({ propertyId });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Each transaction should have required fields
      result.forEach((tx: any) => {
        expect(tx.transactionId).toBeDefined();
        expect(tx.timestamp).toBeDefined();
        expect(tx.action).toBeDefined();
      });
    }
  });

  it('should verify property title', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const properties = await caller.blockchainRegistry.getAllProperties();
    
    if (properties.length > 0) {
      const propertyId = properties[0].propertyId;
      
      const result = await caller.blockchainRegistry.verifyTitle({ propertyId });
      
      expect(result).toBeDefined();
      expect(typeof result.verified).toBe('boolean');
      expect(result.owner).toBeDefined();
      
      if (result.verified) {
        expect(result.registeredAt).toBeDefined();
        expect(result.transactionCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should handle non-existent property gracefully', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.blockchainRegistry.getProperty({ propertyId: 'non-existent-id' })
    ).rejects.toThrow();
  });
});
