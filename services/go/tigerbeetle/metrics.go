package main

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics for TigerBeetle Service
var (
	// HTTP metrics
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "tigerbeetle_http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "tigerbeetle_http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// TigerBeetle operation metrics
	accountsCreatedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "tigerbeetle_accounts_created_total",
			Help: "Total number of accounts created",
		},
	)

	transfersCreatedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "tigerbeetle_transfers_created_total",
			Help: "Total number of transfers created",
		},
	)

	transfersSuccessTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "tigerbeetle_transfers_success_total",
			Help: "Total number of successful transfers",
		},
	)

	transfersFailedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "tigerbeetle_transfers_failed_total",
			Help: "Total number of failed transfers",
		},
	)

	// Ledger metrics
	ledgerOperationDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "tigerbeetle_ledger_operation_duration_seconds",
			Help:    "Ledger operation duration in seconds",
			Buckets: []float64{.0001, .0005, .001, .0025, .005, .01, .025, .05, .1},
		},
		[]string{"operation"},
	)

	accountBalanceTotal = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "tigerbeetle_account_balance_total",
			Help: "Total balance in accounts by currency",
		},
		[]string{"currency", "type"},
	)

	// Escrow state metrics
	escrowsByStatus = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "tigerbeetle_escrows_by_status",
			Help: "Number of escrows by status",
		},
		[]string{"status"},
	)

	// Cluster health metrics
	clusterNodesHealthy = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "tigerbeetle_cluster_nodes_healthy",
			Help: "Number of healthy cluster nodes",
		},
	)

	clusterConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "tigerbeetle_cluster_connections_active",
			Help: "Number of active cluster connections",
		},
	)

	// Error metrics
	errorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "tigerbeetle_errors_total",
			Help: "Total number of errors",
		},
		[]string{"type", "operation"},
	)

	// Performance metrics
	throughputOpsPerSecond = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "tigerbeetle_throughput_ops_per_second",
			Help: "Operations per second throughput",
		},
	)
)
