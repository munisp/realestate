module github.com/realestate-platform/escrow-service

go 1.21

require (
	github.com/lib/pq v1.10.9
	github.com/gorilla/mux v1.8.1
	github.com/prometheus/client_golang v1.19.0
	github.com/redis/go-redis/v9 v9.5.1
	go.opentelemetry.io/otel v1.21.0
	go.opentelemetry.io/otel/exporters/jaeger v1.17.0
	go.opentelemetry.io/otel/sdk v1.21.0
	go.opentelemetry.io/otel/trace v1.21.0
)
