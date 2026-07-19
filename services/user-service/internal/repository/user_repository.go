package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/realestate/user-service/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(dsn string) (*UserRepository, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate models
	err = db.AutoMigrate(&model.User{}, &model.UserSession{}, &model.UserRole{})
	if err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return &UserRepository{db: db}, nil
}

// CreateUser creates a new user
func (r *UserRepository) CreateUser(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// GetUserByID retrieves a user by ID
func (r *UserRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByEmail retrieves a user by email
func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByUsername retrieves a user by username
func (r *UserRepository) GetUserByUsername(ctx context.Context, username string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByKeycloakID retrieves a user by Keycloak ID
func (r *UserRepository) GetUserByKeycloakID(ctx context.Context, keycloakID string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("keycloak_id = ?", keycloakID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// UpdateUser updates a user
func (r *UserRepository) UpdateUser(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

// DeleteUser soft deletes a user
func (r *UserRepository) DeleteUser(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&model.User{}, id).Error
}

// ListUsers retrieves all users with pagination
func (r *UserRepository) ListUsers(ctx context.Context, limit, offset int) ([]model.User, error) {
	var users []model.User
	err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&users).Error
	return users, err
}

// UpdateLastLogin updates the last login timestamp
func (r *UserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.User{}).Where("id = ?", id).Update("last_login", now).Error
}

// CreateSession creates a new user session
func (r *UserRepository) CreateSession(ctx context.Context, session *model.UserSession) error {
	return r.db.WithContext(ctx).Create(session).Error
}

// GetSession retrieves a session by ID
func (r *UserRepository) GetSession(ctx context.Context, id uuid.UUID) (*model.UserSession, error) {
	var session model.UserSession
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// GetSessionByAccessToken retrieves a session by access token
func (r *UserRepository) GetSessionByAccessToken(ctx context.Context, accessToken string) (*model.UserSession, error) {
	var session model.UserSession
	err := r.db.WithContext(ctx).Where("access_token = ?", accessToken).First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// DeleteSession deletes a session
func (r *UserRepository) DeleteSession(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&model.UserSession{}, id).Error
}

// DeleteExpiredSessions deletes all expired sessions
func (r *UserRepository) DeleteExpiredSessions(ctx context.Context) error {
	return r.db.WithContext(ctx).Where("expires_at < ?", time.Now()).Delete(&model.UserSession{}).Error
}

// GetUserSessions retrieves all active sessions for a user
func (r *UserRepository) GetUserSessions(ctx context.Context, userID uuid.UUID) ([]model.UserSession, error) {
	var sessions []model.UserSession
	err := r.db.WithContext(ctx).Where("user_id = ? AND expires_at > ?", userID, time.Now()).Find(&sessions).Error
	return sessions, err
}

// CreateRole creates a new role
func (r *UserRepository) CreateRole(ctx context.Context, role *model.UserRole) error {
	return r.db.WithContext(ctx).Create(role).Error
}

// GetRole retrieves a role by name
func (r *UserRepository) GetRole(ctx context.Context, name string) (*model.UserRole, error) {
	var role model.UserRole
	err := r.db.WithContext(ctx).Where("name = ?", name).First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// ListRoles retrieves all roles
func (r *UserRepository) ListRoles(ctx context.Context) ([]model.UserRole, error) {
	var roles []model.UserRole
	err := r.db.WithContext(ctx).Find(&roles).Error
	return roles, err
}
