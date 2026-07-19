import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';

const OLLAMA_SERVICE_URL = process.env.OLLAMA_SERVICE_URL || 'http://localhost:5000';

export const aiChatbotRouter = router({
  // Send chat message
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(['user', 'assistant', 'system']),
            content: z.string(),
          })
        ),
        context: z.enum(['general', 'property_search', 'tour_scheduling', 'document_explanation', 'investment_advice']).optional(),
        conversationId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const response = await fetch(`${OLLAMA_SERVICE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: input.messages,
            context: input.context || 'general',
            user_id: ctx.user?.id.toString(),
            conversation_id: input.conversationId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from AI chatbot');
        }

        const data = await response.json();
        return {
          success: true,
          message: data.message?.content || '',
          model: data.model,
          conversationId: data.conversation_id,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Analyze property
  analyzeProperty: protectedProcedure
    .input(
      z.object({
        property: z.object({
          id: z.string().optional(),
          price: z.number(),
          location: z.string(),
          bedrooms: z.number(),
          bathrooms: z.number(),
          squareFeet: z.number(),
          yearBuilt: z.number().optional(),
          type: z.string(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(`${OLLAMA_SERVICE_URL}/analyze/property`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property: input.property }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze property');
        }

        const data = await response.json();
        return {
          success: true,
          analysis: data.analysis,
          propertyId: data.property_id,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Explain document
  explainDocument: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        type: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(`${OLLAMA_SERVICE_URL}/explain/document`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: input.text,
            type: input.type,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to explain document');
        }

        const data = await response.json();
        return {
          success: true,
          explanation: data.explanation,
          documentType: data.document_type,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Get property recommendations
  getRecommendations: protectedProcedure
    .input(
      z.object({
        preferences: z.object({
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          location: z.string().optional(),
          bedrooms: z.number().optional(),
          type: z.string().optional(),
          amenities: z.array(z.string()).optional(),
        }),
        history: z.array(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(`${OLLAMA_SERVICE_URL}/recommend/properties`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferences: input.preferences,
            history: input.history || [],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get recommendations');
        }

        const data = await response.json();
        return {
          success: true,
          recommendations: data.recommendations,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Check service health
  healthCheck: publicProcedure.query(async () => {
    try {
      const response = await fetch(`${OLLAMA_SERVICE_URL}/health`);
      if (!response.ok) {
        return {
          status: 'unhealthy',
          ollama: 'unreachable',
        };
      }

      const data = await response.json();
      return {
        status: data.status,
        ollama: data.ollama,
        model: data.model,
      };
    } catch (error) {
      return {
        status: 'error',
        ollama: 'unreachable',
      };
    }
  }),
});
