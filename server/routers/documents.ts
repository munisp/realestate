import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut, storageGet } from "../storage";
import { getDb } from "../db";
import { builders, builderProjects, projectMilestones } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Document Upload Router
 * Handles S3 document uploads for builder applications and project photos
 */
export const documentsRouter = router({
  /**
   * Upload builder application document (CAC, license, portfolio)
   */
  uploadBuilderDocument: protectedProcedure
    .input(
      z.object({
        builderId: z.number(),
        documentType: z.enum(["cac_certificate", "building_license", "portfolio", "other"]),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file data
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database unavailable");
      }

      // Verify builder ownership
      const [builder] = await db
        .select()
        .from(builders)
        .where(eq(builders.userId, ctx.user.id));

      if (!builder || builder.id !== input.builderId) {
        throw new Error("Unauthorized: You can only upload documents for your own builder profile");
      }

      // Validate file size (max 10MB)
      const fileBuffer = Buffer.from(input.fileData, "base64");
      const fileSizeInMB = fileBuffer.length / (1024 * 1024);
      if (fileSizeInMB > 10) {
        throw new Error("File size exceeds 10MB limit");
      }

      // Validate MIME type
      const allowedMimeTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedMimeTypes.includes(input.mimeType)) {
        throw new Error("Invalid file type. Allowed: PDF, JPEG, PNG, DOC, DOCX");
      }

      // Generate unique file key with random suffix to prevent enumeration
      const randomSuffix = crypto.randomBytes(8).toString("hex");
      const fileExtension = input.fileName.split(".").pop();
      const fileKey = `builder-documents/${input.builderId}/${input.documentType}/${randomSuffix}.${fileExtension}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

      // Update builder record with document URL
      const documentsJson = builder.verificationDocuments ? JSON.parse(builder.verificationDocuments) : {};
      documentsJson[input.documentType] = {
        url,
        fileName: input.fileName,
        uploadedAt: new Date().toISOString(),
      };

      await db
        .update(builders)
        .set({
          verificationDocuments: JSON.stringify(documentsJson),
        })
        .where(eq(builders.id, input.builderId));

      return {
        success: true,
        url,
        documentType: input.documentType,
      };
    }),

  /**
   * Upload project milestone photo
   */
  uploadMilestonePhoto: protectedProcedure
    .input(
      z.object({
        milestoneId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded image data
        mimeType: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database unavailable");
      }

      // Verify milestone ownership
      const [milestone] = await db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, input.milestoneId));

      if (!milestone) {
        throw new Error("Milestone not found");
      }

      // Verify project ownership
      const [project] = await db
        .select()
        .from(builderProjects)
        .where(eq(builderProjects.id, milestone.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const [builder] = await db
        .select()
        .from(builders)
        .where(eq(builders.id, project.builderId));

      if (!builder || builder.userId !== ctx.user.id) {
        throw new Error("Unauthorized: You can only upload photos for your own projects");
      }

      // Validate file size (max 5MB for images)
      const fileBuffer = Buffer.from(input.fileData, "base64");
      const fileSizeInMB = fileBuffer.length / (1024 * 1024);
      if (fileSizeInMB > 5) {
        throw new Error("Image size exceeds 5MB limit");
      }

      // Validate MIME type (images only)
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!allowedMimeTypes.includes(input.mimeType)) {
        throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP");
      }

      // Generate unique file key
      const randomSuffix = crypto.randomBytes(8).toString("hex");
      const fileExtension = input.fileName.split(".").pop();
      const fileKey = `project-photos/${project.id}/milestones/${input.milestoneId}/${randomSuffix}.${fileExtension}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

      // Update milestone with photo
      const photosJson = milestone.progressPhotos ? JSON.parse(milestone.progressPhotos) : [];
      photosJson.push({
        url,
        fileName: input.fileName,
        description: input.description,
        uploadedAt: new Date().toISOString(),
      });

      await db
        .update(projectMilestones)
        .set({
          progressPhotos: JSON.stringify(photosJson),
        })
        .where(eq(projectMilestones.id, input.milestoneId));

      return {
        success: true,
        url,
        milestoneId: input.milestoneId,
      };
    }),

  /**
   * Upload project gallery photo
   */
  uploadProjectPhoto: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded image data
        mimeType: z.string(),
        isPrimary: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database unavailable");
      }

      // Verify project ownership
      const [project] = await db
        .select()
        .from(builderProjects)
        .where(eq(builderProjects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const [builder] = await db
        .select()
        .from(builders)
        .where(eq(builders.id, project.builderId));

      if (!builder || builder.userId !== ctx.user.id) {
        throw new Error("Unauthorized: You can only upload photos for your own projects");
      }

      // Validate file size (max 5MB)
      const fileBuffer = Buffer.from(input.fileData, "base64");
      const fileSizeInMB = fileBuffer.length / (1024 * 1024);
      if (fileSizeInMB > 5) {
        throw new Error("Image size exceeds 5MB limit");
      }

      // Validate MIME type
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!allowedMimeTypes.includes(input.mimeType)) {
        throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP");
      }

      // Generate unique file key
      const randomSuffix = crypto.randomBytes(8).toString("hex");
      const fileExtension = input.fileName.split(".").pop();
      const fileKey = `project-photos/${input.projectId}/gallery/${randomSuffix}.${fileExtension}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

      // Update project with photo
      const imagesJson = project.images ? JSON.parse(project.images) : [];
      imagesJson.push(url);

      const updateData: any = {
        images: JSON.stringify(imagesJson),
      };

      // If isPrimary is true, prepend to array (first image is primary)
      if (input.isPrimary) {
        updateData.images = JSON.stringify([url, ...imagesJson]);
      }

      await db
        .update(builderProjects)
        .set(updateData)
        .where(eq(builderProjects.id, input.projectId));

      return {
        success: true,
        url,
        isPrimary: input.isPrimary || imagesJson.length === 0,
      };
    }),

  /**
   * Get signed URL for document download
   */
  getDocumentUrl: protectedProcedure
    .input(
      z.object({
        fileKey: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { url } = await storageGet(input.fileKey);
      return { url };
    }),

  /**
   * Delete project photo
   */
  deleteProjectPhoto: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        photoUrl: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database unavailable");
      }

      // Verify project ownership
      const [project] = await db
        .select()
        .from(builderProjects)
        .where(eq(builderProjects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const [builder] = await db
        .select()
        .from(builders)
        .where(eq(builders.id, project.builderId));

      if (!builder || builder.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      // Remove photo from images array
      const imagesJson = project.images ? JSON.parse(project.images) : [];
      const updatedImages = imagesJson.filter((url: string) => url !== input.photoUrl);

      const updateData: any = {
        images: JSON.stringify(updatedImages),
      };

      // Images array already updated, first image is always primary

      await db
        .update(builderProjects)
        .set(updateData)
        .where(eq(builderProjects.id, input.projectId));

      return { success: true };
    }),
});
