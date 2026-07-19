#!/bin/bash

# PostgreSQL Migration Test Runner
# Comprehensive test execution with detailed reporting

set -e

echo "======================================================================"
echo "PostgreSQL Migration Test Suite"
echo "======================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Please set DATABASE_URL to your PostgreSQL connection string"
    echo "Example: export DATABASE_URL='postgresql://user:password@localhost:5432/realestate'"
    exit 1
fi

# Verify it's a PostgreSQL URL
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]] && [[ ! "$DATABASE_URL" =~ ^postgres:// ]]; then
    echo -e "${RED}ERROR: DATABASE_URL must be a PostgreSQL connection string${NC}"
    echo "Current DATABASE_URL: $DATABASE_URL"
    exit 1
fi

echo -e "${GREEN}✓ DATABASE_URL is set and valid${NC}"
echo "  Connection: ${DATABASE_URL%%\?*}" # Hide query params
echo ""

# Check if PostgreSQL is accessible
echo "Checking PostgreSQL connection..."
if ! pnpm exec tsx -e "import pg from 'pg'; const pool = new pg.Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT 1').then(() => {console.log('✓ Connected'); pool.end();}).catch(e => {console.error('✗ Failed:', e.message); process.exit(1);})"; then
    echo -e "${RED}ERROR: Cannot connect to PostgreSQL${NC}"
    exit 1
fi
echo ""

# Create test results directory
mkdir -p test-results

# Function to run test suite
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    
    echo "======================================================================"
    echo -e "${BLUE}Running: $suite_name${NC}"
    echo "======================================================================"
    echo ""
    
    if pnpm vitest run --config vitest.config.migration.ts --reporter=verbose "$test_pattern" 2>&1 | tee "test-results/${suite_name// /-}.log"; then
        echo -e "${GREEN}✓ $suite_name: PASSED${NC}"
        return 0
    else
        echo -e "${RED}✗ $suite_name: FAILED${NC}"
        return 1
    fi
}

# Track test results
declare -i total_suites=0
declare -i passed_suites=0
declare -i failed_suites=0

# Run test suites
echo "======================================================================"
echo "Test Execution Plan"
echo "======================================================================"
echo "1. Unit Tests - Database Operations"
echo "2. Referential Integrity Tests"
echo "3. Security Tests - SQL Injection & Access Control"
echo "4. Load & Performance Tests"
echo "5. Regression Tests - MySQL to PostgreSQL Compatibility"
echo ""
echo "Press Enter to start testing..."
read

# 1. Unit Tests
total_suites=$((total_suites + 1))
if run_test_suite "Unit Tests" "tests/unit/**/*.test.ts"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# 2. Referential Integrity Tests
total_suites=$((total_suites + 1))
if run_test_suite "Referential Integrity Tests" "tests/integrity/**/*.test.ts"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# 3. Security Tests
total_suites=$((total_suites + 1))
if run_test_suite "Security Tests" "tests/security/**/*.test.ts"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# 4. Load Tests
total_suites=$((total_suites + 1))
if run_test_suite "Load & Performance Tests" "tests/load/**/*.test.ts"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# 5. Regression Tests
total_suites=$((total_suites + 1))
if run_test_suite "Regression Tests" "tests/regression/**/*.test.ts"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# Summary
echo "======================================================================"
echo "Test Summary"
echo "======================================================================"
echo ""
echo "Total Test Suites: $total_suites"
echo -e "${GREEN}Passed: $passed_suites${NC}"
if [ $failed_suites -gt 0 ]; then
    echo -e "${RED}Failed: $failed_suites${NC}"
else
    echo "Failed: $failed_suites"
fi
echo ""

# Calculate success rate
success_rate=$((passed_suites * 100 / total_suites))
echo "Success Rate: ${success_rate}%"
echo ""

# Final verdict
if [ $failed_suites -eq 0 ]; then
    echo -e "${GREEN}======================================================================"
    echo "✓ ALL TESTS PASSED - Migration Successful!"
    echo "======================================================================${NC}"
    echo ""
    echo "The PostgreSQL migration has been validated successfully."
    echo "All database operations, integrity constraints, security measures,"
    echo "performance benchmarks, and regression tests have passed."
    echo ""
    exit 0
else
    echo -e "${RED}======================================================================"
    echo "✗ SOME TESTS FAILED - Review Required"
    echo "======================================================================${NC}"
    echo ""
    echo "Please review the test logs in the test-results/ directory"
    echo "and address any failures before proceeding with the migration."
    echo ""
    exit 1
fi
