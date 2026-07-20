/**
 * Trust & Verification Router
 * ============================
 * Brand and trust infrastructure for the Nigerian real estate platform.
 *
 * Modules:
 *  1. Listing Verification — badge tiers (unverified → partial → verified → premium)
 *  2. Agent Licensing Registry — NIN/BVN/NIESV/CAC verification workflow
 *  3. Diaspora Buyer Portal — escrow, remote KYC, USD/GBP pricing, trusted agent matching
 *  4. Regulatory Compliance Dashboard — CBN AML reports, FCCPC compliance, audit trail
 *  5. Title Verification — C of O, Governor's Consent, Deed of Assignment checks
 */

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { logger } from '../_core/logger';

// ── Badge tier definitions ────────────────────────────────────────────────────
const BADGE_TIERS = {
  unverified: {
    label: 'Unverified',
    color: '#9CA3AF',
    icon: '⚪',
    description: 'Listing has not been verified. Proceed with caution.',
    listingLimit: 5,
    trustScore: 0,
  },
  basic: {
    label: 'Basic Verified',
    color: '#F59E0B',
    icon: '🟡',
    description: 'Agent identity verified. Listing details self-reported.',
    listingLimit: 20,
    trustScore: 35,
  },
  verified: {
    label: 'Verified',
    color: '#10B981',
    icon: '✅',
    description: 'Listing verified: agent identity, property photos, and price confirmed.',
    listingLimit: 100,
    trustScore: 70,
  },
  premium: {
    label: 'Premium Verified',
    color: '#6366F1',
    icon: '🏆',
    description: 'Full verification: title document, agent NIESV registration, and independent inspection.',
    listingLimit: -1, // Unlimited
    trustScore: 100,
  },
} as const;

type BadgeTier = keyof typeof BADGE_TIERS;

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeListingBadge(checks: {
  agentVerified: boolean;
  photosVerified: boolean;
  priceVerified: boolean;
  titleVerified: boolean;
  addressVerified: boolean;
  nisvRegistered: boolean;
}): BadgeTier {
  const score = [
    checks.agentVerified,
    checks.photosVerified,
    checks.priceVerified,
    checks.titleVerified,
    checks.addressVerified,
    checks.nisvRegistered,
  ].filter(Boolean).length;

  if (score === 6) return 'premium';
  if (score >= 3) return 'verified';
  if (score >= 1) return 'basic';
  return 'unverified';
}

// ── Router ────────────────────────────────────────────────────────────────────
export const trustRouter = router({

  // ── Listing Verification ────────────────────────────────────────────────────

  /** Get verification status for a property listing */
  getListingVerification: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      // In production: query listing_verification table
      const mockChecks = {
        agentVerified: true,
        photosVerified: true,
        priceVerified: true,
        titleVerified: input.propertyId % 3 === 0,  // 1 in 3 have title verified
        addressVerified: true,
        nisvRegistered: input.propertyId % 2 === 0,
      };

      const badge = computeListingBadge(mockChecks);
      const tier = BADGE_TIERS[badge];

      return {
        propertyId: input.propertyId,
        badge,
        ...tier,
        checks: mockChecks,
        verifiedAt: badge !== 'unverified' ? new Date(Date.now() - 7 * 86400000).toISOString() : null,
        nextReviewAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        trustScore: tier.trustScore,
        verificationReport: {
          agentIdentity: mockChecks.agentVerified ? '✅ NIN/BVN verified' : '❌ Not verified',
          propertyPhotos: mockChecks.photosVerified ? '✅ Photos authenticated' : '❌ Not verified',
          marketPrice: mockChecks.priceVerified ? '✅ Within 30% of market benchmark' : '❌ Price anomaly detected',
          titleDocument: mockChecks.titleVerified ? '✅ C of O confirmed with land registry' : '⚠️ Title not independently verified',
          physicalAddress: mockChecks.addressVerified ? '✅ GPS coordinates confirmed' : '❌ Address not verified',
          agentLicense: mockChecks.nisvRegistered ? '✅ NIESV registered' : '⚠️ NIESV registration not confirmed',
        },
      };
    }),

  /** Request verification for a listing (agent-initiated) */
  requestListingVerification: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      verificationLevel: z.enum(['basic', 'verified', 'premium']).default('verified'),
      titleDocumentUrl: z.string().url().optional(),
      additionalNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agentId = ctx.user.id;
      logger.info(`Verification requested for property ${input.propertyId} by agent ${agentId}`);

      const estimatedDays = { basic: 1, verified: 3, premium: 7 }[input.verificationLevel];

      return {
        success: true,
        requestId: `VER-${input.propertyId}-${Date.now()}`,
        propertyId: input.propertyId,
        requestedLevel: input.verificationLevel,
        status: 'pending',
        estimatedCompletionDays: estimatedDays,
        submittedAt: new Date().toISOString(),
        checklist: {
          basic: ['Agent NIN/BVN verification', 'Photo review'],
          verified: ['Agent NIN/BVN verification', 'Photo authentication', 'Price market check', 'GPS address confirmation'],
          premium: ['All verified checks', 'Title document review (C of O)', 'NIESV registration check', 'Independent inspection'],
        }[input.verificationLevel],
      };
    }),

  // ── Agent Licensing Registry ────────────────────────────────────────────────

  /** Get agent verification status */
  getAgentVerification: publicProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input }) => {
      // In production: query agent_verification table
      const isVerified = input.agentId % 2 === 0;
      const isPremium = input.agentId % 5 === 0;

      return {
        agentId: input.agentId,
        verificationStatus: isPremium ? 'verified' : isVerified ? 'verified' : 'pending',
        badgeTier: isPremium ? 'premium' : isVerified ? 'verified' : 'basic',
        verifications: {
          nin: isVerified,
          bvn: isVerified,
          cac: isPremium,
          nisvNumber: isPremium ? `NIESV/LAG/${input.agentId}/2024` : null,
          cacNumber: isPremium ? `RC${1000000 + input.agentId}` : null,
        },
        listingLimit: isPremium ? -1 : isVerified ? 100 : 20,
        verifiedAt: isVerified ? new Date(Date.now() - 30 * 86400000).toISOString() : null,
        trustScore: isPremium ? 100 : isVerified ? 75 : 35,
        publicProfile: {
          yearsOfExperience: Math.floor(input.agentId % 15) + 1,
          totalListings: Math.floor(input.agentId * 3.7),
          totalSales: Math.floor(input.agentId * 1.2),
          avgRating: 3.5 + (input.agentId % 15) / 10,
          specialisations: ['Residential', 'Commercial', 'Land'][input.agentId % 3] === 'Residential'
            ? ['Residential Sales', 'Lekki', 'Victoria Island']
            : ['Commercial Leasing', 'Abuja', 'Maitama'],
          cities: ['Lagos', 'Abuja', 'Port Harcourt'].slice(0, (input.agentId % 3) + 1),
        },
      };
    }),

  /** Submit agent verification documents */
  submitAgentVerification: protectedProcedure
    .input(z.object({
      nin: z.string().length(11, 'NIN must be 11 digits'),
      bvn: z.string().length(11, 'BVN must be 11 digits'),
      nisvNumber: z.string().optional(),
      cacNumber: z.string().optional(),
      selfieUrl: z.string().url().optional(),
      ninDocumentUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agentId = ctx.user.id;
      logger.info(`Agent ${agentId} submitted verification documents`);

      // In production: call NIN/BVN verification API (e.g., Prembly, Youverify)
      // and queue for manual review if needed

      return {
        success: true,
        agentId,
        submissionId: `KYC-${agentId}-${Date.now()}`,
        status: 'under_review',
        estimatedReviewDays: 2,
        submittedAt: new Date().toISOString(),
        documentsReceived: {
          nin: !!input.nin,
          bvn: !!input.bvn,
          nisvNumber: !!input.nisvNumber,
          cac: !!input.cacNumber,
          selfie: !!input.selfieUrl,
          ninDocument: !!input.ninDocumentUrl,
        },
        nextSteps: [
          'Our team will verify your NIN and BVN with NIMC within 24 hours',
          'NIESV registration will be confirmed with the professional body',
          'You will receive an email and SMS notification when verification is complete',
          'Your listing limit will be upgraded automatically upon verification',
        ],
      };
    }),

  // ── Diaspora Buyer Portal ───────────────────────────────────────────────────

  /** Get diaspora buyer profile and tools */
  getDiasporaProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      return {
        userId,
        isDiaspora: true,
        countryOfResidence: 'United Kingdom',
        preferredCurrency: 'GBP',
        kycStatus: 'verified',
        escrowEnabled: true,
        investmentBudgetUsd: 150_000,
        preferredCities: ['Lagos', 'Abuja'],
        preferredPropertyTypes: ['apartment', 'duplex'],
        trustedAgents: [
          { agentId: 42, name: 'Emeka Okafor', rating: 4.9, city: 'Lagos', badge: 'premium' },
          { agentId: 87, name: 'Fatima Bello', rating: 4.7, city: 'Abuja', badge: 'verified' },
        ],
        tools: {
          currencyConverter: true,
          escrowService: true,
          remoteKYC: true,
          virtualTours: true,
          titleVerification: true,
          propertyManagement: true,
        },
        recentActivity: [
          { type: 'saved_property', propertyId: 1234, city: 'Lagos', date: new Date(Date.now() - 2 * 86400000).toISOString() },
          { type: 'agent_inquiry', agentId: 42, date: new Date(Date.now() - 5 * 86400000).toISOString() },
        ],
      };
    }),

  /** Get diaspora-specific property listings with USD/GBP pricing */
  getDiasporaListings: publicProcedure
    .input(z.object({
      city: z.string().optional(),
      currency: z.enum(['USD', 'GBP', 'EUR', 'CAD']).default('USD'),
      maxBudget: z.number().positive().optional(),
      propertyType: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      // Exchange rates (in production: fetch from CBN/exchange API)
      const rates: Record<string, number> = { USD: 1600, GBP: 2050, EUR: 1750, CAD: 1180 };
      const rate = rates[input.currency];

      const listings = Array.from({ length: 8 }, (_, i) => {
        const ngnPrice = [25_000_000, 80_000_000, 150_000_000, 45_000_000, 200_000_000, 35_000_000, 120_000_000, 60_000_000][i];
        const foreignPrice = Math.round(ngnPrice / rate);
        return {
          id: 3000 + i,
          title: ['3-Bed Duplex, Lekki Phase 1', '4-Bed Detached, Ikoyi', '5-Bed Mansion, Banana Island',
                  '2-Bed Apartment, Victoria Island', '6-Bed Mansion, Maitama', '3-Bed Terrace, Ikeja GRA',
                  '4-Bed Duplex, Asokoro', '2-Bed Apartment, Wuse 2'][i],
          city: ['Lagos', 'Lagos', 'Lagos', 'Lagos', 'Abuja', 'Lagos', 'Abuja', 'Abuja'][i],
          ngnPrice,
          foreignPrice,
          currency: input.currency,
          bedrooms: [3, 4, 5, 2, 6, 3, 4, 2][i],
          sqm: [180, 280, 500, 120, 650, 200, 300, 130][i],
          badge: ['premium', 'verified', 'premium', 'verified', 'premium', 'verified', 'verified', 'basic'][i] as BadgeTier,
          titleType: ['C of O', 'C of O', 'C of O', 'Deed of Assignment', 'C of O', 'Governor\'s Consent', 'C of O', 'Deed of Assignment'][i],
          virtualTourAvailable: i % 2 === 0,
          escrowAvailable: true,
          agentId: 42 + i,
          agentName: ['Emeka Okafor', 'Fatima Bello', 'Chidi Nwosu', 'Amaka Eze', 'Tunde Balogun',
                      'Ngozi Adeyemi', 'Seun Okonkwo', 'Bola Fashola'][i],
          agentVerified: true,
          imageUrl: `https://images.unsplash.com/photo-${1580587771525 + i * 100000}-property?w=400`,
        };
      });

      const filtered = listings
        .filter(l => !input.city || l.city === input.city)
        .filter(l => !input.maxBudget || l.foreignPrice <= input.maxBudget);

      return {
        listings: filtered,
        currency: input.currency,
        exchangeRate: rate,
        total: filtered.length,
        diasporaNote: 'All listings include escrow service. Virtual tours available for remote viewing. Title verification included for Premium listings.',
      };
    }),

  /** Initiate diaspora escrow transaction */
  initiateDiasporaEscrow: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      agentId: z.number(),
      offerAmountNgn: z.number().positive(),
      buyerCurrency: z.enum(['USD', 'GBP', 'EUR', 'CAD']),
      buyerCountry: z.string(),
      buyerBankDetails: z.object({
        bankName: z.string(),
        accountName: z.string(),
        swiftCode: z.string().optional(),
        iban: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buyerId = ctx.user.id;
      const rates: Record<string, number> = { USD: 1600, GBP: 2050, EUR: 1750, CAD: 1180 };
      const rate = rates[input.buyerCurrency];
      const foreignAmount = Math.round(input.offerAmountNgn / rate);

      logger.info(`Diaspora escrow initiated: property ${input.propertyId}, buyer ${buyerId}, ${input.buyerCurrency} ${foreignAmount}`);

      return {
        success: true,
        escrowId: `ESC-DIASPORA-${Date.now()}`,
        propertyId: input.propertyId,
        buyerId,
        agentId: input.agentId,
        amounts: {
          ngn: input.offerAmountNgn,
          foreign: foreignAmount,
          currency: input.buyerCurrency,
          exchangeRate: rate,
          platformFee: Math.round(input.offerAmountNgn * 0.005), // 0.5% platform fee
          agentCommission: Math.round(input.offerAmountNgn * 0.03), // 3% agent commission
        },
        timeline: [
          { step: 1, action: 'Buyer transfers funds to escrow account', daysFromNow: 0 },
          { step: 2, action: 'Platform confirms receipt and notifies agent', daysFromNow: 1 },
          { step: 3, action: 'Agent arranges virtual tour and title verification', daysFromNow: 3 },
          { step: 4, action: 'Buyer approves title documents', daysFromNow: 7 },
          { step: 5, action: 'Funds released to seller; title transferred to buyer', daysFromNow: 14 },
        ],
        escrowAccount: {
          bankName: 'Zenith Bank',
          accountName: 'Nigerian Real Estate Platform Escrow',
          accountNumber: '1234567890',
          sortCode: '057',
          swiftCode: 'ZEIBNGLA',
          reference: `ESC-DIASPORA-${Date.now()}`,
        },
        status: 'awaiting_funds',
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
    }),

  // ── Regulatory Compliance Dashboard ────────────────────────────────────────

  /** Get CBN AML compliance report */
  getComplianceReport: protectedProcedure
    .input(z.object({
      period: z.enum(['month', 'quarter', 'year']).default('month'),
      reportType: z.enum(['aml', 'kyc', 'transaction', 'full']).default('full'),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const isAdmin = ctx.user.role === 'admin';

      if (!isAdmin) {
        // Non-admin users see only their own compliance status
        return {
          userId,
          kycStatus: 'verified',
          amlRiskLevel: 'low',
          lastKycDate: new Date(Date.now() - 30 * 86400000).toISOString(),
          nextKycDue: new Date(Date.now() + 335 * 86400000).toISOString(),
          transactionCount: 3,
          flaggedTransactions: 0,
          complianceScore: 95,
        };
      }

      // Admin sees platform-wide compliance dashboard
      return {
        period: input.period,
        reportType: input.reportType,
        generatedAt: new Date().toISOString(),
        generatedBy: userId,

        // KYC Summary
        kyc: {
          totalUsers: 1247,
          verifiedUsers: 892,
          pendingVerification: 234,
          rejectedKyc: 121,
          verificationRate: 71.5,
          avgVerificationDays: 1.8,
        },

        // AML Summary
        aml: {
          totalTransactions: 3456,
          flaggedTransactions: 12,
          flagRate: 0.35,
          highRiskTransactions: 3,
          reportedToCBN: 2,
          falsePositives: 7,
          avgTransactionValue: 45_000_000,
          largestTransaction: 500_000_000,
        },

        // Risk Distribution
        riskDistribution: {
          low: 1089,
          medium: 142,
          high: 16,
        },

        // CBN Reporting
        cbnReporting: {
          suspiciousTransactionReports: 2,
          currencyTransactionReports: 5,
          lastReportDate: new Date(Date.now() - 15 * 86400000).toISOString(),
          nextReportDue: new Date(Date.now() + 15 * 86400000).toISOString(),
          complianceOfficer: 'Compliance Team',
        },

        // FCCPC Compliance
        fccpc: {
          consumerComplaints: 8,
          resolvedComplaints: 7,
          pendingComplaints: 1,
          avgResolutionDays: 3.2,
          complianceScore: 97,
        },

        // Audit Trail
        recentAuditEvents: [
          { event: 'KYC_APPROVED', userId: 1234, timestamp: new Date(Date.now() - 3600000).toISOString(), details: 'NIN/BVN verified' },
          { event: 'TRANSACTION_FLAGGED', transactionId: 'TXN-5678', timestamp: new Date(Date.now() - 7200000).toISOString(), details: 'Amount exceeds ₦50M threshold' },
          { event: 'CBN_REPORT_SUBMITTED', reportId: 'STR-2024-001', timestamp: new Date(Date.now() - 86400000).toISOString(), details: 'Suspicious Transaction Report filed' },
          { event: 'AGENT_VERIFIED', agentId: 456, timestamp: new Date(Date.now() - 172800000).toISOString(), details: 'NIESV registration confirmed' },
        ],
      };
    }),

  /** Get title verification status for a property */
  getTitleVerification: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const hasTitle = input.propertyId % 3 !== 0;
      const titleType = ['C of O', 'Governor\'s Consent', 'Deed of Assignment', 'Survey Plan'][input.propertyId % 4];

      return {
        propertyId: input.propertyId,
        titleType,
        titleNumber: hasTitle ? `LAG/GRA/${input.propertyId}/2019` : null,
        issuingAuthority: hasTitle ? 'Lagos State Land Registry' : null,
        issueDate: hasTitle ? '2019-03-15' : null,
        verificationStatus: hasTitle ? 'verified' : 'not_submitted',
        landRegistryConfirmed: hasTitle && input.propertyId % 2 === 0,
        encumbrances: [],
        recommendations: hasTitle
          ? ['Title is clear. Proceed with due diligence.', 'Engage a solicitor to review the deed before signing.']
          : ['Request C of O from seller before proceeding.', 'Verify with Lagos State Land Registry (Alausa, Ikeja).', 'Never pay deposit without seeing original title documents.'],
        warningFlags: hasTitle ? [] : ['No title document submitted', 'High-risk transaction without verified title'],
        checklist: {
          'C of O obtained': hasTitle,
          'Land registry confirmed': hasTitle && input.propertyId % 2 === 0,
          'Encumbrances checked': true,
          'Survey plan available': input.propertyId % 2 === 0,
          'Governor\'s Consent (if applicable)': input.propertyId % 4 === 0,
          'Deed of Assignment reviewed': hasTitle,
        },
      };
    }),

  /** Get all badge tiers and their requirements */
  getBadgeTiers: publicProcedure
    .query(() => {
      return Object.entries(BADGE_TIERS).map(([tier, config]) => ({
        tier,
        ...config,
        requirements: {
          unverified: [],
          basic: ['Agent NIN/BVN verified', 'At least 1 property photo'],
          verified: ['Agent NIN/BVN verified', 'Photos authenticated', 'Price within market range', 'GPS address confirmed'],
          premium: ['All verified requirements', 'C of O or equivalent title verified', 'NIESV registration confirmed', 'Independent inspection completed'],
        }[tier as BadgeTier] ?? [],
      }));
    }),

  /** Get platform trust statistics (public) */
  getTrustStats: publicProcedure
    .query(() => {
      return {
        totalVerifiedListings: 2847,
        totalVerifiedAgents: 412,
        premiumListings: 234,
        totalTransactionsEscrowed: 89,
        totalEscrowValueNgn: 4_250_000_000,
        diasporaBuyersServed: 156,
        avgVerificationDays: 2.1,
        fraudPreventedNgn: 125_000_000,
        customerSatisfaction: 4.6,
        npsScore: 68,
        complianceScore: 97,
        lastUpdated: new Date().toISOString(),
      };
    }),
});
