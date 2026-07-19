import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { investorProfiles } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const investorProfileRouter = router({
  // Get investor profile for current user
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [profile] = await db
      .select()
      .from(investorProfiles)
      .where(eq(investorProfiles.userId, ctx.user.id))
      .limit(1);

    if (!profile) return null;

    // Parse JSON fields
    return {
      ...profile,
      preferredCities: profile.preferredCities ? JSON.parse(profile.preferredCities) : [],
      preferredNeighborhoods: profile.preferredNeighborhoods ? JSON.parse(profile.preferredNeighborhoods) : [],
      propertyTypes: profile.propertyTypes ? JSON.parse(profile.propertyTypes) : [],
      minROI: profile.minROI / 10, // Convert back from stored format
    };
  }),

  // Create investor profile
  create: protectedProcedure
    .input(
      z.object({
        minBudget: z.number().min(0),
        maxBudget: z.number().min(0),
        minROI: z.number().min(0).max(100),
        riskTolerance: z.enum(["conservative", "moderate", "aggressive"]),
        investmentHorizon: z.enum(["short", "medium", "long"]),
        preferredCities: z.array(z.string()),
        preferredNeighborhoods: z.array(z.string()),
        propertyTypes: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if profile already exists
      const [existing] = await db
        .select()
        .from(investorProfiles)
        .where(eq(investorProfiles.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        throw new Error("Investor profile already exists. Use update instead.");
      }

      // Create profile
      const [profile] = await db.insert(investorProfiles).values({
        userId: ctx.user.id,
        minBudget: input.minBudget,
        maxBudget: input.maxBudget,
        minROI: Math.round(input.minROI * 10), // Store as integer (8.5% = 85)
        riskTolerance: input.riskTolerance,
        investmentHorizon: input.investmentHorizon,
        preferredCities: JSON.stringify(input.preferredCities),
        preferredNeighborhoods: JSON.stringify(input.preferredNeighborhoods),
        propertyTypes: JSON.stringify(input.propertyTypes),
        isActive: 1,
        onboardingCompleted: 1,
      });

      return { success: true, profileId: profile.insertId };
    }),

  // Update investor profile
  update: protectedProcedure
    .input(
      z.object({
        minBudget: z.number().min(0).optional(),
        maxBudget: z.number().min(0).optional(),
        minROI: z.number().min(0).max(100).optional(),
        riskTolerance: z.enum(["conservative", "moderate", "aggressive"]).optional(),
        investmentHorizon: z.enum(["short", "medium", "long"]).optional(),
        preferredCities: z.array(z.string()).optional(),
        preferredNeighborhoods: z.array(z.string()).optional(),
        propertyTypes: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {};

      if (input.minBudget !== undefined) updateData.minBudget = input.minBudget;
      if (input.maxBudget !== undefined) updateData.maxBudget = input.maxBudget;
      if (input.minROI !== undefined) updateData.minROI = Math.round(input.minROI * 10);
      if (input.riskTolerance !== undefined) updateData.riskTolerance = input.riskTolerance;
      if (input.investmentHorizon !== undefined) updateData.investmentHorizon = input.investmentHorizon;
      if (input.preferredCities !== undefined) updateData.preferredCities = JSON.stringify(input.preferredCities);
      if (input.preferredNeighborhoods !== undefined) updateData.preferredNeighborhoods = JSON.stringify(input.preferredNeighborhoods);
      if (input.propertyTypes !== undefined) updateData.propertyTypes = JSON.stringify(input.propertyTypes);

      await db
        .update(investorProfiles)
        .set(updateData)
        .where(eq(investorProfiles.userId, ctx.user.id));

      return { success: true };
    }),

  // Delete investor profile
  delete: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .delete(investorProfiles)
      .where(eq(investorProfiles.userId, ctx.user.id));

    return { success: true };
  }),
});
