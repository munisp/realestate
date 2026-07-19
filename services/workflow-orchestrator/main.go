package main

import (
	"log"
	"os"

	"github.com/realestate/workflow-orchestrator/config"
	"github.com/realestate/workflow-orchestrator/workflows"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Create Temporal client
	c, err := client.Dial(client.Options{
		HostPort:  cfg.TemporalHostPort,
		Namespace: cfg.TemporalNamespace,
	})
	if err != nil {
		log.Fatalln("Unable to create Temporal client", err)
	}
	defer c.Close()

	// Create worker for all task queues
	w := worker.New(c, cfg.TaskQueue, worker.Options{})

	// Register Core Platform Workflows
	w.RegisterWorkflow(workflows.PropertySearchWorkflow)
	w.RegisterWorkflow(workflows.PropertyValuationWorkflow)
	w.RegisterWorkflow(workflows.TourSchedulingWorkflow)
	w.RegisterWorkflow(workflows.TransactionWorkflow)
	w.RegisterWorkflow(workflows.DocumentVerificationWorkflow)
	w.RegisterWorkflow(workflows.MortgagePreApprovalWorkflow)
	w.RegisterWorkflow(workflows.PropertyComparisonWorkflow)
	w.RegisterWorkflow(workflows.AgentMatchingWorkflow)
	w.RegisterWorkflow(workflows.NeighborhoodAnalysisWorkflow)
	w.RegisterWorkflow(workflows.InvestmentAnalysisWorkflow)

	// Register Shortlet Platform Workflows
	w.RegisterWorkflow(workflows.ShortletSearchWorkflow)
	w.RegisterWorkflow(workflows.ShortletBookingWorkflow)
	w.RegisterWorkflow(workflows.HostOnboardingWorkflow)
	w.RegisterWorkflow(workflows.GuestCheckinWorkflow)
	w.RegisterWorkflow(workflows.CleaningSchedulingWorkflow)
	w.RegisterWorkflow(workflows.DynamicPricingWorkflow)
	w.RegisterWorkflow(workflows.ReviewWorkflow)
	w.RegisterWorkflow(workflows.DisputeResolutionWorkflow)
	w.RegisterWorkflow(workflows.HostPayoutWorkflow)
	w.RegisterWorkflow(workflows.PropertyManagementWorkflow)

	// Register Builder Platform Workflows
	w.RegisterWorkflow(workflows.BuilderDiscoveryWorkflow)
	w.RegisterWorkflow(workflows.QuoteRequestWorkflow)
	w.RegisterWorkflow(workflows.ProjectCreationWorkflow)
	w.RegisterWorkflow(workflows.MilestonePaymentWorkflow)
	w.RegisterWorkflow(workflows.InspectionWorkflow)
	w.RegisterWorkflow(workflows.EscrowReleaseWorkflow)
	w.RegisterWorkflow(workflows.ProjectTrackingWorkflow)
	w.RegisterWorkflow(workflows.BuilderOnboardingWorkflow)
	w.RegisterWorkflow(workflows.PhotoUpdateWorkflow)
	w.RegisterWorkflow(workflows.BuilderAnalyticsWorkflow)

	// Register Activities
	w.RegisterActivity(workflows.Activities)

	// Start worker
	log.Println("Starting Workflow Orchestrator Worker...")
	log.Printf("Task Queue: %s", cfg.TaskQueue)
	log.Printf("Temporal Server: %s", cfg.TemporalHostPort)

	err = w.Run(worker.InterruptCh())
	if err != nil {
		log.Fatalln("Unable to start worker", err)
	}
}
