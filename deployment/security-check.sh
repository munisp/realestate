#!/bin/bash
set -e

NAMESPACE=${1:-realestate-production}

echo "🔒 Running Security Checks"
echo "=========================="

# Check for pods running as root
echo "Checking for pods running as root..."
ROOT_PODS=$(kubectl get pods -n $NAMESPACE -o json | jq -r '.items[] | select(.spec.containers[].securityContext.runAsUser == 0 or .spec.containers[].securityContext.runAsUser == null) | .metadata.name' | wc -l)
if [ "$ROOT_PODS" -eq 0 ]; then
  echo "✅ No pods running as root"
else
  echo "⚠️  WARNING: $ROOT_PODS pod(s) running as root"
fi

# Check for privileged containers
echo "Checking for privileged containers..."
PRIV_PODS=$(kubectl get pods -n $NAMESPACE -o json | jq -r '.items[] | select(.spec.containers[].securityContext.privileged == true) | .metadata.name' | wc -l)
if [ "$PRIV_PODS" -eq 0 ]; then
  echo "✅ No privileged containers"
else
  echo "❌ CRITICAL: $PRIV_PODS privileged container(s) found"
fi

# Check network policies
echo "Checking network policies..."
NP_COUNT=$(kubectl get networkpolicies -n $NAMESPACE -o json | jq '.items | length')
if [ "$NP_COUNT" -gt 0 ]; then
  echo "✅ Network policies configured ($NP_COUNT policies)"
else
  echo "⚠️  WARNING: No network policies configured"
fi

# Check for secrets in environment variables
echo "Checking for exposed secrets..."
EXPOSED_SECRETS=$(kubectl get pods -n $NAMESPACE -o json | jq -r '.items[].spec.containers[].env[]? | select(.value != null) | select(.name | test("PASSWORD|SECRET|KEY|TOKEN")) | .name' | wc -l)
if [ "$EXPOSED_SECRETS" -eq 0 ]; then
  echo "✅ No secrets exposed in environment variables"
else
  echo "⚠️  WARNING: $EXPOSED_SECRETS potential secret(s) in environment variables"
fi

# Check TLS configuration
echo "Checking TLS configuration..."
if kubectl get ingress -n $NAMESPACE -o json | jq -e '.items[].spec.tls' &> /dev/null; then
  echo "✅ TLS configured on ingress"
else
  echo "❌ CRITICAL: No TLS configuration found"
fi

echo ""
echo "✅ Security check complete"
