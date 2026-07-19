import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { deepseekOCRService } from "../services/deepseekOCRService";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

export const deepseekOCRRouter = router({
  /**
   * Extract C of O data from uploaded document image
   */
  extractCofOData: protectedProcedure
    .input(
      z.object({
        imageBase64: z.string(), // Base64 encoded image
        fileName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Upload image to S3 first
        const imageBuffer = Buffer.from(input.imageBase64, "base64");
        const fileKey = `cofo-ocr/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url: imageUrl } = await storagePut(fileKey, imageBuffer, "image/jpeg");

        // Extract data using DeepSeek OCR
        const result = await deepseekOCRService.extractCofOData(imageUrl);

        return {
          success: result.success,
          data: result.data,
          confidence: result.confidence,
          error: result.error,
          imageUrl,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to extract C of O data",
        });
      }
    }),

  /**
   * Extract C of O data from image URL
   */
  extractFromUrl: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await deepseekOCRService.extractCofOData(input.imageUrl);

        return {
          success: result.success,
          data: result.data,
          confidence: result.confidence,
          error: result.error,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to extract C of O data",
        });
      }
    }),

  /**
   * Extract raw text from document
   */
  extractRawText: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const text = await deepseekOCRService.extractRawText(input.imageUrl);

        return {
          success: true,
          text,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to extract text",
        });
      }
    }),

  /**
   * Validate document authenticity
   */
  validateAuthenticity: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await deepseekOCRService.validateDocumentAuthenticity(input.imageUrl);

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to validate document authenticity",
        });
      }
    }),

  /**
   * Compare two C of O documents
   */
  compareDocuments: protectedProcedure
    .input(
      z.object({
        imageUrl1: z.string().url(),
        imageUrl2: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await deepseekOCRService.compareDocuments(input.imageUrl1, input.imageUrl2);

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to compare documents",
        });
      }
    }),

  /**
   * Batch extract C of O data from multiple images
   */
  batchExtract: protectedProcedure
    .input(
      z.object({
        imageUrls: z.array(z.string().url()).max(20), // Limit to 20 documents per batch
      })
    )
    .mutation(async ({ input }) => {
      try {
        const results = await Promise.all(
          input.imageUrls.map(async (imageUrl) => {
            try {
              const result = await deepseekOCRService.extractCofOData(imageUrl);
              return {
                imageUrl,
                ...result,
              };
            } catch (error: any) {
              return {
                imageUrl,
                success: false,
                confidence: 0,
                error: error.message,
              };
            }
          })
        );

        return {
          results,
          totalProcessed: results.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to process batch extraction",
        });
      }
    }),
});
