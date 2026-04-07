# E2E Change Tracker Skill

## Purpose

Passively accumulate change information during plan and build stages for later E2E execution. This skill records **what changed** (facts) without judging **how to test** (that's the e2e-runner agent's job).

## Integration Points

### 1. Plan Stage (commands/plan.md Step 8.9)

After phase decomposition completes, extract planned impact from all generated plans.

**Trigger**: End of `/legion:plan` command, after all plans are written.

**Input**: All `{NN}-{PP}-PLAN.md` files in `.planning/phases/{NN}-{slug}/`

**Process**:
1. Read each plan's frontmatter and description
2. For plans with code files in `files_modified` (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.java`, `.kt`, `.rb`):
   - Extract mentioned routes, pages, components, API endpoints from plan description
   - Infer affected user journeys from plan title and requirements
3. Append to `.planning/E2E_CHANGE_LOG.md` under section:
   ```markdown
   ## Phase {N}: {phase-name}
   
   ### Planned Impact (recorded at plan stage)
   - New routes: {list}
   - New pages: {list}
   - User journeys affected: {list}
   - APIs: {list}
   ```

**Output**: Updated `.planning/E2E_CHANGE_LOG.md` with planned changes

**Error handling**: If file can't be created or `settings.testing.e2e_change_tracking` is false, skip silently.

---

### 2. Build Stage (commands/build.md Step 4.g1.5)

After each plan execution completes, record actual changes from SUMMARY.md.

**Trigger**: After each plan's SUMMARY.md is written (Step 4.g)

**Input**: Current plan's `{NN}-{PP}-SUMMARY.md` file

**Process**:
1. Read SUMMARY.md "Files Created / Modified" section
2. Categorize files by type:
   - Routes: `**/routes/**`, `**/pages/**`, `app/**/page.tsx`
   - Components: `**/*Page.tsx`, `**/*View.tsx`, `**/*Component.tsx`
   - APIs: `**/api/**`, `**/controllers/**`, `**/handlers/**`
   - Middleware: `**/middleware/**`
   - Other: everything else
3. Append to `.planning/E2E_CHANGE_LOG.md` under section:
   ```markdown
   ### Actual Changes (recorded at build stage)
   - Plan {NN}-{PP}: {plan-title}
     - Files: {categorized-list}
     - Routes: {extracted-routes}
     - APIs: {extracted-endpoints}
   ```

**Output**: Updated `.planning/E2E_CHANGE_LOG.md` with actual changes

**Error handling**: If SUMMARY.md doesn't exist or `settings.testing.e2e_change_tracking` is false, skip silently.

---

## E2E_CHANGE_LOG.md Format

**Location**: `.planning/E2E_CHANGE_LOG.md` (project root's `.planning/` directory)

**Structure**:

```markdown
# E2E Change Log

This file accumulates changes across all phases for later E2E test generation.
It is read by `/legion:e2e` command to perform dual-source reconciliation.

---

## Phase 1: Authentication Foundation

### Planned Impact (recorded at plan stage)
- New routes: /login, /signup, /logout
- New pages: LoginPage, SignupPage
- User journeys affected: H1 (User Login), H2 (User Registration)
- APIs: POST /api/auth/login, POST /api/auth/signup

### Actual Changes (recorded at build stage)
- Plan 01-01: Implement LoginPage component
  - Files: frontend/src/pages/LoginPage.tsx, frontend/src/components/LoginForm.tsx
  - Routes: /login
  - Components: LoginPage, LoginForm
- Plan 01-02: Implement auth API endpoints
  - Files: backend/src/routes/auth.ts, backend/src/middleware/session.ts
  - APIs: POST /api/auth/login, POST /api/auth/signup
  - Middleware: session.ts

### E2E Coverage Status
- [ ] Not yet covered by E2E tests

---

## Phase 2: Dashboard & Navigation

### Planned Impact (recorded at plan stage)
- New routes: /dashboard, /profile
- New pages: DashboardPage, ProfilePage
- User journeys affected: H3 (Dashboard Access), H4 (Profile View)

### Actual Changes (recorded at build stage)
- Plan 02-01: Dashboard layout
  - Files: frontend/src/pages/DashboardPage.tsx
  - Routes: /dashboard
  - Components: DashboardPage
- Plan 02-02: Profile page
  - Files: frontend/src/pages/ProfilePage.tsx
  - Routes: /profile
  - Components: ProfilePage

### E2E Coverage Status
- [ ] Not yet covered by E2E tests

---

## Last E2E Run
- Date: (none yet)
- Command: (none yet)
- Journeys tested: 0
- Pass rate: N/A
```

---

## Settings Configuration

Add to `settings.json`:

```json
{
  "testing": {
    "e2e_change_tracking": true
  }
}
```

**Default**: `true` (enabled by default)

**When false**: Both plan and build stages skip change recording silently.

---

## Key Design Principles

1. **Facts only, no judgment**: Records "LoginPage.tsx was created" not "needs visual regression test"
2. **Two-phase recording**: Plan records intent, Build records reality — both are useful for E2E
3. **Lightweight**: No AI analysis, just file categorization and text extraction
4. **Silent failure**: If disabled or file can't be written, doesn't block plan/build
5. **Cumulative**: Appends to log, never overwrites — full history preserved

---

## Usage by /legion:e2e Command

The `/legion:e2e` command reads this file as **Source A** (change log) and combines it with **Source B** (live codebase scan) for dual-source reconciliation. This ensures no test cases are missed.

See `commands/e2e.md` for full workflow.
