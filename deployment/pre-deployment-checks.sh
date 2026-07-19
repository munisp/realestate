#!/bin/bash
set -e

echo "🔍 Running Pre-Deployment Checks"
echo "================================="

ERRORS=0

# Check kubectl access
echo -n "Checking kubectl access: "
if kubectl cluster-info &> /dev/null; then
  echo "✅ OK"
else
  echo "❌ FAILED"
  ERRORS=$((ERRORS + 1))
fi

# Check Docker registry access
echo -n "Checking Docker registry: "
if docker login $DOCKER_REGISTRY &> /dev/null; then
  echo "✅ OK"
else
  echo "❌ FAILED - Please login to Docker registry"
  ERRORS=$((ERRORS + 1))
fi

# Check required secrets exist
echo "Checking required secrets..."
REQUIRED_SECRETS=("database-credentials" "stripe-keys" "sendgrid-api-key" "jwt-secret")
for secret in "${REQUIRED_SECRETS[@]}"; do
  echo -n "  - $secret: "
  if kubectl get secret $secret -n realestate-production &> /dev/null; then
    echo "✅ OK"
  else
    echo "❌ MISSING"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check SSL certificates
echo -n "Checking SSL certificates: "
if kubectl get secret tls-certificate -n realestate-production &> /dev/null; then
  echo "✅ OK"
else
  echo "❌ MISSING"
  ERRORS=$((ERRORS + 1))
fi

# Check backup configuration
echo -n "Checking backup configuration: "
if kubectl get cronjob database-backup -n realestate-production &> /dev/null; then
  echo "✅ OK"
else
  echo "⚠️  WARNING - No backup configured"
fi

# Check monitoring stack
echo -n "Checking monitoring stack: "
if kubectl get deployment prometheus -n monitoring &> /dev/null; then
  echo "✅ OK"
else
  echo "❌ FAILED - Monitoring not deployed"
  ERRORS=$((ERRORS + 1))
fi

# Check resource quotas
echo -n "Checking resource quotas: "
if kubectl get resourcequota -n realestate-production &> /dev/null; then
  echo "✅ OK"
else
  echo "⚠️  WARNING - No resource quotas set"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ All pre-deployment checks passed!"
  exit 0
else
  echo "❌ $ERRORS check(s) failed. Please fix before deploying."
  exit 1
fi
