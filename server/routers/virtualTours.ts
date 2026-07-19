import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { virtualTours } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { storagePut } from '../storage';

export const virtualToursRouter = router({
  // Get virtual tour for a property
  getByProperty: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const tours = await db
        .select()
        .from(virtualTours)
        .where(eq(virtualTours.propertyId, input.propertyId))
        .limit(1);

      if (tours.length === 0) return null;

      const tour = tours[0];
      return {
        id: tour.id,
        propertyId: tour.propertyId,
        title: tour.title || 'Virtual Tour',
        scenes: tour.scenes ? JSON.parse(tour.scenes as string) : [],
        floorPlan: tour.floorPlanData ? JSON.parse(tour.floorPlanData as string) : null,
      };
    }),

  // Create virtual tour (protected)
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        title: z.string(),
        scenes: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            imageUrl: z.string(),
            hotSpots: z
              .array(
                z.object({
                  id: z.string(),
                  pitch: z.number(),
                  yaw: z.number(),
                  type: z.enum(['scene', 'info']),
                  text: z.string(),
                  sceneId: z.string().optional(),
                  description: z.string().optional(),
                })
              )
              .optional(),
          })
        ),
        floorPlan: z
          .object({
            imageUrl: z.string(),
            hotSpots: z.array(
              z.object({
                sceneId: z.string(),
                x: z.number(),
                y: z.number(),
              })
            ),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db.insert(virtualTours).values({
        propertyId: input.propertyId,
        title: input.title,
        scenes: JSON.stringify(input.scenes),
        floorPlanData: input.floorPlan ? JSON.stringify(input.floorPlan) : null,
        createdBy: ctx.user!.id,
      });

      return {
        success: true,
        tourId: Number(result.insertId),
      };
    }),

  // Update virtual tour (protected)
  update: protectedProcedure
    .input(
      z.object({
        tourId: z.number(),
        title: z.string().optional(),
        scenes: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              imageUrl: z.string(),
              hotSpots: z
                .array(
                  z.object({
                    id: z.string(),
                    pitch: z.number(),
                    yaw: z.number(),
                    type: z.enum(['scene', 'info']),
                    text: z.string(),
                    sceneId: z.string().optional(),
                    description: z.string().optional(),
                  })
                )
                .optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const updateData: any = {};
      if (input.title) updateData.title = input.title;
      if (input.scenes) updateData.scenes = JSON.stringify(input.scenes);

      await db
        .update(virtualTours)
        .set(updateData)
        .where(eq(virtualTours.id, input.tourId));

      return { success: true };
    }),

  // Delete virtual tour (protected)
  delete: protectedProcedure
    .input(z.object({ tourId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.delete(virtualTours).where(eq(virtualTours.id, input.tourId));
      return { success: true };
    }),

  // Upload 360° image
  uploadImage: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        sceneId: z.string(),
        imageData: z.string(), // Base64 encoded image
      })
    )
    .mutation(async ({ input }) => {
      // Decode base64 image
      const imageBuffer = Buffer.from(input.imageData.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      
      // Upload to S3
      const fileKey = `virtual-tours/${input.propertyId}/${input.sceneId}-${Date.now()}.jpg`;
      const { url } = await storagePut(fileKey, imageBuffer, 'image/jpeg');
      
      return {
        success: true,
        imageUrl: url,
      };
    }),
});
