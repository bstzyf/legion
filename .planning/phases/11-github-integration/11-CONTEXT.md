# Phase 11: GitHub Integration — Context

## Phase Goal

Project work connects to GitHub — phases link to issues, agents can create PRs, and progress syncs to GitHub milestones.

## Requirements

| ID | Description |
|----|-------------|
| GH-01 | GitHub issue tracking — link phases/tasks to GitHub issues |
| GH-02 | PR creation — agents can create PRs for their work |
| GH-03 | GitHub status sync — reflect project progress in GitHub (issues, milestones) |

## Success Criteria

- Phases/tasks can be linked to GitHub issues
- Agents create PRs for completed work (via `gh` CLI)
- Project progress reflected in GitHub issues and milestones

## What Already Exists

### Skills (10 total)
- `workflow-common.md` — shared paths, conventions, degradation patterns (Memory, Portfolio, Milestone sections)
- `agent-registry.md` — 51 built-in + custom agent catalog with recommendation algorithm
- `phase-decomposer.md` — phase analysis, plan generation, agent recommendation engine
- `wave-executor.md` — parallel execution engine with personality injection
- `execution-tracker.md` — progress tracking, STATE.md updates, atomic commits, commit conventions
- `review-loop.md` — dev-QA loop with structured feedback and escalation
- `questioning-flow.md` — adaptive conversation engine
- `memory-manager.md` — cross-session outcome recording with graceful degradation
- `portfolio-manager.md` — multi-project registry and state aggregation
- `milestone-tracker.md` — milestone lifecycle, completion, archiving
- `agent-creator.md` — guided agent creation with schema validation

### Commands (9 total)
- `start.md` — project initialization
- `plan.md` — phase planning (10 steps)
- `build.md` — parallel execution (6 steps)
- `review.md` — quality gates
- `status.md` — progress dashboard (6 steps)
- `quick.md` — ad-hoc task execution
- `portfolio.md` — multi-project dashboard
- `milestone.md` — milestone management
- `agent.md` — custom agent creation

### State Files
- `.planning/STATE.md` — current position, phase results, recent decisions, next action
- `.planning/ROADMAP.md` — phase breakdown, progress table, milestones
- `.planning/memory/OUTCOMES.md` — agent performance records (optional)

### Tools Available
- `gh` CLI v2.81.0 — authenticated to GitHub (repo, workflow scopes)
- `git` — local repo exists, NO remote configured currently

## Decisions

1. **One issue per phase** — phases are the meaningful tracking unit, not plans. Keeps GitHub issues manageable.
2. **One PR per phase** — aggregates all plan work into one reviewable unit.
3. **Opt-in via remote detection** — all GitHub operations check for a remote first. No remote = skip silently. Identical to Memory degradation pattern.
4. **Issue creation automatic, PR creation confirmable** — issues are low-risk (can be closed). PRs push code (higher-risk, needs confirmation).
5. **STATE.md stores GitHub metadata** — centralized GitHub table in STATE.md, not scattered across plan frontmatters.
6. **No new command** — GitHub integration embedded in existing workflows (plan, build, status, review).
7. **"agency" label** — auto-created on first issue creation to tag all Agency-generated issues.
8. **Live status queries** — `/agency:status` fetches live GitHub status rather than relying on potentially stale STATE.md values.
9. **Branch management** — offer to create `agency/phase-{NN}-{slug}` branch for PR if user is on default branch.

## Plan Structure

| Plan | Wave | Focus | Requirements |
|------|------|-------|-------------|
| 11-01 | 1 | github-sync skill + workflow-common update | GH-01, GH-02, GH-03 |
| 11-02 | 2 | Command integrations (plan, build, status, review, execution-tracker) + housekeeping | GH-01, GH-02, GH-03 |
