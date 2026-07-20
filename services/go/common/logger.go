// Package common provides shared utilities for all Go microservices.
// logger.go: structured JSON logger using Go 1.21+ slog.
package common

import (
	"log/slog"
	"os"
	"strings"
)

// NewLogger creates a new structured slog.Logger.
//
// In production (LOG_FORMAT=json or NODE_ENV=production) it emits newline-
// delimited JSON compatible with Loki, Datadog, and CloudWatch.
// In development it emits human-readable text output.
//
// Usage:
//
//	log := common.NewLogger("mojaloop-service")
//	log.Info("Escrow created", "escrowId", id, "amount", amount)
//	log.Error("Payment failed", "error", err, "escrowId", id)
func NewLogger(service string) *slog.Logger {
	level := parseLevel(os.Getenv("LOG_LEVEL"))
	opts := &slog.HandlerOptions{Level: level}

	isJSON := strings.ToLower(os.Getenv("LOG_FORMAT")) == "json" ||
		strings.ToLower(os.Getenv("NODE_ENV")) == "production"

	var handler slog.Handler
	if isJSON {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	return slog.New(handler).With(
		"service", service,
		"environment", env(),
	)
}

// parseLevel converts a LOG_LEVEL string to slog.Level.
// Defaults to Info if the value is unrecognised.
func parseLevel(s string) slog.Level {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func env() string {
	if e := os.Getenv("NODE_ENV"); e != "" {
		return e
	}
	if e := os.Getenv("APP_ENV"); e != "" {
		return e
	}
	return "development"
}
