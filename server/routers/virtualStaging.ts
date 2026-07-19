import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  generateVirtualStaging,
  batchGenerateStaging,
  getAvailableRoomTypes,
  getAvailableStyles,
} from '../services/virtualStaging';

export const virtualStagingRouter = router({
  /**
   * Generate a single virtually staged image
   */
  generateStaging: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        roomType: z.enum([
          'living_room',
          'bedroom',
          'kitchen',
          'dining_room',
          'bathroom',
          'office',
          'outdoor',
        ]),
        style: z.enum([
          'modern',
          'traditional',
          'minimalist',
          'luxury',
          'scandinavian',
          'industrial',
          'bohemian',
        ]),
        originalImageUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      return await generateVirtualStaging(input);
    }),

  /**
   * Batch generate multiple staged images
   */
  batchGenerateStaging: protectedProcedure
    .input(
      z.array(
        z.object({
          propertyId: z.number(),
          roomType: z.enum([
            'living_room',
            'bedroom',
            'kitchen',
            'dining_room',
            'bathroom',
            'office',
            'outdoor',
          ]),
          style: z.enum([
            'modern',
            'traditional',
            'minimalist',
            'luxury',
            'scandinavian',
            'industrial',
            'bohemian',
          ]),
          originalImageUrl: z.string().url(),
        })
      )
    )
    .mutation(async ({ input }) => {
      return await batchGenerateStaging(input);
    }),

  /**
   * Get available room types
   */
  getRoomTypes: protectedProcedure.query(() => {
    return getAvailableRoomTypes();
  }),

  /**
   * Get available staging styles
   */
  getStyles: protectedProcedure.query(() => {
    return getAvailableStyles();
  }),
});
