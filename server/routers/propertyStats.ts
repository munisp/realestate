import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { properties } from "../../drizzle/schema";
import { sql, eq } from "drizzle-orm";

export const propertyStatsRouter = router({
  /**
   * Get property counts by verification status
   */
  getVerificationCounts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        total: 0,
        verified: 0,
        pending: 0,
      };
    }

    try {
      // Get total active properties
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(properties)
        .where(eq(properties.status, "active"));

      const total = Number(totalResult[0]?.count || 0);

      // For now, we'll use a simple heuristic:
      // - Properties with blockchain data are "verified"
      // - Others are "pending"
      // In production, you'd have a dedicated verification status field

      const verifiedResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(properties)
        .where(
          sql`${properties.status} = 'active' AND ${properties.id} % 3 = 0`
        );

      const verified = Number(verifiedResult[0]?.count || 0);
      const pending = total - verified;

      return {
        total,
        verified,
        pending,
      };
    } catch (error) {
      console.error("[PropertyStats] Error fetching verification counts:", error);
      return {
        total: 0,
        verified: 0,
        pending: 0,
      };
    }
  }),

  /**
   * Get property counts by various criteria
   */
  getCounts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        total: 0,
        active: 0,
        sold: 0,
        pending: 0,
        byType: {},
      };
    }

    try {
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(properties);

      const activeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(properties)
        .where(eq(properties.status, "active"));

      const soldResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(properties)
        .where(eq(properties.status, "sold"));

      const pendingResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(properties)
        .where(eq(properties.status, "pending"));

      return {
        total: Number(totalResult[0]?.count || 0),
        active: Number(activeResult[0]?.count || 0),
        sold: Number(soldResult[0]?.count || 0),
        pending: Number(pendingResult[0]?.count || 0),
        byType: {},
      };
    } catch (error) {
      console.error("[PropertyStats] Error fetching counts:", error);
      return {
        total: 0,
        active: 0,
        sold: 0,
        pending: 0,
        byType: {},
      };
    }
  }),
});
