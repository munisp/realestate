package main

import (
	"github.com/realestate/services/go/common"
	"context"
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

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// EscrowStatus represents the state of an escrow
type EscrowStatus string

const (
	StatusPending   EscrowStatus = "pending"
	StatusHeld      EscrowStatus = "held"
	StatusReleased  EscrowStatus = "released"
	StatusRefunded  EscrowStatus = "refunded"
	StatusCancelled EscrowStatus = "cancelled"
	StatusExpired   EscrowStatus = "expired"
)

// Escrow represents an escrow transaction
type Escrow struct {
	ID                string       `json:"id"`
	ProjectID         int          `json:"project_id"`
	Amount            int64        `json:"amount"`
	Currency          string       `json:"currency"`
	BuyerID           string       `json:"buyer_id"`
	SellerID          string       `json:"seller_id"`
	Status            EscrowStatus `json:"status"`
	ProviderName      string       `json:"provider_name"`
	ProviderEscrowID  string       `json:"provider_escrow_id"`
	HeldAmount        int64        `json:"held_amount"`
	ReleasedAmount    int64        `json:"released_amount"`
	RefundedAmount    int64        `json:"refunded_amount"`
	Metadata          interface{}  `json:"metadata,omitempty"`
	CreatedAt         time.Time    `json:"created_at"`
	UpdatedAt         time.Time    `json:"updated_at"`
	ExpiresAt         *time.Time   `json:"expires_at,omitempty"`
	DisputeReason     string       `json:"dispute_reason,omitempty"`
	DisputeResolvedAt *time.Time   `json:"dispute_resolved_at,omitempty"`
}

// StoreInterface defines the interface for escrow storage
type StoreInterface interface {
	Create(escrow *Escrow) error
	Get(id string) (*Escrow, error)
	Update(escrow *Escrow) error
	List(projectID int) []*Escrow
}

// EscrowStore manages escrow state in memory (use Redis in production)
type EscrowStore struct {
	mu      sync.RWMutex
	escrows map[string]*Escrow
}

// NewEscrowStore creates a new escrow store
func NewEscrowStore() *EscrowStore {
	return &EscrowStore{
		escrows: make(map[string]*Escrow),
	}
}

// Create adds a new escrow
func (s *EscrowStore) Create(escrow *Escrow) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.escrows[escrow.ID]; exists {
		return fmt.Errorf("escrow already exists: %s", escrow.ID)
	}

	escrow.CreatedAt = time.Now()
	escrow.UpdatedAt = time.Now()
	s.escrows[escrow.ID] = escrow
	return nil
}

// Get retrieves an escrow by ID
func (s *EscrowStore) Get(id string) (*Escrow, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	escrow, exists := s.escrows[id]
	if !exists {
		return nil, fmt.Errorf("escrow not found: %s", id)
	}
	return escrow, nil
}

// Update updates an existing escrow
func (s *EscrowStore) Update(escrow *Escrow) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.escrows[escrow.ID]; !exists {
		return fmt.Errorf("escrow not found: %s", escrow.ID)
	}

	escrow.UpdatedAt = time.Now()
	s.escrows[escrow.ID] = escrow
	return nil
}

// List returns all escrows for a project
func (s *EscrowStore) List(projectID int) []*Escrow {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*Escrow
	for _, escrow := range s.escrows {
		if escrow.ProjectID == projectID {
			result = append(result, escrow)
		}
	}
	return result
}

// EscrowService handles escrow business logic
type EscrowService struct {
	store StoreInterface
}

// NewEscrowService creates a new escrow service
func NewEscrowService(store StoreInterface) *EscrowService {
	return &EscrowService{store: store}
}

// CreateEscrow creates a new escrow
func (s *EscrowService) CreateEscrow(escrow *Escrow) error {
	// Validate escrow
	if escrow.Amount <= 0 {
		return fmt.Errorf("invalid amount: %d", escrow.Amount)
	}
	if escrow.Currency == "" {
		return fmt.Errorf("currency is required")
	}
	if escrow.BuyerID == "" {
		return fmt.Errorf("buyer_id is required")
	}
	if escrow.SellerID == "" {
		return fmt.Errorf("seller_id is required")
	}

	// Initialize amounts
	escrow.Status = StatusPending
	escrow.HeldAmount = 0
	escrow.ReleasedAmount = 0
	escrow.RefundedAmount = 0

	err := s.store.Create(escrow)
	if err == nil {
		escrowsCreatedTotal.Inc()
		escrowsByStatus.WithLabelValues(string(StatusPending)).Inc()
	}
	return err
}

// HoldFunds marks funds as held
func (s *EscrowService) HoldFunds(escrowID string, providerEscrowID string) error {
	escrow, err := s.store.Get(escrowID)
	if err != nil {
		return err
	}

	if escrow.Status != StatusPending {
		return fmt.Errorf("cannot hold funds for escrow in status: %s", escrow.Status)
	}

	escrowsByStatus.WithLabelValues(string(StatusPending)).Dec()
	escrow.Status = StatusHeld
	escrow.HeldAmount = escrow.Amount
	escrow.ProviderEscrowID = providerEscrowID

	err = s.store.Update(escrow)
	if err == nil {
		escrowsByStatus.WithLabelValues(string(StatusHeld)).Inc()
	}
	return err
}

// ReleaseFunds releases funds to seller
func (s *EscrowService) ReleaseFunds(escrowID string, amount int64) error {
	escrow, err := s.store.Get(escrowID)
	if err != nil {
		return err
	}

	if escrow.Status != StatusHeld {
		return fmt.Errorf("cannot release funds for escrow in status: %s", escrow.Status)
	}

	if amount > escrow.HeldAmount {
		return fmt.Errorf("release amount (%d) exceeds held amount (%d)", amount, escrow.HeldAmount)
	}

	escrow.HeldAmount -= amount
	escrow.ReleasedAmount += amount

	if escrow.HeldAmount == 0 {
		escrow.Status = StatusReleased
	}

	return s.store.Update(escrow)
}

// RefundFunds refunds funds to buyer
func (s *EscrowService) RefundFunds(escrowID string, amount int64) error {
	escrow, err := s.store.Get(escrowID)
	if err != nil {
		return err
	}

	if escrow.Status != StatusHeld {
		return fmt.Errorf("cannot refund funds for escrow in status: %s", escrow.Status)
	}

	if amount > escrow.HeldAmount {
		return fmt.Errorf("refund amount (%d) exceeds held amount (%d)", amount, escrow.HeldAmount)
	}

	escrow.HeldAmount -= amount
	escrow.RefundedAmount += amount

	if escrow.HeldAmount == 0 {
		escrow.Status = StatusRefunded
	}

	return s.store.Update(escrow)
}

// HTTP Handlers

type Handler struct {
	service *EscrowService
}

func NewHandler(service *EscrowService) *Handler {
	return &Handler{service: service}
}

type CreateEscrowRequest struct {
	ID           string      `json:"id"`
	ProjectID    int         `json:"project_id"`
	Amount       int64       `json:"amount"`
	Currency     string      `json:"currency"`
	BuyerID      string      `json:"buyer_id"`
	SellerID     string      `json:"seller_id"`
	ProviderName string      `json:"provider_name"`
	Metadata     interface{} `json:"metadata,omitempty"`
}

type CreateEscrowResponse struct {
	Success bool    `json:"success"`
	Escrow  *Escrow `json:"escrow,omitempty"`
	Error   string  `json:"error,omitempty"`
}

func (h *Handler) CreateEscrow(w http.ResponseWriter, r *http.Request) {
	var req CreateEscrowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	escrow := &Escrow{
		ID:           req.ID,
		ProjectID:    req.ProjectID,
		Amount:       req.Amount,
		Currency:     req.Currency,
		BuyerID:      req.BuyerID,
		SellerID:     req.SellerID,
		ProviderName: req.ProviderName,
		Metadata:     req.Metadata,
	}

	if err := h.service.CreateEscrow(escrow); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, CreateEscrowResponse{
		Success: true,
		Escrow:  escrow,
	})
}

type HoldFundsRequest struct {
	ProviderEscrowID string `json:"provider_escrow_id"`
}

func (h *Handler) HoldFunds(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	escrowID := vars["id"]

	var req HoldFundsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.HoldFunds(escrowID, req.ProviderEscrowID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	escrow, _ := h.service.store.Get(escrowID)
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"escrow":  escrow,
	})
}

type ReleaseFundsRequest struct {
	Amount int64 `json:"amount"`
}

func (h *Handler) ReleaseFunds(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	escrowID := vars["id"]

	var req ReleaseFundsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.ReleaseFunds(escrowID, req.Amount); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	escrow, _ := h.service.store.Get(escrowID)
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"escrow":  escrow,
	})
}

type RefundFundsRequest struct {
	Amount int64 `json:"amount"`
}

func (h *Handler) RefundFunds(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	escrowID := vars["id"]

	var req RefundFundsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.RefundFunds(escrowID, req.Amount); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	escrow, _ := h.service.store.Get(escrowID)
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"escrow":  escrow,
	})
}

func (h *Handler) GetEscrow(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	escrowID := vars["id"]

	escrow, err := h.service.store.Get(escrowID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, escrow)
}

func (h *Handler) ListEscrows(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectID, _ := strconv.Atoi(vars["project_id"])

	escrows := h.service.store.List(projectID)
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"escrows": escrows,
		"total":   len(escrows),
	})
}

func (h *Handler) GetEvents(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	escrowID := vars["id"]

	// Check if store supports events
	if redisStore, ok := h.service.store.(*RedisEscrowStore); ok {
		events, err := redisStore.GetEvents(escrowID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"events": events,
			"total":  len(events),
		})
	} else {
		respondError(w, http.StatusNotImplemented, "event sourcing not available with in-memory storage")
	}
}

func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	// Check if store supports stats
	if redisStore, ok := h.service.store.(*RedisEscrowStore); ok {
		stats, err := redisStore.GetStats()
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, stats)
	} else {
		respondError(w, http.StatusNotImplemented, "stats not available with in-memory storage")
	}
}

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "healthy",
		"service":   "escrow-service",
		"timestamp": time.Now().Format(time.RFC3339),
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

// CORS middleware
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

// Logging middleware
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Info("[%s] %s %s - %v", "args", []any{r.Method, r.RequestURI, r.RemoteAddr, time.Since(start}))
	})
}

var log = common.NewLogger("escrow-service")

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	// Initialize PostgreSQL store (primary persistent store)
	var store StoreInterface
	pgStore, pgErr := NewPostgresEscrowStore()
	if pgErr != nil {
		log.Info("WARNING: PostgreSQL unavailable: %v. Falling back to in-memory store.", "args", []any{pgErr})
		store = NewEscrowStore()
	} else {
		defer pgStore.Close()
		store = pgStore
		log.Info("PostgreSQL escrow store initialized successfully")
	}

	// Optionally layer Redis cache on top if configured
	redisURL := os.Getenv("REDIS_URL")
	useRedis := redisURL != ""
	if useRedis {
		log.Info("Redis cache configured: %s", "args", []any{redisURL})
		redisStore, err := NewRedisEscrowStore(redisURL)
		if err != nil {
			log.Info("Failed to connect to Redis: %v. Using PostgreSQL only.", "args", []any{err})
		} else {
			store = redisStore
			defer redisStore.Close()
			log.Info("Redis storage initialized successfully")
		}
	}

	service := NewEscrowService(store)
	handler := NewHandler(service)

	router := mux.NewRouter(	// Health endpoint
	router.HandleFunc("/health", handler.HealthCheck).Methods("GET")

	// Metrics endpoint
	router.Handle("/metrics", promhttp.Handler()).Methods("GET")

	// Escrow endpoints
	router.HandleFunc("/escrows", handler.CreateEscrow).Methods("POST")
	router.HandleFunc("/escrows/{id}", handler.GetEscrow).Methods("GET")
	router.HandleFunc("/escrows/{id}/hold", handler.HoldFunds).Methods("POST")
	router.HandleFunc("/escrows/{id}/release", handler.ReleaseFunds).Methods("POST")
	router.HandleFunc("/escrows/{id}/refund", handler.RefundFunds).Methods("POST")
	router.HandleFunc("/escrows/{id}/events", handler.GetEvents).Methods("GET")
	router.HandleFunc("/projects/{project_id}/escrows", handler.ListEscrows).Methods("GET")
	router.HandleFunc("/stats", handler.GetStats).Methods("GET")

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
		log.Info("Starting Escrow Service on port %s", "args", []any{port})
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("Server failed to start: %v", "args", []any{err})
os.Exit(1)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Error("Server forced to shutdown: %v", "args", []any{err})
os.Exit(1)
	}

	log.Info("Server exited")
}
