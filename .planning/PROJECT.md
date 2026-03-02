# The Agency Workflows

## What This Is

A Claude Code plugin that adds workflow orchestration to The Agency's 51 AI specialist personalities. The agents already have deep expertise and distinct voices — this project gives them a coordination layer so they can work together as actual teams on real projects.

## Core Value

Turn a collection of 51 isolated agent personalities into a functional AI agency. Users type `/agency:start`, describe what they want, and the system assembles the right team, plans the work, executes in parallel, and runs quality checks — with each agent operating in full character.

## Who It's For

- Developers, designers, marketers, and project managers using Claude Code
- Projects spanning any of the 9 Agency divisions (engineering, design, marketing, product, PM, testing, support, spatial, specialized)
- Both code and non-code work (marketing campaigns, design systems, content strategies, not just software)

## Current State

**v1.0 shipped** (2026-03-01) — 9 commands, 15 skills, 51 agents, 54 requirements delivered across 14 phases.

All core workflows operational: project initialization, phase planning with agent recommendation, parallel execution via Teams, quality review with domain-specific review lenses, portfolio management, milestone tracking, cross-session memory, custom agent creation, GitHub integration, brownfield codebase analysis, marketing campaign workflows, and design system workflows.

See [v1.0 archived requirements](milestones/v1.0-REQUIREMENTS.md) for full details.

## Current Milestone: v2.0 Proper Plugin

**Goal:** Convert Agency from a standalone `.claude/` directory config into a proper Claude Code plugin — installable via `claude plugin add`, distributable via marketplace, with correct plugin structure.

**Target features:**
- Plugin manifest (`.claude-plugin/plugin.json`) with full metadata
- Restructured directory layout: `commands/`, `skills/`, `agents/` at plugin root
- 51 agent files migrated to plugin `agents/` format
- 15 skills converted to `skills/{name}/SKILL.md` format
- 9 commands moved to plugin `commands/` directory
- All internal cross-references updated for new paths
- Installable via `claude plugin add github:user/repo` and `--plugin-dir`
- README and marketplace entry for distribution

## Out of Scope

- Custom CLI tooling (like GSD's gsd-tools.cjs) — keep it pure markdown/skills
- Board of directors / governance model (Conductor-style) — too heavy
- MCP server requirements — user brings their own
- Jira / Linear / other issue trackers — GitHub only for now

## Constraints

- **No custom tooling**: Pure Claude Code primitives (skills, commands, agents, Tasks, Teams)
- **Human-readable state**: All planning files are markdown, readable without tools
- **Personality-first**: Agent .md files are the source of truth for agent behavior
- **Balanced cost**: Opus for planning, Sonnet for execution, Haiku for lightweight checks
- **Max 3 tasks per plan**: Keeps plans focused and reviewable (borrowed from Shipyard)
- **Fresh context per agent**: Each spawned agent gets its own context window

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Namespace under /agency: | Avoids collision with GSD, Shipyard, Conductor commands | Confirmed |
| Full personality injection | The personalities ARE the product — must be preserved | Confirmed |
| Minimal .planning/ state | Users want human-readable files, not complex state machines | Confirmed |
| Cherry-pick patterns from 4 repos | GSD questioning + Shipyard waves + Conductor evaluate-loop + Best Practice config | Confirmed |
| Cross-division support | 51 agents span 9 divisions — workflows must handle all, not just engineering | Confirmed |
| Hybrid agent selection | Workflow recommends based on task analysis, user confirms/overrides | Confirmed |

## Architecture Influences

| Source | What We're Taking | What We're Leaving |
|--------|-------------------|-------------------|
| **GSD** | Questioning flow, orchestrator/subagent split, phase planning, state management pattern | CLI tooling, 33+ workflows, complex config, milestone system |
| **Conductor** | Evaluate-loop (build→review→fix), quality gates, parallel dispatch | Board governance, message bus, 50+ iteration limits, metadata.json |
| **Shipyard** | Wave-based execution, max 3 tasks/plan, atomic commits, agent role boundaries | 29 commands, checkpoint/rollback system, hook complexity |
| **Best Practice** | Skills/commands/agents structure, agent frontmatter, permission patterns | RPI workflow (too specific), custom hooks infrastructure |

| Convert to Claude Code plugin format | Plugin system is mature, enables distribution and updates | — Pending |

---
*Last updated: 2026-03-01 — v2.0 milestone started*
