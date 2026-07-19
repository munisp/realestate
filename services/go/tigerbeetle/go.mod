module github.com/realestate-platform/tigerbeetle-service

go 1.21

require (
	github.com/lib/pq v1.10.9
	github.com/google/uuid v1.6.0
	github.com/gorilla/mux v1.8.1
	github.com/prometheus/client_golang v1.19.0
	github.com/tigerbeetle/tigerbeetle-go v0.15.3
	go.opentelemetry.io/otel v1.21.0
	go.opentelemetry.io/otel/exporters/jaeger v1.17.0
	go.opentelemetry.io/otel/sdk v1.21.0
	go.opentelemetry.io/otel/trace v1.21.0
)
