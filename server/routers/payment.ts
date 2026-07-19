import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { shortLetBookings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import {
  createPaymentIntent,
  getPaymentIntent,
  processRefund,
  cancelPaymentIntent,
  calculateTotalAmount,
} from '../services/stripePaymentService';

export const paymentRouter = router({
  /**
   * Create a payment intent for a booking
   */
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
        currency: z.string().default('ngn'), // Nigerian Naira
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get booking details
      const [booking] = await db
        .select()
        .from(shortLetBookings)
        .where(eq(shortLetBookings.id, input.bookingId))
        .limit(1);

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Verify user is the guest
      if (booking.guestId !== ctx.user.id) {
        throw new Error('Unauthorized: You can only pay for your own bookings');
      }

      // Check if already paid
      if (booking.paymentStatus === 'paid') {
        throw new Error('Booking has already been paid');
      }

      // Create payment intent
      const paymentIntent = await createPaymentIntent({
        bookingId: booking.id,
        amount: booking.totalAmount * 100, // Convert to kobo (smallest unit)
        currency: input.currency,
        customerEmail: ctx.user.email || '',
        metadata: {
          bookingId: booking.id.toString(),
          guestId: booking.guestId.toString(),
          hostId: booking.hostId.toString(),
          propertyId: booking.propertyId.toString(),
        },
      });

      // Update booking with payment intent ID
      await db
        .update(shortLetBookings)
        .set({
          paymentId: paymentIntent.paymentIntentId,
          updatedAt: new Date(),
        })
        .where(eq(shortLetBookings.id, booking.id));

      return {
        success: true,
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.paymentIntentId,
        amount: booking.totalAmount,
        currency: input.currency,
      };
    }),

  /**
   * Get payment status for a booking
   */
  getPaymentStatus: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [booking] = await db
        .select()
        .from(shortLetBookings)
        .where(eq(shortLetBookings.id, input.bookingId))
        .limit(1);

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Verify user is guest or host
      if (booking.guestId !== ctx.user.id && booking.hostId !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      let paymentDetails = null;
      if (booking.paymentId) {
        try {
          const result = await getPaymentIntent(booking.paymentId);
          paymentDetails = result.paymentIntent;
        } catch (error) {
          console.error('[Payment] Error fetching payment intent:', error);
        }
      }

      return {
        bookingId: booking.id,
        paymentStatus: booking.paymentStatus,
        totalAmount: booking.totalAmount,
        paymentId: booking.paymentId,
        paymentDetails,
      };
    }),

  /**
   * Process refund for a cancelled booking
   */
  processRefund: protectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
        reason: z.string().optional(),
        partialAmount: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [booking] = await db
        .select()
        .from(shortLetBookings)
        .where(eq(shortLetBookings.id, input.bookingId))
        .limit(1);

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Verify user is guest or host
      if (booking.guestId !== ctx.user.id && booking.hostId !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      // Check if booking is paid
      if (booking.paymentStatus !== 'paid') {
        throw new Error('Cannot refund: Booking has not been paid');
      }

      // Check if booking is cancelled
      if (booking.status !== 'cancelled') {
        throw new Error('Cannot refund: Booking must be cancelled first');
      }

      if (!booking.paymentId) {
        throw new Error('No payment ID found for this booking');
      }

      // Process refund
      const refund = await processRefund({
        paymentIntentId: booking.paymentId,
        amount: input.partialAmount ? input.partialAmount * 100 : undefined,
        reason: input.reason,
      });

      // Update booking payment status
      await db
        .update(shortLetBookings)
        .set({
          paymentStatus: 'refunded',
          updatedAt: new Date(),
        })
        .where(eq(shortLetBookings.id, booking.id));

      return {
        success: true,
        refundId: refund.refundId,
        amount: refund.amount / 100, // Convert back from kobo
        status: refund.status,
        message: 'Refund processed successfully',
      };
    }),

  /**
   * Cancel payment intent (before payment is completed)
   */
  cancelPayment: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [booking] = await db
        .select()
        .from(shortLetBookings)
        .where(eq(shortLetBookings.id, input.bookingId))
        .limit(1);

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Verify user is the guest
      if (booking.guestId !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      // Check if already paid
      if (booking.paymentStatus === 'paid') {
        throw new Error('Cannot cancel: Payment has already been completed');
      }

      if (!booking.paymentId) {
        throw new Error('No payment intent to cancel');
      }

      // Cancel payment intent
      await cancelPaymentIntent(booking.paymentId);

      // Update booking
      await db
        .update(shortLetBookings)
        .set({
          paymentStatus: 'pending',
          paymentId: null,
          updatedAt: new Date(),
        })
        .where(eq(shortLetBookings.id, booking.id));

      return {
        success: true,
        message: 'Payment cancelled successfully',
      };
    }),

  /**
   * Calculate booking price
   */
  calculatePrice: protectedProcedure
    .input(
      z.object({
        nightlyRate: z.number(),
        nights: z.number(),
        cleaningFee: z.number().optional().default(0),
      })
    )
    .query(({ input }) => {
      const result = calculateTotalAmount(
        input.nightlyRate,
        input.nights,
        input.cleaningFee
      );

      return {
        nightlyTotal: result.nightlyTotal,
        cleaningFee: input.cleaningFee,
        serviceFee: result.serviceFee,
        totalAmount: result.totalAmount,
        breakdown: {
          nights: input.nights,
          nightlyRate: input.nightlyRate,
          serviceFeePercentage: 10, // 10%
        },
      };
    }),

  /**
   * Get payment history for user
   */
  getPaymentHistory: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().optional().default(10),
          offset: z.number().optional().default(0),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const limit = input?.limit || 10;
      const offset = input?.offset || 0;

      // Get bookings where user is guest
      const bookings = await db
        .select()
        .from(shortLetBookings)
        .where(eq(shortLetBookings.guestId, ctx.user.id))
        .limit(limit)
        .offset(offset);

      return {
        bookings: bookings.map((booking) => ({
          bookingId: booking.id,
          propertyId: booking.propertyId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          totalAmount: booking.totalAmount,
          paymentStatus: booking.paymentStatus,
          bookingStatus: booking.status,
          createdAt: booking.createdAt,
        })),
        pagination: {
          limit,
          offset,
          hasMore: bookings.length === limit,
        },
      };
    }),
});
