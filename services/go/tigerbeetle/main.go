package main

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	tb "github.com/tigerbeetle/tigerbeetle-go"
	tb_types "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
)

// Configuration
var (
	TigerBeetleClusterID = getEnvInt("TIGERBEETLE_CLUSTER_ID", 0)
	TigerBeetleAddresses = getEnv("TIGERBEETLE_ADDRESSES", "127.0.0.1:3000")
)

// Ledger and account codes
const (
	EscrowLedger         uint32 = 1
	PropertyLedger       uint32 = 2
	BuyerAccount         uint16 = 1
	SellerAccount        uint16 = 2
	EscrowAccount        uint16 = 3
	PlatformFeeAccount   uint16 = 4
	EscrowHold           uint16 = 1
	EscrowRelease        uint16 = 2
	EscrowRefund         uint16 = 3
	PlatformFee          uint16 = 4
)

// Supported currencies
var SupportedCurrencies = []string{"USD", "EUR", "GBP", "NGN", "KES", "ZAR"}

// EscrowMetadata stores escrow information
type EscrowMetadata struct {
	EscrowID         string                 `json:"escrow_id"`
	EscrowAccountID  tb_types.Uint128       `json:"escrow_account_id"`
	BuyerID          string                 `json:"buyer_id"`
	BuyerAccountID   tb_types.Uint128       `json:"buyer_account_id"`
	SellerID         string                 `json:"seller_id"`
	SellerAccountID  tb_types.Uint128       `json:"seller_account_id"`
	Amount           int64                  `json:"amount"`
	Currency         string                 `json:"currency"`
	Status           string                 `json:"status"`
	HoldTransferID   tb_types.Uint128       `json:"hold_transfer_id"`
	Metadata         map[string]interface{} `json:"metadata"`
	CreatedAt        time.Time              `json:"created_at"`
	HeldAmount       int64                  `json:"held_amount"`
	ReleasedAmount   int64                  `json:"released_amount"`
	RefundedAmount   int64                  `json:"refunded_amount"`
}

// EscrowStore manages escrow metadata
type EscrowStore struct {
	mu      sync.RWMutex
	escrows map[string]*EscrowMetadata
}

func NewEscrowStore() *EscrowStore {
	return &EscrowStore{
		escrows: make(map[string]*EscrowMetadata),
	}
}

func (s *EscrowStore) Set(escrowID string, data *EscrowMetadata) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.escrows[escrowID] = data
}

func (s *EscrowStore) Get(escrowID string) (*EscrowMetadata, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	data, exists := s.escrows[escrowID]
	return data, exists
}

func (s *EscrowStore) GetByAccountID(accountID tb_types.Uint128) (*EscrowMetadata, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, data := range s.escrows {
		if data.EscrowAccountID == accountID {
			return data, true
		}
	}
	return nil, false
}

var store = NewEscrowStore()

// TigerBeetle client wrapper
type TigerBeetleClient struct {
	client tb.Client
}

func NewTigerBeetleClient() (*TigerBeetleClient, error) {
	addresses := []string{TigerBeetleAddresses}
	
	client, err := tb.NewClient(uint128FromInt(uint64(TigerBeetleClusterID)), addresses)
	if err != nil {
		return nil, fmt.Errorf("failed to create TigerBeetle client: %w", err)
	}

	return &TigerBeetleClient{client: client}, nil
}

func (c *TigerBeetleClient) Close() {
	c.client.Close()
}

func (c *TigerBeetleClient) CreateAccounts(accounts []tb_types.Account) error {
	results, err := c.client.CreateAccounts(accounts)
	if err != nil {
		return fmt.Errorf("failed to create accounts: %w", err)
	}

	if len(results) > 0 {
		// Check for errors (ignore "exists" errors)
		for _, result := range results {
			if result.Result != tb_types.AccountExistsWithDifferentUserData128 &&
			   result.Result != tb_types.AccountExists {
				return fmt.Errorf("account creation error at index %d: %v", result.Index, result.Result)
			}
		}
	}

	return nil
}

func (c *TigerBeetleClient) CreateTransfers(transfers []tb_types.Transfer) error {
	results, err := c.client.CreateTransfers(transfers)
	if err != nil {
		return fmt.Errorf("failed to create transfers: %w", err)
	}

	if len(results) > 0 {
		return fmt.Errorf("transfer creation error at index %d: %v", results[0].Index, results[0].Result)
	}

	return nil
}

func (c *TigerBeetleClient) LookupAccounts(accountIDs []tb_types.Uint128) ([]tb_types.Account, error) {
	accounts, err := c.client.LookupAccounts(accountIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup accounts: %w", err)
	}
	return accounts, nil
}

// Helper functions
func generateAccountID(prefix, identifier string) tb_types.Uint128 {
	hash := sha256.Sum256([]byte(prefix + ":" + identifier))
	return uint128FromBytes(hash[:16])
}

func generateTransferID() tb_types.Uint128 {
	timestamp := uint64(time.Now().UnixNano() / 1000) // microseconds
	random := uuid.New()
	
	var bytes [16]byte
	binary.BigEndian.PutUint64(bytes[0:8], timestamp)
	copy(bytes[8:16], random[:8])
	
	return uint128FromBytes(bytes[:])
}

func uint128FromInt(val uint64) tb_types.Uint128 {
	return tb_types.Uint128{Lo: val, Hi: 0}
}

func uint128FromBytes(b []byte) tb_types.Uint128 {
	if len(b) < 16 {
		return tb_types.Uint128{}
	}
	return tb_types.Uint128{
		Lo: binary.BigEndian.Uint64(b[8:16]),
		Hi: binary.BigEndian.Uint64(b[0:8]),
	}
}

func uint128ToString(u tb_types.Uint128) string {
	return fmt.Sprintf("%d", u.Lo) // Simplified for display
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

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

// HTTP Handlers
type Handler struct {
	client *TigerBeetleClient
}

func NewHandler(client *TigerBeetleClient) *Handler {
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

	// Generate account IDs
	escrowAccountID := generateAccountID("escrow", req.EscrowID)
	buyerAccountID := generateAccountID("buyer", req.BuyerID)
	sellerAccountID := generateAccountID("seller", req.SellerID)

	// Create escrow account
	escrowAccount := tb_types.Account{
		ID:     escrowAccountID,
		Ledger: EscrowLedger,
		Code:   EscrowAccount,
	}

	if err := h.client.CreateAccounts([]tb_types.Account{escrowAccount}); err != nil {
		log.Printf("Error creating escrow account: %v", err)
	}

	// Ensure buyer and seller accounts exist
	buyerAccount := tb_types.Account{
		ID:     buyerAccountID,
		Ledger: EscrowLedger,
		Code:   BuyerAccount,
	}
	sellerAccount := tb_types.Account{
		ID:     sellerAccountID,
		Ledger: EscrowLedger,
		Code:   SellerAccount,
	}

	if err := h.client.CreateAccounts([]tb_types.Account{buyerAccount, sellerAccount}); err != nil {
		log.Printf("Error creating buyer/seller accounts: %v", err)
	}

	// Create transfer from buyer to escrow (hold funds)
	transferID := generateTransferID()

	transfer := tb_types.Transfer{
		ID:              transferID,
		DebitAccountID:  buyerAccountID,
		CreditAccountID: escrowAccountID,
		Amount:          uint64(req.Amount),
		Ledger:          EscrowLedger,
		Code:            EscrowHold,
	}

	if err := h.client.CreateTransfers([]tb_types.Transfer{transfer}); err != nil {
		log.Printf("Error creating transfer: %v", err)
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to hold funds: %v", err))
		return
	}

	// Store escrow metadata
	metadata := &EscrowMetadata{
		EscrowID:        req.EscrowID,
		EscrowAccountID: escrowAccountID,
		BuyerID:         req.BuyerID,
		BuyerAccountID:  buyerAccountID,
		SellerID:        req.SellerID,
		SellerAccountID: sellerAccountID,
		Amount:          req.Amount,
		Currency:        req.Currency,
		Status:          "held",
		HoldTransferID:  transferID,
		Metadata:        req.Metadata,
		CreatedAt:       time.Now(),
		HeldAmount:      req.Amount,
		ReleasedAmount:  0,
		RefundedAmount:  0,
	}

	store.Set(req.EscrowID, metadata)

	log.Printf("Escrow %s created successfully", req.EscrowID)

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"success":            true,
		"provider_escrow_id": uint128ToString(escrowAccountID),
		"status":             "held",
		"metadata": map[string]interface{}{
			"escrow_account_id": uint128ToString(escrowAccountID),
			"transfer_id":       uint128ToString(transferID),
		},
	})
}

type ReleaseEscrowRequest struct{
	ProviderEscrowID string `json:"provider_escrow_id"`
	Amount           *int64 `json:"amount,omitempty"`
}

func (h *Handler) ReleaseEscrow(w http.ResponseWriter, r *http.Request) {
	var req ReleaseEscrowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Find escrow metadata by searching through store
	var metadata *EscrowMetadata
	var found bool
	
	store.mu.RLock()
	for _, m := range store.escrows {
		if uint128ToString(m.EscrowAccountID) == req.ProviderEscrowID {
			metadata = m
			found = true
			break
		}
	}
	store.mu.RUnlock()

	if !found {
		respondError(w, http.StatusNotFound, "escrow not found")
		return
	}

	// Get current escrow balance
	accounts, err := h.client.LookupAccounts([]tb_types.Uint128{metadata.EscrowAccountID})
	if err != nil || len(accounts) == 0 {
		respondError(w, http.StatusNotFound, "escrow account not found")
		return
	}

	currentBalance := int64(accounts[0].CreditsPosted - accounts[0].DebitsPosted)

	releaseAmount := currentBalance
	if req.Amount != nil {
		releaseAmount = *req.Amount
	}

	if releaseAmount > currentBalance {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("release amount (%d) exceeds held amount (%d)", releaseAmount, currentBalance))
		return
	}

	// Create transfer from escrow to seller
	transferID := generateTransferID()

	transfer := tb_types.Transfer{
		ID:              transferID,
		DebitAccountID:  metadata.EscrowAccountID,
		CreditAccountID: metadata.SellerAccountID,
		Amount:          uint64(releaseAmount),
		Ledger:          EscrowLedger,
		Code:            EscrowRelease,
	}

	if err := h.client.CreateTransfers([]tb_types.Transfer{transfer}); err != nil {
		log.Printf("Error releasing funds: %v", err)
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to release funds: %v", err))
		return
	}

	// Update metadata
	metadata.Status = "released"
	metadata.HeldAmount -= releaseAmount
	metadata.ReleasedAmount += releaseAmount
	store.Set(metadata.EscrowID, metadata)

	log.Printf("Escrow %s released successfully", req.ProviderEscrowID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success":        true,
		"transaction_id": uint128ToString(transferID),
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

	// Find escrow metadata
	var metadata *EscrowMetadata
	var found bool
	
	store.mu.RLock()
	for _, m := range store.escrows {
		if uint128ToString(m.EscrowAccountID) == req.ProviderEscrowID {
			metadata = m
			found = true
			break
		}
	}
	store.mu.RUnlock()

	if !found {
		respondError(w, http.StatusNotFound, "escrow not found")
		return
	}

	// Get current escrow balance
	accounts, err := h.client.LookupAccounts([]tb_types.Uint128{metadata.EscrowAccountID})
	if err != nil || len(accounts) == 0 {
		respondError(w, http.StatusNotFound, "escrow account not found")
		return
	}

	currentBalance := int64(accounts[0].CreditsPosted - accounts[0].DebitsPosted)

	refundAmount := currentBalance
	if req.Amount != nil {
		refundAmount = *req.Amount
	}

	if refundAmount > currentBalance {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("refund amount (%d) exceeds held amount (%d)", refundAmount, currentBalance))
		return
	}

	// Create transfer from escrow back to buyer
	transferID := generateTransferID()

	transfer := tb_types.Transfer{
		ID:              transferID,
		DebitAccountID:  metadata.EscrowAccountID,
		CreditAccountID: metadata.BuyerAccountID,
		Amount:          uint64(refundAmount),
		Ledger:          EscrowLedger,
		Code:            EscrowRefund,
	}

	if err := h.client.CreateTransfers([]tb_types.Transfer{transfer}); err != nil {
		log.Printf("Error refunding: %v", err)
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to refund: %v", err))
		return
	}

	// Update metadata
	metadata.Status = "refunded"
	metadata.HeldAmount -= refundAmount
	metadata.RefundedAmount += refundAmount
	store.Set(metadata.EscrowID, metadata)

	log.Printf("Escrow %s refunded successfully", req.ProviderEscrowID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success":        true,
		"transaction_id": uint128ToString(transferID),
		"amount":         refundAmount,
	})
}

func (h *Handler) GetEscrowStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	providerEscrowID := vars["provider_escrow_id"]

	// Find escrow metadata
	var metadata *EscrowMetadata
	var found bool
	
	store.mu.RLock()
	for _, m := range store.escrows {
		if uint128ToString(m.EscrowAccountID) == providerEscrowID {
			metadata = m
			found = true
			break
		}
	}
	store.mu.RUnlock()

	if !found {
		respondError(w, http.StatusNotFound, "escrow not found")
		return
	}

	// Get current balance from TigerBeetle
	accounts, err := h.client.LookupAccounts([]tb_types.Uint128{metadata.EscrowAccountID})
	var currentBalance int64
	if err == nil && len(accounts) > 0 {
		currentBalance = int64(accounts[0].CreditsPosted - accounts[0].DebitsPosted)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"escrow_id":       providerEscrowID,
		"status":          metadata.Status,
		"held_amount":     currentBalance,
		"released_amount": metadata.ReleasedAmount,
		"refunded_amount": metadata.RefundedAmount,
		"currency":        metadata.Currency,
		"created_at":      metadata.CreatedAt.Format(time.RFC3339),
	})
}

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	// Try to lookup a test account to verify connectivity
	status := "healthy"
	tbStatus := "connected"
	
	_, err := h.client.LookupAccounts([]tb_types.Uint128{uint128FromInt(1)})
	if err != nil {
		status = "degraded"
		tbStatus = "error"
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":               status,
		"service":              "tigerbeetle-payment-provider",
		"tigerbeetle":          tbStatus,
		"cluster_id":           TigerBeetleClusterID,
		"supported_currencies": SupportedCurrencies,
		"timestamp":            time.Now().Format(time.RFC3339),
	})
}

func (h *Handler) GetInfo(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"name":                 "tigerbeetle",
		"display_name":         "TigerBeetle",
		"supported_currencies": SupportedCurrencies,
		"capabilities":         []string{"escrow", "instant_transfer", "double_entry", "high_performance"},
		"regions":              []string{"Global"},
		"payment_methods":      []string{"ledger_transfer"},
		"settlement_time":      "instant (microseconds)",
		"performance": map[string]interface{}{
			"latency":     "< 1ms",
			"throughput":  "1M+ TPS",
			"consistency": "strict serializability",
		},
		"fees": map[string]interface{}{
			"escrow_creation": "0%",
			"release":         "0%",
			"refund":          "0%",
			"note":            "No transaction fees, infrastructure costs only",
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
	port := getEnv("PORT", "5011")

	client, err := NewTigerBeetleClient()
	if err != nil {
		log.Fatalf("Failed to initialize TigerBeetle client: %v", err)
	}
	defer client.Close()

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
		log.Printf("Starting TigerBeetle Payment Provider Service on port %s", port)
		log.Printf("Cluster ID: %d", TigerBeetleClusterID)
		log.Printf("Addresses: %s", TigerBeetleAddresses)
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
