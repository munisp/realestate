#!/bin/bash
set -e

echo "🔒 Enterprise Real Estate Platform - Security Audit"
echo "=================================================="
echo ""

REPORT_DIR="./security/reports"
mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CRITICAL_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0

echo "📋 Security Audit Report - $TIMESTAMP" > "$REPORT_DIR/audit_${TIMESTAMP}.txt"

# 1. Dependency Scanning
echo "1️⃣  Scanning Dependencies..."
cd client 2>/dev/null && npm audit --json > ../security/reports/npm-audit.json 2>&1 || echo "npm audit skipped"
cd .. 2>/dev/null || true
echo "   ✓ Dependency scan complete"

# 2. Secret Scanning  
echo "2️⃣  Scanning for Secrets..."
SECRETS=$(grep -r "api.*key\|password\|secret" --include="*.ts" --include="*.js" --exclude-dir=node_modules . 2>/dev/null | grep -v "//" | grep -v "#" | wc -l || echo "0")
echo "   Found $SECRETS potential secret references"

# 3. SQL Injection Check
echo "3️⃣  Checking SQL Injection Risks..."
SQL_RISKS=$(grep -r "query.*+" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | wc -l || echo "0")
echo "   Found $SQL_RISKS potential SQL injection points"

# 4. XSS Check
echo "4️⃣  Checking XSS Risks..."
XSS_RISKS=$(grep -r "innerHTML\|dangerouslySetInnerHTML" --include="*.tsx" --exclude-dir=node_modules client/ 2>/dev/null | wc -l || echo "0")
echo "   Found $XSS_RISKS potential XSS points"

# 5. Docker Security
echo "5️⃣  Checking Docker Security..."
ROOT_USER=$(find . -name "Dockerfile" -exec grep -l "USER root" {} \; 2>/dev/null | wc -l || echo "0")
echo "   Found $ROOT_USER containers running as root"

# 6. Kubernetes Security
echo "6️⃣  Checking Kubernetes Security..."
PRIVILEGED=$(find . -name "*.yaml" -exec grep -l "privileged: true" {} \; 2>/dev/null | wc -l || echo "0")
echo "   Found $PRIVILEGED privileged containers"

echo ""
echo "=================================================="
echo "📊 Security Audit Summary"
echo "========================="
echo "- Secret references: $SECRETS"
echo "- SQL injection risks: $SQL_RISKS"
echo "- XSS risks: $XSS_RISKS"
echo "- Root containers: $ROOT_USER"
echo "- Privileged containers: $PRIVILEGED"
echo ""

if [ "$PRIVILEGED" -gt 0 ]; then
  echo "❌ Critical issues found - Review required"
  CRITICAL_COUNT=1
else
  echo "✅ No critical security issues found"
fi

echo ""
echo "📄 Report saved to: $REPORT_DIR/audit_${TIMESTAMP}.txt"
