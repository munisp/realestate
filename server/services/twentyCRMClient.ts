/**
 * Twenty CRM Client Service
 * =========================
 * Production integration with Twenty CRM (https://twenty.com) via GraphQL API.
 * Handles all lead/contact/opportunity/task/note operations for the real estate CRM.
 *
 * Configuration (environment variables):
 *   TWENTY_CRM_URL     — Base URL of Twenty instance (e.g. https://crm.yourdomain.com)
 *   TWENTY_API_KEY     — API key from Twenty Settings > API & Webhooks
 *
 * Twenty Object Mapping:
 *   Real Estate Lead  → Twenty Person + Opportunity (linked)
 *   Agent             → Twenty Workspace Member
 *   Property          → Twenty Custom Object (RealEstateProperty)
 *   Commission        → Twenty Custom Object (Commission)
 *   Showing           → Twenty Task (type: showing)
 */

import { logger } from '../_core/logger';

// ── Config ────────────────────────────────────────────────────────────────────
const TWENTY_URL = (process.env.TWENTY_CRM_URL || 'https://api.twenty.com').replace(/\/$/, '');
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const GRAPHQL_ENDPOINT = `${TWENTY_URL}/api/graphql`;
const REST_BASE = `${TWENTY_URL}/api/rest`;

// ── Stage mapping: internal → Twenty ─────────────────────────────────────────
const STAGE_TO_TWENTY: Record<string, string> = {
  new:                'NEW',
  contacted:          'SCREENING',
  qualified:          'SCREENING',
  showing_scheduled:  'MEETING',
  offer_made:         'PROPOSAL',
  under_contract:     'PROPOSAL',
  closed:             'CUSTOMER',
  lost:               'CHURNED',
};

const TWENTY_TO_STAGE: Record<string, string> = {
  NEW:       'new',
  SCREENING: 'contacted',
  MEETING:   'showing_scheduled',
  PROPOSAL:  'offer_made',
  CUSTOMER:  'closed',
  CHURNED:   'lost',
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TwentyPerson {
  id: string;
  name: { firstName: string; lastName: string };
  emails?: { primaryEmail: string };
  phones?: { primaryPhoneNumber: string };
  city?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TwentyOpportunity {
  id: string;
  name: string;
  amount?: { amountMicros: number; currencyCode: string };
  closeDate?: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
  pointOfContactId?: string;
  pointOfContact?: TwentyPerson | null;
}

export interface TwentyTask {
  id: string;
  title: string;
  status: string;
  dueAt?: string;
  createdAt: string;
  assigneeId?: string;
}

export interface TwentyNote {
  id: string;
  title?: string;
  body?: string;
  createdAt: string;
}

export interface CRMLead {
  id: string;
  twentyPersonId?: string;
  twentyOpportunityId?: string;
  agentId: number;
  stage: string;
  score: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  budget?: number;
  preferredCity?: string;
  propertyType?: string;
  source?: string;
  nextFollowUp?: string;
  lastContactedAt?: string;
  notes?: string;
  createdAt: string;
  tags: string[];
}

// ── Core GraphQL executor ─────────────────────────────────────────────────────
async function gql<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  if (!TWENTY_API_KEY) {
    logger.warn('TWENTY_API_KEY is not configured — Twenty CRM calls will return empty results');
    return { data: null, errors: [{ message: 'TWENTY_API_KEY not configured' }] } as any;
  }
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TWENTY_API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twenty CRM GraphQL error ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Twenty CRM GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

// ── Core REST executor ────────────────────────────────────────────────────────
async function rest<T = any>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, any>
): Promise<T> {
  if (!TWENTY_API_KEY) {
    logger.warn('TWENTY_API_KEY is not configured — Twenty CRM REST call skipped');
    return {} as any;
  }
  const res = await fetch(`${REST_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TWENTY_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twenty CRM REST error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Lead score computation ────────────────────────────────────────────────────
function computeLeadScore(stage: string, budget?: number): number {
  const stageScores: Record<string, number> = {
    new: 10, contacted: 20, qualified: 40, showing_scheduled: 55,
    offer_made: 70, under_contract: 85, closed: 100, lost: 0,
  };
  let score = stageScores[stage] ?? 10;
  if (budget) {
    if (budget >= 100_000_000) score += 15;
    else if (budget >= 30_000_000) score += 10;
    else if (budget >= 10_000_000) score += 5;
  }
  return Math.min(score, 100);
}

// ── Person (Contact) operations ───────────────────────────────────────────────
export async function createPerson(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  jobTitle?: string;
}): Promise<TwentyPerson> {
  const result = await gql<{ createPerson: TwentyPerson }>(`
    mutation CreatePerson($input: PersonCreateInput!) {
      createPerson(data: $input) {
        id
        name { firstName lastName }
        emails { primaryEmail }
        phones { primaryPhoneNumber }
        city
        jobTitle
        createdAt
        updatedAt
      }
    }
  `, {
    input: {
      name: { firstName: data.firstName, lastName: data.lastName },
      emails: { primaryEmail: data.email },
      phones: data.phone ? { primaryPhoneNumber: data.phone } : undefined,
      city: data.city,
      jobTitle: data.jobTitle || 'Property Buyer',
    },
  });
  return result.createPerson;
}

export async function updatePerson(id: string, data: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  jobTitle: string;
}>): Promise<TwentyPerson> {
  const input: Record<string, any> = {};
  if (data.firstName || data.lastName) {
    input.name = { firstName: data.firstName, lastName: data.lastName };
  }
  if (data.email) input.emails = { primaryEmail: data.email };
  if (data.phone) input.phones = { primaryPhoneNumber: data.phone };
  if (data.city) input.city = data.city;
  if (data.jobTitle) input.jobTitle = data.jobTitle;

  const result = await gql<{ updatePerson: TwentyPerson }>(`
    mutation UpdatePerson($id: ID!, $input: PersonUpdateInput!) {
      updatePerson(id: $id, data: $input) {
        id
        name { firstName lastName }
        emails { primaryEmail }
        phones { primaryPhoneNumber }
        city
        updatedAt
      }
    }
  `, { id, input });
  return result.updatePerson;
}

export async function findPersonByEmail(email: string): Promise<TwentyPerson | null> {
  const result = await gql<{ people: { edges: { node: TwentyPerson }[] } }>(`
    query FindPersonByEmail($email: String!) {
      people(filter: { emails: { primaryEmail: { eq: $email } } }) {
        edges {
          node {
            id
            name { firstName lastName }
            emails { primaryEmail }
            phones { primaryPhoneNumber }
            city
            jobTitle
            createdAt
            updatedAt
          }
        }
      }
    }
  `, { email });
  return result.people.edges[0]?.node ?? null;
}

// ── Opportunity (Deal) operations ─────────────────────────────────────────────
export async function createOpportunity(data: {
  name: string;
  stage: string;
  budgetNaira?: number;
  closeDate?: string;
  personId?: string;
}): Promise<TwentyOpportunity> {
  const twentyStage = STAGE_TO_TWENTY[data.stage] || 'NEW';
  const result = await gql<{ createOpportunity: TwentyOpportunity }>(`
    mutation CreateOpportunity($input: OpportunityCreateInput!) {
      createOpportunity(data: $input) {
        id
        name
        amount { amountMicros currencyCode }
        stage
        closeDate
        createdAt
        updatedAt
        pointOfContactId
      }
    }
  `, {
    input: {
      name: data.name,
      stage: twentyStage,
      amount: data.budgetNaira ? {
        amountMicros: data.budgetNaira * 1_000_000,
        currencyCode: 'NGN',
      } : undefined,
      closeDate: data.closeDate,
      pointOfContactId: data.personId,
    },
  });
  return result.createOpportunity;
}

export async function updateOpportunityStage(
  id: string,
  stage: string
): Promise<TwentyOpportunity> {
  const twentyStage = STAGE_TO_TWENTY[stage] || 'NEW';
  const result = await gql<{ updateOpportunity: TwentyOpportunity }>(`
    mutation UpdateOpportunityStage($id: ID!, $stage: OpportunityStageEnum!) {
      updateOpportunity(id: $id, data: { stage: $stage }) {
        id
        name
        stage
        updatedAt
      }
    }
  `, { id, stage: twentyStage });
  return result.updateOpportunity;
}

export async function getOpportunitiesByStage(
  stage?: string,
  limit = 50,
  offset = 0
): Promise<{ opportunities: TwentyOpportunity[]; totalCount: number }> {
  const twentyStage = stage ? STAGE_TO_TWENTY[stage] : undefined;
  const filterClause = twentyStage
    ? `filter: { stage: { eq: ${twentyStage} } }`
    : '';

  const result = await gql<{
    opportunities: {
      edges: { node: TwentyOpportunity }[];
      totalCount: number;
      pageInfo: { hasNextPage: boolean };
    };
  }>(`
    query GetOpportunities {
      opportunities(${filterClause} orderBy: { createdAt: DescNullsLast }) {
        edges {
          node {
            id
            name
            amount { amountMicros currencyCode }
            stage
            closeDate
            createdAt
            updatedAt
            pointOfContactId
            pointOfContact {
              id
              name { firstName lastName }
              emails { primaryEmail }
              phones { primaryPhoneNumber }
              city
              jobTitle
            }
          }
        }
        totalCount
        pageInfo { hasNextPage }
      }
    }
  `);

  const allOpps = result.opportunities.edges.map(e => e.node);
  const paginated = allOpps.slice(offset, offset + limit);
  return { opportunities: paginated, totalCount: result.opportunities.totalCount };
}

// ── Task operations (Showings, Follow-ups) ────────────────────────────────────
export async function createTask(data: {
  title: string;
  dueAt?: string;
  assigneeId?: string;
  personId?: string;
  opportunityId?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
}): Promise<TwentyTask> {
  const result = await gql<{ createTask: TwentyTask }>(`
    mutation CreateTask($input: TaskCreateInput!) {
      createTask(data: $input) {
        id
        title
        status
        dueAt
        createdAt
        assigneeId
      }
    }
  `, {
    input: {
      title: data.title,
      dueAt: data.dueAt,
      assigneeId: data.assigneeId,
      status: data.status || 'TODO',
    },
  });
  return result.createTask;
}

export async function getTasksDueToday(): Promise<TwentyTask[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const result = await gql<{ tasks: { edges: { node: TwentyTask }[] } }>(`
    query GetTasksDueToday($start: DateTime!, $end: DateTime!) {
      tasks(
        filter: {
          dueAt: { gte: $start, lte: $end }
          status: { neq: DONE }
        }
        orderBy: { dueAt: AscNullsLast }
      ) {
        edges {
          node {
            id
            title
            status
            dueAt
            createdAt
            assigneeId
          }
        }
      }
    }
  `, {
    start: todayStart.toISOString(),
    end: todayEnd.toISOString(),
  });
  return result.tasks.edges.map(e => e.node);
}

export async function completeTask(id: string): Promise<TwentyTask> {
  const result = await gql<{ updateTask: TwentyTask }>(`
    mutation CompleteTask($id: ID!) {
      updateTask(id: $id, data: { status: DONE }) {
        id
        title
        status
        updatedAt
      }
    }
  `, { id });
  return result.updateTask;
}

// ── Note operations ───────────────────────────────────────────────────────────
export async function createNote(data: {
  title?: string;
  body: string;
  personId?: string;
  opportunityId?: string;
}): Promise<TwentyNote> {
  const result = await gql<{ createNote: TwentyNote }>(`
    mutation CreateNote($input: NoteCreateInput!) {
      createNote(data: $input) {
        id
        title
        body
        createdAt
      }
    }
  `, {
    input: {
      title: data.title || 'Agent Note',
      body: data.body,
    },
  });
  return result.createNote;
}

// ── High-level CRM helpers ────────────────────────────────────────────────────

/**
 * Upsert a lead: find or create a Person in Twenty, then create/update their Opportunity.
 * Returns a unified CRMLead object.
 */
export async function upsertLead(data: {
  agentId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  budget?: number;
  preferredCity?: string;
  propertyType?: string;
  source?: string;
  stage?: string;
  notes?: string;
  twentyPersonId?: string;
  twentyOpportunityId?: string;
}): Promise<CRMLead> {
  const stage = data.stage || 'new';

  // 1. Find or create Person
  let person: TwentyPerson;
  if (data.twentyPersonId) {
    person = await updatePerson(data.twentyPersonId, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      city: data.preferredCity,
    });
  } else {
    const existing = await findPersonByEmail(data.email);
    if (existing) {
      person = existing;
    } else {
      person = await createPerson({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        city: data.preferredCity,
        jobTitle: `${data.propertyType || 'Property'} Buyer`,
      });
    }
  }

  // 2. Create or update Opportunity
  let opportunity: TwentyOpportunity;
  if (data.twentyOpportunityId) {
    opportunity = await updateOpportunityStage(data.twentyOpportunityId, stage);
  } else {
    const oppName = `${data.firstName} ${data.lastName} — ${data.propertyType || 'Property'} in ${data.preferredCity || 'Nigeria'}`;
    opportunity = await createOpportunity({
      name: oppName,
      stage,
      budgetNaira: data.budget,
      personId: person.id,
    });
  }

  // 3. Add note if provided
  if (data.notes) {
    await createNote({
      title: 'Agent Note',
      body: data.notes,
      personId: person.id,
      opportunityId: opportunity.id,
    });
  }

  // 4. Build unified lead object
  const budgetNaira = opportunity.amount
    ? Math.round(opportunity.amount.amountMicros / 1_000_000)
    : data.budget;

  return {
    id: opportunity.id,
    twentyPersonId: person.id,
    twentyOpportunityId: opportunity.id,
    agentId: data.agentId,
    stage,
    score: computeLeadScore(stage, budgetNaira),
    firstName: person.name.firstName,
    lastName: person.name.lastName,
    email: person.emails?.primaryEmail || data.email,
    phone: person.phones?.primaryPhoneNumber || data.phone || '',
    budget: budgetNaira,
    preferredCity: person.city || data.preferredCity,
    propertyType: data.propertyType,
    source: data.source,
    nextFollowUp: new Date(Date.now() + 2 * 86400000).toISOString(),
    lastContactedAt: new Date().toISOString(),
    notes: data.notes,
    createdAt: opportunity.createdAt,
    tags: budgetNaira && budgetNaira >= 100_000_000
      ? ['hot', 'high-value']
      : stage === 'new' ? ['cold'] : ['warm'],
  };
}

/**
 * Fetch all leads for an agent from Twenty CRM, mapped to CRMLead format.
 */
export async function getLeads(options: {
  agentId: number;
  stage?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'score' | 'budget' | 'createdAt';
}): Promise<{ leads: CRMLead[]; total: number; summary: Record<string, number> }> {
  if (!TWENTY_API_KEY) {
    logger.warn('TWENTY_API_KEY not set — getLeads returning empty result');
    return { leads: [], total: 0, summary: {} };
  }
  const { opportunities, totalCount } = await getOpportunitiesByStage(
    options.stage,
    options.limit || 20,
    options.offset || 0
  );

  let leads: CRMLead[] = opportunities.map(opp => {
    const person = opp.pointOfContact;
    const budgetNaira = opp.amount
      ? Math.round(opp.amount.amountMicros / 1_000_000)
      : undefined;
    const internalStage = TWENTY_TO_STAGE[opp.stage] || 'new';

    return {
      id: opp.id,
      twentyPersonId: person?.id,
      twentyOpportunityId: opp.id,
      agentId: options.agentId,
      stage: internalStage,
      score: computeLeadScore(internalStage, budgetNaira),
      firstName: person?.name.firstName || 'Unknown',
      lastName: person?.name.lastName || '',
      email: person?.emails?.primaryEmail || '',
      phone: person?.phones?.primaryPhoneNumber || '',
      budget: budgetNaira,
      preferredCity: person?.city,
      propertyType: person?.jobTitle?.replace(' Buyer', ''),
      source: 'twenty_crm',
      nextFollowUp: new Date(Date.now() + 2 * 86400000).toISOString(),
      lastContactedAt: opp.updatedAt,
      createdAt: opp.createdAt,
      tags: budgetNaira && budgetNaira >= 100_000_000
        ? ['hot', 'high-value']
        : internalStage === 'new' ? ['cold'] : ['warm'],
    };
  });

  // Apply search filter client-side
  if (options.search) {
    const q = options.search.toLowerCase();
    leads = leads.filter(l =>
      `${l.firstName} ${l.lastName} ${l.email}`.toLowerCase().includes(q)
    );
  }

  // Sort
  if (options.sortBy === 'score') leads.sort((a, b) => b.score - a.score);
  else if (options.sortBy === 'budget') leads.sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0));

  // Pipeline summary across all stages
  const allOpps = await getOpportunitiesByStage(undefined, 200, 0);
  const summary: Record<string, number> = {};
  for (const opp of allOpps.opportunities) {
    const s = TWENTY_TO_STAGE[opp.stage] || 'new';
    summary[s] = (summary[s] || 0) + 1;
  }

  return { leads, total: totalCount, summary };
}

/**
 * Advance a lead's stage in Twenty CRM.
 */
export async function advanceLeadStage(
  opportunityId: string,
  newStage: string
): Promise<{ id: string; stage: string; score: number }> {
  const opp = await updateOpportunityStage(opportunityId, newStage);
  return {
    id: opp.id,
    stage: newStage,
    score: computeLeadScore(newStage),
  };
}

/**
 * Get today's follow-up tasks from Twenty CRM.
 */
export async function getTodayFollowUps(): Promise<TwentyTask[]> {
  if (!TWENTY_API_KEY) {
    logger.warn('TWENTY_API_KEY not set — getTodayFollowUps returning empty result');
    return [];
  }
  return getTasksDueToday();
}

/**
 * Mark a follow-up task as complete in Twenty CRM.
 */
export async function completeFollowUp(taskId: string): Promise<TwentyTask> {
  return completeTask(taskId);
}

/**
 * Schedule a showing by creating a task in Twenty CRM.
 */
export async function scheduleShowing(data: {
  propertyId: number;
  propertyTitle: string;
  clientName: string;
  scheduledAt: string;
  agentId: number;
  notes?: string;
}): Promise<{ showingId: string; taskId: string; scheduledAt: string }> {
  const task = await createTask({
    title: `Showing: ${data.propertyTitle} with ${data.clientName}`,
    dueAt: data.scheduledAt,
    status: 'TODO',
  });

  if (data.notes) {
    await createNote({
      title: `Showing Notes — ${data.propertyTitle}`,
      body: data.notes,
    });
  }

  return {
    showingId: `showing_${task.id}`,
    taskId: task.id,
    scheduledAt: data.scheduledAt,
  };
}

/**
 * Health check — verifies Twenty CRM API is reachable and authenticated.
 */
export async function healthCheck(): Promise<{ ok: boolean; workspace?: string; error?: string }> {
  try {
    const result = await gql<{ currentWorkspace: { id: string; displayName: string } }>(`
      query { currentWorkspace { id displayName } }
    `);
    return { ok: true, workspace: result.currentWorkspace?.displayName };
  } catch (err: any) {
    logger.warn({ err }, 'Twenty CRM health check failed');
    return { ok: false, error: err.message };
  }
}
