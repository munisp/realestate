import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createReview,
  getPropertyReviews,
  getPropertyReviewStats,
  getGuestReviews,
  getHostReviews,
  addHostResponse,
  voteOnReview,
  getUserReviewVote,
  canUserReviewBooking,
} from "../db-reviews";
import { storagePut } from "../storage";

export const reviewsRouter = router({
  /**
   * Upload review photo to S3
   */
  uploadPhoto: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Decode base64 file data
      const buffer = Buffer.from(input.fileData, "base64");

      // Generate unique file key with user ID and random suffix
      const randomSuffix = Math.random().toString(36).substring(2, 15);
      const fileExtension = input.fileName.split(".").pop();
      const fileKey = `reviews/${ctx.user.id}/${randomSuffix}.${fileExtension}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      return {
        url,
        fileKey,
      };
    }),
  /**
   * Create a new review for a booking
   */
  create: protectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
        propertyId: z.number(),
        hostId: z.number(),
        overallRating: z.number().min(1).max(5),
        cleanlinessRating: z.number().min(1).max(5).optional(),
        accuracyRating: z.number().min(1).max(5).optional(),
        communicationRating: z.number().min(1).max(5).optional(),
        locationRating: z.number().min(1).max(5).optional(),
        valueRating: z.number().min(1).max(5).optional(),
        reviewText: z.string().optional(),
        photos: z.array(z.string()).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user can review this booking
      const canReview = await canUserReviewBooking(input.bookingId, ctx.user.id);
      if (!canReview) {
        throw new Error("You have already reviewed this booking");
      }

      return await createReview({
        ...input,
        guestId: ctx.user.id,
        photos: input.photos ? JSON.stringify(input.photos) : null,
        isVerifiedBooking: true,
        status: "published",
      });
    }),

  /**
   * Get reviews for a property
   */
  getByProperty: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        limit: z.number().default(10),
        offset: z.number().default(0),
        sortBy: z.enum(["recent", "highest", "lowest"]).default("recent"),
      })
    )
    .query(async ({ input }) => {
      let reviews = await getPropertyReviews(input.propertyId, input.limit, input.offset);

      // Parse photos JSON
      reviews = reviews.map(review => ({
        ...review,
        photos: review.photos ? JSON.parse(review.photos) : [],
      }));

      // Sort reviews
      if (input.sortBy === "highest") {
        reviews.sort((a, b) => b.overallRating - a.overallRating);
      } else if (input.sortBy === "lowest") {
        reviews.sort((a, b) => a.overallRating - b.overallRating);
      }

      return reviews;
    }),

  /**
   * Get review statistics for a property
   */
  getStats: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      return await getPropertyReviewStats(input.propertyId);
    }),

  /**
   * Get reviews by current user
   */
  getMyReviews: protectedProcedure.query(async ({ ctx }) => {
    let reviews = await getGuestReviews(ctx.user.id);
    return reviews.map(review => ({
      ...review,
      photos: review.photos ? JSON.parse(review.photos) : [],
    }));
  }),

  /**
   * Get reviews for host's properties
   */
  getHostReviews: protectedProcedure
    .input(z.object({ hostId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const hostId = input.hostId || ctx.user.id;
      let reviews = await getHostReviews(hostId);
      return reviews.map(review => ({
        ...review,
        photos: review.photos ? JSON.parse(review.photos) : [],
      }));
    }),

  /**
   * Add host response to a review
   */
  addResponse: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
        response: z.string().min(10).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await addHostResponse(input.reviewId, ctx.user.id, input.response);
    }),

  /**
   * Vote on review helpfulness
   */
  vote: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
        isHelpful: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await voteOnReview({
        reviewId: input.reviewId,
        userId: ctx.user.id,
        isHelpful: input.isHelpful,
      });
    }),

  /**
   * Get user's vote on a review
   */
  getUserVote: protectedProcedure
    .input(z.object({ reviewId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getUserReviewVote(input.reviewId, ctx.user.id);
    }),

  // uploadPhoto endpoint removed - duplicate

  /**
   * Check if user can review a booking
   */
  canReview: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await canUserReviewBooking(input.bookingId, ctx.user.id);
    }),
});
