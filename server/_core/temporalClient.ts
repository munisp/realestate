import { Client, Connection } from '@temporalio/client';
import { logger } from "./logger";

let temporalClient: Client | null = null;

/**
 * Get or create Temporal client instance
 * Connects to Temporal server for workflow orchestration
 */
export async function getTemporalClient(): Promise<Client> {
  if (temporalClient) {
    return temporalClient;
  }

  try {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_HOST_PORT || 'localhost:7233',
    });

    temporalClient = new Client({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    });

    logger.info('[Temporal] Connected to Temporal server');
    return temporalClient;
  } catch (error) {
    logger.error('[Temporal] Failed to connect:', { error: String(error) });
    throw error;
  }
}

/**
 * Start a workflow execution
 */
export async function startWorkflow(
  workflowType: string,
  workflowId: string,
  args: any[],
  taskQueue: string = 'realestate-workflows'
): Promise<string> {
  const client = await getTemporalClient();

  const handle = await client.workflow.start(workflowType, {
    taskQueue,
    workflowId,
    args,
  });

  logger.info(`[Temporal] Started workflow: ${workflowType} (${handle.workflowId})`);
  return handle.workflowId;
}

/**
 * Signal a running workflow
 */
export async function signalWorkflow(
  workflowId: string,
  signalName: string,
  args: any[]
): Promise<void> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  
  await handle.signal(signalName, ...args);
  logger.info(`[Temporal] Sent signal ${signalName} to workflow ${workflowId}`);
}

/**
 * Query a running workflow
 */
export async function queryWorkflow(
  workflowId: string,
  queryType: string,
  args: any[] = []
): Promise<any> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  
  const result = await handle.query(queryType, ...args);
  return result;
}

/**
 * Get workflow execution result
 */
export async function getWorkflowResult(workflowId: string): Promise<any> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  
  const result = await handle.result();
  return result;
}

/**
 * Cancel a workflow
 */
export async function cancelWorkflow(workflowId: string): Promise<void> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  
  await handle.cancel();
  logger.info(`[Temporal] Cancelled workflow ${workflowId}`);
}

/**
 * Workflow type definitions for type safety
 */
export const WorkflowTypes = {
  // Core Platform
  PROPERTY_SEARCH: 'PropertySearchWorkflow',
  PROPERTY_VALUATION: 'PropertyValuationWorkflow',
  TOUR_SCHEDULING: 'TourSchedulingWorkflow',
  TRANSACTION: 'TransactionWorkflow',
  DOCUMENT_VERIFICATION: 'DocumentVerificationWorkflow',
  MORTGAGE_PRE_APPROVAL: 'MortgagePreApprovalWorkflow',
  PROPERTY_COMPARISON: 'PropertyComparisonWorkflow',
  AGENT_MATCHING: 'AgentMatchingWorkflow',
  NEIGHBORHOOD_ANALYSIS: 'NeighborhoodAnalysisWorkflow',
  INVESTMENT_ANALYSIS: 'InvestmentAnalysisWorkflow',

  // Shortlet Platform
  SHORTLET_SEARCH: 'ShortletSearchWorkflow',
  SHORTLET_BOOKING: 'ShortletBookingWorkflow',
  HOST_ONBOARDING: 'HostOnboardingWorkflow',
  GUEST_CHECKIN: 'GuestCheckinWorkflow',
  CLEANING_SCHEDULING: 'CleaningSchedulingWorkflow',
  DYNAMIC_PRICING: 'DynamicPricingWorkflow',
  REVIEW: 'ReviewWorkflow',
  DISPUTE_RESOLUTION: 'DisputeResolutionWorkflow',
  HOST_PAYOUT: 'HostPayoutWorkflow',
  PROPERTY_MANAGEMENT: 'PropertyManagementWorkflow',

  // Builder Platform
  BUILDER_DISCOVERY: 'BuilderDiscoveryWorkflow',
  QUOTE_REQUEST: 'QuoteRequestWorkflow',
  PROJECT_CREATION: 'ProjectCreationWorkflow',
  MILESTONE_PAYMENT: 'MilestonePaymentWorkflow',
  INSPECTION: 'InspectionWorkflow',
  ESCROW_RELEASE: 'EscrowReleaseWorkflow',
  PROJECT_TRACKING: 'ProjectTrackingWorkflow',
  BUILDER_ONBOARDING: 'BuilderOnboardingWorkflow',
  PHOTO_UPDATE: 'PhotoUpdateWorkflow',
  BUILDER_ANALYTICS: 'BuilderAnalyticsWorkflow',
} as const;

export type WorkflowType = typeof WorkflowTypes[keyof typeof WorkflowTypes];
