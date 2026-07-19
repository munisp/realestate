#!/bin/bash

# APIsix Gateway Configuration Script
# Configures routes, upstreams, and plugins for all services

set -e

APISIX_ADMIN_URL="http://localhost:9180/apisix/admin"
ADMIN_KEY="edd1c9f034335f136f87ad84b625c8f1"

echo "========================================="
echo "APIsix Gateway Configuration"
echo "========================================="
echo ""

# Function to create upstream
create_upstream() {
    local id=$1
    local name=$2
    local nodes=$3
    
    echo "Creating upstream: $name..."
    
    curl -s -X PUT "$APISIX_ADMIN_URL/upstreams/$id" \
        -H "X-API-KEY: $ADMIN_KEY" \
        -H "Content-Type: application/json" \
        -d "$nodes"
    
    echo " ✓"
}

# Function to create route
create_route() {
    local id=$1
    local name=$2
    local uri=$3
    local upstream_id=$4
    local plugins=$5
    
    echo "Creating route: $name..."
    
    curl -s -X PUT "$APISIX_ADMIN_URL/routes/$id" \
        -H "X-API-KEY: $ADMIN_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"uri\": \"$uri\",
            \"upstream_id\": \"$upstream_id\",
            \"plugins\": $plugins
        }"
    
    echo " ✓"
}

# Step 1: Create Upstreams
echo "Step 1: Creating Upstreams"
echo "========================================="
echo ""

# TypeScript Backend
create_upstream "1" "typescript-backend" '{
    "type": "roundrobin",
    "nodes": {
        "localhost:3000": 1
    },
    "timeout": {
        "connect": 6,
        "send": 6,
        "read": 6
    },
    "keepalive_pool": {
        "size": 320,
        "idle_timeout": 60,
        "requests": 1000
    }
}'

# ML Valuation Service
create_upstream "2" "ml-valuation-service" '{
    "type": "roundrobin",
    "nodes": {
        "localhost:5000": 1
    }
}'

# OCR Service
create_upstream "3" "ocr-service" '{
    "type": "roundrobin",
    "nodes": {
        "localhost:5001": 1
    }
}'

# Fraud Detection Service
create_upstream "4" "fraud-detection-service" '{
    "type": "roundrobin",
    "nodes": {
        "localhost:5002": 1
    }
}'

# Geospatial Service
create_upstream "5" "geospatial-service" '{
    "type": "roundrobin",
    "nodes": {
        "localhost:5003": 1
    }
}'

# Payment Service
create_upstream "6" "payment-service" '{
    "type": "roundrobin",
    "nodes": {
        "localhost:8080": 1
    }
}'

# Notification Service
create_upstream "7" "notification-service" '{
    "type": "roundrobin",
    "nodes": {
        "localhost:8081": 1
    }
}'

# Image Service
create_upstream "8" "image-service" '{
    "type": "roundrobin",
    "nodes": {
        "localhost:8082": 1
    }
}'

echo ""
echo "Step 2: Creating Routes"
echo "========================================="
echo ""

# Default plugins for all routes
DEFAULT_PLUGINS='{
    "cors": {
        "allow_origins": "*",
        "allow_methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
        "allow_headers": "*",
        "expose_headers": "*",
        "max_age": 3600
    },
    "prometheus": {},
    "request-id": {
        "header_name": "X-Request-Id",
        "include_in_response": true
    }
}'

# Rate limiting plugins
RATE_LIMIT_PLUGINS='{
    "cors": {
        "allow_origins": "*",
        "allow_methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
        "allow_headers": "*"
    },
    "limit-count": {
        "count": 100,
        "time_window": 60,
        "rejected_code": 429
    },
    "prometheus": {},
    "request-id": {
        "header_name": "X-Request-Id",
        "include_in_response": true
    }
}'

# TypeScript Backend Routes
create_route "1" "typescript-api" "/api/*" "1" "$DEFAULT_PLUGINS"
create_route "2" "typescript-trpc" "/api/trpc/*" "1" "$DEFAULT_PLUGINS"
create_route "3" "typescript-oauth" "/api/oauth/*" "1" "$DEFAULT_PLUGINS"
create_route "4" "typescript-static" "/*" "1" "$DEFAULT_PLUGINS"

# ML Valuation Service Routes
create_route "10" "ml-valuation-valuate" "/ml/valuate" "2" "$RATE_LIMIT_PLUGINS"
create_route "11" "ml-valuation-batch" "/ml/batch-valuate" "2" "$RATE_LIMIT_PLUGINS"
create_route "12" "ml-valuation-trends" "/ml/market-trends/*" "2" "$RATE_LIMIT_PLUGINS"

# OCR Service Routes
create_route "20" "ocr-process" "/ocr/process" "3" "$RATE_LIMIT_PLUGINS"
create_route "21" "ocr-verify" "/ocr/verify-face" "3" "$RATE_LIMIT_PLUGINS"

# Fraud Detection Service Routes
create_route "30" "fraud-check" "/fraud/check" "4" "$RATE_LIMIT_PLUGINS"
create_route "31" "fraud-profile" "/fraud/profile/*" "4" "$RATE_LIMIT_PLUGINS"

# Geospatial Service Routes
create_route "40" "geo-search-nearby" "/geo/search/nearby" "5" "$RATE_LIMIT_PLUGINS"
create_route "41" "geo-search-polygon" "/geo/search/polygon" "5" "$RATE_LIMIT_PLUGINS"
create_route "42" "geo-heatmap" "/geo/heatmap" "5" "$RATE_LIMIT_PLUGINS"
create_route "43" "geo-neighborhood" "/geo/neighborhood/*" "5" "$RATE_LIMIT_PLUGINS"

# Payment Service Routes
create_route "50" "payment-process" "/payment/process" "6" "$RATE_LIMIT_PLUGINS"
create_route "51" "payment-status" "/payment/status/*" "6" "$RATE_LIMIT_PLUGINS"

# Notification Service Routes
create_route "60" "notification-send" "/notification/send" "7" "$RATE_LIMIT_PLUGINS"

# Image Service Routes
create_route "70" "image-upload" "/image/upload" "8" "$RATE_LIMIT_PLUGINS"
create_route "71" "image-process" "/image/process" "8" "$RATE_LIMIT_PLUGINS"

echo ""
echo "Step 3: Creating Global Rules"
echo "========================================="
echo ""

# Global rate limiting
echo "Creating global rate limit..."
curl -s -X PUT "$APISIX_ADMIN_URL/global_rules/1" \
    -H "X-API-KEY: $ADMIN_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "plugins": {
            "limit-count": {
                "count": 1000,
                "time_window": 60,
                "rejected_code": 429,
                "rejected_msg": "Too many requests"
            }
        }
    }'
echo " ✓"

echo ""
echo "========================================="
echo "✓ APIsix Gateway Configured Successfully"
echo "========================================="
echo ""
echo "Gateway Endpoints:"
echo "  Gateway:          http://localhost:9080"
echo "  Admin API:        http://localhost:9180"
echo "  Prometheus:       http://localhost:9091/apisix/prometheus/metrics"
echo ""
echo "Route Examples:"
echo "  TypeScript API:   http://localhost:9080/api/..."
echo "  ML Valuation:     http://localhost:9080/ml/valuate"
echo "  OCR:              http://localhost:9080/ocr/process"
echo "  Geospatial:       http://localhost:9080/geo/search/nearby"
echo ""
echo "Next steps:"
echo "  1. Update frontend to use gateway URL: http://localhost:9080"
echo "  2. Monitor metrics: http://localhost:9091/apisix/prometheus/metrics"
echo "  3. View logs: docker-compose logs apisix"
echo ""
