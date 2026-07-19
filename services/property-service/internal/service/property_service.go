package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	dapr "github.com/dapr/go-sdk/client"
	"github.com/realestate-platform/property-service/internal/model"
	"github.com/realestate-platform/property-service/internal/repository"
	"github.com/realestate-platform/property-service/pkg/kafka"
	"github.com/realestate-platform/property-service/pkg/redis"
	"go.uber.org/zap"
)

type PropertyService interface {
	CreateProperty(ctx context.Context, req *model.CreatePropertyRequest, userID uuid.UUID) (*model.Property, error)
	GetProperty(ctx context.Context, id uuid.UUID) (*model.Property, error)
	ListProperties(ctx context.Context, limit, offset int) ([]*model.Property, error)
	UpdateProperty(ctx context.Context, id uuid.UUID, req *model.UpdatePropertyRequest, userID uuid.UUID) (*model.Property, error)
	DeleteProperty(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	GetNearbyProperties(ctx context.Context, lat, lon, radiusKm float64, limit int) ([]*model.Property, error)
	RecordView(ctx context.Context, propertyID, userID uuid.UUID) error
}

type propertyService struct {
	repo   repository.PropertyRepository
	cache  *redis.Client
	kafka  *kafka.Producer
	dapr   dapr.Client
	logger *zap.Logger
}

func NewPropertyService(
	repo repository.PropertyRepository,
	cache *redis.Client,
	kafka *kafka.Producer,
	dapr dapr.Client,
	logger *zap.Logger,
) PropertyService {
	return &propertyService{
		repo:   repo,
		cache:  cache,
		kafka:  kafka,
		dapr:   dapr,
		logger: logger,
	}
}

func (s *propertyService) CreateProperty(ctx context.Context, req *model.CreatePropertyRequest, userID uuid.UUID) (*model.Property, error) {
	property := &model.Property{
		ID:             uuid.New(),
		Title:          req.Title,
		Description:    req.Description,
		PropertyType:   req.PropertyType,
		ListingType:    req.ListingType,
		Status:         "draft",
		Price:          req.Price,
		Currency:       req.Currency,
		AddressLine1:   req.AddressLine1,
		AddressLine2:   req.AddressLine2,
		City:           req.City,
		State:          req.State,
		PostalCode:     req.PostalCode,
		Country:        req.Country,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		Bedrooms:       req.Bedrooms,
		Bathrooms:      req.Bathrooms,
		SquareFeet:     req.SquareFeet,
		LotSize:        req.LotSize,
		YearBuilt:      req.YearBuilt,
		Parking:        req.Parking,
		Features:       req.Features,
		Amenities:      req.Amenities,
		OwnerID:        userID,
		ViewCount:      0,
		FavoriteCount:  0,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	
	if err := s.repo.Create(ctx, property); err != nil {
		return nil, err
	}
	
	// Publish event to Kafka
	event := model.PropertyEvent{
		EventType:  model.EventPropertyCreated,
		PropertyID: property.ID,
		Timestamp:  time.Now(),
		UserID:     userID,
		Data:       property,
	}
	
	if err := s.kafka.PublishEvent(property.ID.String(), event); err != nil {
		s.logger.Error("Failed to publish property created event", zap.Error(err))
	}
	
	return property, nil
}

func (s *propertyService) GetProperty(ctx context.Context, id uuid.UUID) (*model.Property, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("property:%s", id.String())
	if cachedData, err := s.cache.Get(ctx, cacheKey); err == nil {
		var property model.Property
		if err := json.Unmarshal([]byte(cachedData), &property); err == nil {
			return &property, nil
		}
	}
	
	// Get from database
	property, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	
	// Cache the result
	if propertyJSON, err := json.Marshal(property); err == nil {
		s.cache.Set(ctx, cacheKey, propertyJSON, 15*time.Minute)
	}
	
	return property, nil
}

func (s *propertyService) ListProperties(ctx context.Context, limit, offset int) ([]*model.Property, error) {
	return s.repo.List(ctx, limit, offset)
}

func (s *propertyService) UpdateProperty(ctx context.Context, id uuid.UUID, req *model.UpdatePropertyRequest, userID uuid.UUID) (*model.Property, error) {
	// Get existing property
	property, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	
	// Check ownership
	if property.OwnerID != userID {
		return nil, fmt.Errorf("unauthorized: user does not own this property")
	}
	
	// Build updates map
	updates := make(map[string]interface{})
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.PropertyType != nil {
		updates["property_type"] = *req.PropertyType
	}
	if req.ListingType != nil {
		updates["listing_type"] = *req.ListingType
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Price != nil {
		updates["price"] = *req.Price
	}
	if req.Currency != nil {
		updates["currency"] = *req.Currency
	}
	if req.AddressLine1 != nil {
		updates["address_line1"] = *req.AddressLine1
	}
	if req.AddressLine2 != nil {
		updates["address_line2"] = *req.AddressLine2
	}
	if req.City != nil {
		updates["city"] = *req.City
	}
	if req.State != nil {
		updates["state"] = *req.State
	}
	if req.PostalCode != nil {
		updates["postal_code"] = *req.PostalCode
	}
	if req.Country != nil {
		updates["country"] = *req.Country
	}
	if req.Latitude != nil {
		updates["latitude"] = *req.Latitude
	}
	if req.Longitude != nil {
		updates["longitude"] = *req.Longitude
	}
	if req.Bedrooms != nil {
		updates["bedrooms"] = *req.Bedrooms
	}
	if req.Bathrooms != nil {
		updates["bathrooms"] = *req.Bathrooms
	}
	if req.SquareFeet != nil {
		updates["square_feet"] = *req.SquareFeet
	}
	if req.LotSize != nil {
		updates["lot_size"] = *req.LotSize
	}
	if req.YearBuilt != nil {
		updates["year_built"] = *req.YearBuilt
	}
	if req.Parking != nil {
		updates["parking"] = *req.Parking
	}
	if req.Features != nil {
		updates["features"] = *req.Features
	}
	if req.Amenities != nil {
		updates["amenities"] = *req.Amenities
	}
	
	if err := s.repo.Update(ctx, id, updates); err != nil {
		return nil, err
	}
	
	// Invalidate cache
	cacheKey := fmt.Sprintf("property:%s", id.String())
	s.cache.Delete(ctx, cacheKey)
	
	// Get updated property
	updatedProperty, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	
	// Publish event to Kafka
	event := model.PropertyEvent{
		EventType:  model.EventPropertyUpdated,
		PropertyID: id,
		Timestamp:  time.Now(),
		UserID:     userID,
		Data:       updatedProperty,
	}
	
	if err := s.kafka.PublishEvent(id.String(), event); err != nil {
		s.logger.Error("Failed to publish property updated event", zap.Error(err))
	}
	
	return updatedProperty, nil
}

func (s *propertyService) DeleteProperty(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	// Get existing property
	property, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	
	// Check ownership
	if property.OwnerID != userID {
		return fmt.Errorf("unauthorized: user does not own this property")
	}
	
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	
	// Invalidate cache
	cacheKey := fmt.Sprintf("property:%s", id.String())
	s.cache.Delete(ctx, cacheKey)
	
	// Publish event to Kafka
	event := model.PropertyEvent{
		EventType:  model.EventPropertyDeleted,
		PropertyID: id,
		Timestamp:  time.Now(),
		UserID:     userID,
		Data:       nil,
	}
	
	if err := s.kafka.PublishEvent(id.String(), event); err != nil {
		s.logger.Error("Failed to publish property deleted event", zap.Error(err))
	}
	
	return nil
}

func (s *propertyService) GetNearbyProperties(ctx context.Context, lat, lon, radiusKm float64, limit int) ([]*model.Property, error) {
	return s.repo.GetNearby(ctx, lat, lon, radiusKm, limit)
}

func (s *propertyService) RecordView(ctx context.Context, propertyID, userID uuid.UUID) error {
	if err := s.repo.IncrementViewCount(ctx, propertyID); err != nil {
		return err
	}
	
	// Publish view event to Kafka
	event := model.PropertyEvent{
		EventType:  model.EventPropertyViewed,
		PropertyID: propertyID,
		Timestamp:  time.Now(),
		UserID:     userID,
		Data:       nil,
	}
	
	if err := s.kafka.PublishEvent(propertyID.String(), event); err != nil {
		s.logger.Error("Failed to publish property viewed event", zap.Error(err))
	}
	
	return nil
}
