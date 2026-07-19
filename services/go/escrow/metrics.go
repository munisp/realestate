package main

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics for Escrow Service
var (
	// HTTP metrics
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "escrow_http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "escrow_http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// Escrow operation metrics
	escrowsCreatedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "escrow_created_total",
			Help: "Total number of escrows created",
		},
	)

	escrowsReleasedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "escrow_released_total",
			Help: "Total number of escrows released",
		},
	)

	escrowsRefundedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "escrow_refunded_total",
			Help: "Total number of escrows refunded",
		},
	)

	escrowsCancelledTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "escrow_cancelled_total",
			Help: "Total number of escrows cancelled",
		},
	)

	// Escrow state metrics
	escrowsByStatus = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "escrow_by_status",
			Help: "Number of escrows by status",
		},
		[]string{"status"},
	)

	escrowTotalAmount = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "escrow_total_amount",
			Help: "Total amount held in escrows by currency",
		},
		[]string{"currency"},
	)

	// Redis metrics
	redisOperationsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "escrow_redis_operations_total",
			Help: "Total number of Redis operations",
		},
		[]string{"operation", "status"},
	)

	redisOperationDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "escrow_redis_operation_duration_seconds",
			Help:    "Redis operation duration in seconds",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
		},
		[]string{"operation"},
	)

	// Event sourcing metrics
	eventsLoggedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "escrow_events_logged_total",
			Help: "Total number of events logged",
		},
		[]string{"event_type"},
	)

	eventStreamLength = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "escrow_event_stream_length",
			Help: "Length of event stream",
		},
		[]string{"escrow_id"},
	)

	// Error metrics
	errorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "escrow_errors_total",
			Help: "Total number of errors",
		},
		[]string{"type", "operation"},
	)
)

// UpdateEscrowMetrics updates gauge metrics for escrow state
func UpdateEscrowMetrics(store StoreInterface) {
	if redisStore, ok := store.(*RedisEscrowStore); ok {
		stats, err := redisStore.GetStats()
		if err != nil {
			return
		}

		// Update status counts
		if byStatus, ok := stats["by_status"].(map[string]int); ok {
			for status, count := range byStatus {
				escrowsByStatus.WithLabelValues(status).Set(float64(count))
			}
		}
	}
}
