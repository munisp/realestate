package workflows

import (
	"time"

	"github.com/google/uuid"
	"github.com/realestate/transaction-service/activities"
	"github.com/realestate/transaction-service/internal/model"
	"go.temporal.io/sdk/workflow"
)

// TransactionWorkflow orchestrates the complete property transaction process
func TransactionWorkflow(ctx workflow.Context, input model.TransactionWorkflowInput) (*model.TransactionWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting transaction workflow", "transaction_id", input.TransactionID)

	// Set workflow options
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

	var result model.TransactionWorkflowResult
	result.TransactionID = input.TransactionID

	// Step 1: Validate property availability
	var propertyAvailable bool
	err := workflow.ExecuteActivity(ctx, activities.ValidatePropertyAvailability, input.PropertyID).Get(ctx, &propertyAvailable)
	if err != nil {
		logger.Error("Failed to validate property", "error", err)
		return &model.TransactionWorkflowResult{
			Success:       false,
			TransactionID: input.TransactionID,
			Error:         "property validation failed: " + err.Error(),
		}, err
	}

	if !propertyAvailable {
		logger.Warn("Property not available")
		_ = workflow.ExecuteActivity(ctx, activities.UpdateTransactionStatus, input.TransactionID, model.StatusCancelled).Get(ctx, nil)
		return &model.TransactionWorkflowResult{
			Success:       false,
			TransactionID: input.TransactionID,
			Error:         "property not available",
		}, nil
	}

	// Step 2: Create offer
	err = workflow.ExecuteActivity(ctx, activities.CreateOffer, input.TransactionID, input.OfferAmount).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to create offer", "error", err)
		return &model.TransactionWorkflowResult{
			Success:       false,
			TransactionID: input.TransactionID,
			Error:         "offer creation failed: " + err.Error(),
		}, err
	}

	// Step 3: Wait for seller acceptance (with timeout)
	var offerAccepted bool
	selector := workflow.NewSelector(ctx)
	
	// Set up signal channel for offer acceptance
	acceptanceChannel := workflow.GetSignalChannel(ctx, "offer-accepted")
	selector.AddReceive(acceptanceChannel, func(c workflow.ReceiveChannel, more bool) {
		c.Receive(ctx, &offerAccepted)
	})

	// Set up timer for timeout (7 days)
	timer := workflow.NewTimer(ctx, 7*24*time.Hour)
	selector.AddFuture(timer, func(f workflow.Future) {
		offerAccepted = false
	})

	selector.Select(ctx)

	if !offerAccepted {
		logger.Warn("Offer not accepted within timeout")
		_ = workflow.ExecuteActivity(ctx, activities.UpdateTransactionStatus, input.TransactionID, model.StatusCancelled).Get(ctx, nil)
		return &model.TransactionWorkflowResult{
			Success:       false,
			TransactionID: input.TransactionID,
			Error:         "offer not accepted",
		}, nil
	}

	// Step 4: Update status to in progress
	err = workflow.ExecuteActivity(ctx, activities.UpdateTransactionStatus, input.TransactionID, model.StatusInProgress).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to update status", "error", err)
	}

	// Step 5: Create escrow account
	var escrowID uuid.UUID
	err = workflow.ExecuteActivity(ctx, activities.CreateEscrow, input.TransactionID, input.OfferAmount).Get(ctx, &escrowID)
	if err != nil {
		logger.Error("Failed to create escrow", "error", err)
		// Compensation: Cancel transaction
		_ = workflow.ExecuteActivity(ctx, activities.UpdateTransactionStatus, input.TransactionID, model.StatusFailed).Get(ctx, nil)
		return &model.TransactionWorkflowResult{
			Success:       false,
			TransactionID: input.TransactionID,
			Error:         "escrow creation failed: " + err.Error(),
		}, err
	}

	// Step 6: Fund escrow
	err = workflow.ExecuteActivity(ctx, activities.FundEscrow, escrowID, input.BuyerID).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to fund escrow", "error", err)
		// Compensation: Cancel escrow and transaction
		_ = workflow.ExecuteActivity(ctx, activities.CancelEscrow, escrowID).Get(ctx, nil)
		_ = workflow.ExecuteActivity(ctx, activities.UpdateTransactionStatus, input.TransactionID, model.StatusFailed).Get(ctx, nil)
		return &model.TransactionWorkflowResult{
			Success:       false,
			TransactionID: input.TransactionID,
			Error:         "escrow funding failed: " + err.Error(),
		}, err
	}

	// Step 7: Update status to in escrow
	err = workflow.ExecuteActivity(ctx, activities.UpdateTransactionStatus, input.TransactionID, model.StatusInEscrow).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to update status", "error", err)
	}

	// Step 8: Generate transaction documents
	err = workflow.ExecuteActivity(ctx, activities.GenerateDocuments, input.TransactionID).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to generate documents", "error", err)
		// Continue even if document generation fails
	}

	// Step 9: Wait for document signatures
	var documentsSignedChannel = workflow.GetSignalChannel(ctx, "documents-signed")
	var documentsSigned bool
	documentsSignedChannel.Receive(ctx, &documentsSigned)

	if !documentsSigned {
		logger.Warn("Documents not signed")
		// Compensation: Refund escrow and cancel transaction
		_ = workflow.ExecuteActivity(ctx, activities.RefundEscrow, escrowID).Get(ctx, nil)
		_ = workflow.ExecuteActivity(ctx, activities.UpdateTransactionStatus, input.TransactionID, model.StatusCancelled).Get(ctx, nil)
		return &model.TransactionWorkflowResult{
			Success:       false,
			TransactionID: input.TransactionID,
			Error:         "documents not signed",
		}, nil
	}

	// Step 10: Record transaction on blockchain
	var blockchainTxID string
	err = workflow.ExecuteActivity(ctx, activities.RecordOnBlockchain, input.TransactionID).Get(ctx, &blockchainTxID)
	if err != nil {
		logger.Error("Failed to record on blockchain", "error", err)
		// Continue even if blockchain recording fails
	}

	// Step 11: Transfer property ownership
	err = workflow.ExecuteActivity(ctx, activities.TransferOwnership, input.PropertyID, input.BuyerID).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to transfer ownership", "error", err)
		// Compensation: Refund escrow and cancel transaction
		_ = workflow.ExecuteActivity(ctx, activities.RefundEscrow, escrowID).Get(ctx, nil)
		_ = workflow.ExecuteActivity(ctx, activities.UpdateTransactionStatus, input.TransactionID, model.StatusFailed).Get(ctx, nil)
		return &model.TransactionWorkflowResult{
			Success:       false,
			TransactionID: input.TransactionID,
			Error:         "ownership transfer failed: " + err.Error(),
		}, err
	}

	// Step 12: Release escrow to seller
	err = workflow.ExecuteActivity(ctx, activities.ReleaseEscrow, escrowID, input.SellerID).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to release escrow", "error", err)
		return &model.TransactionWorkflowResult{
			Success:       false,
			TransactionID: input.TransactionID,
			Error:         "escrow release failed: " + err.Error(),
		}, err
	}

	// Step 13: Update transaction status to completed
	err = workflow.ExecuteActivity(ctx, activities.UpdateTransactionStatus, input.TransactionID, model.StatusCompleted).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to update final status", "error", err)
	}

	// Step 14: Send completion notifications
	err = workflow.ExecuteActivity(ctx, activities.SendCompletionNotifications, input.TransactionID).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to send notifications", "error", err)
		// Continue even if notifications fail
	}

	result.Success = true
	result.FinalAmount = input.OfferAmount
	result.CompletedAt = workflow.Now(ctx)

	logger.Info("Transaction workflow completed successfully", "transaction_id", input.TransactionID)
	return &result, nil
}
