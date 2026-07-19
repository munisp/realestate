import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { documents, signatureRequests, signatureRecipients, signatureAuditLog } from '../../drizzle/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { storagePut } from '../storage';

export const eSignatureRouter = router({
  // Get user's documents
  getMyDocuments: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const userId = ctx.user!.id;

    // Get documents where user is creator or recipient
    const userDocs = await db
      .select({
        doc: documents,
        request: signatureRequests,
      })
      .from(documents)
      .leftJoin(signatureRequests, eq(documents.id, signatureRequests.documentId))
      .where(
        or(
          eq(documents.userId, userId),
          // Also get docs where user is a recipient
        )
      )
      .orderBy(desc(documents.createdAt));

    return userDocs.map(({ doc, request }) => ({
      id: doc.id,
      title: doc.fileName,
      type: doc.documentType || 'other',
      status: request?.status || 'draft',
      propertyId: doc.propertyId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      documentUrl: doc.fileUrl,
    }));
  }),

  // Get document details
  getDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const docResult = await db
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1);

      if (docResult.length === 0) return null;

      const doc = docResult[0];

      // Get signature request
      const requestResult = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.documentId, input.documentId))
        .limit(1);

      const request = requestResult[0];

      // Get signers
      const signers = request
        ? await db
            .select()
            .from(signatureRecipients)
            .where(eq(signatureRecipients.signatureRequestId, request.id))
        : [];

      // Get audit trail
      const auditTrail = await db
        .select()
        .from(signatureAuditLog)
        .where(eq(signatureAuditLog.signatureRequestId, request?.id || 0))
        .orderBy(desc(signatureAuditLog.timestamp));

      return {
        id: doc.id,
        title: doc.fileName,
        type: doc.documentType || 'other',
        status: request?.status || 'draft',
        propertyId: doc.propertyId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        documentUrl: doc.fileUrl,
        signers: signers.map((s) => ({
          id: s.id,
          name: s.recipientName,
          email: s.email,
          role: s.role || 'other',
          status: s.status,
          signedAt: s.signedAt,
          ipAddress: s.ipAddress,
        })),
        auditTrail: auditTrail.map((a) => ({
          action: a.action,
          timestamp: a.timestamp,
          user: a.performedBy,
          details: a.details,
          ipAddress: a.ipAddress,
        })),
      };
    }),

  // Create new document for signing
  createDocument: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        type: z.enum(['purchase_agreement', 'offer_letter', 'disclosure', 'lease_agreement', 'other']),
        propertyId: z.number().optional(),
        signers: z.array(
          z.object({
            name: z.string(),
            email: z.string().email(),
            role: z.enum(['buyer', 'seller', 'agent', 'witness', 'other']),
          })
        ),
        documentFile: z.string(), // Base64
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;

      // Upload document to S3
      const buffer = Buffer.from(input.documentFile.replace(/^data:.*base64,/, ''), 'base64');
      const fileKey = `documents/${userId}/${Date.now()}-${input.title}.pdf`;
      const { url } = await storagePut(fileKey, buffer, 'application/pdf');

      // Create document record
      const docResult = await db.insert(documents).values({
        userId,
        fileName: input.title,
        fileUrl: url,
        fileKey,
        documentType: input.type,
        propertyId: input.propertyId,
      });

      const documentId = Number(docResult.insertId);

      // Create signature request
      const requestResult = await db.insert(signatureRequests).values({
        documentId,
        requestedBy: userId,
        status: 'pending',
      });

      const requestId = Number(requestResult.insertId);

      // Add recipients
      for (const signer of input.signers) {
        await db.insert(signatureRecipients).values({
          signatureRequestId: requestId,
          recipientName: signer.name,
          email: signer.email,
          role: signer.role,
          status: 'pending',
        });
      }

      // Log creation
      await db.insert(signatureAuditLog).values({
        signatureRequestId: requestId,
        action: 'document_created',
        performedBy: ctx.user!.name || 'User',
        details: 'Document created and sent for signatures',
        ipAddress: null,
      });

      return {
        success: true,
        documentId,
        message: 'Document created and sent for signatures',
      };
    }),

  // Sign document
  signDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        signerId: z.number(),
        signature: z.string(), // Base64 signature image
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Upload signature image
      const buffer = Buffer.from(input.signature.replace(/^data:.*base64,/, ''), 'base64');
      const fileKey = `signatures/${ctx.user!.id}/${Date.now()}.png`;
      const { url } = await storagePut(buffer, fileKey, 'image/png');

      // Update signer status
      await db
        .update(signatureRecipients)
        .set({
          status: 'signed',
          signedAt: new Date(),
          signatureImageUrl: url,
          ipAddress: null, // Would get from request in production
        })
        .where(eq(signatureRecipients.id, input.signerId));

      // Check if all signed
      const request = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.documentId, input.documentId))
        .limit(1);

      if (request.length > 0) {
        const allSigners = await db
          .select()
          .from(signatureRecipients)
          .where(eq(signatureRecipients.signatureRequestId, request[0].id));

        const allSigned = allSigners.every((s) => s.status === 'signed');

        if (allSigned) {
          await db
            .update(signatureRequests)
            .set({ status: 'completed', completedAt: new Date() })
            .where(eq(signatureRequests.id, request[0].id));
        }

        // Log signing
        await db.insert(signatureAuditLog).values({
          signatureRequestId: request[0].id,
          action: 'document_signed',
          performedBy: ctx.user!.name || 'User',
          details: `Document signed by ${ctx.user!.name}`,
          ipAddress: null,
        });

        // Find next signer
        const nextSigner = allSigners.find((s) => s.status === 'pending');

        return {
          success: true,
          message: 'Document signed successfully',
          nextSigner: nextSigner?.recipientName || null,
        };
      }

      return { success: true, message: 'Document signed successfully' };
    }),

  // Send reminder to pending signers
  sendReminder: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const request = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.documentId, input.documentId))
        .limit(1);

      if (request.length === 0) {
        return { success: false, message: 'Document not found' };
      }

      const pendingSigners = await db
        .select()
        .from(signatureRecipients)
        .where(
          and(
            eq(signatureRecipients.signatureRequestId, request[0].id),
            eq(signatureRecipients.status, 'pending')
          )
        );

      // In production, send emails here
      // For now, just log the reminder
      await db.insert(signatureAuditLog).values({
        signatureRequestId: request[0].id,
        action: 'reminder_sent',
        performedBy: 'System',
        details: `Reminder sent to ${pendingSigners.length} pending signers`,
        ipAddress: null,
      });

      return {
        success: true,
        message: 'Reminders sent to pending signers',
        count: pendingSigners.length,
      };
    }),

  // Void/cancel document
  voidDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const request = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.documentId, input.documentId))
        .limit(1);

      if (request.length > 0) {
        await db
          .update(signatureRequests)
          .set({ status: 'voided' })
          .where(eq(signatureRequests.id, request[0].id));

        await db.insert(signatureAuditLog).values({
          signatureRequestId: request[0].id,
          action: 'document_voided',
          performedBy: ctx.user!.name || 'User',
          details: `Document voided: ${input.reason}`,
          ipAddress: null,
        });
      }

      return {
        success: true,
        message: 'Document voided successfully',
      };
    }),

  // Download completed document
  downloadDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1);

      if (doc.length === 0) return null;

      return {
        url: doc[0].fileUrl,
        filename: doc[0].fileName,
      };
    }),

  // Get signing statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const userId = ctx.user!.id;

    const allRequests = await db
      .select()
      .from(signatureRequests)
      .leftJoin(documents, eq(signatureRequests.documentId, documents.id))
      .where(eq(documents.userId, userId));

    const total = allRequests.length;
    const pending = allRequests.filter((r) => r.signatureRequests.status === 'pending').length;
    const completed = allRequests.filter((r) => r.signatureRequests.status === 'completed').length;
    const voided = allRequests.filter((r) => r.signatureRequests.status === 'voided').length;

    // Calculate average completion time
    const completedDocs = allRequests.filter(
      (r) => r.signatureRequests.status === 'completed' && r.signatureRequests.completedAt
    );
    const avgTime =
      completedDocs.length > 0
        ? completedDocs.reduce((sum, r) => {
            const created = new Date(r.signatureRequests.createdAt!).getTime();
            const completed = new Date(r.signatureRequests.completedAt!).getTime();
            return sum + (completed - created) / (1000 * 60 * 60 * 24); // days
          }, 0) / completedDocs.length
        : 0;

    // Count by type
    const byType: Record<string, number> = {};
    allRequests.forEach((r) => {
      const type = r.documents?.documentType || 'other';
      byType[type] = (byType[type] || 0) + 1;
    });

    return {
      total,
      pending,
      completed,
      voided,
      avgCompletionTime: Math.round(avgTime * 10) / 10,
      byType,
    };
  }),

  // Get audit trail
  getAuditTrail: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const request = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.documentId, input.documentId))
        .limit(1);

      if (request.length === 0) return [];

      const trail = await db
        .select()
        .from(signatureAuditLog)
        .where(eq(signatureAuditLog.signatureRequestId, request[0].id))
        .orderBy(desc(signatureAuditLog.timestamp));

      return trail.map((a) => ({
        action: a.action,
        timestamp: a.timestamp,
        user: a.performedBy,
        details: a.details,
        ipAddress: a.ipAddress,
      }));
    }),
});
