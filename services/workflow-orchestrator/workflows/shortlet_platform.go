package workflows

import (
	"time"

	"go.temporal.io/sdk/workflow"
)

// ========== WORKFLOW 11: Shortlet Search ==========

type ShortletSearchInput struct {
	UserID     int       `json:"userId"`
	Location   string    `json:"location"`
	CheckIn    time.Time `json:"checkIn"`
	CheckOut   time.Time `json:"checkOut"`
	Guests     int       `json:"guests"`
	MinPrice   int       `json:"minPrice"`
	MaxPrice   int       `json:"maxPrice"`
	Amenities  []string  `json:"amenities"`
}

type ShortletSearchResult struct {
	Properties []map[string]interface{} `json:"properties"`
	TotalCount int                      `json:"totalCount"`
	SearchID   string                   `json:"searchId"`
	Success    bool                     `json:"success"`
}

func ShortletSearchWorkflow(ctx workflow.Context, input ShortletSearchInput) (*ShortletSearchResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting shortlet search workflow", "location", input.Location)

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

	var result ShortletSearchResult

	// Step 1: Check Redis cache
	cacheKey := "shortlet:" + input.Location + ":" + input.CheckIn.Format("2006-01-02")
	var cachedResults []map[string]interface{}
	err := workflow.ExecuteActivity(ctx, "CheckRedisCache", cacheKey).Get(ctx, &cachedResults)
	if err == nil && len(cachedResults) > 0 {
		result.Properties = cachedResults
		result.TotalCount = len(cachedResults)
		result.Success = true
		return &result, nil
	}

	// Step 2: Query booking-service for available properties
	var properties []map[string]interface{}
	err = workflow.ExecuteActivity(ctx, "SearchShortletProperties", input).Get(ctx, &properties)
	if err != nil {
		return &ShortletSearchResult{Success: false}, err
	}

	// Step 3: Check availability for date range
	var availableProperties []map[string]interface{}
	for _, prop := range properties {
		var available bool
		propertyID := int(prop["id"].(float64))
		err = workflow.ExecuteActivity(ctx, "CheckShortletAvailability", propertyID, input.CheckIn, input.CheckOut).Get(ctx, &available)
		if err == nil && available {
			availableProperties = append(availableProperties, prop)
		}
	}

	// Step 4: Calculate dynamic pricing for each property
	for i := range availableProperties {
		var pricing map[string]int
		propertyID := int(availableProperties[i]["id"].(float64))
		err = workflow.ExecuteActivity(ctx, "CalculateShortletPrice", propertyID, input.CheckIn, input.CheckOut).Get(ctx, &pricing)
		if err == nil {
			availableProperties[i]["pricing"] = pricing
		}
	}

	// Step 5: Apply ML-based ranking
	err = workflow.ExecuteActivity(ctx, "RankShortletProperties", input.UserID, availableProperties).Get(ctx, &availableProperties)
	if err != nil {
		logger.Warn("Failed to rank properties", "error", err)
	}

	// Step 6: Cache results
	_ = workflow.ExecuteActivity(ctx, "CacheSearchResults", cacheKey, availableProperties).Get(ctx, nil)

	// Step 7: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "shortlet.searched", map[string]interface{}{
		"userId":      input.UserID,
		"location":    input.Location,
		"checkIn":     input.CheckIn,
		"checkOut":    input.CheckOut,
		"resultCount": len(availableProperties),
	}).Get(ctx, nil)

	result.Properties = availableProperties
	result.TotalCount = len(availableProperties)
	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 12: Shortlet Booking (already implemented) ==========
// See shortlet_booking.go

// ========== WORKFLOW 13: Host Onboarding ==========

type HostOnboardingInput struct {
	UserID       int    `json:"userId"`
	PropertyData map[string]interface{} `json:"propertyData"`
}

type HostOnboardingResult struct {
	PropertyID int  `json:"propertyId"`
	Approved   bool `json:"approved"`
	Success    bool `json:"success"`
}

func HostOnboardingWorkflow(ctx workflow.Context, input HostOnboardingInput) (*HostOnboardingResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting host onboarding workflow", "userId", input.UserID)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result HostOnboardingResult

	// Step 1: Create property listing
	var propertyID int
	err := workflow.ExecuteActivity(ctx, "CreatePropertyListing", input.PropertyData).Get(ctx, &propertyID)
	if err != nil {
		return &HostOnboardingResult{Success: false}, err
	}
	result.PropertyID = propertyID

	// Step 2: Optimize and upload photos (image-service)
	photos := input.PropertyData["photos"].([]interface{})
	var optimizedPhotos []string
	for _, photo := range photos {
		var optimizedURL string
		err = workflow.ExecuteActivity(ctx, "OptimizePropertyImage", photo.(string)).Get(ctx, &optimizedURL)
		if err == nil {
			optimizedPhotos = append(optimizedPhotos, optimizedURL)
		}
	}
	_ = workflow.ExecuteActivity(ctx, "UpdatePropertyPhotos", propertyID, optimizedPhotos).Get(ctx, nil)

	// Step 3: Verify property documents (verification-service)
	var documentsVerified bool
	err = workflow.ExecuteActivity(ctx, "VerifyPropertyDocuments", propertyID).Get(ctx, &documentsVerified)
	if err != nil {
		logger.Warn("Document verification failed", "error", err)
		documentsVerified = false
	}

	// Step 4: Run fraud detection on listing
	var fraudScore float64
	err = workflow.ExecuteActivity(ctx, "DetectListingFraud", propertyID, input.PropertyData).Get(ctx, &fraudScore)
	if err != nil {
		logger.Warn("Fraud detection failed", "error", err)
		fraudScore = 0.5
	}

	// Step 5: Approve or reject listing
	approved := documentsVerified && fraudScore < 0.3
	status := "approved"
	if !approved {
		status = "pending_review"
	}
	_ = workflow.ExecuteActivity(ctx, "UpdatePropertyStatus", propertyID, status).Get(ctx, nil)

	// Step 6: Send onboarding guide
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":  input.UserID,
		"type":    "host_onboarding",
		"title":   "Welcome to Shortlet Hosting",
		"message": "Your property listing is " + status,
	}).Get(ctx, nil)

	// Step 7: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "host.onboarded", map[string]interface{}{
		"userId":     input.UserID,
		"propertyId": propertyID,
		"approved":   approved,
	}).Get(ctx, nil)

	// Step 8: Update CRM
	_ = workflow.ExecuteActivity(ctx, "UpdateCRM", "host_onboarded", map[string]interface{}{
		"userId":     input.UserID,
		"propertyId": propertyID,
		"status":     status,
	}).Get(ctx, nil)

	result.Approved = approved
	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 14: Guest Check-in ==========

type GuestCheckinInput struct {
	BookingID int `json:"bookingId"`
	GuestID   int `json:"guestId"`
}

type GuestCheckinResult struct {
	AccessCode string `json:"accessCode"`
	Success    bool   `json:"success"`
}

func GuestCheckinWorkflow(ctx workflow.Context, input GuestCheckinInput) (*GuestCheckinResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting guest check-in workflow", "bookingId", input.BookingID)

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

	var result GuestCheckinResult

	// Step 1: Validate booking status
	var booking map[string]interface{}
	err := workflow.ExecuteActivity(ctx, "GetBookingDetails", input.BookingID).Get(ctx, &booking)
	if err != nil {
		return &GuestCheckinResult{Success: false}, err
	}

	if booking["status"] != "confirmed" {
		return &GuestCheckinResult{Success: false}, nil
	}

	// Step 2: Generate smart lock access code
	var accessCode string
	err = workflow.ExecuteActivity(ctx, "GenerateSmartLockCode", input.BookingID).Get(ctx, &accessCode)
	if err != nil {
		return &GuestCheckinResult{Success: false}, err
	}

	// Step 3: Send code to smart lock API
	propertyID := int(booking["propertyId"].(float64))
	err = workflow.ExecuteActivity(ctx, "ActivateSmartLock", propertyID, accessCode).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to activate smart lock", "error", err)
		return &GuestCheckinResult{Success: false}, err
	}

	// Step 4: Send access code to guest via SMS and app
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":     input.GuestID,
		"type":       "checkin_code",
		"title":      "Your Access Code",
		"message":    "Your access code is: " + accessCode,
		"accessCode": accessCode,
	}).Get(ctx, nil)

	// Step 5: Update booking status
	_ = workflow.ExecuteActivity(ctx, "UpdateBookingStatus", input.BookingID, "checked_in").Get(ctx, nil)

	// Step 6: Notify host
	hostID := int(booking["hostId"].(float64))
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":  hostID,
		"type":    "guest_checked_in",
		"title":   "Guest Checked In",
		"message": "Your guest has checked in.",
	}).Get(ctx, nil)

	// Step 7: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "guest.checked_in", map[string]interface{}{
		"bookingId":  input.BookingID,
		"guestId":    input.GuestID,
		"propertyId": propertyID,
	}).Get(ctx, nil)

	result.AccessCode = accessCode
	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 15: Cleaning Scheduling ==========

type CleaningSchedulingInput struct {
	BookingID  int `json:"bookingId"`
	PropertyID int `json:"propertyId"`
}

type CleaningSchedulingResult struct {
	CleaningRequestID int  `json:"cleaningRequestId"`
	CleanerID         int  `json:"cleanerId"`
	Success           bool `json:"success"`
}

func CleaningSchedulingWorkflow(ctx workflow.Context, input CleaningSchedulingInput) (*CleaningSchedulingResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting cleaning scheduling workflow", "bookingId", input.BookingID)

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

	var result CleaningSchedulingResult

	// Step 1: Get booking checkout time
	var booking map[string]interface{}
	err := workflow.ExecuteActivity(ctx, "GetBookingDetails", input.BookingID).Get(ctx, &booking)
	if err != nil {
		return &CleaningSchedulingResult{Success: false}, err
	}

	checkoutTime := booking["checkOut"].(time.Time)

	// Step 2: Create cleaning request
	var cleaningRequestID int
	err = workflow.ExecuteActivity(ctx, "CreateCleaningRequest", map[string]interface{}{
		"propertyId":     input.PropertyID,
		"scheduledTime":  checkoutTime.Add(1 * time.Hour),
		"cleaningType":   "checkout",
		"status":         "pending",
	}).Get(ctx, &cleaningRequestID)
	if err != nil {
		return &CleaningSchedulingResult{Success: false}, err
	}
	result.CleaningRequestID = cleaningRequestID

	// Step 3: Assign cleaner (CRM service)
	var cleanerID int
	err = workflow.ExecuteActivity(ctx, "AssignCleaner", input.PropertyID, checkoutTime).Get(ctx, &cleanerID)
	if err != nil {
		logger.Error("Failed to assign cleaner", "error", err)
		return &CleaningSchedulingResult{Success: false}, err
	}
	result.CleanerID = cleanerID

	// Step 4: Notify cleaner
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":  cleanerID,
		"type":    "cleaning_assigned",
		"title":   "New Cleaning Assignment",
		"message": "You have been assigned a cleaning task.",
	}).Get(ctx, nil)

	// Step 5: Wait for cleaning completion signal
	var cleaningCompleted bool
	completionChannel := workflow.GetSignalChannel(ctx, "cleaning-completed")
	
	selector := workflow.NewSelector(ctx)
	selector.AddReceive(completionChannel, func(c workflow.ReceiveChannel, more bool) {
		c.Receive(ctx, &cleaningCompleted)
	})

	// Timeout after 6 hours
	timer := workflow.NewTimer(ctx, 6*time.Hour)
	selector.AddFuture(timer, func(f workflow.Future) {
		cleaningCompleted = false
	})

	selector.Select(ctx)

	if !cleaningCompleted {
		logger.Warn("Cleaning not completed within timeout")
		return &result, nil
	}

	// Step 6: Verify cleaning with photos
	var photosVerified bool
	err = workflow.ExecuteActivity(ctx, "VerifyCleaningPhotos", cleaningRequestID).Get(ctx, &photosVerified)
	if err != nil || !photosVerified {
		logger.Warn("Cleaning photos not verified")
	}

	// Step 7: Mark property as available
	_ = workflow.ExecuteActivity(ctx, "UpdatePropertyAvailability", input.PropertyID, true).Get(ctx, nil)

	// Step 8: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "cleaning.completed", map[string]interface{}{
		"cleaningRequestId": cleaningRequestID,
		"propertyId":        input.PropertyID,
		"cleanerId":         cleanerID,
	}).Get(ctx, nil)

	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 16: Dynamic Pricing ==========

type DynamicPricingInput struct {
	PropertyID int `json:"propertyId"`
	HostID     int `json:"hostId"`
}

type DynamicPricingResult struct {
	NewPrice    int  `json:"newPrice"`
	OldPrice    int  `json:"oldPrice"`
	Success     bool `json:"success"`
}

func DynamicPricingWorkflow(ctx workflow.Context, input DynamicPricingInput) (*DynamicPricingResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting dynamic pricing workflow", "propertyId", input.PropertyID)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Minute,
		RetryPolicy: &workflow.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result DynamicPricingResult

	// Step 1: Get current pricing
	var currentPrice int
	err := workflow.ExecuteActivity(ctx, "GetPropertyPrice", input.PropertyID).Get(ctx, &currentPrice)
	if err != nil {
		return &DynamicPricingResult{Success: false}, err
	}
	result.OldPrice = currentPrice

	// Step 2: Analyze demand (analytics-service)
	var demandMetrics map[string]interface{}
	err = workflow.ExecuteActivity(ctx, "AnalyzeDemand", input.PropertyID).Get(ctx, &demandMetrics)
	if err != nil {
		return &DynamicPricingResult{Success: false}, err
	}

	// Step 3: Get competitor pricing
	var competitorPrices []int
	err = workflow.ExecuteActivity(ctx, "ScrapeCompetitorPricing", input.PropertyID).Get(ctx, &competitorPrices)
	if err != nil {
		logger.Warn("Failed to get competitor pricing", "error", err)
	}

	// Step 4: Check for events/holidays
	var eventPricing map[string]interface{}
	err = workflow.ExecuteActivity(ctx, "GetEventBasedPricing", input.PropertyID).Get(ctx, &eventPricing)
	if err != nil {
		logger.Warn("Failed to get event pricing", "error", err)
	}

	// Step 5: Run ML pricing model
	var optimalPrice int
	err = workflow.ExecuteActivity(ctx, "CalculateOptimalPrice", map[string]interface{}{
		"propertyId":       input.PropertyID,
		"currentPrice":     currentPrice,
		"demandMetrics":    demandMetrics,
		"competitorPrices": competitorPrices,
		"eventPricing":     eventPricing,
	}).Get(ctx, &optimalPrice)
	if err != nil {
		return &DynamicPricingResult{Success: false}, err
	}
	result.NewPrice = optimalPrice

	// Step 6: Update pricing in database
	_ = workflow.ExecuteActivity(ctx, "UpdatePropertyPrice", input.PropertyID, optimalPrice).Get(ctx, nil)

	// Step 7: Notify host of price change
	priceChange := ((optimalPrice - currentPrice) * 100) / currentPrice
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":      input.HostID,
		"type":        "price_updated",
		"title":       "Pricing Updated",
		"message":     "Your property price has been updated based on market demand.",
		"oldPrice":    currentPrice,
		"newPrice":    optimalPrice,
		"changePercent": priceChange,
	}).Get(ctx, nil)

	// Step 8: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "pricing.updated", map[string]interface{}{
		"propertyId": input.PropertyID,
		"oldPrice":   currentPrice,
		"newPrice":   optimalPrice,
	}).Get(ctx, nil)

	result.Success = true

	return &result, nil
}

// ========== WORKFLOWS 17-20: Additional Shortlet Workflows ==========

func ReviewWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Steps: Guest submits review → Fraud detection → Host notification → Host response → Update rating
	return map[string]interface{}{"success": true}, nil
}

func DisputeResolutionWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Steps: Open dispute → Evidence upload → Assign mediator → Review → Decision → Refund if applicable
	return map[string]interface{}{"success": true}, nil
}

func HostPayoutWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Steps: Calculate payout → Deduct fees → Stripe transfer → TigerBeetle record → Notification
	return map[string]interface{}{"success": true}, nil
}

func PropertyManagementWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Steps: Aggregate metrics → Calculate occupancy → Revenue analysis → Export reports
	return map[string]interface{}{"success": true}, nil
}
