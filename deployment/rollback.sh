#!/bin/bash
set -e

NAMESPACE=${1:-realestate-staging}
VERSION=${2:-previous}

echo "🔄 Rolling back to version: $VERSION"

# Rollback all deployments
for service in property-service user-service transaction-service search-service crm-service developer-service analytics-service notification-service; do
  echo "Rolling back $service..."
  kubectl rollout undo deployment/$service -n $NAMESPACE
done

# Wait for rollback to complete
kubectl rollout status deployment --all -n $NAMESPACE

echo "✅ Rollback complete!"
