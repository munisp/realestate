package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/realestate/user-service/internal/config"
	"github.com/realestate/user-service/internal/model"
	"github.com/realestate/user-service/internal/repository"
	"github.com/realestate/user-service/pkg/jwt"
	"github.com/realestate/user-service/pkg/keycloak"
	"github.com/segmentio/kafka-go"
)

type UserService struct {
	repo     *repository.UserRepository
	keycloak *keycloak.Client
	config   *config.Config
	kafka    *kafka.Writer
}

func NewUserService(repo *repository.UserRepository, kc *keycloak.Client, cfg *config.Config) *UserService {
	// Initialize Kafka producer
	kafkaWriter := &kafka.Writer{
		Addr:     kafka.TCP(cfg.Kafka.Brokers...),
		Topic:    cfg.Kafka.Topic,
		Balancer: &kafka.LeastBytes{},
	}

	return &UserService{
		repo:     repo,
		keycloak: kc,
		config:   cfg,
		kafka:    kafkaWriter,
	}
}

// CreateUser creates a new user in both Keycloak and local database
func (s *UserService) CreateUser(ctx context.Context, req *model.CreateUserRequest) (*model.User, error) {
	// Create user in Keycloak
	keycloakID, err := s.keycloak.CreateUser(ctx, req.Email, req.Username, req.Password, req.FirstName, req.LastName)
	if err != nil {
		return nil, fmt.Errorf("failed to create user in Keycloak: %w", err)
	}

	// Create user in local database
	user := &model.User{
		Email:      req.Email,
		Username:   req.Username,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Phone:      req.Phone,
		Role:       req.Role,
		KeycloakID: keycloakID,
		Status:     "active",
	}

	if user.Role == "" {
		user.Role = "user"
	}

	err = s.repo.CreateUser(ctx, user)
	if err != nil {
		// Rollback: delete user from Keycloak
		_ = s.keycloak.DeleteUser(ctx, keycloakID)
		return nil, fmt.Errorf("failed to create user in database: %w", err)
	}

	// Publish user created event
	_ = s.publishEvent("user.created", user)

	return user, nil
}

// Login authenticates a user and returns tokens
func (s *UserService) Login(ctx context.Context, req *model.LoginRequest) (*model.LoginResponse, error) {
	// Authenticate with Keycloak
	token, err := s.keycloak.Login(ctx, req.Email, req.Password)
	if err != nil {
		return nil, fmt.Errorf("authentication failed: %w", err)
	}

	// Get user from database
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Update last login
	_ = s.repo.UpdateLastLogin(ctx, user.ID)

	// Create session
	session := &model.UserSession{
		UserID:       user.ID,
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		ExpiresAt:    time.Now().Add(time.Duration(token.ExpiresIn) * time.Second),
	}
	_ = s.repo.CreateSession(ctx, session)

	// Publish login event
	_ = s.publishEvent("user.logged_in", user)

	return &model.LoginResponse{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		ExpiresIn:    token.ExpiresIn,
		TokenType:    "Bearer",
		User:         *user,
	}, nil
}

// RefreshToken refreshes an access token
func (s *UserService) RefreshToken(ctx context.Context, refreshToken string) (*model.LoginResponse, error) {
	// Refresh token with Keycloak
	token, err := s.keycloak.RefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to refresh token: %w", err)
	}

	// Validate token and get user
	claims, err := jwt.ValidateToken(token.AccessToken, s.config.JWT.Secret)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	user, err := s.repo.GetUserByID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	return &model.LoginResponse{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		ExpiresIn:    token.ExpiresIn,
		TokenType:    "Bearer",
		User:         *user,
	}, nil
}

// Logout logs out a user
func (s *UserService) Logout(ctx context.Context, refreshToken string) error {
	err := s.keycloak.Logout(ctx, refreshToken)
	if err != nil {
		return fmt.Errorf("failed to logout: %w", err)
	}

	return nil
}

// GetUser retrieves a user by ID
func (s *UserService) GetUser(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return s.repo.GetUserByID(ctx, id)
}

// UpdateUser updates a user
func (s *UserService) UpdateUser(ctx context.Context, id uuid.UUID, req *model.UpdateUserRequest) (*model.User, error) {
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Update fields
	if req.FirstName != nil {
		user.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		user.LastName = *req.LastName
	}
	if req.Phone != nil {
		user.Phone = *req.Phone
	}
	if req.Avatar != nil {
		user.Avatar = *req.Avatar
	}
	if req.Bio != nil {
		user.Bio = *req.Bio
	}
	if req.Preferences != nil {
		user.Preferences = req.Preferences
	}

	err = s.repo.UpdateUser(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Publish user updated event
	_ = s.publishEvent("user.updated", user)

	return user, nil
}

// DeleteUser deletes a user
func (s *UserService) DeleteUser(ctx context.Context, id uuid.UUID) error {
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	// Delete from Keycloak
	err = s.keycloak.DeleteUser(ctx, user.KeycloakID)
	if err != nil {
		return fmt.Errorf("failed to delete user from Keycloak: %w", err)
	}

	// Delete from database
	err = s.repo.DeleteUser(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete user from database: %w", err)
	}

	// Publish user deleted event
	_ = s.publishEvent("user.deleted", user)

	return nil
}

// ListUsers retrieves all users with pagination
func (s *UserService) ListUsers(ctx context.Context, limit, offset int) ([]model.User, error) {
	return s.repo.ListUsers(ctx, limit, offset)
}

// publishEvent publishes an event to Kafka
func (s *UserService) publishEvent(eventType string, user *model.User) error {
	event := map[string]interface{}{
		"event_type": eventType,
		"user_id":    user.ID,
		"timestamp":  time.Now(),
		"data":       user,
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return s.kafka.WriteMessages(context.Background(), kafka.Message{
		Key:   []byte(user.ID.String()),
		Value: eventJSON,
	})
}

// Close closes the Kafka writer
func (s *UserService) Close() error {
	return s.kafka.Close()
}
