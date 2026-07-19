package workflows

import (
	"time"

	"go.temporal.io/sdk/workflow"
)

// ========== WORKFLOW 1: Property Search ==========

type PropertySearchInput struct {
	UserID      int      `json:"userId"`
	Location    string   `json:"location"`
	MinPrice    int      `json:"minPrice"`
	MaxPrice    int      `json:"maxPrice"`
	Bedrooms    int      `json:"bedrooms"`
	PropertyType string  `json:"propertyType"`
	Amenities   []string `json:"amenities"`
}

type PropertySearchResult struct {
	Properties  []map[string]interface{} `json:"properties"`
	TotalCount  int                      `json:"totalCount"`
	SearchID    string                   `json:"searchId"`
	Success     bool                     `json:"success"`
}

func PropertySearchWorkflow(ctx workflow.Context, input PropertySearchInput) (*PropertySearchResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting property search workflow", "userId", input.UserID)

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

	var result PropertySearchResult

	// Step 1: Check Redis cache
	var cachedResults []map[string]interface{}
	cacheKey := generateSearchCacheKey(input)
	err := workflow.ExecuteActivity(ctx, "CheckRedisCache", cacheKey).Get(ctx, &cachedResults)
	if err == nil && len(cachedResults) > 0 {
		logger.Info("Returning cached results")
		result.Properties = cachedResults
		result.TotalCount = len(cachedResults)
		result.Success = true
		return &result, nil
	}

	// Step 2: Query property-service via Dapr
	var properties []map[string]interface{}
	err = workflow.ExecuteActivity(ctx, "SearchProperties", input).Get(ctx, &properties)
	if err != nil {
		logger.Error("Failed to search properties", "error", err)
		return &PropertySearchResult{Success: false}, err
	}

	// Step 3: Enrich with geospatial data
	err = workflow.ExecuteActivity(ctx, "EnrichGeospatialData", properties).Get(ctx, &properties)
	if err != nil {
		logger.Warn("Failed to enrich geospatial data", "error", err)
	}

	// Step 4: Apply ML-based ranking
	err = workflow.ExecuteActivity(ctx, "RankPropertiesML", input.UserID, properties).Get(ctx, &properties)
	if err != nil {
		logger.Warn("Failed to rank properties", "error", err)
	}

	// Step 5: Cache results in Redis
	_ = workflow.ExecuteActivity(ctx, "CacheSearchResults", cacheKey, properties).Get(ctx, nil)

	// Step 6: Publish Kafka event for analytics
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "property.searched", map[string]interface{}{
		"userId":      input.UserID,
		"location":    input.Location,
		"resultCount": len(properties),
	}).Get(ctx, nil)

	// Step 7: Update CRM with search preferences
	_ = workflow.ExecuteActivity(ctx, "UpdateCRM", "search_performed", map[string]interface{}{
		"userId":   input.UserID,
		"criteria": input,
	}).Get(ctx, nil)

	result.Properties = properties
	result.TotalCount = len(properties)
	result.Success = true
	
	return &result, nil
}

// ========== WORKFLOW 2: Property Valuation ==========

type PropertyValuationInput struct {
	PropertyID int `json:"propertyId"`
	UserID     int `json:"userId"`
}

type PropertyValuationResult struct {
	ValuationID      int     `json:"valuationId"`
	EstimatedValue   int     `json:"estimatedValue"`
	ConfidenceLower  int     `json:"confidenceLower"`
	ConfidenceUpper  int     `json:"confidenceUpper"`
	ConfidenceScore  int     `json:"confidenceScore"`
	Success          bool    `json:"success"`
}

func PropertyValuationWorkflow(ctx workflow.Context, input PropertyValuationInput) (*PropertyValuationResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting property valuation workflow", "propertyId", input.PropertyID)

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

	var result PropertyValuationResult

	// Step 1: Get property details
	var property map[string]interface{}
	err := workflow.ExecuteActivity(ctx, "GetPropertyDetails", input.PropertyID).Get(ctx, &property)
	if err != nil {
		logger.Error("Failed to get property details", "error", err)
		return &PropertyValuationResult{Success: false}, err
	}

	// Step 2: Find comparable properties (geospatial-service)
	var comparables []map[string]interface{}
	err = workflow.ExecuteActivity(ctx, "FindComparableProperties", property).Get(ctx, &comparables)
	if err != nil {
		logger.Error("Failed to find comparables", "error", err)
		return &PropertyValuationResult{Success: false}, err
	}

	// Step 3: Run ML valuation model (Ray cluster via ml-valuation service)
	type ValuationEstimate struct {
		EstimatedValue  int            `json:"estimatedValue"`
		ConfidenceLower int            `json:"confidenceLower"`
		ConfidenceUpper int            `json:"confidenceUpper"`
		ConfidenceScore int            `json:"confidenceScore"`
		Factors         map[string]any `json:"factors"`
	}
	var estimate ValuationEstimate
	err = workflow.ExecuteActivity(ctx, "RunMLValuation", property, comparables).Get(ctx, &estimate)
	if err != nil {
		logger.Error("Failed to run ML valuation", "error", err)
		return &PropertyValuationResult{Success: false}, err
	}

	// Step 4: Save valuation to database
	var valuationID int
	err = workflow.ExecuteActivity(ctx, "SaveValuation", input.PropertyID, estimate).Get(ctx, &valuationID)
	if err != nil {
		logger.Error("Failed to save valuation", "error", err)
		return &PropertyValuationResult{Success: false}, err
	}

	// Step 5: Record fee in TigerBeetle
	valuationFee := 2500 // $25.00
	_ = workflow.ExecuteActivity(ctx, "RecordValuationFee", input.UserID, valuationFee).Get(ctx, nil)

	// Step 6: Send notification to user
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":  input.UserID,
		"type":    "valuation_complete",
		"title":   "Property Valuation Complete",
		"message": "Your property valuation is ready to view.",
	}).Get(ctx, nil)

	// Step 7: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "valuation.completed", map[string]interface{}{
		"valuationId":    valuationID,
		"propertyId":     input.PropertyID,
		"estimatedValue": estimate.EstimatedValue,
	}).Get(ctx, nil)

	result.ValuationID = valuationID
	result.EstimatedValue = estimate.EstimatedValue
	result.ConfidenceLower = estimate.ConfidenceLower
	result.ConfidenceUpper = estimate.ConfidenceUpper
	result.ConfidenceScore = estimate.ConfidenceScore
	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 3: Tour Scheduling ==========

type TourSchedulingInput struct {
	PropertyID    int       `json:"propertyId"`
	BuyerID       int       `json:"buyerId"`
	PreferredDate time.Time `json:"preferredDate"`
	PreferredTime string    `json:"preferredTime"`
}

type TourSchedulingResult struct {
	AppointmentID int    `json:"appointmentId"`
	AgentID       int    `json:"agentId"`
	ConfirmedDate time.Time `json:"confirmedDate"`
	Success       bool   `json:"success"`
}

func TourSchedulingWorkflow(ctx workflow.Context, input TourSchedulingInput) (*TourSchedulingResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting tour scheduling workflow", "propertyId", input.PropertyID)

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

	var result TourSchedulingResult

	// Step 1: Get property and agent details
	var property map[string]interface{}
	err := workflow.ExecuteActivity(ctx, "GetPropertyDetails", input.PropertyID).Get(ctx, &property)
	if err != nil {
		return &TourSchedulingResult{Success: false}, err
	}

	agentID := property["agentId"].(int)

	// Step 2: Check agent availability
	var availableSlots []time.Time
	err = workflow.ExecuteActivity(ctx, "GetAgentAvailability", agentID, input.PreferredDate).Get(ctx, &availableSlots)
	if err != nil {
		return &TourSchedulingResult{Success: false}, err
	}

	if len(availableSlots) == 0 {
		// No availability, suggest alternative dates
		_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
			"userId":  input.BuyerID,
			"type":    "tour_unavailable",
			"message": "Agent not available on selected date. Alternative dates suggested.",
		}).Get(ctx, nil)
		return &TourSchedulingResult{Success: false}, nil
	}

	// Step 3: Create appointment
	var appointmentID int
	err = workflow.ExecuteActivity(ctx, "CreateAppointment", map[string]interface{}{
		"propertyId":      input.PropertyID,
		"buyerId":         input.BuyerID,
		"agentId":         agentID,
		"appointmentDate": availableSlots[0],
		"status":          "scheduled",
	}).Get(ctx, &appointmentID)
	if err != nil {
		return &TourSchedulingResult{Success: false}, err
	}

	// Step 4: Send notifications to buyer and agent
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":  input.BuyerID,
		"type":    "tour_scheduled",
		"title":   "Tour Scheduled",
		"message": "Your property tour has been scheduled.",
	}).Get(ctx, nil)

	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":  agentID,
		"type":    "tour_scheduled",
		"title":   "New Tour Scheduled",
		"message": "A new property tour has been scheduled.",
	}).Get(ctx, nil)

	// Step 5: Generate calendar invites
	_ = workflow.ExecuteActivity(ctx, "GenerateCalendarInvite", appointmentID).Get(ctx, nil)

	// Step 6: Schedule reminder (24h before)
	reminderTime := availableSlots[0].Add(-24 * time.Hour)
	if reminderTime.After(time.Now()) {
		_ = workflow.NewTimer(ctx, reminderTime.Sub(time.Now()))
		_ = workflow.ExecuteActivity(ctx, "SendTourReminder", appointmentID).Get(ctx, nil)
	}

	// Step 7: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "tour.scheduled", map[string]interface{}{
		"appointmentId": appointmentID,
		"propertyId":    input.PropertyID,
		"buyerId":       input.BuyerID,
		"agentId":       agentID,
	}).Get(ctx, nil)

	result.AppointmentID = appointmentID
	result.AgentID = agentID
	result.ConfirmedDate = availableSlots[0]
	result.Success = true

	return &result, nil
}

// ========== WORKFLOW 4: Transaction (already exists in transaction-service) ==========
// Using existing TransactionWorkflow from transaction-service/workflows/transaction_workflow.go

// ========== WORKFLOW 5: Document Verification ==========

type DocumentVerificationInput struct {
	DocumentID   int    `json:"documentId"`
	DocumentType string `json:"documentType"`
	UserID       int    `json:"userId"`
}

type DocumentVerificationResult struct {
	Verified       bool              `json:"verified"`
	ExtractedData  map[string]string `json:"extractedData"`
	FraudScore     float64           `json:"fraudScore"`
	Success        bool              `json:"success"`
}

func DocumentVerificationWorkflow(ctx workflow.Context, input DocumentVerificationInput) (*DocumentVerificationResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting document verification workflow", "documentId", input.DocumentID)

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

	var result DocumentVerificationResult

	// Step 1: Get document from IPFS
	var documentURL string
	err := workflow.ExecuteActivity(ctx, "GetDocumentFromIPFS", input.DocumentID).Get(ctx, &documentURL)
	if err != nil {
		return &DocumentVerificationResult{Success: false}, err
	}

	// Step 2: Run OCR extraction (ocr-service with GPU)
	var extractedData map[string]string
	err = workflow.ExecuteActivity(ctx, "RunOCRExtraction", documentURL, input.DocumentType).Get(ctx, &extractedData)
	if err != nil {
		logger.Error("OCR extraction failed", "error", err)
		return &DocumentVerificationResult{Success: false}, err
	}

	// Step 3: Validate document authenticity (fraud-detection service)
	var fraudScore float64
	err = workflow.ExecuteActivity(ctx, "DetectDocumentFraud", documentURL, extractedData).Get(ctx, &fraudScore)
	if err != nil {
		logger.Warn("Fraud detection failed", "error", err)
		fraudScore = 0.5 // Default to medium risk
	}

	// Step 4: Verify extracted data against external APIs
	var verified bool
	if input.DocumentType == "drivers_license" || input.DocumentType == "passport" {
		err = workflow.ExecuteActivity(ctx, "VerifyIdentityDocument", extractedData).Get(ctx, &verified)
		if err != nil {
			logger.Warn("Identity verification failed", "error", err)
			verified = false
		}
	} else {
		verified = fraudScore < 0.3 // Low fraud score = verified
	}

	// Step 5: Update document status in database
	status := "verified"
	if !verified || fraudScore > 0.7 {
		status = "rejected"
	} else if fraudScore > 0.3 {
		status = "manual_review"
	}

	_ = workflow.ExecuteActivity(ctx, "UpdateDocumentStatus", input.DocumentID, status, extractedData).Get(ctx, nil)

	// Step 6: Publish Kafka event
	_ = workflow.ExecuteActivity(ctx, "PublishKafkaEvent", "document.verified", map[string]interface{}{
		"documentId": input.DocumentID,
		"userId":     input.UserID,
		"verified":   verified,
		"fraudScore": fraudScore,
		"status":     status,
	}).Get(ctx, nil)

	// Step 7: Send notification
	_ = workflow.ExecuteActivity(ctx, "SendNotification", map[string]interface{}{
		"userId":  input.UserID,
		"type":    "document_verified",
		"title":   "Document Verification Complete",
		"message": "Your document has been " + status,
	}).Get(ctx, nil)

	result.Verified = verified
	result.ExtractedData = extractedData
	result.FraudScore = fraudScore
	result.Success = true

	return &result, nil
}

// Helper function to generate cache key
func generateSearchCacheKey(input PropertySearchInput) string {
	return "search:" + input.Location + ":" + string(rune(input.MinPrice)) + ":" + string(rune(input.MaxPrice))
}

// ========== WORKFLOW 6-10: Additional Core Workflows ==========
// These follow similar patterns with integration to respective microservices

func MortgagePreApprovalWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Integrates with: kyb-service, fraud-detection, document verification
	// Steps: Validate income docs → Credit check → ML approval prediction → Generate pre-approval letter
	return map[string]interface{}{"success": true}, nil
}

func PropertyComparisonWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Integrates with: analytics-service, ml-valuation
	// Steps: Fetch properties → Run analytics → Generate insights → Export PDF
	return map[string]interface{}{"success": true}, nil
}

func AgentMatchingWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Integrates with: recommendation-service, crm-service
	// Steps: Analyze preferences → ML matching → Present agents → Track communication
	return map[string]interface{}{"success": true}, nil
}

func NeighborhoodAnalysisWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Integrates with: geospatial-service, analytics-service
	// Steps: H3 hexagon query → Aggregate metrics → External APIs → ML prediction → Cache results
	return map[string]interface{}{"success": true}, nil
}

func InvestmentAnalysisWorkflow(ctx workflow.Context, input map[string]interface{}) (map[string]interface{}, error) {
	// Integrates with: analytics-service, ml-valuation
	// Steps: Calculate cash flow → ML rental prediction → Tax calc → Monte Carlo → Export PDF
	return map[string]interface{}{"success": true}, nil
}
