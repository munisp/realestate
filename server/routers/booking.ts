import { z } from 'zod';
import { rateLimitedPublicProcedure as publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { shortLetBookings, shortLetProperties, messages, users } from '../../drizzle/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { processRefund } from '../services/stripePaymentService';

export const bookingRouter = router({
  // Check availability for booking
  checkAvailability: publicProcedure
    .input(z.object({
      propertyId: z.number(),
      checkIn: z.string(),
      checkOut: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const checkInDate = new Date(input.checkIn);
      const checkOutDate = new Date(input.checkOut);

      // Check for overlapping bookings
      const overlappingBookings = await db
        .select()
        .from(shortLetBookings)
        .where(
          and(
            eq(shortLetBookings.propertyId, input.propertyId),
            or(
              eq(shortLetBookings.status, 'confirmed'),
              eq(shortLetBookings.status, 'checked_in')
            ),
            or(
              // New booking starts during existing booking
              and(
                gte(shortLetBookings.checkIn, checkInDate),
                lte(shortLetBookings.checkIn, checkOutDate)
              ),
              // New booking ends during existing booking
              and(
                gte(shortLetBookings.checkOut, checkInDate),
                lte(shortLetBookings.checkOut, checkOutDate)
              ),
              // New booking encompasses existing booking
              and(
                lte(shortLetBookings.checkIn, checkInDate),
                gte(shortLetBookings.checkOut, checkOutDate)
              )
            )
          )
        );

      return {
        available: overlappingBookings.length === 0,
        conflictingBookings: overlappingBookings.length,
      };
    }),

  // Instant booking - immediately confirm
  instantBook: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      checkIn: z.string(),
      checkOut: z.string(),
      numberOfGuests: z.number(),
      specialRequests: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const checkInDate = new Date(input.checkIn);
      const checkOutDate = new Date(input.checkOut);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get property details
      const property = await db
        .select()
        .from(shortLetProperties)
        .where(eq(shortLetProperties.id, input.propertyId))
        .limit(1);

      if (!property || property.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      const prop = property[0];

      // Check if property allows instant booking
      if (!prop.instantBooking) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'This property does not allow instant booking. Please use "Request to Book" instead.' 
        });
      }

      // Check availability
      const availabilityCheck = await db
        .select()
        .from(shortLetBookings)
        .where(
          and(
            eq(shortLetBookings.propertyId, input.propertyId),
            or(
              eq(shortLetBookings.status, 'confirmed'),
              eq(shortLetBookings.status, 'checked_in')
            ),
            or(
              and(gte(shortLetBookings.checkIn, checkInDate), lte(shortLetBookings.checkIn, checkOutDate)),
              and(gte(shortLetBookings.checkOut, checkInDate), lte(shortLetBookings.checkOut, checkOutDate)),
              and(lte(shortLetBookings.checkIn, checkInDate), gte(shortLetBookings.checkOut, checkOutDate))
            )
          )
        );

      if (availabilityCheck.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Property is not available for selected dates' });
      }

      // Calculate pricing
      const nightlyRate = prop.nightlyRate || 0;
      const cleaningFee = prop.cleaningFee || 0;
      const serviceFee = Math.round(nightlyRate * nights * 0.1); // 10% service fee
      const totalAmount = (nightlyRate * nights) + cleaningFee + serviceFee;

      // Create booking with confirmed status
      const [booking] = await db
        .insert(shortLetBookings)
        .values({
          propertyId: input.propertyId,
          guestId: ctx.user.id,
          hostId: prop.hostId || 1, // Default to property owner
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights,
          numberOfGuests: input.numberOfGuests,
          nightlyRate,
          totalNights: nights,
          cleaningFee,
          serviceFee,
          totalAmount,
          status: 'confirmed', // Instant booking is auto-confirmed
          paymentStatus: 'pending',
          specialRequests: input.specialRequests,
        })
        .returning();

      return {
        success: true,
        booking,
        message: 'Booking confirmed! You will receive a confirmation email shortly.',
      };
    }),

  // Request to book - requires host approval
  requestToBook: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      checkIn: z.string(),
      checkOut: z.string(),
      numberOfGuests: z.number(),
      message: z.string(),
      specialRequests: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const checkInDate = new Date(input.checkIn);
      const checkOutDate = new Date(input.checkOut);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get property details
      const property = await db
        .select()
        .from(shortLetProperties)
        .where(eq(shortLetProperties.id, input.propertyId))
        .limit(1);

      if (!property || property.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      const prop = property[0];

      // Check availability
      const availabilityCheck = await db
        .select()
        .from(shortLetBookings)
        .where(
          and(
            eq(shortLetBookings.propertyId, input.propertyId),
            or(
              eq(shortLetBookings.status, 'confirmed'),
              eq(shortLetBookings.status, 'checked_in'),
              eq(shortLetBookings.status, 'pending') // Also block pending requests
            ),
            or(
              and(gte(shortLetBookings.checkIn, checkInDate), lte(shortLetBookings.checkIn, checkOutDate)),
              and(gte(shortLetBookings.checkOut, checkInDate), lte(shortLetBookings.checkOut, checkOutDate)),
              and(lte(shortLetBookings.checkIn, checkInDate), gte(shortLetBookings.checkOut, checkOutDate))
            )
          )
        );

      if (availabilityCheck.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Property is not available for selected dates' });
      }

      // Calculate pricing
      const nightlyRate = prop.nightlyRate || 0;
      const cleaningFee = prop.cleaningFee || 0;
      const serviceFee = Math.round(nightlyRate * nights * 0.1);
      const totalAmount = (nightlyRate * nights) + cleaningFee + serviceFee;

      // Create booking with pending status
      const [booking] = await db
        .insert(shortLetBookings)
        .values({
          propertyId: input.propertyId,
          guestId: ctx.user.id,
          hostId: prop.hostId || 1,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights,
          numberOfGuests: input.numberOfGuests,
          nightlyRate,
          totalNights: nights,
          cleaningFee,
          serviceFee,
          totalAmount,
          status: 'pending', // Requires host approval
          paymentStatus: 'pending',
          specialRequests: input.specialRequests,
        })
        .returning();

      // Send message to host
      await db.insert(messages).values({
        senderId: ctx.user.id,
        receiverId: prop.hostId || 1,
        propertyId: input.propertyId,
        subject: `Booking Request for ${prop.title}`,
        content: `${ctx.user.name} has requested to book your property from ${checkInDate.toLocaleDateString()} to ${checkOutDate.toLocaleDateString()}.\n\nGuest message: ${input.message}`,
        isRead: 0,
      });

      return {
        success: true,
        booking,
        message: 'Booking request sent! The host will respond within 24 hours.',
      };
    }),

  // Get user's bookings
  getMyBookings: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const bookings = await db
        .select({
          booking: shortLetBookings,
          property: shortLetProperties,
        })
        .from(shortLetBookings)
        .leftJoin(shortLetProperties, eq(shortLetBookings.propertyId, shortLetProperties.id))
        .where(eq(shortLetBookings.guestId, ctx.user.id))
        .orderBy(shortLetBookings.createdAt);

      return bookings;
    }),

  // Get host's bookings (properties they own)
  getHostBookings: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const bookings = await db
        .select({
          booking: shortLetBookings,
          property: shortLetProperties,
          guest: users,
        })
        .from(shortLetBookings)
        .leftJoin(shortLetProperties, eq(shortLetBookings.propertyId, shortLetProperties.id))
        .leftJoin(users, eq(shortLetBookings.guestId, users.id))
        .where(eq(shortLetBookings.hostId, ctx.user.id))
        .orderBy(shortLetBookings.createdAt);

      return bookings;
    }),

  // Host approves booking request
  approveBooking: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      // Get booking
      const booking = await db
        .select()
        .from(shortLetBookings)
        .where(eq(shortLetBookings.id, input.bookingId))
        .limit(1);

      if (!booking || booking.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      // Verify user is the host
      if (booking[0].hostId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the host can approve this booking' });
      }

      // Update booking status
      await db
        .update(shortLetBookings)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(eq(shortLetBookings.id, input.bookingId));

      // Send confirmation message to guest
      await db.insert(messages).values({
        senderId: ctx.user.id,
        receiverId: booking[0].guestId,
        propertyId: booking[0].propertyId,
        subject: 'Booking Request Approved',
        content: `Great news! Your booking request has been approved. Please proceed with payment to complete your reservation.`,
        isRead: 0,
      });

      return { success: true, message: 'Booking approved successfully' };
    }),

  // Cancel booking
  cancelBooking: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      // Get booking
      const booking = await db
        .select()
        .from(shortLetBookings)
        .where(eq(shortLetBookings.id, input.bookingId))
        .limit(1);

      if (!booking || booking.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      // Verify user is guest or host
      if (booking[0].guestId !== ctx.user.id && booking[0].hostId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You cannot cancel this booking' });
      }

      // Process refund if payment was made
      if (booking[0].paymentStatus === 'paid' && booking[0].paymentId) {
        try {
          await processRefund({
            paymentIntentId: booking[0].paymentId,
            reason: input.reason || 'Booking cancelled',
          });
          
          // Update booking status and payment status
          await db
            .update(shortLetBookings)
            .set({ 
              status: 'cancelled', 
              paymentStatus: 'refunded',
              updatedAt: new Date() 
            })
            .where(eq(shortLetBookings.id, input.bookingId));
        } catch (error) {
          console.error('[Booking] Refund failed:', error);
          // Still cancel booking but note refund failure
          await db
            .update(shortLetBookings)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(shortLetBookings.id, input.bookingId));
          
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'Booking cancelled but refund processing failed. Please contact support.' 
          });
        }
      } else {
        // No payment to refund, just cancel
        await db
          .update(shortLetBookings)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(shortLetBookings.id, input.bookingId));
      }

      // Send cancellation message
      const recipientId = booking[0].guestId === ctx.user.id ? booking[0].hostId : booking[0].guestId;
      await db.insert(messages).values({
        senderId: ctx.user.id,
        receiverId: recipientId,
        propertyId: booking[0].propertyId,
        subject: 'Booking Cancelled',
        content: `This booking has been cancelled. ${input.reason ? `Reason: ${input.reason}` : ''}`,
        isRead: 0,
      });

      return { success: true, message: 'Booking cancelled successfully' };
    }),
});
