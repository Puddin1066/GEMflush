#!/bin/bash

# TDD Workflow Script
# Helps developers follow TDD cycle: RED -> GREEN -> REFACTOR

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 TDD Workflow Helper${NC}"
echo ""

# Check if test file is provided
if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage: ./scripts/tdd-workflow.sh <test-file>${NC}"
  echo ""
  echo "Examples:"
  echo "  ./scripts/tdd-workflow.sh lib/services/__tests__/business-execution.test.ts"
  echo "  ./scripts/tdd-workflow.sh app/api/business/__tests__/route.test.ts"
  exit 1
fi

TEST_FILE="$1"

# Check if test file exists
if [ ! -f "$TEST_FILE" ]; then
  echo -e "${RED}❌ Test file not found: $TEST_FILE${NC}"
  exit 1
fi

echo -e "${BLUE}📝 Test File:${NC} $TEST_FILE"
echo ""

# Step 1: RED - Run tests to see failures
echo -e "${RED}🔴 STEP 1: RED - Running tests (expecting failures)${NC}"
echo "Running: pnpm test $TEST_FILE"
echo ""

pnpm test "$TEST_FILE" --run || {
  echo ""
  echo -e "${YELLOW}⚠️  Tests failed (this is expected in RED phase)${NC}"
  echo ""
  echo -e "${GREEN}✅ Good! Now implement minimal code to make tests pass${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "  1. Write minimal implementation to pass tests"
  echo "  2. Run: ./scripts/tdd-workflow.sh $TEST_FILE"
  echo "  3. Once GREEN, refactor your code"
  exit 0
}

# Step 2: GREEN - Tests passed
echo ""
echo -e "${GREEN}🟢 STEP 2: GREEN - All tests passing!${NC}"
echo ""

# Step 3: REFACTOR - Check code quality
echo -e "${BLUE}🔵 STEP 3: REFACTOR - Check code quality${NC}"
echo ""

# Run linter
echo "Running linter..."
if pnpm lint --file "$TEST_FILE" 2>/dev/null; then
  echo -e "${GREEN}✅ Linter passed${NC}"
else
  echo -e "${YELLOW}⚠️  Linter warnings (fix if needed)${NC}"
fi

echo ""
echo -e "${GREEN}✅ TDD Cycle Complete!${NC}"
echo ""
echo -e "${BLUE}Next TDD Cycle:${NC}"
echo "  1. Write next failing test"
echo "  2. Run: ./scripts/tdd-workflow.sh $TEST_FILE"
echo "  3. Implement minimal code"
echo "  4. Refactor"
echo ""

