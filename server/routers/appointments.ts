import { z } from "zod";
import { publicProcedure, rateLimitedPublicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as appointmentService from "../services/appointmentService";

export const appointmentsRouter = router({
  /**
   * Get available time slots for an agent on a specific date
   */
  getAvailableSlots: rateLimitedPublicProcedure
    .input(
      z.object({
        agentId: z.number(),
        date: z.string(), // ISO date string
      })
    )
    .query(async ({ input }) => {
      const date = new Date(input.date);
      return appointmentService.getAgentAvailableSlots(input.agentId, date);
    }),

  /**
   * Check if a specific time slot is available
   */
  checkSlotAvailability: rateLimitedPublicProcedure
    .input(
      z.object({
        agentId: z.number(),
        appointmentDate: z.string(), // ISO datetime string
        duration: z.number().default(60),
      })
    )
    .query(async ({ input }) => {
      const appointmentDate = new Date(input.appointmentDate);
      return appointmentService.isSlotAvailable(
        input.agentId,
        appointmentDate,
        input.duration
      );
    }),

  /**
   * Create a new appointment
   */
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        agentId: z.number().optional(),
        appointmentDate: z.string(), // ISO datetime string
        duration: z.number().default(60),
        tourType: z.enum(["in_person", "virtual"]).default("in_person"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const appointmentDate = new Date(input.appointmentDate);
      
      return appointmentService.createAppointment({
        propertyId: input.propertyId,
        buyerId: ctx.user.id,
        agentId: input.agentId,
        appointmentDate,
        duration: input.duration,
        tourType: input.tourType,
        notes: input.notes,
        status: "pending",
      });
    }),

  /**
   * Update appointment status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        appointmentId: z.number(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
        cancellationReason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return appointmentService.updateAppointmentStatus(
        input.appointmentId,
        input.status,
        input.cancellationReason
      );
    }),

  /**
   * Get user's appointments
   */
  getUserAppointments: protectedProcedure.query(async ({ ctx }) => {
    return appointmentService.getUserAppointments(ctx.user.id);
  }),

  /**
   * Get agent's appointments
   */
  getAgentAppointments: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return appointmentService.getAgentAppointments(input.agentId);
    }),

  /**
   * Get appointments needing reminders (for scheduled job)
   */
  getAppointmentsNeedingReminders: protectedProcedure.query(async () => {
    return appointmentService.getAppointmentsNeedingReminders();
  }),

  /**
   * Mark reminder as sent
   */
  markReminderSent: protectedProcedure
    .input(
      z.object({
        appointmentId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return appointmentService.markReminderSent(input.appointmentId);
    }),
});
