package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/realestate/transaction-service/internal/model"
	"github.com/realestate/transaction-service/internal/repository"
	"go.temporal.io/sdk/client"
)

type TransactionService struct {
	repo           *repository.TransactionRepository
	temporalClient client.Client
}

func NewTransactionService(repo *repository.TransactionRepository, temporalClient client.Client) *TransactionService {
	return &TransactionService{
		repo:           repo,
		temporalClient: temporalClient,
	}
}

// CreateTransaction creates a new transaction and starts the workflow
func (s *TransactionService) CreateTransaction(ctx context.Context, req *model.CreateTransactionRequest) (*model.Transaction, error) {
	// Create transaction record
	transaction := &model.Transaction{
		PropertyID:  req.PropertyID,
		BuyerID:     req.BuyerID,
		SellerID:    req.SellerID,
		AgentID:     req.AgentID,
		OfferAmount: req.OfferAmount,
		Currency:    req.Currency,
		Status:      model.StatusDraft,
		Notes:       req.Notes,
	}

	if transaction.Currency == "" {
		transaction.Currency = "USD"
	}

	err := s.repo.CreateTransaction(ctx, transaction)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	// Start Temporal workflow
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("transaction-%s", transaction.ID),
		TaskQueue: "transaction-task-queue",
	}

	workflowInput := model.TransactionWorkflowInput{
		TransactionID: transaction.ID,
		PropertyID:    transaction.PropertyID,
		BuyerID:       transaction.BuyerID,
		SellerID:      transaction.SellerID,
		OfferAmount:   transaction.OfferAmount,
		Currency:      transaction.Currency,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, "TransactionWorkflow", workflowInput)
	if err != nil {
		return nil, fmt.Errorf("failed to start workflow: %w", err)
	}

	// Update transaction with workflow IDs
	transaction.WorkflowID = we.GetID()
	transaction.RunID = we.GetRunID()
	err = s.repo.UpdateTransaction(ctx, transaction)
	if err != nil {
		return nil, fmt.Errorf("failed to update transaction with workflow IDs: %w", err)
	}

	return transaction, nil
}

// GetTransaction retrieves a transaction by ID
func (s *TransactionService) GetTransaction(ctx context.Context, id uuid.UUID) (*model.Transaction, error) {
	return s.repo.GetTransactionByID(ctx, id)
}

// UpdateTransaction updates a transaction
func (s *TransactionService) UpdateTransaction(ctx context.Context, id uuid.UUID, req *model.UpdateTransactionRequest) (*model.Transaction, error) {
	transaction, err := s.repo.GetTransactionByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("transaction not found: %w", err)
	}

	// Update fields
	if req.Status != nil {
		transaction.Status = *req.Status
	}
	if req.FinalAmount != nil {
		transaction.FinalAmount = *req.FinalAmount
	}
	if req.ClosingDate != nil {
		transaction.ClosingDate = req.ClosingDate
	}
	if req.Notes != nil {
		transaction.Notes = *req.Notes
	}

	err = s.repo.UpdateTransaction(ctx, transaction)
	if err != nil {
		return nil, fmt.Errorf("failed to update transaction: %w", err)
	}

	return transaction, nil
}

// ListTransactions retrieves transactions with pagination
func (s *TransactionService) ListTransactions(ctx context.Context, limit, offset int) ([]model.Transaction, error) {
	return s.repo.ListTransactions(ctx, limit, offset)
}

// GetTransactionsByBuyer retrieves transactions for a buyer
func (s *TransactionService) GetTransactionsByBuyer(ctx context.Context, buyerID uuid.UUID) ([]model.Transaction, error) {
	return s.repo.GetTransactionsByBuyerID(ctx, buyerID)
}

// GetTransactionsBySeller retrieves transactions for a seller
func (s *TransactionService) GetTransactionsBySeller(ctx context.Context, sellerID uuid.UUID) ([]model.Transaction, error) {
	return s.repo.GetTransactionsBySellerID(ctx, sellerID)
}

// AcceptOffer accepts an offer for a transaction
func (s *TransactionService) AcceptOffer(ctx context.Context, transactionID uuid.UUID) error {
	transaction, err := s.repo.GetTransactionByID(ctx, transactionID)
	if err != nil {
		return fmt.Errorf("transaction not found: %w", err)
	}

	// Send signal to workflow
	err = s.temporalClient.SignalWorkflow(ctx, transaction.WorkflowID, transaction.RunID, "offer-accepted", true)
	if err != nil {
		return fmt.Errorf("failed to signal workflow: %w", err)
	}

	return nil
}

// ConfirmDocumentsSigned confirms that all documents have been signed
func (s *TransactionService) ConfirmDocumentsSigned(ctx context.Context, transactionID uuid.UUID) error {
	transaction, err := s.repo.GetTransactionByID(ctx, transactionID)
	if err != nil {
		return fmt.Errorf("transaction not found: %w", err)
	}

	// Send signal to workflow
	err = s.temporalClient.SignalWorkflow(ctx, transaction.WorkflowID, transaction.RunID, "documents-signed", true)
	if err != nil {
		return fmt.Errorf("failed to signal workflow: %w", err)
	}

	return nil
}

// GetTransactionDocuments retrieves documents for a transaction
func (s *TransactionService) GetTransactionDocuments(ctx context.Context, transactionID uuid.UUID) ([]model.TransactionDocument, error) {
	return s.repo.GetDocumentsByTransactionID(ctx, transactionID)
}

// GetTransactionEvents retrieves events for a transaction
func (s *TransactionService) GetTransactionEvents(ctx context.Context, transactionID uuid.UUID) ([]model.TransactionEvent, error) {
	return s.repo.GetEventsByTransactionID(ctx, transactionID)
}

// GetEscrow retrieves escrow information for a transaction
func (s *TransactionService) GetEscrow(ctx context.Context, transactionID uuid.UUID) (*model.Escrow, error) {
	return s.repo.GetEscrowByTransactionID(ctx, transactionID)
}

// CancelTransaction cancels a transaction
func (s *TransactionService) CancelTransaction(ctx context.Context, transactionID uuid.UUID) error {
	transaction, err := s.repo.GetTransactionByID(ctx, transactionID)
	if err != nil {
		return fmt.Errorf("transaction not found: %w", err)
	}

	// Cancel the workflow
	err = s.temporalClient.CancelWorkflow(ctx, transaction.WorkflowID, transaction.RunID)
	if err != nil {
		return fmt.Errorf("failed to cancel workflow: %w", err)
	}

	// Update transaction status
	transaction.Status = model.StatusCancelled
	err = s.repo.UpdateTransaction(ctx, transaction)
	if err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	return nil
}
