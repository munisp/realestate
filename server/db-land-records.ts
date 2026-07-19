import { getDb } from "./db";
import { eq, and, desc, like, or } from "drizzle-orm";
import {
  landRecords,
  certificateOfOccupancy,
  landOwnershipHistory,
  landDocuments,
  landVerificationRequests,
  governmentRegistrySync,
  type LandRecord,
  type InsertLandRecord,
  type CertificateOfOccupancy,
  type InsertCertificateOfOccupancy,
  type LandOwnershipHistory,
  type InsertLandOwnershipHistory,
  type LandDocument,
  type InsertLandDocument,
} from "../drizzle/schema";

/**
 * Land Records Database Service
 * Handles all database operations for land records, C of O, and related entities
 */

// ==================== LAND RECORDS ====================

export async function createLandRecord(
  data: InsertLandRecord
): Promise<LandRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db.insert(landRecords).values(data).returning();
  return record;
}

export async function getLandRecordById(id: number): Promise<LandRecord | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .select()
    .from(landRecords)
    .where(eq(landRecords.id, id))
    .limit(1);

  return record;
}

export async function getLandRecordByParcelId(
  parcelId: string
): Promise<LandRecord | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .select()
    .from(landRecords)
    .where(eq(landRecords.parcelId, parcelId))
    .limit(1);

  return record;
}

export async function getLandRecordsByOwner(
  ownerId: number
): Promise<LandRecord[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(landRecords)
    .where(eq(landRecords.currentOwnerId, ownerId))
    .orderBy(desc(landRecords.createdAt));
}

export async function searchLandRecords(params: {
  query?: string;
  city?: string;
  state?: string;
  landUseType?: string;
  isVerified?: boolean;
  isOnBlockchain?: boolean;
  limit?: number;
  offset?: number;
}): Promise<LandRecord[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(landRecords);

  const conditions = [];

  if (params.query) {
    conditions.push(
      or(
        like(landRecords.parcelId, `%${params.query}%`),
        like(landRecords.address, `%${params.query}%`)
      )
    );
  }

  if (params.city) {
    conditions.push(eq(landRecords.city, params.city));
  }

  if (params.state) {
    conditions.push(eq(landRecords.state, params.state));
  }

  if (params.landUseType) {
    conditions.push(eq(landRecords.landUseType, params.landUseType as any));
  }

  if (params.isVerified !== undefined) {
    conditions.push(eq(landRecords.isVerified, params.isVerified));
  }

  if (params.isOnBlockchain !== undefined) {
    conditions.push(eq(landRecords.isOnBlockchain, params.isOnBlockchain));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(landRecords.createdAt)) as any;

  if (params.limit) {
    query = query.limit(params.limit) as any;
  }

  if (params.offset) {
    query = query.offset(params.offset) as any;
  }

  return await query;
}

export async function updateLandRecord(
  id: number,
  data: Partial<InsertLandRecord>
): Promise<LandRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .update(landRecords)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(landRecords.id, id))
    .returning();

  return record;
}

// ==================== CERTIFICATE OF OCCUPANCY ====================

export async function createCertificateOfOccupancy(
  data: InsertCertificateOfOccupancy
): Promise<CertificateOfOccupancy> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .insert(certificateOfOccupancy)
    .values(data)
    .returning();
  return record;
}

export async function getCofOById(
  id: number
): Promise<CertificateOfOccupancy | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .select()
    .from(certificateOfOccupancy)
    .where(eq(certificateOfOccupancy.id, id))
    .limit(1);

  return record;
}

export async function getCofOByNumber(
  cofONumber: string
): Promise<CertificateOfOccupancy | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .select()
    .from(certificateOfOccupancy)
    .where(eq(certificateOfOccupancy.cofONumber, cofONumber))
    .limit(1);

  return record;
}

export async function getCofOByLandRecord(
  landRecordId: number
): Promise<CertificateOfOccupancy | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .select()
    .from(certificateOfOccupancy)
    .where(eq(certificateOfOccupancy.landRecordId, landRecordId))
    .limit(1);

  return record;
}

export async function updateCofO(
  id: number,
  data: Partial<InsertCertificateOfOccupancy>
): Promise<CertificateOfOccupancy> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .update(certificateOfOccupancy)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(certificateOfOccupancy.id, id))
    .returning();

  return record;
}

// ==================== OWNERSHIP HISTORY ====================

export async function createOwnershipTransfer(
  data: InsertLandOwnershipHistory
): Promise<LandOwnershipHistory> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .insert(landOwnershipHistory)
    .values(data)
    .returning();
  return record;
}

export async function getOwnershipHistory(
  landRecordId: number
): Promise<LandOwnershipHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(landOwnershipHistory)
    .where(eq(landOwnershipHistory.landRecordId, landRecordId))
    .orderBy(desc(landOwnershipHistory.transferDate));
}

export async function getOwnershipTransferById(
  id: number
): Promise<LandOwnershipHistory | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .select()
    .from(landOwnershipHistory)
    .where(eq(landOwnershipHistory.id, id))
    .limit(1);

  return record;
}

// ==================== LAND DOCUMENTS ====================

export async function createLandDocument(
  data: InsertLandDocument
): Promise<LandDocument> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db.insert(landDocuments).values(data).returning();
  return record;
}

export async function getLandDocumentById(
  id: number
): Promise<LandDocument | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .select()
    .from(landDocuments)
    .where(eq(landDocuments.id, id))
    .limit(1);

  return record;
}

export async function getLandDocumentsByLandRecord(
  landRecordId: number
): Promise<LandDocument[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(landDocuments)
    .where(eq(landDocuments.landRecordId, landRecordId))
    .orderBy(desc(landDocuments.createdAt));
}

export async function getLandDocumentsByType(
  landRecordId: number,
  documentType: string
): Promise<LandDocument[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(landDocuments)
    .where(
      and(
        eq(landDocuments.landRecordId, landRecordId),
        eq(landDocuments.documentType, documentType as any)
      )
    )
    .orderBy(desc(landDocuments.createdAt));
}

export async function updateLandDocument(
  id: number,
  data: Partial<InsertLandDocument>
): Promise<LandDocument> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .update(landDocuments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(landDocuments.id, id))
    .returning();

  return record;
}

export async function deleteLandDocument(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(landDocuments).where(eq(landDocuments.id, id));
}

// ==================== VERIFICATION REQUESTS ====================

export async function getPendingVerificationRequests(
  limit?: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db
    .select()
    .from(landVerificationRequests)
    .where(eq(landVerificationRequests.status, "pending"))
    .orderBy(desc(landVerificationRequests.requestedAt));

  if (limit) {
    query = query.limit(limit) as any;
  }

  return await query;
}

export async function getVerificationRequestById(
  id: number
): Promise<any | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .select()
    .from(landVerificationRequests)
    .where(eq(landVerificationRequests.id, id))
    .limit(1);

  return record;
}

export async function getVerificationRequestsByUser(
  userId: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(landVerificationRequests)
    .where(eq(landVerificationRequests.requestedBy, userId))
    .orderBy(desc(landVerificationRequests.requestedAt));
}

// ==================== STATISTICS ====================

export async function getLandRecordsStats(): Promise<{
  total: number;
  verified: number;
  onBlockchain: number;
  byState: Record<string, number>;
  byLandUseType: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allRecords = await db.select().from(landRecords);

  const stats = {
    total: allRecords.length,
    verified: allRecords.filter((r) => r.isVerified).length,
    onBlockchain: allRecords.filter((r) => r.isOnBlockchain).length,
    byState: {} as Record<string, number>,
    byLandUseType: {} as Record<string, number>,
  };

  // Count by state
  allRecords.forEach((record) => {
    const state = record.state;
    stats.byState[state] = (stats.byState[state] || 0) + 1;
  });

  // Count by land use type
  allRecords.forEach((record) => {
    const type = record.landUseType;
    stats.byLandUseType[type] = (stats.byLandUseType[type] || 0) + 1;
  });

  return stats;
}
