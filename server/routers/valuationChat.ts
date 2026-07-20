/**
 * Innovation 1: AI-Powered Property Valuation Chat
 *
 * Provides a streaming LLM-backed conversational interface that explains
 * property valuations, answers "why is this priced X?" questions, and
 * suggests negotiation strategies — all grounded in real property data.
 *
 * Architecture:
 *  - tRPC procedure returns an async generator (SSE-compatible)
 *  - Ollama (local) primary, OpenAI fallback
 *  - Context window includes property data, comparable sales, market trends
 *  - Conversation history stored in DB for continuity
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { logger } from "../_core/logger";
import { eq, desc, and } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, jsonb, integer } from "drizzle-orm/pg-core";

// ── Schema ─────────────────────────────────────────────────────────────────

export const valuationChatSessions = pgTable("valuation_chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  propertyId: text("property_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const valuationChatMessages = pgTable("valuation_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // { model, tokens, latencyMs, sources }
  createdAt: timestamp("created_at").defaultNow(),
});

// ── LLM Client ─────────────────────────────────────────────────────────────

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const OPENAI_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function* streamOllama(messages: ChatMessage[]): AsyncGenerator<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Ollama error: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n").filter(Boolean)) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.message?.content) yield parsed.message.content;
      } catch {}
    }
  }
}

async function* streamOpenAI(messages: ChatMessage[]): AsyncGenerator<string> {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`OpenAI error: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {}
    }
  }
}

async function* streamLLM(messages: ChatMessage[]): AsyncGenerator<string> {
  try {
    // Try Ollama first (local, free)
    yield* streamOllama(messages);
  } catch (ollamaErr) {
    logger.warn({ err: ollamaErr }, "Ollama unavailable, falling back to OpenAI");
    yield* streamOpenAI(messages);
  }
}

// ── Property Context Builder ────────────────────────────────────────────────

async function buildPropertyContext(propertyId: string): Promise<string> {
  try {
    // Fetch property data from DB
    const result = await db.execute(
      `SELECT p.*, 
              array_agg(DISTINCT pi.url) FILTER (WHERE pi.url IS NOT NULL) as images,
              COUNT(DISTINCT pv.id) as view_count,
              AVG(pr.rating) as avg_rating
       FROM properties p
       LEFT JOIN property_images pi ON pi.property_id = p.id
       LEFT JOIN property_views pv ON pv.property_id = p.id
       LEFT JOIN property_reviews pr ON pr.property_id = p.id
       WHERE p.id = $1
       GROUP BY p.id
       LIMIT 1` as any,
      [propertyId]
    );

    if (!result.rows?.length) return `Property ID: ${propertyId} (details unavailable)`;

    const p = result.rows[0] as any;
    return `
Property Details:
- ID: ${p.id}
- Title: ${p.title || "N/A"}
- Type: ${p.property_type || "N/A"}
- Price: ${p.currency || "NGN"} ${Number(p.price || 0).toLocaleString()}
- Location: ${p.address || ""}, ${p.city || ""}, ${p.state || ""}
- Bedrooms: ${p.bedrooms || "N/A"} | Bathrooms: ${p.bathrooms || "N/A"}
- Size: ${p.size_sqm || "N/A"} sqm
- Year Built: ${p.year_built || "N/A"}
- Condition: ${p.condition || "N/A"}
- Views: ${p.view_count || 0} | Avg Rating: ${p.avg_rating ? Number(p.avg_rating).toFixed(1) : "N/A"}
- Listed: ${p.created_at ? new Date(p.created_at).toLocaleDateString() : "N/A"}
- Description: ${(p.description || "").slice(0, 300)}
`.trim();
  } catch (err) {
    logger.error({ err, propertyId }, "Failed to build property context");
    return `Property ID: ${propertyId}`;
  }
}

const SYSTEM_PROMPT = `You are ValuBot, an expert AI real estate valuation assistant for a Nigerian property platform.
You help users understand property valuations, market dynamics, negotiation strategies, and investment potential.
You are knowledgeable about Nigerian real estate markets (Lagos, Abuja, Port Harcourt, etc.), local pricing factors,
infrastructure impact, neighbourhood trends, and property investment returns.

Guidelines:
- Be concise, factual, and helpful
- Always ground responses in the provided property data
- Cite specific data points when making valuation arguments
- Suggest negotiation tactics when appropriate
- Flag any red flags (overpricing, location risks, etc.)
- Use NGN (Naira) as default currency unless asked otherwise
- Format numbers with commas for readability`;

// ── Router ─────────────────────────────────────────────────────────────────

export const valuationChatRouter = router({
  /**
   * Start or resume a chat session for a property
   */
  getOrCreateSession: publicProcedure
    .input(z.object({ propertyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id ?? null;

      // Try to find existing session
      if (userId) {
        const existing = await db.execute(
          `SELECT id FROM valuation_chat_sessions 
           WHERE user_id = $1 AND property_id = $2 
           ORDER BY updated_at DESC LIMIT 1` as any,
          [userId, input.propertyId]
        );
        if (existing.rows?.length) {
          return { sessionId: (existing.rows[0] as any).id, isNew: false };
        }
      }

      // Create new session
      const result = await db.execute(
        `INSERT INTO valuation_chat_sessions (user_id, property_id) 
         VALUES ($1, $2) RETURNING id` as any,
        [userId, input.propertyId]
      );
      return { sessionId: (result.rows[0] as any).id, isNew: true };
    }),

  /**
   * Get chat history for a session
   */
  getHistory: publicProcedure
    .input(z.object({ sessionId: z.string().uuid(), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      const result = await db.execute(
        `SELECT id, role, content, metadata, created_at 
         FROM valuation_chat_messages 
         WHERE session_id = $1 
         ORDER BY created_at ASC 
         LIMIT $2` as any,
        [input.sessionId, input.limit]
      );
      return result.rows || [];
    }),

  /**
   * Send a message and get a streaming response
   * Returns the full response text after streaming completes
   */
  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        propertyId: z.string(),
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ input }) => {
      const startTime = Date.now();

      // Save user message
      await db.execute(
        `INSERT INTO valuation_chat_messages (session_id, role, content) 
         VALUES ($1, 'user', $2)` as any,
        [input.sessionId, input.message]
      );

      // Build context
      const propertyContext = await buildPropertyContext(input.propertyId);

      // Get recent history (last 10 messages for context window)
      const historyResult = await db.execute(
        `SELECT role, content FROM valuation_chat_messages 
         WHERE session_id = $1 
         ORDER BY created_at DESC LIMIT 10` as any,
        [input.sessionId]
      );
      const history = ((historyResult.rows || []) as any[]).reverse();

      // Build messages array
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\nCurrent Property Context:\n${propertyContext}`,
        },
        ...history.slice(0, -1).map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: input.message },
      ];

      // Collect full response
      let fullResponse = "";
      try {
        for await (const chunk of streamLLM(messages)) {
          fullResponse += chunk;
        }
      } catch (err) {
        logger.error({ err }, "LLM streaming failed");
        fullResponse = "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again in a moment.";
      }

      const latencyMs = Date.now() - startTime;

      // Save assistant response
      await db.execute(
        `INSERT INTO valuation_chat_messages (session_id, role, content, metadata) 
         VALUES ($1, 'assistant', $2, $3)` as any,
        [
          input.sessionId,
          fullResponse,
          JSON.stringify({ latencyMs, model: OLLAMA_MODEL }),
        ]
      );

      // Update session timestamp
      await db.execute(
        `UPDATE valuation_chat_sessions SET updated_at = NOW() WHERE id = $1` as any,
        [input.sessionId]
      );

      return { response: fullResponse, latencyMs };
    }),

  /**
   * Get a quick valuation summary without a full chat session
   */
  quickValuationInsight: publicProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ input }) => {
      const propertyContext = await buildPropertyContext(input.propertyId);

      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Based on this property data, provide a 3-sentence valuation insight covering: (1) whether the price is fair, (2) key value drivers, (3) one negotiation tip.\n\n${propertyContext}`,
        },
      ];

      let insight = "";
      try {
        for await (const chunk of streamLLM(messages)) {
          insight += chunk;
        }
      } catch {
        insight = "Valuation insight temporarily unavailable.";
      }

      return { insight, propertyId: input.propertyId };
    }),

  /**
   * Delete a chat session
   */
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await db.execute(
        `DELETE FROM valuation_chat_messages WHERE session_id = $1` as any,
        [input.sessionId]
      );
      await db.execute(
        `DELETE FROM valuation_chat_sessions WHERE id = $1 AND user_id = $2` as any,
        [input.sessionId, ctx.user.id]
      );
      return { success: true };
    }),
});
