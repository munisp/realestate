FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build the application (CGO required for TigerBeetle client)
RUN CGO_ENABLED=1 GOOS=linux go build -a -o tigerbeetle-service .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates curl libc6-compat

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/tigerbeetle-service .

# Expose port
EXPOSE 5011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5011/health || exit 1

# Run
CMD ["./tigerbeetle-service"]
