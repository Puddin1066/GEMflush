# Holistic Refactoring Script

## Overview

This script is an **automated, agent-guided refactoring tool** for the GEMflush codebase.  
Its goal is to **systematically clean, simplify, and improve** the backend (primarily the `lib/` and other backend-related directories) while preserving functional behavior and avoiding accidental deletion of still-needed logic.

## Objectives

- **Reduce complexity** by removing or deprecating unused, duplicate, or obsolete functions, modules, and files.
- **Align code with curated documentation** by using a **limited set of up-to-date markdown reference files** (contracts, schemas, validators, and endpoint maps).
- **Improve internal consistency** so that each directory and subdirectory has a **clear, streamlined responsibility**.
- **Preserve safety** by avoiding irreversible deletions until changes are tested and validated.

## Inputs & Reference Material

The script should:

- Use a **small, curated set of markdown files**, not the entire legacy set (many of which are outdated).  
  Examples of curated references:
  - `contracts.md` – API contracts (input/output shapes, external dependencies).
  - `schemas-and-validators.md` – data schemas and how they are validated.
  - `endpoints-and-core-logic.md` – mapping from endpoints → handlers → core library functions.
- Treat these markdown files as **ground truth for desired behavior**, but also:
  - Cross-check against actual imports/exports and usage in the TypeScript code.
  - Prefer **real usage in the codebase** over stale documentation when conflicts arise.

## Scope of Operation

The script focuses primarily on **backend / core logic** (e.g. `lib/`, `services/`, `utils/`, etc.), not UI components.

It should:

- Traverse **each directory and subdirectory** in a **methodical, deterministic order** (e.g. depth-first or a predefined directory priority list).
- For each file:
  - Analyze **exports, imports, and internal functions**.
  - Determine **which functions are actually used** elsewhere.
  - Compare functions’ intent against the curated markdown references.
- Treat the frontend (e.g. `app/`, `components/`) as **consumers** of the backend:
  - Do **not** aggressively refactor UI code unless required to keep backend changes compatible.

## Behavior & Responsibilities

For each directory/file, the script should:

- **Identify unused or redundant functions**
  - Use static analysis (imports/exports, TypeScript type info) to find functions that are:
    - Never imported.
    - Imported but never called.
    - Duplicated in newer, preferred modules.
- **Decide action per function/module**:
  - **Keep** – still used and aligned with current design.
  - **Refactor** – still needed, but should be simplified, renamed, or relocated.
  - **Deprecate** – no longer recommended but temporarily kept for compatibility.
  - **Archive** – moved out of the active code path into a dedicated archive location.

### Deprecation Rules

- Add **clear comments/annotations** (e.g. `/** @deprecated … */`) to deprecated functions.
- Ensure deprecated functions:
  - Are **not used by new code**.
  - Are easy to search for and remove in a later cleanup pass.

### Archiving Rules

- For functions or files ready to be removed but still worth preserving:
  - Move them into an `archive/` directory (mirroring original structure when useful).
  - Preserve original file paths as comments so they can be traced back if needed.
- Archived code should **not be imported** from active modules.

## Holistic Refactoring Requirements

The script must **do more than just comment out code**:

- After identifying deprecated/archived functions, it must:
  - **Update call sites** to use the new or preferred functions.
  - **Simplify logic** where previously multiple layers of indirection existed.
  - **Remove dead branches** (e.g. unused conditionals, no-op error handling).
- Where possible, the script should:
  - Merge similar utilities into a **single, well-named function**.
  - Enforce clearer **separation of concerns** per directory (e.g. pure domain logic vs. I/O vs. API handlers).

## Order of Traversal (High-Level Guidance)

The script should **refactor in a stable, repeatable order**, for example:

1. **Core domain / data modules** (e.g. `lib/domain`, `lib/models`):
   - Define the canonical shapes and business logic first.
2. **Service / orchestration modules** (e.g. `lib/services`, `lib/workflows`):
   - Ensure they call into the cleaned-up core in a consistent way.
3. **Integration / API-facing modules** (e.g. `lib/wikidata`, `lib/llm`, `lib/geo`):
   - Align with contracts and schemas, ensure consistent error handling.
4. **Utilities and helpers** (e.g. `lib/utils`, `lib/shared`):
   - Remove duplicates and enforce a small, coherent shared toolbox.
5. **API route handlers / endpoints** (e.g. `app/api/...` in Next.js):
   - Update to use the refactored service + domain layers cleanly.

The script should be written so that **rerunning it is safe and idempotent** (it can be run multiple times without breaking the codebase).

## Safety & Testing

The script must:

- **Never permanently delete code** in its first implementation:
  - Use deprecation + archiving instead of direct deletion.
- **Create or update tests** where possible:
  - Run the existing test suite after each major refactoring pass.
  - Optionally add sanity checks (e.g. “before/after” snapshots for key endpoints).
- **Log all changes** in a machine-readable format (e.g. JSON report):
  - Files touched.
  - Functions deprecated/archived.
  - Refactor operations applied.

## Agent Instructions (Cursor / AI Agent)

When an AI agent uses this script, it should:

- Treat this markdown file as the **specification** for the refactoring behavior.
- Ask for (or infer) the **list of curated markdown references** it is allowed to use.
- Generate:
  - The **TypeScript script(s)** that perform the traversal and analysis.
  - Any supporting utility modules (e.g. dependency graph builder, refactor helpers).
- Maintain a **conservative default**:
  - Prefer deprecation + archiving + refactoring over irreversible deletion.
  - Fail safely if analysis is ambiguous rather than making destructive changes.

