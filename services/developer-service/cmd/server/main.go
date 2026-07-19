package main

import (
"context"
"fmt"
"log"
"net/http"
"os"
"os/signal"
"syscall"
"time"

"github.com/gin-gonic/gin"
"github.com/realestate/developer-service/internal/handler"
"github.com/realestate/developer-service/internal/repository"
"github.com/realestate/developer-service/internal/service"
"github.com/realestate/developer-service/pkg/database"
"github.com/realestate/developer-service/pkg/kafka"
"github.com/realestate/developer-service/pkg/logger"
)

func main() {
// Initialize logger
log := logger.New()

// Initialize database
db, err := database.Connect()
if err != nil {
log.Fatal("Failed to connect to database", "error", err)
}

// Auto-migrate models
database.AutoMigrate(db)

// Initialize Kafka producer
kafkaProducer, err := kafka.NewProducer()
if err != nil {
log.Fatal("Failed to initialize Kafka producer", "error", err)
}
defer kafkaProducer.Close()

// Initialize repositories
developerRepo := repository.NewDeveloperRepository(db)
projectRepo := repository.NewProjectRepository(db)
unitRepo := repository.NewUnitRepository(db)
milestoneRepo := repository.NewMilestoneRepository(db)
saleRepo := repository.NewSaleRepository(db)

// Initialize service
developerService := service.NewDeveloperService(
developerRepo,
projectRepo,
unitRepo,
milestoneRepo,
saleRepo,
kafkaProducer,
log,
)

// Initialize handler
developerHandler := handler.NewDeveloperHandler(developerService)

// Setup Gin router
router := gin.Default()

// Health check
router.GET("/health", func(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{"status": "healthy"})
})

// API routes
v1 := router.Group("/api/v1")
{
// Developer routes
v1.POST("/developers", developerHandler.CreateDeveloper)
v1.GET("/developers/:id", developerHandler.GetDeveloper)
v1.GET("/developers", developerHandler.ListDevelopers)

// Project routes
v1.POST("/projects", developerHandler.CreateProject)

// Unit routes
v1.POST("/units", developerHandler.CreateUnit)
v1.POST("/units/:id/reserve", developerHandler.ReserveUnit)

// Analytics routes
v1.GET("/analytics/inventory/:projectId", developerHandler.GetInventoryAnalytics)
}

// Start server
port := os.Getenv("PORT")
if port == "" {
port = "3005"
}

srv := &http.Server{
Addr:    fmt.Sprintf(":%s", port),
Handler: router,
}

// Graceful shutdown
go func() {
if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
log.Fatal("Failed to start server", "error", err)
}
}()

log.Info("Developer Service started", "port", port)

quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

log.Info("Shutting down server...")

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

if err := srv.Shutdown(ctx); err != nil {
log.Fatal("Server forced to shutdown", "error", err)
}

log.Info("Server exited")
}
