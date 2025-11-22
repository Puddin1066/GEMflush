# Archive Directory

This directory contains files that have been archived to improve codebase efficiency and reduce compilation time.

## Archived on: November 22, 2025

## Files Archived: 19 total

### Test Files (7 files)
**Location:** `_archive/tests/`

#### Crawler Tests (3 files)
- `enhanced-firecrawl-client.test.ts` - Redundant with integration tests
- `enhanced-web-crawler.test.ts` - Covered by main index.test.ts
- `firecrawl.test.ts` - Legacy test patterns

#### LLM Tests (4 files)  
- `fingerprinter-unit.test.ts` - Redundant with business-fingerprinter.test.ts
- `fingerprinter.test.ts` - Legacy test patterns
- `llm-validation-contracts.test.ts` - Covered by type contracts
- `openrouter.test.ts` - Redundant with openrouter-client.test.ts

### Demo Scripts (3 files)
**Location:** `_archive/scripts/demos/`

- `demo-llm-fingerprint-mock.ts` - Redundant with main demo
- `demo-llm-performance.ts` - Performance testing, not needed for core functionality
- `demo-streamlined-wikidata.ts` - Redundant with demo-new-wikidata.ts

### Test Scripts (9 files)
**Location:** `_archive/scripts/tests/`

#### Crawler Tests (4 files)
- `test-crawler-isolated.ts` - Redundant with integration tests
- `test-enhanced-crawler.ts` - Covered by main crawler tests
- `test-llm-fingerprint.ts` - Redundant with integration tests
- `test-real-crawl-simple.ts` - Simple test covered elsewhere

#### Wikidata Tests (5 files)
- `test-wikidata-auth-correct-format.ts` - Redundant auth test
- `test-wikidata-auth-diagnostic.ts` - Diagnostic test, not needed
- `test-wikidata-auth-simple.ts` - Covered by main auth test
- `test-wikidata-auth-triple-format.ts` - Format test, redundant
- `test-wikidata-minimal-entity.ts` - Covered by main entity test

## Efficiency Gains

- **19 fewer files** to compile (2.7% reduction)
- **Faster TypeScript compilation**
- **Cleaner test output**
- **Reduced maintenance burden**

## Active Files Kept

### Crawler Module
- `lib/crawler/__tests__/enhanced-crawler-integration.test.ts` - Main integration test
- `lib/crawler/__tests__/firecrawl.integration.test.ts` - Full flow test
- `lib/crawler/__tests__/index.test.ts` - Core functionality test

### LLM Module  
- `lib/llm/__tests__/business-fingerprinter.test.ts` - Main functionality test
- `lib/llm/__tests__/fingerprinter-llm-assisted.test.ts` - LLM integration test
- `lib/llm/__tests__/llm-type-contracts.test.ts` - Type validation
- `lib/llm/__tests__/openrouter-client.test.ts` - API client test
- `lib/llm/__tests__/openrouter-contracts.test.ts` - Contract validation

### Scripts
- `scripts/demo-end-to-end.ts` - Primary demo
- `scripts/demo-llm-fingerprint.ts` - LLM demo
- `scripts/demo-new-wikidata.ts` - Wikidata demo

## Restoration

If any archived file is needed, it can be restored by moving it back to its original location.
