import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { properties, appointments, transactions, shortLetProperties, shortLetBookings, shortletReviews, savedMapSearches, shortletAvailability, savedMapSearchAlerts } from '../../drizzle/schema';
import { eq, and, gte, lte, between, desc, sql } from 'drizzle-orm';

export const shortletRouter = router({
  // Get shortlet listings
  getListings: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        guests: z.number().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        amenities: z.array(z.string()).optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { properties: [], total: 0 };

      let query = db
        .select()
        .from(properties)
        .where(eq(properties.listingType, 'shortlet'));

      // Filter by city
      if (input.city) {
        query = query.where(
          and(
            eq(properties.listingType, 'shortlet'),
            eq(properties.city, input.city)
          )
        ) as any;
      }

      // Filter by price range
      if (input.minPrice || input.maxPrice) {
        const conditions = [eq(properties.listingType, 'shortlet')];
        if (input.minPrice) {
          conditions.push(gte(properties.price, input.minPrice));
        }
        if (input.maxPrice) {
          conditions.push(lte(properties.price, input.maxPrice));
        }
        query = query.where(and(...conditions)) as any;
      }

      const results = await query.limit(input.limit).offset(input.offset);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(properties)
        .where(eq(properties.listingType, 'shortlet'));

      return {
        properties: results.map((p) => ({
          ...p,
          pricePerNight: p.price, // Daily rate
          minStay: 1,
          maxStay: 30,
          instantBook: true,
        })),
        total: countResult[0]?.count || 0,
      };
    }),

  // Get shortlet details with availability
  getDetails: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const property = await db
        .select()
        .from(properties)
        .where(
          and(
            eq(properties.id, input.propertyId),
            eq(properties.listingType, 'shortlet')
          )
        )
        .limit(1);

      if (property.length === 0) return null;

      // Get bookings for next 90 days
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 90);

      const bookings = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.propertyId, input.propertyId),
            gte(appointments.appointmentDate, today),
            lte(appointments.appointmentDate, futureDate),
            eq(appointments.status, 'confirmed')
          )
        );

      // Calculate blocked dates
      const blockedDates = bookings.map((b) => ({
        start: b.appointmentDate,
        end: new Date(b.appointmentDate.getTime() + 24 * 60 * 60 * 1000), // Add 1 day
      }));

      return {
        ...property[0],
        pricePerNight: property[0].price,
        cleaningFee: Math.round(property[0].price * 0.15), // 15% cleaning fee
        serviceFee: Math.round(property[0].price * 0.10), // 10% service fee
        minStay: 1,
        maxStay: 30,
        instantBook: true,
        blockedDates,
        houseRules: [
          'No smoking',
          'No pets',
          'No parties or events',
          'Check-in after 2:00 PM',
          'Check-out before 11:00 AM',
        ],
        amenities: property[0].amenities || [],
        cancellationPolicy: 'flexible', // flexible, moderate, strict
      };
    }),

  // Check availability
  checkAvailability: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        checkIn: z.string(),
        checkOut: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { available: false };

      const checkInDate = new Date(input.checkIn);
      const checkOutDate = new Date(input.checkOut);

      // Check for overlapping bookings
      const overlapping = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.propertyId, input.propertyId),
            eq(appointments.status, 'confirmed'),
            sql`${appointments.appointmentDate} < ${checkOutDate}`,
            sql`DATE_ADD(${appointments.appointmentDate}, INTERVAL 1 DAY) > ${checkInDate}`
          )
        );

      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get property price
      const property = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (property.length === 0) {
        return { available: false };
      }

      const pricePerNight = property[0].price;
      const subtotal = pricePerNight * nights;
      const cleaningFee = Math.round(pricePerNight * 0.15);
      const serviceFee = Math.round(subtotal * 0.10);
      const total = subtotal + cleaningFee + serviceFee;

      return {
        available: overlapping.length === 0,
        nights,
        pricing: {
          pricePerNight,
          nights,
          subtotal,
          cleaningFee,
          serviceFee,
          total,
        },
      };
    }),

  // Create booking
  createBooking: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        checkIn: z.string(),
        checkOut: z.string(),
        guests: z.number(),
        specialRequests: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;
      const checkInDate = new Date(input.checkIn);
      const checkOutDate = new Date(input.checkOut);

      // Verify availability
      const overlapping = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.propertyId, input.propertyId),
            eq(appointments.status, 'confirmed'),
            sql`${appointments.appointmentDate} < ${checkOutDate}`,
            sql`DATE_ADD(${appointments.appointmentDate}, INTERVAL 1 DAY) > ${checkInDate}`
          )
        );

      if (overlapping.length > 0) {
        return {
          success: false,
          message: 'Property not available for selected dates',
        };
      }

      // Calculate pricing
      const property = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (property.length === 0) {
        return { success: false, message: 'Property not found' };
      }

      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const pricePerNight = property[0].price;
      const subtotal = pricePerNight * nights;
      const cleaningFee = Math.round(pricePerNight * 0.15);
      const serviceFee = Math.round(subtotal * 0.10);
      const total = subtotal + cleaningFee + serviceFee;

      // Create booking appointment
      const appointmentResult = await db.insert(appointments).values({
        propertyId: input.propertyId,
        userId,
        agentId: property[0].agentId,
        appointmentDate: checkInDate,
        tourType: 'shortlet',
        status: 'pending',
        notes: `Shortlet booking: ${nights} nights, ${input.guests} guests. ${input.specialRequests || ''}`,
      });

      const bookingId = Number(appointmentResult.insertId);

      // Create transaction record
      await db.insert(transactions).values({
        propertyId: input.propertyId,
        buyerId: userId,
        sellerId: property[0].userId,
        amount: total,
        transactionType: 'shortlet_booking',
        status: 'pending',
      });

      return {
        success: true,
        bookingId,
        message: 'Booking created successfully',
        total,
        confirmationCode: `SL-${bookingId}-${Date.now()}`,
      };
    }),

  // Get user's bookings
  getMyBookings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const userId = ctx.user!.id;

    const bookings = await db
      .select({
        appointment: appointments,
        property: properties,
      })
      .from(appointments)
      .leftJoin(properties, eq(appointments.propertyId, properties.id))
      .where(
        and(
          eq(appointments.userId, userId),
          eq(appointments.tourType, 'shortlet')
        )
      )
      .orderBy(desc(appointments.appointmentDate));

    return bookings.map(({ appointment, property }) => ({
      id: appointment.id,
      propertyId: appointment.propertyId,
      propertyTitle: property
        ? `${property.addressLine1}, ${property.city}`
        : 'Property',
      propertyImage: property?.images?.[0] || null,
      checkIn: appointment.appointmentDate,
      checkOut: new Date(appointment.appointmentDate.getTime() + 24 * 60 * 60 * 1000),
      status: appointment.status,
      confirmationCode: `SL-${appointment.id}-${appointment.createdAt?.getTime()}`,
    }));
  }),

  // Cancel booking
  cancelBooking: protectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;

      // Verify ownership
      const booking = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.id, input.bookingId),
            eq(appointments.userId, userId)
          )
        )
        .limit(1);

      if (booking.length === 0) {
        return { success: false, message: 'Booking not found' };
      }

      // Calculate refund based on cancellation policy
      const checkInDate = new Date(booking[0].appointmentDate);
      const now = new Date();
      const daysUntilCheckIn = Math.ceil(
        (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let refundPercentage = 0;
      if (daysUntilCheckIn >= 7) {
        refundPercentage = 100; // Full refund
      } else if (daysUntilCheckIn >= 3) {
        refundPercentage = 50; // 50% refund
      } else {
        refundPercentage = 0; // No refund
      }

      // Update booking status
      await db
        .update(appointments)
        .set({
          status: 'cancelled',
          notes: `Cancelled: ${input.reason || 'No reason provided'}`,
        })
        .where(eq(appointments.id, input.bookingId));

      // Update transaction
      await db
        .update(transactions)
        .set({ status: 'refunded' })
        .where(
          and(
            eq(transactions.propertyId, booking[0].propertyId),
            eq(transactions.buyerId, userId),
            eq(transactions.transactionType, 'shortlet_booking')
          )
        );

      return {
        success: true,
        message: 'Booking cancelled successfully',
        refundPercentage,
      };
    }),

  // Leave review
  leaveReview: protectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string(),
        cleanliness: z.number().min(1).max(5),
        accuracy: z.number().min(1).max(5),
        communication: z.number().min(1).max(5),
        location: z.number().min(1).max(5),
        value: z.number().min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;
      const [booking] = await db.select().from(shortLetBookings).where(eq(shortLetBookings.id, input.bookingId)).limit(1);
      if (!booking) throw new Error('Booking not found');

      await db.insert(shortletReviews).values({
        bookingId: input.bookingId,
        propertyId: booking.propertyId,
        guestId: userId,
        hostId: booking.hostId,
        overallRating: input.overallRating,
        cleanlinessRating: input.cleanlinessRating,
        accuracyRating: input.accuracyRating,
        communicationRating: input.communicationRating,
        locationRating: input.locationRating,
        valueRating: input.valueRating,
        reviewText: input.review,
        status: 'published',
      });

      return {
        success: true,
        message: 'Review submitted successfully',
      };
    }),

  // Get property reviews
  getReviews: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const reviews = await db.select({
        id: shortletReviews.id,
        guestName: users.name,
        overallRating: shortletReviews.overallRating,
        cleanlinessRating: shortletReviews.cleanlinessRating,
        accuracyRating: shortletReviews.accuracyRating,
        communicationRating: shortletReviews.communicationRating,
        locationRating: shortletReviews.locationRating,
        valueRating: shortletReviews.valueRating,
        reviewText: shortletReviews.reviewText,
        hostResponse: shortletReviews.hostResponse,
        createdAt: shortletReviews.createdAt,
      })
      .from(shortletReviews)
      .leftJoin(users, eq(shortletReviews.guestId, users.id))
      .where(eq(shortletReviews.propertyId, input.propertyId))
      .orderBy(desc(shortletReviews.createdAt));

      return reviews;
    }),

  // Host: Get earnings
  getEarnings: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const userId = ctx.user!.id;

      // Get all shortlet properties owned by user
      const userProperties = await db
        .select()
        .from(properties)
        .where(
          and(
            eq(properties.userId, userId),
            eq(properties.listingType, 'shortlet')
          )
        );

      const propertyIds = userProperties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return {
          totalEarnings: 0,
          pendingPayouts: 0,
          completedBookings: 0,
          upcomingBookings: 0,
        };
      }

      // Get transactions
      const allTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.sellerId, userId),
            eq(transactions.transactionType, 'shortlet_booking')
          )
        );

      const totalEarnings = allTransactions
        .filter((t) => t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const pendingPayouts = allTransactions
        .filter((t) => t.status === 'pending')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        totalEarnings,
        pendingPayouts,
        completedBookings: allTransactions.filter((t) => t.status === 'completed').length,
        upcomingBookings: allTransactions.filter((t) => t.status === 'pending').length,
      };
    }),

  // Get property availability status for map markers
  getAvailabilityStatus: publicProcedure
    .input(
      z.object({
        propertyIds: z.array(z.number()),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return {};

      const availabilityMap: Record<number, { status: 'available' | 'limited' | 'booked'; availableDays: number }> = {};

      for (const propertyId of input.propertyIds) {
        // Get bookings for next 30 days
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30);

        const bookings = await db
          .select()
          .from(shortLetBookings)
          .where(
            and(
              eq(shortLetBookings.propertyId, propertyId),
              gte(shortLetBookings.checkIn, today),
              lte(shortLetBookings.checkOut, futureDate)
            )
          );

        // Calculate available days
        const totalDays = 30;
        const bookedDays = bookings.reduce((sum, booking) => {
          const nights = Math.ceil(
            (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + nights;
        }, 0);

        const availableDays = totalDays - bookedDays;
        const availabilityPercentage = (availableDays / totalDays) * 100;

        let status: 'available' | 'limited' | 'booked';
        if (availabilityPercentage > 70) {
          status = 'available';
        } else if (availabilityPercentage > 30) {
          status = 'limited';
        } else {
          status = 'booked';
        }

        availabilityMap[propertyId] = { status, availableDays };
      }

      return availabilityMap;
    }),

  // Save map search
  saveMapSearch: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        northEastLat: z.number(),
        northEastLng: z.number(),
        southWestLat: z.number(),
        southWestLng: z.number(),
        city: z.string().optional(),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        guests: z.number().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        amenities: z.array(z.string()).optional(),
        alertEnabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;

      const result = await db.insert(savedMapSearches).values({
        userId,
        name: input.name,
        northEastLat: input.northEastLat,
        northEastLng: input.northEastLng,
        southWestLat: input.southWestLat,
        southWestLng: input.southWestLng,
        city: input.city,
        checkIn: input.checkIn ? new Date(input.checkIn) : null,
        checkOut: input.checkOut ? new Date(input.checkOut) : null,
        guests: input.guests,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        amenities: input.amenities ? JSON.stringify(input.amenities) : null,
        alertEnabled: input.alertEnabled ? 1 : 0,
      });

      return {
        success: true,
        searchId: Number(result.insertId),
        message: 'Map search saved successfully',
      };
    }),

  // Get saved map searches
  getSavedMapSearches: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const userId = ctx.user!.id;

    const searches = await db
      .select()
      .from(savedMapSearches)
      .where(eq(savedMapSearches.userId, userId))
      .orderBy(desc(savedMapSearches.createdAt));

    return searches.map((search) => ({
      ...search,
      amenities: search.amenities ? JSON.parse(search.amenities) : [],
      alertEnabled: search.alertEnabled === 1,
    }));
  }),

  // Delete saved map search
  deleteSavedMapSearch: protectedProcedure
    .input(z.object({ searchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;

      await db
        .delete(savedMapSearches)
        .where(
          and(
            eq(savedMapSearches.id, input.searchId),
            eq(savedMapSearches.userId, userId)
          )
        );

      return { success: true, message: 'Saved search deleted' };
    }),

  // Toggle alert for saved search
  toggleSearchAlert: protectedProcedure
    .input(
      z.object({
        searchId: z.number(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;

      await db
        .update(savedMapSearches)
        .set({ alertEnabled: input.enabled ? 1 : 0 })
        .where(
          and(
            eq(savedMapSearches.id, input.searchId),
            eq(savedMapSearches.userId, userId)
          )
        );

      return { success: true, message: `Alerts ${input.enabled ? 'enabled' : 'disabled'}` };
    }),
});
