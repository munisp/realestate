#!/bin/bash
set -e

echo "🚀 Deploying Real Estate Platform to Production"
echo "================================================"

# Configuration
NAMESPACE="realestate-production"
REGISTRY="${DOCKER_REGISTRY:-your-registry.com}"
VERSION=$(git rev-parse --short HEAD)
ENVIRONMENT="production"

echo "📦 Version: $VERSION"
echo "🏷️  Namespace: $NAMESPACE"
echo "🌍 Environment: $ENVIRONMENT"

# Pre-deployment checks
echo "Running pre-deployment checks..."
./pre-deployment-checks.sh || exit 1

# Create namespace
echo "Creating namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply production configurations
echo "Applying production configurations..."
kubectl apply -f production/secrets.yaml -n $NAMESPACE
kubectl apply -f production/configmaps.yaml -n $NAMESPACE

# Deploy infrastructure with production settings
echo "Deploying infrastructure..."
kubectl apply -f ../infrastructure/clickhouse/k8s-production.yaml -n $NAMESPACE
kubectl apply -f ../infrastructure/opensearch/k8s-production.yaml -n $NAMESPACE
kubectl apply -f ../infrastructure/postgres/k8s-production.yaml -n $NAMESPACE
kubectl apply -f ../infrastructure/redis/k8s-production.yaml -n $NAMESPACE
kubectl apply -f ../infrastructure/kafka/k8s-production.yaml -n $NAMESPACE

# Wait for infrastructure
echo "Waiting for infrastructure to be ready..."
kubectl wait --for=condition=ready pod -l app=clickhouse -n $NAMESPACE --timeout=600s
kubectl wait --for=condition=ready pod -l app=opensearch -n $NAMESPACE --timeout=600s
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=600s
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=kafka -n $NAMESPACE --timeout=600s

# Deploy microservices with production images
echo "Deploying microservices..."
for service in property-service user-service transaction-service search-service crm-service developer-service analytics-service notification-service; do
  echo "  - Deploying $service..."
  kubectl apply -f ../services/$service/k8s/production-deployment.yaml -n $NAMESPACE
  kubectl set image deployment/$service $service=$REGISTRY/$service:$VERSION -n $NAMESPACE
done

# Wait for services with longer timeout for production
echo "Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app -n $NAMESPACE --timeout=600s

# Deploy API Gateway
echo "Deploying API Gateway..."
kubectl apply -f production/api-gateway.yaml -n $NAMESPACE

# Deploy monitoring stack
echo "Deploying production monitoring..."
kubectl apply -f ../monitoring/k8s-production.yaml

# Configure autoscaling
echo "Configuring autoscaling..."
kubectl apply -f production/hpa.yaml -n $NAMESPACE

# Run smoke tests
echo "Running production smoke tests..."
./smoke-tests.sh $NAMESPACE

# Run security verification
echo "Running security verification..."
./security-check.sh $NAMESPACE

echo "✅ Production deployment complete!"
echo ""
echo "🌐 Application URL: https://app.realestate.com"
echo "📊 Grafana: https://grafana.realestate.com"
echo "🔍 Prometheus: https://prometheus.realestate.com"
echo "📈 Kibana: https://kibana.realestate.com"
echo ""
echo "⚠️  Please verify the deployment and monitor for 30 minutes before announcing to users."
