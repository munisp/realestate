/**
 * Innovation 2: Real-Time Collaborative Property Comparison Board
 *
 * Allows multiple users (agents, buyers, families) to simultaneously build
 * and annotate a shared property shortlist — like a Miro board for real estate.
 *
 * Architecture:
 *  - Shared "boards" stored in PostgreSQL
 *  - Last-write-wins CRDT for concurrent edits (vector clock per cell)
 *  - WebSocket channel via existing Fluvio/realtime infrastructure
 *  - Presence tracking (who is viewing/editing)
 *  - Export to PDF comparison report
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { logger } from "../_core/logger";

// ── Types ──────────────────────────────────────────────────────────────────

const BoardColumnSchema = z.object({
  propertyId: z.string(),
  addedBy: z.string(),
  addedAt: z.string(),
  notes: z.string().optional(),
  score: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
  vectorClock: z.record(z.number()).optional(), // userId -> lamport timestamp
});

const BoardCellUpdateSchema = z.object({
  boardId: z.string().uuid(),
  propertyId: z.string(),
  field: z.enum(["notes", "score", "tags"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
  vectorClock: z.record(z.number()),
});

// ── Router ─────────────────────────────────────────────────────────────────

export const collaborativeBoardRouter = router({
  /**
   * Create a new comparison board
   */
  createBoard: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await db.execute(
        `INSERT INTO comparison_boards (name, description, owner_id, is_public, columns, collaborators)
         VALUES ($1, $2, $3, $4, '[]'::jsonb, '[]'::jsonb)
         RETURNING id, name, created_at` as any,
        [input.name, input.description ?? null, ctx.user.id, input.isPublic]
      );
      const board = (result.rows[0] as any);
      logger.info({ boardId: board.id, userId: ctx.user.id }, "Comparison board created");
      return board;
    }),

  /**
   * Get a board by ID (public boards accessible without auth)
   */
  getBoard: publicProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const result = await db.execute(
        `SELECT b.*, 
                u.name as owner_name,
                array_agg(DISTINCT c.user_id) FILTER (WHERE c.user_id IS NOT NULL) as collaborator_ids
         FROM comparison_boards b
         LEFT JOIN users u ON u.id = b.owner_id
         LEFT JOIN board_collaborators c ON c.board_id = b.id
         WHERE b.id = $1
           AND (b.is_public = true OR b.owner_id = $2 OR c.user_id = $2)
         GROUP BY b.id, u.name
         LIMIT 1` as any,
        [input.boardId, ctx.user?.id ?? null]
      );

      if (!result.rows?.length) {
        throw new Error("Board not found or access denied");
      }

      const board = result.rows[0] as any;

      // Enrich columns with property data
      const columns = (board.columns || []) as any[];
      const enriched = await Promise.all(
        columns.map(async (col: any) => {
          try {
            const propResult = await db.execute(
              `SELECT id, title, price, currency, city, state, bedrooms, bathrooms, 
                      size_sqm, property_type, condition, images
               FROM properties WHERE id = $1 LIMIT 1` as any,
              [col.propertyId]
            );
            return { ...col, property: propResult.rows?.[0] ?? null };
          } catch {
            return { ...col, property: null };
          }
        })
      );

      return { ...board, columns: enriched };
    }),

  /**
   * List boards for the current user
   */
  listMyBoards: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const result = await db.execute(
        `SELECT b.id, b.name, b.description, b.is_public, b.created_at, b.updated_at,
                jsonb_array_length(b.columns) as property_count
         FROM comparison_boards b
         LEFT JOIN board_collaborators c ON c.board_id = b.id
         WHERE b.owner_id = $1 OR c.user_id = $1
         ORDER BY b.updated_at DESC
         LIMIT $2` as any,
        [ctx.user.id, input.limit]
      );
      return result.rows || [];
    }),

  /**
   * Add a property to a board
   */
  addProperty: protectedProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        propertyId: z.string(),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify access
      const access = await db.execute(
        `SELECT id FROM comparison_boards 
         WHERE id = $1 AND (owner_id = $2 OR id IN (
           SELECT board_id FROM board_collaborators WHERE user_id = $2
         ))` as any,
        [input.boardId, ctx.user.id]
      );
      if (!access.rows?.length) throw new Error("Access denied");

      const newColumn = {
        propertyId: input.propertyId,
        addedBy: ctx.user.id,
        addedAt: new Date().toISOString(),
        notes: input.notes ?? "",
        score: null,
        tags: [],
        vectorClock: { [ctx.user.id]: 1 },
      };

      await db.execute(
        `UPDATE comparison_boards 
         SET columns = columns || $1::jsonb, updated_at = NOW()
         WHERE id = $2` as any,
        [JSON.stringify(newColumn), input.boardId]
      );

      // Publish real-time event
      try {
        const { fluvioPublish } = await import("../services/fluvioClient");
        await fluvioPublish("property-views", {
          type: "board_property_added",
          boardId: input.boardId,
          propertyId: input.propertyId,
          userId: ctx.user.id,
          timestamp: new Date().toISOString(),
        });
      } catch {}

      return { success: true, column: newColumn };
    }),

  /**
   * Update a cell in the board (CRDT last-write-wins with vector clock)
   */
  updateCell: protectedProcedure
    .input(BoardCellUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      // Fetch current board
      const boardResult = await db.execute(
        `SELECT columns FROM comparison_boards 
         WHERE id = $1 AND (owner_id = $2 OR id IN (
           SELECT board_id FROM board_collaborators WHERE user_id = $2
         ))` as any,
        [input.boardId, ctx.user.id]
      );

      if (!boardResult.rows?.length) throw new Error("Access denied");

      const columns = (boardResult.rows[0] as any).columns as any[];
      const colIdx = columns.findIndex((c: any) => c.propertyId === input.propertyId);
      if (colIdx === -1) throw new Error("Property not found in board");

      const col = columns[colIdx];
      const existingClock = col.vectorClock || {};
      const incomingClock = input.vectorClock;

      // CRDT: accept update if incoming clock >= existing clock for this user
      const myExisting = existingClock[ctx.user.id] || 0;
      const myIncoming = incomingClock[ctx.user.id] || 0;

      if (myIncoming > myExisting) {
        col[input.field] = input.value;
        // Merge vector clocks (take max of each entry)
        const mergedClock: Record<string, number> = { ...existingClock };
        for (const [uid, ts] of Object.entries(incomingClock)) {
          mergedClock[uid] = Math.max(mergedClock[uid] || 0, ts);
        }
        col.vectorClock = mergedClock;
        columns[colIdx] = col;

        await db.execute(
          `UPDATE comparison_boards SET columns = $1::jsonb, updated_at = NOW() WHERE id = $2` as any,
          [JSON.stringify(columns), input.boardId]
        );

        return { accepted: true, vectorClock: mergedClock };
      }

      return { accepted: false, reason: "Stale update rejected by CRDT" };
    }),

  /**
   * Remove a property from a board
   */
  removeProperty: protectedProcedure
    .input(z.object({ boardId: z.string().uuid(), propertyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const boardResult = await db.execute(
        `SELECT columns FROM comparison_boards WHERE id = $1 AND owner_id = $2` as any,
        [input.boardId, ctx.user.id]
      );
      if (!boardResult.rows?.length) throw new Error("Access denied — only owner can remove properties");

      const columns = ((boardResult.rows[0] as any).columns as any[]).filter(
        (c: any) => c.propertyId !== input.propertyId
      );

      await db.execute(
        `UPDATE comparison_boards SET columns = $1::jsonb, updated_at = NOW() WHERE id = $2` as any,
        [JSON.stringify(columns), input.boardId]
      );

      return { success: true };
    }),

  /**
   * Invite a collaborator to a board
   */
  inviteCollaborator: protectedProcedure
    .input(z.object({ boardId: z.string().uuid(), email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const board = await db.execute(
        `SELECT id FROM comparison_boards WHERE id = $1 AND owner_id = $2` as any,
        [input.boardId, ctx.user.id]
      );
      if (!board.rows?.length) throw new Error("Only the board owner can invite collaborators");

      // Find user by email
      const userResult = await db.execute(
        `SELECT id, name FROM users WHERE email = $1 LIMIT 1` as any,
        [input.email]
      );

      if (!userResult.rows?.length) {
        return { success: false, message: "User not found. They need to register first." };
      }

      const invitedUser = userResult.rows[0] as any;

      await db.execute(
        `INSERT INTO board_collaborators (board_id, user_id, invited_by, invited_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (board_id, user_id) DO NOTHING` as any,
        [input.boardId, invitedUser.id, ctx.user.id]
      );

      return { success: true, collaborator: { id: invitedUser.id, name: invitedUser.name } };
    }),

  /**
   * Generate a side-by-side comparison summary using AI
   */
  generateComparisonSummary: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const boardResult = await db.execute(
        `SELECT b.name, b.columns FROM comparison_boards b
         WHERE b.id = $1 AND (b.owner_id = $2 OR b.id IN (
           SELECT board_id FROM board_collaborators WHERE user_id = $2
         ))` as any,
        [input.boardId, ctx.user.id]
      );

      if (!boardResult.rows?.length) throw new Error("Access denied");

      const board = boardResult.rows[0] as any;
      const columns = board.columns as any[];

      if (columns.length < 2) {
        return { summary: "Add at least 2 properties to generate a comparison summary." };
      }

      // Fetch property details for all columns
      const properties = await Promise.all(
        columns.slice(0, 6).map(async (col: any) => {
          const r = await db.execute(
            `SELECT title, price, currency, city, bedrooms, bathrooms, size_sqm, condition 
             FROM properties WHERE id = $1 LIMIT 1` as any,
            [col.propertyId]
          );
          const p = r.rows?.[0] as any;
          return p ? `${p.title}: ${p.currency} ${Number(p.price).toLocaleString()}, ${p.bedrooms}bd/${p.bathrooms}ba, ${p.size_sqm}sqm, ${p.city}, ${p.condition}` : col.propertyId;
        })
      );

      const prompt = `Compare these ${properties.length} properties and recommend the best value for money in 3 bullet points:\n${properties.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;

      let summary = "";
      try {
        const res = await fetch(`${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: process.env.OLLAMA_MODEL || "llama3.2", prompt, stream: false }),
        });
        const data = await res.json() as any;
        summary = data.response || "Summary unavailable";
      } catch {
        summary = `Comparing ${properties.length} properties. Top pick based on price-per-sqm analysis would require live AI service.`;
      }

      // Save summary to board metadata
      await db.execute(
        `UPDATE comparison_boards SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{aiSummary}', $1::jsonb) WHERE id = $2` as any,
        [JSON.stringify(summary), input.boardId]
      );

      return { summary };
    }),

  /**
   * Delete a board
   */
  deleteBoard: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await db.execute(
        `DELETE FROM board_collaborators WHERE board_id = $1` as any,
        [input.boardId]
      );
      await db.execute(
        `DELETE FROM comparison_boards WHERE id = $1 AND owner_id = $2` as any,
        [input.boardId, ctx.user.id]
      );
      return { success: true };
    }),
});
