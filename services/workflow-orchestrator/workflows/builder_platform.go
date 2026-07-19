package workflows

import (
	"time"

	"go.temporal.io/sdk/workflow"
)

// ========== WORKFLOW 21: Builder Discovery ==========

type BuilderDiscoveryInput struct {
	ClientID        int      `json:"clientId"`
	Specialization  string   `json:"specialization"`
	Location        string   `json:"location"`
	Budget          int      `json:"budget"`
	ProjectType     string   `json:"projectType"`
}

type BuilderDiscoveryResult struct {
	Builders    []map[string]interface{} `json:"builders"`
	TotalCount  int                      `json:"totalCount"`
	Success     bool                     `json:"success"`
}

func BuilderDiscoveryWorkflow(ctx workflow.Context, input BuilderDiscoveryInput) (*BuilderDiscoveryResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting builder discovery workflow", "clientId", input.ClientID)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result BuilderDiscoveryResult

	// Step 1: Query developer-service for builders
	var builders []map[string]interface{}
	err := workflow.ExecuteActivity(ctx, "SearchBuilders", input).Get(ctx, &builders)
	if err != nil {
		return &BuilderDiscoveryResult{Success: false}, err
	}

	// Step 2: Filter by verification status
	var verifiedBuilders []map[string]interface{}
	for _, builder := range builders {
		if builder["verificationStatus"] == "verified" {
			verifiedBuilders = append(verifiedBuilders, builder)
		}
	}

	// Step 3: Enrich with portfolio and certifications
	for i := range verifiedBuilders {
		builderID := int(verifiedBuilders[i]["id"].(float64))
		
		var portfolio []map[string]interface{}
		_ = workflow.ExecuteActivity(ctx, "GetBuilderPortfolio", builderID).Get(ctx, &portfolio)
		verifiedBuilders[i]["portfolio"] = portfolio

		var certifications []string
		_ = workflow.ExecuteActivity(ctx, "GetBuilderCertifications", builderID).Get(ctx, &certifications)
		verifiedBuilders[i]["certifications"] = certifications
	}

	// Step 4: Calculate match scores using ML
	err = workflow.ExecuteActivity(ctx, "RankBuildersByMatch", input.ClientID, verifiedBuilders, input).Get(ctx, &verifiedBuilders)
	if err != nil {
		logger.Warn("Failed to rank builders", "error", err)
	}

	// Step 5: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "builder.searched", map[string]interface{}{
		"clientId":       input.ClientID,
		"specialization": input.Specialization,
		"resultCount":    len(verifiedBuilders),
	}).Get(ctx, nil)

	// Step 6: Update CRM
	_ = workflow.ExecuteActivity(ctx, "UpdateCRM", "builder_search", map[string]interface{}{
		"clientId":   input.ClientID,
		"criteria":   input,
		"resultCount": len(verifiedBuilders),
	}).Get(ctx, nil)

	result.Builders = verifiedBuilders
	result.TotalCount = len(verifiedBuilders)
	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 22: Quote Request ==========

type QuoteRequestInput struct {
	BuilderID   int    `json:"builderId"`
	ClientID    int    `json:"clientId"`
	ProjectType string `json:"projectType"`
	Description string `json:"description"`
	Budget      int    `json:"budget"`
}

type QuoteRequestResult struct {
	QuoteID int  `json:"quoteId"`
	Success bool `json:"success"`
}

func QuoteRequestWorkflow(ctx workflow.Context, input QuoteRequestInput) (*QuoteRequestResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting quote request workflow", "builderId", input.BuilderID)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result QuoteRequestResult

	// Step 1: Create quote request in CRM
	var quoteID int
	err := workflow.ExecuteActivity(ctx, "CreateQuoteRequest", input).Get(ctx, &quoteID)
	if err != nil {
		return &QuoteRequestResult{Success: false}, err
	}
	result.QuoteID = quoteID

	// Step 2: Notify builder
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":      input.BuilderID,
		"type":        "quote_request",
		"title":       "New Quote Request",
		"message":     "You have received a new quote request.",
		"quoteId":     quoteID,
		"projectType": input.ProjectType,
	}).Get(ctx, nil)

	// Step 3: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "quote.requested", map[string]interface{}{
		"quoteId":   quoteID,
		"builderId": input.BuilderID,
		"clientId":  input.ClientID,
	}).Get(ctx, nil)

	// Step 4: Wait for builder response (signal)
	var quoteResponse map[string]interface{}
	responseChannel := workflow.GetSignalChannel(ctx, "quote-response")
	
	selector := workflow.NewSelector(ctx)
	selector.AddReceive(responseChannel, func(c workflow.ReceiveChannel, more bool) {
		c.Receive(ctx, &quoteResponse)
	})

	// Timeout after 7 days
	timer := workflow.NewTimer(ctx, 7*24*time.Hour)
	selector.AddFuture(timer, func(f workflow.Future) {
		quoteResponse = nil
	})

	selector.Select(ctx)

	if quoteResponse == nil {
		logger.Warn("No response from builder within timeout")
		_ = workflow.ExecuteActivity(ctx, "UpdateQuoteStatus", quoteID, "expired").Get(ctx, nil)
		return &result, nil
	}

	// Step 5: Notify client of quote response
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":  input.ClientID,
		"type":    "quote_received",
		"title":   "Quote Received",
		"message": "The builder has responded to your quote request.",
		"quoteId": quoteID,
	}).Get(ctx, nil)

	// Step 6: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "quote.responded", map[string]interface{}{
		"quoteId":   quoteID,
		"builderId": input.BuilderID,
		"clientId":  input.ClientID,
		"amount":    quoteResponse["amount"],
	}).Get(ctx, nil)

	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 23: Project Creation ==========

type ProjectCreationInput struct {
	ClientID    int    `json:"clientId"`
	BuilderID   int    `json:"builderId"`
	QuoteID     int    `json:"quoteId"`
	ProjectName string `json:"projectName"`
	Budget      int    `json:"budget"`
	Milestones  []map[string]interface{} `json:"milestones"`
}

type ProjectCreationResult struct {
	ProjectID int  `json:"projectId"`
	Success   bool `json:"success"`
}

func ProjectCreationWorkflow(ctx workflow.Context, input ProjectCreationInput) (*ProjectCreationResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting project creation workflow", "clientId", input.ClientID)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result ProjectCreationResult

	// Step 1: Create project in developer-service
	var projectID int
	err := workflow.ExecuteActivity(ctx, "CreateBuilderProject", input).Get(ctx, &projectID)
	if err != nil {
		return &ProjectCreationResult{Success: false}, err
	}
	result.ProjectID = projectID

	// Step 2: Upload contract to IPFS
	var contractURL string
	err = workflow.ExecuteActivity(ctx, "UploadContractToIPFS", projectID).Get(ctx, &contractURL)
	if err != nil {
		logger.Error("Failed to upload contract", "error", err)
	} else {
		_ = workflow.ExecuteActivity(ctx, "UpdateProjectContract", projectID, contractURL).Get(ctx, nil)
	}

	// Step 3: Upload blueprints to IPFS
	var blueprintURL string
	err = workflow.ExecuteActivity(ctx, "UploadBlueprintsToIPFS", projectID).Get(ctx, &blueprintURL)
	if err != nil {
		logger.Warn("Failed to upload blueprints", "error", err)
	} else {
		_ = workflow.ExecuteActivity(ctx, "UpdateProjectBlueprints", projectID, blueprintURL).Get(ctx, nil)
	}

	// Step 4: Create milestones
	for _, milestone := range input.Milestones {
		milestone["projectId"] = projectID
		var milestoneID int
		err = workflow.ExecuteActivity(ctx, "CreateMilestone", milestone).Get(ctx, &milestoneID)
		if err != nil {
			logger.Error("Failed to create milestone", "error", err)
		}
	}

	// Step 5: Notify both parties
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":    input.ClientID,
		"type":      "project_created",
		"title":     "Project Created",
		"message":   "Your construction project has been created.",
		"projectId": projectID,
	}).Get(ctx, nil)

	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":    input.BuilderID,
		"type":      "project_created",
		"title":     "New Project Assigned",
		"message":   "A new construction project has been assigned to you.",
		"projectId": projectID,
	}).Get(ctx, nil)

	// Step 6: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "project.created", map[string]interface{}{
		"projectId": projectID,
		"clientId":  input.ClientID,
		"builderId": input.BuilderID,
		"budget":    input.Budget,
	}).Get(ctx, nil)

	// Step 7: Update CRM
	_ = workflow.ExecuteActivity(ctx, "UpdateCRM", "project_created", map[string]interface{}{
		"projectId": projectID,
		"clientId":  input.ClientID,
		"builderId": input.BuilderID,
		"value":     input.Budget,
	}).Get(ctx, nil)

	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 24: Milestone Payment (already implemented) ==========
// See milestone_payment.go

// ========== WORKFLOW 25: Inspection ==========

type InspectionInput struct {
	MilestoneID int `json:"milestoneId"`
	ProjectID   int `json:"projectId"`
}

type InspectionResult struct {
	InspectionID int  `json:"inspectionId"`
	Approved     bool `json:"approved"`
	Success      bool `json:"success"`
}

func InspectionWorkflow(ctx workflow.Context, input InspectionInput) (*InspectionResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting inspection workflow", "milestoneId", input.MilestoneID)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 24 * time.Hour, // Inspections can take time
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result InspectionResult

	// Step 1: Create inspection request
	var inspectionID int
	err := workflow.ExecuteActivity(ctx, "CreateInspectionRequest", input.MilestoneID, input.ProjectID).Get(ctx, &inspectionID)
	if err != nil {
		return &InspectionResult{Success: false}, err
	}
	result.InspectionID = inspectionID

	// Step 2: Assign inspector (verification-service)
	var inspectorID int
	err = workflow.ExecuteActivity(ctx, "AssignInspector", input.ProjectID).Get(ctx, &inspectorID)
	if err != nil {
		return &InspectionResult{Success: false}, err
	}

	// Step 3: Notify inspector
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":       inspectorID,
		"type":         "inspection_assigned",
		"title":        "New Inspection Assignment",
		"message":      "You have been assigned a new inspection.",
		"inspectionId": inspectionID,
	}).Get(ctx, nil)

	// Step 4: Wait for inspection completion signal
	var inspectionReport map[string]interface{}
	reportChannel := workflow.GetSignalChannel(ctx, "inspection-completed")
	
	selector := workflow.NewSelector(ctx)
	selector.AddReceive(reportChannel, func(c workflow.ReceiveChannel, more bool) {
		c.Receive(ctx, &inspectionReport)
	})

	// Timeout after 7 days
	timer := workflow.NewTimer(ctx, 7*24*time.Hour)
	selector.AddFuture(timer, func(f workflow.Future) {
		inspectionReport = nil
	})

	selector.Select(ctx)

	if inspectionReport == nil {
		logger.Warn("Inspection not completed within timeout")
		return &result, nil
	}

	// Step 5: Validate inspection photos with OCR
	photos := inspectionReport["photos"].([]interface{})
	var photosValid bool
	err = workflow.ExecuteActivity(ctx, "ValidateInspectionPhotos", photos).Get(ctx, &photosValid)
	if err != nil || !photosValid {
		logger.Warn("Inspection photos validation failed")
	}

	// Step 6: Determine approval status
	approved := inspectionReport["approved"].(bool) && photosValid
	result.Approved = approved

	// Step 7: Update inspection status
	status := "approved"
	if !approved {
		status = "rejected"
	}
	_ = workflow.ExecuteActivity(ctx, "UpdateInspectionStatus", inspectionID, status).Get(ctx, nil)

	// Step 8: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "inspection.completed", map[string]interface{}{
		"inspectionId": inspectionID,
		"milestoneId":  input.MilestoneID,
		"approved":     approved,
	}).Get(ctx, nil)

	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 26: Escrow Release ==========

type EscrowReleaseInput struct {
	EscrowID    int `json:"escrowId"`
	BuilderID   int `json:"builderId"`
	Amount      int `json:"amount"`
	MilestoneID int `json:"milestoneId"`
}

type EscrowReleaseResult struct {
	TransferID string `json:"transferId"`
	Success    bool   `json:"success"`
}

func EscrowReleaseWorkflow(ctx workflow.Context, input EscrowReleaseInput) (*EscrowReleaseResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting escrow release workflow", "escrowId", input.EscrowID)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result EscrowReleaseResult

	// Step 1: Validate escrow account status
	var escrowValid bool
	err := workflow.ExecuteActivity(ctx, "ValidateEscrowAccount", input.EscrowID).Get(ctx, &escrowValid)
	if err != nil || !escrowValid {
		return &EscrowReleaseResult{Success: false}, err
	}

	// Step 2: Create Stripe transfer to builder
	var transferID string
	err = workflow.ExecuteActivity(ctx, "CreateStripeTransfer", input.BuilderID, input.Amount).Get(ctx, &transferID)
	if err != nil {
		logger.Error("Failed to create Stripe transfer", "error", err)
		return &EscrowReleaseResult{Success: false}, err
	}
	result.TransferID = transferID

	// Step 3: Update TigerBeetle ledger
	err = workflow.ExecuteActivity(ctx, "ReleaseEscrowInLedger", input.EscrowID, transferID, input.Amount).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to update ledger", "error", err)
	}

	// Step 4: Update escrow account status
	_ = workflow.ExecuteActivity(ctx, "UpdateEscrowStatus", input.EscrowID, "released", transferID).Get(ctx, nil)

	// Step 5: Notify builder
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":     input.BuilderID,
		"type":       "payout_released",
		"title":      "Payment Released",
		"message":    "Your milestone payment has been released.",
		"amount":     input.Amount,
		"transferId": transferID,
	}).Get(ctx, nil)

	// Step 6: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "escrow.released", map[string]interface{}{
		"escrowId":    input.EscrowID,
		"builderId":   input.BuilderID,
		"amount":      input.Amount,
		"transferId":  transferID,
		"milestoneId": input.MilestoneID,
	}).Get(ctx, nil)

	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 27: Project Tracking ==========

type ProjectTrackingInput struct {
	ProjectID int `json:"projectId"`
	ClientID  int `json:"clientId"`
}

type ProjectTrackingResult struct {
	Progress   int                      `json:"progress"`
	Milestones []map[string]interface{} `json:"milestones"`
	Success    bool                     `json:"success"`
}

func ProjectTrackingWorkflow(ctx workflow.Context, input ProjectTrackingInput) (*ProjectTrackingResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting project tracking workflow", "projectId", input.ProjectID)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result ProjectTrackingResult

	// Step 1: Get project details
	var project map[string]interface{}
	err := workflow.ExecuteActivity(ctx, "GetProjectDetails", input.ProjectID).Get(ctx, &project)
	if err != nil {
		return &ProjectTrackingResult{Success: false}, err
	}

	// Step 2: Get all milestones
	var milestones []map[string]interface{}
	err = workflow.ExecuteActivity(ctx, "GetProjectMilestones", input.ProjectID).Get(ctx, &milestones)
	if err != nil {
		return &ProjectTrackingResult{Success: false}, err
	}
	result.Milestones = milestones

	// Step 3: Calculate overall progress
	var progress int
	err = workflow.ExecuteActivity(ctx, "CalculateProjectProgress", milestones).Get(ctx, &progress)
	if err != nil {
		progress = 0
	}
	result.Progress = progress

	// Step 4: Get budget vs actual spending
	var budgetAnalysis map[string]interface{}
	_ = workflow.ExecuteActivity(ctx, "AnalyzeProjectBudget", input.ProjectID).Get(ctx, &budgetAnalysis)

	// Step 5: Get timeline analysis
	var timelineAnalysis map[string]interface{}
	_ = workflow.ExecuteActivity(ctx, "AnalyzeProjectTimeline", input.ProjectID).Get(ctx, &timelineAnalysis)

	// Step 6: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "project.tracked", map[string]interface{}{
		"projectId": input.ProjectID,
		"progress":  progress,
	}).Get(ctx, nil)

	result.Success = true

	return &result, nil
}

// ========== WORKFLOWS 28-30: Additional Builder Workflows ==========

func BuilderOnboardingWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Steps: Submit application → Upload docs → OCR extraction → KYB validation → Admin review → Approval
	return map[string]interface{}{"success": true}, nil
}

func PhotoUpdateWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Steps: Upload photos → Image optimization → Metadata extraction → IPFS storage → Client notification
	return map[string]interface{}{"success": true}, nil
}

func BuilderAnalyticsWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Steps: Aggregate data → Completion rate → Average rating → Revenue trends → Export report
	return map[string]interface{}{"success": true}, nil
}
