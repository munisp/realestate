import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { documentsRouter } from "./routers/documents";
import { pushRouter } from "./routers/push";
import { notificationsRouter } from "./routers/notifications";
import { toursRouter } from "./routers/tours";
import { mapSearchRouter } from "./routers/mapSearch";
import { comparisonRouter } from "./routers/comparison";
import { virtualToursRouter } from "./routers/virtualTours";
import { neighborhoodRouter } from "./routers/neighborhood";
import { recommendationsRouter } from "./routers/recommendations";
import { openHouseRouter } from "./routers/openHouse";
import { alertsRouter } from "./routers/alerts";
import { eSignatureRouter } from "./routers/eSignature";
// import { alertPerformanceRouter } from "./routers/alertPerformance"; // TODO: Create this file
import { emailWebhooksRouter } from "./routers/emailWebhooks";
import { emailTestingRouter } from "./routers/emailTesting";
import { schedulerManagementRouter } from "./routers/schedulerManagement";
import { crmRouter } from "./routers/crm";
import { aiChatbotRouter } from './routers/aiChatbot';
import { ollamaModelManagementRouter } from './routers/ollamaModelManagement';
import { aiPropertyDescriptionRouter } from "./routers/aiPropertyDescription";
import { currencyRouter } from "./routers/currency";
import { blockchainRegistryRouter } from "./routers/blockchainRegistry";
import { landRecordsRouter } from "./routers/landRecords";
import { governmentRegistryRouter } from "./routers/governmentRegistry";
import { cofOVerificationRouter } from "./routers/cofOVerificationRouter";
import { automatedVerificationRouter } from "./routers/automatedVerificationRouter";
import { exchangeRateAlertsRouter } from "./routers/exchangeRateAlerts";
import { currencyHistoryRouter } from "./routers/currencyHistory";
import { propertyStatsRouter } from "./routers/propertyStats";
import { smartRecommendationsRouter } from "./routers/smartRecommendations";
import { recommendationFeedbackRouter } from "./routers/recommendationFeedback";
import { feedbackAnalyticsRouter } from "./routers/feedbackAnalytics";
import { recommendationPreferencesRouter } from "./routers/recommendationPreferences";
import { abTestingRouter } from "./routers/abTesting";
import { collaborativeFilteringRouter } from "./routers/collaborativeFiltering";
import { mlTrainingRouter } from "./routers/mlTraining";
import { startExchangeRateMonitoring } from "./services/exchangeRateMonitor";
import { startAutoPricingScheduler } from "./schedulers/autoPricingScheduler";
import { startGnnAlertsScheduler } from "./schedulers/gnnAlertsScheduler";
import { startWeeklyDigestScheduler } from "./services/recommendationDigest";
import { shortletRouter } from './routers/shortlet';
import { propertyHeatmapRouter } from './routers/propertyHeatmap';
import { bookingRouter } from './routers/booking';
import { paymentRouter } from './routers/payment';
import { builderServicesRouter } from "./routers/builderServices";
import { workflowRouter } from "./routers/workflows";
import { neighborhoodIntelligenceRouter } from "./routers/neighborhoodIntelligence";
import { realtimeRouter } from "./routers/realtime";
import { marketTrendsRouter } from "./routers/marketTrends";
import { serverSideClusteringRouter } from "./routers/serverSideClustering";
import { gnnAlertsRouter } from "./routers/gnnAlertsRouter";
import { savedMapViewsRouter } from "./routers/savedMapViews";
import { historicalPlaybackRouter } from "./routers/historicalPlayback";
import { spatialSearchRouter } from "./routers/spatialSearch";
import { spatialSearchPostGISRouter } from "./routers/spatialSearchPostGIS";
import { zestimateRouter } from "./routers/zestimate";
import { gnnRouter } from "./routers/gnn";
import { advancedSearchRouter } from "./routers/advancedSearch";
import { investorProfileRouter } from "./routers/investorProfile";
import { hybridValuationRouter } from "./routers/hybridValuation";
import { emailAbTestingRouter } from "./routers/emailAbTesting";
import { emailTemplateBuilderRouter } from "./routers/emailTemplateBuilder";
import { reEngagementRouter } from "./routers/reEngagement";
import { virtualStagingRouter } from "./routers/virtualStaging";
import { analyticsRouter } from "./routers/analytics";
import { valuationAlertsRouter } from "./routers/valuationAlerts";
import { jobsRouter } from "./routers/jobs";
import { appointmentsRouter } from "./routers/appointments";
import { offersRouter } from "./routers/offers";
import { savedSearchAlertsRouter } from "./routers/savedSearchAlerts";
import { offerAnalyticsRouter } from "./routers/offerAnalytics";
import { emailConfigRouter } from "./routers/emailConfig";
import { emailWebhookRouter } from "./routers/emailWebhook";
import { emailAnalyticsRouter } from "./routers/emailAnalyticsRouter";
import { scheduledCampaignRouter } from "./routers/scheduledCampaignRouter";
import { emailPreferencesRouter } from "./routers/emailPreferencesRouter";
import { monitoringRouter } from "./routers/monitoring";
import { alertManagementRouter } from "./routers/alertManagementRouter";
import { dataQualityRouter } from "./routers/dataQuality";
import { reviewsRouter } from "./routers/reviews";
import { pricingRouter } from "./routers/pricing";
import { competitorTrackingRouter } from "./routers/competitorTracking";
import { notificationPreferencesRouter } from "./routers/notificationPreferencesRouter";
import { jobManagementRouter } from "./routers/jobManagement";
import { competitorAnalyticsRouter } from "./routers/competitorAnalytics";
import { jobMonitoringRouter } from "./routers/jobMonitoring";
import { emailTemplatePreviewRouter } from "./routers/emailTemplatePreview";
import { competitorInsightsRouter } from "./routers/competitorInsights";
import { propertyTrackingRouter } from "./routers/propertyTracking";
import { bulkVerificationRouter } from "./routers/bulkVerification";
import { deepseekOCRRouter } from "./routers/deepseekOCR";
import { cofoRouter } from "./routers/cofo";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  landRecords: landRecordsRouter,
  governmentRegistry: governmentRegistryRouter,
  cofOVerification: cofOVerificationRouter,
  automatedVerification: automatedVerificationRouter,
  bulkVerification: bulkVerificationRouter,
  deepseekOCR: deepseekOCRRouter,
  cofo: cofoRouter,
  booking: bookingRouter,
  payment: paymentRouter,
  reviews: reviewsRouter,
  pricing: pricingRouter,
  competitorTracking: competitorTrackingRouter,
  notificationPreferences: notificationPreferencesRouter,
  jobManagement: jobManagementRouter,
  competitorAnalytics: competitorAnalyticsRouter,
  jobMonitoring: jobMonitoringRouter,
  emailTemplatePreview: emailTemplatePreviewRouter,
  competitorInsights: competitorInsightsRouter,
  propertyTracking: propertyTrackingRouter,
  monitoring: monitoringRouter,
  alertManagement: alertManagementRouter,
  dataQuality: dataQualityRouter,
  zestimate: zestimateRouter,
  hybridValuation: hybridValuationRouter,
  virtualStaging: virtualStagingRouter,
  analytics: analyticsRouter,
  valuationAlerts: valuationAlertsRouter,
  gnnAlerts: gnnAlertsRouter,
  jobs: jobsRouter,
  appointments: appointmentsRouter,
  offers: offersRouter,
  savedSearchAlerts: savedSearchAlertsRouter,
  offerAnalytics: offerAnalyticsRouter,
  emailConfig: emailConfigRouter,
  emailWebhook: emailWebhookRouter,
  emailAnalytics: emailAnalyticsRouter,
  scheduledCampaigns: scheduledCampaignRouter,
  emailPreferences: emailPreferencesRouter,
  emailAbTesting: emailAbTestingRouter,
  emailTemplateBuilder: emailTemplateBuilderRouter,
  reEngagement: reEngagementRouter,
  workflows: workflowRouter,
  neighborhoodIntelligence: neighborhoodIntelligenceRouter,
  serverSideClustering: serverSideClusteringRouter,
  savedMapViews: savedMapViewsRouter,
  historicalPlayback: historicalPlaybackRouter,
  spatialSearch: spatialSearchRouter,
  spatialSearchPostGIS: spatialSearchPostGISRouter,
  realtime: realtimeRouter,
  gnn: gnnRouter,
  marketTrends: marketTrendsRouter,
  advancedSearch: advancedSearchRouter,
  investorProfile: investorProfileRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Property management
  properties: router({
    // List properties with filters
    list: publicProcedure
      .input(z.object({
        city: z.string().optional(),
        state: z.string().optional(),
        propertyType: z.string().optional(),
        listingType: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        minBedrooms: z.number().optional(),
        minBathrooms: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const properties = await db.searchProperties(input);
        return properties;
      }),

    // Get single property by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const property = await db.getPropertyById(input.id);
        if (!property) throw new Error("Property not found");
        return property;
      }),

    // Get nearby properties
    nearby: publicProcedure
      .input(z.object({
        lat: z.number(),
        lng: z.number(),
        radiusMiles: z.number().default(5),
      }))
      .query(async ({ input }) => {
        return await db.getNearbyProperties(input.lat, input.lng, input.radiusMiles);
      }),

    // Create property (protected)
    create: protectedProcedure
      .input(z.object({
        addressLine1: z.string(),
        addressLine2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string().default("USA"),
        latitude: z.string(),
        longitude: z.string(),
        propertyType: z.enum(["single_family", "condo", "townhouse", "multi_family", "land", "commercial"]),
        listingType: z.enum(["sale", "rent", "sold", "off_market"]),
        price: z.number(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        squareFeet: z.number().optional(),
        lotSize: z.number().optional(),
        yearBuilt: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        features: z.string().optional(), // JSON string
        primaryImage: z.string().optional(),
        images: z.string().optional(), // JSON string
      }))
      .mutation(async ({ input, ctx }) => {
        const propertyId = await db.createProperty({
          ...input,
          ownerId: ctx.user.id,
        });
        return { id: propertyId };
      }),

    // Update property (protected)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        updates: z.object({
          price: z.number().optional(),
          status: z.enum(["active", "pending", "sold", "off_market", "archived"]).optional(),
          description: z.string().optional(),
          features: z.string().optional(),
          images: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateProperty(input.id, input.updates);
        return { success: true };
      }),

    // Owner analytics
    ownerAnalytics: protectedProcedure
      .query(async ({ ctx }) => {
        const properties = await db.getPropertiesByOwner(ctx.user.id);
        const totalViews = properties.reduce((sum, p) => sum + (p.viewCount || 0), 0);
        const totalFavorites = properties.reduce((sum, p) => sum + (p.favoriteCount || 0), 0);
        const inquiries = await db.select().from(messages).where(eq(messages.receiverId, userId));
        const appointments = await db.select().from(appointments).where(eq(appointments.agentId, userId));
        const totalInquiries = inquiries.length + appointments.length;
        
        return {
          totalViews,
          totalFavorites,
          totalInquiries,
          viewsChange: 0,
        };
      }),

    // Recent activity
    recentActivity: protectedProcedure
      .query(async ({ ctx }) => {
        const properties = await db.getPropertiesByOwner(ctx.user.id);
        const propertyIds = properties.map(p => p.id);
        
        // Get recent views from propertyViews table
        const recentViews = await db.getRecentPropertyViews(propertyIds, 10);
        
        return recentViews.map((view: any) => ({
          type: 'view',
          description: 'Someone viewed your property',
          propertyTitle: properties.find(p => p.id === view.propertyId)?.title || 'Property',
          timestamp: view.viewedAt,
        }));
      }),

    // Update property status (protected)
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "pending", "sold", "off_market", "archived", "inactive"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateProperty(input.id, { status: input.status });
        return { success: true };
      }),

    // Delete property (protected)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProperty(input.id);
        return { success: true };
      }),

    // Track property view
    trackView: publicProcedure
      .input(z.object({
        propertyId: z.number(),
        sessionId: z.string().optional(),
        viewDuration: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.trackPropertyView({
          propertyId: input.propertyId,
          userId: ctx.user?.id,
          sessionId: input.sessionId,
          viewDuration: input.viewDuration,
        });
        return { success: true };
      }),

    // Get property view stats
    viewStats: publicProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPropertyViewStats(input.propertyId);
      }),

    // Get similar properties
    similar: publicProcedure
      .input(z.object({
        propertyId: z.number(),
        limit: z.number().optional().default(6),
      }))
      .query(async ({ input }) => {
        return await db.getSimilarProperties(input.propertyId, input.limit);
      }),

    // Get personalized recommendations
    recommendations: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(6),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getRecommendedProperties(ctx.user.id, input.limit);
      }),
  }),

  // Valuation service
  valuations: router({
    // Get property valuations
    getByProperty: publicProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPropertyValuations(input.propertyId);
      }),

    // Get latest valuation
    getLatest: publicProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLatestValuation(input.propertyId);
      }),

    // Create valuation using AI
    estimate: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Get property details
        const property = await db.getPropertyById(input.propertyId);
        if (!property) throw new Error("Property not found");

        // Get nearby properties for comparables
        const lat = parseFloat(property.latitude);
        const lng = parseFloat(property.longitude);
        const comparables = await db.getNearbyProperties(lat, lng, 2);

        // Use LLM to estimate value based on comparables
        const prompt = `You are a real estate valuation expert. Estimate the value of this property based on the details and comparable properties.

Property Details:
- Address: ${property.addressLine1}, ${property.city}, ${property.state}
- Type: ${property.propertyType}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Square Feet: ${property.squareFeet || 'N/A'}
- Year Built: ${property.yearBuilt || 'N/A'}
- Current Price: $${property.price}

Comparable Properties (within 2 miles):
${comparables.slice(0, 5).map((c, i) => `
${i + 1}. ${c.addressLine1}, ${c.city}
   - Type: ${c.propertyType}
   - Bedrooms: ${c.bedrooms || 'N/A'}, Bathrooms: ${c.bathrooms || 'N/A'}
   - Square Feet: ${c.squareFeet || 'N/A'}
   - Price: $${c.price}
   - Price per sq ft: $${c.pricePerSqFt || 'N/A'}
`).join('')}

Provide a valuation estimate with confidence interval (lower and upper bounds) and confidence score (0-100).`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a real estate valuation expert. Provide estimates in JSON format." },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "valuation_estimate",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  estimatedValue: { type: "number", description: "Estimated property value in dollars" },
                  confidenceLower: { type: "number", description: "Lower bound of confidence interval" },
                  confidenceUpper: { type: "number", description: "Upper bound of confidence interval" },
                  confidenceScore: { type: "number", description: "Confidence score 0-100" },
                  factors: { 
                    type: "object",
                    description: "Key factors affecting valuation",
                    additionalProperties: true
                  }
                },
                required: ["estimatedValue", "confidenceLower", "confidenceUpper", "confidenceScore", "factors"],
                additionalProperties: false
              }
            }
          }
        });

        const content = response.choices[0].message.content;
        const valuation = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

        // Save valuation to database
        const valuationId = await db.createValuation({
          propertyId: input.propertyId,
          estimatedValue: Math.round(valuation.estimatedValue),
          confidenceLower: Math.round(valuation.confidenceLower),
          confidenceUpper: Math.round(valuation.confidenceUpper),
          confidenceScore: Math.round(valuation.confidenceScore),
          valuationMethod: "ml",
          comparables: JSON.stringify(comparables.slice(0, 5).map(c => c.id)),
          factors: JSON.stringify(valuation.factors),
        });

        return { id: valuationId, ...valuation };
      }),
  }),

  // Transaction management
  transactions: router({
    // Get user transactions
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserTransactions(ctx.user.id);
      }),

    // Get transaction by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTransactionById(input.id);
      }),

    // Create transaction
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        transactionType: z.enum(["sale", "rent", "lease"]),
        amount: z.number(),
        depositAmount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const transactionId = await db.createTransaction({
          ...input,
          buyerId: ctx.user.id,
        });
        return { id: transactionId };
      }),

    // Update transaction status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateTransaction(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // Payment management
  payments: router({
    // Create Stripe checkout session
    createCheckout: protectedProcedure
      .input(z.object({
        transactionId: z.number(),
        propertyId: z.number(),
        amount: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const Stripe = (await import('stripe')).default;
        const { ENV } = await import('./_core/env');
        
        const stripe = new Stripe(ENV.stripeSecretKey, {
          apiVersion: '2025-10-29.clover',
        });

        const origin = ctx.req.headers.origin || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `Property Payment - Transaction #${input.transactionId}`,
                  description: `Payment for property #${input.propertyId}`,
                },
                unit_amount: input.amount * 100, // Convert to cents
              },
              quantity: 1,
            },
          ],
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            property_id: input.propertyId.toString(),
            transaction_id: input.transactionId.toString(),
          },
          success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/payment/cancel`,
          allow_promotion_codes: true,
        });

        return { url: session.url };
      }),

    // Get transaction payments
    getByTransaction: protectedProcedure
      .input(z.object({ transactionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTransactionPayments(input.transactionId);
      }),

    // Create payment
    create: protectedProcedure
      .input(z.object({
        transactionId: z.number(),
        amount: z.number(),
        paymentType: z.enum(["deposit", "down_payment", "installment", "full_payment", "refund"]),
        paymentMethod: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const paymentId = await db.createPayment({
          ...input,
          userId: ctx.user.id,
          status: "pending",
        });

        // Simulate payment processing
        setTimeout(async () => {
          await db.updatePayment(paymentId, { status: "completed" });
        }, 2000);

        return { id: paymentId };
      }),

    // Update payment status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "processing", "completed", "failed", "refunded"]),
      }))
      .mutation(async ({ input }) => {
        await db.updatePayment(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // User favorites
  favorites: router({
    // Get user favorites
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserFavorites(ctx.user.id);
      }),

    // Add favorite
    add: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const favoriteId = await db.addFavorite(ctx.user.id, input.propertyId, input.notes);
        return { id: favoriteId };
      }),

    // Remove favorite
    remove: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.removeFavorite(ctx.user.id, input.propertyId);
        return { success: true };
      }),
  }),

  // Saved searches
  savedSearches: router({
    // Get user saved searches
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserSavedSearches(ctx.user.id);
      }),

    // Create saved search
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        searchCriteria: z.string(), // JSON string
        notificationsEnabled: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const searchId = await db.createSavedSearch({
          userId: ctx.user.id,
          name: input.name,
          searchCriteria: input.searchCriteria,
          notificationsEnabled: input.notificationsEnabled ? 1 : 0,
        });
        return { id: searchId };
      }),

    // Delete saved search
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSavedSearch(input.id);
        return { success: true };
      }),
  }),

  // Agent management
  agents: router({
    // Get agent profile
    getProfile: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getAgentByUserId(ctx.user.id);
      }),

    // Create agent profile
    createProfile: protectedProcedure
      .input(z.object({
        licenseNumber: z.string().optional(),
        agency: z.string().optional(),
        specialization: z.string().optional(), // JSON string
        bio: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const agentId = await db.createAgent({
          userId: ctx.user.id,
          ...input,
        });
        return { id: agentId };
      }),

    // Update agent profile
    updateProfile: protectedProcedure
      .input(z.object({
        id: z.number(),
        updates: z.object({
          bio: z.string().optional(),
          phone: z.string().optional(),
          website: z.string().optional(),
          specialization: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateAgent(input.id, input.updates);
        return { success: true };
      }),

    // Get all agents
    list: publicProcedure
      .query(async () => {
        return await db.getAllAgents();
      }),

    // Get agent by user ID
    getByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAgentByUserId(input.userId);
      }),

    // Get agent by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { agents } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db_instance = await db.getDb();
        if (!db_instance) throw new Error("Database not available");
        const result = await db_instance.select().from(agents).where(eq(agents.id, input.id)).limit(1);
        return result[0];
      }),
  }),

  // Property Comparisons
  comparisons: router({
    // Create new comparison
    create: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        propertyIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        const comparisonId = await db.createComparison({
          userId: ctx.user.id,
          name: input.name,
          propertyIds: JSON.stringify(input.propertyIds),
        });
        return { id: comparisonId };
      }),

    // Get user's comparisons
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserComparisons(ctx.user.id);
      }),

    // Get comparison by ID with property details
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const comparison = await db.getComparisonById(input.id);
        if (!comparison || comparison.userId !== ctx.user.id) {
          throw new Error("Comparison not found");
        }

        const propertyIds = JSON.parse(comparison.propertyIds);
        const properties = await Promise.all(
          propertyIds.map((id: number) => db.getPropertyById(id))
        );

        return {
          ...comparison,
          properties: properties.filter(p => p !== undefined),
        };
      }),

    // Delete comparison
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const comparison = await db.getComparisonById(input.id);
        if (!comparison || comparison.userId !== ctx.user.id) {
          throw new Error("Comparison not found");
        }
        await db.deleteComparison(input.id);
        return { success: true };
      }),
  }),

  // Messaging

  // Search Alerts
  searchAlerts: router({
    // Create search alert
    create: protectedProcedure
      .input(z.object({
        alertName: z.string(),
        searchCriteria: z.object({
          city: z.string().optional(),
          state: z.string().optional(),
          propertyType: z.string().optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          minBedrooms: z.number().optional(),
          minBathrooms: z.number().optional(),
        }),
        frequency: z.enum(["instant", "daily", "weekly"]).default("daily"),
      }))
      .mutation(async ({ input, ctx }) => {
        const alertId = await db.createSearchAlert({
          userId: ctx.user.id,
          alertName: input.alertName,
          searchCriteria: JSON.stringify(input.searchCriteria),
          frequency: input.frequency,
        });
        return { id: alertId };
      }),

    // Get user's alerts
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserSearchAlerts(ctx.user.id);
      }),

    // Update alert
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.number().optional(),
        frequency: z.enum(["instant", "daily", "weekly"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateSearchAlert(id, updates);
        return { success: true };
      }),

    // Delete alert
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSearchAlert(input.id);
        return { success: true };
      }),
  }),

  // Notifications

  // Virtual Tours

  // Documents

  // ============================================================================
  // Builder Platform Routers
  // ============================================================================
  
  builders: router({
    // Get all verified builders
    list: publicProcedure.query(async () => {
      return await db.getAllVerifiedBuilders();
    }),
    
    // Get builder by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const builder = await db.getBuilderById(input.id);
        if (!builder) throw new Error("Builder not found");
        return builder;
      }),
    
    // Get builder's projects
    getProjects: publicProcedure
      .input(z.object({ builderId: z.number() }))
      .query(async ({ input }) => {
        return await db.getBuilderProjects(input.builderId);
      }),
    
    // Get builder reviews
    getReviews: publicProcedure
      .input(z.object({ builderId: z.number() }))
      .query(async ({ input }) => {
        return await db.getBuilderReviews(input.builderId);
      }),
    
    // Get current user's builder profile
    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
      return await db.getBuilderByUserId(ctx.user.id);
    }),
    
    // Get all builders (admin only)
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      return await db.getAllBuilders();
    }),
    
    // Create builder application
    create: protectedProcedure
      .input(z.object({
        companyName: z.string(),
        cacNumber: z.string(),
        companyType: z.enum(["individual", "llc", "corporation", "partnership"]),
        phone: z.string(),
        email: z.string(),
        website: z.string(),
        address: z.string(),
        city: z.string(),
        state: z.string(),
        bio: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createBuilder({
          ...input,
          userId: ctx.user.id,
          verificationStatus: "pending",
        });
      }),
    
    // Update verification status (admin only)
    updateVerificationStatus: protectedProcedure
      .input(z.object({
        builderId: z.number(),
        status: z.enum(["pending", "verified", "rejected"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        return await db.updateBuilderVerificationStatus(input.builderId, input.status, input.notes);
      }),
  }),
  
  builderProjects: router({
    // List all published builder projects
    list: publicProcedure
      .input(z.object({
        constructionStatus: z.enum(["pre_construction", "under_construction", "completed"]).optional(),
        city: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const projects = await db.getPublishedBuilderProjects();
        return projects.filter(p => {
          if (input.constructionStatus && p.constructionStatus !== input.constructionStatus) return false;
          if (input.city && p.city !== input.city) return false;
          if (input.minPrice && p.currentPrice < input.minPrice) return false;
          if (input.maxPrice && p.currentPrice > input.maxPrice) return false;
          return true;
        }).slice(input.offset, input.offset + input.limit);
      }),
    
    // Get project by ID with full details
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const project = await db.getBuilderProjectById(input.id);
        if (!project) throw new Error("Project not found");
        
        // Get associated milestones
        const milestones = await db.getProjectMilestones(input.id);
        
        return {
          ...project,
          milestones,
        };
      }),
    
    // Get project milestones
    getMilestones: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectMilestones(input.projectId);
      }),
  }),
  
  // ============================================================================
  // Short-let Rental Routers
  // ============================================================================
  
  shortLets: router({
    // List available short-let properties
    list: publicProcedure
      .input(z.object({
        city: z.string().optional(),
        checkIn: z.string().optional(), // ISO date string
        checkOut: z.string().optional(), // ISO date string
        guests: z.number().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const properties = await db.getShortLetProperties();
        if (!input.checkIn || !input.checkOut) return properties;

        const checkIn = new Date(input.checkIn);
        const checkOut = new Date(input.checkOut);
        const bookings = await db.select().from(shortLetBookings)
          .where(and(
            eq(shortLetBookings.status, 'confirmed'),
            or(
              and(lte(shortLetBookings.checkIn, checkIn), gte(shortLetBookings.checkOut, checkIn)),
              and(lte(shortLetBookings.checkIn, checkOut), gte(shortLetBookings.checkOut, checkOut))
            )
          ));

        const bookedPropertyIds = new Set(bookings.map(b => b.propertyId));
        return properties.filter(p => !bookedPropertyIds.has(p.id));
      }),
    
    // Get short-let property by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const shortLet = await db.getShortLetPropertyById(input.id);
        if (!shortLet) throw new Error("Short-let property not found");
        
        // Get base property details
        const property = await db.getPropertyById(shortLet.propertyId);
        
        return {
          ...shortLet,
          property,
        };
      }),
    
    // Get host's short-let properties
    getMyListings: protectedProcedure.query(async ({ ctx }) => {
      return await db.getHostShortLets(ctx.user.id);
    }),
    
    // Get guest's bookings
    getMyBookings: protectedProcedure.query(async ({ ctx }) => {
      return await db.getGuestBookings(ctx.user.id);
    }),
    
    // Get host's bookings
    getHostBookings: protectedProcedure.query(async ({ ctx }) => {
      return await db.getHostBookings(ctx.user.id);
    }),
  }),
  
  shortLetBookings: router({
    // Create a booking
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        checkIn: z.string(), // ISO date string
        checkOut: z.string(), // ISO date string
        numberOfGuests: z.number(),
        specialRequests: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const checkInDate = new Date(input.checkIn);
        const checkOutDate = new Date(input.checkOut);
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

        const property = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
        if (!property.length) throw new Error('Property not found');

        const pricePerNight = property[0].price || 0;
        const subtotal = pricePerNight * nights;
        const serviceFee = subtotal * 0.10;
        const cleaningFee = 5000;
        const totalAmount = subtotal + serviceFee + cleaningFee;

        const existingBookings = await db.select().from(bookings)
          .where(
            and(
              eq(bookings.propertyId, input.propertyId),
              or(
                and(
                  sql`${bookings.checkIn} <= ${input.checkIn}`,
                  sql`${bookings.checkOut} > ${input.checkIn}`
                ),
                and(
                  sql`${bookings.checkIn} < ${input.checkOut}`,
                  sql`${bookings.checkOut} >= ${input.checkOut}`
                )
              )
            )
          );

        if (existingBookings.length > 0) {
          throw new Error('Property not available for selected dates');
        }

        const [booking] = await db.insert(bookings).values({
          propertyId: input.propertyId,
          userId: ctx.user.id,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          numberOfGuests: input.numberOfGuests,
          totalAmount,
          status: 'pending',
          specialRequests: input.specialRequests,
        }).returning();

        return {
          booking,
          pricing: {
            pricePerNight,
            nights,
            subtotal,
            serviceFee,
            cleaningFee,
            totalAmount
          }
        };
      }),
  }),
  
  shortLetAvailability: router({
    // Check availability for date range
    checkAvailability: publicProcedure
      .input(z.object({
        propertyId: z.number(),
        checkIn: z.string(), // ISO date
        checkOut: z.string(), // ISO date
      }))
      .query(async ({ input }) => {
        const bookings = await db.getShortLetBookingsByProperty(input.propertyId);
        
        const checkInDate = new Date(input.checkIn);
        const checkOutDate = new Date(input.checkOut);
        
        // Check for overlapping bookings
        const hasConflict = bookings.some((booking: any) => {
          const bookingCheckIn = new Date(booking.checkIn);
          const bookingCheckOut = new Date(booking.checkOut);
          
          return (
            (checkInDate >= bookingCheckIn && checkInDate < bookingCheckOut) ||
            (checkOutDate > bookingCheckIn && checkOutDate <= bookingCheckOut) ||
            (checkInDate <= bookingCheckIn && checkOutDate >= bookingCheckOut)
          );
        });
        
        return {
          available: !hasConflict,
          conflictingBookings: hasConflict ? bookings.filter((booking: any) => {
            const bookingCheckIn = new Date(booking.checkIn);
            const bookingCheckOut = new Date(booking.checkOut);
            
            return (
              (checkInDate >= bookingCheckIn && checkInDate < bookingCheckOut) ||
              (checkOutDate > bookingCheckIn && checkOutDate <= bookingCheckOut) ||
              (checkInDate <= bookingCheckIn && checkOutDate >= bookingCheckOut)
            );
          }) : [],
        };
      }),
    
    // Calculate pricing for date range
    calculatePrice: publicProcedure
      .input(z.object({
        propertyId: z.number(),
        checkIn: z.string(),
        checkOut: z.string(),
        numberOfGuests: z.number(),
      }))
      .query(async ({ input }) => {
        const shortLet = await db.getShortLetPropertyById(input.propertyId);
        if (!shortLet) throw new Error("Property not found");
        
        const checkInDate = new Date(input.checkIn);
        const checkOutDate = new Date(input.checkOut);
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (nights < (shortLet.minimumStay || 1)) {
          throw new Error(`Minimum stay is ${shortLet.minimumStay || 1} nights`);
        }
        
        const basePrice = shortLet.nightlyRate * nights;
        const cleaningFee = 5000; // Fixed cleaning fee
        const serviceFee = basePrice * 0.1; // 10% service fee
        const totalPrice = basePrice + cleaningFee + serviceFee;
        
        return {
          nights,
          pricePerNight: shortLet.nightlyRate,
          basePrice,
          cleaningFee,
          serviceFee,
          totalPrice,
        };
      }),
  }),

  // ============================================================================
  // Document Upload & Management
  // ============================================================================
  
  uploads: documentsRouter,
  
  // ============================================================================
  // Push Notifications
  // ============================================================================
  
  push: pushRouter,
  notifications: notificationsRouter,
  tours: toursRouter,
  mapSearch: mapSearchRouter,
  comparison: comparisonRouter,
  virtualTours: virtualToursRouter,
  neighborhood: neighborhoodRouter,
  recommendations: recommendationsRouter,
  openHouse: openHouseRouter,
  alerts: alertsRouter,
  eSignature: eSignatureRouter,  // alertPerformance: alertPerformanceRouter,
  emailWebhooks: emailWebhooksRouter,
  emailTesting: emailTestingRouter,
  schedulerManagement: schedulerManagementRouter,
  aiChatbot: aiChatbotRouter,
  ollamaModelManagement: ollamaModelManagementRouter,
  aiPropertyDescription: aiPropertyDescriptionRouter,
  currency: currencyRouter,
  exchangeRateAlerts: exchangeRateAlertsRouter,
  currencyHistory: currencyHistoryRouter,
  propertyStats: propertyStatsRouter,
  smartRecommendations: smartRecommendationsRouter,
  recommendationFeedback: recommendationFeedbackRouter,
  feedbackAnalytics: feedbackAnalyticsRouter,
  recommendationPreferences: recommendationPreferencesRouter,
  abTesting: abTestingRouter,
  collaborativeFiltering: collaborativeFilteringRouter,
  mlTraining: mlTrainingRouter,
  blockchainRegistry: blockchainRegistryRouter,
  shortlet: shortletRouter,
  propertyHeatmap: propertyHeatmapRouter,
  builderServices: builderServicesRouter,
  
  // ============================================================================
  // Microservices Integration
  // ============================================================================
  
  microservices: router({
    // ML Valuation
    getPropertyValuation: publicProcedure
      .input(z.object({
        bedrooms: z.number(),
        bathrooms: z.number(),
        square_feet: z.number(),
        location: z.string(),
        property_type: z.string(),
        year_built: z.number().optional(),
        amenities: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { getPropertyValuation } = await import("./microservices/clients");
        return await getPropertyValuation(input);
      }),
    
    // Fraud Detection
    analyzeFraud: protectedProcedure
      .input(z.object({
        user_id: z.string(),
        amount: z.number(),
        currency: z.string(),
        payment_method: z.string(),
        ip_address: z.string().optional(),
        device_id: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { analyzeFraud } = await import("./microservices/clients");
        return await analyzeFraud(input);
      }),
    
    // User Risk Profile
    getUserRiskProfile: protectedProcedure
      .input(z.object({
        userId: z.string(),
      }))
      .query(async ({ input }) => {
        const { getUserRiskProfile } = await import("./microservices/clients");
        return await getUserRiskProfile(input.userId);
      }),
   }),

  // Property Reviews - using reviewsRouter from ./routers/reviews

  // Old appointments router removed - using new appointmentsRouter from ./routers/appointments

  // Analytics & Buyer Journey

  // Document Management System

  // Admin Moderation Panel
  admin: router({
    getPendingPropertyReports: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        return await db.getPendingPropertyReports();
      }),

    getPendingUserReports: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPendingUserReports();
      }),

    getPendingReviewReports: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPendingReviewReports();
      }),

    updatePropertyReport: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        status: z.enum(['pending', 'reviewing', 'resolved', 'dismissed']),
        reviewNotes: z.string().optional(),
        action: z.enum(['none', 'warning_sent', 'listing_removed', 'user_banned']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updatePropertyReportStatus(
          input.reportId,
          input.status,
          ctx.user.id,
          input.reviewNotes,
          input.action
        );
        
        if (input.action) {
          await db.logModerationAction({
            adminId: ctx.user.id,
            actionType: input.action,
            targetType: 'property',
            targetId: input.reportId,
            notes: input.reviewNotes,
          });
        }
        
        return { success: true };
      }),

    updateUserReport: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        status: z.enum(['pending', 'reviewing', 'resolved', 'dismissed']),
        reviewNotes: z.string().optional(),
        action: z.enum(['none', 'warning_sent', 'account_suspended', 'account_banned']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserReportStatus(
          input.reportId,
          input.status,
          ctx.user.id,
          input.reviewNotes,
          input.action
        );
        
        if (input.action) {
          await db.logModerationAction({
            adminId: ctx.user.id,
            actionType: input.action,
            targetType: 'user',
            targetId: input.reportId,
            notes: input.reviewNotes,
          });
        }
        
        return { success: true };
      }),

    getPendingPropertyApprovals: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPendingPropertyApprovals();
      }),

    updatePropertyApproval: protectedProcedure
      .input(z.object({
        approvalId: z.number(),
        status: z.enum(['pending', 'approved', 'rejected', 'needs_changes']),
        reviewNotes: z.string().optional(),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updatePropertyApprovalStatus(
          input.approvalId,
          input.status,
          ctx.user.id,
          input.reviewNotes,
          input.rejectionReason
        );
        return { success: true };
      }),
  }),

  // Escrow System
  escrow: router({
    create: protectedProcedure
      .input(z.object({
        transactionId: z.number(),
        propertyId: z.number(),
        sellerId: z.number(),
        totalAmount: z.number(),
        heldAmount: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createEscrowAccount({
          ...input,
          buyerId: ctx.user.id,
        });
      }),

    getByTransactionId: protectedProcedure
      .input(z.object({ transactionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEscrowByTransactionId(input.transactionId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEscrowById(input.id);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        escrowId: z.number(),
        status: z.enum(['created', 'funded', 'partial_release', 'completed', 'disputed', 'refunded', 'cancelled']),
        releasedAmount: z.number().optional(),
        refundedAmount: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateEscrowStatus(input.escrowId, input.status, {
          releasedAmount: input.releasedAmount,
          refundedAmount: input.refundedAmount,
          completedAt: input.status === 'completed' ? new Date() : undefined,
        });
        return { success: true };
      }),

    getMilestones: protectedProcedure
      .input(z.object({ escrowAccountId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEscrowMilestones(input.escrowAccountId);
      }),

    createMilestone: protectedProcedure
      .input(z.object({
        escrowAccountId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        amount: z.number(),
        percentage: z.number().optional(),
        sequence: z.number(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createEscrowMilestone(input);
      }),

    updateMilestone: protectedProcedure
      .input(z.object({
        milestoneId: z.number(),
        status: z.enum(['pending', 'in_progress', 'completed', 'approved', 'released', 'disputed']),
        approvedByBuyer: z.boolean().optional(),
        approvedBySeller: z.boolean().optional(),
        approvedByInspector: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateMilestoneStatus(input.milestoneId, input.status, {
          completedAt: input.status === 'completed' ? new Date() : undefined,
          releasedAt: input.status === 'released' ? new Date() : undefined,
          approvedByBuyer: input.approvedByBuyer !== undefined ? (input.approvedByBuyer ? 1 : 0) : undefined,
          approvedBySeller: input.approvedBySeller !== undefined ? (input.approvedBySeller ? 1 : 0) : undefined,
          approvedByInspector: input.approvedByInspector !== undefined ? (input.approvedByInspector ? 1 : 0) : undefined,
        });
        return { success: true };
      }),

    getTransactions: protectedProcedure
      .input(z.object({ escrowAccountId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEscrowTransactions(input.escrowAccountId);
      }),

    createDispute: protectedProcedure
      .input(z.object({
        escrowAccountId: z.number(),
        milestoneId: z.number().optional(),
        disputeType: z.enum(['milestone_not_completed', 'quality_issue', 'timeline_delay', 'contract_breach', 'other']),
        description: z.string(),
        evidence: z.array(z.string()).optional(),
        requestedAmount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createEscrowDispute({
          ...input,
          initiatedByUserId: ctx.user.id,
          evidence: input.evidence ? JSON.stringify(input.evidence) : undefined,
        });
      }),

    getDisputes: protectedProcedure
      .input(z.object({ escrowAccountId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEscrowDisputes(input.escrowAccountId);
      }),

    resolveDispute: protectedProcedure
      .input(z.object({
        disputeId: z.number(),
        status: z.enum(['open', 'under_review', 'mediation', 'resolved', 'closed']),
        resolution: z.string().optional(),
        resolvedAmount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDisputeStatus(
          input.disputeId,
          input.status,
          ctx.user.id,
          input.resolution,
          input.resolvedAmount
        );
        return { success: true };
      }),

    getBuyerEscrows: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getBuyerEscrows(ctx.user.id);
      }),

    getSellerEscrows: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getSellerEscrows(ctx.user.id);
      }),
  }),

  // E-Signature System
  signature: router({
    createRequest: protectedProcedure
      .input(z.object({
        documentId: z.number(),
        documentUrl: z.string(),
        documentName: z.string(),
        title: z.string(),
        message: z.string().optional(),
        recipients: z.array(z.object({
          email: z.string().email(),
          name: z.string(),
          role: z.enum(['signer', 'cc', 'approver']),
          routingOrder: z.number().optional(),
        })),
        expiresInDays: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createSignatureRequest } = await import('./_core/eSignature');
        
        const result = await createSignatureRequest({
          documentUrl: input.documentUrl,
          documentName: input.documentName,
          title: input.title,
          message: input.message,
          recipients: input.recipients,
          expiresInDays: input.expiresInDays,
        });

        // Send notification to recipients
        const { notifySignatureRequest } = await import('./_core/notificationService');
        for (const recipient of input.recipients) {
          if (recipient.role === 'signer') {
            await notifySignatureRequest({
              userId: ctx.user.id,
              userEmail: recipient.email,
              userName: recipient.name,
              documentTitle: input.title,
              signingUrl: `https://example.com/sign/${result.requestId}`,
            });
          }
        }

        return result;
      }),

    getStatus: protectedProcedure
      .input(z.object({ requestId: z.string() }))
      .query(async ({ input }) => {
        const { getSignatureRequestStatus } = await import('./_core/eSignature');
        return await getSignatureRequestStatus(input.requestId);
      }),

    cancel: protectedProcedure
      .input(z.object({ requestId: z.string() }))
      .mutation(async ({ input }) => {
        const { cancelSignatureRequest } = await import('./_core/eSignature');
        return await cancelSignatureRequest(input.requestId);
      }),

    downloadSigned: protectedProcedure
      .input(z.object({ requestId: z.string() }))
      .query(async ({ input }) => {
        const { downloadSignedDocument } = await import('./_core/eSignature');
        return await downloadSignedDocument(input.requestId);
      }),
  }),

  // Notification System

  // Analytics Dashboard

  emailDigest: router({
    previewDaily: protectedProcedure
      .query(async () => {
        const { previewDigest } = await import('./_core/emailDigest');
        return { html: previewDigest('daily') };
      }),

    previewWeekly: protectedProcedure
      .query(async () => {
        const { previewDigest } = await import('./_core/emailDigest');
        return { html: previewDigest('weekly') };
      }),

    sendDaily: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        const { sendDailyDigest } = await import('./_core/emailDigest');
        const success = await sendDailyDigest([ctx.user.email || '']);
        return { success };
      }),

    sendWeekly: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        const { sendWeeklyDigest } = await import('./_core/emailDigest');
        const success = await sendWeeklyDigest([ctx.user.email || '']);
        return { success };
      }),
  }),

  // Geospatial Service Integration
  geospatial: router({
    searchNearby: publicProcedure
      .input(z.object({
        center: z.object({ lat: z.number(), lng: z.number() }),
        radiusKm: z.number(),
        filters: z.object({
          propertyType: z.array(z.string()).optional(),
          priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
          bedrooms: z.number().optional(),
        }).optional(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        const { GeospatialClient } = await import('./_core/serviceClients');
        const client = new GeospatialClient();
        
        // Convert km to meters for the service
        const result = await client.searchNearby({
          center: input.center,
          radius: input.radiusKm * 1000,
          filters: input.filters,
          limit: input.limit,
        });
        
        return result;
      }),

    searchPolygon: publicProcedure
      .input(z.object({
        polygon: z.array(z.object({ lat: z.number(), lng: z.number() })),
        filters: z.any().optional(),
      }))
      .query(async ({ input }) => {
        const { GeospatialClient } = await import('./_core/serviceClients');
        const client = new GeospatialClient();
        
        const result = await client.searchPolygon(input.polygon, input.filters);
        return result;
      }),

    getHeatmap: publicProcedure
      .input(z.object({
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }),
        resolution: z.number().default(9),
      }))
      .query(async ({ input }) => {
        const { GeospatialClient } = await import('./_core/serviceClients');
        const client = new GeospatialClient();
        
        const result = await client.getHeatmap(input.bounds, input.resolution);
        return result;
      }),

    getNeighborhoodStats: publicProcedure
      .input(z.object({
        h3Index: z.string(),
      }))
      .query(async ({ input }) => {
        const { GeospatialClient } = await import('./_core/serviceClients');
        const client = new GeospatialClient();
        
        const result = await client.getNeighborhoodStats(input.h3Index);
        return result;
      }),
  }),

  // Mortgage Calculator (integrates with payment-service)
  mortgage: router({
    calculate: publicProcedure
      .input(z.object({
        loanAmount: z.number(),
        interestRate: z.number(),
        loanTermYears: z.number(),
      }))
      .query(async ({ input }) => {
        const { PaymentServiceClient } = await import('./_core/serviceClients');
        const client = new PaymentServiceClient();
        
        // Call payment-service (Go) for amortization calculation
        const result = await client.calculateMortgage({
          loanAmount: input.loanAmount,
          annualInterestRate: input.interestRate,
          loanTermYears: input.loanTermYears,
        });
        
        return result;
      }),
  }),

  // Property Alerts System (integrates with notification-service)

  // Agent Messaging System (real-time chat)
  
});
export type AppRouter = typeof appRouter;

// Start exchange rate monitoring
startExchangeRateMonitoring();

// Start automated pricing engine scheduler
startAutoPricingScheduler();

// Start GNN alerts scheduler
startGnnAlertsScheduler();

// Start weekly recommendation digest scheduler
startWeeklyDigestScheduler();
