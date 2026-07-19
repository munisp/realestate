import { describe, it, expect, beforeEach } from 'vitest';
import { appRouter } from '../routers';
import { getDb } from '../db';
import { investorProfiles } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Investor Profile Router', () => {
  const mockUser = {
    id: 999999,
    openId: 'test-investor-123',
    name: 'Test Investor',
    email: 'investor@test.com',
    role: 'user' as const,
  };

  const mockContext = {
    user: mockUser,
    req: {} as any,
    res: {} as any,
  };

  beforeEach(async () => {
    // Clean up test data
    const db = await getDb();
    if (db) {
      await db.delete(investorProfiles).where(eq(investorProfiles.userId, mockUser.id));
    }
  });

  it('should create investor profile', async () => {
    const caller = appRouter.createCaller(mockContext);

    const result = await caller.investorProfile.create({
      minBudget: 100000,
      maxBudget: 500000,
      minROI: 8.5,
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      preferredCities: ['Lagos', 'Abuja'],
      preferredNeighborhoods: ['Ikoyi', 'Victoria Island'],
      propertyTypes: ['single_family', 'condo'],
    });

    expect(result.success).toBe(true);
    expect(result.profileId).toBeDefined();
  });

  it('should get investor profile', async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create profile first
    await caller.investorProfile.create({
      minBudget: 100000,
      maxBudget: 500000,
      minROI: 8.5,
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      preferredCities: ['Lagos', 'Abuja'],
      preferredNeighborhoods: ['Ikoyi', 'Victoria Island'],
      propertyTypes: ['single_family', 'condo'],
    });

    // Get profile
    const profile = await caller.investorProfile.get();

    expect(profile).toBeDefined();
    expect(profile?.userId).toBe(mockUser.id);
    expect(profile?.minBudget).toBe(100000);
    expect(profile?.maxBudget).toBe(500000);
    expect(profile?.minROI).toBe(8.5);
    expect(profile?.riskTolerance).toBe('moderate');
    expect(profile?.investmentHorizon).toBe('medium');
    expect(profile?.preferredCities).toEqual(['Lagos', 'Abuja']);
    expect(profile?.preferredNeighborhoods).toEqual(['Ikoyi', 'Victoria Island']);
    expect(profile?.propertyTypes).toEqual(['single_family', 'condo']);
  });

  it('should update investor profile', async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create profile first
    await caller.investorProfile.create({
      minBudget: 100000,
      maxBudget: 500000,
      minROI: 8.5,
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      preferredCities: ['Lagos'],
      preferredNeighborhoods: ['Ikoyi'],
      propertyTypes: ['single_family'],
    });

    // Update profile
    const updateResult = await caller.investorProfile.update({
      minBudget: 150000,
      maxBudget: 600000,
      minROI: 10.0,
      riskTolerance: 'aggressive',
      preferredCities: ['Lagos', 'Abuja', 'Port Harcourt'],
    });

    expect(updateResult.success).toBe(true);

    // Verify update
    const profile = await caller.investorProfile.get();
    expect(profile?.minBudget).toBe(150000);
    expect(profile?.maxBudget).toBe(600000);
    expect(profile?.minROI).toBe(10.0);
    expect(profile?.riskTolerance).toBe('aggressive');
    expect(profile?.preferredCities).toEqual(['Lagos', 'Abuja', 'Port Harcourt']);
  });

  it('should delete investor profile', async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create profile first
    await caller.investorProfile.create({
      minBudget: 100000,
      maxBudget: 500000,
      minROI: 8.5,
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      preferredCities: ['Lagos'],
      preferredNeighborhoods: ['Ikoyi'],
      propertyTypes: ['single_family'],
    });

    // Delete profile
    const deleteResult = await caller.investorProfile.delete();
    expect(deleteResult.success).toBe(true);

    // Verify deletion
    const profile = await caller.investorProfile.get();
    expect(profile).toBeNull();
  });

  it('should return null for non-existent profile', async () => {
    const caller = appRouter.createCaller(mockContext);

    const profile = await caller.investorProfile.get();
    expect(profile).toBeNull();
  });

  it('should prevent duplicate profile creation', async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create first profile
    await caller.investorProfile.create({
      minBudget: 100000,
      maxBudget: 500000,
      minROI: 8.5,
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      preferredCities: ['Lagos'],
      preferredNeighborhoods: ['Ikoyi'],
      propertyTypes: ['single_family'],
    });

    // Try to create duplicate
    await expect(
      caller.investorProfile.create({
        minBudget: 200000,
        maxBudget: 700000,
        minROI: 10.0,
        riskTolerance: 'aggressive',
        investmentHorizon: 'long',
        preferredCities: ['Abuja'],
        preferredNeighborhoods: ['Maitama'],
        propertyTypes: ['condo'],
      })
    ).rejects.toThrow('Investor profile already exists');
  });
});
