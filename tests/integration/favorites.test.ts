import { describe, it, expect } from 'vitest';
import { appRouter } from '../../server/routers';

/**
 * Integration tests for favorites functionality
 * Tests adding, removing, and listing favorite properties
 */

describe('Favorites Integration', () => {
  const mockUser = {
    id: 1,
    openId: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  it('should add property to favorites', async () => {
    const caller = appRouter.createCaller({
      user: mockUser,
      req: {} as any,
      res: {} as any,
    });

    // First get a property to favorite
    const properties = await caller.properties.search({
      query: '',
      limit: 1,
    });

    if (properties.length > 0) {
      const propertyId = properties[0].id;
      
      const result = await caller.favorites.add({ propertyId });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    }
  });

  it('should list user favorites', async () => {
    const caller = appRouter.createCaller({
      user: mockUser,
      req: {} as any,
      res: {} as any,
    });

    const favorites = await caller.favorites.list();
    
    expect(favorites).toBeDefined();
    expect(Array.isArray(favorites)).toBe(true);
  });

  it('should remove property from favorites', async () => {
    const caller = appRouter.createCaller({
      user: mockUser,
      req: {} as any,
      res: {} as any,
    });

    // First get favorites
    const favorites = await caller.favorites.list();
    
    if (favorites.length > 0) {
      const propertyId = favorites[0].propertyId;
      
      const result = await caller.favorites.remove({ propertyId });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    }
  });

  it('should check if property is favorited', async () => {
    const caller = appRouter.createCaller({
      user: mockUser,
      req: {} as any,
      res: {} as any,
    });

    const properties = await caller.properties.search({
      query: '',
      limit: 1,
    });

    if (properties.length > 0) {
      const propertyId = properties[0].id;
      
      const result = await caller.favorites.isFavorited({ propertyId });
      
      expect(result).toBeDefined();
      expect(typeof result.isFavorited).toBe('boolean');
    }
  });

  it('should require authentication for favorites', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.favorites.list()
    ).rejects.toThrow();
  });
});
