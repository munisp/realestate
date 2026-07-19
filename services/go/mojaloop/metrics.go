package main

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics for Mojaloop Service
var (
	// HTTP metrics
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "mojaloop_http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "mojaloop_http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// Mojaloop operation metrics
	quotesCreatedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "mojaloop_quotes_created_total",
			Help: "Total number of quotes created",
		},
	)

	transfersCreatedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "mojaloop_transfers_created_total",
			Help: "Total number of transfers created",
		},
	)

	transfersCommittedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "mojaloop_transfers_committed_total",
			Help: "Total number of transfers committed",
		},
	)

	transfersAbortedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "mojaloop_transfers_aborted_total",
			Help: "Total number of transfers aborted",
		},
	)

	// Webhook metrics
	webhooksReceivedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "mojaloop_webhooks_received_total",
			Help: "Total number of webhooks received",
		},
		[]string{"event_type"},
	)

	webhookProcessingDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "mojaloop_webhook_processing_duration_seconds",
			Help:    "Webhook processing duration in seconds",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
		},
		[]string{"event_type"},
	)

	// FSP API metrics
	fspAPICallsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "mojaloop_fsp_api_calls_total",
			Help: "Total number of FSP API calls",
		},
		[]string{"operation", "status"},
	)

	fspAPICallDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "mojaloop_fsp_api_call_duration_seconds",
			Help:    "FSP API call duration in seconds",
			Buckets: []float64{.05, .1, .25, .5, 1, 2.5, 5, 10},
		},
		[]string{"operation"},
	)

	// Escrow state metrics
	escrowsByStatus = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "mojaloop_escrows_by_status",
			Help: "Number of escrows by status",
		},
		[]string{"status"},
	)

	// Error metrics
	errorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "mojaloop_errors_total",
			Help: "Total number of errors",
		},
		[]string{"type", "operation"},
	)
)
