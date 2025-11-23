#!/bin/bash
# Iterative DTO Test Runner
# Runs tests and shows progress incrementally

set -e

echo "========================================="
echo "DTO Test Iterative Runner"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test file
TEST_FILE="tests/e2e/dto-ground-truth-verification.spec.ts"

# Run test and capture output
echo -e "${YELLOW}Running DTO tests...${NC}"
echo ""

LOG_LEVEL=debug pnpm test:e2e dto-ground-truth-verification --reporter=list 2>&1 | tee /tmp/dto-test-output.log

# Check exit code
EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "========================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Tests failed (exit code: $EXIT_CODE)${NC}"
    echo ""
    echo "Checking for errors..."
    echo ""
    
    # Extract errors from log
    grep -i "error\|failed\|fail" /tmp/dto-test-output.log | head -20 || echo "No error patterns found"
fi
echo "========================================="

exit $EXIT_CODE

