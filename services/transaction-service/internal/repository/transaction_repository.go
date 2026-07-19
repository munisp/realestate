package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/realestate/transaction-service/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type TransactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(dsn string) (*TransactionRepository, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate models
	err = db.AutoMigrate(
		&model.Transaction{},
		&model.TransactionDocument{},
		&model.TransactionEvent{},
		&model.Escrow{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return &TransactionRepository{db: db}, nil
}

// Transaction operations
func (r *TransactionRepository) CreateTransaction(ctx context.Context, transaction *model.Transaction) error {
	return r.db.WithContext(ctx).Create(transaction).Error
}

func (r *TransactionRepository) GetTransactionByID(ctx context.Context, id uuid.UUID) (*model.Transaction, error) {
	var transaction model.Transaction
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&transaction).Error
	return &transaction, err
}

func (r *TransactionRepository) UpdateTransaction(ctx context.Context, transaction *model.Transaction) error {
	return r.db.WithContext(ctx).Save(transaction).Error
}

func (r *TransactionRepository) ListTransactions(ctx context.Context, limit, offset int) ([]model.Transaction, error) {
	var transactions []model.Transaction
	err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Order("created_at DESC").Find(&transactions).Error
	return transactions, err
}

func (r *TransactionRepository) GetTransactionsByBuyerID(ctx context.Context, buyerID uuid.UUID) ([]model.Transaction, error) {
	var transactions []model.Transaction
	err := r.db.WithContext(ctx).Where("buyer_id = ?", buyerID).Order("created_at DESC").Find(&transactions).Error
	return transactions, err
}

func (r *TransactionRepository) GetTransactionsBySellerID(ctx context.Context, sellerID uuid.UUID) ([]model.Transaction, error) {
	var transactions []model.Transaction
	err := r.db.WithContext(ctx).Where("seller_id = ?", sellerID).Order("created_at DESC").Find(&transactions).Error
	return transactions, err
}

func (r *TransactionRepository) GetTransactionsByPropertyID(ctx context.Context, propertyID uuid.UUID) ([]model.Transaction, error) {
	var transactions []model.Transaction
	err := r.db.WithContext(ctx).Where("property_id = ?", propertyID).Order("created_at DESC").Find(&transactions).Error
	return transactions, err
}

// Escrow operations
func (r *TransactionRepository) CreateEscrow(ctx context.Context, escrow *model.Escrow) error {
	return r.db.WithContext(ctx).Create(escrow).Error
}

func (r *TransactionRepository) GetEscrowByID(ctx context.Context, id uuid.UUID) (*model.Escrow, error) {
	var escrow model.Escrow
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&escrow).Error
	return &escrow, err
}

func (r *TransactionRepository) GetEscrowByTransactionID(ctx context.Context, transactionID uuid.UUID) (*model.Escrow, error) {
	var escrow model.Escrow
	err := r.db.WithContext(ctx).Where("transaction_id = ?", transactionID).First(&escrow).Error
	return &escrow, err
}

func (r *TransactionRepository) UpdateEscrow(ctx context.Context, escrow *model.Escrow) error {
	return r.db.WithContext(ctx).Save(escrow).Error
}

// Document operations
func (r *TransactionRepository) CreateDocument(ctx context.Context, document *model.TransactionDocument) error {
	return r.db.WithContext(ctx).Create(document).Error
}

func (r *TransactionRepository) GetDocumentsByTransactionID(ctx context.Context, transactionID uuid.UUID) ([]model.TransactionDocument, error) {
	var documents []model.TransactionDocument
	err := r.db.WithContext(ctx).Where("transaction_id = ?", transactionID).Find(&documents).Error
	return documents, err
}

func (r *TransactionRepository) UpdateDocument(ctx context.Context, document *model.TransactionDocument) error {
	return r.db.WithContext(ctx).Save(document).Error
}

// Event operations
func (r *TransactionRepository) CreateEvent(ctx context.Context, event *model.TransactionEvent) error {
	return r.db.WithContext(ctx).Create(event).Error
}

func (r *TransactionRepository) GetEventsByTransactionID(ctx context.Context, transactionID uuid.UUID) ([]model.TransactionEvent, error) {
	var events []model.TransactionEvent
	err := r.db.WithContext(ctx).Where("transaction_id = ?", transactionID).Order("created_at DESC").Find(&events).Error
	return events, err
}
