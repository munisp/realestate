import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { properties, users, transactions, builders, builderProjects, builderReviews, builderQuotes, builderQuoteResponses, projectMilestones } from '../../drizzle/schema';
import { eq, and, like, desc, sql } from 'drizzle-orm';
import { storagePut } from '../storage';

export const builderServicesRouter = router({
  // Get builder profiles
  getBuilders: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        specialty: z.string().optional(),
        minRating: z.number().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { builders: [], total: 0 };

      // Get users with builder role
      let query = db
        .select()
        .from(users)
        .where(eq(users.role, 'admin')); // Using admin as builder for now

      const results = await query.limit(input.limit).offset(input.offset);

      return {
        builders: results.map((builder) => ({
          id: builder.id,
          name: builder.name,
          email: builder.email,
          phone: '(+234) 800-000-0000',
          specialty: 'Residential Construction',
          yearsExperience: 10,
          rating: 4.8,
          reviewCount: 45,
          completedProjects: 32,
          city: 'Lagos',
          profileImage: null,
          certifications: ['COREN Registered', 'ISO 9001 Certified'],
          services: [
            'New Construction',
            'Renovations',
            'Interior Design',
            'Project Management',
          ],
        })),
        total: results.length,
      };
    }),

  // Get builder details
  getBuilderDetails: publicProcedure
    .input(z.object({ builderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const builder = await db
        .select()
        .from(users)
        .where(eq(users.id, input.builderId))
        .limit(1);

      if (builder.length === 0) return null;

      // Get builder's projects (properties they built)
      const projects = await db
        .select()
        .from(properties)
        .where(eq(properties.agentId, input.builderId))
        .limit(10);

      return {
        id: builder[0].id,
        name: builder[0].name,
        email: builder[0].email,
        phone: '(+234) 800-000-0000',
        specialty: 'Residential & Commercial Construction',
        yearsExperience: 10,
        rating: 4.8,
        reviewCount: 45,
        completedProjects: projects.length,
        city: 'Lagos',
        bio: 'Experienced builder specializing in modern residential and commercial properties. Licensed and insured with over 10 years of experience in the Nigerian construction industry.',
        profileImage: null,
        certifications: [
          'COREN Registered Engineer',
          'ISO 9001:2015 Certified',
          'NIOB Member',
        ],
        services: [
          'New Construction',
          'Renovations & Remodeling',
          'Interior Design & Finishing',
          'Project Management',
          'Architectural Services',
          'Structural Engineering',
        ],
        portfolio: projects.map((p) => ({
          id: p.id,
          title: `${p.addressLine1}, ${p.city}`,
          image: p.images?.[0] || null,
          type: p.propertyType,
          completedDate: p.createdAt,
        })),
        reviews: [], // Would fetch from reviews table
      };
    }),

  // Request quote
  requestQuote: protectedProcedure
    .input(
      z.object({
        builderId: z.number(),
        projectType: z.enum([
          'new_construction',
          'renovation',
          'extension',
          'interior_design',
          'landscaping',
          'other',
        ]),
        description: z.string(),
        budget: z.number().optional(),
        timeline: z.string().optional(),
        location: z.string(),
        attachments: z.array(z.string()).optional(), // Base64 files
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;

      // Upload attachments to S3
      const uploadedFiles: string[] = [];
      if (input.attachments) {
        for (const file of input.attachments) {
          const buffer = Buffer.from(file.replace(/^data:.*base64,/, ''), 'base64');
          const fileKey = `quotes/${userId}/${Date.now()}.pdf`;
          const { url } = await storagePut(fileKey, buffer, 'application/pdf');
          uploadedFiles.push(url);
        }
      }

      const [quote] = await db.insert(builderQuotes).values({
        userId,
        builderId: input.builderId,
        projectType: input.projectType,
        description: input.description,
        location: input.location,
        budget: input.budget,
        timeline: input.timeline,
        attachments: JSON.stringify(uploadedFiles),
        status: 'pending',
      }).returning();

      return {
        success: true,
        quoteId: quote.id,
        message: 'Quote request sent successfully',
        estimatedResponse: '24-48 hours',
      };
    }),

  // Get user's quote requests
  getMyQuotes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const userId = ctx.user!.id;

    const quotes = await db.select({
      id: builderQuotes.id,
      builderId: builderQuotes.builderId,
      builderName: builders.companyName,
      projectType: builderQuotes.projectType,
      description: builderQuotes.description,
      status: builderQuotes.status,
      createdAt: builderQuotes.createdAt,
      budget: builderQuotes.budget,
      location: builderQuotes.location,
      timeline: builderQuotes.timeline,
    })
    .from(builderQuotes)
    .leftJoin(builders, eq(builderQuotes.builderId, builders.id))
    .where(eq(builderQuotes.userId, userId))
    .orderBy(desc(builderQuotes.createdAt));

    return quotes;
  }),

  // Builder: Get received quotes
  getReceivedQuotes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const builderId = ctx.user!.id;

    const quotes = await db.select({
      id: builderQuotes.id,
      userId: builderQuotes.userId,
      userName: users.name,
      userEmail: users.email,
      projectType: builderQuotes.projectType,
      description: builderQuotes.description,
      location: builderQuotes.location,
      budget: builderQuotes.budget,
      timeline: builderQuotes.timeline,
      status: builderQuotes.status,
      createdAt: builderQuotes.createdAt,
    })
    .from(builderQuotes)
    .leftJoin(users, eq(builderQuotes.userId, users.id))
    .where(eq(builderQuotes.builderId, builderId))
    .orderBy(desc(builderQuotes.createdAt));

    return quotes;
  }),

  // Builder: Submit quote response
  submitQuoteResponse: protectedProcedure
    .input(
      z.object({
        quoteId: z.number(),
        estimatedCost: z.number(),
        timeline: z.string(),
        breakdown: z.array(
          z.object({
            item: z.string(),
            cost: z.number(),
          })
        ),
        terms: z.string(),
        validUntil: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const builderId = ctx.user!.id;

      const [response] = await db.insert(builderQuoteResponses).values({
        quoteId: input.quoteId,
        builderId,
        estimatedCost: input.estimatedCost,
        timeline: input.timeline,
        breakdown: JSON.stringify(input.breakdown),
        terms: input.terms,
        validUntil: new Date(input.validUntil),
        status: 'pending',
      }).returning();

      await db.update(builderQuotes)
        .set({ status: 'quoted', updatedAt: new Date() })
        .where(eq(builderQuotes.id, input.quoteId));

      return {
        success: true,
        responseId: response.id,
        message: 'Quote submitted successfully',
      };
    }),

  // Accept quote and start project
  acceptQuote: protectedProcedure
    .input(
      z.object({
        quoteId: z.number(),
        paymentMethod: z.enum(['full', 'installment']),
        downPayment: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;

      const quote = await db.select().from(builderQuotes).where(eq(builderQuotes.id, input.quoteId)).limit(1);
      if (!quote.length) throw new Error('Quote not found');

      const quoteResponse = await db.select().from(builderQuoteResponses)
        .where(eq(builderQuoteResponses.quoteId, input.quoteId))
        .orderBy(desc(builderQuoteResponses.createdAt))
        .limit(1);
      
      if (!quoteResponse.length) throw new Error('No quote response found');

      const [project] = await db.insert(builderProjects).values({
        builderId: quote[0].builderId!,
        projectName: quote[0].description || 'New Project',
        projectType: 'residential',
        description: quote[0].description,
        constructionStatus: 'pre_construction',
        originalPrice: quoteResponse[0].estimatedCost,
        currentPrice: quoteResponse[0].estimatedCost,
        totalUnits: 1,
        availableUnits: 1,
        status: 'draft',
      }).returning();

      await db.update(builderQuotes)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(eq(builderQuotes.id, input.quoteId));

      await db.update(builderQuoteResponses)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(eq(builderQuoteResponses.id, quoteResponse[0].id));

      return {
        success: true,
        projectId: project.id,
        message: 'Quote accepted, project created',
        paymentUrl: `/payment/checkout?projectId=${project.id}`,
      };
    }),

  // Get active projects
  getMyProjects: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const userId = ctx.user!.id;

    const projects = await db.select({
      id: builderProjects.id,
      builderId: builderProjects.builderId,
      builderName: builders.companyName,
      projectType: builderProjects.projectType,
      title: builderProjects.projectName,
      status: builderProjects.constructionStatus,
      progress: builderProjects.completionPercentage,
      startDate: builderProjects.startDate,
      estimatedCompletion: builderProjects.estimatedCompletionDate,
      totalCost: builderProjects.currentPrice,
    })
    .from(builderProjects)
    .leftJoin(builders, eq(builderProjects.builderId, builders.id))
    .orderBy(desc(builderProjects.createdAt));

    return projects;
  }),

  // Get project details
  getProjectDetails: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [project] = await db.select().from(builderProjects).where(eq(builderProjects.id, input.projectId)).limit(1);
      if (!project) return null;

      const [builder] = await db.select().from(builders).where(eq(builders.id, project.builderId)).limit(1);
      const milestones = await db.select().from(projectMilestones).where(eq(projectMilestones.projectId, input.projectId)).orderBy(projectMilestones.milestoneNumber);

      return {
        id: project.id,
        builderId: project.builderId,
        builderName: builder?.companyName || 'Unknown',
        builderPhone: builder?.phone || '',
        projectType: project.projectType,
        title: project.projectName,
        description: project.description || '',
        status: project.constructionStatus,
        progress: project.completionPercentage || 0,
        startDate: project.startDate,
        estimatedCompletion: project.estimatedCompletionDate,
        totalCost: project.currentPrice,
        paidAmount: 0,
        location: '',
        milestones: milestones.map(m => ({
          id: m.id,
          name: m.title,
          description: m.description || '',
          status: m.status,
          completedDate: m.completedAt,
          cost: m.targetAmount || 0,
          photos: m.photos ? JSON.parse(m.photos as string) : [],
        })),
        payments: [],
        documents: [],
        updates: [],
      };
    }),

  // Update project milestone
  updateMilestone: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        milestoneId: z.number(),
        status: z.enum(['pending', 'in_progress', 'completed']),
        progress: z.number().optional(),
        photos: z.array(z.string()).optional(), // Base64
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Upload photos
      const uploadedPhotos: string[] = [];
      if (input.photos) {
        for (const photo of input.photos) {
          const buffer = Buffer.from(photo.replace(/^data:.*base64,/, ''), 'base64');
          const fileKey = `projects/${input.projectId}/milestones/${Date.now()}.jpg`;
          const { url } = await storagePut(fileKey, buffer, 'image/jpeg');
          uploadedPhotos.push(url);
        }
      }

      await db.update(projectMilestones)
        .set({
          status: input.status,
          progress: input.progress,
          photos: uploadedPhotos.length > 0 ? JSON.stringify(uploadedPhotos) : undefined,
          notes: input.notes,
          completedAt: input.status === 'completed' ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(projectMilestones.id, input.milestoneId));

      return {
        success: true,
        message: 'Milestone updated successfully',
      };
    }),

  // Submit project review
  submitProjectReview: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string(),
        quality: z.number().min(1).max(5),
        timeliness: z.number().min(1).max(5),
        communication: z.number().min(1).max(5),
        value: z.number().min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const userId = ctx.user!.id;
      const [project] = await db.select().from(builderProjects).where(eq(builderProjects.id, input.projectId)).limit(1);
      if (!project) throw new Error('Project not found');

      await db.insert(builderReviews).values({
        builderId: project.builderId,
        projectId: input.projectId,
        userId,
        rating: input.rating,
        comment: input.comment,
        qualityRating: input.quality,
        timelinessRating: input.timeliness,
        communicationRating: input.communication,
        valueRating: input.value,
        status: 'published',
      });

      return {
        success: true,
        message: 'Review submitted successfully',
      };
    }),

  // Get builder reviews
  getBuilderReviews: publicProcedure
    .input(z.object({ builderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const reviews = await db.select({
        id: builderReviews.id,
        rating: builderReviews.rating,
        comment: builderReviews.comment,
        qualityRating: builderReviews.qualityRating,
        timelinessRating: builderReviews.timelinessRating,
        communicationRating: builderReviews.communicationRating,
        valueRating: builderReviews.valueRating,
        userName: users.name,
        createdAt: builderReviews.createdAt,
      })
      .from(builderReviews)
      .leftJoin(users, eq(builderReviews.userId, users.id))
      .where(eq(builderReviews.builderId, input.builderId))
      .orderBy(desc(builderReviews.createdAt));

      return reviews;
    }),

  // Get builder statistics
  getBuilderStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const builderId = ctx.user!.id;

    // In production, would calculate from projects
    return {
      totalProjects: 32,
      activeProjects: 5,
      completedProjects: 27,
      totalRevenue: 1500000000,
      averageRating: 4.8,
      reviewCount: 45,
      repeatClients: 12,
    };
  }),
});
