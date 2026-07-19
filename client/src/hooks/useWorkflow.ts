import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export interface WorkflowStatus {
  workflowId: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'unknown';
  result?: any;
  error?: string;
}

/**
 * Hook for managing Temporal workflow execution from the frontend
 * Provides a simple interface to start workflows and track their status
 */
export function useWorkflow() {
  const [activeWorkflows, setActiveWorkflows] = useState<Map<string, WorkflowStatus>>(new Map());

  // Shortlet booking workflow
  const startShortletBooking = trpc.workflows.startShortletBooking.useMutation({
    onSuccess: (data) => {
      setActiveWorkflows(prev => new Map(prev).set(data.workflowId, {
        workflowId: data.workflowId,
        status: 'started',
      }));
      toast.success('Booking workflow started');
    },
    onError: (error) => {
      toast.error(`Failed to start booking: ${error.message}`);
    },
  });

  const confirmBookingPayment = trpc.workflows.confirmBookingPayment.useMutation({
    onSuccess: () => {
      toast.success('Payment confirmed');
    },
    onError: (error) => {
      toast.error(`Failed to confirm payment: ${error.message}`);
    },
  });

  // Milestone payment workflow
  const startMilestonePayment = trpc.workflows.startMilestonePayment.useMutation({
    onSuccess: (data) => {
      setActiveWorkflows(prev => new Map(prev).set(data.workflowId, {
        workflowId: data.workflowId,
        status: 'started',
      }));
      toast.success('Milestone payment workflow started');
    },
    onError: (error) => {
      toast.error(`Failed to start payment: ${error.message}`);
    },
  });

  const completeMilestone = trpc.workflows.completeMilestone.useMutation({
    onSuccess: () => {
      toast.success('Milestone marked as complete');
    },
    onError: (error) => {
      toast.error(`Failed to complete milestone: ${error.message}`);
    },
  });

  const approveMilestone = trpc.workflows.approveMilestone.useMutation({
    onSuccess: () => {
      toast.success('Milestone approved');
    },
    onError: (error) => {
      toast.error(`Failed to approve milestone: ${error.message}`);
    },
  });

  // Property valuation workflow
  const startPropertyValuation = trpc.workflows.startPropertyValuation.useMutation({
    onSuccess: (data) => {
      setActiveWorkflows(prev => new Map(prev).set(data.workflowId, {
        workflowId: data.workflowId,
        status: 'started',
      }));
      toast.success('Valuation workflow started');
    },
    onError: (error) => {
      toast.error(`Failed to start valuation: ${error.message}`);
    },
  });

  // Tour scheduling workflow
  const startTourScheduling = trpc.workflows.startTourScheduling.useMutation({
    onSuccess: (data) => {
      setActiveWorkflows(prev => new Map(prev).set(data.workflowId, {
        workflowId: data.workflowId,
        status: 'started',
      }));
      toast.success('Tour scheduling workflow started');
    },
    onError: (error) => {
      toast.error(`Failed to schedule tour: ${error.message}`);
    },
  });

  // Builder quote request workflow
  const startQuoteRequest = trpc.workflows.startQuoteRequest.useMutation({
    onSuccess: (data) => {
      setActiveWorkflows(prev => new Map(prev).set(data.workflowId, {
        workflowId: data.workflowId,
        status: 'started',
      }));
      toast.success('Quote request sent');
    },
    onError: (error) => {
      toast.error(`Failed to request quote: ${error.message}`);
    },
  });

  // Document verification workflow
  const startDocumentVerification = trpc.workflows.startDocumentVerification.useMutation({
    onSuccess: (data) => {
      setActiveWorkflows(prev => new Map(prev).set(data.workflowId, {
        workflowId: data.workflowId,
        status: 'started',
      }));
      toast.success('Document verification started');
    },
    onError: (error) => {
      toast.error(`Failed to verify document: ${error.message}`);
    },
  });

  // Host payout workflow
  const startHostPayout = trpc.workflows.startHostPayout.useMutation({
    onSuccess: (data) => {
      setActiveWorkflows(prev => new Map(prev).set(data.workflowId, {
        workflowId: data.workflowId,
        status: 'started',
      }));
      toast.success('Payout workflow started');
    },
    onError: (error) => {
      toast.error(`Failed to start payout: ${error.message}`);
    },
  });

  // Dynamic pricing workflow
  const startDynamicPricing = trpc.workflows.startDynamicPricing.useMutation({
    onSuccess: (data) => {
      setActiveWorkflows(prev => new Map(prev).set(data.workflowId, {
        workflowId: data.workflowId,
        status: 'started',
      }));
      toast.success('Dynamic pricing workflow started');
    },
    onError: (error) => {
      toast.error(`Failed to start pricing: ${error.message}`);
    },
  });

  // Builder onboarding workflow
  const startBuilderOnboarding = trpc.workflows.startBuilderOnboarding.useMutation({
    onSuccess: (data) => {
      setActiveWorkflows(prev => new Map(prev).set(data.workflowId, {
        workflowId: data.workflowId,
        status: 'started',
      }));
      toast.success('Builder onboarding started');
    },
    onError: (error) => {
      toast.error(`Failed to start onboarding: ${error.message}`);
    },
  });

  // Inspection workflow
  const startInspection = trpc.workflows.startInspection.useMutation({
    onSuccess: (data) => {
      setActiveWorkflows(prev => new Map(prev).set(data.workflowId, {
        workflowId: data.workflowId,
        status: 'started',
      }));
      toast.success('Inspection workflow started');
    },
    onError: (error) => {
      toast.error(`Failed to start inspection: ${error.message}`);
    },
  });

  // Get workflow status
  const getWorkflowStatus = useCallback(async (workflowId: string) => {
    try {
      const status = await trpc.workflows.getWorkflowStatus.query({ workflowId });
      setActiveWorkflows(prev => new Map(prev).set(workflowId, status));
      return status;
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      return null;
    }
  }, []);

  // Get workflow result
  const getWorkflowResult = useCallback(async (workflowId: string) => {
    try {
      const result = await trpc.workflows.getWorkflowResult.query({ workflowId });
      setActiveWorkflows(prev => {
        const updated = new Map(prev);
        const current = updated.get(workflowId);
        if (current) {
          updated.set(workflowId, {
            ...current,
            status: 'completed',
            result: result.result,
          });
        }
        return updated;
      });
      return result;
    } catch (error) {
      console.error('Failed to get workflow result:', error);
      return null;
    }
  }, []);

  return {
    // Workflow mutations
    startShortletBooking: startShortletBooking.mutate,
    confirmBookingPayment: confirmBookingPayment.mutate,
    startMilestonePayment: startMilestonePayment.mutate,
    completeMilestone: completeMilestone.mutate,
    approveMilestone: approveMilestone.mutate,
    startPropertyValuation: startPropertyValuation.mutate,
    startTourScheduling: startTourScheduling.mutate,
    startQuoteRequest: startQuoteRequest.mutate,
    startDocumentVerification: startDocumentVerification.mutate,
    startHostPayout: startHostPayout.mutate,
    startDynamicPricing: startDynamicPricing.mutate,
    startBuilderOnboarding: startBuilderOnboarding.mutate,
    startInspection: startInspection.mutate,

    // Workflow status tracking
    getWorkflowStatus,
    getWorkflowResult,
    activeWorkflows,

    // Loading states
    isStartingBooking: startShortletBooking.isPending,
    isStartingPayment: startMilestonePayment.isPending,
    isStartingValuation: startPropertyValuation.isPending,
    isStartingTour: startTourScheduling.isPending,
    isStartingQuote: startQuoteRequest.isPending,
  };
}

/**
 * Hook for polling workflow status until completion
 */
export function useWorkflowPolling(workflowId: string | null, interval: number = 5000) {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const { getWorkflowStatus } = useWorkflow();

  const poll = useCallback(async () => {
    if (!workflowId) return;
    const result = await getWorkflowStatus(workflowId);
    if (result) {
      setStatus(result);
      if (result.status === 'completed' || result.status === 'failed') {
        return; // Stop polling
      }
    }
  }, [workflowId, getWorkflowStatus]);

  // Poll on mount and at intervals
  useState(() => {
    if (!workflowId) return;
    poll();
    const intervalId = setInterval(poll, interval);
    return () => clearInterval(intervalId);
  });

  return status;
}
