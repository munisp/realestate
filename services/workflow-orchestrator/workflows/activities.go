package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/IBM/sarama"
	dapr "github.com/dapr/go-sdk/client"
	"github.com/go-redis/redis/v8"
)

// Activities contains all activity implementations
type Activities struct {
	kafkaProducer sarama.SyncProducer
	daprClient    dapr.Client
	redisClient   *redis.Client
	// TigerBeetle client would go here
	// tigerBeetleClient *tigerbeetle.Client
}

// NewActivities creates a new Activities instance
func NewActivities(kafkaBrokers []string, daprGRPCPort string, redisAddr string) (*Activities, error) {
	// Initialize Kafka producer
	config := sarama.NewConfig()
	config.Producer.Return.Successes = true
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Retry.Max = 3

	producer, err := sarama.NewSyncProducer(kafkaBrokers, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka producer: %w", err)
	}

	// Initialize Dapr client
	daprClient, err := dapr.NewClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create Dapr client: %w", err)
	}

	// Initialize Redis client
	redisClient := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	return &Activities{
		kafkaProducer: producer,
		daprClient:    daprClient,
		redisClient:   redisClient,
	}, nil
}

// PublishKafkaEvent publishes an event to Kafka
func (a *Activities) PublishKafkaEvent(ctx context.Context, topic string, payload map[string]interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	msg := &sarama.ProducerMessage{
		Topic: topic,
		Value: sarama.ByteEncoder(data),
		Headers: []sarama.RecordHeader{
			{
				Key:   []byte("timestamp"),
				Value: []byte(time.Now().Format(time.RFC3339)),
			},
		},
	}

	_, _, err = a.kafkaProducer.SendMessage(msg)
	if err != nil {
		return fmt.Errorf("failed to send Kafka message: %w", err)
	}

	return nil
}

// CheckShortletAvailability checks if a property is available via Dapr service invocation
func (a *Activities) CheckShortletAvailability(ctx context.Context, propertyID int, checkIn, checkOut time.Time) (bool, error) {
	req := map[string]interface{}{
		"propertyId": propertyID,
		"checkIn":    checkIn.Format(time.RFC3339),
		"checkOut":   checkOut.Format(time.RFC3339),
	}

	reqData, _ := json.Marshal(req)
	
	// Invoke booking-service via Dapr
	resp, err := a.daprClient.InvokeMethod(ctx, "booking-service", "check-availability", "post", reqData)
	if err != nil {
		return false, fmt.Errorf("failed to check availability: %w", err)
	}

	var result struct {
		Available bool `json:"available"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return false, err
	}

	return result.Available, nil
}

// CalculateShortletPrice calculates pricing via Dapr
func (a *Activities) CalculateShortletPrice(ctx context.Context, propertyID int, checkIn, checkOut time.Time) (map[string]int, error) {
	req := map[string]interface{}{
		"propertyId": propertyID,
		"checkIn":    checkIn.Format(time.RFC3339),
		"checkOut":   checkOut.Format(time.RFC3339),
	}

	reqData, _ := json.Marshal(req)
	
	resp, err := a.daprClient.InvokeMethod(ctx, "booking-service", "calculate-price", "post", reqData)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate price: %w", err)
	}

	var result map[string]int
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	return result, nil
}

// CreateShortletBooking creates a booking record via Dapr
func (a *Activities) CreateShortletBooking(ctx context.Context, input interface{}, pricing interface{}) (int, error) {
	req := map[string]interface{}{
		"booking": input,
		"pricing": pricing,
	}

	reqData, _ := json.Marshal(req)
	
	resp, err := a.daprClient.InvokeMethod(ctx, "booking-service", "create-booking", "post", reqData)
	if err != nil {
		return 0, fmt.Errorf("failed to create booking: %w", err)
	}

	var result struct {
		BookingID int `json:"bookingId"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return 0, err
	}

	return result.BookingID, nil
}

// CreateStripeCheckout creates a Stripe checkout session via payment-service
func (a *Activities) CreateStripeCheckout(ctx context.Context, referenceID int, amount int, paymentType string) (map[string]string, error) {
	req := map[string]interface{}{
		"referenceId": referenceID,
		"amount":      amount,
		"type":        paymentType,
	}

	reqData, _ := json.Marshal(req)
	
	resp, err := a.daprClient.InvokeMethod(ctx, "payment-service", "create-checkout", "post", reqData)
	if err != nil {
		return nil, fmt.Errorf("failed to create checkout: %w", err)
	}

	var result map[string]string
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	return result, nil
}

// RecordPaymentInLedger records payment in TigerBeetle
func (a *Activities) RecordPaymentInLedger(ctx context.Context, bookingID int, paymentID string, amount int) error {
	// In production, this would use TigerBeetle client
	// For now, we'll use Dapr to invoke tigerbeetle-service
	req := map[string]interface{}{
		"bookingId": bookingID,
		"paymentId": paymentID,
		"amount":    amount,
		"timestamp": time.Now().Unix(),
	}

	reqData, _ := json.Marshal(req)
	
	_, err := a.daprClient.InvokeMethod(ctx, "tigerbeetle-service", "record-payment", "post", reqData)
	if err != nil {
		return fmt.Errorf("failed to record payment in ledger: %w", err)
	}

	return nil
}

// ConfirmShortletBooking confirms a booking
func (a *Activities) ConfirmShortletBooking(ctx context.Context, bookingID int, paymentID string) error {
	req := map[string]interface{}{
		"bookingId": bookingID,
		"paymentId": paymentID,
		"status":    "confirmed",
	}

	reqData, _ := json.Marshal(req)
	
	_, err := a.daprClient.InvokeMethod(ctx, "booking-service", "confirm-booking", "post", reqData)
	if err != nil {
		return fmt.Errorf("failed to confirm booking: %w", err)
	}

	return nil
}

// GenerateConfirmationCode generates a unique confirmation code
func (a *Activities) GenerateConfirmationCode(ctx context.Context, bookingID int) (string, error) {
	// Generate 6-character alphanumeric code
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, 6)
	for i := range code {
		code[i] = charset[rand.Intn(len(charset))]
	}
	
	confirmationCode := string(code)
	
	// Store in Redis with booking ID mapping
	key := fmt.Sprintf("confirmation:%s", confirmationCode)
	err := a.redisClient.Set(ctx, key, bookingID, 90*24*time.Hour).Err()
	if err != nil {
		return "", fmt.Errorf("failed to store confirmation code: %w", err)
	}

	return confirmationCode, nil
}

// SendBookingConfirmation sends confirmation email/SMS via notification-service
func (a *Activities) SendBookingConfirmation(ctx context.Context, input interface{}) error {
	reqData, _ := json.Marshal(input)
	
	_, err := a.daprClient.InvokeMethod(ctx, "notification-service", "send-booking-confirmation", "post", reqData)
	if err != nil {
		return fmt.Errorf("failed to send confirmation: %w", err)
	}

	return nil
}

// SendNotification sends a notification via notification-service
func (a *Activities) SendNotification(ctx context.Context, notification map[string]interface{}) error {
	reqData, _ := json.Marshal(notification)
	
	_, err := a.daprClient.InvokeMethod(ctx, "notification-service", "send", "post", reqData)
	if err != nil {
		return fmt.Errorf("failed to send notification: %w", err)
	}

	return nil
}

// UpdateCRM updates CRM via Dapr pub/sub
func (a *Activities) UpdateCRM(ctx context.Context, eventType string, data map[string]interface{}) error {
	payload := map[string]interface{}{
		"eventType": eventType,
		"data":      data,
		"timestamp": time.Now().Unix(),
	}

	payloadData, _ := json.Marshal(payload)
	
	// Publish to CRM topic via Dapr pub/sub
	err := a.daprClient.PublishEvent(ctx, "pubsub", "crm-events", payloadData)
	if err != nil {
		return fmt.Errorf("failed to publish CRM event: %w", err)
	}

	return nil
}

// CancelShortletBooking cancels a booking
func (a *Activities) CancelShortletBooking(ctx context.Context, bookingID int) error {
	req := map[string]interface{}{
		"bookingID": bookingID,
		"status":    "cancelled",
	}

	reqData, _ := json.Marshal(req)
	
	_, err := a.daprClient.InvokeMethod(ctx, "booking-service", "cancel-booking", "post", reqData)
	if err != nil {
		return fmt.Errorf("failed to cancel booking: %w", err)
	}

	return nil
}

// SendCheckinReminder sends a check-in reminder
func (a *Activities) SendCheckinReminder(ctx context.Context, bookingID int, guestID int) error {
	notification := map[string]interface{}{
		"userId":    guestID,
		"type":      "checkin_reminder",
		"title":     "Check-in Reminder",
		"message":   "Your check-in is tomorrow!",
		"bookingId": bookingID,
	}

	return a.SendNotification(ctx, notification)
}

// Builder/Milestone Activities

// ValidateMilestone validates if a milestone is ready for payment
func (a *Activities) ValidateMilestone(ctx context.Context, milestoneID int) (bool, error) {
	req := map[string]interface{}{
		"milestoneId": milestoneID,
	}

	reqData, _ := json.Marshal(req)
	
	resp, err := a.daprClient.InvokeMethod(ctx, "developer-service", "validate-milestone", "post", reqData)
	if err != nil {
		return false, fmt.Errorf("failed to validate milestone: %w", err)
	}

	var result struct {
		Valid bool `json:"valid"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return false, err
	}

	return result.Valid, nil
}

// CreateEscrowAccount creates an escrow account in TigerBeetle
func (a *Activities) CreateEscrowAccount(ctx context.Context, projectID int, milestoneID int, amount int) (int, error) {
	req := map[string]interface{}{
		"projectId":   projectID,
		"milestoneId": milestoneID,
		"amount":      amount,
		"status":      "pending",
	}

	reqData, _ := json.Marshal(req)
	
	resp, err := a.daprClient.InvokeMethod(ctx, "tigerbeetle-service", "create-escrow", "post", reqData)
	if err != nil {
		return 0, fmt.Errorf("failed to create escrow: %w", err)
	}

	var result struct {
		EscrowID int `json:"escrowId"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return 0, err
	}

	return result.EscrowID, nil
}

// FundEscrowAccount funds an escrow account
func (a *Activities) FundEscrowAccount(ctx context.Context, escrowID int, paymentID string, amount int) error {
	req := map[string]interface{}{
		"escrowId":  escrowID,
		"paymentId": paymentID,
		"amount":    amount,
		"status":    "funded",
	}

	reqData, _ := json.Marshal(req)
	
	_, err := a.daprClient.InvokeMethod(ctx, "tigerbeetle-service", "fund-escrow", "post", reqData)
	if err != nil {
		return fmt.Errorf("failed to fund escrow: %w", err)
	}

	return nil
}

// UpdateMilestoneStatus updates milestone status
func (a *Activities) UpdateMilestoneStatus(ctx context.Context, milestoneID int, status string, paymentID string) error {
	req := map[string]interface{}{
		"milestoneId": milestoneID,
		"status":      status,
		"paymentId":   paymentID,
	}

	reqData, _ := json.Marshal(req)
	
	_, err := a.daprClient.InvokeMethod(ctx, "developer-service", "update-milestone-status", "post", reqData)
	if err != nil {
		return fmt.Errorf("failed to update milestone status: %w", err)
	}

	return nil
}

// CancelEscrowAccount cancels an escrow account
func (a *Activities) CancelEscrowAccount(ctx context.Context, escrowID int) error {
	req := map[string]interface{}{
		"escrowId": escrowID,
		"status":   "cancelled",
	}

	reqData, _ := json.Marshal(req)
	
	_, err := a.daprClient.InvokeMethod(ctx, "tigerbeetle-service", "cancel-escrow", "post", reqData)
	if err != nil {
		return fmt.Errorf("failed to cancel escrow: %w", err)
	}

	return nil
}

// Close closes all connections
func (a *Activities) Close() error {
	if err := a.kafkaProducer.Close(); err != nil {
		return err
	}
	if err := a.daprClient.Close(); err != nil {
		return err
	}
	if err := a.redisClient.Close(); err != nil {
		return err
	}
	return nil
}
