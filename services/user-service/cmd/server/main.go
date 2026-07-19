package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/realestate/user-service/internal/config"
	"github.com/realestate/user-service/internal/handler"
	"github.com/realestate/user-service/internal/middleware"
	"github.com/realestate/user-service/internal/repository"
	"github.com/realestate/user-service/internal/service"
	"github.com/realestate/user-service/pkg/keycloak"
)

func main() {
	// Load configuration
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatal("Configuration validation failed:", err)
	}

	// Set Gin mode
	gin.SetMode(cfg.Server.Mode)

	// Initialize database repository
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)

	repo, err := repository.NewUserRepository(dsn)
	if err != nil {
		log.Fatal("Failed to initialize repository:", err)
	}

	// Initialize Keycloak client
	kcClient, err := keycloak.NewClient(&cfg.Keycloak)
	if err != nil {
		log.Printf("Warning: Failed to initialize Keycloak client: %v", err)
		log.Println("Service will run without Keycloak integration")
		// Continue without Keycloak for local development
	}

	// Initialize service
	userService := service.NewUserService(repo, kcClient, cfg)
	defer userService.Close()

	// Initialize handler
	userHandler := handler.NewUserHandler(userService)

	// Initialize Gin router
	router := gin.Default()

	// Add middleware
	router.Use(middleware.CORSMiddleware())

	// Register routes
	userHandler.RegisterRoutes(router, cfg.JWT.Secret)

	// Start server
	log.Printf("User Service starting on %s", cfg.Server.Port)
	if err := router.Run(cfg.Server.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
