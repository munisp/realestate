import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';

export const agentPerformanceRouter = router({
  // Get agent performance metrics
  getMetrics: protectedProcedure
    .input(
      z.object({
        period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Mock performance data
      return {
        period: input.period,
        sales: {
          totalListings: 45,
          activeListings: 12,
          soldProperties: 28,
          pendingDeals: 5,
          totalRevenue: 450000000,
          avgSalePrice: 16071428,
          avgDaysOnMarket: 32,
        },
        leads: {
          total: 156,
          new: 23,
          contacted: 98,
          qualified: 45,
          converted: 28,
          conversionRate: 17.9,
        },
        performance: {
          responseTime: 2.5, // hours
          clientSatisfaction: 4.7, // out of 5
          showingsScheduled: 67,
          showingsCompleted: 58,
          offersSubmitted: 32,
          offersAccepted: 28,
        },
        commission: {
          total: 13500000,
          pending: 1500000,
          paid: 12000000,
          avgCommissionRate: 3,
        },
      };
    }),

  // Get sales funnel data
  getSalesFunnel: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    return {
      stages: [
        { name: 'Leads', count: 156, percentage: 100 },
        { name: 'Contacted', count: 98, percentage: 62.8 },
        { name: 'Qualified', count: 45, percentage: 28.8 },
        { name: 'Showing Scheduled', count: 35, percentage: 22.4 },
        { name: 'Offer Submitted', count: 32, percentage: 20.5 },
        { name: 'Closed', count: 28, percentage: 17.9 },
      ],
    };
  }),

  // Get monthly trends
  getMonthlyTrends: protectedProcedure
    .input(
      z.object({
        months: z.number().default(6),
      })
    )
    .query(async ({ input }) => {
      // Mock monthly data
      const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
      return {
        labels: months.slice(-input.months),
        datasets: {
          sales: [3, 5, 4, 6, 5, 5],
          revenue: [45, 78, 62, 95, 82, 88],
          leads: [18, 22, 25, 28, 24, 23],
        },
      };
    }),

  // Get top performing properties
  getTopProperties: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    return [
      {
        id: 1,
        title: 'Luxury Villa in Victoria Island',
        soldPrice: 150000000,
        listPrice: 155000000,
        daysOnMarket: 18,
        commission: 4500000,
        soldDate: '2025-01-10',
      },
      {
        id: 2,
        title: 'Modern Condo in Lekki',
        soldPrice: 95000000,
        listPrice: 98000000,
        daysOnMarket: 25,
        commission: 2850000,
        soldDate: '2025-01-08',
      },
      {
        id: 3,
        title: 'Penthouse in Ikoyi',
        soldPrice: 220000000,
        listPrice: 225000000,
        daysOnMarket: 32,
        commission: 6600000,
        soldDate: '2024-12-28',
      },
    ];
  }),

  // Get client satisfaction ratings
  getClientRatings: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    return {
      overall: 4.7,
      totalReviews: 45,
      breakdown: {
        5: 32,
        4: 10,
        3: 2,
        2: 1,
        1: 0,
      },
      recentReviews: [
        {
          id: 1,
          client: 'John Doe',
          rating: 5,
          comment: 'Excellent service! Very professional and responsive.',
          date: '2025-01-15',
        },
        {
          id: 2,
          client: 'Jane Smith',
          rating: 5,
          comment: 'Found us the perfect home. Highly recommended!',
          date: '2025-01-12',
        },
        {
          id: 3,
          client: 'Mike Johnson',
          rating: 4,
          comment: 'Good experience overall. Quick response times.',
          date: '2025-01-08',
        },
      ],
    };
  }),

  // Get goals and progress
  getGoals: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    return [
      {
        id: 1,
        name: 'Monthly Sales Target',
        target: 10,
        current: 5,
        unit: 'properties',
        period: 'month',
        progress: 50,
      },
      {
        id: 2,
        name: 'Revenue Goal',
        target: 200000000,
        current: 88000000,
        unit: '₦',
        period: 'month',
        progress: 44,
      },
      {
        id: 3,
        name: 'New Leads',
        target: 30,
        current: 23,
        unit: 'leads',
        period: 'month',
        progress: 76.7,
      },
      {
        id: 4,
        name: 'Client Satisfaction',
        target: 4.5,
        current: 4.7,
        unit: 'rating',
        period: 'ongoing',
        progress: 104.4,
      },
    ];
  }),

  // Get comparative analysis
  getComparativeAnalysis: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    return {
      yourPerformance: {
        sales: 28,
        revenue: 450000000,
        avgDaysOnMarket: 32,
        conversionRate: 17.9,
      },
      teamAverage: {
        sales: 22,
        revenue: 350000000,
        avgDaysOnMarket: 45,
        conversionRate: 14.2,
      },
      topPerformer: {
        sales: 35,
        revenue: 580000000,
        avgDaysOnMarket: 28,
        conversionRate: 21.5,
      },
    };
  }),

  // Get activity timeline
  getActivityTimeline: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      return [
        {
          id: 1,
          type: 'sale',
          title: 'Property Sold',
          description: 'Luxury Villa in Victoria Island - ₦150M',
          timestamp: '2025-01-10T14:30:00',
        },
        {
          id: 2,
          type: 'showing',
          title: 'Showing Completed',
          description: 'Showed Modern Condo to potential buyer',
          timestamp: '2025-01-09T16:00:00',
        },
        {
          id: 3,
          type: 'lead',
          title: 'New Lead',
          description: 'Interested in 3-bedroom apartments in Lekki',
          timestamp: '2025-01-08T11:15:00',
        },
        {
          id: 4,
          type: 'offer',
          title: 'Offer Accepted',
          description: 'Offer on Ikoyi Penthouse accepted',
          timestamp: '2025-01-07T09:45:00',
        },
        {
          id: 5,
          type: 'listing',
          title: 'New Listing',
          description: 'Added 4-bedroom house in Banana Island',
          timestamp: '2025-01-06T13:20:00',
        },
      ].slice(0, input.limit);
    }),
});
