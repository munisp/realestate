#!/bin/bash
set -e

echo "🚀 Deploying Real Estate Platform to Staging"
echo "=============================================="

# Configuration
NAMESPACE="realestate-staging"
REGISTRY="your-registry.com"
VERSION=$(git rev-parse --short HEAD)

echo "📦 Version: $VERSION"
echo "🏷️  Namespace: $NAMESPACE"

# Create namespace
echo "Creating namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Deploy infrastructure
echo "Deploying infrastructure..."
kubectl apply -f ../infrastructure/clickhouse/k8s-deployment.yaml -n $NAMESPACE
kubectl apply -f ../infrastructure/opensearch/k8s-deployment.yaml -n $NAMESPACE
kubectl apply -f ../infrastructure/fluvio/k8s-deployment.yaml -n $NAMESPACE

# Wait for infrastructure
echo "Waiting for infrastructure to be ready..."
kubectl wait --for=condition=ready pod -l app=clickhouse -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=opensearch -n $NAMESPACE --timeout=300s

# Deploy microservices
echo "Deploying microservices..."
for service in property-service user-service transaction-service search-service crm-service developer-service analytics-service notification-service; do
  echo "  - Deploying $service..."
  kubectl apply -f ../services/$service/k8s/deployment.yaml -n $NAMESPACE
done

# Wait for services
echo "Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app -n $NAMESPACE --timeout=300s

# Deploy monitoring
echo "Deploying monitoring stack..."
kubectl apply -f ../monitoring/k8s-monitoring.yaml

# Run smoke tests
echo "Running smoke tests..."
./smoke-tests.sh $NAMESPACE

echo "✅ Deployment complete!"
echo "Access the application at: https://staging.realestate.com"
echo "Grafana: http://grafana-staging.realestate.com"
echo "Prometheus: http://prometheus-staging.realestate.com"
