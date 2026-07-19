package model

import (
	"time"
)

// Tenant represents a multi-tenant customer
type Tenant struct {
	ID                string                 `json:"id" gorm:"primaryKey"`
	Name              string                 `json:"name" gorm:"not null"`
	Slug              string                 `json:"slug" gorm:"uniqueIndex;not null"`
	Domain            string                 `json:"domain" gorm:"uniqueIndex"`
	Status            TenantStatus           `json:"status" gorm:"not null"`
	Plan              SubscriptionPlan       `json:"plan" gorm:"not null"`
	DatabaseHost      string                 `json:"database_host"`
	DatabaseName      string                 `json:"database_name"`
	DatabaseUser      string                 `json:"database_user"`
	DatabasePassword  string                 `json:"-"` // Never expose in JSON
	Settings          TenantSettings         `json:"settings" gorm:"type:json"`
	Branding          TenantBranding         `json:"branding" gorm:"type:json"`
	Features          []string               `json:"features" gorm:"type:json"`
	Limits            TenantLimits           `json:"limits" gorm:"type:json"`
	DataResidency     string                 `json:"data_residency"`
	EncryptionEnabled bool                   `json:"encryption_enabled"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
	ActivatedAt       *time.Time             `json:"activated_at"`
	SuspendedAt       *time.Time             `json:"suspended_at"`
	DeletedAt         *time.Time             `json:"deleted_at" gorm:"index"`
}

// TenantStatus represents the current status of a tenant
type TenantStatus string

const (
	TenantStatusActive    TenantStatus = "active"
	TenantStatusSuspended TenantStatus = "suspended"
	TenantStatusTrial     TenantStatus = "trial"
	TenantStatusCanceled  TenantStatus = "canceled"
)

// SubscriptionPlan represents different subscription tiers
type SubscriptionPlan string

const (
	PlanFree       SubscriptionPlan = "free"
	PlanStarter    SubscriptionPlan = "starter"
	PlanPro        SubscriptionPlan = "pro"
	PlanEnterprise SubscriptionPlan = "enterprise"
)

// TenantSettings holds tenant-specific configuration
type TenantSettings struct {
	Timezone             string            `json:"timezone"`
	Language             string            `json:"language"`
	Currency             string            `json:"currency"`
	DateFormat           string            `json:"date_format"`
	NotificationSettings map[string]bool   `json:"notification_settings"`
	IntegrationSettings  map[string]string `json:"integration_settings"`
	SecuritySettings     SecuritySettings  `json:"security_settings"`
}

// SecuritySettings holds security-related configuration
type SecuritySettings struct {
	MFARequired           bool   `json:"mfa_required"`
	PasswordPolicy        string `json:"password_policy"`
	SessionTimeout        int    `json:"session_timeout"`
	IPWhitelist           []string `json:"ip_whitelist"`
	AllowedDomains        []string `json:"allowed_domains"`
	DataRetentionDays     int    `json:"data_retention_days"`
}

// TenantBranding holds branding customization
type TenantBranding struct {
	LogoURL       string            `json:"logo_url"`
	FaviconURL    string            `json:"favicon_url"`
	PrimaryColor  string            `json:"primary_color"`
	SecondaryColor string           `json:"secondary_color"`
	FontFamily    string            `json:"font_family"`
	CustomCSS     string            `json:"custom_css"`
	EmailTemplate map[string]string `json:"email_template"`
}

// TenantLimits defines usage limits for the tenant
type TenantLimits struct {
	MaxUsers          int `json:"max_users"`
	MaxProperties     int `json:"max_properties"`
	MaxTransactions   int `json:"max_transactions"`
	MaxStorageGB      int `json:"max_storage_gb"`
	MaxAPICallsPerDay int `json:"max_api_calls_per_day"`
	MaxMLInferences   int `json:"max_ml_inferences"`
}

// TenantUser represents a user within a tenant
type TenantUser struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	TenantID   string    `json:"tenant_id" gorm:"index;not null"`
	UserID     string    `json:"user_id" gorm:"index;not null"`
	Role       UserRole  `json:"role" gorm:"not null"`
	Permissions []string `json:"permissions" gorm:"type:json"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// UserRole represents roles within a tenant
type UserRole string

const (
	RoleOwner       UserRole = "owner"
	RoleAdmin       UserRole = "admin"
	RoleMember      UserRole = "member"
	RoleAgent       UserRole = "agent"`
	RoleViewer      UserRole = "viewer"
)

// TenantUsage tracks resource usage for billing
type TenantUsage struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	TenantID        string    `json:"tenant_id" gorm:"index;not null"`
	Period          string    `json:"period" gorm:"index;not null"` // YYYY-MM
	UserCount       int       `json:"user_count"`
	PropertyCount   int       `json:"property_count"`
	TransactionCount int      `json:"transaction_count"`
	StorageUsedGB   float64   `json:"storage_used_gb"`
	APICallsCount   int       `json:"api_calls_count"`
	MLInferenceCount int      `json:"ml_inference_count"`
	BandwidthGB     float64   `json:"bandwidth_gb"`
	ComputeHours    float64   `json:"compute_hours"`
	TotalCost       float64   `json:"total_cost"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// TenantInvitation represents an invitation to join a tenant
type TenantInvitation struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	TenantID   string    `json:"tenant_id" gorm:"index;not null"`
	Email      string    `json:"email" gorm:"not null"`
	Role       UserRole  `json:"role" gorm:"not null"`
	Token      string    `json:"token" gorm:"uniqueIndex;not null"`
	InvitedBy  string    `json:"invited_by"`
	ExpiresAt  time.Time `json:"expires_at"`
	AcceptedAt *time.Time `json:"accepted_at"`
	CreatedAt  time.Time `json:"created_at"`
}

// TenantAPIKey represents API keys for tenant integrations
type TenantAPIKey struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	TenantID    string    `json:"tenant_id" gorm:"index;not null"`
	Name        string    `json:"name" gorm:"not null"`
	Key         string    `json:"key" gorm:"uniqueIndex;not null"`
	Permissions []string  `json:"permissions" gorm:"type:json"`
	ExpiresAt   *time.Time `json:"expires_at"`
	LastUsedAt  *time.Time `json:"last_used_at"`
	CreatedAt   time.Time `json:"created_at"`
	RevokedAt   *time.Time `json:"revoked_at"`
}
