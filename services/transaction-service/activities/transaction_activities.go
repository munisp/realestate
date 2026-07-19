package activities

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/realestate/transaction-service/internal/model"
	"github.com/realestate/transaction-service/internal/repository"
	"github.com/segmentio/kafka-go"
)

type TransactionActivities struct {
	repo  *repository.TransactionRepository
	kafka *kafka.Writer
}

func NewTransactionActivities(repo *repository.TransactionRepository, kafkaWriter *kafka.Writer) *TransactionActivities {
	return &TransactionActivities{
		repo:  repo,
		kafka: kafkaWriter,
	}
}

// ValidatePropertyAvailability checks if a property is available for transaction
func (a *TransactionActivities) ValidatePropertyAvailability(ctx context.Context, propertyID uuid.UUID) (bool, error) {
	// In a real implementation, this would call the Property Service
	// For now, we'll assume the property is available
	return true, nil
}

// CreateOffer creates an offer for the transaction
func (a *TransactionActivities) CreateOffer(ctx context.Context, transactionID uuid.UUID, amount int64) error {
	now := time.Now()
	transaction, err := a.repo.GetTransactionByID(ctx, transactionID)
	if err != nil {
		return fmt.Errorf("failed to get transaction: %w", err)
	}

	transaction.OfferDate = &now
	transaction.Status = model.StatusPending

	err = a.repo.UpdateTransaction(ctx, transaction)
	if err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	// Publish event
	_ = a.publishEvent("transaction.offer_created", transactionID, map[string]interface{}{
		"amount": amount,
	})

	return nil
}

// UpdateTransactionStatus updates the status of a transaction
func (a *TransactionActivities) UpdateTransactionStatus(ctx context.Context, transactionID uuid.UUID, status model.TransactionStatus) error {
	transaction, err := a.repo.GetTransactionByID(ctx, transactionID)
	if err != nil {
		return fmt.Errorf("failed to get transaction: %w", err)
	}

	transaction.Status = status

	err = a.repo.UpdateTransaction(ctx, transaction)
	if err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	// Publish event
	_ = a.publishEvent("transaction.status_updated", transactionID, map[string]interface{}{
		"status": status,
	})

	return nil
}

// CreateEscrow creates an escrow account for the transaction
func (a *TransactionActivities) CreateEscrow(ctx context.Context, transactionID uuid.UUID, amount int64) (uuid.UUID, error) {
	escrow := &model.Escrow{
		TransactionID: transactionID,
		Amount:        amount,
		Currency:      "USD",
		Status:        "pending",
	}

	err := a.repo.CreateEscrow(ctx, escrow)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to create escrow: %w", err)
	}

	// Publish event
	_ = a.publishEvent("escrow.created", transactionID, map[string]interface{}{
		"escrow_id": escrow.ID,
		"amount":    amount,
	})

	return escrow.ID, nil
}

// FundEscrow funds the escrow account
func (a *TransactionActivities) FundEscrow(ctx context.Context, escrowID uuid.UUID, buyerID uuid.UUID) error {
	escrow, err := a.repo.GetEscrowByID(ctx, escrowID)
	if err != nil {
		return fmt.Errorf("failed to get escrow: %w", err)
	}

	// In a real implementation, this would integrate with payment processing
	// For now, we'll mark it as funded
	now := time.Now()
	escrow.Status = "funded"
	escrow.FundedAt = &now

	err = a.repo.UpdateEscrow(ctx, escrow)
	if err != nil {
		return fmt.Errorf("failed to update escrow: %w", err)
	}

	// Publish event
	_ = a.publishEvent("escrow.funded", escrow.TransactionID, map[string]interface{}{
		"escrow_id": escrowID,
		"buyer_id":  buyerID,
	})

	return nil
}

// CancelEscrow cancels an escrow account
func (a *TransactionActivities) CancelEscrow(ctx context.Context, escrowID uuid.UUID) error {
	escrow, err := a.repo.GetEscrowByID(ctx, escrowID)
	if err != nil {
		return fmt.Errorf("failed to get escrow: %w", err)
	}

	escrow.Status = "cancelled"

	err = a.repo.UpdateEscrow(ctx, escrow)
	if err != nil {
		return fmt.Errorf("failed to update escrow: %w", err)
	}

	// Publish event
	_ = a.publishEvent("escrow.cancelled", escrow.TransactionID, map[string]interface{}{
		"escrow_id": escrowID,
	})

	return nil
}

// RefundEscrow refunds the escrow to the buyer
func (a *TransactionActivities) RefundEscrow(ctx context.Context, escrowID uuid.UUID) error {
	escrow, err := a.repo.GetEscrowByID(ctx, escrowID)
	if err != nil {
		return fmt.Errorf("failed to get escrow: %w", err)
	}

	// In a real implementation, this would process the refund
	escrow.Status = "refunded"

	err = a.repo.UpdateEscrow(ctx, escrow)
	if err != nil {
		return fmt.Errorf("failed to update escrow: %w", err)
	}

	// Publish event
	_ = a.publishEvent("escrow.refunded", escrow.TransactionID, map[string]interface{}{
		"escrow_id": escrowID,
	})

	return nil
}

// ReleaseEscrow releases the escrow to the seller
func (a *TransactionActivities) ReleaseEscrow(ctx context.Context, escrowID uuid.UUID, sellerID uuid.UUID) error {
	escrow, err := a.repo.GetEscrowByID(ctx, escrowID)
	if err != nil {
		return fmt.Errorf("failed to get escrow: %w", err)
	}

	// In a real implementation, this would transfer funds to the seller
	now := time.Now()
	escrow.Status = "released"
	escrow.ReleasedAt = &now

	err = a.repo.UpdateEscrow(ctx, escrow)
	if err != nil {
		return fmt.Errorf("failed to update escrow: %w", err)
	}

	// Publish event
	_ = a.publishEvent("escrow.released", escrow.TransactionID, map[string]interface{}{
		"escrow_id": escrowID,
		"seller_id": sellerID,
	})

	return nil
}

// GenerateDocuments generates transaction documents
func (a *TransactionActivities) GenerateDocuments(ctx context.Context, transactionID uuid.UUID) error {
	// In a real implementation, this would generate PDF documents
	// For now, we'll create placeholder document records
	documents := []model.TransactionDocument{
		{
			TransactionID:     transactionID,
			DocumentType:      "purchase_agreement",
			DocumentName:      "Purchase Agreement",
			RequiresSignature: true,
		},
		{
			TransactionID:     transactionID,
			DocumentType:      "disclosure",
			DocumentName:      "Property Disclosure",
			RequiresSignature: true,
		},
	}

	for _, doc := range documents {
		err := a.repo.CreateDocument(ctx, &doc)
		if err != nil {
			return fmt.Errorf("failed to create document: %w", err)
		}
	}

	// Publish event
	_ = a.publishEvent("documents.generated", transactionID, map[string]interface{}{
		"count": len(documents),
	})

	return nil
}

// RecordOnBlockchain records the transaction on blockchain
func (a *TransactionActivities) RecordOnBlockchain(ctx context.Context, transactionID uuid.UUID) (string, error) {
	// In a real implementation, this would interact with blockchain
	// For now, we'll generate a mock transaction ID
	blockchainTxID := fmt.Sprintf("0x%s", uuid.New().String()[:16])

	escrow, err := a.repo.GetEscrowByTransactionID(ctx, transactionID)
	if err != nil {
		return "", fmt.Errorf("failed to get escrow: %w", err)
	}

	escrow.BlockchainTxID = blockchainTxID
	err = a.repo.UpdateEscrow(ctx, escrow)
	if err != nil {
		return "", fmt.Errorf("failed to update escrow: %w", err)
	}

	// Publish event
	_ = a.publishEvent("transaction.recorded_on_blockchain", transactionID, map[string]interface{}{
		"blockchain_tx_id": blockchainTxID,
	})

	return blockchainTxID, nil
}

// TransferOwnership transfers property ownership
func (a *TransactionActivities) TransferOwnership(ctx context.Context, propertyID uuid.UUID, newOwnerID uuid.UUID) error {
	// In a real implementation, this would call the Property Service
	// to update the owner
	
	// Publish event
	_ = a.publishEvent("property.ownership_transferred", propertyID, map[string]interface{}{
		"new_owner_id": newOwnerID,
	})

	return nil
}

// SendCompletionNotifications sends notifications about transaction completion
func (a *TransactionActivities) SendCompletionNotifications(ctx context.Context, transactionID uuid.UUID) error {
	transaction, err := a.repo.GetTransactionByID(ctx, transactionID)
	if err != nil {
		return fmt.Errorf("failed to get transaction: %w", err)
	}

	// In a real implementation, this would send emails/push notifications
	// For now, we'll just publish an event
	_ = a.publishEvent("transaction.completed", transactionID, map[string]interface{}{
		"buyer_id":  transaction.BuyerID,
		"seller_id": transaction.SellerID,
	})

	return nil
}

// publishEvent publishes an event to Kafka
func (a *TransactionActivities) publishEvent(eventType string, entityID uuid.UUID, data map[string]interface{}) error {
	event := map[string]interface{}{
		"event_type": eventType,
		"entity_id":  entityID,
		"timestamp":  time.Now(),
		"data":       data,
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return a.kafka.WriteMessages(context.Background(), kafka.Message{
		Key:   []byte(entityID.String()),
		Value: eventJSON,
	})
}
