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
	"github.com/joho/godotenv"
	"auth-service/internal/handlers"
	"auth-service/internal/middleware"
	"auth-service/internal/repository"
	"auth-service/internal/service"
	"auth-service/pkg/database"
	"auth-service/pkg/keycloak"
	"auth-service/pkg/logger"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize logger
	appLogger := logger.New(os.Getenv("LOG_LEVEL"))
	appLogger.Info("Starting Authentication Service...")

	// Initialize database connection
	db, err := database.NewPostgresConnection(os.Getenv("DATABASE_URL"))
	if err != nil {
		appLogger.Fatal("Failed to connect to database", "error", err)
	}
	defer db.Close()

	// Initialize Keycloak client
	keycloakClient := keycloak.NewClient(
		os.Getenv("KEYCLOAK_URL"),
		os.Getenv("KEYCLOAK_REALM"),
		os.Getenv("KEYCLOAK_CLIENT_ID"),
		os.Getenv("KEYCLOAK_CLIENT_SECRET"),
	)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	sessionRepo := repository.NewSessionRepository(db)

	// Initialize services
	authService := service.NewAuthService(userRepo, sessionRepo, keycloakClient, appLogger)
	tokenService := service.NewTokenService(keycloakClient, appLogger)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, tokenService, appLogger)

	// Setup Gin router
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.Default()

	// Middleware
	router.Use(middleware.CORS())
	router.Use(middleware.RequestID())
	router.Use(middleware.Logger(appLogger))
	router.Use(middleware.Recovery(appLogger))
	router.Use(middleware.RateLimiter(100, 200)) // 100 req/s, burst 200

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
			"service": "auth-service",
			"timestamp": time.Now().Unix(),
		})
	})

	// API routes
	v1 := router.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", middleware.AuthRequired(tokenService), authHandler.Logout)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/verify-email", authHandler.VerifyEmail)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
			auth.POST("/change-password", middleware.AuthRequired(tokenService), authHandler.ChangePassword)
		}

		user := v1.Group("/user")
		user.Use(middleware.AuthRequired(tokenService))
		{
			user.GET("/me", authHandler.GetCurrentUser)
			user.PUT("/me", authHandler.UpdateProfile)
			user.DELETE("/me", authHandler.DeleteAccount)
			user.GET("/sessions", authHandler.GetActiveSessions)
			user.DELETE("/sessions/:id", authHandler.RevokeSession)
		}

		admin := v1.Group("/admin")
		admin.Use(middleware.AuthRequired(tokenService))
		admin.Use(middleware.RoleRequired("admin"))
		{
			admin.GET("/users", authHandler.ListUsers)
			admin.GET("/users/:id", authHandler.GetUser)
			admin.PUT("/users/:id", authHandler.UpdateUser)
			admin.DELETE("/users/:id", authHandler.DeleteUser)
			admin.POST("/users/:id/roles", authHandler.AssignRole)
			admin.DELETE("/users/:id/roles/:role", authHandler.RemoveRole)
			admin.POST("/users/:id/disable", authHandler.DisableUser)
			admin.POST("/users/:id/enable", authHandler.EnableUser)
		}

		// 2FA routes
		twofa := v1.Group("/2fa")
		twofa.Use(middleware.AuthRequired(tokenService))
		{
			twofa.POST("/enable", authHandler.Enable2FA)
			twofa.POST("/disable", authHandler.Disable2FA)
			twofa.POST("/verify", authHandler.Verify2FA)
			twofa.GET("/backup-codes", authHandler.GetBackupCodes)
			twofa.POST("/backup-codes/regenerate", authHandler.RegenerateBackupCodes)
		}

		// OAuth2 routes
		oauth := v1.Group("/oauth")
		{
			oauth.GET("/authorize", authHandler.OAuthAuthorize)
			oauth.POST("/token", authHandler.OAuthToken)
			oauth.GET("/callback", authHandler.OAuthCallback)
			oauth.POST("/revoke", authHandler.OAuthRevoke)
		}
	}

	// Metrics endpoint for Prometheus
	router.GET("/metrics", handlers.PrometheusHandler())

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		appLogger.Info(fmt.Sprintf("Auth Service listening on port %s", port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			appLogger.Fatal("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	appLogger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		appLogger.Fatal("Server forced to shutdown", "error", err)
	}

	appLogger.Info("Server exited")
}
