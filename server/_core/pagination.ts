/**
 * Cursor-Based Pagination Utility
 *
 * Replaces offset-based pagination (which degrades at scale) with
 * cursor-based pagination that is:
 *  - O(1) regardless of page depth
 *  - Stable (no duplicate/skipped rows when data changes)
 *  - Compatible with infinite scroll and "load more" patterns
 *
 * Usage:
 *   const { items, nextCursor, hasMore } = await paginate(db, {
 *     table: "properties",
 *     orderBy: "created_at",
 *     cursor: input.cursor,
 *     limit: input.limit,
 *     where: "city = $1",
 *     params: ["Lagos"],
 *   });
 */

import { z } from "zod";

// ── Cursor Encoding ────────────────────────────────────────────────────────

export function encodeCursor(value: string | number | Date): string {
  const str = value instanceof Date ? value.toISOString() : String(value);
  return Buffer.from(str).toString("base64url");
}

export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, "base64url").toString("utf-8");
  } catch {
    throw new Error("Invalid cursor");
  }
}

// ── Pagination Input Schema ────────────────────────────────────────────────

export const PaginationInputSchema = z.object({
  cursor: z.string().optional().describe("Opaque cursor from previous page's nextCursor"),
  limit: z.number().min(1).max(100).default(20),
  direction: z.enum(["forward", "backward"]).default("forward"),
});

export type PaginationInput = z.infer<typeof PaginationInputSchema>;

// ── Pagination Result ──────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  hasPrev: boolean;
  totalEstimate?: number; // approximate count (avoid COUNT(*) on large tables)
}

// ── Core Paginator ─────────────────────────────────────────────────────────

export interface PaginateOptions {
  db: any;
  table: string;
  select?: string;
  orderByColumn: string;
  orderByDirection?: "ASC" | "DESC";
  cursorColumn?: string; // defaults to orderByColumn
  cursor?: string;
  limit: number;
  where?: string;
  params?: any[];
  joins?: string;
}

export async function paginate<T = any>(opts: PaginateOptions): Promise<PaginatedResult<T>> {
  const {
    db,
    table,
    select = "*",
    orderByColumn,
    orderByDirection = "DESC",
    cursorColumn,
    cursor,
    limit,
    where,
    params = [],
    joins = "",
  } = opts;

  const cursorCol = cursorColumn || orderByColumn;
  const op = orderByDirection === "DESC" ? "<" : ">";
  let paramIdx = params.length + 1;

  let cursorCondition = "";
  const queryParams = [...params];

  if (cursor) {
    const cursorValue = decodeCursor(cursor);
    cursorCondition = `AND ${cursorCol} ${op} $${paramIdx++}`;
    queryParams.push(cursorValue);
  }

  const whereClause = where ? `WHERE (${where}) ${cursorCondition}` : cursorCondition ? `WHERE 1=1 ${cursorCondition}` : "";

  // Fetch limit+1 to determine hasMore
  const query = `
    SELECT ${select}
    FROM ${table}
    ${joins}
    ${whereClause}
    ORDER BY ${orderByColumn} ${orderByDirection}
    LIMIT $${paramIdx}
  `;
  queryParams.push(limit + 1);

  const result = await db.execute(query as any, queryParams);
  const rows = (result.rows || []) as T[];

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop(); // remove the extra item

  // Build cursors
  const nextCursor = hasMore && rows.length > 0
    ? encodeCursor((rows[rows.length - 1] as any)[cursorCol])
    : null;

  const prevCursor = cursor && rows.length > 0
    ? encodeCursor((rows[0] as any)[cursorCol])
    : null;

  return {
    items: rows,
    nextCursor,
    prevCursor,
    hasMore,
    hasPrev: !!cursor,
  };
}

// ── tRPC-Friendly Wrapper ──────────────────────────────────────────────────

/**
 * Creates a standard paginated response shape for tRPC procedures.
 * Use this in router query handlers.
 *
 * @example
 * export const propertiesRouter = router({
 *   list: publicProcedure
 *     .input(z.object({ city: z.string(), ...PaginationInputSchema.shape }))
 *     .query(async ({ input }) => {
 *       return paginatedQuery({
 *         db,
 *         table: "properties",
 *         orderByColumn: "created_at",
 *         cursor: input.cursor,
 *         limit: input.limit,
 *         where: "city = $1",
 *         params: [input.city],
 *       });
 *     }),
 * });
 */
export async function paginatedQuery<T = any>(opts: PaginateOptions): Promise<PaginatedResult<T>> {
  return paginate<T>(opts);
}
