import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { appointments, agentAvailability, properties, users } from "../../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { sendPushNotification } from "../pushNotificationService";
import { sendTourConfirmationEmail, sendAgentTourNotificationEmail, sendTourCancellationEmail } from "../emailService";

export const toursRouter = router({
  // Get available time slots for a property
  getAvailableSlots: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        date: z.string(), // YYYY-MM-DD
        agentId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { slots: [] };
      }

      try {
        // Get property and agent info
        const property = await db
          .select()
          .from(properties)
          .where(eq(properties.id, input.propertyId))
          .limit(1);

        if (property.length === 0) {
          return { slots: [] };
        }

        const agentId = input.agentId || property[0].agentId;
        if (!agentId) {
          // No agent assigned, return default slots
          return {
            slots: generateDefaultSlots(input.date),
          };
        }

        // Get agent availability for the day of week
        const date = new Date(input.date);
        const dayOfWeek = date.getDay();

        const availability = await db
          .select()
          .from(agentAvailability)
          .where(
            and(
              eq(agentAvailability.agentId, agentId),
              eq(agentAvailability.dayOfWeek, dayOfWeek),
              eq(agentAvailability.isAvailable, 1)
            )
          );

        if (availability.length === 0) {
          return { slots: [] };
        }

        // Get existing appointments for the date
        const startOfDay = new Date(input.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(input.date);
        endOfDay.setHours(23, 59, 59, 999);

        const existingAppointments = await db
          .select()
          .from(appointments)
          .where(
            and(
              eq(appointments.agentId, agentId),
              gte(appointments.appointmentDate, startOfDay),
              lte(appointments.appointmentDate, endOfDay),
              sql`${appointments.status} IN ('pending', 'confirmed')`
            )
          );

        // Generate available slots
        const slots = generateSlotsFromAvailability(
          availability,
          existingAppointments,
          input.date
        );

        return { slots };
      } catch (error) {
        console.error("[Tours] Error getting available slots:", error);
        return { slots: [] };
      }
    }),

  // Book a tour
  bookTour: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        agentId: z.number().optional(),
        appointmentDate: z.string(), // ISO date string
        duration: z.number().default(60),
        tourType: z.enum(["in_person", "virtual"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Get property info
        const property = await db
          .select()
          .from(properties)
          .where(eq(properties.id, input.propertyId))
          .limit(1);

        if (property.length === 0) {
          throw new Error("Property not found");
        }

        const agentId = input.agentId || property[0].agentId;

        // Create appointment
        const result = await db.insert(appointments).values({
          propertyId: input.propertyId,
          buyerId: ctx.user.id,
          agentId: agentId || null,
          appointmentDate: new Date(input.appointmentDate),
          duration: input.duration,
          tourType: input.tourType,
          status: "pending",
          notes: input.notes || null,
          reminderSent: 0,
        });

        const appointmentId = Number(result.insertId);

        // Generate meeting link for virtual tours
        let meetingLink = null;
        if (input.tourType === "virtual") {
          // In production, integrate with Zoom/Google Meet API
          meetingLink = `https://meet.example.com/${appointmentId}`;
          await db
            .update(appointments)
            .set({ meetingLink })
            .where(eq(appointments.id, appointmentId));
        }

        // Send confirmation email to buyer
        await sendTourConfirmationEmail({
          to: ctx.user.email || '',
          toName: ctx.user.name || 'User',
          property: {
            address: property[0].addressLine1,
            city: property[0].city,
            state: property[0].state,
            price: property[0].price || 0,
            image: property[0].primaryImage || undefined,
          },
          tour: {
            date: new Date(input.appointmentDate),
            duration: input.duration,
            tourType: input.tourType,
            meetingLink: meetingLink || undefined,
          },
        }).catch((err) => console.error("[Tours] Email failed:", err));

        // Send notification to agent
        if (agentId) {
          await sendPushNotification(agentId, {
            title: "New Tour Request",
            body: `${ctx.user.name} requested a ${input.tourType} tour for ${property[0].addressLine1}`,
            notificationType: "showing_reminder",
            data: {
              propertyId: input.propertyId,
              appointmentId,
            },
          }).catch((err) => console.error("[Tours] Push notification failed:", err));

          // Send email to agent
          await sendAgentTourNotificationEmail({
            to: ctx.user.email || '',
            toName: ctx.user.name || 'User',
            property: {
              address: property[0].addressLine1,
              city: property[0].city,
              state: property[0].state,
              price: property[0].price || 0,
            },
            tour: {
              date: new Date(input.appointmentDate),
              duration: input.duration,
              tourType: input.tourType,
              meetingLink: meetingLink || undefined,
            },
          }).catch((err) => console.error("[Tours] Agent email failed:", err));
        }

        return {
          success: true,
          appointmentId,
          meetingLink,
        };
      } catch (error) {
        console.error("[Tours] Error booking tour:", error);
        throw error;
      }
    }),

  // Get user's scheduled tours
  getMyTours: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    try {
      const tours = await db
        .select({
          id: appointments.id,
          propertyId: appointments.propertyId,
          appointmentDate: appointments.appointmentDate,
          duration: appointments.duration,
          tourType: appointments.tourType,
          status: appointments.status,
          meetingLink: appointments.meetingLink,
          notes: appointments.notes,
          property: {
            addressLine1: properties.addressLine1,
            city: properties.city,
            state: properties.state,
            primaryImage: properties.primaryImage,
            price: properties.price,
          },
        })
        .from(appointments)
        .leftJoin(properties, eq(appointments.propertyId, properties.id))
        .where(eq(appointments.buyerId, ctx.user.id))
        .orderBy(appointments.appointmentDate);

      return tours;
    } catch (error) {
      console.error("[Tours] Error getting tours:", error);
      return [];
    }
  }),

  // Cancel a tour
  cancelTour: protectedProcedure
    .input(
      z.object({
        appointmentId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Verify ownership
        const appointment = await db
          .select()
          .from(appointments)
          .where(eq(appointments.id, input.appointmentId))
          .limit(1);

        if (appointment.length === 0) {
          throw new Error("Appointment not found");
        }

        if (appointment[0].buyerId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        // Cancel appointment
        await db
          .update(appointments)
          .set({
            status: "cancelled",
            cancellationReason: input.reason || null,
          })
          .where(eq(appointments.id, input.appointmentId));

        // Send cancellation email
        await sendTourCancellationEmail({
          to: ctx.user.email || '',
          toName: ctx.user.name || 'User',
          property: {
            address: 'Property',
          },
          tour: {
            date: appointment[0].appointmentDate,
          },
          reason: input.reason,
        }).catch((err) => console.error("[Tours] Cancellation email failed:", err));

        // Notify agent
        if (appointment[0].agentId) {
          await sendPushNotification(appointment[0].agentId, {
            title: "Tour Cancelled",
            body: `${ctx.user.name} cancelled their tour`,
            notificationType: "showing_reminder",
            data: {
              appointmentId: input.appointmentId,
            },
          }).catch((err) => console.error("[Tours] Push notification failed:", err));
        }

        return { success: true };
      } catch (error) {
        console.error("[Tours] Error cancelling tour:", error);
        throw error;
      }
    }),

  // Confirm a tour (agent only)
  confirmTour: protectedProcedure
    .input(
      z.object({
        appointmentId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Get appointment
        const appointment = await db
          .select()
          .from(appointments)
          .where(eq(appointments.id, input.appointmentId))
          .limit(1);

        if (appointment.length === 0) {
          throw new Error("Appointment not found");
        }

        // Verify agent
        if (appointment[0].agentId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        // Confirm appointment
        await db
          .update(appointments)
          .set({ status: "confirmed" })
          .where(eq(appointments.id, input.appointmentId));

        // Notify buyer
        await sendPushNotification(appointment[0].buyerId, {
          title: "Tour Confirmed",
          body: "Your property tour has been confirmed",
          notificationType: "showing_reminder",
          data: {
            appointmentId: input.appointmentId,
            propertyId: appointment[0].propertyId,
          },
        }).catch((err) => console.error("[Tours] Push notification failed:", err));

        return { success: true };
      } catch (error) {
        console.error("[Tours] Error confirming tour:", error);
        throw error;
      }
    }),
});

// Helper function to generate default time slots
function generateDefaultSlots(date: string): string[] {
  const slots: string[] = [];
  const baseDate = new Date(date);

  // Generate slots from 9 AM to 5 PM, every hour
  for (let hour = 9; hour <= 17; hour++) {
    const slotDate = new Date(baseDate);
    slotDate.setHours(hour, 0, 0, 0);
    slots.push(slotDate.toISOString());
  }

  return slots;
}

// Helper function to generate slots from availability
function generateSlotsFromAvailability(
  availability: any[],
  existingAppointments: any[],
  date: string
): string[] {
  const slots: string[] = [];
  const baseDate = new Date(date);

  for (const avail of availability) {
    const [startHour, startMinute] = avail.startTime.split(":").map(Number);
    const [endHour, endMinute] = avail.endTime.split(":").map(Number);

    // Generate hourly slots
    for (let hour = startHour; hour < endHour; hour++) {
      const slotDate = new Date(baseDate);
      slotDate.setHours(hour, 0, 0, 0);

      // Check if slot is available
      const isBooked = existingAppointments.some((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        const aptEnd = new Date(aptDate.getTime() + apt.duration * 60000);
        return slotDate >= aptDate && slotDate < aptEnd;
      });

      if (!isBooked) {
        slots.push(slotDate.toISOString());
      }
    }
  }

  return slots;
}
