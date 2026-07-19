#!/bin/bash

###############################################################################
# Comprehensive Test Execution Script
# Runs all test categories: Unit, Integration, Referential Integrity, Load, E2E
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results directory
RESULTS_DIR="./test-results"
mkdir -p "$RESULTS_DIR"

# Timestamp for this test run
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$RESULTS_DIR/test-report-$TIMESTAMP.md"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Comprehensive Test Suite Execution${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Initialize report
cat > "$REPORT_FILE" << EOF
# Comprehensive Test Report
**Generated**: $(date)
**Platform**: Real Estate Platform
**Test Run ID**: $TIMESTAMP

---

## Test Execution Summary

EOF

###############################################################################
# 1. UNIT TESTS
###############################################################################

echo -e "${YELLOW}[1/6] Running Unit Tests...${NC}"
echo "### 1. Unit Tests" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if pnpm test --run tests/comprehensive-test-suite.test.ts 2>&1 | tee "$RESULTS_DIR/unit-tests-$TIMESTAMP.log"; then
    echo -e "${GREEN}✓ Unit tests passed${NC}"
    echo "**Status**: ✅ PASSED" >> "$REPORT_FILE"
else
    echo -e "${RED}✗ Unit tests failed${NC}"
    echo "**Status**: ❌ FAILED" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

###############################################################################
# 2. INTEGRATION TESTS
###############################################################################

echo -e "${YELLOW}[2/6] Running Integration Tests...${NC}"
echo "### 2. Integration Tests" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check if existing integration tests exist
INTEGRATION_TEST_COUNT=$(find . -name "*.test.ts" -path "*/integration/*" 2>/dev/null | wc -l)

if [ "$INTEGRATION_TEST_COUNT" -gt 0 ]; then
    if pnpm test --run tests/integration/ 2>&1 | tee "$RESULTS_DIR/integration-tests-$TIMESTAMP.log"; then
        echo -e "${GREEN}✓ Integration tests passed${NC}"
        echo "**Status**: ✅ PASSED" >> "$REPORT_FILE"
    else
        echo -e "${RED}✗ Integration tests failed${NC}"
        echo "**Status**: ❌ FAILED" >> "$REPORT_FILE"
    fi
else
    echo -e "${YELLOW}⚠ No integration tests found${NC}"
    echo "**Status**: ⚠️ SKIPPED (No tests found)" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

###############################################################################
# 3. REFERENTIAL INTEGRITY TESTS
###############################################################################

echo -e "${YELLOW}[3/6] Running Referential Integrity Tests...${NC}"
echo "### 3. Referential Integrity Tests" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if pnpm test --run tests/database/referential-integrity.test.ts 2>&1 | tee "$RESULTS_DIR/referential-integrity-$TIMESTAMP.log"; then
    echo -e "${GREEN}✓ Referential integrity tests passed${NC}"
    echo "**Status**: ✅ PASSED" >> "$REPORT_FILE"
else
    echo -e "${RED}✗ Referential integrity tests failed${NC}"
    echo "**Status**: ❌ FAILED" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

###############################################################################
# 4. LOAD TESTS
###############################################################################

echo -e "${YELLOW}[4/6] Running Load Tests...${NC}"
echo "### 4. Load Tests" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check if k6 is installed
if command -v k6 &> /dev/null; then
    if k6 run tests/load-tests/comprehensive-load-test.js 2>&1 | tee "$RESULTS_DIR/load-tests-$TIMESTAMP.log"; then
        echo -e "${GREEN}✓ Load tests passed${NC}"
        echo "**Status**: ✅ PASSED" >> "$REPORT_FILE"
    else
        echo -e "${RED}✗ Load tests failed${NC}"
        echo "**Status**: ❌ FAILED" >> "$REPORT_FILE"
    fi
else
    echo -e "${YELLOW}⚠ k6 not installed, skipping load tests${NC}"
    echo "**Status**: ⚠️ SKIPPED (k6 not installed)" >> "$REPORT_FILE"
    echo "Install k6: https://k6.io/docs/getting-started/installation/" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

###############################################################################
# 5. END-TO-END TESTS
###############################################################################

echo -e "${YELLOW}[5/6] Running End-to-End Tests...${NC}"
echo "### 5. End-to-End Tests" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if pnpm test --run tests/e2e/regression-suite.test.ts 2>&1 | tee "$RESULTS_DIR/e2e-tests-$TIMESTAMP.log"; then
    echo -e "${GREEN}✓ E2E tests passed${NC}"
    echo "**Status**: ✅ PASSED" >> "$REPORT_FILE"
else
    echo -e "${RED}✗ E2E tests failed${NC}"
    echo "**Status**: ❌ FAILED" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

###############################################################################
# 6. REGRESSION TESTS
###############################################################################

echo -e "${YELLOW}[6/6] Running Regression Tests...${NC}"
echo "### 6. Regression Tests" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Run all existing test files
TOTAL_TESTS=$(find . -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
echo "Found $TOTAL_TESTS test files" | tee -a "$REPORT_FILE"

if pnpm test --run 2>&1 | tee "$RESULTS_DIR/regression-tests-$TIMESTAMP.log"; then
    echo -e "${GREEN}✓ Regression tests passed${NC}"
    echo "**Status**: ✅ PASSED" >> "$REPORT_FILE"
else
    echo -e "${RED}✗ Some regression tests failed${NC}"
    echo "**Status**: ⚠️ PARTIAL (Some tests failed)" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

###############################################################################
# GENERATE SUMMARY
###############################################################################

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Test Statistics" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- **Total Test Files**: $TOTAL_TESTS" >> "$REPORT_FILE"
echo "- **Test Categories**: 6 (Unit, Integration, Referential Integrity, Load, E2E, Regression)" >> "$REPORT_FILE"
echo "- **Test Duration**: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Detailed Logs" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "All detailed logs are available in: \`$RESULTS_DIR/\`" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

###############################################################################
# FINAL SUMMARY
###############################################################################

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Execution Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Test report generated: $REPORT_FILE${NC}"
echo ""
echo "View the full report:"
echo "  cat $REPORT_FILE"
echo ""
echo "View detailed logs:"
echo "  ls -lh $RESULTS_DIR/"
echo ""

# Display report
cat "$REPORT_FILE"
