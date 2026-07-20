/**
 * AI Chat Router (Session-Aware)
 * ================================
 * Full session-aware conversational AI for Nigerian real estate.
 *
 * Replaces the basic aiChatbot.ts with:
 *  - Persistent conversation sessions (Redis-backed via the Python AI service)
 *  - Nigerian market context injection
 *  - Intent classification and structured search extraction
 *  - Multi-language support (English, Yoruba, Hausa, Igbo)
 *  - Suggested action routing (deep-links into the app)
 *  - Conversation history retrieval
 *  - Ollama-first with OpenAI fallback (handled in Python service)
 */

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { logger } from '../_core/logger';

const AI_SERVICE_URL = process.env.AI_ASSISTANT_URL || 'http://localhost:5100';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AIResponse {
  session_id: string;
  message: string;
  intent: string | null;
  language: string;
  extracted_search: Record<string, unknown> | null;
  suggested_actions: string[];
  response_time_ms: number;
}

interface SessionInfo {
  session_id: string;
  user_id: string | null;
  message_count: number;
  created_at: string;
  last_active: string;
  detected_language: string;
  primary_intent: string | null;
}

// ── Helper ────────────────────────────────────────────────────────────────────
async function callAIService<T>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${AI_SERVICE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown error');
    throw new Error(`AI service error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

// ── Router ────────────────────────────────────────────────────────────────────
export const aiChatRouter = router({

  /** Create a new conversation session */
  createSession: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const result = await callAIService<{ session_id: string; created_at: string }>(
          `/session/new?user_id=${ctx.user.id}`,
          'POST',
        );
        logger.info(`New AI session created for user ${ctx.user.id}: ${result.session_id}`);
        return result;
      } catch (error: any) {
        logger.error(`Failed to create AI session: ${error.message}`);
        // Return a local session ID if service is unavailable
        return {
          session_id: `local-${ctx.user.id}-${Date.now()}`,
          created_at: new Date().toISOString(),
        };
      }
    }),

  /** Send a message and get a response */
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(2000),
      sessionId: z.string().optional(),
      language: z.enum(['en', 'yo', 'ha', 'ig']).optional(),
      context: z.enum([
        'general', 'property_search', 'valuation', 'legal',
        'financing', 'investment', 'agent_search',
      ]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      try {
        const result = await callAIService<AIResponse>('/chat', 'POST', {
          session_id: input.sessionId,
          message: input.message,
          user_id: String(userId),
          language: input.language,
          context: input.context,
        });

        logger.info(`AI chat: user=${userId}, intent=${result.intent}, lang=${result.language}, ${result.response_time_ms}ms`);

        // Map extracted search params to app deep-link
        let deepLink: string | null = null;
        if (result.extracted_search && Object.keys(result.extracted_search).length > 0) {
          const params = new URLSearchParams();
          const s = result.extracted_search;
          if (s.city) params.set('city', String(s.city));
          if (s.bedrooms) params.set('bedrooms', String(s.bedrooms));
          if (s.maxPrice) params.set('maxPrice', String(s.maxPrice));
          if (s.listingType) params.set('listingType', String(s.listingType));
          if (s.propertyType) params.set('propertyType', String(s.propertyType));
          deepLink = `/search?${params.toString()}`;
        }

        return {
          sessionId: result.session_id,
          message: result.message,
          intent: result.intent,
          language: result.language,
          extractedSearch: result.extracted_search,
          suggestedActions: result.suggested_actions,
          deepLink,
          responseTimeMs: result.response_time_ms,
        };
      } catch (error: any) {
        logger.error(`AI chat error for user ${userId}: ${error.message}`);

        // Graceful degradation — return a helpful static response
        return {
          sessionId: input.sessionId ?? `fallback-${userId}-${Date.now()}`,
          message: getFallbackResponse(input.message, input.context),
          intent: input.context ?? null,
          language: input.language ?? 'en',
          extractedSearch: null,
          suggestedActions: ['Search properties', 'View listings', 'Contact an agent'],
          deepLink: null,
          responseTimeMs: 0,
          fallback: true,
        };
      }
    }),

  /** Get session info */
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        return await callAIService<SessionInfo>(`/session/${input.sessionId}`);
      } catch {
        return null;
      }
    }),

  /** Get conversation history */
  getHistory: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const result = await callAIService<{
          session_id: string;
          messages: Array<{ role: string; content: string }>;
          extracted_preferences: Record<string, unknown>;
        }>(`/session/${input.sessionId}/history`);

        return {
          sessionId: result.session_id,
          messages: result.messages,
          extractedPreferences: result.extracted_preferences,
        };
      } catch {
        return { sessionId: input.sessionId, messages: [], extractedPreferences: {} };
      }
    }),

  /** Clear conversation session */
  clearSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await callAIService(`/session/${input.sessionId}`, 'DELETE');
        return { success: true };
      } catch {
        return { success: false };
      }
    }),

  /** Get AI service health status */
  health: publicProcedure
    .query(async () => {
      try {
        const result = await callAIService<{
          status: string;
          ollama: { available: boolean; models: string[]; preferred: string };
          redis: { available: boolean };
          openai_fallback: boolean;
        }>('/health');
        return { available: true, ...result };
      } catch {
        return {
          available: false,
          status: 'unavailable',
          ollama: { available: false, models: [], preferred: 'llama3.2' },
          redis: { available: false },
          openai_fallback: false,
        };
      }
    }),

  /** List available AI models */
  listModels: publicProcedure
    .query(async () => {
      try {
        return await callAIService<{ models: Array<{ name: string }>; current: string }>('/models');
      } catch {
        return { models: [], current: 'llama3.2' };
      }
    }),

  /**
   * Quick property search extraction from natural language
   * (Does not require a full session — useful for search bar)
   */
  extractSearchIntent: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
    }))
    .query(async ({ input }) => {
      try {
        const result = await callAIService<AIResponse>('/chat', 'POST', {
          message: input.query,
          context: 'property_search',
        });
        return {
          extractedSearch: result.extracted_search,
          intent: result.intent,
          language: result.language,
        };
      } catch {
        return { extractedSearch: null, intent: null, language: 'en' };
      }
    }),
});

// ── Fallback responses ────────────────────────────────────────────────────────
function getFallbackResponse(message: string, context?: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('price') || lower.includes('how much') || lower.includes('cost')) {
    return 'Property prices in Nigeria vary significantly by location. In Lagos, prices range from ₦550K/sqm in Yaba to ₦3.5M/sqm in Banana Island. In Abuja, Maitama commands ₦1.5M/sqm. Would you like to search for properties in a specific area?';
  }

  if (lower.includes('lekki') || lower.includes('victoria island') || lower.includes('ikoyi')) {
    return 'Lagos Island properties are among the most sought-after in Nigeria. Lekki Phase 1 averages ₦1.8M/sqm, Victoria Island ₦2.5M/sqm, and Ikoyi ₦2.2M/sqm. Would you like to see available listings in these areas?';
  }

  if (lower.includes('c of o') || lower.includes('certificate') || lower.includes('title')) {
    return 'The Certificate of Occupancy (C of O) is the most secure title document in Nigeria. Always verify the C of O with the state land registry before purchasing. In Lagos, you also need Governor\'s Consent for land transfers. Would you like guidance on title verification?';
  }

  if (lower.includes('mortgage') || lower.includes('loan') || lower.includes('financing')) {
    return 'Nigerian mortgage rates are typically 15-25% per annum, which is high by global standards. The Federal Mortgage Bank of Nigeria (FMBN) offers lower rates for NHF contributors. Most Nigerian property transactions are cash-based. Would you like to calculate your mortgage options?';
  }

  if (context === 'property_search' || lower.includes('find') || lower.includes('search')) {
    return 'I can help you find properties in Nigeria. Please tell me: Which city are you interested in? How many bedrooms do you need? What is your budget? Are you looking to buy or rent?';
  }

  return 'Welcome to the Nigerian Real Estate AI Assistant. I can help you search for properties, understand market prices, navigate legal requirements, or explore financing options. What would you like to know?';
}
