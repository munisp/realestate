/**
 * Innovation 6: AR/3D Virtual Staging Metadata API
 *
 * Enables agents and sellers to create AR-ready virtual staging scenes for
 * empty properties. The API manages Three.js scene descriptors (JSON) that
 * describe furniture placement, materials, lighting, and camera positions.
 *
 * The client (React + Three.js/React Three Fiber) renders the scene in-browser
 * or exports it for AR viewing on mobile (WebXR).
 *
 * Architecture:
 *  - Scene descriptors stored as JSONB in PostgreSQL
 *  - Furniture catalog with Nigerian/African style presets
 *  - AI-powered room layout suggestion via Ollama
 *  - Scene sharing via public URL
 *  - Export to GLTF/GLB format descriptor
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { logger } from "../_core/logger";

// ── Scene Schema ───────────────────────────────────────────────────────────

const Vec3Schema = z.object({ x: z.number(), y: z.number(), z: z.number() });

const FurnitureItemSchema = z.object({
  id: z.string(),
  catalogId: z.string(),
  name: z.string(),
  category: z.enum(["sofa", "bed", "table", "chair", "wardrobe", "tv_unit", "rug", "lamp", "plant", "art", "other"]),
  position: Vec3Schema,
  rotation: Vec3Schema,
  scale: Vec3Schema.optional(),
  material: z.object({
    color: z.string().optional(),
    texture: z.string().optional(),
    roughness: z.number().min(0).max(1).optional(),
    metalness: z.number().min(0).max(1).optional(),
  }).optional(),
  modelUrl: z.string().url().optional(),
});

const RoomSceneSchema = z.object({
  roomId: z.string(),
  roomType: z.enum(["living_room", "bedroom", "kitchen", "bathroom", "dining_room", "office", "balcony"]),
  dimensions: z.object({ width: z.number(), length: z.number(), height: z.number() }),
  wallColor: z.string().default("#F5F5F0"),
  floorMaterial: z.enum(["tiles", "wood", "marble", "carpet", "concrete"]).default("tiles"),
  lightingPreset: z.enum(["natural_day", "natural_evening", "warm_ambient", "bright_modern", "cozy"]).default("natural_day"),
  furniture: z.array(FurnitureItemSchema),
  cameraPresets: z.array(z.object({
    name: z.string(),
    position: Vec3Schema,
    target: Vec3Schema,
    fov: z.number().default(60),
  })).optional(),
});

// ── Furniture Catalog ──────────────────────────────────────────────────────

const FURNITURE_CATALOG = [
  // Nigerian/African inspired pieces
  { id: "sofa-001", name: "Lagos Contemporary Sofa", category: "sofa", style: "modern_african", priceNGN: 450000, modelUrl: "/models/furniture/sofa-001.glb" },
  { id: "sofa-002", name: "Abuja L-Shape Sectional", category: "sofa", style: "modern", priceNGN: 680000, modelUrl: "/models/furniture/sofa-002.glb" },
  { id: "bed-001", name: "King Bed with Headboard", category: "bed", style: "classic", priceNGN: 380000, modelUrl: "/models/furniture/bed-001.glb" },
  { id: "bed-002", name: "Platform Bed Modern", category: "bed", style: "modern", priceNGN: 290000, modelUrl: "/models/furniture/bed-002.glb" },
  { id: "table-001", name: "6-Seater Dining Table", category: "table", style: "classic", priceNGN: 320000, modelUrl: "/models/furniture/table-001.glb" },
  { id: "table-002", name: "Glass Coffee Table", category: "table", style: "modern", priceNGN: 85000, modelUrl: "/models/furniture/table-002.glb" },
  { id: "wardrobe-001", name: "4-Door Sliding Wardrobe", category: "wardrobe", style: "modern", priceNGN: 520000, modelUrl: "/models/furniture/wardrobe-001.glb" },
  { id: "rug-001", name: "Ankara Print Area Rug", category: "rug", style: "african", priceNGN: 45000, modelUrl: "/models/furniture/rug-001.glb" },
  { id: "plant-001", name: "Tropical Palm Plant", category: "plant", style: "natural", priceNGN: 15000, modelUrl: "/models/furniture/plant-001.glb" },
  { id: "lamp-001", name: "Arc Floor Lamp", category: "lamp", style: "modern", priceNGN: 35000, modelUrl: "/models/furniture/lamp-001.glb" },
];

// ── AI Layout Suggestion ───────────────────────────────────────────────────

async function suggestFurnitureLayout(roomType: string, dimensions: { width: number; length: number; height: number }): Promise<any[]> {
  const prompt = `You are an interior designer. Suggest a furniture layout for a ${roomType} that is ${dimensions.width}m wide, ${dimensions.length}m long, and ${dimensions.height}m high in a Nigerian home. 
  
  Return a JSON array of furniture placements. Each item should have:
  - catalogId (from: sofa-001, sofa-002, bed-001, bed-002, table-001, table-002, wardrobe-001, rug-001, plant-001, lamp-001)
  - position: {x, y, z} in meters from room center
  - rotation: {x, y, z} in radians
  
  Return only valid JSON array, no explanation.`;

  try {
    const res = await fetch(`${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3.2",
        prompt,
        stream: false,
        format: "json",
      }),
    });
    const data = await res.json() as any;
    const suggestions = JSON.parse(data.response || "[]");
    return Array.isArray(suggestions) ? suggestions : [];
  } catch {
    // Return a sensible default layout
    return getDefaultLayout(roomType, dimensions);
  }
}

function getDefaultLayout(roomType: string, dims: { width: number; length: number }): any[] {
  const layouts: Record<string, any[]> = {
    living_room: [
      { catalogId: "sofa-001", position: { x: 0, y: 0, z: -dims.length * 0.2 }, rotation: { x: 0, y: 0, z: 0 } },
      { catalogId: "table-002", position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      { catalogId: "rug-001", position: { x: 0, y: 0.01, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 } },
      { catalogId: "plant-001", position: { x: dims.width * 0.4, y: 0, z: -dims.length * 0.4 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
    bedroom: [
      { catalogId: "bed-001", position: { x: 0, y: 0, z: -dims.length * 0.25 }, rotation: { x: 0, y: 0, z: 0 } },
      { catalogId: "wardrobe-001", position: { x: -dims.width * 0.35, y: 0, z: dims.length * 0.3 }, rotation: { x: 0, y: Math.PI / 2, z: 0 } },
      { catalogId: "lamp-001", position: { x: dims.width * 0.35, y: 0, z: -dims.length * 0.25 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
    dining_room: [
      { catalogId: "table-001", position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      { catalogId: "plant-001", position: { x: dims.width * 0.4, y: 0, z: dims.length * 0.4 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
  };
  return layouts[roomType] || layouts.living_room;
}

// ── Router ─────────────────────────────────────────────────────────────────

export const arVirtualStagingRouter = router({
  /**
   * Get the furniture catalog
   */
  getCatalog: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      style: z.string().optional(),
    }))
    .query(({ input }) => {
      let catalog = FURNITURE_CATALOG;
      if (input.category) catalog = catalog.filter((i) => i.category === input.category);
      if (input.style) catalog = catalog.filter((i) => i.style === input.style);
      return catalog;
    }),

  /**
   * Create a new staging scene for a property
   */
  createScene: protectedProcedure
    .input(z.object({
      propertyId: z.string(),
      name: z.string().min(1).max(100).default("My Staging"),
      rooms: z.array(RoomSceneSchema).min(1).max(10),
      isPublic: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.execute(
        `INSERT INTO ar_staging_scenes (property_id, created_by, name, rooms, is_public, created_at, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), NOW())
         RETURNING id, created_at` as any,
        [input.propertyId, ctx.user.id, input.name, JSON.stringify(input.rooms), input.isPublic]
      );

      const scene = result.rows[0] as any;
      logger.info({ sceneId: scene.id, propertyId: input.propertyId }, "AR staging scene created");
      return scene;
    }),

  /**
   * Get a staging scene
   */
  getScene: publicProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const result = await db.execute(
        `SELECT s.*, u.name as creator_name
         FROM ar_staging_scenes s
         LEFT JOIN users u ON u.id = s.created_by
         WHERE s.id = $1 AND (s.is_public = true OR s.created_by = $2)
         LIMIT 1` as any,
        [input.sceneId, ctx.user?.id ?? null]
      );

      if (!result.rows?.length) throw new Error("Scene not found or access denied");
      return result.rows[0];
    }),

  /**
   * List scenes for a property
   */
  listForProperty: publicProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ input, ctx }) => {
      const result = await db.execute(
        `SELECT id, name, is_public, created_at, jsonb_array_length(rooms) as room_count
         FROM ar_staging_scenes
         WHERE property_id = $1 AND (is_public = true OR created_by = $2)
         ORDER BY created_at DESC` as any,
        [input.propertyId, ctx.user?.id ?? null]
      );
      return result.rows || [];
    }),

  /**
   * Update a scene
   */
  updateScene: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      rooms: z.array(RoomSceneSchema).optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const updates: string[] = ["updated_at = NOW()"];
      const params: any[] = [input.sceneId, ctx.user.id];
      let paramIdx = 3;

      if (input.name !== undefined) { updates.push(`name = $${paramIdx++}`); params.push(input.name); }
      if (input.rooms !== undefined) { updates.push(`rooms = $${paramIdx++}::jsonb`); params.push(JSON.stringify(input.rooms)); }
      if (input.isPublic !== undefined) { updates.push(`is_public = $${paramIdx++}`); params.push(input.isPublic); }

      await db.execute(
        `UPDATE ar_staging_scenes SET ${updates.join(", ")} WHERE id = $1 AND created_by = $2` as any,
        params
      );
      return { success: true };
    }),

  /**
   * AI-powered layout suggestion
   */
  suggestLayout: publicProcedure
    .input(z.object({
      roomType: z.enum(["living_room", "bedroom", "kitchen", "bathroom", "dining_room", "office", "balcony"]),
      width: z.number().min(2).max(30),
      length: z.number().min(2).max(30),
      height: z.number().min(2).max(6).default(3),
      style: z.enum(["modern", "classic", "african", "minimalist", "luxury"]).default("modern"),
    }))
    .mutation(async ({ input }) => {
      const suggestions = await suggestFurnitureLayout(input.roomType, {
        width: input.width,
        length: input.length,
        height: input.height,
      });

      // Enrich with catalog data
      const enriched = suggestions.map((s: any) => {
        const catalogItem = FURNITURE_CATALOG.find((c) => c.id === s.catalogId);
        return { ...s, catalogItem };
      }).filter((s: any) => s.catalogItem);

      return {
        roomType: input.roomType,
        dimensions: { width: input.width, length: input.length, height: input.height },
        suggestions: enriched,
        estimatedFurnishingCostNGN: enriched.reduce((sum: number, s: any) => sum + (s.catalogItem?.priceNGN || 0), 0),
      };
    }),

  /**
   * Export scene as GLTF descriptor (for 3D printing / AR apps)
   */
  exportGltfDescriptor: publicProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const result = await db.execute(
        `SELECT rooms FROM ar_staging_scenes 
         WHERE id = $1 AND (is_public = true OR created_by = $2)` as any,
        [input.sceneId, ctx.user?.id ?? null]
      );

      if (!result.rows?.length) throw new Error("Scene not found");

      const rooms = (result.rows[0] as any).rooms as any[];

      // Build a minimal GLTF-compatible scene descriptor
      const gltfDescriptor = {
        asset: { version: "2.0", generator: "RealEstate AR Staging" },
        scene: 0,
        scenes: [{ name: "Staged Property", nodes: rooms.flatMap((r: any, ri: number) =>
          r.furniture.map((_: any, fi: number) => ri * 100 + fi)
        )}],
        nodes: rooms.flatMap((room: any) =>
          room.furniture.map((item: any) => ({
            name: item.name,
            translation: [item.position.x, item.position.y, item.position.z],
            rotation: [0, Math.sin(item.rotation.y / 2), 0, Math.cos(item.rotation.y / 2)],
            extras: { catalogId: item.catalogId, category: item.category },
          }))
        ),
        extensionsUsed: ["KHR_materials_pbrSpecularGlossiness"],
      };

      return gltfDescriptor;
    }),

  /**
   * Delete a scene
   */
  deleteScene: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await db.execute(
        `DELETE FROM ar_staging_scenes WHERE id = $1 AND created_by = $2` as any,
        [input.sceneId, ctx.user.id]
      );
      return { success: true };
    }),
});
