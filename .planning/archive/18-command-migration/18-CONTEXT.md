# Phase 18: Command Migration and Path Updates — Context

## Goal

All 9 commands live in the plugin `commands/` directory and every `@` reference, cross-skill link, and agent path inside commands and skills points to the new plugin-relative locations.

## Dependencies

- Phase 15 (Plugin Scaffold) — Complete. Created `commands/` directory with `.gitkeep`
- Phase 16 (Agent Migration) — Complete. All 51 agents at `agents/{agent-id}.md`
- Phase 17 (Skill Migration) — Complete. All 15 skills at `skills/{name}/SKILL.md`

## Requirements

- **PLUG-02**: Plugin has `commands/` directory at root with all 9 command `.md` files
- **PATH-01**: All `@` execution_context references updated to plugin-relative paths
- **PATH-02**: All cross-skill and cross-command references updated for new structure
- **PATH-03**: Agent personality file paths in wave-executor and registry updated

## Current State

### Commands (9 files at `.claude/commands/agency/`)

| Command | Skill References | Agent Refs | Template Refs |
|---------|-----------------|------------|---------------|
| `agent.md` | 3 (workflow-common, agent-registry, agent-creator) | 5 | 0 |
| `build.md` | 6 (workflow-common, agent-registry, wave-executor, execution-tracker, memory-manager, github-sync) | 1 | 0 |
| `plan.md` | 8 (workflow-common, agent-registry, phase-decomposer, memory-manager, github-sync, codebase-mapper, marketing-workflows, design-workflows) | 0 | 0 |
| `review.md` | 7 (workflow-common, agent-registry, review-loop, execution-tracker, memory-manager, github-sync, design-workflows) | 1 | 0 |
| `status.md` | 5 (workflow-common, execution-tracker, milestone-tracker, memory-manager, github-sync) | 0 | 0 |
| `milestone.md` | 4 (workflow-common, milestone-tracker, execution-tracker, github-sync) | 0 | 0 |
| `portfolio.md` | 3 (workflow-common, portfolio-manager, agent-registry) | 1 | 0 |
| `quick.md` | 2 (workflow-common, agent-registry) | 0 | 0 |
| `start.md` | 5 (workflow-common, agent-registry, questioning-flow, portfolio-manager, codebase-mapper) | 0 | 7 |

**Total command references to update:** 48 skill paths + 8 agent paths + 7 template paths = 63 references

### Skills with old agent paths (6 files)

| Skill File | Old Agent Path Count |
|-----------|---------------------|
| `skills/agent-registry/SKILL.md` | 51 (entire catalog) |
| `skills/review-loop/SKILL.md` | 20 |
| `skills/wave-executor/SKILL.md` | 9 |
| `skills/agent-creator/SKILL.md` | 15 |
| `skills/workflow-common/SKILL.md` | 4 |
| `skills/codebase-mapper/SKILL.md` | 2 |

**Total skill references to update:** 101 agent path references

### Cleanup deferred from Phase 17

- `.planning/templates/` — 3 template files already copied to `skills/questioning-flow/templates/` in Phase 17, but old location left intact because `.claude/commands/agency/start.md` still referenced it. After command migration, the old location can be removed.

## Path Transformation Rules

| Pattern | Old Path | New Path |
|---------|----------|----------|
| Skill `@` references | `@./.claude/skills/agency/{name}.md` | `skills/{name}/SKILL.md` |
| Agent file paths | `agency-agents/{division}/{agent-id}.md` | `agents/{agent-id}.md` |
| Template `@` references | `@.planning/templates/{file}` | `skills/questioning-flow/templates/{file}` |
| Template body references | `.planning/templates/` | `skills/questioning-flow/templates/` |
| Skill references in text | `.claude/skills/agency/{name}.md` | `skills/{name}/SKILL.md` |
| Command references in text | `.claude/commands/agency/{name}.md` | `commands/{name}.md` |

## Key Decisions

- Commands drop the `agency/` subdirectory — `commands/start.md` not `commands/agency/start.md` — plugin manifest handles namespacing
- `.planning/templates/` is removed after migration since templates are co-located at `skills/questioning-flow/templates/`
- `.planning/` state files (PROJECT.md, ROADMAP.md, STATE.md, REQUIREMENTS.md) are NOT plugin assets — their `@` references remain unchanged
- The `~/.claude/agency/portfolio.md` global registry path is NOT changed — it's a user-level file, not a plugin file
