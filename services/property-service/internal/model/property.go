package model

import (
	"time"

	"github.com/google/uuid"
)

// Property represents a real estate property
type Property struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	Title           string     `json:"title" db:"title"`
	Description     *string    `json:"description" db:"description"`
	PropertyType    string     `json:"property_type" db:"property_type"`
	ListingType     string     `json:"listing_type" db:"listing_type"`
	Status          string     `json:"status" db:"status"`
	Price           int64      `json:"price" db:"price"`
	Currency        string     `json:"currency" db:"currency"`
	
	// Address
	AddressLine1    string     `json:"address_line1" db:"address_line1"`
	AddressLine2    *string    `json:"address_line2" db:"address_line2"`
	City            string     `json:"city" db:"city"`
	State           string     `json:"state" db:"state"`
	PostalCode      string     `json:"postal_code" db:"postal_code"`
	Country         string     `json:"country" db:"country"`
	
	// Geospatial
	Latitude        float64    `json:"latitude" db:"latitude"`
	Longitude       float64    `json:"longitude" db:"longitude"`
	
	// Property Details
	Bedrooms        *int       `json:"bedrooms" db:"bedrooms"`
	Bathrooms       *int       `json:"bathrooms" db:"bathrooms"`
	SquareFeet      *int       `json:"square_feet" db:"square_feet"`
	LotSize         *int       `json:"lot_size" db:"lot_size"`
	YearBuilt       *int       `json:"year_built" db:"year_built"`
	Parking         *int       `json:"parking" db:"parking"`
	
	// Features
	Features        *string    `json:"features" db:"features"` // JSON array
	Amenities       *string    `json:"amenities" db:"amenities"` // JSON array
	
	// Media
	Images          *string    `json:"images" db:"images"` // JSON array of URLs
	VirtualTourURL  *string    `json:"virtual_tour_url" db:"virtual_tour_url"`
	
	// Ownership
	OwnerID         uuid.UUID  `json:"owner_id" db:"owner_id"`
	AgentID         *uuid.UUID `json:"agent_id" db:"agent_id"`
	
	// Metadata
	ViewCount       int        `json:"view_count" db:"view_count"`
	FavoriteCount   int        `json:"favorite_count" db:"favorite_count"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
	PublishedAt     *time.Time `json:"published_at" db:"published_at"`
}

// CreatePropertyRequest represents the request to create a property
type CreatePropertyRequest struct {
	Title           string     `json:"title" binding:"required"`
	Description     *string    `json:"description"`
	PropertyType    string     `json:"property_type" binding:"required"`
	ListingType     string     `json:"listing_type" binding:"required"`
	Price           int64      `json:"price" binding:"required"`
	Currency        string     `json:"currency" binding:"required"`
	AddressLine1    string     `json:"address_line1" binding:"required"`
	AddressLine2    *string    `json:"address_line2"`
	City            string     `json:"city" binding:"required"`
	State           string     `json:"state" binding:"required"`
	PostalCode      string     `json:"postal_code" binding:"required"`
	Country         string     `json:"country" binding:"required"`
	Latitude        float64    `json:"latitude" binding:"required"`
	Longitude       float64    `json:"longitude" binding:"required"`
	Bedrooms        *int       `json:"bedrooms"`
	Bathrooms       *int       `json:"bathrooms"`
	SquareFeet      *int       `json:"square_feet"`
	LotSize         *int       `json:"lot_size"`
	YearBuilt       *int       `json:"year_built"`
	Parking         *int       `json:"parking"`
	Features        *string    `json:"features"`
	Amenities       *string    `json:"amenities"`
}

// UpdatePropertyRequest represents the request to update a property
type UpdatePropertyRequest struct {
	Title           *string    `json:"title"`
	Description     *string    `json:"description"`
	PropertyType    *string    `json:"property_type"`
	ListingType     *string    `json:"listing_type"`
	Status          *string    `json:"status"`
	Price           *int64     `json:"price"`
	Currency        *string    `json:"currency"`
	AddressLine1    *string    `json:"address_line1"`
	AddressLine2    *string    `json:"address_line2"`
	City            *string    `json:"city"`
	State           *string    `json:"state"`
	PostalCode      *string    `json:"postal_code"`
	Country         *string    `json:"country"`
	Latitude        *float64   `json:"latitude"`
	Longitude       *float64   `json:"longitude"`
	Bedrooms        *int       `json:"bedrooms"`
	Bathrooms       *int       `json:"bathrooms"`
	SquareFeet      *int       `json:"square_feet"`
	LotSize         *int       `json:"lot_size"`
	YearBuilt       *int       `json:"year_built"`
	Parking         *int       `json:"parking"`
	Features        *string    `json:"features"`
	Amenities       *string    `json:"amenities"`
}

// PropertyEvent represents an event published to Kafka
type PropertyEvent struct {
	EventType    string      `json:"event_type"`
	PropertyID   uuid.UUID   `json:"property_id"`
	Timestamp    time.Time   `json:"timestamp"`
	UserID       uuid.UUID   `json:"user_id"`
	Data         interface{} `json:"data"`
}

// Event types
const (
	EventPropertyCreated   = "property.created"
	EventPropertyUpdated   = "property.updated"
	EventPropertyDeleted   = "property.deleted"
	EventPropertyViewed    = "property.viewed"
	EventPropertyFavorited = "property.favorited"
)
