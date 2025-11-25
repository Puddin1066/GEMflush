#!/bin/bash
# Archive historical markdown files from docs/ to _archive/docs/historical/

set -e

ARCHIVE_DIR="_archive/docs/historical"
mkdir -p "$ARCHIVE_DIR"

# Files to archive from docs/ root
root_files=(
  "docs/DOCUMENTATION_ORGANIZATION_PROPOSAL.md"
  "docs/module_refactor.md"
)

# Files from docs/status/ - mostly historical status snapshots
status_files=(
  "docs/status/COMMIT_SUMMARY.md"
  "docs/status/IMPLEMENTATION_STATUS.md"
  "docs/status/IMPLEMENTATION_SUMMARY.md"
  "docs/status/READY_FOR_TESTING.md"
  "docs/status/PHASE_2_UI_PROPOSAL.md"
)

# Files from docs/development/ - completion records, summaries, session logs
development_files=(
  # Completion records
  "docs/development/ALL_DTO_FIXES_COMPLETE.md"
  "docs/development/DTO_DATA_FLOW_COMPLETE.md"
  "docs/development/DTO_DATA_FLOW_FIXES_COMPLETE.md"
  "docs/development/UI_DATA_FLOW_FIXES_COMPLETE.md"
  "docs/development/TDD_DATA_LAYER_COMPLETE.md"
  "docs/development/TDD_LOOP_COMPLETE.md"
  "docs/development/TDD_REFACTORING_COMPLETE.md"
  "docs/development/COMPETITIVE_LEADERBOARD_TESTS_COMPLETE.md"
  "docs/development/P0_FIXES_COMPLETED.md"
  
  # Summaries
  "docs/development/DTO_ROUTING_SUMMARY.md"
  "docs/development/E2E_FLOWS_COMPLETE_SUMMARY.md"
  "docs/development/E2E_FLOWS_VERBOSE_RUN_SUMMARY.md"
  "docs/development/E2E_TEST_SUMMARY.md"
  "docs/development/MIGRATION_SUMMARY.md"
  "docs/development/WORKFLOW_SUMMARY.md"
  "docs/development/INEFFICIENCIES_SUMMARY.md"
  "docs/development/LOG_INEFFICIENCIES_ANALYSIS.md"
  
  # Session logs and status
  "docs/development/TDD_SESSION_LOG.md"
  "docs/development/TDD_SESSION_STATUS.md"
  "docs/development/LBDD_SESSION_SUMMARY.md"
  
  # Historical analysis and findings
  "docs/development/E2E_TESTING_FINDINGS.md"
  "docs/development/DASHBOARD_CFP_FINDINGS.md"
  "docs/development/E2E_FIXES_IMPLEMENTED.md"
  "docs/development/E2E_FLOWS_BUG_FIXES.md"
  
  # Historical proposals that may be outdated
  "docs/development/CFP_AUTOMATION_CONSOLIDATION_PROPOSAL.md"
  "docs/development/CRAWLER_UPGRADE_PROPOSAL.md"
  
  # Historical iteration/analysis docs
  "docs/development/CFP_UX_TEST_RESULTS.md"
  "docs/development/COMPETITIVE_INTELLIGENCE_ITERATION.md"
  "docs/development/COMPETITIVE_PAGE_FIX_IMPLEMENTATION.md"
  "docs/development/CFP_UX_IMPROVEMENTS_ITERATIVE.md"
  
  # Test archive plan (if completed)
  "docs/development/TEST_ARCHIVE_PLAN.md"
)

# Files from docs/testing/ - historical test summaries and status
testing_files=(
  # Completion records
  "docs/testing/E2E_TESTING_COMPLETE.md"
  
  # Summaries
  "docs/testing/TEST_COVERAGE_SUMMARY.md"
  "docs/testing/TEST_IMPLEMENTATION_SUMMARY.md"
  "docs/testing/TEST_SETUP_SUMMARY.md"
  "docs/testing/TEST_STATUS.md"
  "docs/testing/TEST_STATUS_REAL_APIs.md"
  
  # Historical bug fixes
  "docs/testing/BADGE_ERROR_FIX.md"
  "docs/testing/BUSINESS_DATA_ISSUES.md"
  "docs/testing/PLAYWRIGHT_FAILURES_ANALYSIS.md"
  
  # Historical test adaptations
  "docs/testing/COMPLETE_WORKFLOW_TEST_ADAPTATIONS.md"
)

# Files from docs/troubleshooting/ - historical bug fix records
troubleshooting_files=(
  "docs/troubleshooting/BUG_FIXES_APPLIED.md"
  "docs/troubleshooting/BUG_FIXES_SUMMARY.md"
  "docs/troubleshooting/DEBUG_FIXES_SUMMARY.md"
  "docs/troubleshooting/TEST_FIXES_SUMMARY.md"
  "docs/troubleshooting/PROCESSING_FIXES_AND_TESTING.md"
  "docs/troubleshooting/REACT_KEY_WARNING_FIX.md"
  "docs/troubleshooting/P6375_FIX.md"
  "docs/troubleshooting/ISSUES_FROM_LOGS.md"
)

# Combine all files
all_files=(
  "${root_files[@]}"
  "${status_files[@]}"
  "${development_files[@]}"
  "${testing_files[@]}"
  "${troubleshooting_files[@]}"
)

moved_count=0
skipped_count=0

# Move files
for file in "${all_files[@]}"; do
  if [ -f "$file" ]; then
    echo "Moving $file to $ARCHIVE_DIR/"
    mv "$file" "$ARCHIVE_DIR/"
    ((moved_count++))
  else
    echo "Warning: $file not found, skipping"
    ((skipped_count++))
  fi
done

echo ""
echo "Archive complete!"
echo "  - Files moved: $moved_count"
echo "  - Files not found: $skipped_count"
echo "  - Archive location: $ARCHIVE_DIR/"


