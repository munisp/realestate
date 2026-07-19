import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { properties } from '../../drizzle/schema';
import { inArray } from 'drizzle-orm';

export const comparisonRouter = router({
  // Get multiple properties for comparison
  getPropertiesForComparison: publicProcedure
    .input(
      z.object({
        propertyIds: z.array(z.number()).min(2).max(4),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const propertyList = await db
        .select()
        .from(properties)
        .where(inArray(properties.id, input.propertyIds));

      return {
        properties: propertyList,
      };
    }),

  // Save comparison for sharing
  saveComparison: protectedProcedure
    .input(
      z.object({
        propertyIds: z.array(z.number()).min(2).max(4),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Generate a unique share code
      const shareCode = Math.random().toString(36).substring(2, 10);

      // Store comparison (you may want to create a comparisons table)
      // For now, we'll return the share code with property IDs encoded
      const encodedData = Buffer.from(JSON.stringify(input.propertyIds)).toString('base64');

      return {
        success: true,
        shareCode: `${shareCode}-${encodedData}`,
        shareUrl: `/compare?share=${shareCode}-${encodedData}`,
      };
    }),

  // Load comparison from share code
  loadSharedComparison: publicProcedure
    .input(
      z.object({
        shareCode: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        // Extract property IDs from share code
        const parts = input.shareCode.split('-');
        if (parts.length < 2) {
          throw new Error('Invalid share code');
        }

        const encodedData = parts.slice(1).join('-');
        const propertyIds = JSON.parse(Buffer.from(encodedData, 'base64').toString());

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const propertyList = await db
          .select()
          .from(properties)
          .where(inArray(properties.id, propertyIds));

        return {
          properties: propertyList,
          propertyIds,
        };
      } catch (error) {
        throw new Error('Failed to load shared comparison');
      }
    }),

  // Calculate cost analysis
  calculateCostAnalysis: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        downPaymentPercent: z.number().default(20),
        interestRate: z.number().default(6.5),
        loanTermYears: z.number().default(30),
        propertyTaxRate: z.number().default(1.2), // percentage
        hoaFees: z.number().default(0),
        insurance: z.number().default(1200), // annual
        utilities: z.number().default(200), // monthly
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const property = await db
        .select()
        .from(properties)
        .where(inArray(properties.id, [input.propertyId]))
        .limit(1);

      if (!property || property.length === 0) {
        throw new Error('Property not found');
      }

      const price = property[0].price || 0;
      const downPayment = price * (input.downPaymentPercent / 100);
      const loanAmount = price - downPayment;

      // Calculate monthly mortgage payment
      const monthlyRate = input.interestRate / 100 / 12;
      const numberOfPayments = input.loanTermYears * 12;
      const monthlyMortgage =
        (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

      // Calculate other monthly costs
      const monthlyPropertyTax = (price * (input.propertyTaxRate / 100)) / 12;
      const monthlyInsurance = input.insurance / 12;
      const monthlyHOA = input.hoaFees;
      const monthlyUtilities = input.utilities;

      const totalMonthly =
        monthlyMortgage +
        monthlyPropertyTax +
        monthlyInsurance +
        monthlyHOA +
        monthlyUtilities;

      return {
        price,
        downPayment,
        loanAmount,
        monthlyMortgage,
        monthlyPropertyTax,
        monthlyInsurance,
        monthlyHOA,
        monthlyUtilities,
        totalMonthly,
        totalAnnual: totalMonthly * 12,
      };
    }),
});
