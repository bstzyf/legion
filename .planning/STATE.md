# Project State

## Project Reference

**Core Value:** Turn 51 isolated agent personalities into a functional AI legion — "My name is Legion, for we are many."

## Current Position

Milestone: v3.0 — Legion Rebrand
Phase: 24 — Foundation
Plan: —
Status: Ready to plan
Last activity: 2026-03-02 — Roadmap created, ready for Phase 24

Progress: [----------] 0% (0/5 phases complete)

## Shipped Milestones

| Milestone | Phases | Plans | Requirements | Shipped |
|-----------|--------|-------|-------------|---------|
| v1.0 | 14 | 30 | 54 | 2026-03-01 |
| v2.0 | 9 | 9 | 26 | 2026-03-02 |

## What's Deployed

- 10 commands (`/agency:start`, `plan`, `build`, `review`, `status`, `quick`, `portfolio`, `milestone`, `agent`, `advise`)
- 17 skills (agent-registry, phase-decomposer, wave-executor, review-loop, review-panel, plan-critique, + 11 more)
- 51 agents across 9 divisions
- Plugin manifest at `.claude-plugin/plugin.json`
- Distribution: marketplace.json, README, CHANGELOG, CONTRIBUTING

## v3.0 Phase Map

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 24 — Foundation | `/legion:` namespace in workflow-common constants | SKL-01 | Not started |
| 25 — Commands | All 10 commands renamed to `/legion:` | CMD-01, CMD-02, CMD-03 | Not started |
| 26 — Skills | Remaining 16 skill files updated | SKL-02, SKL-03 | Not started |
| 27 — Plugin Manifest | plugin.json + marketplace.json to Legion identity | PLG-01, PLG-02 | Not started |
| 28 — Documentation | README, CLAUDE.md, CONTRIBUTING, CHANGELOG, attribution | DOC-01, DOC-02, DOC-03, DOC-04, ATR-01 | Not started |

## Session Continuity

### Key Decisions (carried forward)

- Full personality injection for all agent spawns
- /legion: namespace for all commands (v3.0 rebrand from /agency:)
- Plugin name: legion (renamed from agency-workflows)
- Minimal state: PROJECT.md + ROADMAP.md + STATE.md
- Balanced cost: Opus planning, Sonnet execution
- Hybrid agent selection: recommend → confirm
- Wave-based execution with max 3 tasks per plan
- Plugin-relative paths: `commands/`, `skills/`, `agents/` at root
- Three-layer read-only for advisory: allowed-tools + Explore subagent + prompt
- Dynamic review panels over fixed board of directors
- Pre-mortem + assumption hunting for plan critique

### v3.0 Decisions

- workflow-common updated first — it is the shared constants layer all skills and commands read from
- Commands updated before docs — doc success criteria reference final command names
- Plugin manifest updated before docs — README install instructions depend on final plugin name
- Agent personality files excluded from rebrand — they contain zero "agency" references
- .planning/ archive files excluded — preserve history as-is
