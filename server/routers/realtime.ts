import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { properties } from "../../drizzle/schema";
import { getDb } from "../db";

// Event emitter for real-time updates
const propertyEvents = new EventEmitter();
const bookingEvents = new EventEmitter();
const notificationEvents = new EventEmitter();

// Helper to emit property updates
export function emitPropertyUpdate(propertyId: number, data: any) {
  propertyEvents.emit("propertyUpdate", { propertyId, ...data });
}

// Helper to emit booking updates
export function emitBookingUpdate(bookingId: number, data: any) {
  bookingEvents.emit("bookingUpdate", { bookingId, ...data });
}

// Helper to emit notifications
export function emitNotification(userId: number, notification: any) {
  notificationEvents.emit("notification", { userId, ...notification });
}

export const realtimeRouter = router({
  // Subscribe to property updates
  onPropertyUpdate: publicProcedure
    .input(
      z.object({
        propertyId: z.number().optional(),
      })
    )
    .subscription(({ input }) => {
      return observable<any>((emit) => {
        const onUpdate = (data: any) => {
          // Filter by propertyId if provided
          if (!input.propertyId || data.propertyId === input.propertyId) {
            emit.next(data);
          }
        };

        propertyEvents.on("propertyUpdate", onUpdate);

        return () => {
          propertyEvents.off("propertyUpdate", onUpdate);
        };
      });
    }),

  // Subscribe to booking updates
  onBookingUpdate: protectedProcedure
    .input(
      z.object({
        bookingId: z.number().optional(),
      })
    )
    .subscription(({ input, ctx }) => {
      return observable<any>((emit) => {
        const onUpdate = (data: any) => {
          // Filter by bookingId if provided
          if (!input.bookingId || data.bookingId === input.bookingId) {
            emit.next(data);
          }
        };

        bookingEvents.on("bookingUpdate", onUpdate);

        return () => {
          bookingEvents.off("bookingUpdate", onUpdate);
        };
      });
    }),

  // Subscribe to user notifications
  onNotification: protectedProcedure.subscription(({ ctx }) => {
    return observable<any>((emit) => {
      const onNotification = (data: any) => {
        // Only emit notifications for the current user
        if (data.userId === ctx.user.id) {
          emit.next(data);
        }
      };

      notificationEvents.on("notification", onNotification);

      return () => {
        notificationEvents.off("notification", onNotification);
      };
    });
  }),

  // Get property status in real-time
  getPropertyStatus: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const property = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (property.length === 0) {
        throw new Error("Property not found");
      }

      return {
        id: property[0].id,
        status: property[0].status,
        listingType: property[0].listingType,
        price: property[0].price,
        updatedAt: property[0].updatedAt,
      };
    }),

  // Trigger property update (for testing/admin)
  triggerPropertyUpdate: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        updates: z.object({
          status: z.enum(["active", "pending", "sold", "off_market", "archived"]).optional(),
          price: z.number().optional(),
          listingType: z.enum(["sale", "rent", "sold", "off_market"]).optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Update property in database
      await db
        .update(properties)
        .set({
          ...input.updates,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, input.propertyId));

      // Emit real-time update
      emitPropertyUpdate(input.propertyId, {
        ...input.updates,
        updatedAt: new Date(),
      });

      return { success: true };
    }),
});
