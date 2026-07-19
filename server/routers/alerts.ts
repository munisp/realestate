import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';

export const alertsRouter = router({
  // Get user's alerts
  getMyAlerts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Mock alerts data
    return [
      {
        id: 1,
        type: 'price_drop',
        title: 'Price Drop Alert',
        message: 'Luxury Villa in Victoria Island dropped by ₦5M',
        propertyId: 1,
        propertyTitle: 'Luxury Villa in Victoria Island',
        oldPrice: 155000000,
        newPrice: 150000000,
        createdAt: '2025-01-18T10:00:00',
        read: false,
        channels: ['email', 'push'],
      },
      {
        id: 2,
        type: 'new_listing',
        title: 'New Listing Match',
        message: '3-bedroom apartment in Lekki Phase 1 matches your search',
        propertyId: 5,
        propertyTitle: 'Modern 3-Bedroom Apartment',
        price: 95000000,
        createdAt: '2025-01-17T14:30:00',
        read: false,
        channels: ['email', 'sms'],
      },
      {
        id: 3,
        type: 'open_house',
        title: 'Open House Reminder',
        message: 'Open house tomorrow at 2 PM - Ikoyi Penthouse',
        propertyId: 3,
        propertyTitle: 'Elegant Penthouse in Ikoyi',
        eventTime: '2025-01-20T14:00:00',
        createdAt: '2025-01-19T09:00:00',
        read: true,
        channels: ['push', 'sms'],
      },
      {
        id: 4,
        type: 'offer_status',
        title: 'Offer Status Update',
        message: 'Your offer on Victoria Island Condo was countered',
        propertyId: 2,
        propertyTitle: 'Modern Condo in Victoria Island',
        status: 'countered',
        createdAt: '2025-01-16T16:45:00',
        read: true,
        channels: ['email', 'push', 'sms'],
      },
    ];
  }),

  // Get alert preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Mock preferences
    return {
      priceDrops: {
        enabled: true,
        frequency: 'instant',
        channels: ['email', 'push'],
        minDropPercentage: 5,
      },
      newListings: {
        enabled: true,
        frequency: 'daily',
        channels: ['email'],
        matchSavedSearches: true,
      },
      openHouse: {
        enabled: true,
        frequency: 'instant',
        channels: ['push', 'sms'],
        reminderHours: 24,
      },
      offerUpdates: {
        enabled: true,
        frequency: 'instant',
        channels: ['email', 'push', 'sms'],
      },
      marketReports: {
        enabled: true,
        frequency: 'weekly',
        channels: ['email'],
      },
      savedSearchAlerts: {
        enabled: true,
        frequency: 'daily',
        channels: ['email', 'push'],
      },
    };
  }),

  // Update alert preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        alertType: z.enum([
          'priceDrops',
          'newListings',
          'openHouse',
          'offerUpdates',
          'marketReports',
          'savedSearchAlerts',
        ]),
        enabled: z.boolean().optional(),
        frequency: z.enum(['instant', 'daily', 'weekly', 'monthly']).optional(),
        channels: z.array(z.enum(['email', 'push', 'sms'])).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // In production, save to database
      return {
        success: true,
        message: 'Alert preferences updated successfully',
      };
    }),

  // Mark alert as read
  markAsRead: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      // In production, update database
      return {
        success: true,
      };
    }),

  // Mark all alerts as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    // In production, update all user's alerts
    return {
        success: true,
      count: 5,
    };
  }),

  // Delete alert
  deleteAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      // In production, delete from database
      return {
        success: true,
      };
    }),

  // Snooze alert
  snoozeAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        snoozeUntil: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // In production, update snooze time
      return {
        success: true,
        message: `Alert snoozed until ${new Date(input.snoozeUntil).toLocaleString()}`,
      };
    }),

  // Get alert history
  getHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        type: z
          .enum(['price_drop', 'new_listing', 'open_house', 'offer_status', 'all'])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Mock history data
      return {
        alerts: [
          {
            id: 10,
            type: 'price_drop',
            message: 'Property price reduced by 10%',
            createdAt: '2025-01-10T12:00:00',
            read: true,
          },
          {
            id: 11,
            type: 'new_listing',
            message: 'New 4-bedroom house in your preferred area',
            createdAt: '2025-01-09T15:30:00',
            read: true,
          },
        ],
        total: 45,
        page: input.page,
        totalPages: 3,
      };
    }),

  // Get alert statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    return {
      total: 156,
      unread: 4,
      byType: {
        price_drop: 45,
        new_listing: 62,
        open_house: 23,
        offer_status: 18,
        market_reports: 8,
      },
      last7Days: 12,
      last30Days: 48,
    };
  }),

  // Test alert (send test notification)
  sendTestAlert: protectedProcedure
    .input(
      z.object({
        channel: z.enum(['email', 'push', 'sms']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // In production, send actual test notification
      return {
        success: true,
        message: `Test ${input.channel} notification sent to ${ctx.user.email || 'your account'}`,
      };
    }),
});
