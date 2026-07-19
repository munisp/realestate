package model

import (
"time"

"github.com/google/uuid"
"gorm.io/gorm"
)

// Developer represents a property developer or builder
type Developer struct {
ID              uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
Name            string         `gorm:"not null" json:"name"`
CompanyName     string         `gorm:"not null" json:"company_name"`
Email           string         `gorm:"uniqueIndex;not null" json:"email"`
Phone           string         `json:"phone"`
Website         string         `json:"website"`
Description     string         `gorm:"type:text" json:"description"`
Logo            string         `json:"logo"`
LicenseNumber   string         `gorm:"uniqueIndex" json:"license_number"`
YearsInBusiness int            `json:"years_in_business"`
Rating          float64        `json:"rating"`
Status          string         `gorm:"default:'active'" json:"status"`
CreatedAt       time.Time      `json:"created_at"`
UpdatedAt       time.Time      `json:"updated_at"`
DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// Project represents a development project
type Project struct {
ID                uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
DeveloperID       uuid.UUID      `gorm:"type:uuid;not null;index" json:"developer_id"`
Developer         Developer      `gorm:"foreignKey:DeveloperID" json:"developer,omitempty"`
Name              string         `gorm:"not null" json:"name"`
Description       string         `gorm:"type:text" json:"description"`
Type              string         `json:"type"`
Status            string         `gorm:"default:'planning'" json:"status"`
Address           string         `json:"address"`
City              string         `json:"city"`
State             string         `json:"state"`
Country           string         `json:"country"`
PostalCode        string         `json:"postal_code"`
Latitude          float64        `json:"latitude"`
Longitude         float64        `json:"longitude"`
TotalUnits        int            `json:"total_units"`
AvailableUnits    int            `json:"available_units"`
SoldUnits         int            `json:"sold_units"`
ReservedUnits     int            `json:"reserved_units"`
TotalArea         float64        `json:"total_area"`
StartDate         *time.Time     `json:"start_date"`
ExpectedEndDate   *time.Time     `json:"expected_end_date"`
ActualEndDate     *time.Time     `json:"actual_end_date"`
Budget            float64        `json:"budget"`
Currency          string         `gorm:"default:'USD'" json:"currency"`
CompletionPercent int            `gorm:"default:0" json:"completion_percent"`
Images            []string       `gorm:"type:jsonb" json:"images"`
Amenities         []string       `gorm:"type:jsonb" json:"amenities"`
CreatedAt         time.Time      `json:"created_at"`
UpdatedAt         time.Time      `json:"updated_at"`
DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

// Unit represents an individual unit in a project
type Unit struct {
ID              uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
ProjectID       uuid.UUID      `gorm:"type:uuid;not null;index" json:"project_id"`
Project         Project        `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
UnitNumber      string         `gorm:"not null" json:"unit_number"`
Type            string         `json:"type"`
Status          string         `gorm:"default:'available'" json:"status"`
Floor           int            `json:"floor"`
Bedrooms        int            `json:"bedrooms"`
Bathrooms       int            `json:"bathrooms"`
Area            float64        `json:"area"`
Price           float64        `json:"price"`
Currency        string         `gorm:"default:'USD'" json:"currency"`
PricePerSqm     float64        `json:"price_per_sqm"`
Features        []string       `gorm:"type:jsonb" json:"features"`
FloorPlan       string         `json:"floor_plan"`
Images          []string       `gorm:"type:jsonb" json:"images"`
ReservedBy      *uuid.UUID     `gorm:"type:uuid" json:"reserved_by,omitempty"`
ReservedAt      *time.Time     `json:"reserved_at,omitempty"`
SoldTo          *uuid.UUID     `gorm:"type:uuid" json:"sold_to,omitempty"`
SoldAt          *time.Time     `json:"sold_at,omitempty"`
CreatedAt       time.Time      `json:"created_at"`
UpdatedAt       time.Time      `json:"updated_at"`
DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// Milestone represents a construction milestone
type Milestone struct {
ID              uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
ProjectID       uuid.UUID      `gorm:"type:uuid;not null;index" json:"project_id"`
Project         Project        `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
Name            string         `gorm:"not null" json:"name"`
Description     string         `gorm:"type:text" json:"description"`
Status          string         `gorm:"default:'pending'" json:"status"`
PlannedDate     time.Time      `json:"planned_date"`
ActualDate      *time.Time     `json:"actual_date,omitempty"`
CompletionPercent int          `gorm:"default:0" json:"completion_percent"`
Notes           string         `gorm:"type:text" json:"notes"`
Documents       []string       `gorm:"type:jsonb" json:"documents"`
Images          []string       `gorm:"type:jsonb" json:"images"`
CreatedAt       time.Time      `json:"created_at"`
UpdatedAt       time.Time      `json:"updated_at"`
DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// Sale represents a unit sale transaction
type Sale struct {
ID              uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
UnitID          uuid.UUID      `gorm:"type:uuid;not null;index" json:"unit_id"`
Unit            Unit           `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
BuyerID         uuid.UUID      `gorm:"type:uuid;not null" json:"buyer_id"`
SalePrice       float64        `json:"sale_price"`
Currency        string         `gorm:"default:'USD'" json:"currency"`
PaymentPlan     string         `json:"payment_plan"`
DownPayment     float64        `json:"down_payment"`
InstallmentCount int           `json:"installment_count"`
Status          string         `gorm:"default:'pending'" json:"status"`
ContractDate    time.Time      `json:"contract_date"`
HandoverDate    *time.Time     `json:"handover_date,omitempty"`
Notes           string         `gorm:"type:text" json:"notes"`
Documents       []string       `gorm:"type:jsonb" json:"documents"`
CreatedAt       time.Time      `json:"created_at"`
UpdatedAt       time.Time      `json:"updated_at"`
DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}
