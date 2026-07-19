import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb } from '../db';
import {
  escrowAccounts,
  escrowAuditLogs,
  escrowStateHistory,
  idempotencyKeys,
  escrowApprovals,
  escrowFraudChecks,
  providerTransactions,
  type EscrowAccount,
  type InsertEscrowAccount,
  type InsertEscrowAuditLog,
  type InsertEscrowStateHistory,
  type InsertIdempotencyKey,
} from '../../drizzle/schema';
import { PaymentProviderFactory } from './paymentProviders/PaymentProviderFactory';
import { performFraudChecks } from './fraudDetectionService';
import { createHash } from 'crypto';

/**
 * Enhanced Escrow Service with:
 * - Idempotency protection
 * - Database transactions
 * - Comprehensive audit trail
 * - State history tracking
 * - Multi-provider support
 */

export interface CreateEscrowParams {
  transactionId: number;
  propertyId: number;
  projectId?: number;
  buyerId: number;
  sellerId: number;
  amount: number; // in cents
  currency: string;
  paymentProvider: string; // 'stripe', 'mojaloop', 'tigerbeetle', 'flutterwave', 'paystack'
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface ReleaseEscrowParams {
  escrowId: number;
  amount?: number; // Optional partial release, defaults to full amount
  performedBy: number;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RefundEscrowParams {
  escrowId: number;
  amount?: number; // Optional partial refund
  performedBy: number;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Generate idempotency key from request parameters
 */
function generateIdempotencyKey(prefix: string, params: any): string {
  const hash = createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex')
    .substring(0, 16);
  return `${prefix}_${hash}`;
}

/**
 * Check and register idempotency key
 * Returns existing response if already processed
 */
async function checkIdempotency(
  tx: any,
  key: string,
  requestHash: string,
  expiresInHours: number = 24
): Promise<{ exists: boolean; response?: any; status?: string }> {
  const existing = await tx
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .limit(1);

  if (existing.length > 0) {
    const record = existing[0];
    
    // Check if expired
    if (new Date() > new Date(record.expiresAt)) {
      // Expired, delete and allow reprocessing
      await tx.delete(idempotencyKeys).where(eq(idempotencyKeys.id, record.id));
      return { exists: false };
    }

    if (record.status === 'completed') {
      return {
        exists: true,
        response: record.response ? JSON.parse(record.response) : null,
        status: 'completed',
      };
    }

    if (record.status === 'processing') {
      throw new Error('Request already being processed');
    }

    if (record.status === 'failed') {
      // Allow retry of failed requests
      await tx.delete(idempotencyKeys).where(eq(idempotencyKeys.id, record.id));
      return { exists: false };
    }
  }

  // Register new idempotency key
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  await tx.insert(idempotencyKeys).values({
    key,
    requestHash,
    status: 'processing',
    expiresAt,
  });

  return { exists: false };
}

/**
 * Mark idempotency key as completed
 */
async function markIdempotencyCompleted(tx: any, key: string, response: any) {
  await tx
    .update(idempotencyKeys)
    .set({
      status: 'completed',
      response: JSON.stringify(response),
    })
    .where(eq(idempotencyKeys.key, key));
}

/**
 * Mark idempotency key as failed
 */
async function markIdempotencyFailed(tx: any, key: string, error: string) {
  await tx
    .update(idempotencyKeys)
    .set({
      status: 'failed',
      lastError: error,
    })
    .where(eq(idempotencyKeys.key, key));
}

/**
 * Log escrow action to audit trail
 */
async function logEscrowAction(
  tx: any,
  params: {
    escrowId: number;
    action: string;
    previousStatus?: string;
    newStatus?: string;
    amount?: number;
    performedBy?: number;
    performedByRole?: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    metadata?: any;
  }
) {
  await tx.insert(escrowAuditLogs).values({
    escrowId: params.escrowId,
    action: params.action,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    amount: params.amount,
    performedBy: params.performedBy,
    performedByRole: params.performedByRole || 'system',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    reason: params.reason,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
  });
}

/**
 * Save escrow state to history
 */
async function saveEscrowState(tx: any, escrow: EscrowAccount) {
  await tx.insert(escrowStateHistory).values({
    escrowId: escrow.id,
    status: escrow.status,
    heldAmount: escrow.heldAmount,
    releasedAmount: escrow.releasedAmount,
    refundedAmount: escrow.refundedAmount,
    snapshot: JSON.stringify(escrow),
  });
}

/**
 * Create escrow account with idempotency protection
 */
export async function createEscrow(params: CreateEscrowParams): Promise<EscrowAccount> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const idempotencyKey = generateIdempotencyKey('create_escrow', params);
  const requestHash = createHash('sha256').update(JSON.stringify(params)).digest('hex');

  return await db.transaction(async (tx) => {
    // Check idempotency
    const idempotencyCheck = await checkIdempotency(tx, idempotencyKey, requestHash);
    if (idempotencyCheck.exists) {
      console.log('[Escrow] Request already processed, returning cached response');
      return idempotencyCheck.response;
    }

    try {
      // Create escrow record
      const [escrow] = await tx.insert(escrowAccounts).values({
        transactionId: params.transactionId,
        propertyId: params.propertyId,
        projectId: params.projectId,
        buyerId: params.buyerId,
        sellerId: params.sellerId,
        amount: Math.round(params.amount / 100), // Store in dollars
        currency: params.currency,
        totalAmount: params.amount, // Store in cents
        heldAmount: 0, // Not funded yet
        releasedAmount: 0,
        refundedAmount: 0,
        status: 'created',
      }).$returningId();

      // Get full escrow record
      const [fullEscrow] = await tx
        .select()
        .from(escrowAccounts)
        .where(eq(escrowAccounts.id, escrow.id))
        .limit(1);

      // Perform fraud checks
      const fraudCheckPassed = await performFraudChecks(tx, fullEscrow, {
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      if (!fraudCheckPassed) {
        throw new Error('Escrow creation blocked by fraud detection');
      }

      // Log action
      await logEscrowAction(tx, {
        escrowId: fullEscrow.id,
        action: 'created',
        newStatus: 'created',
        amount: params.amount,
        performedBy: params.buyerId,
        performedByRole: 'buyer',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata,
      });

      // Save initial state
      await saveEscrowState(tx, fullEscrow);

      // Create escrow with payment provider
      const provider = PaymentProviderFactory.getProvider(params.paymentProvider);
      const providerResponse = await provider.createEscrow({
        escrowId: fullEscrow.id,
        amount: params.amount,
        currency: params.currency,
        buyerId: params.buyerId,
        sellerId: params.sellerId,
        metadata: params.metadata,
      });

      // Store provider transaction
      await tx.insert(providerTransactions).values({
        escrowId: fullEscrow.id,
        providerId: (await tx.select().from(paymentProviders).where(eq(paymentProviders.name, params.paymentProvider)).limit(1))[0]?.id || 1,
        providerTransactionId: providerResponse.providerEscrowId,
        transactionType: 'create',
        amount: params.amount,
        currency: params.currency,
        status: providerResponse.status,
        metadata: JSON.stringify(providerResponse),
      });

      // Mark idempotency as completed
      await markIdempotencyCompleted(tx, idempotencyKey, fullEscrow);

      console.log(`[Escrow] Created escrow ${fullEscrow.id} with ${params.paymentProvider}`);
      return fullEscrow;
    } catch (error: any) {
      await markIdempotencyFailed(tx, idempotencyKey, error.message);
      throw error;
    }
  });
}

/**
 * Fund escrow account (called after payment succeeds)
 */
export async function fundEscrow(
  escrowId: number,
  amount: number,
  providerTransactionId: string,
  metadata?: any
): Promise<EscrowAccount> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const idempotencyKey = `fund_escrow_${escrowId}_${providerTransactionId}`;
  const requestHash = createHash('sha256')
    .update(`${escrowId}${amount}${providerTransactionId}`)
    .digest('hex');

  return await db.transaction(async (tx) => {
    // Check idempotency
    const idempotencyCheck = await checkIdempotency(tx, idempotencyKey, requestHash);
    if (idempotencyCheck.exists) {
      return idempotencyCheck.response;
    }

    try {
      // Lock escrow record
      const [escrow] = await tx
        .select()
        .from(escrowAccounts)
        .where(eq(escrowAccounts.id, escrowId))
        .for('update')
        .limit(1);

      if (!escrow) {
        throw new Error('Escrow account not found');
      }

      if (escrow.status !== 'created') {
        throw new Error(`Cannot fund escrow in status: ${escrow.status}`);
      }

      const previousStatus = escrow.status;

      // Update escrow
      await tx
        .update(escrowAccounts)
        .set({
          status: 'funded',
          heldAmount: amount,
          fundedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, escrowId));

      // Get updated escrow
      const [updatedEscrow] = await tx
        .select()
        .from(escrowAccounts)
        .where(eq(escrowAccounts.id, escrowId))
        .limit(1);

      // Log action
      await logEscrowAction(tx, {
        escrowId,
        action: 'funded',
        previousStatus,
        newStatus: 'funded',
        amount,
        performedByRole: 'system',
        metadata: { providerTransactionId, ...metadata },
      });

      // Save state
      await saveEscrowState(tx, updatedEscrow);

      // Mark idempotency as completed
      await markIdempotencyCompleted(tx, idempotencyKey, updatedEscrow);

      console.log(`[Escrow] Funded escrow ${escrowId} with ${amount} cents`);
      return updatedEscrow;
    } catch (error: any) {
      await markIdempotencyFailed(tx, idempotencyKey, error.message);
      throw error;
    }
  });
}

/**
 * Release escrow funds to seller
 */
export async function releaseEscrow(params: ReleaseEscrowParams): Promise<EscrowAccount> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const idempotencyKey = generateIdempotencyKey('release_escrow', params);
  const requestHash = createHash('sha256').update(JSON.stringify(params)).digest('hex');

  return await db.transaction(async (tx) => {
    // Check idempotency
    const idempotencyCheck = await checkIdempotency(tx, idempotencyKey, requestHash);
    if (idempotencyCheck.exists) {
      return idempotencyCheck.response;
    }

    try {
      // Lock escrow record
      const [escrow] = await tx
        .select()
        .from(escrowAccounts)
        .where(eq(escrowAccounts.id, params.escrowId))
        .for('update')
        .limit(1);

      if (!escrow) {
        throw new Error('Escrow account not found');
      }

      if (!['funded', 'partial_release'].includes(escrow.status)) {
        throw new Error(`Cannot release escrow in status: ${escrow.status}`);
      }

      if (escrow.heldAmount <= 0) {
        throw new Error('No funds to release');
      }

      // Check if all required approvals are received
      const approvalsReceived = await checkAllApprovalsReceived(tx, params.escrowId);
      if (!approvalsReceived) {
        throw new Error('Not all required approvals received');
      }

      const releaseAmount = params.amount || escrow.heldAmount;
      if (releaseAmount > escrow.heldAmount) {
        throw new Error('Release amount exceeds held amount');
      }

      const previousStatus = escrow.status;
      const newHeldAmount = escrow.heldAmount - releaseAmount;
      const newReleasedAmount = escrow.releasedAmount + releaseAmount;
      const newStatus = newHeldAmount === 0 ? 'completed' : 'partial_release';

      // Get payment provider
      const [providerTx] = await tx
        .select()
        .from(providerTransactions)
        .where(eq(providerTransactions.escrowId, params.escrowId))
        .orderBy(desc(providerTransactions.createdAt))
        .limit(1);

      if (!providerTx) {
        throw new Error('Provider transaction not found');
      }

      // Release funds via provider
      const provider = PaymentProviderFactory.getProviderById(providerTx.providerId);
      const releaseResponse = await provider.releaseEscrow(
        providerTx.providerTransactionId,
        releaseAmount
      );

      // Update escrow
      await tx
        .update(escrowAccounts)
        .set({
          status: newStatus,
          heldAmount: newHeldAmount,
          releasedAmount: newReleasedAmount,
          completedAt: newStatus === 'completed' ? new Date() : undefined,
        })
        .where(eq(escrowAccounts.id, params.escrowId));

      // Get updated escrow
      const [updatedEscrow] = await tx
        .select()
        .from(escrowAccounts)
        .where(eq(escrowAccounts.id, params.escrowId))
        .limit(1);

      // Store provider transaction
      await tx.insert(providerTransactions).values({
        escrowId: params.escrowId,
        providerId: providerTx.providerId,
        providerTransactionId: releaseResponse.transactionId,
        transactionType: 'release',
        amount: releaseAmount,
        currency: escrow.currency,
        status: releaseResponse.success ? 'completed' : 'failed',
        metadata: JSON.stringify(releaseResponse),
      });

      // Log action
      await logEscrowAction(tx, {
        escrowId: params.escrowId,
        action: 'released',
        previousStatus,
        newStatus,
        amount: releaseAmount,
        performedBy: params.performedBy,
        performedByRole: params.performedByRole || 'admin',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        reason: params.reason,
        metadata: releaseResponse,
      });

      // Save state
      await saveEscrowState(tx, updatedEscrow);

      // Mark idempotency as completed
      await markIdempotencyCompleted(tx, idempotencyKey, updatedEscrow);

      console.log(`[Escrow] Released ${releaseAmount} cents from escrow ${params.escrowId}`);
      return updatedEscrow;
    } catch (error: any) {
      await markIdempotencyFailed(tx, idempotencyKey, error.message);
      throw error;
    }
  });
}

/**
 * Refund escrow funds to buyer
 */
export async function refundEscrow(params: RefundEscrowParams): Promise<EscrowAccount> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const idempotencyKey = generateIdempotencyKey('refund_escrow', params);
  const requestHash = createHash('sha256').update(JSON.stringify(params)).digest('hex');

  return await db.transaction(async (tx) => {
    // Check idempotency
    const idempotencyCheck = await checkIdempotency(tx, idempotencyKey, requestHash);
    if (idempotencyCheck.exists) {
      return idempotencyCheck.response;
    }

    try {
      // Lock escrow record
      const [escrow] = await tx
        .select()
        .from(escrowAccounts)
        .where(eq(escrowAccounts.id, params.escrowId))
        .for('update')
        .limit(1);

      if (!escrow) {
        throw new Error('Escrow account not found');
      }

      if (!['funded', 'partial_release', 'disputed'].includes(escrow.status)) {
        throw new Error(`Cannot refund escrow in status: ${escrow.status}`);
      }

      if (escrow.heldAmount <= 0) {
        throw new Error('No funds to refund');
      }

      const refundAmount = params.amount || escrow.heldAmount;
      if (refundAmount > escrow.heldAmount) {
        throw new Error('Refund amount exceeds held amount');
      }

      const previousStatus = escrow.status;
      const newHeldAmount = escrow.heldAmount - refundAmount;
      const newRefundedAmount = escrow.refundedAmount + refundAmount;
      const newStatus = newHeldAmount === 0 ? 'refunded' : 'partial_release';

      // Get payment provider
      const [providerTx] = await tx
        .select()
        .from(providerTransactions)
        .where(eq(providerTransactions.escrowId, params.escrowId))
        .orderBy(desc(providerTransactions.createdAt))
        .limit(1);

      if (!providerTx) {
        throw new Error('Provider transaction not found');
      }

      // Refund via provider
      const provider = PaymentProviderFactory.getProviderById(providerTx.providerId);
      const refundResponse = await provider.refundEscrow(
        providerTx.providerTransactionId,
        refundAmount
      );

      // Update escrow
      await tx
        .update(escrowAccounts)
        .set({
          status: newStatus,
          heldAmount: newHeldAmount,
          refundedAmount: newRefundedAmount,
          completedAt: newStatus === 'refunded' ? new Date() : undefined,
        })
        .where(eq(escrowAccounts.id, params.escrowId));

      // Get updated escrow
      const [updatedEscrow] = await tx
        .select()
        .from(escrowAccounts)
        .where(eq(escrowAccounts.id, params.escrowId))
        .limit(1);

      // Store provider transaction
      await tx.insert(providerTransactions).values({
        escrowId: params.escrowId,
        providerId: providerTx.providerId,
        providerTransactionId: refundResponse.transactionId,
        transactionType: 'refund',
        amount: refundAmount,
        currency: escrow.currency,
        status: refundResponse.success ? 'completed' : 'failed',
        metadata: JSON.stringify(refundResponse),
      });

      // Log action
      await logEscrowAction(tx, {
        escrowId: params.escrowId,
        action: 'refunded',
        previousStatus,
        newStatus,
        amount: refundAmount,
        performedBy: params.performedBy,
        performedByRole: 'admin',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        reason: params.reason,
        metadata: refundResponse,
      });

      // Save state
      await saveEscrowState(tx, updatedEscrow);

      // Mark idempotency as completed
      await markIdempotencyCompleted(tx, idempotencyKey, updatedEscrow);

      console.log(`[Escrow] Refunded ${refundAmount} cents from escrow ${params.escrowId}`);
      return updatedEscrow;
    } catch (error: any) {
      await markIdempotencyFailed(tx, idempotencyKey, error.message);
      throw error;
    }
  });
}

/**
 * Check if all required approvals are received
 */
async function checkAllApprovalsReceived(tx: any, escrowId: number): Promise<boolean> {
  const approvals = await tx
    .select()
    .from(escrowApprovals)
    .where(
      and(
        eq(escrowApprovals.escrowId, escrowId),
        eq(escrowApprovals.action, 'release')
      )
    );

  if (approvals.length === 0) {
    // No approvals required
    return true;
  }

  const allApproved = approvals.every((a) => a.status === 'approved');
  const anyRejected = approvals.some((a) => a.status === 'rejected');

  if (anyRejected) {
    throw new Error('Escrow release rejected by one or more approvers');
  }

  return allApproved;
}

/**
 * Get escrow audit trail
 */
export async function getEscrowAuditTrail(escrowId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(escrowAuditLogs)
    .where(eq(escrowAuditLogs.escrowId, escrowId))
    .orderBy(desc(escrowAuditLogs.createdAt));
}

/**
 * Get escrow state history
 */
export async function getEscrowStateHistory(escrowId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(escrowStateHistory)
    .where(eq(escrowStateHistory.escrowId, escrowId))
    .orderBy(desc(escrowStateHistory.createdAt));
}
