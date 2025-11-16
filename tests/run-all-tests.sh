#!/bin/bash
# Comprehensive Test Runner
# Runs all tests and generates coverage report

echo "=== Running Comprehensive Test Suite ==="
echo ""

echo "1. Unit Tests..."
pnpm test --run || exit 1

echo ""
echo "2. Integration Tests..."
pnpm test tests/integration --run || exit 1

echo ""
echo "3. E2E Tests..."
pnpm test:e2e || exit 1

echo ""
echo "✅ All tests passed!"
