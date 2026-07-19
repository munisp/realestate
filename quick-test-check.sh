#!/bin/bash
echo "Quick Database Connection Test"
echo "==============================="
cd /home/ubuntu/realestate-platform
pnpm test --run tests/comprehensive-test-suite.test.ts 2>&1 | grep -E "(PASS|FAIL|Error|SSL)" | head -20
