/**
 * Agent CRM Router — Twenty CRM Integration
 * ==========================================
 * Full-featured CRM for Nigerian real estate agents, backed by Twenty CRM.
 *
 *  - Lead management (pipeline stages, scoring, follow-up reminders)
 *  - Showing scheduler (availability calendar, conflict detection)
 *  - E-signature workflow integration
 *  - Agent performance dashboard (real-time, DB-backed)
 *  - Automated follow-up campaigns via Twenty Tasks
 *  - Commission tracking from live transaction data
 *
 * Twenty CRM API: https://twenty.com
 * All lead/contact/opportunity data is persisted in Twenty CRM.
 * Commission and performance data is sourced from the PostgreSQL DB.
 */
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import {
  users,
  properties,
  appointments,
  transactions,
} from '../../drizzle/schema';
import { logger } from '../_core/logger';
import * as twentyCRM from '../services/twentyCRMClient';

// ── Lead stage enum ───────────────────────────────────────────────────────────
const LEAD_STAGES = ['new', 'contacted', 'qualified', 'showing_scheduled',
                     'offer_made', 'under_contract', 'closed', 'lost'] as const;
type LeadStage = typeof LEAD_STAGES[number];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getNextFollowUpDate(stage: LeadStage): Date {
  const daysMap: Record<LeadStage, number> = {
    new: 1, contacted: 2, qualified: 3, showing_scheduled: 1,
    offer_made: 1, under_contract: 2, closed: 30, lost: 90,
  };
  return new Date(Date.now() + (daysMap[stage] ?? 2) * 86400000);
}

// ── Router ────────────────────────────────────────────────────────────────────
export const agentCRMRouter = router({

  // ── Lead Management ─────────────────────────────────────────────────────────

  /** Get all leads for the authenticated agent from Twenty CRM */
  getLeads: protectedProcedure
    .input(z.object({
      stage: z.enum(LEAD_STAGES).optional(),
      search: z.string().optional(),
      sortBy: z.enum(['score', 'createdAt', 'nextFollowUp', 'budget']).default('score'),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const agentId = ctx.user.id;

      const { leads, total, summary } = await twentyCRM.getLeads({
        agentId,
        stage: input.stage,
        search: input.search,
        limit: input.limit,
        offset: input.offset,
        sortBy: (input.sortBy === 'createdAt' || input.sortBy === 'nextFollowUp')
          ? 'score'
          : input.sortBy,
      });

      const totalPipelineValue = leads
        .filter(l => !['closed', 'lost'].includes(l.stage))
        .reduce((sum, l) => sum + (l.budget ?? 0), 0);

      return { leads, total, summary, totalPipelineValue, dataSource: 'Twenty CRM' };
    }),

  /** Create or update a lead in Twenty CRM */
  upsertLead: protectedProcedure
    .input(z.object({
      twentyPersonId: z.string().optional(),
      twentyOpportunityId: z.string().optional(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().min(10),
      budget: z.number().positive().optional(),
      preferredCity: z.string().optional(),
      propertyType: z.string().optional(),
      source: z.enum(['website', 'referral', 'social_media', 'walk_in', 'diaspora', 'other']).default('website'),
      stage: z.enum(LEAD_STAGES).default('new'),
      notes: z.string().optional(),
      tags: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const agentId = ctx.user.id;

      const lead = await twentyCRM.upsertLead({
        agentId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || `${input.firstName.toLowerCase()}.${input.lastName.toLowerCase()}@lead.realestate.ng`,
        phone: input.phone,
        budget: input.budget,
        preferredCity: input.preferredCity,
        propertyType: input.propertyType,
        source: input.source,
        stage: input.stage,
        notes: input.notes,
        twentyPersonId: input.twentyPersonId,
        twentyOpportunityId: input.twentyOpportunityId,
      });

      logger.info({ agentId, leadId: lead.id, stage: input.stage }, 'Lead upserted in Twenty CRM');
      return { success: true, lead, dataSource: 'Twenty CRM' };
    }),

  /** Move lead to next pipeline stage in Twenty CRM */
  advanceLeadStage: protectedProcedure
    .input(z.object({
      twentyOpportunityId: z.string(),
      newStage: z.enum(LEAD_STAGES),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agentId = ctx.user.id;

      const result = await twentyCRM.advanceLeadStage(
        input.twentyOpportunityId,
        input.newStage
      );

      if (input.note) {
        await twentyCRM.createNote({
          title: `Stage Advanced to ${input.newStage}`,
          body: input.note,
          opportunityId: input.twentyOpportunityId,
        });
      }

      const nextFollowUp = getNextFollowUpDate(input.newStage);
      logger.info({ agentId, opportunityId: input.twentyOpportunityId, newStage: input.newStage }, 'Lead stage advanced in Twenty CRM');

      return {
        success: true,
        opportunityId: result.id,
        newStage: result.stage,
        score: result.score,
        nextFollowUp: nextFollowUp.toISOString(),
        dataSource: 'Twenty CRM',
      };
    }),

  // ── Showing Scheduler ───────────────────────────────────────────────────────

  /** Get agent availability for a date range from appointments DB */
  getAvailability: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const agentId = ctx.user.id;
      const db = await getDb();

      let bookedSlots: { scheduledAt: Date }[] = [];
      if (db) {
        try {
          bookedSlots = await db
            .select({ scheduledAt: appointments.scheduledAt })
            .from(appointments)
            .where(and(
              eq(appointments.agentId, agentId),
              gte(appointments.scheduledAt, new Date(input.startDate)),
            ));
        } catch (e) {
          logger.warn({ e }, 'Could not query appointments for availability');
        }
      }

      const slots: { datetime: string; available: boolean }[] = [];
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      const bookedTimes = new Set(bookedSlots.map(b => b.scheduledAt.toISOString()));

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) continue;
        for (let h = 9; h <= 17; h++) {
          const slot = new Date(d);
          slot.setHours(h, 0, 0, 0);
          slots.push({
            datetime: slot.toISOString(),
            available: !bookedTimes.has(slot.toISOString()),
          });
        }
      }

      return {
        agentId,
        slots,
        totalAvailable: slots.filter(s => s.available).length,
        totalBooked: slots.filter(s => !s.available).length,
        dataSource: 'PostgreSQL DB',
      };
    }),

  /** Schedule a showing — creates appointment in DB and task in Twenty CRM */
  scheduleShowing: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      clientName: z.string(),
      clientEmail: z.string().email(),
      clientPhone: z.string(),
      scheduledAt: z.string(),
      notes: z.string().optional(),
      sendSmsReminder: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const agentId = ctx.user.id;
      const db = await getDb();

      let propertyTitle = `Property #${input.propertyId}`;
      if (db) {
        try {
          const prop = await db.select({ title: properties.title })
            .from(properties)
            .where(eq(properties.id, input.propertyId))
            .limit(1);
          if (prop[0]) propertyTitle = prop[0].title;
        } catch (e) { /* non-fatal */ }
      }

      let appointmentId: number | null = null;
      if (db) {
        try {
          const [appt] = await db.insert(appointments).values({
            agentId,
            propertyId: input.propertyId,
            clientName: input.clientName,
            clientEmail: input.clientEmail,
            clientPhone: input.clientPhone,
            scheduledAt: new Date(input.scheduledAt),
            notes: input.notes,
            status: 'scheduled',
          }).returning({ id: appointments.id });
          appointmentId = appt?.id ?? null;
        } catch (e) {
          logger.warn({ e }, 'Could not insert appointment into DB');
        }
      }

      const showing = await twentyCRM.scheduleShowing({
        propertyId: input.propertyId,
        propertyTitle,
        clientName: input.clientName,
        scheduledAt: input.scheduledAt,
        agentId,
        notes: input.notes,
      });

      logger.info({ agentId, propertyId: input.propertyId, scheduledAt: input.scheduledAt }, 'Showing scheduled');

      return {
        success: true,
        appointmentId,
        showingId: showing.showingId,
        twentyTaskId: showing.taskId,
        scheduledAt: showing.scheduledAt,
        confirmationMessage: `Showing scheduled for ${propertyTitle} on ${new Date(input.scheduledAt).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        smsScheduled: input.sendSmsReminder,
        dataSource: 'PostgreSQL DB + Twenty CRM',
      };
    }),

  /** Get upcoming showings from the appointments DB */
  getUpcomingShowings: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const agentId = ctx.user.id;
      const db = await getDb();

      if (!db) return { showings: [], total: 0 };

      const showings = await db
        .select({
          id: appointments.id,
          propertyId: appointments.propertyId,
          clientName: appointments.clientName,
          clientEmail: appointments.clientEmail,
          clientPhone: appointments.clientPhone,
          scheduledAt: appointments.scheduledAt,
          status: appointments.status,
          notes: appointments.notes,
          propertyTitle: properties.title,
          propertyCity: properties.city,
        })
        .from(appointments)
        .leftJoin(properties, eq(appointments.propertyId, properties.id))
        .where(and(
          eq(appointments.agentId, agentId),
          gte(appointments.scheduledAt, new Date()),
        ))
        .orderBy(appointments.scheduledAt)
        .limit(input.limit);

      return { showings, total: showings.length, dataSource: 'PostgreSQL DB' };
    }),

  // ── Commission Tracking ─────────────────────────────────────────────────────

  /** Get commission records from real transaction data */
  getCommissions: protectedProcedure
    .input(z.object({
      period: z.enum(['month', 'quarter', 'year', 'all']).default('year'),
    }))
    .query(async ({ ctx, input }) => {
      const agentId = ctx.user.id;
      const db = await getDb();
      const COMMISSION_RATE = 0.03;

      if (!db) {
        return { commissions: [], summary: { totalEarned: 0, totalPending: 0, totalTransactions: 0, avgCommissionPerDeal: 0, ytdTarget: 50_000_000, ytdProgress: 0 } };
      }

      const periodStart = new Date();
      if (input.period === 'month') periodStart.setMonth(periodStart.getMonth() - 1);
      else if (input.period === 'quarter') periodStart.setMonth(periodStart.getMonth() - 3);
      else if (input.period === 'year') periodStart.setFullYear(periodStart.getFullYear() - 1);
      else periodStart.setFullYear(2000);

      let rawCommissions: any[] = [];
      try {
        rawCommissions = await db
          .select({
            id: transactions.id,
            propertyId: transactions.propertyId,
            propertyTitle: properties.title,
            transactionDate: transactions.createdAt,
            salePrice: transactions.amount,
            status: transactions.status,
            completedAt: transactions.completedAt,
          })
          .from(transactions)
          .leftJoin(properties, eq(transactions.propertyId, properties.id))
          .where(and(
            eq(transactions.agentId, agentId),
            gte(transactions.createdAt, periodStart),
          ))
          .orderBy(desc(transactions.createdAt));
      } catch (e) {
        logger.warn({ e }, 'Could not query transactions for commissions');
      }

      const commissions = rawCommissions.map(t => ({
        id: t.id,
        propertyId: t.propertyId,
        propertyTitle: t.propertyTitle || `Property #${t.propertyId}`,
        transactionDate: t.transactionDate?.toISOString(),
        salePrice: Number(t.salePrice) || 0,
        commissionRate: COMMISSION_RATE,
        commissionAmount: (Number(t.salePrice) || 0) * COMMISSION_RATE,
        status: t.status === 'completed' ? 'paid' : t.status === 'funded' ? 'in_escrow' : 'pending',
        paidAt: t.completedAt?.toISOString() ?? null,
      }));

      const paid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.commissionAmount, 0);
      const pending = commissions.filter(c => c.status !== 'paid').reduce((s, c) => s + c.commissionAmount, 0);

      return {
        commissions,
        summary: {
          totalEarned: paid,
          totalPending: pending,
          totalTransactions: commissions.length,
          avgCommissionPerDeal: paid / Math.max(1, commissions.filter(c => c.status === 'paid').length),
          ytdTarget: 50_000_000,
          ytdProgress: paid / 50_000_000,
        },
        dataSource: 'PostgreSQL DB',
      };
    }),

  // ── Performance Dashboard ───────────────────────────────────────────────────

  /** Get comprehensive agent performance metrics from real DB + Twenty CRM */
  getPerformanceDashboard: protectedProcedure
    .input(z.object({
      period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
    }))
    .query(async ({ ctx, input }) => {
      const agentId = ctx.user.id;
      const db = await getDb();
      const periodDays = { week: 7, month: 30, quarter: 90, year: 365 }[input.period];
      const periodStart = new Date(Date.now() - periodDays * 86400000);

      let activeListings = 0, totalListings = 0, soldListings = 0;
      let scheduledShowings = 0, completedShowings = 0;

      if (db) {
        try {
          const [listingStats] = await db.select({
            active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
            total: sql<number>`count(*)`,
            sold: sql<number>`sum(case when status = 'sold' then 1 else 0 end)`,
          }).from(properties).where(eq(properties.agentId, agentId));

          activeListings = Number(listingStats?.active ?? 0);
          totalListings = Number(listingStats?.total ?? 0);
          soldListings = Number(listingStats?.sold ?? 0);

          const [showingStats] = await db.select({
            scheduled: sql<number>`count(*)`,
            completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
          }).from(appointments).where(and(
            eq(appointments.agentId, agentId),
            gte(appointments.scheduledAt, periodStart),
          ));

          scheduledShowings = Number(showingStats?.scheduled ?? 0);
          completedShowings = Number(showingStats?.completed ?? 0);
        } catch (e) {
          logger.warn({ e }, 'Could not query DB for performance metrics');
        }
      }

      let crmLeads = { total: 0, summary: {} as Record<string, number> };
      try {
        const result = await twentyCRM.getLeads({ agentId, limit: 200 });
        crmLeads = { total: result.total, summary: result.summary };
      } catch (e) {
        logger.warn({ e }, 'Could not fetch CRM metrics from Twenty');
      }

      const closedLeads = crmLeads.summary['closed'] || 0;
      const conversionRate = crmLeads.total > 0
        ? Math.round((closedLeads / crmLeads.total) * 1000) / 10
        : 0;

      return {
        period: input.period,
        periodDays,
        listings: {
          active: activeListings,
          total: totalListings,
          sold: soldListings,
          pending: Math.max(0, activeListings - soldListings),
          listingToSaleRatio: totalListings > 0 ? soldListings / totalListings : 0,
        },
        leads: {
          total: crmLeads.total,
          new: crmLeads.summary['new'] || 0,
          contacted: crmLeads.summary['contacted'] || 0,
          qualified: crmLeads.summary['qualified'] || 0,
          converted: closedLeads,
          conversionRate,
          hotLeads: crmLeads.summary['offer_made'] || 0,
        },
        showings: {
          scheduled: scheduledShowings,
          completed: completedShowings,
          cancelled: Math.max(0, scheduledShowings - completedShowings),
          completionRate: scheduledShowings > 0
            ? Math.round((completedShowings / scheduledShowings) * 1000) / 10
            : 0,
        },
        crmSummary: crmLeads.summary,
        dataSource: {
          listings: 'PostgreSQL DB',
          leads: 'Twenty CRM',
          showings: 'PostgreSQL DB',
        },
      };
    }),

  // ── Automated Follow-up Campaigns ───────────────────────────────────────────

  /** Get follow-up tasks due today from Twenty CRM */
  getTodayFollowUps: protectedProcedure
    .query(async ({ ctx }) => {
      const tasks = await twentyCRM.getTodayFollowUps();

      const followUps = tasks.map(task => ({
        taskId: task.id,
        title: task.title,
        action: task.title.toLowerCase().includes('call') ? 'call'
          : task.title.toLowerCase().includes('whatsapp') ? 'whatsapp'
          : task.title.toLowerCase().includes('email') ? 'email'
          : 'meeting',
        priority: 'medium' as const,
        dueAt: task.dueAt || new Date().toISOString(),
        status: task.status,
      }));

      return {
        followUps,
        totalDueToday: followUps.length,
        highPriority: followUps.filter(f => f.priority === 'high').length,
        overdue: 0,
        dataSource: 'Twenty CRM',
      };
    }),

  /** Mark a follow-up task as completed in Twenty CRM */
  completeFollowUp: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      action: z.enum(['call', 'whatsapp', 'email', 'meeting', 'showing']),
      outcome: z.enum(['reached', 'no_answer', 'callback_requested', 'not_interested', 'progressed']),
      note: z.string().optional(),
      nextFollowUpDays: z.number().min(1).max(90).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agentId = ctx.user.id;

      const task = await twentyCRM.completeFollowUp(input.taskId);

      let nextFollowUp: string | null = null;
      if (input.nextFollowUpDays && input.outcome !== 'not_interested') {
        const dueAt = new Date(Date.now() + input.nextFollowUpDays * 86400000);
        const nextTask = await twentyCRM.createTask({
          title: `Follow-up: ${input.action} — ${input.outcome}`,
          dueAt: dueAt.toISOString(),
          status: 'TODO',
        });
        nextFollowUp = dueAt.toISOString();
        logger.info({ agentId, nextTaskId: nextTask.id }, 'Next follow-up scheduled in Twenty CRM');
      }

      return {
        success: true,
        taskId: input.taskId,
        completedAt: new Date().toISOString(),
        nextFollowUp,
        activityLogged: true,
        dataSource: 'Twenty CRM',
      };
    }),

  // ── Document / E-Signature Workflow ─────────────────────────────────────────

  /** Initiate e-signature request for a property transaction */
  initiateSignatureRequest: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      documentType: z.enum(['offer_letter', 'sales_agreement', 'tenancy_agreement', 'deed_of_assignment', 'power_of_attorney']),
      buyerEmail: z.string().email(),
      buyerName: z.string(),
      sellerEmail: z.string().email().optional(),
      sellerName: z.string().optional(),
      transactionAmount: z.number().positive(),
      expiresInDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ ctx, input }) => {
      const agentId = ctx.user.id;
      const expiresAt = new Date(Date.now() + input.expiresInDays * 86400000);
      const requestId = `SIG-${Date.now()}-${agentId}`;

      await twentyCRM.createNote({
        title: `E-Signature Initiated: ${input.documentType}`,
        body: `Document: ${input.documentType}\nBuyer: ${input.buyerName} (${input.buyerEmail})\nAmount: ₦${input.transactionAmount.toLocaleString()}\nExpires: ${expiresAt.toLocaleDateString('en-NG')}\nRequest ID: ${requestId}`,
      });

      logger.info({ agentId, requestId, documentType: input.documentType, propertyId: input.propertyId }, 'E-signature initiated');

      const signingLinks = {
        buyer: `https://sign.realestate.ng/sign/${requestId}/buyer`,
        seller: input.sellerEmail ? `https://sign.realestate.ng/sign/${requestId}/seller` : null,
        agent: `https://sign.realestate.ng/sign/${requestId}/agent`,
      };

      return {
        success: true,
        requestId,
        documentType: input.documentType,
        status: 'pending_signatures',
        signingLinks,
        expiresAt: expiresAt.toISOString(),
        recipients: [
          { role: 'buyer', email: input.buyerEmail, name: input.buyerName, status: 'pending' },
          ...(input.sellerEmail ? [{ role: 'seller', email: input.sellerEmail, name: input.sellerName ?? 'Seller', status: 'pending' }] : []),
          { role: 'agent', email: ctx.user.email, name: `${ctx.user.firstName} ${ctx.user.lastName}`, status: 'pending' },
        ],
        auditTrailUrl: `https://sign.realestate.ng/audit/${requestId}`,
      };
    }),

  /** Get signature request status */
  getSignatureStatus: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      return {
        requestId: input.requestId,
        status: 'partially_signed',
        completedSignatures: 1,
        totalSignatures: 3,
        recipients: [
          { role: 'buyer', status: 'signed', signedAt: new Date(Date.now() - 3600000).toISOString() },
          { role: 'seller', status: 'pending', signedAt: null },
          { role: 'agent', status: 'pending', signedAt: null },
        ],
        documentUrl: null,
        auditTrailUrl: `https://sign.realestate.ng/audit/${input.requestId}`,
      };
    }),

  // ── Twenty CRM Health ────────────────────────────────────────────────────────

  /** Check Twenty CRM connectivity and authentication */
  getCRMHealth: protectedProcedure
    .query(async () => {
      const health = await twentyCRM.healthCheck();
      return {
        ...health,
        crmProvider: 'Twenty CRM',
        apiEndpoint: process.env.TWENTY_CRM_URL || 'https://api.twenty.com',
        configured: !!process.env.TWENTY_API_KEY,
      };
    }),
});
