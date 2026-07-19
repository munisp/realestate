package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/realestate-platform/tigerbeetle-service/internal/handler"
	"github.com/realestate-platform/tigerbeetle-service/internal/service"
	"github.com/realestate-platform/tigerbeetle-service/pkg/ledger"
	"github.com/tigerbeetle/tigerbeetle-go/pkg/types"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}
	defer logger.Sync()

	// Load configuration from environment
	config := loadConfig()

	// Initialize TigerBeetle client
	addresses := strings.Split(config.TigerBeetleAddresses, ",")
	clusterID := types.ToUint128(0) // Use cluster ID from config
	
	ledgerClient, err := ledger.NewClient(addresses, clusterID, logger)
	if err != nil {
		logger.Fatal("Failed to create TigerBeetle client", zap.Error(err))
	}
	defer ledgerClient.Close()

	logger.Info("Connected to TigerBeetle cluster", zap.Strings("addresses", addresses))

	// Initialize service
	ledgerService := service.NewLedgerService(ledgerClient, logger)

	// Initialize handler
	ledgerHandler := handler.NewLedgerHandler(ledgerService, logger)

	// Setup HTTP server
	router := setupRouter(ledgerHandler)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", config.Port),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Starting TigerBeetle service", zap.String("port", config.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}

// Config holds application configuration
type Config struct {
	Port                  string
	TigerBeetleAddresses  string
	TigerBeetleClusterID  string
}

func loadConfig() Config {
	return Config{
		Port:                  getEnv("PORT", "8085"),
		TigerBeetleAddresses:  getEnv("TIGERBEETLE_ADDRESSES", "localhost:3000"),
		TigerBeetleClusterID:  getEnv("TIGERBEETLE_CLUSTER_ID", "0"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func setupRouter(ledgerHandler *handler.LedgerHandler) *gin.Engine {
	router := gin.Default()

	// Middleware
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	// Health check
	router.GET("/health", ledgerHandler.HealthCheck)

	// Metrics
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API routes
	v1 := router.Group("/api/v1")
	{
		// Account management
		v1.POST("/accounts", ledgerHandler.CreateAccount)
		v1.GET("/accounts/:account_id/balance", ledgerHandler.GetBalance)

		// Transactions
		v1.POST("/transactions/property", ledgerHandler.ExecutePropertyTransaction)
	}

	return router
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
