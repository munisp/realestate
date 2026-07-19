package workflows

import (
	"time"

	"go.temporal.io/sdk/workflow"
)

// ShortletBookingInput represents the input for shortlet booking workflow
type ShortletBookingInput struct {
	PropertyID      int       `json:"propertyId"`
	GuestID         int       `json:"guestId"`
	CheckIn         time.Time `json:"checkIn"`
	CheckOut        time.Time `json:"checkOut"`
	NumberOfGuests  int       `json:"numberOfGuests"`
	SpecialRequests string    `json:"specialRequests"`
}

// ShortletBookingResult represents the workflow result
type ShortletBookingResult struct {
	BookingID       int    `json:"bookingId"`
	PaymentID       string `json:"paymentId"`
	ConfirmationCode string `json:"confirmationCode"`
	Success         bool   `json:"success"`
	Error           string `json:"error,omitempty"`
}

// ShortletBookingWorkflow orchestrates the complete shortlet booking process
// Integrates with: booking-service, payment-service, notification-service, Kafka, TigerBeetle
func ShortletBookingWorkflow(ctx workflow.Context, input ShortletBookingInput) (*ShortletBookingResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting shortlet booking workflow", "propertyId", input.PropertyID, "guestId", input.GuestID)

	// Set activity options with retries
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result ShortletBookingResult

	// Step 1: Check property availability (booking-service via Dapr)
	var available bool
	err := workflow.ExecuteActivity(ctx, "CheckShortletAvailability", input.PropertyID, input.CheckIn, input.CheckOut).Get(ctx, &available)
	if err != nil {
		logger.Error("Failed to check availability", "error", err)
		return &ShortletBookingResult{Success: false, Error: "availability check failed"}, err
	}

	if !available {
		logger.Warn("Property not available for selected dates")
		// Publish Kafka event: booking.failed
		_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "booking.failed", map[string]interface{}{
			"propertyId": input.PropertyID,
			"guestId":    input.GuestID,
			"reason":     "not_available",
		}).Get(ctx, nil)
		return &ShortletBookingResult{Success: false, Error: "property not available"}, nil
	}

	// Step 2: Calculate pricing (dynamic pricing service)
	type PricingResult struct {
		NightlyRate  int `json:"nightlyRate"`
		TotalNights  int `json:"totalNights"`
		CleaningFee  int `json:"cleaningFee"`
		ServiceFee   int `json:"serviceFee"`
		TotalAmount  int `json:"totalAmount"`
	}
	var pricing PricingResult
	err = workflow.ExecuteActivity(ctx, "CalculateShortletPrice", input.PropertyID, input.CheckIn, input.CheckOut).Get(ctx, &pricing)
	if err != nil {
		logger.Error("Failed to calculate pricing", "error", err)
		return &ShortletBookingResult{Success: false, Error: "pricing calculation failed"}, err
	}

	// Step 3: Create preliminary booking record (booking-service)
	var bookingID int
	err = workflow.ExecuteActivity(ctx, "CreateShortletBooking", input, pricing).Get(ctx, &bookingID)
	if err != nil {
		logger.Error("Failed to create booking", "error", err)
		return &ShortletBookingResult{Success: false, Error: "booking creation failed"}, err
	}
	result.BookingID = bookingID

	// Step 4: Create Stripe checkout session (payment-service)
	type CheckoutSession struct {
		SessionID string `json:"sessionId"`
		URL       string `json:"url"`
	}
	var session CheckoutSession
	err = workflow.ExecuteActivity(ctx, "CreateStripeCheckout", bookingID, pricing.TotalAmount, "shortlet_booking").Get(ctx, &session)
	if err != nil {
		logger.Error("Failed to create checkout session", "error", err)
		// Rollback booking
		_ = workflow.ExecuteActivity(ctx, "CancelShortletBooking", bookingID).Get(ctx, nil)
		return &ShortletBookingResult{Success: false, Error: "payment session creation failed"}, err
	}

	// Step 5: Wait for payment confirmation (signal from Stripe webhook)
	var paymentConfirmed bool
	var paymentID string
	
	selector := workflow.NewSelector(ctx)
	paymentChannel := workflow.GetSignalChannel(ctx, "payment-confirmed")
	selector.AddReceive(paymentChannel, func(c workflow.ReceiveChannel, more bool) {
		var payment struct {
			Confirmed bool   `json:"confirmed"`
			PaymentID string `json:"paymentId"`
		}
		c.Receive(ctx, &payment)
		paymentConfirmed = payment.Confirmed
		paymentID = payment.PaymentID
	})

	// Timeout after 30 minutes
	timer := workflow.NewTimer(ctx, 30*time.Minute)
	selector.AddFuture(timer, func(f workflow.Future) {
		paymentConfirmed = false
	})

	selector.Select(ctx)

	if !paymentConfirmed {
		logger.Warn("Payment not confirmed within timeout")
		// Cancel booking
		_ = workflow.ExecuteActivity(ctx, "CancelShortletBooking", bookingID).Get(ctx, nil)
		// Publish Kafka event
		_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "booking.payment_timeout", map[string]interface{}{
			"bookingId": bookingID,
			"guestId":   input.GuestID,
		}).Get(ctx, nil)
		return &ShortletBookingResult{Success: false, Error: "payment timeout"}, nil
	}

	result.PaymentID = paymentID

	// Step 6: Record payment in TigerBeetle ledger
	err = workflow.ExecuteActivity(ctx, "RecordPaymentInLedger", bookingID, paymentID, pricing.TotalAmount).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to record payment in ledger", "error", err)
		// Continue anyway, log for manual reconciliation
	}

	// Step 7: Confirm booking status
	err = workflow.ExecuteActivity(ctx, "ConfirmShortletBooking", bookingID, paymentID).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to confirm booking", "error", err)
		return &ShortletBookingResult{Success: false, Error: "booking confirmation failed"}, err
	}

	// Step 8: Generate confirmation code
	var confirmationCode string
	err = workflow.ExecuteActivity(ctx, "GenerateConfirmationCode", bookingID).Get(ctx, &confirmationCode)
	if err != nil {
		logger.Error("Failed to generate confirmation code", "error", err)
		confirmationCode = "PENDING"
	}
	result.ConfirmationCode = confirmationCode

	// Step 9: Send confirmation notifications (notification-service)
	type NotificationInput struct {
		BookingID        int    `json:"bookingId"`
		GuestID          int    `json:"guestId"`
		ConfirmationCode string `json:"confirmationCode"`
	}
	err = workflow.ExecuteActivity(ctx, "SendBookingConfirmation", NotificationInput{
		BookingID:        bookingID,
		GuestID:          input.GuestID,
		ConfirmationCode: confirmationCode,
	}).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to send confirmation", "error", err)
		// Continue anyway
	}

	// Step 10: Publish Kafka event for analytics
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "booking.confirmed", map[string]interface{}{
		"bookingId":        bookingID,
		"propertyId":       input.PropertyID,
		"guestId":          input.GuestID,
		"checkIn":          input.CheckIn,
		"checkOut":         input.CheckOut,
		"totalAmount":      pricing.TotalAmount,
		"confirmationCode": confirmationCode,
	}).Get(ctx, nil)

	// Step 11: Schedule pre-checkin reminder (1 day before)
	reminderTime := input.CheckIn.Add(-24 * time.Hour)
	if reminderTime.After(time.Now()) {
		_ = workflow.NewTimer(ctx, reminderTime.Sub(time.Now()))
		_ = workflow.ExecuteActivity(ctx, "SendCheckinReminder", bookingID, input.GuestID).Get(ctx, nil)
	}

	// Step 12: Update CRM (via Dapr pub/sub)
	_ = workflow.ExecuteActivity(ctx, "UpdateCRM", "booking_created", map[string]interface{}{
		"bookingId":  bookingID,
		"guestId":    input.GuestID,
		"propertyId": input.PropertyID,
		"value":      pricing.TotalAmount,
	}).Get(ctx, nil)

	result.Success = true
	logger.Info("Shortlet booking workflow completed successfully", "bookingId", bookingID)
	
	return &result, nil
}
