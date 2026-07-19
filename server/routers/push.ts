import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import * as pushService from "../pushNotificationService";

export const pushRouter = router({
  // Get VAPID public key for client-side subscription
  subscribe: protectedProcedure
    .input(
      z.union([
        z.object({
          action: z.literal("getPublicKey"),
        }),
        z.object({
          action: z.literal("subscribe"),
          subscription: z.object({
            endpoint: z.string(),
            keys: z.object({
              p256dh: z.string(),
              auth: z.string(),
            }),
          }),
          userAgent: z.string().optional(),
        }),
      ])
    )
    .mutation(async ({ ctx, input }) => {
      if (input.action === "getPublicKey") {
        return {
          publicKey: pushService.getVapidPublicKey(),
        };
      }

      // Subscribe user to push notifications
      const result = await pushService.subscribeToPush(
        ctx.user.id,
        input.subscription,
        input.userAgent
      );

      return {
        success: !!result,
        subscription: result,
      };
    }),

  // Unsubscribe from push notifications
  unsubscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const success = await pushService.unsubscribeFromPush(
        ctx.user.id,
        input.endpoint
      );

      return { success };
    }),

  // Get user's active subscriptions
  getSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await pushService.getUserSubscriptions(ctx.user.id);
    return subscriptions;
  }),

  // Send test notification (for testing purposes)
  sendTest: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await pushService.sendPushNotification(ctx.user.id, {
      title: "Test Notification",
      body: "This is a test push notification from Real Estate Platform",
      icon: "/logo.png",
      data: {
        url: "/",
      },
      notificationType: "system",
    });

    return result;
  }),

  // Log notification click (called from service worker)
  logClick: publicProcedure
    .input(
      z.object({
        notificationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const success = await pushService.logNotificationClick(
        input.notificationId
      );
      return { success };
    }),
});
