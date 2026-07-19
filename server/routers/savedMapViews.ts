// @ts-nocheck
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { savedMapViews } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';

/**
 * Saved Map Views Router
 * 
 * Allows users to save and restore map states including:
 * - Center position and zoom level
 * - Property filters (price, bedrooms, type, etc.)
 * - Heatmap preferences (mode, intensity, radius)
 * - Clustering preferences
 * 
 * Features:
 * - Save current map view
 * - Load saved views
 * - Update existing views
 * - Delete views
 * - Set default view
 * - Share views via token
 */

const mapFiltersSchema = z.object({
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  propertyType: z.array(z.string()).optional(),
  listingType: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  squareFeetMin: z.number().optional(),
  squareFeetMax: z.number().optional(),
  yearBuiltMin: z.number().optional(),
  yearBuiltMax: z.number().optional(),
});

export const savedMapViewsRouter = router({
  /**
   * Get all saved map views for current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const views = await db
      .select()
      .from(savedMapViews)
      .where(eq(savedMapViews.userId, ctx.user.id))
      .orderBy(desc(savedMapViews.isDefault), desc(savedMapViews.updatedAt));

    return views.map(view => ({
      ...view,
      filters: view.filters ? JSON.parse(view.filters) : null,
      clusteringEnabled: Boolean(view.clusteringEnabled),
      isDefault: Boolean(view.isDefault),
    }));
  }),

  /**
   * Get a specific saved map view by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const views = await db
        .select()
        .from(savedMapViews)
        .where(
          and(
            eq(savedMapViews.id, input.id),
            eq(savedMapViews.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (views.length === 0) {
        throw new Error('Saved map view not found');
      }

      const view = views[0];
      return {
        ...view,
        filters: view.filters ? JSON.parse(view.filters) : null,
        clusteringEnabled: Boolean(view.clusteringEnabled),
        isDefault: Boolean(view.isDefault),
      };
    }),

  /**
   * Get a shared map view by token (no auth required)
   */
  getByShareToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const views = await db
        .select()
        .from(savedMapViews)
        .where(eq(savedMapViews.shareToken, input.token))
        .limit(1);

      if (views.length === 0) {
        throw new Error('Shared map view not found');
      }

      const view = views[0];
      return {
        ...view,
        filters: view.filters ? JSON.parse(view.filters) : null,
        clusteringEnabled: Boolean(view.clusteringEnabled),
        isDefault: Boolean(view.isDefault),
      };
    }),

  /**
   * Save a new map view
   */
  save: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        centerLat: z.number(),
        centerLng: z.number(),
        zoom: z.number().min(1).max(22),
        filters: mapFiltersSchema.optional(),
        heatmapMode: z.enum(['density', 'price', 'combined', 'none']).optional(),
        heatmapIntensity: z.number().min(0).max(200).optional(),
        heatmapRadius: z.number().min(10).max(50).optional(),
        clusteringEnabled: z.boolean().optional(),
        minClusterSize: z.number().min(2).optional(),
        isDefault: z.boolean().optional(),
        generateShareToken: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await db
          .update(savedMapViews)
          .set({ isDefault: 0 })
          .where(eq(savedMapViews.userId, ctx.user.id));
      }

      // Generate share token if requested
      const shareToken = input.generateShareToken
        ? randomBytes(32).toString('hex')
        : null;

      const result = await db.insert(savedMapViews).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description || null,
        centerLat: input.centerLat.toString(),
        centerLng: input.centerLng.toString(),
        zoom: input.zoom,
        filters: input.filters ? JSON.stringify(input.filters) : null,
        heatmapMode: input.heatmapMode || 'none',
        heatmapIntensity: input.heatmapIntensity || 100,
        heatmapRadius: input.heatmapRadius || 25,
        clusteringEnabled: input.clusteringEnabled ? 1 : 0,
        minClusterSize: input.minClusterSize || 2,
        isDefault: input.isDefault ? 1 : 0,
        shareToken,
      });

      return {
        id: Number(result.insertId),
        shareToken,
        message: 'Map view saved successfully',
      };
    }),

  /**
   * Update an existing map view
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        centerLat: z.number().optional(),
        centerLng: z.number().optional(),
        zoom: z.number().min(1).max(22).optional(),
        filters: mapFiltersSchema.optional(),
        heatmapMode: z.enum(['density', 'price', 'combined', 'none']).optional(),
        heatmapIntensity: z.number().min(0).max(200).optional(),
        heatmapRadius: z.number().min(10).max(50).optional(),
        clusteringEnabled: z.boolean().optional(),
        minClusterSize: z.number().min(2).optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Verify ownership
      const existing = await db
        .select()
        .from(savedMapViews)
        .where(
          and(
            eq(savedMapViews.id, input.id),
            eq(savedMapViews.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Saved map view not found or access denied');
      }

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await db
          .update(savedMapViews)
          .set({ isDefault: 0 })
          .where(eq(savedMapViews.userId, ctx.user.id));
      }

      // Build update object
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.centerLat !== undefined) updateData.centerLat = input.centerLat.toString();
      if (input.centerLng !== undefined) updateData.centerLng = input.centerLng.toString();
      if (input.zoom !== undefined) updateData.zoom = input.zoom;
      if (input.filters !== undefined) updateData.filters = JSON.stringify(input.filters);
      if (input.heatmapMode !== undefined) updateData.heatmapMode = input.heatmapMode;
      if (input.heatmapIntensity !== undefined) updateData.heatmapIntensity = input.heatmapIntensity;
      if (input.heatmapRadius !== undefined) updateData.heatmapRadius = input.heatmapRadius;
      if (input.clusteringEnabled !== undefined) updateData.clusteringEnabled = input.clusteringEnabled ? 1 : 0;
      if (input.minClusterSize !== undefined) updateData.minClusterSize = input.minClusterSize;
      if (input.isDefault !== undefined) updateData.isDefault = input.isDefault ? 1 : 0;

      await db
        .update(savedMapViews)
        .set(updateData)
        .where(eq(savedMapViews.id, input.id));

      return {
        message: 'Map view updated successfully',
      };
    }),

  /**
   * Delete a saved map view
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Verify ownership
      const existing = await db
        .select()
        .from(savedMapViews)
        .where(
          and(
            eq(savedMapViews.id, input.id),
            eq(savedMapViews.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Saved map view not found or access denied');
      }

      await db
        .delete(savedMapViews)
        .where(eq(savedMapViews.id, input.id));

      return {
        message: 'Map view deleted successfully',
      };
    }),

  /**
   * Set a map view as default
   */
  setDefault: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Verify ownership
      const existing = await db
        .select()
        .from(savedMapViews)
        .where(
          and(
            eq(savedMapViews.id, input.id),
            eq(savedMapViews.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Saved map view not found or access denied');
      }

      // Unset all defaults
      await db
        .update(savedMapViews)
        .set({ isDefault: 0 })
        .where(eq(savedMapViews.userId, ctx.user.id));

      // Set new default
      await db
        .update(savedMapViews)
        .set({ isDefault: 1 })
        .where(eq(savedMapViews.id, input.id));

      return {
        message: 'Default map view set successfully',
      };
    }),

  /**
   * Generate or regenerate share token
   */
  generateShareToken: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Verify ownership
      const existing = await db
        .select()
        .from(savedMapViews)
        .where(
          and(
            eq(savedMapViews.id, input.id),
            eq(savedMapViews.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Saved map view not found or access denied');
      }

      const shareToken = randomBytes(32).toString('hex');

      await db
        .update(savedMapViews)
        .set({ shareToken })
        .where(eq(savedMapViews.id, input.id));

      return {
        shareToken,
        message: 'Share token generated successfully',
      };
    }),

  /**
   * Remove share token (make view private)
   */
  removeShareToken: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Verify ownership
      const existing = await db
        .select()
        .from(savedMapViews)
        .where(
          and(
            eq(savedMapViews.id, input.id),
            eq(savedMapViews.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Saved map view not found or access denied');
      }

      await db
        .update(savedMapViews)
        .set({ shareToken: null })
        .where(eq(savedMapViews.id, input.id));

      return {
        message: 'Share token removed successfully',
      };
    }),

  /**
   * Get default map view for current user
   */
  getDefault: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return null;
    }

    const views = await db
      .select()
      .from(savedMapViews)
      .where(
        and(
          eq(savedMapViews.userId, ctx.user.id),
          eq(savedMapViews.isDefault, 1)
        )
      )
      .limit(1);

    if (views.length === 0) {
      return null;
    }

    const view = views[0];
    return {
      ...view,
      filters: view.filters ? JSON.parse(view.filters) : null,
      clusteringEnabled: Boolean(view.clusteringEnabled),
      isDefault: Boolean(view.isDefault),
    };
  }),
});
