// @ts-nocheck
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  escrowAccounts,
  escrowApprovals,
  type EscrowAccount,
  type EscrowApproval,
  type InsertEscrowApproval,
} from '../../drizzle/schema';

/**
 * Multi-Signature Approval Service
 * 
 * Implements approval workflows for escrow operations:
 * - Tiered approval based on transaction amount
 * - Multiple approver types (buyer, seller, inspector, admin)
 * - Digital signature support
 * - Approval notifications
 */

export interface ApprovalRequirement {
  approverType: 'buyer' | 'seller' | 'inspector' | 'admin';
  approverId: number;
  required: boolean;
}

export interface RequestApprovalParams {
  escrowId: number;
  action: 'release' | 'refund' | 'dispute';
  requestedBy: number;
  reason?: string;
}

export interface ApproveParams {
  approvalId: number;
  approverId: number;
  signature?: string;
  reason?: string;
}

export interface RejectParams {
  approvalId: number;
  approverId: number;
  reason: string;
}

/**
 * Determine required approvals based on escrow amount
 */
export function getRequiredApprovals(
  escrow: EscrowAccount,
  action: 'release' | 'refund' | 'dispute'
): ApprovalRequirement[] {
  const amount = escrow.totalAmount;
  const requirements: ApprovalRequirement[] = [];

  // Tiered approval requirements based on amount
  if (amount > 100000000) {
    // > $1M - Requires all approvers
    requirements.push(
      { approverType: 'buyer', approverId: escrow.buyerId, required: true },
      { approverType: 'seller', approverId: escrow.sellerId, required: true },
      { approverType: 'inspector', approverId: escrow.inspectorId || 0, required: true },
      { approverType: 'admin', approverId: 1, required: true }
    );
  } else if (amount > 10000000) {
    // > $100k - Requires buyer, seller, inspector
    requirements.push(
      { approverType: 'buyer', approverId: escrow.buyerId, required: true },
      { approverType: 'seller', approverId: escrow.sellerId, required: true },
      { approverType: 'inspector', approverId: 0, required: true }
    );
  } else if (amount > 5000000) {
    // > $50k - Requires buyer and seller
    requirements.push(
      { approverType: 'buyer', approverId: escrow.buyerId, required: true },
      { approverType: 'seller', approverId: escrow.sellerId, required: true }
    );
  } else {
    // < $50k - Requires only buyer or seller depending on action
    if (action === 'release') {
      requirements.push({
        approverType: 'buyer',
        approverId: escrow.buyerId,
        required: true,
      });
    } else if (action === 'refund') {
      requirements.push({
        approverType: 'seller',
        approverId: escrow.sellerId,
        required: true,
      });
    }
  }

  return requirements;
}

/**
 * Request approvals for an escrow action
 */
export async function requestApprovals(
  params: RequestApprovalParams
): Promise<EscrowApproval[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db.transaction(async (tx) => {
    // Get escrow
    const [escrow] = await tx
      .select()
      .from(escrowAccounts)
      .where(eq(escrowAccounts.id, params.escrowId))
      .limit(1);

    if (!escrow) {
      throw new Error('Escrow account not found');
    }

    // Check if approvals already exist for this action
    const existingApprovals = await tx
      .select()
      .from(escrowApprovals)
      .where(
        and(
          eq(escrowApprovals.escrowId, params.escrowId),
          eq(escrowApprovals.action, params.action)
        )
      );

    if (existingApprovals.length > 0) {
      throw new Error('Approvals already requested for this action');
    }

    // Determine required approvals
    const requirements = getRequiredApprovals(escrow, params.action);

    if (requirements.length === 0) {
      // No approvals required
      return [];
    }

    // Create approval requests
    const createdApprovals: EscrowApproval[] = [];

    for (const req of requirements) {
      const [approval] = await tx
        .insert(escrowApprovals)
        .values({
          escrowId: params.escrowId,
          approverType: req.approverType,
          approverId: req.approverId,
          action: params.action,
          status: 'pending',
          reason: params.reason,
        })
        .returning();

      const [fullApproval] = await tx
        .select()
        .from(escrowApprovals)
        .where(eq(escrowApprovals.id, approval.id))
        .limit(1);

      createdApprovals.push(fullApproval);

      await fetch('http://localhost:5104/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: req.approverId,
          channel: 'email',
          subject: 'Approval Required',
          message: `Approval required for escrow ${params.escrowId} - ${params.action}`,
        }),
      }).catch(e => console.error('Notification failed:', e));
      console.log(
        `[Approval] Requested ${req.approverType} approval from user ${req.approverId} for escrow ${params.escrowId}`
      );
    }

    return createdApprovals;
  });
}

/**
 * Approve an escrow action
 */
export async function approveAction(params: ApproveParams): Promise<EscrowApproval> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db.transaction(async (tx) => {
    // Get approval
    const [approval] = await tx
      .select()
      .from(escrowApprovals)
      .where(eq(escrowApprovals.id, params.approvalId))
      .for('update')
      .limit(1);

    if (!approval) {
      throw new Error('Approval not found');
    }

    // Verify approver
    if (approval.approverId !== params.approverId) {
      throw new Error('Not authorized to approve this action');
    }

    if (approval.status !== 'pending') {
      throw new Error(`Approval already ${approval.status}`);
    }

    // Update approval
    await tx
      .update(escrowApprovals)
      .set({
        status: 'approved',
        signature: params.signature,
        approvedAt: new Date(),
        reason: params.reason || approval.reason,
      })
      .where(eq(escrowApprovals.id, params.approvalId));

    // Get updated approval
    const [updatedApproval] = await tx
      .select()
      .from(escrowApprovals)
      .where(eq(escrowApprovals.id, params.approvalId))
      .limit(1);

    console.log(
      `[Approval] User ${params.approverId} approved ${approval.action} for escrow ${approval.escrowId}`
    );

    // Check if all approvals are received
    const allApproved = await checkAllApprovalsReceived(tx, approval.escrowId, approval.action);

    if (allApproved) {
      console.log(
        `[Approval] All approvals received for escrow ${approval.escrowId} ${approval.action}`
      );
      await fetch('http://localhost:5104/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: approval.requestedBy || 1,
          channel: 'email',
          subject: 'All Approvals Received',
          message: `All approvals received for escrow ${approval.escrowId} - ${approval.action}`,
        }),
      }).catch(e => console.error('Notification failed:', e));
    }

    return updatedApproval;
  });
}

/**
 * Reject an escrow action
 */
export async function rejectAction(params: RejectParams): Promise<EscrowApproval> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db.transaction(async (tx) => {
    // Get approval
    const [approval] = await tx
      .select()
      .from(escrowApprovals)
      .where(eq(escrowApprovals.id, params.approvalId))
      .for('update')
      .limit(1);

    if (!approval) {
      throw new Error('Approval not found');
    }

    // Verify approver
    if (approval.approverId !== params.approverId) {
      throw new Error('Not authorized to reject this action');
    }

    if (approval.status !== 'pending') {
      throw new Error(`Approval already ${approval.status}`);
    }

    // Update approval
    await tx
      .update(escrowApprovals)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        reason: params.reason,
      })
      .where(eq(escrowApprovals.id, params.approvalId));

    // Get updated approval
    const [updatedApproval] = await tx
      .select()
      .from(escrowApprovals)
      .where(eq(escrowApprovals.id, params.approvalId))
      .limit(1);

    console.log(
      `[Approval] User ${params.approverId} rejected ${approval.action} for escrow ${approval.escrowId}: ${params.reason}`
    );

    await fetch('http://localhost:5104/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: approval.requestedBy || 1,
        channel: 'email',
        subject: 'Approval Rejected',
        message: `Approval rejected for escrow ${approval.escrowId} - ${approval.action}: ${params.reason}`,
      }),
    }).catch(e => console.error('Notification failed:', e));

    return updatedApproval;
  });
}

/**
 * Check if all required approvals are received
 */
export async function checkAllApprovalsReceived(
  tx: any,
  escrowId: number,
  action: string
): Promise<boolean> {
  const approvals = await tx
    .select()
    .from(escrowApprovals)
    .where(
      and(eq(escrowApprovals.escrowId, escrowId), eq(escrowApprovals.action, action))
    );

  if (approvals.length === 0) {
    // No approvals required
    return true;
  }

  const allApproved = approvals.every((a) => a.status === 'approved');
  const anyRejected = approvals.some((a) => a.status === 'rejected');

  if (anyRejected) {
    return false;
  }

  return allApproved;
}

/**
 * Get pending approvals for a user
 */
export async function getPendingApprovals(userId: number): Promise<EscrowApproval[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(escrowApprovals)
    .where(
      and(
        eq(escrowApprovals.approverId, userId),
        eq(escrowApprovals.status, 'pending')
      )
    );
}

/**
 * Get approval status for an escrow
 */
export async function getApprovalStatus(escrowId: number, action: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const approvals = await db
    .select()
    .from(escrowApprovals)
    .where(
      and(eq(escrowApprovals.escrowId, escrowId), eq(escrowApprovals.action, action))
    );

  const totalRequired = approvals.length;
  const approved = approvals.filter((a) => a.status === 'approved').length;
  const rejected = approvals.filter((a) => a.status === 'rejected').length;
  const pending = approvals.filter((a) => a.status === 'pending').length;

  const allApproved = totalRequired > 0 && approved === totalRequired;
  const anyRejected = rejected > 0;

  return {
    escrowId,
    action,
    totalRequired,
    approved,
    rejected,
    pending,
    allApproved,
    anyRejected,
    approvals,
  };
}

/**
 * Cancel all pending approvals for an escrow action
 */
export async function cancelApprovals(escrowId: number, action: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(escrowApprovals)
    .set({
      status: 'rejected',
      rejectedAt: new Date(),
      reason: 'Cancelled by system',
    })
    .where(
      and(
        eq(escrowApprovals.escrowId, escrowId),
        eq(escrowApprovals.action, action),
        eq(escrowApprovals.status, 'pending')
      )
    );

  console.log(`[Approval] Cancelled pending approvals for escrow ${escrowId} ${action}`);
}
