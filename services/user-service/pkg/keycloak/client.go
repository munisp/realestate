package keycloak

import (
	"context"
	"fmt"

	"github.com/Nerzal/gocloak/v13"
	"github.com/realestate/user-service/internal/config"
)

type Client struct {
	client *gocloak.GoCloak
	config *config.KeycloakConfig
	token  *gocloak.JWT
}

func NewClient(cfg *config.KeycloakConfig) (*Client, error) {
	client := gocloak.NewClient(cfg.URL)
	
	// Get admin token
	token, err := client.LoginAdmin(context.Background(), cfg.AdminUser, cfg.AdminPassword, "master")
	if err != nil {
		return nil, fmt.Errorf("failed to login to Keycloak: %w", err)
	}

	return &Client{
		client: client,
		config: cfg,
		token:  token,
	}, nil
}

// CreateUser creates a new user in Keycloak
func (c *Client) CreateUser(ctx context.Context, email, username, password, firstName, lastName string) (string, error) {
	user := gocloak.User{
		Username:      gocloak.StringP(username),
		Email:         gocloak.StringP(email),
		EmailVerified: gocloak.BoolP(true),
		Enabled:       gocloak.BoolP(true),
		FirstName:     gocloak.StringP(firstName),
		LastName:      gocloak.StringP(lastName),
	}

	userID, err := c.client.CreateUser(ctx, c.token.AccessToken, c.config.Realm, user)
	if err != nil {
		return "", fmt.Errorf("failed to create user in Keycloak: %w", err)
	}

	// Set password
	err = c.client.SetPassword(ctx, c.token.AccessToken, userID, c.config.Realm, password, false)
	if err != nil {
		return "", fmt.Errorf("failed to set user password: %w", err)
	}

	return userID, nil
}

// Login authenticates a user and returns tokens
func (c *Client) Login(ctx context.Context, email, password string) (*gocloak.JWT, error) {
	token, err := c.client.Login(ctx, c.config.ClientID, c.config.ClientSecret, c.config.Realm, email, password)
	if err != nil {
		return nil, fmt.Errorf("failed to login: %w", err)
	}

	return token, nil
}

// RefreshToken refreshes an access token
func (c *Client) RefreshToken(ctx context.Context, refreshToken string) (*gocloak.JWT, error) {
	token, err := c.client.RefreshToken(ctx, refreshToken, c.config.ClientID, c.config.ClientSecret, c.config.Realm)
	if err != nil {
		return nil, fmt.Errorf("failed to refresh token: %w", err)
	}

	return token, nil
}

// Logout logs out a user
func (c *Client) Logout(ctx context.Context, refreshToken string) error {
	err := c.client.Logout(ctx, c.config.ClientID, c.config.ClientSecret, c.config.Realm, refreshToken)
	if err != nil {
		return fmt.Errorf("failed to logout: %w", err)
	}

	return nil
}

// GetUser retrieves user information from Keycloak
func (c *Client) GetUser(ctx context.Context, userID string) (*gocloak.User, error) {
	user, err := c.client.GetUserByID(ctx, c.token.AccessToken, c.config.Realm, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// UpdateUser updates user information in Keycloak
func (c *Client) UpdateUser(ctx context.Context, userID string, user gocloak.User) error {
	err := c.client.UpdateUser(ctx, c.token.AccessToken, c.config.Realm, user)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

// DeleteUser deletes a user from Keycloak
func (c *Client) DeleteUser(ctx context.Context, userID string) error {
	err := c.client.DeleteUser(ctx, c.token.AccessToken, c.config.Realm, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	return nil
}

// VerifyToken verifies a JWT token
func (c *Client) VerifyToken(ctx context.Context, token string) (*gocloak.JWT, error) {
	result, err := c.client.RetrospectToken(ctx, token, c.config.ClientID, c.config.ClientSecret, c.config.Realm)
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %w", err)
	}

	if !*result.Active {
		return nil, fmt.Errorf("token is not active")
	}

	return &gocloak.JWT{AccessToken: token}, nil
}
