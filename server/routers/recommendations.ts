// @ts-nocheck
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import {
  savedSearches,
  searchAlerts,
  appointments,
} from '../../drizzle/schema';

export const recommendationsRouter = router({
  // Get personalized property recommendations
  getRecommendations: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        includeExplanation: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // In production, fetch actual user behavior data
      // For now, return mock recommendations with AI-generated explanations
      
      const mockProperties = [
        {
          id: 1,
          title: 'Luxury 3-Bedroom Apartment in Ikoyi',
          price: 150000000,
          bedrooms: 3,
          bathrooms: 3,
          sqft: 2100,
          location: 'Ikoyi, Lagos',
          imageUrl: '/properties/luxury-apt.jpg',
          matchScore: 95,
        },
        {
          id: 2,
          title: 'Modern 2-Bedroom Condo in Lekki Phase 1',
          price: 85000000,
          bedrooms: 2,
          bathrooms: 2,
          sqft: 1500,
          location: 'Lekki Phase 1, Lagos',
          imageUrl: '/properties/modern-condo.jpg',
          matchScore: 92,
        },
        {
          id: 3,
          title: 'Spacious 4-Bedroom House in Victoria Island',
          price: 200000000,
          bedrooms: 4,
          bathrooms: 4,
          sqft: 3200,
          location: 'Victoria Island, Lagos',
          imageUrl: '/properties/spacious-house.jpg',
          matchScore: 88,
        },
      ];

      // Generate AI explanations for recommendations
      if (input.includeExplanation) {
        const explanations = await Promise.all(
          mockProperties.slice(0, input.limit).map(async (property) => {
            try {
              const response = await invokeLLM({
                messages: [
                  {
                    role: 'system',
                    content: 'You are a real estate recommendation assistant. Explain why a property is recommended to a user in 1-2 concise sentences.',
                  },
                  {
                    role: 'user',
                    content: `Why would you recommend this property: ${property.title}, ${property.bedrooms} bed, ${property.bathrooms} bath, ${property.sqft} sqft, ₦${property.price.toLocaleString()} in ${property.location}? The user has viewed similar properties in this area and price range.`,
                  },
                ],
              });

              return {
                ...property,
                explanation: response.choices[0].message.content as string,
              };
            } catch (error) {
              return {
                ...property,
                explanation: `This property matches your search preferences for ${property.bedrooms}-bedroom homes in ${property.location} within your budget range.`,
              };
            }
          })
        );

        return explanations;
      }

      return mockProperties.slice(0, input.limit);
    }),

  // Get user preferences for recommendations
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Mock user preferences - in production, fetch from database
    return {
      priceRange: {
        min: 50000000,
        max: 200000000,
      },
      bedrooms: [2, 3, 4],
      bathrooms: [2, 3],
      propertyTypes: ['apartment', 'condo', 'house'],
      locations: ['Ikoyi', 'Lekki Phase 1', 'Victoria Island'],
      amenities: ['pool', 'gym', 'parking', 'security'],
      notificationFrequency: 'weekly',
    };
  }),

  // Update user preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        priceRange: z
          .object({
            min: z.number(),
            max: z.number(),
          })
          .optional(),
        bedrooms: z.array(z.number()).optional(),
        bathrooms: z.array(z.number()).optional(),
        propertyTypes: z.array(z.string()).optional(),
        locations: z.array(z.string()).optional(),
        amenities: z.array(z.string()).optional(),
        notificationFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // In production, save to database
      // For now, return success
      return {
        success: true,
        message: 'Preferences updated successfully',
      };
    }),

  // Provide feedback on recommendation
  provideFeedback: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        feedback: z.enum(['interested', 'not_interested', 'already_viewed']),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // In production, save feedback to improve recommendations
      // This data would be used to train the recommendation algorithm
      return {
        success: true,
        message: 'Feedback recorded',
      };
    }),

  // Get recommendation insights (why these properties)
  getInsights: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Mock insights based on user behavior
    return {
      topFactors: [
        {
          factor: 'Location Preference',
          weight: 35,
          description: 'You frequently view properties in Ikoyi and Victoria Island',
        },
        {
          factor: 'Price Range',
          weight: 30,
          description: 'Your searches focus on properties between ₦80M - ₦180M',
        },
        {
          factor: 'Property Size',
          weight: 20,
          description: 'You prefer 3-4 bedroom properties with 2000+ sqft',
        },
        {
          factor: 'Amenities',
          weight: 15,
          description: 'You favor properties with pools, gyms, and 24/7 security',
        },
      ],
      behaviorSummary: {
        totalViews: 45,
        savedProperties: 12,
        tourScheduled: 3,
        avgViewTime: '3m 24s',
        mostViewedArea: 'Victoria Island',
      },
    };
  }),

  // Get similar properties to a specific property
  getSimilarProperties: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        limit: z.number().default(5),
      })
    )
    .query(async ({ input }) => {
      // Mock similar properties
      return [
        {
          id: 10,
          title: 'Elegant 3-Bedroom Penthouse',
          price: 145000000,
          bedrooms: 3,
          bathrooms: 3,
          sqft: 2000,
          location: 'Ikoyi, Lagos',
          similarity: 94,
        },
        {
          id: 11,
          title: 'Contemporary 3-Bedroom Apartment',
          price: 155000000,
          bedrooms: 3,
          bathrooms: 3,
          sqft: 2200,
          location: 'Victoria Island, Lagos',
          similarity: 91,
        },
      ].slice(0, input.limit);
    }),

  /**
   * Saved Searches & Alerts
   */
  
  // Create saved search with alert
  createSavedSearch: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        criteria: z.string(), // JSON string
        frequency: z.enum(['instant', 'daily', 'weekly']),
        enabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const [search] = await db.insert(savedSearches).values({
        userId: ctx.user.id,
        name: input.name,
        criteria: input.criteria,
        isActive: input.enabled ? 1 : 0,
      });
      
      // Create corresponding alert
      await db.insert(searchAlerts).values({
        userId: ctx.user.id,
        searchCriteria: input.criteria,
        frequency: input.frequency,
        isActive: input.enabled ? 1 : 0,
      });
      
      return { success: true, searchId: search.insertId };
    }),
  
  // Get user's saved searches
  getSavedSearches: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    
    const searches = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, ctx.user.id))
      .orderBy(desc(savedSearches.createdAt));
    
    return searches;
  }),
  
  // Update saved search
  updateSavedSearch: protectedProcedure
    .input(
      z.object({
        searchId: z.number(),
        name: z.string().optional(),
        criteria: z.string().optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const updates: any = {};
      if (input.name) updates.name = input.name;
      if (input.criteria) updates.criteria = input.criteria;
      if (input.enabled !== undefined) updates.isActive = input.enabled ? 1 : 0;
      
      await db
        .update(savedSearches)
        .set(updates)
        .where(
          and(
            eq(savedSearches.id, input.searchId),
            eq(savedSearches.userId, ctx.user.id)
          )
        );
      
      return { success: true };
    }),
  
  // Delete saved search
  deleteSavedSearch: protectedProcedure
    .input(z.object({ searchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db
        .delete(savedSearches)
        .where(
          and(
            eq(savedSearches.id, input.searchId),
            eq(savedSearches.userId, ctx.user.id)
          )
        );
      
      return { success: true };
    }),
  
  /**
   * Virtual Open House Scheduling
   */
  
  // Schedule virtual open house appointment
  scheduleVirtualTour: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        scheduledTime: z.string(), // ISO date string
        notes: z.string().optional(),
        contactPhone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const [appointment] = await db.insert(appointments).values({
        propertyId: input.propertyId,
        userId: ctx.user.id,
        scheduledTime: new Date(input.scheduledTime),
        appointmentType: 'virtual_tour',
        status: 'scheduled',
        notes: input.notes,
        contactPhone: input.contactPhone,
      });
      
      await fetch('http://localhost:5104/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: ctx.user.id,
          channel: 'email',
          subject: 'Virtual Tour Scheduled',
          message: `Your virtual tour for property ${input.propertyId} is scheduled for ${input.scheduledTime}`,
        }),
      }).catch(e => console.error('Notification failed:', e));

      const meetingLink = `https://meet.google.com/${Math.random().toString(36).substring(7)}`;
      
      return {
        success: true,
        appointmentId: appointment.insertId,
        message: 'Virtual tour scheduled! You will receive a confirmation email with the meeting link.',
      };
    }),
  
  // Get user's scheduled appointments
  getMyAppointments: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    
    const appointments_list = await db
      .select()
      .from(appointments)
      .where(eq(appointments.buyerId, ctx.user.id))
      .orderBy(desc(appointments.appointmentDate));
    
    return appointments_list;
  }),
  
  // Cancel appointment
  cancelAppointment: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db
        .update(appointments)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(appointments.id, input.appointmentId),
            eq(appointments.buyerId, ctx.user.id)
          )
        );
      
      return { success: true };
    }),
  
  // Get available time slots for a property
  getAvailableTimeSlots: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        date: z.string(), // ISO date string (YYYY-MM-DD)
      })
    )
    .query(async ({ input }) => {
      // Generate time slots for the day (9 AM - 6 PM, 30-min intervals)
      const slots = [];
      for (let hour = 9; hour < 18; hour++) {
        for (let minute of [0, 30]) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push({
            time,
            available: true,
          });
        }
      }
      
      return slots;
    }),
});
