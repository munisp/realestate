package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/realestate-platform/property-service/internal/config"
	"github.com/realestate-platform/property-service/internal/handler"
	"github.com/realestate-platform/property-service/internal/repository"
	"github.com/realestate-platform/property-service/internal/service"
	"github.com/realestate-platform/property-service/pkg/database"
	"github.com/realestate-platform/property-service/pkg/kafka"
	"github.com/realestate-platform/property-service/pkg/redis"
	dapr "github.com/dapr/go-sdk/client"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatal("Failed to initialize logger:", err)
	}
	defer logger.Sync()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load config", zap.Error(err))
	}

	// Initialize PostgreSQL
	db, err := database.NewPostgres(cfg.Database)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()
	logger.Info("Connected to PostgreSQL")

	// Initialize Redis
	redisClient, err := redis.NewClient(cfg.Redis)
	if err != nil {
		logger.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	defer redisClient.Close()
	logger.Info("Connected to Redis")

	// Initialize Kafka producer
	kafkaProducer, err := kafka.NewProducer(cfg.Kafka)
	if err != nil {
		logger.Fatal("Failed to create Kafka producer", zap.Error(err))
	}
	defer kafkaProducer.Close()
	logger.Info("Connected to Kafka")

	// Initialize Dapr client
	daprClient, err := dapr.NewClient()
	if err != nil {
		logger.Warn("Failed to create Dapr client (optional)", zap.Error(err))
		daprClient = nil
	} else {
		defer daprClient.Close()
		logger.Info("Connected to Dapr")
	}

	// Initialize repositories
	propertyRepo := repository.NewPropertyRepository(db, logger)

	// Initialize services
	propertyService := service.NewPropertyService(
		propertyRepo,
		redisClient,
		kafkaProducer,
		daprClient,
		logger,
	)

	// Initialize handlers
	propertyHandler := handler.NewPropertyHandler(propertyService, logger)

	// Setup Gin router
	gin.SetMode(cfg.Server.Mode)
	router := gin.New()

	// Middleware
	router.Use(gin.Recovery())
	router.Use(handler.RequestID())
	router.Use(handler.Logger(logger))
	router.Use(handler.CORS())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "property-service",
			"version": "1.0.0",
		})
	})

	// Readiness check
	router.GET("/ready", func(c *gin.Context) {
		// Check database connection
		if err := db.Pool.Ping(context.Background()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "not ready",
				"error":  "database connection failed",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "ready",
		})
	})

	// API routes
	v1 := router.Group("/api/v1")
	{
		// Property routes
		properties := v1.Group("/properties")
		properties.Use(handler.AuthMiddleware())
		{
			properties.POST("", propertyHandler.Create)
			properties.GET("", propertyHandler.List)
			properties.GET("/:id", propertyHandler.Get)
			properties.PUT("/:id", propertyHandler.Update)
			properties.DELETE("/:id", propertyHandler.Delete)
			properties.GET("/nearby", propertyHandler.GetNearby)
		}
	}

	// Start server
	srv := &http.Server{
		Addr:         cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		logger.Info("Starting Property Service", zap.String("port", cfg.Server.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited gracefully")
}
