import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { getDb } from '../db';
import {
  escrowAccounts,
  escrowFraudChecks,
  type EscrowAccount,
  type InsertEscrowFraudCheck,
} from '../../drizzle/schema';

/**
 * Fraud Detection Service
 * 
 * Implements multiple fraud detection checks:
 * - Velocity checks (too many escrows in short time)
 * - Amount anomaly detection
 * - Pattern detection (high cancel rate)
 * - IP reputation checking
 * - Risk scoring algorithm
 */

export interface FraudCheckContext {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export interface FraudCheckResult {
  checkType: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  passed: boolean;
  blockedReason?: string;
  metadata?: any;
}

/**
 * Perform all fraud checks on an escrow
 * Returns true if all checks pass, false if any critical check fails
 */
export async function performFraudChecks(
  tx: any,
  escrow: EscrowAccount,
  context: FraudCheckContext
): Promise<boolean> {
  const checks: FraudCheckResult[] = [];

  // 1. Velocity check
  const velocityCheck = await checkVelocity(tx, escrow.buyerId);
  checks.push(velocityCheck);

  // 2. Amount anomaly check
  const amountCheck = await checkAmountAnomaly(tx, escrow.buyerId, escrow.totalAmount);
  checks.push(amountCheck);

  // 3. Pattern check (cancel rate)
  const patternCheck = await checkCancelPattern(tx, escrow.buyerId);
  checks.push(patternCheck);

  // 4. IP reputation check
  if (context.ipAddress) {
    const ipCheck = await checkIPReputation(context.ipAddress);
    checks.push(ipCheck);
  }

  // 5. Large transaction check
  if (escrow.totalAmount > 10000000) { // > $100k
    const largeTransactionCheck = await checkLargeTransaction(tx, escrow);
    checks.push(largeTransactionCheck);
  }

  // Store all fraud checks
  for (const check of checks) {
    await tx.insert(escrowFraudChecks).values({
      escrowId: escrow.id,
      checkType: check.checkType,
      riskScore: check.riskScore,
      riskLevel: check.riskLevel,
      flags: JSON.stringify(check.flags),
      passed: check.passed,
      blockedReason: check.blockedReason,
      metadata: check.metadata ? JSON.stringify(check.metadata) : null,
    });
  }

  // Calculate overall risk score (weighted average)
  const overallRiskScore = calculateOverallRiskScore(checks);

  // Block if any critical check failed or overall risk is critical
  const criticalCheckFailed = checks.some(
    (c) => !c.passed && c.riskLevel === 'critical'
  );
  const highRiskCheckFailed = checks.some(
    (c) => !c.passed && c.riskLevel === 'high'
  );

  if (criticalCheckFailed || overallRiskScore >= 80) {
    await tx
      .update(escrowAccounts)
      .set({ status: 'cancelled' })
      .where(eq(escrowAccounts.id, escrow.id));

    await fetch('http://localhost:5104/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        channel: 'email',
        subject: 'Critical Fraud Alert',
        message: `Escrow ${escrow.id} blocked - Critical risk detected`,
      }),
    }).catch(e => console.error('Notification failed:', e));
    console.log(`[Fraud] Escrow ${escrow.id} blocked - Critical risk detected`);
    return false;
  }

  if (highRiskCheckFailed || overallRiskScore >= 60) {
    // Flag for manual review but don't block
    console.log(`[Fraud] Escrow ${escrow.id} flagged for manual review - High risk detected`);
    await fetch('http://localhost:5104/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        channel: 'email',
        subject: 'Fraud Review Required',
        message: `Escrow ${escrow.id} flagged for manual review - High risk detected`,
      }),
    }).catch(e => console.error('Notification failed:', e));
  }

  return true;
}

/**
 * Check if user is creating too many escrows in a short time
 */
async function checkVelocity(tx: any, userId: number): Promise<FraudCheckResult> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentEscrows = await tx
    .select({ count: sql<number>`count(*)` })
    .from(escrowAccounts)
    .where(
      and(
        eq(escrowAccounts.buyerId, userId),
        gte(escrowAccounts.createdAt, twentyFourHoursAgo)
      )
    );

  const count = Number(recentEscrows[0]?.count || 0);

  let riskScore = 0;
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let passed = true;
  const flags: string[] = [];
  let blockedReason: string | undefined;

  if (count > 10) {
    riskScore = 100;
    riskLevel = 'critical';
    passed = false;
    flags.push('extreme_velocity');
    blockedReason = 'Too many escrow creations in 24 hours (>10)';
  } else if (count > 5) {
    riskScore = 80;
    riskLevel = 'high';
    passed = false;
    flags.push('high_velocity');
    blockedReason = 'Too many escrow creations in 24 hours (>5)';
  } else if (count > 3) {
    riskScore = 50;
    riskLevel = 'medium';
    passed = true; // Warning but don't block
    flags.push('moderate_velocity');
  } else if (count > 1) {
    riskScore = 20;
    riskLevel = 'low';
    passed = true;
    flags.push('normal_velocity');
  }

  return {
    checkType: 'velocity',
    riskScore,
    riskLevel,
    flags,
    passed,
    blockedReason,
    metadata: { escrowCount24h: count },
  };
}

/**
 * Check if transaction amount is anomalous compared to user's history
 */
async function checkAmountAnomaly(
  tx: any,
  userId: number,
  amount: number
): Promise<FraudCheckResult> {
  // Get user's historical escrow amounts
  const historicalEscrows = await tx
    .select({
      amount: escrowAccounts.totalAmount,
    })
    .from(escrowAccounts)
    .where(eq(escrowAccounts.buyerId, userId))
    .limit(20); // Last 20 escrows

  if (historicalEscrows.length === 0) {
    // First escrow - check if it's unusually large
    if (amount > 10000000) { // > $100k
      return {
        checkType: 'amount_anomaly',
        riskScore: 70,
        riskLevel: 'high',
        flags: ['first_escrow_large_amount'],
        passed: true, // Flag but don't block
        metadata: { amount, isFirstEscrow: true },
      };
    }

    return {
      checkType: 'amount_anomaly',
      riskScore: 10,
      riskLevel: 'low',
      flags: ['first_escrow'],
      passed: true,
      metadata: { amount, isFirstEscrow: true },
    };
  }

  // Calculate average and standard deviation
  const amounts = historicalEscrows.map((e) => Number(e.amount));
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const stdDev = Math.sqrt(
    amounts.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / amounts.length
  );

  // Check if current amount is significantly different
  const zScore = Math.abs((amount - avg) / (stdDev || 1));

  let riskScore = 0;
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let passed = true;
  const flags: string[] = [];

  if (zScore > 5) {
    riskScore = 70;
    riskLevel = 'high';
    passed = true; // Flag but don't block
    flags.push('extreme_amount_anomaly');
  } else if (zScore > 3) {
    riskScore = 50;
    riskLevel = 'medium';
    passed = true;
    flags.push('high_amount_anomaly');
  } else if (zScore > 2) {
    riskScore = 30;
    riskLevel = 'low';
    passed = true;
    flags.push('moderate_amount_anomaly');
  } else {
    riskScore = 10;
    riskLevel = 'low';
    passed = true;
    flags.push('normal_amount');
  }

  return {
    checkType: 'amount_anomaly',
    riskScore,
    riskLevel,
    flags,
    passed,
    metadata: { amount, avgAmount: avg, stdDev, zScore },
  };
}

/**
 * Check if user has a high cancel/dispute rate
 */
async function checkCancelPattern(tx: any, userId: number): Promise<FraudCheckResult> {
  // Get all user's escrows
  const allEscrows = await tx
    .select({
      status: escrowAccounts.status,
    })
    .from(escrowAccounts)
    .where(eq(escrowAccounts.buyerId, userId));

  if (allEscrows.length < 3) {
    // Not enough history
    return {
      checkType: 'cancel_pattern',
      riskScore: 10,
      riskLevel: 'low',
      flags: ['insufficient_history'],
      passed: true,
      metadata: { totalEscrows: allEscrows.length },
    };
  }

  const totalCount = allEscrows.length;
  const cancelledCount = allEscrows.filter(
    (e) => e.status === 'cancelled' || e.status === 'refunded'
  ).length;
  const disputedCount = allEscrows.filter((e) => e.status === 'disputed').length;

  const cancelRate = cancelledCount / totalCount;
  const disputeRate = disputedCount / totalCount;

  let riskScore = 0;
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let passed = true;
  const flags: string[] = [];
  let blockedReason: string | undefined;

  if (cancelRate > 0.7 || disputeRate > 0.5) {
    riskScore = 90;
    riskLevel = 'critical';
    passed = false;
    flags.push('extreme_cancel_pattern');
    blockedReason = 'Extremely high cancel/dispute rate';
  } else if (cancelRate > 0.5 || disputeRate > 0.3) {
    riskScore = 70;
    riskLevel = 'high';
    passed = false;
    flags.push('high_cancel_pattern');
    blockedReason = 'High cancel/dispute rate';
  } else if (cancelRate > 0.3 || disputeRate > 0.2) {
    riskScore = 40;
    riskLevel = 'medium';
    passed = true; // Flag but don't block
    flags.push('moderate_cancel_pattern');
  } else {
    riskScore = 10;
    riskLevel = 'low';
    passed = true;
    flags.push('normal_cancel_pattern');
  }

  return {
    checkType: 'cancel_pattern',
    riskScore,
    riskLevel,
    flags,
    passed,
    blockedReason,
    metadata: {
      totalCount,
      cancelledCount,
      disputedCount,
      cancelRate,
      disputeRate,
    },
  };
}

/**
 * Check IP reputation (VPN, proxy, Tor, known fraud IPs)
 */
async function checkIPReputation(ipAddress: string): Promise<FraudCheckResult> {
  // In production, integrate with IP reputation services like:
  // - IPQualityScore
  // - MaxMind GeoIP2
  // - IPHub
  // - Spur.us

  // For now, basic checks
  const flags: string[] = [];
  let riskScore = 10;
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Check if localhost/private IP
  if (
    ipAddress === '127.0.0.1' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.')
  ) {
    flags.push('private_ip');
    riskScore = 20;
    riskLevel = 'low';
  }

  // Integrate with IP reputation API in production
  // Example response:
  // {
  //   fraud_score: 85,
  //   is_proxy: true,
  //   is_vpn: true,
  //   is_tor: false,
  //   is_crawler: false,
  //   recent_abuse: true,
  //   country_code: 'US',
  // }

  return {
    checkType: 'ip_reputation',
    riskScore,
    riskLevel,
    flags,
    passed: true,
    metadata: { ipAddress },
  };
}

/**
 * Additional checks for large transactions
 */
async function checkLargeTransaction(
  tx: any,
  escrow: EscrowAccount
): Promise<FraudCheckResult> {
  const flags: string[] = [];
  let riskScore = 30; // Base risk for large transactions
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  // Check if user has completed large transactions before
  const previousLargeEscrows = await tx
    .select({ count: sql<number>`count(*)` })
    .from(escrowAccounts)
    .where(
      and(
        eq(escrowAccounts.buyerId, escrow.buyerId),
        gte(escrowAccounts.totalAmount, 10000000), // >= $100k
        eq(escrowAccounts.status, 'completed')
      )
    );

  const hasLargeTransactionHistory = Number(previousLargeEscrows[0]?.count || 0) > 0;

  if (!hasLargeTransactionHistory) {
    flags.push('first_large_transaction');
    riskScore = 60;
    riskLevel = 'high';
  } else {
    flags.push('has_large_transaction_history');
    riskScore = 30;
    riskLevel = 'medium';
  }

  // Flag for manual review
  flags.push('requires_manual_review');

  return {
    checkType: 'large_transaction',
    riskScore,
    riskLevel,
    flags,
    passed: true, // Don't block, but flag for review
    metadata: {
      amount: escrow.totalAmount,
      hasLargeTransactionHistory,
    },
  };
}

/**
 * Calculate overall risk score from multiple checks
 */
function calculateOverallRiskScore(checks: FraudCheckResult[]): number {
  if (checks.length === 0) return 0;

  // Weighted average with higher weight for critical checks
  const weights = {
    velocity: 1.5,
    amount_anomaly: 1.0,
    cancel_pattern: 2.0,
    ip_reputation: 1.0,
    large_transaction: 0.5,
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const check of checks) {
    const weight = weights[check.checkType as keyof typeof weights] || 1.0;
    totalWeightedScore += check.riskScore * weight;
    totalWeight += weight;
  }

  return Math.round(totalWeightedScore / totalWeight);
}

/**
 * Get fraud check history for an escrow
 */
export async function getEscrowFraudChecks(escrowId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(escrowFraudChecks)
    .where(eq(escrowFraudChecks.escrowId, escrowId))
    .orderBy(desc(escrowFraudChecks.createdAt));
}

/**
 * Get user's fraud risk profile
 */
export async function getUserFraudProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get all user's escrows with fraud checks
  const escrows = await db
    .select()
    .from(escrowAccounts)
    .where(eq(escrowAccounts.buyerId, userId));

  const fraudChecks = await db
    .select()
    .from(escrowFraudChecks)
    .where(
      sql`${escrowFraudChecks.escrowId} IN (SELECT id FROM ${escrowAccounts} WHERE ${escrowAccounts.buyerId} = ${userId})`
    );

  // Calculate aggregate stats
  const totalEscrows = escrows.length;
  const flaggedEscrows = new Set(
    fraudChecks.filter((c) => !c.passed).map((c) => c.escrowId)
  ).size;
  const avgRiskScore =
    fraudChecks.length > 0
      ? Math.round(
          fraudChecks.reduce((sum, c) => sum + c.riskScore, 0) / fraudChecks.length
        )
      : 0;

  return {
    userId,
    totalEscrows,
    flaggedEscrows,
    flagRate: totalEscrows > 0 ? flaggedEscrows / totalEscrows : 0,
    avgRiskScore,
    recentChecks: fraudChecks.slice(0, 10),
  };
}
