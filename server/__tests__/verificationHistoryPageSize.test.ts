import { describe, it, expect } from "vitest";
import * as db from "../db";

describe("Verification History PageSize Parameter", () => {
  it("should respect the pageSize parameter when provided", async () => {
    // Test with pageSize = 10
    const result = await db.getUserVerificationHistory(1, {
      page: 1,
      pageSize: 10,
    });

    // The function should return the requested pageSize
    expect(result).toHaveProperty("pageSize");
    expect(result.pageSize).toBe(10);
  });

  it("should use default pageSize of 25 when not provided", async () => {
    const result = await db.getUserVerificationHistory(1, {
      page: 1,
    });

    expect(result.pageSize).toBe(25);
  });

  it("should respect different pageSize values", async () => {
    const result50 = await db.getUserVerificationHistory(1, {
      page: 1,
      pageSize: 50,
    });

    expect(result50.pageSize).toBe(50);

    const result5 = await db.getUserVerificationHistory(1, {
      page: 1,
      pageSize: 5,
    });

    expect(result5.pageSize).toBe(5);
  });
});
