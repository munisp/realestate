/**
 * Request Deduplication Middleware
 *
 * Prevents duplicate mutations from being processed twice when clients
 * retry failed requests (network errors, timeouts). Uses an idempotency
 * key (UUID) provided by the client.
 *
 * Behaviour:
 *  - Client generates a UUID per mutation and sends it as X-Idempotency-Key
 *  - Server stores the result of the first successful execution
 *  - Subsequent requests with the same key return the cached result
 *  - Keys expire after 24 hours
 *
 * Applies to: payment mutations, booking confirmations, offer submissions,
 *             notarization requests, credential issuance
 */

import { db } from "../db";
import { logger } from "./logger";

const DEDUP_TTL_HOURS = 24;

export interface IdempotencyRecord {
  key: string;
  result: any;
  statusCode: number;
  createdAt: Date;
}

/**
 * Check if an idempotency key has already been used.
 * Returns the cached result if so, null otherwise.
 */
export async function checkIdempotencyKey(key: string): Promise<IdempotencyRecord | null> {
  try {
    const result = await db.execute(
      `SELECT key, result, status_code, created_at
       FROM idempotency_records
       WHERE key = $1 AND created_at > NOW() - INTERVAL '${DEDUP_TTL_HOURS} hours'
       LIMIT 1` as any,
      [key]
    );
    if (result.rows?.length) {
      const row = result.rows[0] as any;
      return { key: row.key, result: row.result, statusCode: row.status_code, createdAt: row.created_at };
    }
  } catch (err) {
    logger.warn({ err, key }, "Idempotency check failed — proceeding without dedup");
  }
  return null;
}

/**
 * Store the result of a successful mutation for future deduplication.
 */
export async function storeIdempotencyResult(key: string, result: any, statusCode: number = 200): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO idempotency_records (key, result, status_code, created_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (key) DO NOTHING` as any,
      [key, JSON.stringify(result), statusCode]
    );
  } catch (err) {
    logger.warn({ err, key }, "Failed to store idempotency result");
  }
}

/**
 * Higher-order function that wraps a mutation handler with idempotency.
 *
 * @example
 * const result = await withIdempotency(
 *   ctx.req.headers['x-idempotency-key'],
 *   async () => { return await processPayment(input); }
 * );
 */
export async function withIdempotency<T>(
  key: string | undefined,
  handler: () => Promise<T>
): Promise<T> {
  if (!key) return handler();

  const existing = await checkIdempotencyKey(key);
  if (existing) {
    logger.info({ key }, "Returning cached idempotency result");
    return existing.result as T;
  }

  const result = await handler();
  await storeIdempotencyResult(key, result);
  return result;
}
