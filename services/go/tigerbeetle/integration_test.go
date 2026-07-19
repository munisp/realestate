package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"
)

const (
	baseURL = "http://localhost:5011"
)

// Test helper functions
func makeRequest(method, path string, body interface{}) (*http.Response, error) {
	var bodyReader *bytes.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonData)
	} else {
		bodyReader = bytes.NewReader([]byte{})
	}

	req, err := http.NewRequest(method, baseURL+path, bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	return client.Do(req)
}

func TestHealthCheck(t *testing.T) {
	resp, err := makeRequest("GET", "/health", nil)
	if err != nil {
		t.Fatalf("Health check failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if result["status"] != "healthy" && result["status"] != "degraded" {
		t.Errorf("Expected status 'healthy' or 'degraded', got %v", result["status"])
	}

	t.Logf("Health check response: %+v", result)
}

func TestGetInfo(t *testing.T) {
	resp, err := makeRequest("GET", "/info", nil)
	if err != nil {
		t.Fatalf("Get info failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if result["name"] != "tigerbeetle" {
		t.Errorf("Expected name 'tigerbeetle', got %v", result["name"])
	}

	t.Logf("Info response: %+v", result)
}

func TestEscrowLifecycle(t *testing.T) {
	escrowID := fmt.Sprintf("test_escrow_%d", time.Now().Unix())

	// Step 1: Create escrow
	t.Run("CreateEscrow", func(t *testing.T) {
		payload := map[string]interface{}{
			"escrow_id": escrowID,
			"amount":    100000, // 1000.00 in cents
			"currency":  "USD",
			"buyer_id":  "buyer_123",
			"seller_id": "seller_456",
			"metadata": map[string]interface{}{
				"property_id": "prop_789",
				"description": "Test property purchase",
			},
		}

		resp, err := makeRequest("POST", "/escrow/create", payload)
		if err != nil {
			t.Fatalf("Create escrow failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			var errResp map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&errResp)
			t.Fatalf("Expected status 201, got %d: %+v", resp.StatusCode, errResp)
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if !result["success"].(bool) {
			t.Errorf("Expected success=true, got %v", result["success"])
		}

		if result["status"] != "held" {
			t.Errorf("Expected status='held', got %v", result["status"])
		}

		providerEscrowID := result["provider_escrow_id"].(string)
		t.Logf("Created escrow: %s (provider ID: %s)", escrowID, providerEscrowID)

		// Store for next tests
		t.Cleanup(func() {
			// Cleanup: Try to get final status
			statusResp, _ := makeRequest("GET", "/escrow/status/"+providerEscrowID, nil)
			if statusResp != nil {
				defer statusResp.Body.Close()
				var status map[string]interface{}
				json.NewDecoder(statusResp.Body).Decode(&status)
				t.Logf("Final escrow status: %+v", status)
			}
		})
	})

	// Wait a bit for state to settle
	time.Sleep(100 * time.Millisecond)

	// Step 2: Get escrow status
	t.Run("GetEscrowStatus", func(t *testing.T) {
		// First create an escrow to get provider ID
		payload := map[string]interface{}{
			"escrow_id": escrowID + "_status",
			"amount":    50000,
			"currency":  "USD",
			"buyer_id":  "buyer_123",
			"seller_id": "seller_456",
		}

		createResp, err := makeRequest("POST", "/escrow/create", payload)
		if err != nil {
			t.Fatalf("Create escrow failed: %v", err)
		}
		defer createResp.Body.Close()

		var createResult map[string]interface{}
		json.NewDecoder(createResp.Body).Decode(&createResult)
		providerEscrowID := createResult["provider_escrow_id"].(string)

		// Now get status
		resp, err := makeRequest("GET", "/escrow/status/"+providerEscrowID, nil)
		if err != nil {
			t.Fatalf("Get status failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		t.Logf("Escrow status: %+v", result)
	})
}

func TestReleaseEscrow(t *testing.T) {
	escrowID := fmt.Sprintf("test_release_%d", time.Now().Unix())

	// Create escrow
	createPayload := map[string]interface{}{
		"escrow_id": escrowID,
		"amount":    200000,
		"currency":  "USD",
		"buyer_id":  "buyer_release",
		"seller_id": "seller_release",
	}

	createResp, err := makeRequest("POST", "/escrow/create", createPayload)
	if err != nil {
		t.Fatalf("Create escrow failed: %v", err)
	}
	defer createResp.Body.Close()

	var createResult map[string]interface{}
	json.NewDecoder(createResp.Body).Decode(&createResult)
	providerEscrowID := createResult["provider_escrow_id"].(string)

	time.Sleep(100 * time.Millisecond)

	// Release funds
	releasePayload := map[string]interface{}{
		"provider_escrow_id": providerEscrowID,
		"amount":             100000, // Partial release
	}

	releaseResp, err := makeRequest("POST", "/escrow/release", releasePayload)
	if err != nil {
		t.Fatalf("Release escrow failed: %v", err)
	}
	defer releaseResp.Body.Close()

	if releaseResp.StatusCode != http.StatusOK {
		var errResp map[string]interface{}
		json.NewDecoder(releaseResp.Body).Decode(&errResp)
		t.Fatalf("Expected status 200, got %d: %+v", releaseResp.StatusCode, errResp)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(releaseResp.Body).Decode(&result); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if !result["success"].(bool) {
		t.Errorf("Expected success=true, got %v", result["success"])
	}

	t.Logf("Released funds: %+v", result)
}

func TestRefundEscrow(t *testing.T) {
	escrowID := fmt.Sprintf("test_refund_%d", time.Now().Unix())

	// Create escrow
	createPayload := map[string]interface{}{
		"escrow_id": escrowID,
		"amount":    150000,
		"currency":  "USD",
		"buyer_id":  "buyer_refund",
		"seller_id": "seller_refund",
	}

	createResp, err := makeRequest("POST", "/escrow/create", createPayload)
	if err != nil {
		t.Fatalf("Create escrow failed: %v", err)
	}
	defer createResp.Body.Close()

	var createResult map[string]interface{}
	json.NewDecoder(createResp.Body).Decode(&createResult)
	providerEscrowID := createResult["provider_escrow_id"].(string)

	time.Sleep(100 * time.Millisecond)

	// Refund funds
	refundPayload := map[string]interface{}{
		"provider_escrow_id": providerEscrowID,
	}

	refundResp, err := makeRequest("POST", "/escrow/refund", refundPayload)
	if err != nil {
		t.Fatalf("Refund escrow failed: %v", err)
	}
	defer refundResp.Body.Close()

	if refundResp.StatusCode != http.StatusOK {
		var errResp map[string]interface{}
		json.NewDecoder(refundResp.Body).Decode(&errResp)
		t.Fatalf("Expected status 200, got %d: %+v", refundResp.StatusCode, errResp)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(refundResp.Body).Decode(&result); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if !result["success"].(bool) {
		t.Errorf("Expected success=true, got %v", result["success"])
	}

	t.Logf("Refunded funds: %+v", result)
}

func TestConcurrentEscrows(t *testing.T) {
	concurrency := 10
	done := make(chan bool, concurrency)
	errors := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		go func(index int) {
			escrowID := fmt.Sprintf("concurrent_test_%d_%d", time.Now().Unix(), index)
			payload := map[string]interface{}{
				"escrow_id": escrowID,
				"amount":    10000 + (index * 1000),
				"currency":  "USD",
				"buyer_id":  fmt.Sprintf("buyer_%d", index),
				"seller_id": fmt.Sprintf("seller_%d", index),
			}

			resp, err := makeRequest("POST", "/escrow/create", payload)
			if err != nil {
				errors <- fmt.Errorf("Request %d failed: %v", index, err)
				done <- false
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusCreated {
				errors <- fmt.Errorf("Request %d got status %d", index, resp.StatusCode)
				done <- false
				return
			}

			done <- true
		}(i)
	}

	// Wait for all goroutines
	successCount := 0
	for i := 0; i < concurrency; i++ {
		select {
		case success := <-done:
			if success {
				successCount++
			}
		case err := <-errors:
			t.Logf("Error: %v", err)
		case <-time.After(30 * time.Second):
			t.Fatal("Timeout waiting for concurrent requests")
		}
	}

	t.Logf("Concurrent test: %d/%d succeeded", successCount, concurrency)

	if successCount < concurrency/2 {
		t.Errorf("Too many failures: only %d/%d succeeded", successCount, concurrency)
	}
}
