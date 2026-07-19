package common

import (
	"context"
	"fmt"
	"log"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
	"go.opentelemetry.io/otel/trace"
)

// TracingConfig holds tracing configuration
type TracingConfig struct {
	ServiceName    string
	ServiceVersion string
	Environment    string
	JaegerEndpoint string
	SamplingRate   float64
}

// InitTracer initializes OpenTelemetry tracing
func InitTracer(config TracingConfig) (func(context.Context) error, error) {
	// Set defaults
	if config.JaegerEndpoint == "" {
		config.JaegerEndpoint = getEnv("JAEGER_ENDPOINT", "http://localhost:14268/api/traces")
	}
	if config.SamplingRate == 0 {
		config.SamplingRate = 1.0 // Sample all traces by default
	}
	if config.Environment == "" {
		config.Environment = getEnv("ENVIRONMENT", "development")
	}

	// Create Jaeger exporter
	exporter, err := jaeger.New(jaeger.WithCollectorEndpoint(jaeger.WithEndpoint(config.JaegerEndpoint)))
	if err != nil {
		return nil, fmt.Errorf("failed to create Jaeger exporter: %w", err)
	}

	// Create resource with service information
	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(config.ServiceName),
			semconv.ServiceVersion(config.ServiceVersion),
			attribute.String("environment", config.Environment),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Create trace provider
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.TraceIDRatioBased(config.SamplingRate)),
	)

	// Set global trace provider
	otel.SetTracerProvider(tp)

	// Set global propagator for context propagation
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	log.Printf("[Tracing] Initialized for service: %s (version: %s, environment: %s)",
		config.ServiceName, config.ServiceVersion, config.Environment)

	// Return shutdown function
	return tp.Shutdown, nil
}

// StartSpan starts a new span with the given name
func StartSpan(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
	tracer := otel.Tracer("realestate-platform")
	return tracer.Start(ctx, spanName, opts...)
}

// AddSpanAttributes adds attributes to the current span
func AddSpanAttributes(ctx context.Context, attrs ...attribute.KeyValue) {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		span.SetAttributes(attrs...)
	}
}

// AddSpanEvent adds an event to the current span
func AddSpanEvent(ctx context.Context, name string, attrs ...attribute.KeyValue) {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		span.AddEvent(name, trace.WithAttributes(attrs...))
	}
}

// RecordError records an error in the current span
func RecordError(ctx context.Context, err error) {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() && err != nil {
		span.RecordError(err)
	}
}

// SetSpanStatus sets the status of the current span
func SetSpanStatus(ctx context.Context, code trace.StatusCode, description string) {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		span.SetStatus(code, description)
	}
}

// TraceHTTPHandler wraps an HTTP handler with tracing
func TraceHTTPHandler(handlerName string, handler func(ctx context.Context) error) func(context.Context) error {
	return func(ctx context.Context) error {
		ctx, span := StartSpan(ctx, handlerName)
		defer span.End()

		err := handler(ctx)
		if err != nil {
			RecordError(ctx, err)
			SetSpanStatus(ctx, trace.StatusCodeError, err.Error())
		} else {
			SetSpanStatus(ctx, trace.StatusCodeOk, "")
		}

		return err
	}
}

// TraceOperation wraps any operation with tracing
func TraceOperation(ctx context.Context, operationName string, fn func(ctx context.Context) error, attrs ...attribute.KeyValue) error {
	ctx, span := StartSpan(ctx, operationName)
	defer span.End()

	if len(attrs) > 0 {
		span.SetAttributes(attrs...)
	}

	err := fn(ctx)
	if err != nil {
		RecordError(ctx, err)
		SetSpanStatus(ctx, trace.StatusCodeError, err.Error())
	} else {
		SetSpanStatus(ctx, trace.StatusCodeOk, "")
	}

	return err
}

// GetTraceID returns the trace ID from the context
func GetTraceID(ctx context.Context) string {
	span := trace.SpanFromContext(ctx)
	if span.SpanContext().IsValid() {
		return span.SpanContext().TraceID().String()
	}
	return ""
}

// GetSpanID returns the span ID from the context
func GetSpanID(ctx context.Context) string {
	span := trace.SpanFromContext(ctx)
	if span.SpanContext().IsValid() {
		return span.SpanContext().SpanID().String()
	}
	return ""
}

// Helper function to get environment variable with default
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// HTTPMiddleware creates tracing middleware for HTTP handlers
type HTTPMiddleware struct {
	tracer trace.Tracer
}

// NewHTTPMiddleware creates a new HTTP tracing middleware
func NewHTTPMiddleware(serviceName string) *HTTPMiddleware {
	return &HTTPMiddleware{
		tracer: otel.Tracer(serviceName),
	}
}

// Middleware returns the middleware function
func (m *HTTPMiddleware) Middleware(next func(ctx context.Context) error) func(ctx context.Context) error {
	return func(ctx context.Context) error {
		ctx, span := m.tracer.Start(ctx, "http.request")
		defer span.End()

		err := next(ctx)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(trace.StatusCodeError, err.Error())
		}

		return err
	}
}
