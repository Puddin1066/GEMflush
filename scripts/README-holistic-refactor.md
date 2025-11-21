# Holistic Refactoring Script

Automated refactoring tool for the GEMflush codebase that systematically analyzes, cleans, and improves the backend codebase.

## Overview

This script performs a comprehensive analysis of the codebase based on:

- **Holistic_Refactoring_Script.md** - Refactoring methodology and principles
- **docs/reference/CONTRACTS_SCHEMAS_VALIDATION.md** - Contract and validation requirements
- **docs/development/LIB_CLEANUP_ANALYSIS.md** - Code cleanup priorities
- **docs/reference/ENDPOINTS_REFERENCE.md** - API endpoint relationships

## Usage

```bash
# Run the analysis
npx tsx scripts/holistic-refactor.ts

# Or make it executable and run directly
chmod +x scripts/holistic-refactor.ts
./scripts/holistic-refactor.ts
```

## What It Does

1. **Scans** all TypeScript files in `lib/` and `app/api/` directories
2. **Analyzes** each file for:
   - Exports and imports
   - Function definitions
   - Contract compliance
   - Validation coverage
   - Usage patterns
3. **Categorizes** files into actions:
   - **Keep** - Active, critical code
   - **Refactor** - Needs improvement (contract violations, validation gaps)
   - **Deprecate** - Questionable usage, needs review
   - **Archive** - Move to archive directory
   - **Remove** - Redundant or unused code
4. **Generates** reports:
   - `refactoring-report.json` - Detailed JSON report
   - `REFACTORING_ACTION_PLAN.md` - Human-readable action plan

## Output Files

### refactoring-report.json

Complete analysis results in JSON format:
- File-by-file analysis
- Export/import relationships
- Issues detected
- Recommended actions

### REFACTORING_ACTION_PLAN.md

Human-readable action plan with:
- Summary statistics
- Files to remove (with reasons)
- Files to deprecate (with migration steps)
- Files to refactor (with specific issues)

## Key Features

### Critical CFP Workflow Detection

The script identifies and protects critical CFP (Crawl → Fingerprint → Publish) workflow files:
- Crawl: `lib/crawler/`, `lib/validation/crawl.ts`
- Fingerprint: `lib/llm/fingerprinter.ts`
- Publish: `lib/wikidata/entity-builder.ts`, `lib/wikidata/publisher.ts`

### Contract Compliance Checking

Verifies that service implementations match their contracts:
- `IWebCrawler` → `lib/crawler/index.ts`
- `ILLMFingerprinter` → `lib/llm/fingerprinter.ts`
- `IWikidataEntityBuilder` → `lib/wikidata/entity-builder.ts`
- `IWikidataPublisher` → `lib/wikidata/publisher.ts`

### Validation Coverage

Checks for proper validation at:
- API route boundaries
- Service function inputs
- External data processing

### Redundancy Detection

Identifies duplicate code:
- `lib/utils.ts` (duplicate of `lib/utils/cn.ts`)
- Other redundant files

## Safety Features

- **Never deletes code** - Only reports and suggests actions
- **Idempotent** - Safe to run multiple times
- **Conservative defaults** - Prefers deprecation over deletion
- **Preserves CFP workflow** - Protects critical functionality

## Example Output

```
🔍 Starting holistic refactoring analysis...

📁 Scanning directories...
   Found 127 TypeScript files

🔬 Analyzing files...
   Analyzed 127 files

🎯 Determining refactoring actions...

📊 REFACTORING SUMMARY

Files Analyzed: 127
  ✅ Keep: 98
  🔧 Refactor: 15
  ⚠️  Deprecate: 8
  📦 Archive: 2
  🗑️  Remove: 4

🔴 Redundant Code:
   - lib/utils.ts

🟠 Contract Violations:
   - lib/services/business-processing.ts: Should implement IBusinessProcessor contract
   ...

💾 Detailed report saved to: refactoring-report.json
📋 Action plan saved to: REFACTORING_ACTION_PLAN.md

✅ Analysis complete!
```

## Next Steps

After running the script:

1. **Review** `REFACTORING_ACTION_PLAN.md`
2. **Prioritize** refactoring tasks
3. **Test** changes incrementally
4. **Run tests** after each change:
   ```bash
   pnpm test:run
   ```
5. **Re-run** the script to verify improvements

## Integration with CI/CD

Consider adding this script to your CI pipeline:

```yaml
# .github/workflows/refactor-check.yml
- name: Run Refactoring Analysis
  run: npx tsx scripts/holistic-refactor.ts
  continue-on-error: true
```

## Limitations

- **Static analysis only** - Doesn't detect runtime usage patterns
- **Import resolution** - May not fully resolve complex import chains
- **Test files excluded** - Focuses on source code only
- **Manual review required** - All suggestions should be reviewed before implementation

## Contributing

When adding new code:
- Ensure it implements required contracts
- Add proper validation
- Follow the CFP workflow patterns
- Run this script to verify compliance


