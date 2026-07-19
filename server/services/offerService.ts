// @ts-nocheck
import { eq, and, or, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  offers,
  counteroffers,
  offerActivityLog,
  type InsertOffer,
  type Offer,
  type InsertCounteroffer,
  type Counteroffer,
  type InsertOfferActivityLog,
} from "../../drizzle/schema";

/**
 * Offer Management Service
 * Handles offer submission, counteroffers, and negotiation tracking
 */

/**
 * Create a new offer
 */
export async function createOffer(data: InsertOffer, userId: number): Promise<Offer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Set expiration if not provided (default 48 hours)
  if (!data.expiresAt) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    data.expiresAt = expiresAt;
  }

  const [offer] = await db.insert(offers).values(data).$returningId();
  
  const [created] = await db
    .select()
    .from(offers)
    .where(eq(offers.id, offer.id));

  // Log activity
  await logOfferActivity({
    offerId: created.id,
    userId,
    activityType: "created",
    description: `Offer created for $${data.offerAmount.toLocaleString()}`,
  });

  return created;
}

/**
 * Get offer by ID
 */
export async function getOfferById(offerId: number): Promise<Offer | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [offer] = await db
    .select()
    .from(offers)
    .where(eq(offers.id, offerId));

  return offer;
}

/**
 * Get offers for a property
 */
export async function getPropertyOffers(propertyId: number): Promise<Offer[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(offers)
    .where(eq(offers.propertyId, propertyId))
    .orderBy(desc(offers.createdAt));
}

/**
 * Get offers made by a buyer
 */
export async function getBuyerOffers(buyerId: number): Promise<Offer[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(offers)
    .where(eq(offers.buyerId, buyerId))
    .orderBy(desc(offers.createdAt));
}

/**
 * Get offers received by a seller
 */
export async function getSellerOffers(sellerId: number): Promise<Offer[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(offers)
    .where(eq(offers.sellerId, sellerId))
    .orderBy(desc(offers.createdAt));
}

/**
 * Update offer status
 */
export async function updateOfferStatus(
  offerId: number,
  status: "pending" | "accepted" | "rejected" | "countered" | "withdrawn" | "expired",
  userId: number
): Promise<Offer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(offers)
    .set({ status })
    .where(eq(offers.id, offerId));

  const [updated] = await db
    .select()
    .from(offers)
    .where(eq(offers.id, offerId));

  // Log activity
  await logOfferActivity({
    offerId,
    userId,
    activityType: status as any,
    description: `Offer ${status}`,
  });

  return updated;
}

/**
 * Create a counteroffer
 */
export async function createCounteroffer(
  data: InsertCounteroffer,
  userId: number
): Promise<Counteroffer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Set expiration if not provided (default 24 hours)
  if (!data.expiresAt) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    data.expiresAt = expiresAt;
  }

  const [counteroffer] = await db.insert(counteroffers).values(data).$returningId();
  
  const [created] = await db
    .select()
    .from(counteroffers)
    .where(eq(counteroffers.id, counteroffer.id));

  // Update original offer status to "countered"
  await updateOfferStatus(data.offerId, "countered", userId);

  // Log activity
  await logOfferActivity({
    offerId: data.offerId,
    userId,
    activityType: "countered",
    description: `Counteroffer created for $${data.counterAmount.toLocaleString()}`,
  });

  return created;
}

/**
 * Get counteroffers for an offer
 */
export async function getOfferCounteroffers(offerId: number): Promise<Counteroffer[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(counteroffers)
    .where(eq(counteroffers.offerId, offerId))
    .orderBy(desc(counteroffers.createdAt));
}

/**
 * Accept a counteroffer
 */
export async function acceptCounteroffer(
  counterofferId: number,
  userId: number
): Promise<Counteroffer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(counteroffers)
    .set({ status: "accepted" })
    .where(eq(counteroffers.id, counterofferId));

  const [updated] = await db
    .select()
    .from(counteroffers)
    .where(eq(counteroffers.id, counterofferId));

  // Update original offer to accepted
  await updateOfferStatus(updated.offerId, "accepted", userId);

  // Log activity
  await logOfferActivity({
    offerId: updated.offerId,
    userId,
    activityType: "accepted",
    description: `Counteroffer accepted at $${updated.counterAmount.toLocaleString()}`,
  });

  return updated;
}

/**
 * Sign an offer (buyer or seller)
 */
export async function signOffer(
  offerId: number,
  userId: number,
  signature: string,
  role: "buyer" | "seller"
): Promise<Offer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (role === "buyer") {
    updateData.buyerSignature = signature;
    updateData.buyerSignedAt = new Date();
  } else {
    updateData.sellerSignature = signature;
    updateData.sellerSignedAt = new Date();
  }

  await db
    .update(offers)
    .set(updateData)
    .where(eq(offers.id, offerId));

  const [updated] = await db
    .select()
    .from(offers)
    .where(eq(offers.id, offerId));

  // Log activity
  await logOfferActivity({
    offerId,
    userId,
    activityType: "signed",
    description: `Offer signed by ${role}`,
  });

  return updated;
}

/**
 * Log offer activity
 */
export async function logOfferActivity(data: InsertOfferActivityLog): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(offerActivityLog).values(data);
}

/**
 * Get offer activity log
 */
export async function getOfferActivity(offerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(offerActivityLog)
    .where(eq(offerActivityLog.offerId, offerId))
    .orderBy(desc(offerActivityLog.createdAt));
}

/**
 * Withdraw an offer
 */
export async function withdrawOffer(offerId: number, userId: number): Promise<Offer> {
  return updateOfferStatus(offerId, "withdrawn", userId);
}

/**
 * Check and expire old offers
 */
export async function expireOldOffers(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();

  const expiredOffers = await db
    .select()
    .from(offers)
    .where(
      and(
        eq(offers.status, "pending"),
        or(
          eq(offers.expiresAt, null),
          // @ts-ignore
          (offers.expiresAt < now)
        )
      )
    );

  for (const offer of expiredOffers) {
    await updateOfferStatus(offer.id, "expired", offer.sellerId);
  }

  return expiredOffers.length;
}
