package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TransactionStatus represents the status of a transaction
type TransactionStatus string

const (
	StatusDraft       TransactionStatus = "draft"
	StatusPending     TransactionStatus = "pending"
	StatusInProgress  TransactionStatus = "in_progress"
	StatusInEscrow    TransactionStatus = "in_escrow"
	StatusCompleted   TransactionStatus = "completed"
	StatusCancelled   TransactionStatus = "cancelled"
	StatusFailed      TransactionStatus = "failed"
)

// Transaction represents a property transaction
type Transaction struct {
	ID           uuid.UUID         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	PropertyID   uuid.UUID         `gorm:"type:uuid;not null;index" json:"property_id"`
	BuyerID      uuid.UUID         `gorm:"type:uuid;not null;index" json:"buyer_id"`
	SellerID     uuid.UUID         `gorm:"type:uuid;not null;index" json:"seller_id"`
	AgentID      *uuid.UUID        `gorm:"type:uuid;index" json:"agent_id,omitempty"`
	
	// Financial details
	OfferAmount    int64  `json:"offer_amount"`
	FinalAmount    int64  `json:"final_amount"`
	EscrowAmount   int64  `json:"escrow_amount"`
	Currency       string `gorm:"type:varchar(3);default:'USD'" json:"currency"`
	
	// Status and workflow
	Status         TransactionStatus `gorm:"type:varchar(50);not null" json:"status"`
	WorkflowID     string            `gorm:"type:varchar(255);index" json:"workflow_id"`
	RunID          string            `gorm:"type:varchar(255)" json:"run_id"`
	
	// Dates
	OfferDate      *time.Time `json:"offer_date"`
	AcceptanceDate *time.Time `json:"acceptance_date"`
	EscrowDate     *time.Time `json:"escrow_date"`
	ClosingDate    *time.Time `json:"closing_date"`
	CompletionDate *time.Time `json:"completion_date"`
	
	// Additional details
	Notes          string                 `gorm:"type:text" json:"notes"`
	Metadata       map[string]interface{} `gorm:"type:jsonb" json:"metadata"`
	
	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TransactionDocument represents a document associated with a transaction
type TransactionDocument struct {
	ID             uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TransactionID  uuid.UUID `gorm:"type:uuid;not null;index" json:"transaction_id"`
	DocumentType   string    `gorm:"type:varchar(100);not null" json:"document_type"` // contract, disclosure, inspection, etc.
	DocumentName   string    `json:"document_name"`
	DocumentURL    string    `json:"document_url"`
	FileKey        string    `json:"file_key"`
	MimeType       string    `json:"mime_type"`
	FileSize       int64     `json:"file_size"`
	
	// E-signature
	RequiresSignature bool       `json:"requires_signature"`
	SignedBy          *uuid.UUID `gorm:"type:uuid" json:"signed_by,omitempty"`
	SignedAt          *time.Time `json:"signed_at,omitempty"`
	SignatureURL      string     `json:"signature_url,omitempty"`
	
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TransactionEvent represents an event in the transaction lifecycle
type TransactionEvent struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TransactionID uuid.UUID `gorm:"type:uuid;not null;index" json:"transaction_id"`
	EventType     string    `gorm:"type:varchar(100);not null" json:"event_type"`
	EventData     map[string]interface{} `gorm:"type:jsonb" json:"event_data"`
	UserID        *uuid.UUID `gorm:"type:uuid" json:"user_id,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

// Escrow represents an escrow account for a transaction
type Escrow struct {
	ID             uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TransactionID  uuid.UUID `gorm:"type:uuid;not null;unique;index" json:"transaction_id"`
	Amount         int64     `json:"amount"`
	Currency       string    `gorm:"type:varchar(3);default:'USD'" json:"currency"`
	Status         string    `gorm:"type:varchar(50);not null" json:"status"` // pending, funded, released, refunded
	FundedAt       *time.Time `json:"funded_at,omitempty"`
	ReleasedAt     *time.Time `json:"released_at,omitempty"`
	
	// Blockchain integration
	BlockchainTxID string `json:"blockchain_tx_id,omitempty"`
	IPFSHash       string `json:"ipfs_hash,omitempty"`
	
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// CreateTransactionRequest represents a request to create a transaction
type CreateTransactionRequest struct {
	PropertyID  uuid.UUID `json:"property_id" binding:"required"`
	BuyerID     uuid.UUID `json:"buyer_id" binding:"required"`
	SellerID    uuid.UUID `json:"seller_id" binding:"required"`
	AgentID     *uuid.UUID `json:"agent_id,omitempty"`
	OfferAmount int64     `json:"offer_amount" binding:"required,gt=0"`
	Currency    string    `json:"currency"`
	Notes       string    `json:"notes"`
}

// UpdateTransactionRequest represents a request to update a transaction
type UpdateTransactionRequest struct {
	Status      *TransactionStatus `json:"status,omitempty"`
	FinalAmount *int64             `json:"final_amount,omitempty"`
	ClosingDate *time.Time         `json:"closing_date,omitempty"`
	Notes       *string            `json:"notes,omitempty"`
}

// TransactionWorkflowInput represents input for the transaction workflow
type TransactionWorkflowInput struct {
	TransactionID uuid.UUID `json:"transaction_id"`
	PropertyID    uuid.UUID `json:"property_id"`
	BuyerID       uuid.UUID `json:"buyer_id"`
	SellerID      uuid.UUID `json:"seller_id"`
	OfferAmount   int64     `json:"offer_amount"`
	Currency      string    `json:"currency"`
}

// TransactionWorkflowResult represents the result of a transaction workflow
type TransactionWorkflowResult struct {
	Success       bool      `json:"success"`
	TransactionID uuid.UUID `json:"transaction_id"`
	FinalAmount   int64     `json:"final_amount"`
	CompletedAt   time.Time `json:"completed_at"`
	Error         string    `json:"error,omitempty"`
}
