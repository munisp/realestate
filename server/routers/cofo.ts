import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { cofoVerificationService } from "../services/cofoVerification";

export const cofoRouter = router({
  /**
   * Verify a C of O certificate
   */
  verify: publicProcedure
    .input(
      z.object({
        certificateNumber: z.string().min(1, "Certificate number is required"),
        ownerName: z.string().min(1, "Owner name is required"),
        propertyAddress: z.string().min(1, "Property address is required"),
        phoneNumber: z.string().optional(),
        documentUrl: z.string().optional()
      })
    )
    .mutation(async ({ input }) => {
      return await cofoVerificationService.verifyCertificate(input);
    }),

  /**
   * Batch verify multiple certificates
   */
  batchVerify: publicProcedure
    .input(
      z.object({
        requests: z.array(
          z.object({
            certificateNumber: z.string(),
            ownerName: z.string(),
            propertyAddress: z.string(),
            phoneNumber: z.string().optional(),
            documentUrl: z.string().optional()
          })
        )
      })
    )
    .mutation(async ({ input }) => {
      return await cofoVerificationService.batchVerify(input.requests);
    }),

  /**
   * Get verification by ID
   */
  getVerification: publicProcedure
    .input(
      z.object({
        verificationId: z.string()
      })
    )
    .query(async ({ input }) => {
      return cofoVerificationService.getVerification(input.verificationId);
    }),

  /**
   * Get verification history
   */
  getHistory: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50)
      })
    )
    .query(async ({ input }) => {
      return cofoVerificationService.getVerificationHistory(input.limit);
    }),

  /**
   * Search verification history
   */
  searchHistory: publicProcedure
    .input(
      z.object({
        certificateNumber: z.string()
      })
    )
    .query(async ({ input }) => {
      return cofoVerificationService.searchHistory(input.certificateNumber);
    }),

  /**
   * Get verification statistics
   */
  getStats: publicProcedure.query(async () => {
    return cofoVerificationService.getVerificationStats();
  })
});
