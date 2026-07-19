package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

// BackendNotification represents a webhook notification to the TypeScript backend
type BackendNotification struct {
	Event     string      `json:"event"`
	EscrowID  string      `json:"escrowId"`
	Status    string      `json:"status"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// notifyBackend sends a notification to the TypeScript backend about an escrow event.
// It implements the previously stubbed TODO: Send notification to TypeScript backend.
func notifyBackend(escrowID string, event string) {
	backendURL := os.Getenv("BACKEND_WEBHOOK_URL")
	if backendURL == "" {
		backendURL = os.Getenv("BACKEND_URL")
		if backendURL == "" {
			log.Printf("notifyBackend: BACKEND_WEBHOOK_URL not configured, skipping notification for escrow %s event %s", escrowID, event)
			return
		}
		backendURL = backendURL + "/api/webhooks/mojaloop-escrow"
	}

	notification := BackendNotification{
		Event:     event,
		EscrowID:  escrowID,
		Status:    event,
		Timestamp: time.Now().UTC(),
	}

	payload, err := json.Marshal(notification)
	if err != nil {
		log.Printf("notifyBackend: failed to marshal notification: %v", err)
		return
	}

	// Retry up to 3 times with exponential backoff
	for attempt := 1; attempt <= 3; attempt++ {
		if err = sendNotification(backendURL, payload); err == nil {
			log.Printf("notifyBackend: successfully notified backend for escrow %s event %s", escrowID, event)
			return
		}
		log.Printf("notifyBackend: attempt %d failed for escrow %s event %s: %v", attempt, escrowID, event, err)
		if attempt < 3 {
			time.Sleep(time.Duration(attempt*attempt) * time.Second)
		}
	}
	log.Printf("notifyBackend: all attempts failed for escrow %s event %s", escrowID, event)
}

func sendNotification(url string, payload []byte) error {
	webhookSecret := os.Getenv("MOJALOOP_WEBHOOK_SECRET")

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Source", "mojaloop-service")
	if webhookSecret != "" {
		req.Header.Set("X-Webhook-Secret", webhookSecret)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("backend returned status %d", resp.StatusCode)
	}
	return nil
}
