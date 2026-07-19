package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisEscrowStore implements escrow storage with Redis
type RedisEscrowStore struct {
	client *redis.Client
	ctx    context.Context
}

// NewRedisEscrowStore creates a new Redis-backed escrow store
func NewRedisEscrowStore(redisURL string) (*RedisEscrowStore, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid Redis URL: %w", err)
	}

	client := redis.NewClient(opt)
	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisEscrowStore{
		client: client,
		ctx:    ctx,
	}, nil
}

// Close closes the Redis connection
func (s *RedisEscrowStore) Close() error {
	return s.client.Close()
}

// Create adds a new escrow
func (s *RedisEscrowStore) Create(escrow *Escrow) error {
	key := fmt.Sprintf("escrow:%s", escrow.ID)

	// Check if exists
	exists, err := s.client.Exists(s.ctx, key).Result()
	if err != nil {
		return fmt.Errorf("failed to check existence: %w", err)
	}
	if exists > 0 {
		return fmt.Errorf("escrow already exists: %s", escrow.ID)
	}

	// Serialize escrow
	data, err := json.Marshal(escrow)
	if err != nil {
		return fmt.Errorf("failed to marshal escrow: %w", err)
	}

	// Store in Redis
	if err := s.client.Set(s.ctx, key, data, 0).Err(); err != nil {
		return fmt.Errorf("failed to store escrow: %w", err)
	}

	// Add to project index
	projectKey := fmt.Sprintf("project:%d:escrows", escrow.ProjectID)
	if err := s.client.SAdd(s.ctx, projectKey, escrow.ID).Err(); err != nil {
		return fmt.Errorf("failed to add to project index: %w", err)
	}

	// Log event
	s.logEvent(escrow.ID, "created", map[string]interface{}{
		"amount":   escrow.Amount,
		"currency": escrow.Currency,
		"buyer_id": escrow.BuyerID,
		"seller_id": escrow.SellerID,
	})

	return nil
}

// Get retrieves an escrow by ID
func (s *RedisEscrowStore) Get(id string) (*Escrow, error) {
	key := fmt.Sprintf("escrow:%s", id)

	data, err := s.client.Get(s.ctx, key).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("escrow not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get escrow: %w", err)
	}

	var escrow Escrow
	if err := json.Unmarshal([]byte(data), &escrow); err != nil {
		return nil, fmt.Errorf("failed to unmarshal escrow: %w", err)
	}

	return &escrow, nil
}

// Update updates an existing escrow
func (s *RedisEscrowStore) Update(escrow *Escrow) error {
	key := fmt.Sprintf("escrow:%s", escrow.ID)

	// Check if exists
	exists, err := s.client.Exists(s.ctx, key).Result()
	if err != nil {
		return fmt.Errorf("failed to check existence: %w", err)
	}
	if exists == 0 {
		return fmt.Errorf("escrow not found: %s", escrow.ID)
	}

	// Get old version for event logging
	oldEscrow, _ := s.Get(escrow.ID)

	// Update timestamp
	escrow.UpdatedAt = time.Now()

	// Serialize escrow
	data, err := json.Marshal(escrow)
	if err != nil {
		return fmt.Errorf("failed to marshal escrow: %w", err)
	}

	// Store in Redis
	if err := s.client.Set(s.ctx, key, data, 0).Err(); err != nil {
		return fmt.Errorf("failed to update escrow: %w", err)
	}

	// Log event if status changed
	if oldEscrow != nil && oldEscrow.Status != escrow.Status {
		s.logEvent(escrow.ID, "status_changed", map[string]interface{}{
			"old_status": oldEscrow.Status,
			"new_status": escrow.Status,
		})
	}

	return nil
}

// List returns all escrows for a project
func (s *RedisEscrowStore) List(projectID int) []*Escrow {
	projectKey := fmt.Sprintf("project:%d:escrows", projectID)

	// Get all escrow IDs for this project
	escrowIDs, err := s.client.SMembers(s.ctx, projectKey).Result()
	if err != nil {
		return []*Escrow{}
	}

	var escrows []*Escrow
	for _, id := range escrowIDs {
		escrow, err := s.Get(id)
		if err == nil {
			escrows = append(escrows, escrow)
		}
	}

	return escrows
}

// Event sourcing functions

// EscrowEvent represents an event in the escrow lifecycle
type EscrowEvent struct {
	ID        string                 `json:"id"`
	EscrowID  string                 `json:"escrow_id"`
	EventType string                 `json:"event_type"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

// logEvent logs an event to the event stream
func (s *RedisEscrowStore) logEvent(escrowID, eventType string, data map[string]interface{}) error {
	event := EscrowEvent{
		ID:        fmt.Sprintf("%s_%d", escrowID, time.Now().UnixNano()),
		EscrowID:  escrowID,
		EventType: eventType,
		Data:      data,
		Timestamp: time.Now(),
	}

	eventData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// Add to escrow event stream
	streamKey := fmt.Sprintf("escrow:%s:events", escrowID)
	if err := s.client.XAdd(s.ctx, &redis.XAddArgs{
		Stream: streamKey,
		Values: map[string]interface{}{
			"event": eventData,
		},
	}).Err(); err != nil {
		return fmt.Errorf("failed to log event: %w", err)
	}

	// Add to global event stream
	if err := s.client.XAdd(s.ctx, &redis.XAddArgs{
		Stream: "escrow:events:global",
		MaxLen: 10000, // Keep last 10k events
		Values: map[string]interface{}{
			"event": eventData,
		},
	}).Err(); err != nil {
		return fmt.Errorf("failed to log to global stream: %w", err)
	}

	return nil
}

// GetEvents retrieves all events for an escrow
func (s *RedisEscrowStore) GetEvents(escrowID string) ([]EscrowEvent, error) {
	streamKey := fmt.Sprintf("escrow:%s:events", escrowID)

	messages, err := s.client.XRange(s.ctx, streamKey, "-", "+").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get events: %w", err)
	}

	var events []EscrowEvent
	for _, msg := range messages {
		if eventData, ok := msg.Values["event"].(string); ok {
			var event EscrowEvent
			if err := json.Unmarshal([]byte(eventData), &event); err == nil {
				events = append(events, event)
			}
		}
	}

	return events, nil
}

// GetGlobalEvents retrieves recent global events
func (s *RedisEscrowStore) GetGlobalEvents(count int64) ([]EscrowEvent, error) {
	messages, err := s.client.XRevRangeN(s.ctx, "escrow:events:global", "+", "-", count).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get global events: %w", err)
	}

	var events []EscrowEvent
	for _, msg := range messages {
		if eventData, ok := msg.Values["event"].(string); ok {
			var event EscrowEvent
			if err := json.Unmarshal([]byte(eventData), &event); err == nil {
				events = append(events, event)
			}
		}
	}

	return events, nil
}

// Stats and monitoring

// GetStats returns statistics about escrows
func (s *RedisEscrowStore) GetStats() (map[string]interface{}, error) {
	// Count total escrows
	keys, err := s.client.Keys(s.ctx, "escrow:*").Result()
	if err != nil {
		return nil, err
	}

	totalEscrows := 0
	for _, key := range keys {
		if len(key) > 7 && key[:7] == "escrow:" && key[len(key)-7:] != ":events" {
			totalEscrows++
		}
	}

	// Count by status
	statusCounts := make(map[string]int)
	for _, key := range keys {
		if len(key) > 7 && key[:7] == "escrow:" && key[len(key)-7:] != ":events" {
			data, err := s.client.Get(s.ctx, key).Result()
			if err == nil {
				var escrow Escrow
				if err := json.Unmarshal([]byte(data), &escrow); err == nil {
					statusCounts[string(escrow.Status)]++
				}
			}
		}
	}

	return map[string]interface{}{
		"total_escrows": totalEscrows,
		"by_status":     statusCounts,
	}, nil
}
