import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { appointments, properties, openHouseEvents, openHouseRegistrations, openHouseAttendees, openHouseFeedback } from '../../drizzle/schema';
import { eq, and, gte, lte, desc, count } from 'drizzle-orm';

export const openHouseRouter = router({
  // Create open house event
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        startTime: z.string(),
        endTime: z.string(),
        description: z.string().optional(),
        maxAttendees: z.number().optional(),
        type: z.enum(['in-person', 'virtual']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db.insert(appointments).values({
        propertyId: input.propertyId,
        userId: ctx.user!.id,
        agentId: ctx.user!.id,
        appointmentDate: new Date(input.startTime),
        tourType: input.type,
        status: 'scheduled',
        notes: input.description,
      });

      const openHouseId = Number(result.insertId);

      // Generate QR code URL
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=openhouse-${openHouseId}`;

      return {
        success: true,
        openHouseId,
        qrCode,
      };
    }),

  // Get open houses for a property
  getByProperty: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const now = new Date();

      const events = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.propertyId, input.propertyId),
            gte(appointments.appointmentDate, now)
          )
        )
        .orderBy(appointments.appointmentDate);

      return events.map((event) => ({
        id: event.id,
        propertyId: event.propertyId,
        startTime: event.appointmentDate,
        endTime: new Date(event.appointmentDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours
        type: event.tourType || 'in-person',
        attendees: 0, // Would count from registrations table
        maxAttendees: 20,
        status: 'upcoming',
      }));
    }),

  // Get agent's open houses
  getMyOpenHouses: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const userId = ctx.user!.id;

    const events = await db
      .select({
        appointment: appointments,
        property: properties,
      })
      .from(appointments)
      .leftJoin(properties, eq(appointments.propertyId, properties.id))
      .where(eq(appointments.agentId, userId))
      .orderBy(desc(appointments.appointmentDate));

    return events.map(({ appointment, property }) => {
      const now = new Date();
      const eventTime = new Date(appointment.appointmentDate);
      const status = eventTime > now ? 'upcoming' : 'completed';

      return {
        id: appointment.id,
        propertyId: appointment.propertyId,
        propertyTitle: property
          ? `${property.addressLine1}, ${property.city}`
          : 'Property',
        startTime: appointment.appointmentDate,
        endTime: new Date(eventTime.getTime() + 2 * 60 * 60 * 1000),
        type: appointment.tourType || 'in-person',
        attendees: 0, // Would count actual check-ins
        maxAttendees: 20,
        status,
        registrations: 0, // Would count from registrations
      };
    });
  }),

  // Register for open house
  register: protectedProcedure
    .input(
      z.object({
        openHouseId: z.number(),
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Check if event exists
      const event = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.openHouseId))
        .limit(1);

      if (event.length === 0) {
        return {
          success: false,
          message: 'Open house not found',
        };
      }

      const userId = ctx.user?.id;
      const [registration] = await db.insert(openHouseRegistrations).values({
        eventId: input.openHouseId,
        userId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        numberOfGuests: input.numberOfGuests || 1,
        status: 'registered',
      }).returning();

      return {
        success: true,
        message: 'Registration successful',
        confirmationCode: `OH-${input.openHouseId}-${registration.id}`,
      };
    }),

  // Check in attendee (QR code scan)
  checkIn: protectedProcedure
    .input(
      z.object({
        openHouseId: z.number(),
        qrCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verify QR code matches event
      const expectedQR = `openhouse-${input.openHouseId}`;
      if (!input.qrCode.includes(expectedQR)) {
        return {
          success: false,
          message: 'Invalid QR code',
        };
      }

      const userId = ctx.user!.id;
      const [registration] = await db.select().from(openHouseRegistrations)
        .where(and(
          eq(openHouseRegistrations.eventId, input.openHouseId),
          eq(openHouseRegistrations.userId, userId)
        ))
        .limit(1);

      if (!registration) {
        return {
          success: false,
          message: 'No registration found',
        };
      }

      await db.insert(openHouseAttendees).values({
        eventId: input.openHouseId,
        registrationId: registration.id,
        checkInTime: new Date(),
      });

      await db.update(openHouseRegistrations)
        .set({ status: 'attended' })
        .where(eq(openHouseRegistrations.id, registration.id));

      return {
        success: true,
        message: 'Check-in successful',
        attendeeName: ctx.user!.name || 'Guest',
      };
    }),

  // Get open house analytics
  getAnalytics: protectedProcedure
    .input(z.object({ openHouseId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const event = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.openHouseId))
        .limit(1);

      if (event.length === 0) return null;

      // In production, would aggregate real data
      return {
        totalRegistrations: 0,
        totalCheckIns: 0,
        conversionRate: 0,
        avgTimeSpent: 0,
        feedbackScore: 0,
        leadQuality: {
          hot: 0,
          warm: 0,
          cold: 0,
        },
      };
    }),

  // Submit feedback
  submitFeedback: protectedProcedure
    .input(
      z.object({
        openHouseId: z.number(),
        rating: z.number().min(1).max(5),
        comments: z.string().optional(),
        interested: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;
      await db.insert(openHouseFeedback).values({
        eventId: input.openHouseId,
        userId,
        rating: input.rating,
        feedback: input.comments,
        interestedInProperty: input.interested ? 1 : 0,
      });

      return {
        success: true,
        message: 'Thank you for your feedback',
      };
    }),

  // Cancel open house
  cancel: protectedProcedure
    .input(
      z.object({
        openHouseId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .update(appointments)
        .set({
          status: 'cancelled',
          notes: input.reason,
        })
        .where(
          and(
            eq(appointments.id, input.openHouseId),
            eq(appointments.agentId, ctx.user!.id)
          )
        );

      // In production, would send cancellation emails to registrants

      return {
        success: true,
        message: 'Open house cancelled',
      };
    }),

  // Get upcoming open houses (public)
  getUpcoming: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const now = new Date();

      let query = db
        .select({
          appointment: appointments,
          property: properties,
        })
        .from(appointments)
        .leftJoin(properties, eq(appointments.propertyId, properties.id))
        .where(gte(appointments.appointmentDate, now))
        .orderBy(appointments.appointmentDate)
        .limit(input.limit);

      // Filter by city if provided
      if (input.city) {
        query = query.where(
          and(
            gte(appointments.appointmentDate, now),
            eq(properties.city, input.city)
          )
        ) as any;
      }

      const events = await query;

      return events.map(({ appointment, property }) => ({
        id: appointment.id,
        propertyId: appointment.propertyId,
        propertyTitle: property
          ? `${property.addressLine1}, ${property.city}`
          : 'Property',
        propertyImage: property?.images?.[0] || null,
        startTime: appointment.appointmentDate,
        endTime: new Date(appointment.appointmentDate.getTime() + 2 * 60 * 60 * 1000),
        type: appointment.tourType || 'in-person',
        city: property?.city,
        spotsAvailable: 20, // Would calculate from registrations
      }));
    }),
});
