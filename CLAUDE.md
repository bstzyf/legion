# Legion

A Claude Code plugin for orchestrating 51 AI specialist personalities as a coordinated legion.

## Available Commands

| Command | Description |
|---------|-------------|
| `/legion:start` | Initialize a new project with guided questioning flow |
| `/legion:plan <N>` | Plan phase N with agent recommendations and wave-structured tasks |
| `/legion:build` | Execute current phase plans with parallel agent teams |
| `/legion:review` | Run quality review cycle with testing/QA agents |
| `/legion:status` | Show progress dashboard and route to next action |
| `/legion:quick <task>` | Run ad-hoc task with intelligent agent selection |
| `/legion:advise` | Get read-only expert consultation from any of the 51 agent personalities |
| `/legion:portfolio` | Multi-project dashboard with dependency tracking |
| `/legion:milestone` | Milestone completion, archiving, and metrics |
| `/legion:agent` | Create a new agent personality through a guided workflow |

## Project Structure

```
commands/             — 10 /legion: command entry points
skills/               — 17 reusable workflow skills (SKILL.md per directory)
agents/               — 51 agent personality .md files (flat, with division in frontmatter)
.claude-plugin/       — Plugin manifest and marketplace entry
.planning/            — Project state (PROJECT.md, ROADMAP.md, STATE.md)
  milestones/         — Archived requirements and roadmaps
  phases/             — Phase plan and summary files
```

## Agent Divisions (51 total)

| Division | Count | Focus |
|----------|-------|-------|
| Engineering | 7 | Full-stack, backend, frontend, AI, DevOps, mobile, prototyping |
| Design | 6 | UI/UX, branding, visual storytelling, research |
| Marketing | 8 | Content, social media, growth, platform strategies |
| Testing | 7 | QA, evidence collection, performance, API testing |
| Product | 3 | Sprint planning, feedback synthesis, trends |
| Project Management | 5 | Coordination, portfolio, operations, experiments |
| Support | 6 | Analytics, finance, legal, infrastructure |
| Spatial Computing | 6 | VisionOS, XR, Metal, terminal integration |
| Specialized | 3 | Orchestration, data analytics, LSP indexing |

## Workflow

```
/legion:start → /legion:plan 1 → /legion:build → /legion:review → /legion:plan 2 → ...
```

Each phase: plan (decompose + assign agents) → build (parallel execution) → review (QA loop)

Advisory: `/legion:advise <topic>` — standalone consultation, no phase context needed

GitHub integration is opt-in — when a GitHub remote exists, `/legion:plan` creates issues, `/legion:build` creates PRs, and `/legion:status` shows GitHub status.

Brownfield support is automatic — when `/legion:start` detects an existing codebase, it offers to analyze architecture, frameworks, and risks before planning. The analysis produces `.planning/CODEBASE.md`, which `/legion:plan` injects into agent task context.

Marketing workflows activate when `/legion:plan` detects a marketing-focused phase (MKT-* requirements or marketing keywords). Campaign planning produces structured documents at `.planning/campaigns/`, with content calendars and cross-channel coordination across the 8 marketing agents.

Design workflows activate when `/legion:plan` detects a design-focused phase (DSN-* requirements or design keywords). Design system creation produces structured documents at `.planning/designs/`, with component specifications and three-lens review (brand, accessibility, usability) across the 6 design agents.

## Memory Layer (Optional)

After build/review cycles, outcomes are recorded to `.planning/memory/OUTCOMES.md`. During planning, past outcomes boost agent recommendations. During status, recent outcomes enrich the session briefing. All memory features degrade gracefully — the system works identically without them.

## Conventions

- **Personality-first**: Agent .md files are the source of truth for agent behavior
- **Full injection**: Agents are spawned with their complete personality as instructions
- **Max 3 tasks per plan**: Keeps work focused and reviewable
- **Wave execution**: Plans grouped into dependency waves; parallel within, sequential between
- **Cost profile**: Opus for planning, Sonnet for execution, Haiku for checks
- **Human-readable state**: All planning files are markdown — no binary state
- **Hybrid selection**: Workflow recommends agents, user confirms or overrides
