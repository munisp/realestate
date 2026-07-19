package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// Configuration
var (
	MojaloopAPIURL      = getEnv("MOJALOOP_API_URL", "http://localhost:4001")
	MojaloopAPIKey      = getEnv("MOJALOOP_API_KEY", "")
	MojaloopFSPID       = getEnv("MOJALOOP_FSP_ID", "escrow_fsp")
	MojaloopWebhookSecret = getEnv("MOJALOOP_WEBHOOK_SECRET", "change_me_in_production")
)

// Supported currencies
var SupportedCurrencies = []string{"KES", "UGX", "TZS", "RWF", "NGN", "ZAR", "GHS"}

// EscrowData represents escrow information
type EscrowData struct {
	EscrowID         string                 `json:"escrow_id"`
	ProviderEscrowID string                 `json:"provider_escrow_id"`
	QuoteID          string                 `json:"quote_id"`
	TransactionID    string                 `json:"transaction_id"`
	TransferID       string                 `json:"transfer_id"`
	Amount           int64                  `json:"amount"`
	Currency         string                 `json:"currency"`
	BuyerID          string                 `json:"buyer_id"`
	SellerID         string                 `json:"seller_id"`
	Status           string                 `json:"status"`
	Condition        string                 `json:"condition"`
	ILPPacket        string                 `json:"ilp_packet"`
	Metadata         map[string]interface{} `json:"metadata"`
	CreatedAt        time.Time              `json:"created_at"`
	HeldAmount       int64                  `json:"held_amount"`
	ReleasedAmount   int64                  `json:"released_amount"`
	RefundedAmount   int64                  `json:"refunded_amount"`
}

// EscrowStore manages escrow state
type EscrowStore struct {
	mu      sync.RWMutex
	escrows map[string]*EscrowData
}

func NewEscrowStore() *EscrowStore {
	return &EscrowStore{
		escrows: make(map[string]*EscrowData),
	}
}

func (s *EscrowStore) Set(escrowID string, data *EscrowData) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.escrows[escrowID] = data
}

func (s *EscrowStore) Get(escrowID string) (*EscrowData, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	data, exists := s.escrows[escrowID]
	return data, exists
}

func (s *EscrowStore) GetByProviderID(providerEscrowID string) (*EscrowData, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, data := range s.escrows {
		if data.ProviderEscrowID == providerEscrowID {
			return data, true
		}
	}
	return nil, false
}

// pgStore is the PostgreSQL-backed escrow store (initialized in main)
var pgMojaloopStore *PostgresMojaloopStore

// memStore is the in-memory fallback store
var memStore = NewEscrowStore()

// storeSet stores an escrow in PostgreSQL (or in-memory fallback)
func storeSet(escrowID string, data *EscrowData) {
if pgMojaloopStore != nil {
data)
} else {
data)
}
}

// storeGet retrieves an escrow by ID
func storeGet(escrowID string) (*EscrowData, bool) {
if pgMojaloopStore != nil {
 pgMojaloopStore.Get(escrowID)
}
return memStore.Get(escrowID)
}

// storeGetByProviderID retrieves an escrow by provider escrow ID
func storeGetByProviderID(providerEscrowID string) (*EscrowData, bool) {
if pgMojaloopStore != nil {
Search by transfer_id which is the provider escrow ID in mojaloop
 pgMojaloopStore.FindByTransferID(providerEscrowID)
}
return memStore.GetByProviderID(providerEscrowID)
}

// storeFindByTransferID finds an escrow by Mojaloop transfer ID
func storeFindByTransferID(transferID string) (*EscrowData, bool) {
if pgMojaloopStore != nil {
 pgMojaloopStore.FindByTransferID(transferID)
}
memStore.mu.RLock()
defer memStore.mu.RUnlock()
for _, data := range memStore.escrows {
data.TransferID == transferID {
 data, true
 nil, false
}

// ILP functions
func generateILPPacket(amount float64, currency string) string {
	data := fmt.Sprintf("%f:%s:%s", amount, currency, time.Now().UTC().Format(time.RFC3339))
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

func generateCondition(ilpPacket string) string {
	hash := sha256.Sum256([]byte(ilpPacket))
	return hex.EncodeToString(hash[:])
}

func generateFulfilment(condition string) string {
	hash := sha256.Sum256([]byte(condition))
	return hex.EncodeToString(hash[:])
}

// Mojaloop API client
type MojaloopClient struct {
	baseURL string
	apiKey  string
	fspID   string
	client  *http.Client
}

func NewMojaloopClient() *MojaloopClient {
	return &MojaloopClient{
		baseURL: MojaloopAPIURL,
		apiKey:  MojaloopAPIKey,
		fspID:   MojaloopFSPID,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *MojaloopClient) createQuote(payload map[string]interface{}) (map[string]interface{}, error) {
	return c.doRequest("POST", "/quotes", payload)
}

func (c *MojaloopClient) createTransfer(payload map[string]interface{}) (map[string]interface{}, error) {
	return c.doRequest("POST", "/transfers", payload)
}

func (c *MojaloopClient) updateTransfer(transferID string, payload map[string]interface{}) (map[string]interface{}, error) {
	return c.doRequest("PUT", fmt.Sprintf("/transfers/%s", transferID), payload)
}

func (c *MojaloopClient) doRequest(method, path string, payload map[string]interface{}) (map[string]interface{}, error) {
	url := c.baseURL + path

	var body io.Reader
	if payload != nil {
		jsonData, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		body = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("FSPIOP-Source", c.fspID)
	req.Header.Set("FSPIOP-Destination", c.fspID)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result, nil
}

// HTTP Handlers
type Handler struct {
	client *MojaloopClient
}

func NewHandler(client *MojaloopClient) *Handler {
	return &Handler{client: client}
}

type CreateEscrowRequest struct {
	EscrowID string                 `json:"escrow_id"`
	Amount   int64                  `json:"amount"`
	Currency string                 `json:"currency"`
	BuyerID  string                 `json:"buyer_id"`
	SellerID string                 `json:"seller_id"`
	Metadata map[string]interface{} `json:"metadata"`
}

func (h *Handler) CreateEscrow(w http.ResponseWriter, r *http.Request) {
	var req CreateEscrowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate currency
	if !contains(SupportedCurrencies, req.Currency) {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("currency %s not supported", req.Currency))
		return
	}

	// Convert amount to decimal
	amountDecimal := float64(req.Amount) / 100.0

	// Generate IDs
	quoteID := fmt.Sprintf("quote_%s_%s", req.EscrowID, uuid.New().String()[:8])
	transactionID := fmt.Sprintf("tx_%s_%s", req.EscrowID, uuid.New().String()[:8])

	// Create quote
	quotePayload := map[string]interface{}{
		"quoteId":       quoteID,
		"transactionId": transactionID,
		"transactionRequestId": fmt.Sprintf("txreq_%s", req.EscrowID),
		"payee": map[string]interface{}{
			"partyIdInfo": map[string]interface{}{
				"partyIdType":    "MSISDN",
				"partyIdentifier": req.SellerID,
				"fspId":          h.client.fspID,
			},
		},
		"payer": map[string]interface{}{
			"partyIdInfo": map[string]interface{}{
				"partyIdType":    "MSISDN",
				"partyIdentifier": req.BuyerID,
				"fspId":          h.client.fspID,
			},
		},
		"amountType": "SEND",
		"amount": map[string]interface{}{
			"amount":   fmt.Sprintf("%.2f", amountDecimal),
			"currency": req.Currency,
		},
		"transactionType": map[string]interface{}{
			"scenario":      "TRANSFER",
			"initiator":     "PAYER",
			"initiatorType": "CONSUMER",
		},
		"note": fmt.Sprintf("Escrow payment for transaction %s", req.EscrowID),
	}

	log.Printf("Creating quote for escrow %s", req.EscrowID)
	quoteResp, err := h.client.createQuote(quotePayload)
	if err != nil {
		log.Printf("Quote creation failed: %v", err)
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create quote: %v", err))
		return
	}

	// Generate ILP packet and condition
	ilpPacket := generateILPPacket(amountDecimal, req.Currency)
	condition := generateCondition(ilpPacket)

	// Create transfer
	transferID := fmt.Sprintf("transfer_%s_%s", req.EscrowID, uuid.New().String()[:8])

	transferPayload := map[string]interface{}{
		"transferId": transferID,
		"payerFsp":   h.client.fspID,
		"payeeFsp":   h.client.fspID,
		"amount": map[string]interface{}{
			"amount":   fmt.Sprintf("%.2f", amountDecimal),
			"currency": req.Currency,
		},
		"ilpPacket":  ilpPacket,
		"condition":  condition,
		"expiration": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
	}

	log.Printf("Creating transfer for escrow %s", req.EscrowID)
	transferResp, err := h.client.createTransfer(transferPayload)
	if err != nil {
		log.Printf("Transfer creation failed: %v", err)
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create transfer: %v", err))
		return
	}

	// Store escrow data
	escrowData := &EscrowData{
		EscrowID:         req.EscrowID,
		ProviderEscrowID: transferID,
		QuoteID:          quoteID,
		TransactionID:    transactionID,
		TransferID:       transferID,
		Amount:           req.Amount,
		Currency:         req.Currency,
		BuyerID:          req.BuyerID,
		SellerID:         req.SellerID,
		Status:           "RESERVED",
		Condition:        condition,
		ILPPacket:        ilpPacket,
		Metadata:         req.Metadata,
		CreatedAt:        time.Now(),
		HeldAmount:       req.Amount,
		ReleasedAmount:   0,
		RefundedAmount:   0,
	}

	storeSet(req.EscrowID, escrowData)

	log.Printf("Escrow %s created successfully", req.EscrowID)

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"success":            true,
		"provider_escrow_id": transferID,
		"status":             "RESERVED",
		"metadata": map[string]interface{}{
			"quote_id":       quoteID,
			"transaction_id": transactionID,
			"transfer_id":    transferID,
			"condition":      condition,
			"quote_response": quoteResp,
			"transfer_response": transferResp,
		},
	})
}

type ReleaseEscrowRequest struct {
	ProviderEscrowID string `json:"provider_escrow_id"`
	Amount           *int64 `json:"amount,omitempty"`
}

func (h *Handler) ReleaseEscrow(w http.ResponseWriter, r *http.Request) {
	var req ReleaseEscrowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	escrowData, exists := storeGetByProviderID(req.ProviderEscrowID)
	if !exists {
		respondError(w, http.StatusNotFound, "escrow not found")
		return
	}

	releaseAmount := escrowData.HeldAmount
	if req.Amount != nil {
		releaseAmount = *req.Amount
	}

	if releaseAmount > escrowData.HeldAmount {
		respondError(w, http.StatusBadRequest, "release amount exceeds held amount")
		return
	}

	// Generate fulfilment
	fulfilment := generateFulfilment(escrowData.Condition)

	// Fulfill transfer
	fulfilPayload := map[string]interface{}{
		"fulfilment":        fulfilment,
		"transferState":     "COMMITTED",
		"completedTimestamp": time.Now().UTC().Format(time.RFC3339) + "Z",
	}

	log.Printf("Releasing escrow %s", req.ProviderEscrowID)
	_, err := h.client.updateTransfer(escrowData.TransferID, fulfilPayload)
	if err != nil {
		log.Printf("Transfer fulfilment failed: %v", err)
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to release funds: %v", err))
		return
	}

	// Update escrow state
	escrowData.Status = "COMMITTED"
	escrowData.HeldAmount -= releaseAmount
	escrowData.ReleasedAmount += releaseAmount
	storeSet(escrowData.EscrowID, escrowData)

	log.Printf("Escrow %s released successfully", req.ProviderEscrowID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success":        true,
		"transaction_id": escrowData.TransferID,
		"amount":         releaseAmount,
	})
}

type RefundEscrowRequest struct {
	ProviderEscrowID string `json:"provider_escrow_id"`
	Amount           *int64 `json:"amount,omitempty"`
}

func (h *Handler) RefundEscrow(w http.ResponseWriter, r *http.Request) {
	var req RefundEscrowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	escrowData, exists := storeGetByProviderID(req.ProviderEscrowID)
	if !exists {
		respondError(w, http.StatusNotFound, "escrow not found")
		return
	}

	refundAmount := escrowData.HeldAmount
	if req.Amount != nil {
		refundAmount = *req.Amount
	}

	if refundAmount > escrowData.HeldAmount {
		respondError(w, http.StatusBadRequest, "refund amount exceeds held amount")
		return
	}

	// Abort transfer
	abortPayload := map[string]interface{}{
		"transferState": "ABORTED",
		"errorInformation": map[string]interface{}{
			"errorCode":        "3100",
			"errorDescription": "Transaction cancelled by buyer",
		},
	}

	log.Printf("Refunding escrow %s", req.ProviderEscrowID)
	_, err := h.client.updateTransfer(escrowData.TransferID, abortPayload)
	if err != nil {
		log.Printf("Transfer abort failed: %v", err)
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to refund: %v", err))
		return
	}

	// Update escrow state
	escrowData.Status = "ABORTED"
	escrowData.HeldAmount -= refundAmount
	escrowData.RefundedAmount += refundAmount
	storeSet(escrowData.EscrowID, escrowData)

	log.Printf("Escrow %s refunded successfully", req.ProviderEscrowID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success":        true,
		"transaction_id": escrowData.TransferID,
		"amount":         refundAmount,
	})
}

func (h *Handler) GetEscrowStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	providerEscrowID := vars["provider_escrow_id"]

	escrowData, exists := storeGetByProviderID(providerEscrowID)
	if !exists {
		respondError(w, http.StatusNotFound, "escrow not found")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"escrow_id":       providerEscrowID,
		"status":          escrowData.Status,
		"held_amount":     escrowData.HeldAmount,
		"released_amount": escrowData.ReleasedAmount,
		"refunded_amount": escrowData.RefundedAmount,
		"currency":        escrowData.Currency,
		"created_at":      escrowData.CreatedAt.Format(time.RFC3339),
	})
}

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":               "healthy",
		"service":              "mojaloop-payment-provider",
		"mojaloop_api":         "connected",
		"supported_currencies": SupportedCurrencies,
		"timestamp":            time.Now().Format(time.RFC3339),
	})
}

// Webhook handlers

type WebhookPayload struct {
	EventType string                 `json:"event_type"`
	Timestamp string                 `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	// Verify webhook signature
	signature := r.Header.Get("X-Mojaloop-Signature")
	if signature == "" {
		respondError(w, http.StatusUnauthorized, "missing signature")
		return
	}

	// TODO: Verify signature with MOJALOOP_WEBHOOK_SECRET
	// For now, just log it
	log.Printf("Received webhook with signature: %s", signature)

	var payload WebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	log.Printf("Webhook event: %s at %s", payload.EventType, payload.Timestamp)

	// Handle different event types
	switch payload.EventType {
	case "transfer.committed":
		h.handleTransferCommitted(payload.Data)
	case "transfer.aborted":
		h.handleTransferAborted(payload.Data)
	case "quote.response":
		h.handleQuoteResponse(payload.Data)
	default:
		log.Printf("Unknown event type: %s", payload.EventType)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "webhook processed",
	})
}

func (h *Handler) handleTransferCommitted(data map[string]interface{}) {
	transferID, ok := data["transfer_id"].(string)
	if !ok {
		log.Printf("Invalid transfer_id in webhook data")
		return
	}

	// Find escrow by transfer ID
	store.mu.RLock()
	var escrowData *EscrowData
	for _, data := range store.escrows {
		if data.TransferID == transferID {
			escrowData = data
			break
		}
	}
	store.mu.RUnlock()

	if escrowData == nil {
		log.Printf("Escrow not found for transfer: %s", transferID)
		return
	}

	// Update escrow status
	escrowData.Status = "COMMITTED"
	storeSet(escrowData.EscrowID, escrowData)

	log.Printf("Transfer committed: %s (escrow: %s)", transferID, escrowData.EscrowID)

	// Notify TypeScript backend about the committed transfer
	go notifyBackend(escrowData.EscrowID, "committed")
}

func (h *Handler) handleTransferAborted(data map[string]interface{}) {
	transferID, ok := data["transfer_id"].(string)
	if !ok {
		log.Printf("Invalid transfer_id in webhook data")
		return
	}

	// Find escrow by transfer ID
	store.mu.RLock()
	var escrowData *EscrowData
	for _, data := range store.escrows {
		if data.TransferID == transferID {
			escrowData = data
			break
		}
	}
	store.mu.RUnlock()

	if escrowData == nil {
		log.Printf("Escrow not found for transfer: %s", transferID)
		return
	}

	// Update escrow status
	escrowData.Status = "ABORTED"
	storeSet(escrowData.EscrowID, escrowData)

	log.Printf("Transfer aborted: %s (escrow: %s)", transferID, escrowData.EscrowID)

	// Notify TypeScript backend about the aborted transfer
	go notifyBackend(escrowData.EscrowID, "aborted")
}

func (h *Handler) handleQuoteResponse(data map[string]interface{}) {
	quoteID, ok := data["quote_id"].(string)
	if !ok {
		log.Printf("Invalid quote_id in webhook data")
		return
	}

	log.Printf("Quote response received: %s", quoteID)

	// Find escrow by quote ID
	store.mu.RLock()
	var escrowData *EscrowData
	for _, data := range store.escrows {
		if data.QuoteID == quoteID {
			escrowData = data
			break
		}
	}
	store.mu.RUnlock()

	if escrowData != nil {
		log.Printf("Quote response for escrow: %s", escrowData.EscrowID)
	}
}

func (h *Handler) GetInfo(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"name":                 "mojaloop",
		"display_name":         "Mojaloop",
		"supported_currencies": SupportedCurrencies,
		"capabilities":         []string{"escrow", "mobile_money", "cross_border", "instant_transfer"},
		"regions":              []string{"Africa", "Asia"},
		"payment_methods":      []string{"mobile_money", "bank_transfer"},
		"settlement_time":      "instant",
		"fees": map[string]interface{}{
			"escrow_creation": "0%",
			"release":         "0%",
			"refund":          "0%",
			"note":            "FSP fees may apply",
		},
	})
}

// Helper functions
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]interface{}{
		"success": false,
		"error":   message,
	})
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("[%s] %s %s - %v", r.Method, r.RequestURI, r.RemoteAddr, time.Since(start))
	})
}

func main() {
	port := getEnv("PORT", "5010")

	client := NewMojaloopClient()
	handler := NewHandler(client)

	router := mux.NewRouter()

	// Health and info
	router.HandleFunc("/health", handler.HealthCheck).Methods("GET")
	router.HandleFunc("/info", handler.GetInfo).Methods("GET")
	// Metrics endpoint
	router.Handle("/metrics", promhttp.Handler()).Methods("GET")

	// Escrow endpoints
	router.HandleFunc("/escrow/create", handler.CreateEscrow).Methods("POST")
	router.HandleFunc("/escrow/release", handler.ReleaseEscrow).Methods("POST")
	router.HandleFunc("/escrow/refund", handler.RefundEscrow).Methods("POST")
	router.HandleFunc("/escrow/status/{provider_escrow_id}", handler.GetEscrowStatus).Methods("GET")

	// Webhook endpoint
	router.HandleFunc("/webhooks/mojaloop", handler.HandleWebhook).Methods("POST")

	// Apply middleware
	router.Use(corsMiddleware)
	router.Use(loggingMiddleware)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("Starting Mojaloop Payment Provider Service on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
