import { getDb } from '../db';
import { eq } from 'drizzle-orm';

// SMS Delivery Log table schema (add to drizzle/schema.ts)
export interface SMSDeliveryLog {
  id: number;
  userId?: number;
  phoneNumber: string;
  messageBody: string;
  messageType: 'alert' | 'valuation_change' | 'appointment_reminder' | 'general';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  messageId?: string;
  errorMessage?: string;
  provider: 'twilio' | 'mock';
  cost?: number; // in cents
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

/**
 * Log SMS delivery attempt
 */
export async function logSMSDelivery(log: {
  userId?: number;
  phoneNumber: string;
  messageBody: string;
  messageType: 'alert' | 'valuation_change' | 'appointment_reminder' | 'general';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  messageId?: string;
  errorMessage?: string;
  provider: 'twilio' | 'mock';
  cost?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[SMS Delivery Log] Database not available');
    return;
  }

  try {
    // Note: This is a placeholder. Add smsDeliveryLogs table to schema.ts
    console.log('[SMS Delivery Log] Logged:', {
      ...log,
      timestamp: new Date().toISOString(),
    });
    
    // TODO: Uncomment when smsDeliveryLogs table is added to schema
    // await db.insert(smsDeliveryLogs).values({
    //   userId: log.userId,
    //   phoneNumber: log.phoneNumber,
    //   messageBody: log.messageBody,
    //   messageType: log.messageType,
    //   status: log.status,
    //   messageId: log.messageId,
    //   errorMessage: log.errorMessage,
    //   provider: log.provider,
    //   cost: log.cost,
    //   sentAt: log.status === 'sent' ? new Date() : undefined,
    //   createdAt: new Date(),
    // });
  } catch (error) {
    console.error('[SMS Delivery Log] Failed to log delivery:', error);
  }
}

/**
 * Get SMS delivery statistics
 */
export async function getSMSDeliveryStats(userId?: number): Promise<{
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  totalCost: number;
}> {
  // Mock data for now
  return {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    deliveryRate: 0,
    totalCost: 0,
  };
}
