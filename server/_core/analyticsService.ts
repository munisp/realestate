/**
 * Analytics Service
 * 
 * Provides metrics and analytics for the admin dashboard
 * Aggregates data from various tables to provide insights
 */

import { getDb } from '../db';
import { 
  properties, users, transactions, escrowAccounts,
  propertyReports, userReports, propertyApprovals
} from '../../drizzle/schema';
import { sql, and, gte, lte, eq, count, avg, sum } from 'drizzle-orm';

export interface ModerationMetrics {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  averageResponseTimeHours: number;
  reportsByType: {
    property: number;
    user: number;
    review: number;
  };
  reportsByStatus: {
    pending: number;
    reviewing: number;
    resolved: number;
    dismissed: number;
  };
}

export interface PropertyMetrics {
  totalProperties: number;
  activeProperties: number;
  pendingApprovals: number;
  approvedToday: number;
  rejectedToday: number;
  averageApprovalTimeHours: number;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsersToday: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface TransactionMetrics {
  totalTransactions: number;
  activeTransactions: number;
  completedTransactions: number;
  totalVolume: number; // in cents
  averageTransactionValue: number; // in cents
}

export interface EscrowMetrics {
  totalEscrows: number;
  activeEscrows: number;
  completedEscrows: number;
  disputedEscrows: number;
  totalFundsHeld: number; // in cents
  totalFundsReleased: number; // in cents
  averageEscrowDurationDays: number;
}

export interface PlatformHealthMetrics {
  dailyActiveUsers: number;
  newListingsToday: number;
  searchesPerformed: number;
  messagesExchanged: number;
  averageResponseTime: number; // milliseconds
  errorRate: number; // percentage
}

/**
 * Get moderation metrics for admin dashboard
 */
export async function getModerationMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<ModerationMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      totalReports: 0,
      pendingReports: 0,
      resolvedReports: 0,
      averageResponseTimeHours: 0,
      reportsByType: { property: 0, user: 0, review: 0 },
      reportsByStatus: { pending: 0, reviewing: 0, resolved: 0, dismissed: 0 },
    };
  }

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const end = endDate || new Date();

  // Count property reports
  const propertyReportsCount = await db.select({ count: count() })
    .from(propertyReports)
    .where(and(
      gte(propertyReports.createdAt, start),
      lte(propertyReports.createdAt, end)
    ));

  const pendingPropertyReports = await db.select({ count: count() })
    .from(propertyReports)
    .where(eq(propertyReports.status, 'pending'));

  const resolvedPropertyReports = await db.select({ count: count() })
    .from(propertyReports)
    .where(eq(propertyReports.status, 'resolved'));

  // Count user reports
  const userReportsCount = await db.select({ count: count() })
    .from(userReports)
    .where(and(
      gte(userReports.createdAt, start),
      lte(userReports.createdAt, end)
    ));

  return {
    totalReports: (propertyReportsCount[0]?.count || 0) + (userReportsCount[0]?.count || 0),
    pendingReports: pendingPropertyReports[0]?.count || 0,
    resolvedReports: resolvedPropertyReports[0]?.count || 0,
    averageResponseTimeHours: 24, // Placeholder - calculate from actual data
    reportsByType: {
      property: propertyReportsCount[0]?.count || 0,
      user: userReportsCount[0]?.count || 0,
      review: 0,
    },
    reportsByStatus: {
      pending: pendingPropertyReports[0]?.count || 0,
      reviewing: 0,
      resolved: resolvedPropertyReports[0]?.count || 0,
      dismissed: 0,
    },
  };
}

/**
 * Get property metrics
 */
export async function getPropertyMetrics(): Promise<PropertyMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      totalProperties: 0,
      activeProperties: 0,
      pendingApprovals: 0,
      approvedToday: 0,
      rejectedToday: 0,
      averageApprovalTimeHours: 0,
    };
  }

  const totalProps = await db.select({ count: count() }).from(properties);
  const activeProps = await db.select({ count: count() })
    .from(properties)
    .where(eq(properties.status, 'active'));

  const pendingApprovals = await db.select({ count: count() })
    .from(propertyApprovals)
    .where(eq(propertyApprovals.status, 'pending'));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const approvedToday = await db.select({ count: count() })
    .from(propertyApprovals)
    .where(and(
      eq(propertyApprovals.status, 'approved'),
      gte(propertyApprovals.reviewedAt, today)
    ));

  return {
    totalProperties: totalProps[0]?.count || 0,
    activeProperties: activeProps[0]?.count || 0,
    pendingApprovals: pendingApprovals[0]?.count || 0,
    approvedToday: approvedToday[0]?.count || 0,
    rejectedToday: 0,
    averageApprovalTimeHours: 48, // Placeholder
  };
}

/**
 * Get user metrics
 */
export async function getUserMetrics(): Promise<UserMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      totalUsers: 0,
      activeUsersToday: 0,
      newUsersToday: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0,
    };
  }

  const totalUsers = await db.select({ count: count() }).from(users);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const newUsersToday = await db.select({ count: count() })
    .from(users)
    .where(gte(users.createdAt, today));

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsersWeek = await db.select({ count: count() })
    .from(users)
    .where(gte(users.createdAt, weekAgo));

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newUsersMonth = await db.select({ count: count() })
    .from(users)
    .where(gte(users.createdAt, monthAgo));

  const activeToday = await db.select({ count: count() })
    .from(users)
    .where(gte(users.lastSignedIn, today));

  return {
    totalUsers: totalUsers[0]?.count || 0,
    activeUsersToday: activeToday[0]?.count || 0,
    newUsersToday: newUsersToday[0]?.count || 0,
    newUsersThisWeek: newUsersWeek[0]?.count || 0,
    newUsersThisMonth: newUsersMonth[0]?.count || 0,
  };
}

/**
 * Get transaction metrics
 */
export async function getTransactionMetrics(): Promise<TransactionMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      totalTransactions: 0,
      activeTransactions: 0,
      completedTransactions: 0,
      totalVolume: 0,
      averageTransactionValue: 0,
    };
  }

  const totalTxns = await db.select({ count: count() }).from(transactions);
  
  const activeTxns = await db.select({ count: count() })
    .from(transactions)
    .where(eq(transactions.status, 'pending'));

  const completedTxns = await db.select({ count: count() })
    .from(transactions)
    .where(eq(transactions.status, 'completed'));

  // Calculate total volume
  const volumeResult = await db.select({
    total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`
  }).from(transactions);

  const avgResult = await db.select({
    avg: sql<number>`COALESCE(AVG(${transactions.amount}), 0)`
  }).from(transactions);

  return {
    totalTransactions: totalTxns[0]?.count || 0,
    activeTransactions: activeTxns[0]?.count || 0,
    completedTransactions: completedTxns[0]?.count || 0,
    totalVolume: Number(volumeResult[0]?.total) || 0,
    averageTransactionValue: Number(avgResult[0]?.avg) || 0,
  };
}

/**
 * Get escrow metrics
 */
export async function getEscrowMetrics(): Promise<EscrowMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      totalEscrows: 0,
      activeEscrows: 0,
      completedEscrows: 0,
      disputedEscrows: 0,
      totalFundsHeld: 0,
      totalFundsReleased: 0,
      averageEscrowDurationDays: 0,
    };
  }

  const totalEscrows = await db.select({ count: count() }).from(escrowAccounts);
  
  const activeEscrows = await db.select({ count: count() })
    .from(escrowAccounts)
    .where(eq(escrowAccounts.status, 'funded'));

  const completedEscrows = await db.select({ count: count() })
    .from(escrowAccounts)
    .where(eq(escrowAccounts.status, 'completed'));

  const disputedEscrows = await db.select({ count: count() })
    .from(escrowAccounts)
    .where(eq(escrowAccounts.status, 'disputed'));

  const fundsHeld = await db.select({
    total: sql<number>`COALESCE(SUM(${escrowAccounts.heldAmount}), 0)`
  }).from(escrowAccounts);

  const fundsReleased = await db.select({
    total: sql<number>`COALESCE(SUM(${escrowAccounts.releasedAmount}), 0)`
  }).from(escrowAccounts);

  return {
    totalEscrows: totalEscrows[0]?.count || 0,
    activeEscrows: activeEscrows[0]?.count || 0,
    completedEscrows: completedEscrows[0]?.count || 0,
    disputedEscrows: disputedEscrows[0]?.count || 0,
    totalFundsHeld: Number(fundsHeld[0]?.total) || 0,
    totalFundsReleased: Number(fundsReleased[0]?.total) || 0,
    averageEscrowDurationDays: 45, // Placeholder
  };
}

/**
 * Get platform health metrics
 */
export async function getPlatformHealthMetrics(): Promise<PlatformHealthMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      dailyActiveUsers: 0,
      newListingsToday: 0,
      searchesPerformed: 0,
      messagesExchanged: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeUsers = await db.select({ count: count() })
    .from(users)
    .where(gte(users.lastSignedIn, today));

  const newListings = await db.select({ count: count() })
    .from(properties)
    .where(gte(properties.createdAt, today));

  return {
    dailyActiveUsers: activeUsers[0]?.count || 0,
    newListingsToday: newListings[0]?.count || 0,
    searchesPerformed: 0, // Would need to track this separately
    messagesExchanged: 0, // Would need to track this separately
    averageResponseTime: 150, // Placeholder - ms
    errorRate: 0.5, // Placeholder - 0.5%
  };
}

/**
 * Get comprehensive dashboard metrics
 */
export async function getDashboardMetrics() {
  const [moderation, property, user, transaction, escrow, health] = await Promise.all([
    getModerationMetrics(),
    getPropertyMetrics(),
    getUserMetrics(),
    getTransactionMetrics(),
    getEscrowMetrics(),
    getPlatformHealthMetrics(),
  ]);

  return {
    moderation,
    property,
    user,
    transaction,
    escrow,
    health,
    generatedAt: new Date(),
  };
}

/**
 * Get metrics for a specific time range
 */
export async function getMetricsByTimeRange(
  startDate: Date,
  endDate: Date
) {
  return {
    moderation: await getModerationMetrics(startDate, endDate),
    // Add other time-ranged metrics as needed
  };
}
