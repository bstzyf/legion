---
name: legion:e2e
description: Scan changes, generate/supplement test cases across 6 quality dimensions, and run full E2E regression
argument-hint: [--analyze-only] [--force-run]
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, AskUserQuestion]
---

<objective>
Execute comprehensive, multi-dimensional E2E testing: scan accumulated changes from all phases, reconcile with live codebase, generate/supplement test cases across 6 quality dimensions (functional, visual regression, accessibility, performance, responsive, API contract), and run full regression.

Purpose: User-controlled E2E execution — run when YOU decide the system is ready, not when the framework forces it. Combines historical change tracking with live code analysis to ensure zero test coverage gaps.

Output: Updated e2e-manifest.md, new/updated spec files under e2e/, full regression report with per-dimension results.

Flags:
  `--analyze-only`  Write/update test cases but skip execution (useful when system is not running)
  `--force-run`     Skip readiness check and attempt execution regardless
</objective>

<execution_context>
skills/e2e-change-tracker/SKILL.md
skills/e2e-dimensions/SKILL.md
skills/wave-executor/SKILL.md
skills/workflow-common-core/SKILL.md
</execution_context>

<context>
@.planning/E2E_CHANGE_LOG.md
@.planning/STATE.md
@.planning/ROADMAP.md
@e2e-manifest.md
</context>

<process>

## Step 1: READ ACCUMULATED CHANGES (Source A — Change Log)

a. Check if `.planning/E2E_CHANGE_LOG.md` exists.
   - If NOT exists:
     Display: "No E2E change log found. Changes are recorded during /legion:plan and /legion:build.
              You can still run E2E — the command will scan your codebase directly.
              Proceed? (Source B codebase scan will be the sole input)"
     Use AskUserQuestion:
       - "Proceed with codebase scan only"
       - "Cancel"
   - If exists: read full content, parse into structured data per phase

b. Parse change log entries:
   - For each phase section: extract routes, pages, APIs, components, user journeys
   - Track which phases are marked as "[x] Covered by E2E" vs "[ ] Not yet covered"
   - Count total uncovered changes since last E2E run

c. Report: "Found changes across {N} phases, {M} uncovered since last E2E run"

## Step 2: SCAN LIVE CODEBASE (Source B — Reality Check)

a. Detect project framework and structure:
   - Read package.json → identify framework (Next.js, React, Vue, Express, etc.)
   - Read tsconfig.json / vite.config / next.config if exists
   - Identify source directories

b. Scan for testable surfaces:
   - **Routes**: Glob framework-specific route patterns
     - Next.js: `app/**/page.tsx`, `pages/**/*.tsx`
     - React Router: Grep `<Route` / `createBrowserRouter`
     - Vue: Grep `routes:` in router config
     - Express: Grep `router.get\|router.post\|app.get\|app.post`
   - **Pages/Components**: Glob `**/*Page.tsx`, `**/*View.tsx`, `**/*Screen.tsx`
   - **API Endpoints**: Grep `@Get\|@Post\|router\.\|app\.get\|app\.post`
   - **Forms**: Grep `<form\|useForm\|Formik\|react-hook-form`
   - **Auth**: Grep `login\|signup\|auth\|session\|token\|password`

c. Report: "Codebase scan found {R} routes, {P} pages, {A} API endpoints, {F} forms"

## Step 3: DUAL-SOURCE RECONCILIATION

a. **Merge sources** — take the union (not intersection) of Source A and Source B:

   | Source A (Change Log) | Source B (Code Scan) | Action |
   |----------------------|---------------------|--------|
   | Mentioned + Code exists | ✅ Confirmed journey | Include |
   | Mentioned + Code missing | ⚠️ Possibly deleted/renamed | Flag for review, still include |
   | Not mentioned + Code exists | ⚠️ Gap in change tracking | Include (code is truth) |

b. **Compare against existing E2E coverage**:
   - Read `e2e-manifest.md` (if exists) → extract covered journeys
   - Glob `e2e/**/*.spec.{ts,js}` → extract existing spec files
   - For each journey in reconciled list:
     - Has spec + spec passes `--list` → ✅ Keep, will run
     - Has spec but underlying code changed → ⚠️ May need spec update
     - No spec → 🆕 Needs new spec
     - Orphan spec (spec exists, journey not in list) → 🟡 Still run it

c. Report reconciliation summary:
   "Reconciliation complete:
    - Confirmed journeys: {N}
    - New (need specs): {M}
    - May need update: {K}
    - Orphan specs: {O}
    - Total to execute: {T}"

## Step 4: SYSTEM READINESS CHECK

Skip this step if `--analyze-only` flag is set → go to Step 5 with mode=ANALYZE_ONLY.
Skip the check (but still run) if `--force-run` flag is set → go to Step 5 with mode=EXECUTE.

a. Check application status:
   ```bash
   # Check if app is running
   curl -sf http://localhost:${PORT:-3000}/ >/dev/null 2>&1 && echo "RUNNING" || echo "NOT_RUNNING"
   
   # Check if response contains HTML (browser-testable UI exists)
   curl -sf http://localhost:${PORT:-3000}/ 2>/dev/null | grep -qi "<html" && echo "HAS_UI" || echo "API_ONLY"
   
   # Check Playwright installation
   npx playwright test --version >/dev/null 2>&1 && echo "PLAYWRIGHT_OK" || echo "PLAYWRIGHT_MISSING"
   ```

b. If NOT_RUNNING:
   Use AskUserQuestion with options:
   - "Start the system and retry" → display "Please start your app, then run /legion:e2e again" → exit
   - "Analyze and write test cases only (skip execution)" → mode=ANALYZE_ONLY → Step 5
   - "Cancel" → exit

c. If PLAYWRIGHT_MISSING:
   Display: "Playwright not installed. Run: npm install -D @playwright/test && npx playwright install"
   Use AskUserQuestion:
   - "I'll install it — remind me the commands" → display install commands → exit
   - "Analyze only (skip execution)" → mode=ANALYZE_ONLY → Step 5
   - "Cancel" → exit

d. If RUNNING:
   mode=EXECUTE → Step 5

## Step 5: SPAWN E2E-RUNNER AGENT

a. Prepare agent context:
   ```
   MODE: {EXECUTE | ANALYZE_ONLY}
   
   CHANGE LOG CONTENT:
   {full E2E_CHANGE_LOG.md or "No change log available — use codebase scan only"}
   
   RECONCILIATION RESULTS:
   {from Step 3 — confirmed journeys, new, updates needed, orphans}
   
   EXISTING MANIFEST:
   {full e2e-manifest.md content or "No manifest yet — first run"}
   
   EXISTING SPECS:
   {list of e2e/**/*.spec.{ts,js} files}
   
   PROJECT FRAMEWORK:
   {detected framework, source dirs, port}
   ```

b. Spawn e2e-runner agent (from `agents/e2e-runner.md`) with full personality injection.

c. Agent executes its CUMULATIVE mode workflow (see e2e-runner "CUMULATIVE Mode" section):
   - **Phase 1 (Analyze)**: Read context → detect applicable dimensions → identify journeys
     - Dimension detection: scan codebase for UI files, API routes, CSS media queries
     - Output per-dimension applicability table in test case document
   - **Phase 2 (Create)**: Write/update specs across all applicable dimensions:
     - Functional: POM pages + journey specs under `e2e/journeys/`
     - Visual Regression: screenshot baseline specs under `e2e/visual/` (if UI exists)
     - Accessibility: axe-core WCAG 2.1 AA scan specs under `e2e/a11y/` (if UI exists)
     - Performance: Web Vitals budget specs under `e2e/performance/` (if UI exists)
     - Responsive: multi-device projects in playwright.config (if responsive CSS detected)
     - API Contract: endpoint validation specs under `e2e/api/` (if API endpoints detected)
   - **Phase 3 (Execute or Skip)**:
     - EXECUTE mode → `npx playwright test` (full regression across all dimensions, ALL specs)
     - ANALYZE_ONLY mode → skip execution, report "ready for manual run"

d. Wait for agent completion. Read agent's output files.

## Step 6: REPORT RESULTS

a. Parse agent output:
   - `e2e-manifest.md` — updated journey registry
   - `.planning/phases/{current}/e2e-quality-gate.md` — execution results (if EXECUTE mode)
   - New/updated spec files under `e2e/`

b. Display summary:
   ```
   ## E2E Execution Complete
   
   Mode: {EXECUTE | ANALYZE_ONLY}
   
   ### Coverage
   - Total journeys: {N}
   - New specs created: {M}
   - Existing specs retained: {K}
   
   ### Dimension Results (EXECUTE mode only)
   | Dimension          | Tests | Passed | Failed | Status |
   |--------------------|-------|--------|--------|--------|
   | Functional         | {n}   | {n}    | {n}    | ✅/❌  |
   | Visual Regression  | {n}   | {n}    | {n}    | ✅/❌  |
   | Accessibility      | {n}   | {n}    | {n}    | ✅/❌  |
   | Performance        | {n}   | {n}    | {n}    | ✅/❌  |
   | Responsive         | {n}   | {n}    | {n}    | ✅/❌  |
   | API Contract       | {n}   | {n}    | {n}    | ✅/❌  |
   
   ### Failures (if any)
   {list failed tests with spec file path + error + screenshot link}
   
   Run manually: npx playwright test
   View report:  npx playwright show-report
   ```

c. If mode was ANALYZE_ONLY:
   ```
   ## E2E Analysis Complete (execution skipped)
   
   Test cases are ready at: e2e/journeys/
   Page objects at: e2e/pages/
   
   Run when system is online:
     npx playwright test
   
   Or run again with execution:
     /legion:e2e
   ```

## Step 7: UPDATE CHANGE LOG

a. Read `.planning/E2E_CHANGE_LOG.md`
b. For each phase that was covered in this run:
   - Change `- [ ] Not yet covered by E2E tests` to `- [x] Covered by E2E run on {YYYY-MM-DD}`
c. Update or append the "## Last E2E Run" section:
   ```markdown
   ## Last E2E Run
   - Date: {YYYY-MM-DD HH:MM}
   - Mode: {EXECUTE | ANALYZE_ONLY}
   - Command: /legion:e2e {flags}
   - Journeys tested: {N}
   - Pass rate: {P}% (or N/A for ANALYZE_ONLY)
   - Dimensions: functional, visual, a11y, performance, responsive, api-contract
   ```

</process>
