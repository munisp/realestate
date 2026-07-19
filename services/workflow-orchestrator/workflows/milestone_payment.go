package workflows

import (
	"time"

	"go.temporal.io/sdk/workflow"
)

// MilestonePaymentInput represents the input for milestone payment workflow
type MilestonePaymentInput struct {
	ProjectID    int `json:"projectId"`
	MilestoneID  int `json:"milestoneId"`
	ClientID     int `json:"clientId"`
	BuilderID    int `json:"builderId"`
	Amount       int `json:"amount"`
}

// MilestonePaymentResult represents the workflow result
type MilestonePaymentResult struct {
	PaymentID   string `json:"paymentId"`
	EscrowID    int    `json:"escrowId"`
	Success     bool   `json:"success"`
	Error       string `json:"error,omitempty"`
}

// MilestonePaymentWorkflow orchestrates milestone-based payment with escrow
// Integrates with: payment-service, tigerbeetle-service, developer-service, Kafka, Stripe
func MilestonePaymentWorkflow(ctx workflow.Context, input MilestonePaymentInput) (*MilestonePaymentResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting milestone payment workflow", "projectId", input.ProjectID, "milestoneId", input.MilestoneID)

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

	var result MilestonePaymentResult

	// Step 1: Validate milestone status (developer-service via Dapr)
	var milestoneValid bool
	err := workflow.ExecuteActivity(ctx, "ValidateMilestone", input.MilestoneID).Get(ctx, &milestoneValid)
	if err != nil {
		logger.Error("Failed to validate milestone", "error", err)
		return &MilestonePaymentResult{Success: false, Error: "milestone validation failed"}, err
	}

	if !milestoneValid {
		logger.Warn("Milestone not ready for payment")
		return &MilestonePaymentResult{Success: false, Error: "milestone not ready"}, nil
	}

	// Step 2: Create escrow account in TigerBeetle
	var escrowID int
	err = workflow.ExecuteActivity(ctx, "CreateEscrowAccount", input.ProjectID, input.MilestoneID, input.Amount).Get(ctx, &escrowID)
	if err != nil {
		logger.Error("Failed to create escrow account", "error", err)
		return &MilestonePaymentResult{Success: false, Error: "escrow creation failed"}, err
	}
	result.EscrowID = escrowID

	// Step 3: Create Stripe checkout session
	type CheckoutSession struct {
		SessionID string `json:"sessionId"`
		URL       string `json:"url"`
	}
	var session CheckoutSession
	err = workflow.ExecuteActivity(ctx, "CreateStripeCheckout", escrowID, input.Amount, "milestone_payment").Get(ctx, &session)
	if err != nil {
		logger.Error("Failed to create checkout session", "error", err)
		// Rollback escrow
		_ = workflow.ExecuteActivity(ctx, "CancelEscrowAccount", escrowID).Get(ctx, nil)
		return &MilestonePaymentResult{Success: false, Error: "payment session creation failed"}, err
	}

	// Step 4: Wait for payment confirmation
	var paymentConfirmed bool
	var paymentID string
	
	selector := workflow.NewSelector(ctx)
	paymentChannel := workflow.GetSignalChannel(ctx, "payment-confirmed")
	selector.AddReceive(paymentChannel, func(c workflow.ReceiveChannel, more bool) {
		var payment struct {
			Confirmed bool   `json:"confirmed"`
			PaymentID string `json:"paymentId"`
		}
		c.Receive(ctx, &payment)
		paymentConfirmed = payment.Confirmed
		paymentID = payment.PaymentID
	})

	// Timeout after 30 minutes
	timer := workflow.NewTimer(ctx, 30*time.Minute)
	selector.AddFuture(timer, func(f workflow.Future) {
		paymentConfirmed = false
	})

	selector.Select(ctx)

	if !paymentConfirmed {
		logger.Warn("Payment not confirmed within timeout")
		_ = workflow.ExecuteActivity(ctx, "CancelEscrowAccount", escrowID).Get(ctx, nil)
		_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "milestone.payment_timeout", map[string]interface{}{
			"projectId":   input.ProjectID,
			"milestoneId": input.MilestoneID,
			"clientId":    input.ClientID,
		}).Get(ctx, nil)
		return &MilestonePaymentResult{Success: false, Error: "payment timeout"}, nil
	}

	result.PaymentID = paymentID

	// Step 5: Fund escrow account in TigerBeetle
	err = workflow.ExecuteActivity(ctx, "FundEscrowAccount", escrowID, paymentID, input.Amount).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to fund escrow", "error", err)
		return &MilestonePaymentResult{Success: false, Error: "escrow funding failed"}, err
	}

	// Step 6: Update milestone status to "funded"
	err = workflow.ExecuteActivity(ctx, "UpdateMilestoneStatus", input.MilestoneID, "funded", paymentID).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to update milestone status", "error", err)
	}

	// Step 7: Notify builder (notification-service)
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":      input.BuilderID,
		"type":        "milestone_funded",
		"title":       "Milestone Payment Received",
		"message":     "Client has funded the milestone. You can now start work.",
		"projectId":   input.ProjectID,
		"milestoneId": input.MilestoneID,
	}).Get(ctx, nil)

	// Step 8: Publish Kafka events
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "milestone.funded", map[string]interface{}{
		"projectId":   input.ProjectID,
		"milestoneId": input.MilestoneID,
		"escrowId":    escrowID,
		"amount":      input.Amount,
		"paymentId":   paymentID,
	}).Get(ctx, nil)

	// Step 9: Update CRM
	_ = workflow.ExecuteActivity(ctx, "UpdateCRM", "milestone_payment", map[string]interface{}{
		"projectId":   input.ProjectID,
		"milestoneId": input.MilestoneID,
		"clientId":    input.ClientID,
		"builderId":   input.BuilderID,
		"amount":      input.Amount,
		"status":      "escrowed",
	}).Get(ctx, nil)

	// Step 10: Wait for milestone completion signal
	var milestoneCompleted bool
	completionChannel := workflow.GetSignalChannel(ctx, "milestone-completed")
	completionChannel.Receive(ctx, &milestoneCompleted)

	if !milestoneCompleted {
		logger.Warn("Milestone completion signal received but not completed")
		return &result, nil
	}

	// Step 11: Trigger inspection workflow (child workflow)
	inspectionCtx := workflow.WithChildOptions(ctx, workflow.ChildWorkflowOptions{
		WorkflowID: "inspection-" + string(rune(input.MilestoneID)),
	})
	
	var inspectionApproved bool
	err = workflow.ExecuteChildWorkflow(inspectionCtx, InspectionWorkflow, map[string]interface{}{
		"milestoneId": input.MilestoneID,
		"projectId":   input.ProjectID,
	}).Get(ctx, &inspectionApproved)

	if err != nil {
		logger.Error("Inspection workflow failed", "error", err)
		return &result, nil
	}

	if !inspectionApproved {
		logger.Warn("Inspection not approved, funds remain in escrow")
		// Notify both parties
		_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
			"userId":      input.ClientID,
			"type":        "inspection_failed",
			"title":       "Inspection Failed",
			"message":     "The milestone inspection did not pass. Please review with the builder.",
			"projectId":   input.ProjectID,
			"milestoneId": input.MilestoneID,
		}).Get(ctx, nil)
		return &result, nil
	}

	// Step 12: Wait for client approval signal
	var clientApproved bool
	approvalChannel := workflow.GetSignalChannel(ctx, "client-approved")
	
	approvalSelector := workflow.NewSelector(ctx)
	approvalSelector.AddReceive(approvalChannel, func(c workflow.ReceiveChannel, more bool) {
		c.Receive(ctx, &clientApproved)
	})

	// Timeout after 7 days for client approval
	approvalTimer := workflow.NewTimer(ctx, 7*24*time.Hour)
	approvalSelector.AddFuture(approvalTimer, func(f workflow.Future) {
		// Auto-approve after 7 days if no response
		clientApproved = true
		logger.Info("Auto-approving milestone after 7 days")
	})

	approvalSelector.Select(ctx)

	if !clientApproved {
		logger.Warn("Client did not approve milestone")
		return &result, nil
	}

	// Step 13: Release escrow funds to builder (child workflow)
	releaseCtx := workflow.WithChildOptions(ctx, workflow.ChildWorkflowOptions{
		WorkflowID: "escrow-release-" + string(rune(escrowID)),
	})
	
	var releaseSuccess bool
	err = workflow.ExecuteChildWorkflow(releaseCtx, EscrowReleaseWorkflow, map[string]interface{}{
		"escrowId":    escrowID,
		"builderId":   input.BuilderID,
		"amount":      input.Amount,
		"milestoneId": input.MilestoneID,
	}).Get(ctx, &releaseSuccess)

	if err != nil {
		logger.Error("Escrow release workflow failed", "error", err)
		return &result, err
	}

	// Step 14: Update milestone status to "completed"
	_ = workflow.ExecuteActivity(ctx, "UpdateMilestoneStatus", input.MilestoneID, "completed", "").Get(ctx, nil)

	// Step 15: Publish completion events
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "milestone.completed", map[string]interface{}{
		"projectId":   input.ProjectID,
		"milestoneId": input.MilestoneID,
		"escrowId":    escrowID,
		"builderId":   input.BuilderID,
		"amount":      input.Amount,
	}).Get(ctx, nil)

	result.Success = true
	logger.Info("Milestone payment workflow completed successfully", "milestoneId", input.MilestoneID)
	
	return &result, nil
}
