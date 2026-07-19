// @ts-nocheck
import { eq, and, gte, lte, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  appointments,
  agentAvailability,
  type InsertAppointment,
  type Appointment,
} from "../../drizzle/schema";

/**
 * Appointment Scheduling Service
 * Handles tour scheduling, conflict detection, and availability management
 */

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

/**
 * Get available time slots for an agent on a specific date
 */
export async function getAgentAvailableSlots(
  agentId: number,
  date: Date
): Promise<TimeSlot[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dayOfWeek = date.getDay();
  
  // Get agent's availability for this day
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

  if (!availability.length) {
    return [];
  }

  // Get existing appointments for this date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.agentId, agentId),
        gte(appointments.appointmentDate, startOfDay),
        lte(appointments.appointmentDate, endOfDay),
        or(
          eq(appointments.status, "pending"),
          eq(appointments.status, "confirmed")
        )
      )
    );

  // Generate time slots (30-minute intervals)
  const slots: TimeSlot[] = [];
  
  for (const avail of availability) {
    const [startHour, startMinute] = avail.startTime.split(":").map(Number);
    const [endHour, endMinute] = avail.endTime.split(":").map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + 30 * 60000); // 30 minutes

      // Check if this slot conflicts with existing appointments
      const hasConflict = existingAppointments.some((appt) => {
        const apptStart = new Date(appt.appointmentDate);
        const apptEnd = new Date(apptStart.getTime() + appt.duration * 60000);
        
        return (
          (currentTime >= apptStart && currentTime < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (currentTime <= apptStart && slotEnd >= apptEnd)
        );
      });

      slots.push({
        start: new Date(currentTime),
        end: slotEnd,
        available: !hasConflict,
      });

      currentTime = slotEnd;
    }
  }

  return slots;
}

/**
 * Check if a time slot is available
 */
export async function isSlotAvailable(
  agentId: number,
  appointmentDate: Date,
  duration: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const endTime = new Date(appointmentDate.getTime() + duration * 60000);

  // Check for conflicting appointments
  const conflicts = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.agentId, agentId),
        or(
          eq(appointments.status, "pending"),
          eq(appointments.status, "confirmed")
        ),
        or(
          // New appointment starts during existing appointment
          and(
            lte(appointments.appointmentDate, appointmentDate),
            gte(
              sql`DATE_ADD(${appointments.appointmentDate}, INTERVAL ${appointments.duration} MINUTE)`,
              appointmentDate
            )
          ),
          // New appointment ends during existing appointment
          and(
            lte(appointments.appointmentDate, endTime),
            gte(
              sql`DATE_ADD(${appointments.appointmentDate}, INTERVAL ${appointments.duration} MINUTE)`,
              endTime
            )
          ),
          // New appointment completely overlaps existing appointment
          and(
            gte(appointments.appointmentDate, appointmentDate),
            lte(
              sql`DATE_ADD(${appointments.appointmentDate}, INTERVAL ${appointments.duration} MINUTE)`,
              endTime
            )
          )
        )
      )
    );

  return conflicts.length === 0;
}

/**
 * Create a new appointment
 */
export async function createAppointment(
  data: InsertAppointment
): Promise<Appointment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate slot availability if agent is specified
  if (data.agentId) {
    const available = await isSlotAvailable(
      data.agentId,
      data.appointmentDate,
      data.duration || 60
    );

    if (!available) {
      throw new Error("Time slot is not available");
    }
  }

  const [appointment] = await db.insert(appointments).values(data).$returningId();
  
  const [created] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointment.id));

  return created;
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(
  appointmentId: number,
  status: "pending" | "confirmed" | "cancelled" | "completed",
  cancellationReason?: string
): Promise<Appointment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  if (cancellationReason) {
    updateData.cancellationReason = cancellationReason;
  }

  await db
    .update(appointments)
    .set(updateData)
    .where(eq(appointments.id, appointmentId));

  const [updated] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  return updated;
}

/**
 * Get appointments for a user (buyer)
 */
export async function getUserAppointments(userId: number): Promise<Appointment[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(appointments)
    .where(eq(appointments.buyerId, userId))
    .orderBy(sql`${appointments.appointmentDate} DESC`);
}

/**
 * Get appointments for an agent
 */
export async function getAgentAppointments(agentId: number): Promise<Appointment[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(appointments)
    .where(eq(appointments.agentId, agentId))
    .orderBy(sql`${appointments.appointmentDate} ASC`);
}

/**
 * Get upcoming appointments that need reminders
 */
export async function getAppointmentsNeedingReminders(): Promise<Appointment[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.reminderSent, 0),
        gte(appointments.appointmentDate, now),
        lte(appointments.appointmentDate, tomorrow),
        or(
          eq(appointments.status, "pending"),
          eq(appointments.status, "confirmed")
        )
      )
    );
}

/**
 * Mark reminder as sent
 */
export async function markReminderSent(appointmentId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(appointments)
    .set({ reminderSent: 1 })
    .where(eq(appointments.id, appointmentId));
}
