package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/realestate-platform/property-service/internal/model"
	"github.com/realestate-platform/property-service/pkg/database"
	"go.uber.org/zap"
)

type PropertyRepository interface {
	Create(ctx context.Context, property *model.Property) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Property, error)
	List(ctx context.Context, limit, offset int) ([]*model.Property, error)
	Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetNearby(ctx context.Context, lat, lon float64, radiusKm float64, limit int) ([]*model.Property, error)
	IncrementViewCount(ctx context.Context, id uuid.UUID) error
}

type propertyRepository struct {
	db     *database.DB
	logger *zap.Logger
}

func NewPropertyRepository(db *database.DB, logger *zap.Logger) PropertyRepository {
	return &propertyRepository{
		db:     db,
		logger: logger,
	}
}

func (r *propertyRepository) Create(ctx context.Context, property *model.Property) error {
	query := `
		INSERT INTO properties (
			id, title, description, property_type, listing_type, status, price, currency,
			address_line1, address_line2, city, state, postal_code, country,
			latitude, longitude, bedrooms, bathrooms, square_feet, lot_size, year_built, parking,
			features, amenities, images, virtual_tour_url, owner_id, agent_id,
			view_count, favorite_count, created_at, updated_at, published_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18, $19, $20, $21, $22,
			$23, $24, $25, $26, $27, $28,
			$29, $30, $31, $32, $33
		)
	`
	
	_, err := r.db.Pool.Exec(ctx, query,
		property.ID, property.Title, property.Description, property.PropertyType, property.ListingType,
		property.Status, property.Price, property.Currency,
		property.AddressLine1, property.AddressLine2, property.City, property.State, property.PostalCode, property.Country,
		property.Latitude, property.Longitude, property.Bedrooms, property.Bathrooms, property.SquareFeet,
		property.LotSize, property.YearBuilt, property.Parking,
		property.Features, property.Amenities, property.Images, property.VirtualTourURL, property.OwnerID, property.AgentID,
		property.ViewCount, property.FavoriteCount, property.CreatedAt, property.UpdatedAt, property.PublishedAt,
	)
	
	if err != nil {
		r.logger.Error("Failed to create property", zap.Error(err))
		return fmt.Errorf("failed to create property: %w", err)
	}
	
	return nil
}

func (r *propertyRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Property, error) {
	query := `
		SELECT id, title, description, property_type, listing_type, status, price, currency,
			address_line1, address_line2, city, state, postal_code, country,
			latitude, longitude, bedrooms, bathrooms, square_feet, lot_size, year_built, parking,
			features, amenities, images, virtual_tour_url, owner_id, agent_id,
			view_count, favorite_count, created_at, updated_at, published_at
		FROM properties
		WHERE id = $1
	`
	
	var property model.Property
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&property.ID, &property.Title, &property.Description, &property.PropertyType, &property.ListingType,
		&property.Status, &property.Price, &property.Currency,
		&property.AddressLine1, &property.AddressLine2, &property.City, &property.State, &property.PostalCode, &property.Country,
		&property.Latitude, &property.Longitude, &property.Bedrooms, &property.Bathrooms, &property.SquareFeet,
		&property.LotSize, &property.YearBuilt, &property.Parking,
		&property.Features, &property.Amenities, &property.Images, &property.VirtualTourURL, &property.OwnerID, &property.AgentID,
		&property.ViewCount, &property.FavoriteCount, &property.CreatedAt, &property.UpdatedAt, &property.PublishedAt,
	)
	
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("property not found")
		}
		r.logger.Error("Failed to get property", zap.Error(err))
		return nil, fmt.Errorf("failed to get property: %w", err)
	}
	
	return &property, nil
}

func (r *propertyRepository) List(ctx context.Context, limit, offset int) ([]*model.Property, error) {
	query := `
		SELECT id, title, description, property_type, listing_type, status, price, currency,
			address_line1, address_line2, city, state, postal_code, country,
			latitude, longitude, bedrooms, bathrooms, square_feet, lot_size, year_built, parking,
			features, amenities, images, virtual_tour_url, owner_id, agent_id,
			view_count, favorite_count, created_at, updated_at, published_at
		FROM properties
		WHERE status = 'active'
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		r.logger.Error("Failed to list properties", zap.Error(err))
		return nil, fmt.Errorf("failed to list properties: %w", err)
	}
	defer rows.Close()
	
	var properties []*model.Property
	for rows.Next() {
		var property model.Property
		err := rows.Scan(
			&property.ID, &property.Title, &property.Description, &property.PropertyType, &property.ListingType,
			&property.Status, &property.Price, &property.Currency,
			&property.AddressLine1, &property.AddressLine2, &property.City, &property.State, &property.PostalCode, &property.Country,
			&property.Latitude, &property.Longitude, &property.Bedrooms, &property.Bathrooms, &property.SquareFeet,
			&property.LotSize, &property.YearBuilt, &property.Parking,
			&property.Features, &property.Amenities, &property.Images, &property.VirtualTourURL, &property.OwnerID, &property.AgentID,
			&property.ViewCount, &property.FavoriteCount, &property.CreatedAt, &property.UpdatedAt, &property.PublishedAt,
		)
		if err != nil {
			r.logger.Error("Failed to scan property", zap.Error(err))
			continue
		}
		properties = append(properties, &property)
	}
	
	return properties, nil
}

func (r *propertyRepository) Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	updates["updated_at"] = time.Now()
	
	// Build dynamic update query
	query := "UPDATE properties SET "
	args := []interface{}{}
	argIndex := 1
	
	for key, value := range updates {
		if argIndex > 1 {
			query += ", "
		}
		query += fmt.Sprintf("%s = $%d", key, argIndex)
		args = append(args, value)
		argIndex++
	}
	
	query += fmt.Sprintf(" WHERE id = $%d", argIndex)
	args = append(args, id)
	
	_, err := r.db.Pool.Exec(ctx, query, args...)
	if err != nil {
		r.logger.Error("Failed to update property", zap.Error(err))
		return fmt.Errorf("failed to update property: %w", err)
	}
	
	return nil
}

func (r *propertyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "UPDATE properties SET status = 'deleted', updated_at = $1 WHERE id = $2"
	
	_, err := r.db.Pool.Exec(ctx, query, time.Now(), id)
	if err != nil {
		r.logger.Error("Failed to delete property", zap.Error(err))
		return fmt.Errorf("failed to delete property: %w", err)
	}
	
	return nil
}

func (r *propertyRepository) GetNearby(ctx context.Context, lat, lon float64, radiusKm float64, limit int) ([]*model.Property, error) {
	// Using PostGIS ST_DWithin for geospatial query
	query := `
		SELECT id, title, description, property_type, listing_type, status, price, currency,
			address_line1, address_line2, city, state, postal_code, country,
			latitude, longitude, bedrooms, bathrooms, square_feet, lot_size, year_built, parking,
			features, amenities, images, virtual_tour_url, owner_id, agent_id,
			view_count, favorite_count, created_at, updated_at, published_at,
			ST_Distance(
				ST_MakePoint(longitude, latitude)::geography,
				ST_MakePoint($1, $2)::geography
			) as distance
		FROM properties
		WHERE status = 'active'
			AND ST_DWithin(
				ST_MakePoint(longitude, latitude)::geography,
				ST_MakePoint($1, $2)::geography,
				$3
			)
		ORDER BY distance
		LIMIT $4
	`
	
	rows, err := r.db.Pool.Query(ctx, query, lon, lat, radiusKm*1000, limit)
	if err != nil {
		r.logger.Error("Failed to get nearby properties", zap.Error(err))
		return nil, fmt.Errorf("failed to get nearby properties: %w", err)
	}
	defer rows.Close()
	
	var properties []*model.Property
	for rows.Next() {
		var property model.Property
		var distance float64
		err := rows.Scan(
			&property.ID, &property.Title, &property.Description, &property.PropertyType, &property.ListingType,
			&property.Status, &property.Price, &property.Currency,
			&property.AddressLine1, &property.AddressLine2, &property.City, &property.State, &property.PostalCode, &property.Country,
			&property.Latitude, &property.Longitude, &property.Bedrooms, &property.Bathrooms, &property.SquareFeet,
			&property.LotSize, &property.YearBuilt, &property.Parking,
			&property.Features, &property.Amenities, &property.Images, &property.VirtualTourURL, &property.OwnerID, &property.AgentID,
			&property.ViewCount, &property.FavoriteCount, &property.CreatedAt, &property.UpdatedAt, &property.PublishedAt,
			&distance,
		)
		if err != nil {
			r.logger.Error("Failed to scan property", zap.Error(err))
			continue
		}
		properties = append(properties, &property)
	}
	
	return properties, nil
}

func (r *propertyRepository) IncrementViewCount(ctx context.Context, id uuid.UUID) error {
	query := "UPDATE properties SET view_count = view_count + 1 WHERE id = $1"
	
	_, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		r.logger.Error("Failed to increment view count", zap.Error(err))
		return fmt.Errorf("failed to increment view count: %w", err)
	}
	
	return nil
}
