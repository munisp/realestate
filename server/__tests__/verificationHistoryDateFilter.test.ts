import { describe, it, expect, beforeAll } from "vitest";
import * as db from "../db";
import { subDays, subMonths } from "date-fns";

describe("Verification History Date Range Filter", () => {
  it("should filter verification history by date range", async () => {
    // Test with a date range filter
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    
    const result = await db.getUserVerificationHistory(1, {
      page: 1,
      pageSize: 25,
      dateFrom: sevenDaysAgo.toISOString(),
      dateTo: now.toISOString(),
    });

    // Should return pagination structure
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("pageSize");
    expect(result).toHaveProperty("totalPages");
    
    // Items should be an array
    expect(Array.isArray(result.items)).toBe(true);
    
    // All items should be within date range
    result.items.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      expect(itemDate.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
      expect(itemDate.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });

  it("should support pagination with date filters", async () => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    
    const result = await db.getUserVerificationHistory(1, {
      page: 1,
      pageSize: 10,
      dateFrom: thirtyDaysAgo.toISOString(),
      dateTo: now.toISOString(),
    });

    // Verify pagination structure
    expect(result.pageSize).toBe(10);
    expect(result.page).toBe(1);
    expect(result.items.length).toBeLessThanOrEqual(10);
  });

  it("should support search with date filters", async () => {
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    
    const result = await db.getUserVerificationHistory(1, {
      page: 1,
      pageSize: 25,
      search: "LAGOS",
      dateFrom: threeMonthsAgo.toISOString(),
      dateTo: now.toISOString(),
    });

    expect(result).toHaveProperty("items");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("should support sorting with date filters", async () => {
    const now = new Date();
    const oneYearAgo = subDays(now, 365);
    
    const resultDesc = await db.getUserVerificationHistory(1, {
      page: 1,
      pageSize: 25,
      sortBy: "date",
      sortOrder: "desc",
      dateFrom: oneYearAgo.toISOString(),
      dateTo: now.toISOString(),
    });

    const resultAsc = await db.getUserVerificationHistory(1, {
      page: 1,
      pageSize: 25,
      sortBy: "date",
      sortOrder: "asc",
      dateFrom: oneYearAgo.toISOString(),
      dateTo: now.toISOString(),
    });

    expect(resultDesc).toHaveProperty("items");
    expect(resultAsc).toHaveProperty("items");
  });

  it("should return all records when no date filter is provided", async () => {
    const result = await db.getUserVerificationHistory(1, {
      page: 1,
      pageSize: 25,
    });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });
});
