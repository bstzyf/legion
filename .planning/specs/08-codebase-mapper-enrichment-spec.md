# Spec: Phase 8 — Codebase Mapper Enrichment

## Overview

Phase 8 enriches the codebase-mapper skill with two new analysis capabilities: package-level dependency risk assessment (MAP-01) and enhanced test coverage summary with critical-file correlation (MAP-02). The existing codebase-mapper already has config-level dependency checks (Section 4.4) and sample-based test coverage mapping (Section 9). This phase adds deeper analysis layers that produce new/enriched sections in CODEBASE.md, consumed by all 5 integration points (`/start`, `/plan`, `/build`, `/review`, `/plan critique`).

Both enrichments follow Legion's core principles: heuristic-based detection using Read/Bash/Glob/Grep only, calibrated scoring relative to project size, and graceful degradation when data is unavailable.

## Requirements

| ID | Description | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| MAP-01 | Dependency risk assessment in CODEBASE.md output | Must | CODEBASE.md includes `## Dependency Risk` section with outdated, unmaintained, and heavy dependency analysis per ecosystem |
| MAP-02 | Test coverage summary in CODEBASE.md output | Must | CODEBASE.md `## Test Coverage Map` section enriched with coverage percentage from tooling (when available), untested critical files cross-referenced with fan-in data, and risk categorization |

## Architecture

Phase 8 adds two new subsections to the codebase-mapper SKILL.md and enriches the CODEBASE.md template. No new files are created beyond tests — all changes are modifications to existing artifacts.

### Data Flow

```
Section 4.4 (existing config checks)
  + NEW Section 4.6: Package-Level Dependency Risk
    → Uses: npm outdated, pip list --outdated, bundle outdated, cargo outdated
    → Produces: Dependency Risk section in CODEBASE.md

Section 9 (existing test coverage map)
  + ENRICHED Section 9.4: Critical File Coverage Correlation
    → Uses: Section 8 fan-in data + Section 4.1 complexity data
    → Enhanced: Coverage tool integration (nyc/istanbul, pytest-cov, go test -cover)
    → Produces: Enriched Test Coverage Map in CODEBASE.md
```

### Key Decisions

| Decision | Choice | Rationale | Alternatives Considered |
|----------|--------|-----------|------------------------|
| Package analysis approach | Run ecosystem-specific CLI commands (`npm outdated`, etc.) | Consistent with existing heuristic-based approach in SKILL.md; no external dependencies | Parse lockfile manually (too fragile), call npm audit API (requires network, breaks offline) |
| Outdated detection | Use package manager `outdated` commands | Built into every major ecosystem; returns structured data | Parse version numbers from manifests (error-prone, incomplete) |
| Unmaintained detection | Heuristic: packages with no updates in >2 years from lockfile metadata | Simple, no API calls needed | GitHub API for last commit date (requires auth, rate limits) |
| Heavy dependency detection | Count transitive deps via `npm ls --all --json` or equivalent | Measures actual weight, not just direct deps | Check bundle size (requires build tooling, not always available) |
| Coverage tool integration | Attempt to read existing coverage reports before running tools | Respects user's existing CI setup; non-invasive | Always run coverage (slow, may fail, alters state) |
| Critical file correlation | Cross-reference Section 8 fan-in with Section 9 untested files | High fan-in + no tests = highest risk combination | Use complexity only (misses coupling risk) |

## Deliverables

### 1. Codebase-Mapper SKILL.md — New Section 4.6 (Dependency Risk)

- **Path:** `skills/codebase-mapper/SKILL.md`
- **Purpose:** Add package-level dependency risk analysis protocol
- **Key Content:**
  - Ecosystem-specific outdated detection commands and parsing
  - Unmaintained package heuristic (lockfile date analysis)
  - Heavy dependency detection (transitive count thresholds)
  - Calibrated risk scoring relative to dependency count
  - Skip conditions for each ecosystem (graceful degradation)
- **Dependencies:** Existing Section 4.4 (config-level checks), Section 3.1 (framework detection)
- **Estimated Size:** ~80-100 lines added to SKILL.md

### 2. Codebase-Mapper SKILL.md — Enhanced Section 9 (Test Coverage)

- **Path:** `skills/codebase-mapper/SKILL.md`
- **Purpose:** Enrich test coverage analysis with coverage tool integration and critical file correlation
- **Key Content:**
  - New Section 9.4: Coverage tool integration (read existing reports, optionally run tools)
  - New Section 9.5: Critical file coverage correlation (fan-in × untested = risk)
  - Updated Section 9.3 output format with enriched fields
  - Skip conditions for coverage tools (graceful degradation)
- **Dependencies:** Existing Section 9 (test coverage map), Section 8 (fan-in data), Section 4.1 (complexity)
- **Estimated Size:** ~60-80 lines added to SKILL.md

### 3. CODEBASE.md Template Update

- **Path:** `skills/codebase-mapper/SKILL.md` (Section 5 template)
- **Purpose:** Add `## Dependency Risk` section and enrich `## Test Coverage Map` in the template
- **Key Content:**
  - New `## Dependency Risk` section with ecosystem, outdated count, unmaintained list, heavy deps, risk level
  - Enriched `## Test Coverage Map` with coverage percentage from tooling, critical untested files table
  - Graceful degradation placeholders for both
- **Dependencies:** Deliverables 1 and 2
- **Estimated Size:** ~30-40 lines modified in template

### 4. Test Suite — codebase-mapper-enrichment.test.js

- **Path:** `tests/codebase-mapper-enrichment.test.js`
- **Purpose:** Validate enriched output format, graceful degradation, and calibration logic
- **Key Content:**
  - Tests for Dependency Risk section format (required fields, risk level values)
  - Tests for enriched Test Coverage Map format (coverage percentage, critical files table)
  - Tests for graceful degradation (missing package manager, no coverage data, no test files)
  - Tests for calibration logic (small project vs large project risk scaling)
  - Fixture data for sample dependency and coverage outputs
- **Dependencies:** All other deliverables
- **Estimated Size:** ~150-200 lines

### 5. Test Fixtures

- **Path:** `tests/fixtures/codebase-mapper/`
- **Purpose:** Sample data for enrichment tests
- **Key Content:**
  - Sample npm-outdated output (JSON)
  - Sample coverage report fragments
  - Sample CODEBASE.md with enriched sections
- **Estimated Size:** ~50-80 lines across fixture files

## Open Questions

| # | Question | Impact | Default if Unresolved |
|---|----------|--------|----------------------|
| 1 | Should the dependency risk analysis actually run `npm outdated` (modifies nothing, but takes time) or only parse existing lockfile data? | Deferrable | Run the command — it's read-only and fast |
| 2 | Should coverage tool integration attempt to run `npx nyc` / `pytest-cov` if no existing report is found? | Deferrable | No — only read existing reports. Running tests is invasive and could fail |
| 3 | How many transitive deps constitutes "heavy"? | Deferrable | Use relative thresholds: >100 transitive deps per direct dep = HIGH, 50-100 = MEDIUM |

## Complexity Assessment

**Rating:** Simple

| Metric | Value |
|--------|-------|
| Requirements | 2 |
| Deliverables | 5 (modify: 1 skill file, new: 1 test file, 2-3 fixture files) |
| Estimated waves | 1 (all deliverables can be done in parallel or sequentially with no cross-deps) |
| Estimated plans | 2 |
| Competing proposals | Skip |

**Rationale:** Both requirements enrich existing sections of a well-defined skill file. The patterns for analysis, output format, and graceful degradation are already established. No architectural decisions needed — follow existing conventions.

**Recommended next step:** Run `/legion:plan 8` to decompose into 2 executable plans.

## Revision History

| # | Section | Change | Reason |
|---|---------|--------|--------|
| 1 | Open Questions | Added Q2 about running coverage tools | Coverage tool execution is invasive — should default to reading existing reports only |
| 2 | Key Decisions | Added "unmaintained detection" decision | Original draft didn't specify how to detect unmaintained packages without API calls |
| 3 | Deliverables | Split test fixtures into separate deliverable | Following project convention (tests/fixtures/ directory) |
