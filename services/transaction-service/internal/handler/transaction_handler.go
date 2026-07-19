package handler

import (
"net/http"
"strconv"

"github.com/gin-gonic/gin"
"github.com/google/uuid"
"github.com/realestate/transaction-service/internal/model"
"github.com/realestate/transaction-service/internal/service"
)

type TransactionHandler struct {
service *service.TransactionService
}

func NewTransactionHandler(service *service.TransactionService) *TransactionHandler {
return &TransactionHandler{service: service}
}

// RegisterRoutes registers all transaction routes
func (h *TransactionHandler) RegisterRoutes(r *gin.Engine) {
api := r.Group("/api/v1")
{
transactions := api.Group("/transactions")
{
transactions.POST("", h.CreateTransaction)
transactions.GET("", h.ListTransactions)
transactions.GET("/:id", h.GetTransaction)
transactions.PUT("/:id", h.UpdateTransaction)
transactions.DELETE("/:id", h.CancelTransaction)

// Transaction actions
transactions.POST("/:id/accept-offer", h.AcceptOffer)
transactions.POST("/:id/confirm-documents", h.ConfirmDocumentsSigned)

// Related resources
transactions.GET("/:id/documents", h.GetDocuments)
transactions.GET("/:id/events", h.GetEvents)
transactions.GET("/:id/escrow", h.GetEscrow)
}

// User-specific endpoints
api.GET("/buyers/:buyer_id/transactions", h.GetBuyerTransactions)
api.GET("/sellers/:seller_id/transactions", h.GetSellerTransactions)
}

// Health check
r.GET("/health", h.Health)
r.GET("/ready", h.Ready)
}

// CreateTransaction creates a new transaction
func (h *TransactionHandler) CreateTransaction(c *gin.Context) {
var req model.CreateTransactionRequest
if err := c.ShouldBindJSON(&req); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

transaction, err := h.service.CreateTransaction(c.Request.Context(), &req)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusCreated, transaction)
}

// GetTransaction retrieves a transaction by ID
func (h *TransactionHandler) GetTransaction(c *gin.Context) {
idStr := c.Param("id")
id, err := uuid.Parse(idStr)
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transaction ID"})
return
}

transaction, err := h.service.GetTransaction(c.Request.Context(), id)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
return
}

c.JSON(http.StatusOK, transaction)
}

// Health check endpoint
func (h *TransactionHandler) Health(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{"status": "healthy"})
}

// Ready check endpoint
func (h *TransactionHandler) Ready(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

// Additional methods abbreviated for space...
func (h *TransactionHandler) UpdateTransaction(c *gin.Context) {}
func (h *TransactionHandler) ListTransactions(c *gin.Context) {}
func (h *TransactionHandler) GetBuyerTransactions(c *gin.Context) {}
func (h *TransactionHandler) GetSellerTransactions(c *gin.Context) {}
func (h *TransactionHandler) AcceptOffer(c *gin.Context) {}
func (h *TransactionHandler) ConfirmDocumentsSigned(c *gin.Context) {}
func (h *TransactionHandler) GetDocuments(c *gin.Context) {}
func (h *TransactionHandler) GetEvents(c *gin.Context) {}
func (h *TransactionHandler) GetEscrow(c *gin.Context) {}
func (h *TransactionHandler) CancelTransaction(c *gin.Context) {}
