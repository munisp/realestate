import { describe, it, expect } from 'vitest';
import { appRouter } from '../../server/routers';

/**
 * Integration tests for AI-powered recommendations
 * Tests personalized property recommendations
 */

describe('Recommendations Integration', () => {
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

  it('should generate personalized recommendations', async () => {
    const caller = appRouter.createCaller({
      user: mockUser,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.recommendations.getPersonalized({
      limit: 5,
    });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(5);
    
    // Each recommendation should have required fields
    result.forEach((rec: any) => {
      expect(rec.property).toBeDefined();
      expect(rec.matchScore).toBeGreaterThanOrEqual(0);
      expect(rec.matchScore).toBeLessThanOrEqual(100);
      expect(rec.reasoning).toBeDefined();
    });
  });

  it('should get similar properties', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    // First get a property
    const properties = await caller.properties.search({
      query: '',
      limit: 1,
    });

    if (properties.length > 0) {
      const propertyId = properties[0].id;
      
      const result = await caller.recommendations.getSimilar({
        propertyId,
        limit: 5,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
      
      // Similar properties should not include the original
      result.forEach((prop: any) => {
        expect(prop.id).not.toBe(propertyId);
      });
    }
  });

  it('should submit recommendation feedback', async () => {
    const caller = appRouter.createCaller({
      user: mockUser,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.recommendations.submitFeedback({
      propertyId: 1,
      feedback: 'positive',
      reason: 'good_match',
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should get user insights', async () => {
    const caller = appRouter.createCaller({
      user: mockUser,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.recommendations.getInsights();
    
    expect(result).toBeDefined();
    expect(result.topFactors).toBeDefined();
    expect(Array.isArray(result.topFactors)).toBe(true);
    expect(result.activitySummary).toBeDefined();
  });

  it('should require authentication for personalized recommendations', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.recommendations.getPersonalized({ limit: 5 })
    ).rejects.toThrow();
  });

  it('should handle invalid feedback gracefully', async () => {
    const caller = appRouter.createCaller({
      user: mockUser,
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.recommendations.submitFeedback({
        propertyId: -1,
        feedback: 'invalid' as any,
        reason: 'test',
      })
    ).rejects.toThrow();
  });
});
