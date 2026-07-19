import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { 
  shortletReviews, 
  reviewVotes,
  InsertShortletReview,
  InsertReviewVote 
} from "../drizzle/schema";

/**
 * Create a new review for a booking
 */
export async function createReview(review: InsertShortletReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [newReview] = await db.insert(shortletReviews).values(review).returning();
  return newReview;
}

/**
 * Get all reviews for a property with pagination
 */
export async function getPropertyReviews(propertyId: number, limit = 10, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const reviews = await db
    .select()
    .from(shortletReviews)
    .where(and(
      eq(shortletReviews.propertyId, propertyId),
      eq(shortletReviews.status, "published")
    ))
    .orderBy(desc(shortletReviews.createdAt))
    .limit(limit)
    .offset(offset);
  
  return reviews;
}

/**
 * Get review statistics for a property
 */
export async function getPropertyReviewStats(propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const stats = await db
    .select({
      totalReviews: sql<number>`count(*)`,
      avgOverallRating: sql<number>`avg(${shortletReviews.overallRating})`,
      avgCleanlinessRating: sql<number>`avg(${shortletReviews.cleanlinessRating})`,
      avgAccuracyRating: sql<number>`avg(${shortletReviews.accuracyRating})`,
      avgCommunicationRating: sql<number>`avg(${shortletReviews.communicationRating})`,
      avgLocationRating: sql<number>`avg(${shortletReviews.locationRating})`,
      avgValueRating: sql<number>`avg(${shortletReviews.valueRating})`,
    })
    .from(shortletReviews)
    .where(and(
      eq(shortletReviews.propertyId, propertyId),
      eq(shortletReviews.status, "published")
    ));
  
  return stats[0] || {
    totalReviews: 0,
    avgOverallRating: 0,
    avgCleanlinessRating: 0,
    avgAccuracyRating: 0,
    avgCommunicationRating: 0,
    avgLocationRating: 0,
    avgValueRating: 0,
  };
}

/**
 * Get reviews by a specific guest
 */
export async function getGuestReviews(guestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(shortletReviews)
    .where(eq(shortletReviews.guestId, guestId))
    .orderBy(desc(shortletReviews.createdAt));
}

/**
 * Get reviews for a host's properties
 */
export async function getHostReviews(hostId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(shortletReviews)
    .where(and(
      eq(shortletReviews.hostId, hostId),
      eq(shortletReviews.status, "published")
    ))
    .orderBy(desc(shortletReviews.createdAt));
}

/**
 * Add host response to a review
 */
export async function addHostResponse(reviewId: number, hostId: number, response: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [updated] = await db
    .update(shortletReviews)
    .set({
      hostResponse: response,
      hostRespondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(shortletReviews.id, reviewId),
      eq(shortletReviews.hostId, hostId)
    ))
    .returning();
  
  return updated;
}

/**
 * Vote on review helpfulness
 */
export async function voteOnReview(vote: InsertReviewVote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if user already voted
  const existingVote = await db
    .select()
    .from(reviewVotes)
    .where(and(
      eq(reviewVotes.reviewId, vote.reviewId),
      eq(reviewVotes.userId, vote.userId)
    ))
    .limit(1);
  
  if (existingVote.length > 0) {
    // Update existing vote
    await db
      .update(reviewVotes)
      .set({ isHelpful: vote.isHelpful })
      .where(and(
        eq(reviewVotes.reviewId, vote.reviewId),
        eq(reviewVotes.userId, vote.userId)
      ));
  } else {
    // Create new vote
    await db.insert(reviewVotes).values(vote);
  }
  
  // Update review helpful counts
  const votes = await db
    .select()
    .from(reviewVotes)
    .where(eq(reviewVotes.reviewId, vote.reviewId));
  
  const helpfulCount = votes.filter(v => v.isHelpful).length;
  const notHelpfulCount = votes.filter(v => !v.isHelpful).length;
  
  await db
    .update(shortletReviews)
    .set({ 
      helpfulCount, 
      notHelpfulCount,
      updatedAt: new Date(),
    })
    .where(eq(shortletReviews.id, vote.reviewId));
  
  return { helpfulCount, notHelpfulCount };
}

/**
 * Get user's vote on a review
 */
export async function getUserReviewVote(reviewId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [vote] = await db
    .select()
    .from(reviewVotes)
    .where(and(
      eq(reviewVotes.reviewId, reviewId),
      eq(reviewVotes.userId, userId)
    ))
    .limit(1);
  
  return vote;
}

/**
 * Check if user can review a booking
 */
export async function canUserReviewBooking(bookingId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if review already exists
  const existingReview = await db
    .select()
    .from(shortletReviews)
    .where(and(
      eq(shortletReviews.bookingId, bookingId),
      eq(shortletReviews.guestId, userId)
    ))
    .limit(1);
  
  return existingReview.length === 0;
}
