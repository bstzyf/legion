# Phase 11: GitHub Integration — Research

**Researched:** 2026-03-01
**Domain:** GitHub CLI integration, issue tracking, PR creation, milestone sync
**Confidence:** HIGH

---

## Summary

Phase 11 connects Agency Workflows to GitHub — phases link to issues, completed work produces PRs, and project progress syncs to GitHub milestones. All operations use the `gh` CLI (already installed and authenticated on the host machine).

The implementation follows the established pattern: a new skill (`github-sync.md`) implements all GitHub operations, and existing commands (plan, build, status, review, milestone) receive targeted updates to call the skill at the right workflow points. There is no new `/agency:` command — GitHub integration is embedded in existing workflows and is entirely opt-in.

The design mirrors the Memory Conventions pattern from Phase 9: detect capability → use if available → skip silently if not. A project without a GitHub remote works identically to today.

**Primary recommendation:** Build a 2-plan phase — Wave 1 creates the `github-sync` skill and adds GitHub Conventions to workflow-common; Wave 2 wires the skill into plan.md, build.md, status.md, review.md, and execution-tracker.md.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GH-01 | GitHub issue tracking — link phases/tasks to GitHub issues | Section "Architecture Patterns" Pattern 1 details one-issue-per-phase model with frontmatter linking |
| GH-02 | PR creation — agents can create PRs for completed work | Section "Architecture Patterns" Pattern 2 details per-phase PR creation after build/review |
| GH-03 | GitHub status sync — reflect project progress in GitHub (issues, milestones) | Section "Architecture Patterns" Pattern 3 details ROADMAP milestone-to-GitHub milestone mapping |
</phase_requirements>

---

## Standard Stack

### Core

All implementation uses existing Agency plugin primitives plus the `gh` CLI. No new npm packages or external dependencies.

| Artifact | Location | Purpose | Why Standard |
|----------|----------|---------|--------------|
| New skill: `github-sync.md` | `.claude/skills/agency/github-sync.md` | All GitHub operations — issue CRUD, PR creation, milestone sync, status readback | Follows established skill pattern (memory-manager, agent-creator); reference document consumed by commands |
| Updated: `workflow-common.md` | `.claude/skills/agency/workflow-common.md` | Add GitHub Conventions section (paths, linking format, degradation rules) | Consistent with Memory Conventions, Portfolio Conventions additions in prior phases |
| Updated: `plan.md` | `.claude/commands/agency/plan.md` | After plan generation, optionally create GitHub issues for the phase | Integration point for GH-01 |
| Updated: `build.md` | `.claude/commands/agency/build.md` | After phase execution, optionally create a PR | Integration point for GH-02 |
| Updated: `status.md` | `.claude/commands/agency/status.md` | Show GitHub-linked status (issues, PRs, milestones) in dashboard | Integration point for GH-03 |
| Updated: `review.md` | `.claude/commands/agency/review.md` | After review passes, close linked GitHub issues | Completes the issue lifecycle |
| Updated: `execution-tracker.md` | `.claude/skills/agency/execution-tracker.md` | Add PR creation as optional post-phase step | Extends the commit message and tracking conventions |

### gh CLI Commands Used

Verified against `gh` v2.81.0 installed on the host machine.

| Operation | gh Command | Notes |
|-----------|-----------|-------|
| Check auth | `gh auth status` | Returns 0 if authenticated, non-zero if not |
| Check remote | `git remote get-url origin` | Detects if a GitHub remote exists |
| Create issue | `gh issue create --title "..." --body "..." --milestone "..."` | `--milestone` is optional, requires milestone to exist first |
| Close issue | `gh issue close {number} --comment "..."` | Close with a comment explaining what was done |
| List issues | `gh issue list --state open --label "agency"` | Filter to Agency-created issues using a label |
| Create PR | `gh pr create --title "..." --body "..." --base main` | Requires branch + remote; `--base` defaults to default branch |
| Create milestone | `gh api repos/{owner}/{repo}/milestones --method POST -f title="..." -f description="..."` | No direct `gh milestone create` command; use API |
| List milestones | `gh api repos/{owner}/{repo}/milestones` | Returns JSON array |
| Close milestone | `gh api repos/{owner}/{repo}/milestones/{number} --method PATCH -f state=closed` | Patch state to closed |
| Get repo info | `gh repo view --json name,owner,defaultBranch` | Used for constructing API paths |

### Installation

No `npm install` — pure markdown files written with `Write` tool. `gh` CLI is a prerequisite on the user's system.

---

## Architecture Patterns

### Key Design Decision: One Issue Per Phase, One PR Per Phase

**Why not per-plan?** Plans are implementation details — a phase with 3 plans gets 1 GitHub issue, not 3. This keeps the issue count manageable and maps to the level of granularity that humans track (phases = features, plans = tasks within a feature).

**Why not per-agent?** Multiple agents may execute plans within the same phase. The PR aggregates all their work into one reviewable unit.

### Recommended Project Structure

No new files or directories beyond the skill and command updates:

```
.claude/
  skills/agency/
    github-sync.md      # new skill: all GitHub operations
    workflow-common.md   # updated: GitHub Conventions section
    execution-tracker.md # updated: PR creation step
  commands/agency/
    plan.md              # updated: issue creation after planning
    build.md             # updated: PR creation after execution
    status.md            # updated: GitHub section in dashboard
    review.md            # updated: issue close after review pass
```

### Pattern 1: Phase-to-Issue Linking (GH-01)

**What:** After `/agency:plan` generates plan files, optionally create a GitHub issue for the phase.

**When to use:** After step 8 (Generate Plan Files) in plan.md, before step 9 (Update State).

**How it works:**

```
1. Check GitHub availability (github-sync Section 1: Prerequisites)
   - gh auth status → must return 0
   - git remote get-url origin → must return a GitHub URL
   - If either fails: skip GitHub operations silently

2. Create a GitHub issue for the phase (github-sync Section 2)
   Title: "Phase {N}: {phase_name}"
   Body:
     ## Goal
     {phase_goal from ROADMAP.md}

     ## Plans
     - [ ] Plan {NN}-01: {plan_name}
     - [ ] Plan {NN}-02: {plan_name}
     ...

     ## Requirements
     {requirement IDs covered by this phase}

     ## Success Criteria
     {success criteria from ROADMAP.md}

     ---
     *Created by Agency Workflows*
   Labels: ["agency"]
   Milestone: {GitHub milestone number, if one exists for the current ROADMAP milestone}

3. Store the issue number in STATE.md under a "## GitHub" section:
   ## GitHub
   | Phase | Issue | PR | Status |
   |-------|-------|----|--------|
   | Phase {N} | #{issue_number} | — | Open |

4. Confirm to user: "Created GitHub issue #{issue_number} for Phase {N}: {phase_name}"
```

**State linking:** The issue number is stored in STATE.md rather than in plan frontmatter. This avoids modifying plan files after generation and keeps all GitHub metadata in one place.

### Pattern 2: PR Creation After Phase Execution (GH-02)

**What:** After `/agency:build` completes all waves, optionally create a PR for the phase's work.

**When to use:** After step 5 (Complete Phase Execution) in build.md, before step 6 (Route to Next Action). Only if all plans passed — no PR for partial/failed phases.

**How it works:**

```
1. Check GitHub availability (same as Pattern 1)

2. Create a feature branch (if not already on one):
   - Check current branch: git branch --show-current
   - If on main/master: create and switch to agency/phase-{NN}-{slug}
   - If already on a non-main branch: use the current branch

3. Push branch to remote:
   git push -u origin {branch_name}

4. Create PR (github-sync Section 3):
   Title: "Phase {N}: {phase_name}"
   Body:
     ## Summary
     {phase_goal}

     ## Changes
     {aggregate files_modified from all plan frontmatters}

     ## Plans Executed
     | Plan | Wave | Status | Summary |
     |------|------|--------|---------|
     | {NN}-{PP} | {W} | Pass | {one-line summary from SUMMARY.md} |
     ...

     ## Requirements Satisfied
     {requirement IDs from all plan frontmatters}

     Closes #{phase_issue_number}

     ---
     *Created by Agency Workflows*
   Base: main (or default branch from gh repo view)

5. Store PR URL in STATE.md GitHub table:
   Update the Phase {N} row: PR = #{pr_number}

6. Confirm to user: "Created PR #{pr_number} for Phase {N}: {phase_name}"
```

**Branch strategy:** The skill creates a branch from the current HEAD. If the user is already working on a feature branch, it uses that. This is minimally opinionated.

### Pattern 3: Milestone Sync (GH-03)

**What:** When ROADMAP.md milestones are defined, create matching GitHub milestones. When milestones complete, close the GitHub milestone.

**When to use:**
- During `/agency:plan` — if the phase belongs to a milestone, ensure the GitHub milestone exists
- During `/agency:milestone` — when a milestone is completed, close the GitHub milestone

**How it works:**

```
1. Read ROADMAP.md ## Milestones section
2. For each milestone that doesn't have a GitHub milestone number stored:
   - Create it: gh api repos/{owner}/{repo}/milestones --method POST
   - Store the GitHub milestone number in STATE.md GitHub section
3. When a milestone completes:
   - Close it: gh api repos/{owner}/{repo}/milestones/{number} --method PATCH -f state=closed
   - Add completion date and summary as a comment on all linked issues
```

### Pattern 4: Status Read-back (GH-03)

**What:** During `/agency:status`, show a GitHub section with linked issues, PRs, and milestones.

**When to use:** In step 4 (Display Dashboard) of status.md, after the Memory section.

**How it works:**

```
1. Check if STATE.md has a ## GitHub section
   - If not: skip entirely (no placeholder, same as Memory pattern)

2. If GitHub section exists:
   - Read the GitHub table from STATE.md
   - For each issue: check current status via gh issue view {number} --json state
   - For each PR: check current status via gh pr view {number} --json state,mergeable
   - Display:

   ## GitHub
   | Phase | Issue | PR | Status |
   |-------|-------|----|--------|
   | Phase 1 | #1 (closed) | #5 (merged) | Done |
   | Phase 2 | #2 (open) | — | In Progress |

3. If milestones are linked:
   ## GitHub Milestones
   | Milestone | GitHub | Issues | Status |
   |-----------|--------|--------|--------|
   | M1: Core | gh#1 | 5/8 closed | Open |
```

### Pattern 5: Issue Close After Review (GH-01 lifecycle)

**What:** After `/agency:review` passes a phase (no blockers), close the linked GitHub issue.

**When to use:** At the end of review.md, after marking the phase complete.

**How it works:**

```
1. Check STATE.md GitHub section for the current phase's issue number
2. If an issue number exists:
   gh issue close {number} --comment "Phase {N} review passed. All plans verified."
3. Update STATE.md GitHub table: Status = "Closed"
```

### Anti-Patterns to Avoid

- **Don't create issues for every plan** — one issue per phase. Plans are implementation details.
- **Don't require a GitHub remote** — all GitHub operations are opt-in. Projects without a remote work identically.
- **Don't auto-push without confirmation** — PR creation requires pushing to remote; always confirm first.
- **Don't store GitHub metadata in plan frontmatter** — keep it centralized in STATE.md's GitHub section.
- **Don't use `gh` subcommands that require interactive input** — always pass all required flags.
- **Don't create branches without checking current branch state** — respect the user's existing branch setup.
- **Don't assume `main` is the default branch** — use `gh repo view --json defaultBranch` to detect it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub authentication check | Custom token validation | `gh auth status` exit code | `gh` handles all auth methods (token, SSH, keyring) |
| Remote URL parsing | Regex on git remote URL | `gh repo view --json owner,name` | Handles HTTPS, SSH, and other URL formats |
| Issue body formatting | Custom template engine | Inline heredoc in `gh issue create --body` | Simple enough to construct directly |
| PR body with linked issues | Custom reference parser | "Closes #{number}" keyword in PR body | GitHub natively recognizes this syntax |
| Milestone API calls | Custom HTTP requests | `gh api` subcommand | Handles auth headers and pagination automatically |
| Branch name sanitization | Custom slug function | Same phase slug convention from workflow-common.md | Already have a slug for the phase directory |

---

## Common Pitfalls

### Pitfall 1: No GitHub Remote Configured

**What goes wrong:** `gh issue create` fails with "no GitHub remote found" when the project hasn't been pushed to GitHub.

**Why it happens:** This project (agency-agents) currently has no remote. Many local-first projects start this way.

**How to avoid:** The github-sync skill MUST check for a remote before every operation. Failure is graceful — log nothing, skip silently, don't even suggest setup unless the user explicitly asks.

**Warning signs:** Any `gh` command returning "no GitHub remote" or "repository not found".

### Pitfall 2: Branch Conflicts During PR Creation

**What goes wrong:** User is on `main`, agent tries to create a PR from `main` to `main`. Or user has uncommitted changes when trying to push.

**Why it happens:** PR creation requires a non-default branch. The execution flow needs to handle branching.

**How to avoid:** Before PR creation: (1) check current branch, (2) if on default branch, create a feature branch, (3) check for uncommitted changes before push, (4) confirm with user before pushing.

**Warning signs:** `gh pr create` returning "head branch is the same as the base branch".

### Pitfall 3: Rate Limiting on gh API Calls

**What goes wrong:** Multiple rapid `gh api` calls during status readback hit GitHub's rate limit, causing failures.

**Why it happens:** Status dashboard reads multiple issue/PR statuses in quick succession.

**How to avoid:** Batch API calls where possible. For status readback, use `gh issue list` and `gh pr list` instead of individual `gh issue view` calls. Cache results within a single status command run.

**Warning signs:** HTTP 403 or 429 responses from `gh api`.

### Pitfall 4: Milestone Not Found

**What goes wrong:** `gh issue create --milestone "v1.0"` fails because the GitHub milestone doesn't exist yet.

**Why it happens:** ROADMAP.md milestones are defined locally but not yet synced to GitHub.

**How to avoid:** Always check if the GitHub milestone exists before referencing it. Create it first if needed. The sync flow in Pattern 3 handles this — sync milestones BEFORE creating issues.

### Pitfall 5: Stale GitHub Metadata in STATE.md

**What goes wrong:** STATE.md shows an issue as "Open" but it was manually closed on GitHub. Or a PR was merged but STATE.md wasn't updated.

**Why it happens:** STATE.md is a local snapshot. GitHub state can change externally.

**How to avoid:** During `/agency:status`, always query GitHub for live status rather than relying on STATE.md values. STATE.md stores the linking information (issue numbers, PR numbers), but status is always fetched live.

---

## Code Examples

Verified patterns from `gh` CLI v2.81.0.

### Check GitHub Availability

```bash
# Check if gh is authenticated
gh auth status 2>&1 && echo "AUTHED" || echo "NOT_AUTHED"

# Check if a GitHub remote exists
git remote get-url origin 2>/dev/null && echo "HAS_REMOTE" || echo "NO_REMOTE"
```

### Create Phase Issue

```bash
gh issue create \
  --title "Phase 3: Phase Planning" \
  --body "$(cat <<'EOF'
## Goal
Users can type `/agency:plan 1` and get wave-structured plans with recommended agents.

## Plans
- [ ] Plan 03-01: Phase-decomposer skill
- [ ] Plan 03-02: /agency:plan command wiring

## Requirements
PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05

---
*Created by Agency Workflows*
EOF
)" \
  --label "agency"
```

### Create Phase PR

```bash
gh pr create \
  --title "Phase 3: Phase Planning" \
  --body "$(cat <<'EOF'
## Summary
Phase decomposition engine with agent recommendations and wave-structured plans.

## Changes
- `.claude/skills/agency/phase-decomposer.md` (new)
- `.claude/commands/agency/plan.md` (new)

## Plans Executed
| Plan | Wave | Status | Summary |
|------|------|--------|---------|
| 03-01 | 1 | Pass | Phase-decomposer skill (503 lines) |
| 03-02 | 2 | Pass | /agency:plan command (10-step process) |

## Requirements Satisfied
PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05

Closes #3

---
*Created by Agency Workflows*
EOF
)" \
  --base main
```

### Create GitHub Milestone

```bash
# Get repo owner/name
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Create milestone
gh api "repos/${REPO}/milestones" \
  --method POST \
  -f title="v1.0 — Core Workflows" \
  -f description="Phases 1-6: Foundation through Status & Quick"
```

### Close Issue After Review

```bash
gh issue close 3 --comment "Phase 3 review passed. All plans verified."
```

### Batch Status Check (efficient for dashboard)

```bash
# Get all open issues with agency label
gh issue list --label "agency" --state all --json number,title,state

# Get all open PRs by agency
gh pr list --state all --json number,title,state,mergedAt
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual GitHub issue management | Automated issue creation linked to phases | Phase 11 (this phase) | Phases automatically tracked as GitHub issues |
| Manual PR creation after builds | Automated PR creation from phase execution output | Phase 11 (this phase) | Consistent PR format with full plan summaries |
| No GitHub milestone tracking | ROADMAP milestones sync to GitHub milestones | Phase 11 (this phase) | Project progress visible in GitHub's milestone UI |

---

## Open Questions

1. **Should the "agency" label be created automatically?**
   - What we know: `gh issue create --label "agency"` will fail if the label doesn't exist.
   - What's unclear: Should the skill auto-create the label, or require it to exist?
   - Recommendation: Auto-create it on first use. `gh label create agency --description "Agency Workflows" --color 7B68EE 2>/dev/null` (no-op if exists).

2. **Should PR creation create a branch automatically or require the user to be on a feature branch?**
   - What we know: Agency build currently commits to whatever branch the user is on (usually main).
   - What's unclear: Should the workflow create feature branches per phase?
   - Recommendation: Offer to create a branch (`agency/phase-{NN}-{slug}`) if the user is on the default branch. If already on a feature branch, use it. Always confirm before pushing.

3. **Should issue creation be automatic or require confirmation?**
   - What we know: The Memory layer stores outcomes without asking. Portfolio registration is automatic.
   - Recommendation: Make issue creation automatic (like memory), but PR creation confirmable (like build confirmation). Issues are low-risk (can be closed). PRs push code and are higher-risk.

4. **How should the STATE.md GitHub section handle multiple phases worth of data?**
   - What we know: STATE.md is already growing with each phase's results.
   - Recommendation: A simple table that grows — one row per phase. Archived milestones' rows can be cleaned up during milestone archiving.

---

## Sources

### Primary (HIGH confidence)

- System: `gh --version` — confirmed v2.81.0 installed
- System: `gh auth status` — confirmed authentication with repo, workflow scopes
- System: `git remote -v` — confirmed NO remote exists on this project (important design input)
- Project source: `.claude/skills/agency/workflow-common.md` — state paths, conventions, degradation patterns
- Project source: `.claude/skills/agency/execution-tracker.md` — commit conventions, progress tracking, state update flow
- Project source: `.claude/skills/agency/memory-manager.md` — graceful degradation pattern (model for GitHub degradation)
- Project source: `.claude/commands/agency/plan.md` — planning workflow steps (issue creation insertion point)
- Project source: `.claude/commands/agency/build.md` — execution workflow steps (PR creation insertion point)
- Project source: `.claude/commands/agency/status.md` — dashboard display (GitHub section insertion point)
- Project source: `.claude/commands/agency/review.md` — review lifecycle (issue close insertion point)

### Secondary (MEDIUM confidence)

- Project source: `.planning/REQUIREMENTS.md` — GH-01, GH-02, GH-03 requirement descriptions
- Project source: `.planning/ROADMAP.md` — Phase 11 success criteria and milestone structure

### Tertiary (LOW confidence)

- None — all findings based on direct system verification and project source reading.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all conventions derived from existing project patterns
- Architecture: HIGH — follows established skill-per-capability pattern from 10 prior phases
- gh CLI commands: HIGH — verified against installed version and authenticated session
- Graceful degradation: HIGH — identical pattern to Memory Conventions from Phase 9

**Research date:** 2026-03-01
**Valid until:** Stable — based on project source and installed tooling. Valid as long as gh CLI v2.x API doesn't break.
