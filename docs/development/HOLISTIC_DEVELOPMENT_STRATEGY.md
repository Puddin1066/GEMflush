# Holistic Platform Development Strategy: Test-Driven KGaaS

## Executive Summary

This document outlines a **Holistic Platform Development Strategy** for GEMflush. Instead of fragmented feature development, we employ a **Test-Driven Platform Engineering** approach. The "Ideal User Journey" is codified into a single, comprehensive End-to-End (E2E) test (`full-ux-sequence.spec.ts`).

This test serves as the **Master Control Loop**: it is run iteratively to drive the development, debugging, and refinement of the platform until the implementation converges with the ideal state.

---

## 1. The "North Star" Test Mechanism

The file `tests/e2e/full-ux-sequence.spec.ts` is the executable specification of the platform. It does not just test *if* the code works; it asserts *how* the business logic, data flow, and user experience must behave.

### The Core Loop (The "Gem Cycle")
The test forces the platform to execute the 4-stage KGaaS pipeline autonomously:

1.  **Ingestion (Crawl):** `URL -> Structured Data`
2.  **Analysis (Fingerprint):** `Data -> Visibility Score + Competitive Intel`
3.  **Construction (Entity Build):** `Intel -> Knowledge Graph Claims`
4.  **Publication (Write):** `Claims -> Wikidata QID`

### The Iterative Process
1.  **Run the Test:** Execute `npx playwright test tests/e2e/full-ux-sequence.spec.ts`.
2.  **Identify the Bottleneck:** Determine which stage of the pipeline failed or underperformed (e.g., "Crawl succeeded but Location was missing", "Fingerprint ran but Competitive Intel was empty").
3.  **Develop the Layer:** Implement or refine the specific service responsible (e.g., upgrade `Crawler` regex, refine `LLMFingerprinter` prompts).
4.  **Repeat:** Run the test again. Success confirms not just the feature, but its integration into the whole.

---

## 2. Development Maturity Stages

We will use the test to advance the platform through three stages of maturity.

### Stage 1: Structural Integrity (The "Plumbing" Check)
*   **Goal:** The test completes without crashing. All state transitions (`pending` -> `crawled` -> `published`) occur.
*   **Test Configuration:** Heavy Mocking (`mockExternalServices` enabled).
*   **Focus:**
    *   API Endpoint coordination (`/api/business` -> `/api/crawl`).
    *   Database schema validity (`business.crawlData` saving correctly).
    *   Frontend polling/SWR hooks updating the UI.

### Stage 2: Data Fidelity (The "Intelligence" Check)
*   **Goal:** The test asserts *quality* of data. Competitive Intelligence is not just present, but accurate (no "Sample Business" placeholders).
*   **Test Configuration:** Partial Mocking (Real logic, mocked network responses).
*   **Focus:**
    *   `LLMFingerprinter` extraction logic.
    *   `NotabilityChecker` scoring algorithms.
    *   `CompetitiveEdgeCard` rendering logic.
*   **Failure Mode:** The test fails if the "Competitive Gap" is `0` or undefined, forcing the developer to improve the analytics engine.

### Stage 3: Operational Reality (The "Production" Check)
*   **Goal:** The test passes with real external dependencies.
*   **Test Configuration:** Live Mode (Real OpenRouter, Test.Wikidata.org).
*   **Focus:**
    *   API Rate limiting and retries.
    *   Latency SLAs (e.g., "Time to QID" < 2 minutes).
    *   Error handling for flaky 3rd party APIs.

---

## 3. Architecture Enablement

This strategy ensures the **Service Layer** evolves efficiently:

| Service | Test Trigger | Development Action |
| :--- | :--- | :--- |
| **AutomationService** | Step 1 (URL Entry) | Implement "Auto-Start" logic to trigger Crawl immediately upon URL submission. |
| **BusinessProcessing** | Step 2 (Crawl) | Refine `cheerio` extractors to handle edge cases (SPA sites, missing JSON-LD). |
| **LLMFingerprinter** | Step 3 (Analysis) | Improve prompt engineering to extract structured "Competitor" lists from unstructured text. |
| **WikidataPublisher** | Step 4 (Publish) | Ensure `EntityBuilder` correctly maps business categories to Wikidata PIDs (P31). |

---

## 4. Execution Guide

To execute this strategy:

1.  **Lock the Spec:** Do not lower the standards in `full-ux-sequence.spec.ts`. If it fails, the code is wrong, not the test.
2.  **Debug Mode:** Use `npx playwright test --debug` to step through the "Ideal Flow" and watch the UI react in real-time.
3.  **Fix Forward:** When a step fails (e.g., "Entity Preview not visible"), trace the data flow backward:
    *   Did the API return the QID? (Check Network tab)
    *   Did the Publisher save to DB? (Check `lib/wikidata/publisher.ts`)
    *   Did the Builder construct valid JSON? (Check `lib/wikidata/entity-builder.ts`)

This strategy transforms the codebase from a collection of features into a unified **Graph Presence Engine**.

