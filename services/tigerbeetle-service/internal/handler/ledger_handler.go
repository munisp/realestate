package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/realestate-platform/tigerbeetle-service/internal/service"
	"github.com/tigerbeetle/tigerbeetle-go/pkg/types"
	"go.uber.org/zap"
)

// LedgerHandler handles HTTP requests for ledger operations
type LedgerHandler struct {
	service *service.LedgerService
	logger  *zap.Logger
}

// NewLedgerHandler creates a new ledger handler
func NewLedgerHandler(service *service.LedgerService, logger *zap.Logger) *LedgerHandler {
	return &LedgerHandler{
		service: service,
		logger:  logger,
	}
}

// CreateAccountRequest represents a request to create an account
type CreateAccountRequest struct {
	UserID      string `json:"user_id" binding:"required"`
	AccountType uint16 `json:"account_type" binding:"required"`
}

// CreateAccountResponse represents the response for account creation
type CreateAccountResponse struct {
	AccountID string `json:"account_id"`
	UserID    string `json:"user_id"`
}

// CreateAccount handles account creation
func (h *LedgerHandler) CreateAccount(c *gin.Context) {
	var req CreateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	accountID, err := h.service.CreateUserAccount(c.Request.Context(), req.UserID, req.AccountType)
	if err != nil {
		h.logger.Error("Failed to create account", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	c.JSON(http.StatusCreated, CreateAccountResponse{
		AccountID: accountID.String(),
		UserID:    req.UserID,
	})
}

// DepositRequest represents a deposit request
type DepositRequest struct {
	AccountID string `json:"account_id" binding:"required"`
	Amount    uint64 `json:"amount" binding:"required,gt=0"`
}

// TransferRequest represents a transfer request
type TransferRequest struct{
	FromAccountID string `json:"from_account_id" binding:"required"`
	ToAccountID   string `json:"to_account_id" binding:"required"`
	Amount        uint64 `json:"amount" binding:"required,gt=0"`
	TransferType  uint16 `json:"transfer_type"`
}

// TransferResponse represents the response for a transfer
type TransferResponse struct {
	TransferID string `json:"transfer_id"`
	Status     string `json:"status"`
}

// PropertyTransactionRequest represents a property transaction request
type PropertyTransactionRequest struct {
	TransactionID   string  `json:"transaction_id" binding:"required"`
	BuyerAccountID  string  `json:"buyer_account_id" binding:"required"`
	SellerAccountID string  `json:"seller_account_id" binding:"required"`
	Amount          uint64  `json:"amount" binding:"required,gt=0"`
	Commission      uint64  `json:"commission"`
	Fees            uint64  `json:"fees"`
	PropertyID      string  `json:"property_id" binding:"required"`
}

// ExecutePropertyTransaction handles property transaction execution
func (h *LedgerHandler) ExecutePropertyTransaction(c *gin.Context) {
	var req PropertyTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	transactionID, err := uuid.Parse(req.TransactionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	buyerAccountID, err := h.parseUint128(req.BuyerAccountID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid buyer account ID"})
		return
	}

	sellerAccountID, err := h.parseUint128(req.SellerAccountID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid seller account ID"})
		return
	}

	tx := service.PropertyTransaction{
		TransactionID:   transactionID,
		BuyerAccountID:  buyerAccountID,
		SellerAccountID: sellerAccountID,
		Amount:          types.Uint128{Lo: req.Amount, Hi: 0},
		Commission:      types.Uint128{Lo: req.Commission, Hi: 0},
		Fees:            types.Uint128{Lo: req.Fees, Hi: 0},
		PropertyID:      req.PropertyID,
	}

	err = h.service.ExecutePropertyTransaction(c.Request.Context(), tx)
	if err != nil {
		h.logger.Error("Failed to execute property transaction", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"transaction_id": req.TransactionID,
		"status":         "completed",
		"message":        "Property transaction executed successfully",
	})
}

// GetBalanceRequest represents a balance inquiry request
type GetBalanceRequest struct {
	AccountID string `json:"account_id" binding:"required"`
}

// GetBalanceResponse represents the balance inquiry response
type GetBalanceResponse struct {
	AccountID string `json:"account_id"`
	Balance   string `json:"balance"`
}

// GetBalance retrieves account balance
func (h *LedgerHandler) GetBalance(c *gin.Context) {
	accountIDStr := c.Param("account_id")
	
	accountID, err := h.parseUint128(accountIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	balance, err := h.service.GetAccountBalance(c.Request.Context(), accountID)
	if err != nil {
		h.logger.Error("Failed to get account balance", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve balance"})
		return
	}

	c.JSON(http.StatusOK, GetBalanceResponse{
		AccountID: accountIDStr,
		Balance:   balance.String(),
	})
}

// HealthCheck handles health check requests
func (h *LedgerHandler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "tigerbeetle-ledger",
	})
}

// Helper functions

func (h *LedgerHandler) parseUint128(str string) (types.Uint128, error) {
	// Parse UUID string to Uint128
	id, err := uuid.Parse(str)
	if err != nil {
		return types.Uint128{}, err
	}
	
	bytes := [16]byte(id)
	return types.Uint128{
		Lo: uint64(bytes[0]) | uint64(bytes[1])<<8 | uint64(bytes[2])<<16 | uint64(bytes[3])<<24 |
			uint64(bytes[4])<<32 | uint64(bytes[5])<<40 | uint64(bytes[6])<<48 | uint64(bytes[7])<<56,
		Hi: uint64(bytes[8]) | uint64(bytes[9])<<8 | uint64(bytes[10])<<16 | uint64(bytes[11])<<24 |
			uint64(bytes[12])<<32 | uint64(bytes[13])<<40 | uint64(bytes[14])<<48 | uint64(bytes[15])<<56,
	}, nil
}
