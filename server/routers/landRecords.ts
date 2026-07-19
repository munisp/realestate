import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as landRecordsDb from "../db-land-records";
import * as cofOVerification from "../services/cofOVerificationService";
import * as blockchainService from "../services/blockchainLandRegistryService";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

/**
 * Land Records tRPC Router
 * Handles all land registry, C of O verification, and blockchain operations
 */

export const landRecordsRouter = router({
  // ==================== LAND RECORDS ====================

  /**
   * Create a new land record
   */
  create: protectedProcedure
    .input(
      z.object({
        parcelId: z.string(),
        propertyId: z.number().optional(),
        address: z.string(),
        city: z.string(),
        state: z.string(),
        lga: z.string().optional(),
        ward: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        landSize: z.number(),
        landSizeUnit: z.string().default("sqm"),
        landUseType: z.enum([
          "residential",
          "commercial",
          "industrial",
          "agricultural",
          "mixed_use",
          "recreational",
          "institutional",
        ]),
        zoning: z.string().optional(),
        ownershipType: z.enum([
          "individual",
          "corporate",
          "government",
          "cooperative",
          "trust",
          "joint_ownership",
        ]),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if parcel ID already exists
      const existing = await landRecordsDb.getLandRecordByParcelId(
        input.parcelId
      );
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Land record with this parcel ID already exists",
        });
      }

      const record = await landRecordsDb.createLandRecord({
        ...input,
        landSize: input.landSize.toString(),
        currentOwnerId: ctx.user.id,
      });

      return record;
    }),

  /**
   * Get land record by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const record = await landRecordsDb.getLandRecordById(input.id);
      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Land record not found",
        });
      }
      return record;
    }),

  /**
   * Get land record by parcel ID
   */
  getByParcelId: publicProcedure
    .input(z.object({ parcelId: z.string() }))
    .query(async ({ input }) => {
      const record = await landRecordsDb.getLandRecordByParcelId(
        input.parcelId
      );
      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Land record not found",
        });
      }
      return record;
    }),

  /**
   * Get land records owned by current user
   */
  getMyLandRecords: protectedProcedure.query(async ({ ctx }) => {
    return await landRecordsDb.getLandRecordsByOwner(ctx.user.id);
  }),

  /**
   * Search land records
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        landUseType: z.string().optional(),
        isVerified: z.boolean().optional(),
        isOnBlockchain: z.boolean().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return await landRecordsDb.searchLandRecords(input);
    }),

  /**
   * Get land records statistics
   */
  getStats: publicProcedure.query(async () => {
    return await landRecordsDb.getLandRecordsStats();
  }),

  // ==================== CERTIFICATE OF OCCUPANCY ====================

  /**
   * Create C of O record
   */
  createCofO: protectedProcedure
    .input(
      z.object({
        landRecordId: z.number(),
        cofONumber: z.string(),
        fileNumber: z.string().optional(),
        issueDate: z.date(),
        expiryDate: z.date().optional(),
        issuingAuthority: z.string(),
        registrySource: z.enum([
          "lagos_state",
          "fct_abuja",
          "rivers_state",
          "kano_state",
          "oyo_state",
          "manual_entry",
        ]),
        holderName: z.string(),
        holderAddress: z.string().optional(),
        holderIdNumber: z.string().optional(),
        term: z.string().optional(),
        purpose: z.string().optional(),
        conditions: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if C of O number already exists
      const existing = await landRecordsDb.getCofOByNumber(input.cofONumber);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "C of O with this number already exists",
        });
      }

      const cofO = await landRecordsDb.createCertificateOfOccupancy({
        ...input,
        status: "pending_renewal",
      });

      return cofO;
    }),

  /**
   * Get C of O by number
   */
  getCofOByNumber: publicProcedure
    .input(z.object({ cofONumber: z.string() }))
    .query(async ({ input }) => {
      const cofO = await landRecordsDb.getCofOByNumber(input.cofONumber);
      if (!cofO) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "C of O not found",
        });
      }
      return cofO;
    }),

  /**
   * Get C of O for land record
   */
  getCofOByLandRecord: publicProcedure
    .input(z.object({ landRecordId: z.number() }))
    .query(async ({ input }) => {
      return await landRecordsDb.getCofOByLandRecord(input.landRecordId);
    }),

  /**
   * Verify C of O
   */
  verifyCofO: protectedProcedure
    .input(
      z.object({
        cofONumber: z.string(),
        fileNumber: z.string().optional(),
        holderName: z.string(),
        issueDate: z.date(),
        issuingAuthority: z.string(),
        state: z.string(),
        registrySource: z.string(),
        documentUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Run verification
      const result = await cofOVerification.verifyCofO(
        {
          cofONumber: input.cofONumber,
          fileNumber: input.fileNumber,
          holderName: input.holderName,
          issueDate: input.issueDate,
          issuingAuthority: input.issuingAuthority,
          documentUrl: input.documentUrl,
        },
        input.state,
        input.registrySource
      );

      return result;
    }),

  /**
   * Upload C of O document
   */
  uploadCofODocument: protectedProcedure
    .input(
      z.object({
        cofOId: z.number(),
        fileData: z.string(), // Base64 encoded file
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate document
      const validation = cofOVerification.validateCofODocument(
        input.fileType,
        input.fileSize
      );

      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error,
        });
      }

      // Upload to S3
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `cofo-documents/${input.cofOId}/${Date.now()}-${input.fileName}`;

      const { url } = await storagePut(fileKey, buffer, input.fileType);

      // Calculate document hash
      const documentHash = cofOVerification.calculateDocumentHash(url);

      // Update C of O record
      await landRecordsDb.updateCofO(input.cofOId, {
        documentUrl: url,
        documentHash,
      });

      return { url, documentHash };
    }),

  // ==================== OWNERSHIP HISTORY ====================

  /**
   * Get ownership history
   */
  getOwnershipHistory: publicProcedure
    .input(z.object({ landRecordId: z.number() }))
    .query(async ({ input }) => {
      return await landRecordsDb.getOwnershipHistory(input.landRecordId);
    }),

  /**
   * Create ownership transfer
   */
  createOwnershipTransfer: protectedProcedure
    .input(
      z.object({
        landRecordId: z.number(),
        transferType: z.enum([
          "sale",
          "gift",
          "inheritance",
          "court_order",
          "government_acquisition",
          "lease",
        ]),
        transferDate: z.date(),
        previousOwnerName: z.string().optional(),
        newOwnerName: z.string(),
        salePrice: z.number().optional(),
        currency: z.string().default("NGN"),
        lawyerName: z.string().optional(),
        lawyerFirmName: z.string().optional(),
        registrationNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get current land record
      const landRecord = await landRecordsDb.getLandRecordById(
        input.landRecordId
      );
      if (!landRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Land record not found",
        });
      }

      // Create ownership transfer
      const transfer = await landRecordsDb.createOwnershipTransfer({
        ...input,
        salePrice: input.salePrice?.toString(),
        previousOwnerId: landRecord.currentOwnerId,
        newOwnerId: ctx.user.id,
      });

      // Record on blockchain
      await blockchainService.recordOwnershipTransferOnBlockchain(transfer.id);

      return transfer;
    }),

  // ==================== LAND DOCUMENTS ====================

  /**
   * Get documents for land record
   */
  getDocuments: publicProcedure
    .input(z.object({ landRecordId: z.number() }))
    .query(async ({ input }) => {
      return await landRecordsDb.getLandDocumentsByLandRecord(
        input.landRecordId
      );
    }),

  /**
   * Upload land document
   */
  uploadDocument: protectedProcedure
    .input(
      z.object({
        landRecordId: z.number(),
        documentType: z.enum([
          "certificate_of_occupancy",
          "deed_of_assignment",
          "survey_plan",
          "building_approval",
          "tax_clearance",
          "development_permit",
          "land_purchase_receipt",
          "power_of_attorney",
          "governor_consent",
          "other",
        ]),
        documentName: z.string(),
        documentNumber: z.string().optional(),
        fileData: z.string(), // Base64
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        issueDate: z.date().optional(),
        expiryDate: z.date().optional(),
        issuingAuthority: z.string().optional(),
        description: z.string().optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Upload to S3
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `land-documents/${input.landRecordId}/${Date.now()}-${input.fileName}`;

      const { url } = await storagePut(fileKey, buffer, input.fileType);

      // Calculate file hash
      const fileHash = cofOVerification.calculateDocumentHash(url);

      // Create document record
      const document = await landRecordsDb.createLandDocument({
        landRecordId: input.landRecordId,
        documentType: input.documentType,
        documentName: input.documentName,
        documentNumber: input.documentNumber,
        fileUrl: url,
        fileSize: input.fileSize,
        fileType: input.fileType,
        fileHash,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate,
        issuingAuthority: input.issuingAuthority,
        uploadedBy: ctx.user.id,
        isPublic: input.isPublic,
        description: input.description,
      });

      return document;
    }),

  // ==================== VERIFICATION REQUESTS ====================

  /**
   * Create verification request
   */
  createVerificationRequest: protectedProcedure
    .input(
      z.object({
        landRecordId: z.number(),
        cofOId: z.number().optional(),
        requestType: z.enum([
          "full_verification",
          "cofo_only",
          "ownership_only",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const request = await cofOVerification.createVerificationRequest(
        input.landRecordId,
        input.cofOId || null,
        input.requestType,
        ctx.user.id
      );

      return request;
    }),

  /**
   * Get verification requests for user
   */
  getMyVerificationRequests: protectedProcedure.query(async ({ ctx }) => {
    return await landRecordsDb.getVerificationRequestsByUser(ctx.user.id);
  }),

  /**
   * Get verification history for land record
   */
  getVerificationHistory: publicProcedure
    .input(z.object({ landRecordId: z.number() }))
    .query(async ({ input }) => {
      return await cofOVerification.getVerificationHistory(input.landRecordId);
    }),

  // ==================== BLOCKCHAIN ====================

  /**
   * Register land on blockchain
   */
  registerOnBlockchain: protectedProcedure
    .input(z.object({ landRecordId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await blockchainService.registerLandOnBlockchain(
        input.landRecordId
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Failed to register on blockchain",
        });
      }

      return result;
    }),

  /**
   * Get blockchain audit trail
   */
  getAuditTrail: publicProcedure
    .input(z.object({ landRecordId: z.number() }))
    .query(async ({ input }) => {
      return await blockchainService.generateAuditTrail(input.landRecordId);
    }),

  /**
   * Verify blockchain transaction
   */
  verifyBlockchainTransaction: publicProcedure
    .input(z.object({ transactionHash: z.string() }))
    .query(async ({ input }) => {
      const isValid = await blockchainService.verifyBlockchainTransaction(
        input.transactionHash
      );
      return { isValid };
    }),
});
