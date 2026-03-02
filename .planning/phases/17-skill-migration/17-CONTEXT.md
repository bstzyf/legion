# Phase 17: Skill Migration — Context

## Goal
Convert all 15 skills from `.claude/skills/agency/{name}.md` to plugin `skills/{name}/SKILL.md` directory structure with schema-compliant frontmatter and co-located supporting files.

## Requirements
- **PLUG-03**: Plugin has `skills/` directory at root with 15 skills in `{name}/SKILL.md` format
- **SKILL-01**: All 15 skills converted to `skills/{name}/SKILL.md` directory structure
- **SKILL-02**: Skill frontmatter includes `name` and `description` matching Claude Code skill schema
- **SKILL-03**: Templates and reference files moved alongside their SKILL.md as supporting files

## Current State

### 15 Skills in `.claude/skills/agency/`

| Filename | Frontmatter Name | Description |
|----------|-----------------|-------------|
| agent-creator.md | agency:agent-creator | Guided agent personality creation with schema validation and registry integration |
| agent-registry.md | agency:agent-registry | Maps all 51 Agency agents by division, capability, and task type for intelligent team assembly |
| codebase-mapper.md | agency:codebase-mapper | Brownfield codebase analysis — file mapping, framework detection, risk assessment |
| design-workflows.md | agency:design-workflows | Design system creation, UX research workflows, and three-lens design review cycles |
| execution-tracker.md | agency:execution-tracker | Tracks execution progress with STATE.md updates, ROADMAP.md progress, and atomic git commits |
| github-sync.md | agency:github-sync | GitHub integration — issue tracking, PR creation, milestone sync |
| marketing-workflows.md | agency:marketing-workflows | Marketing campaign planning — campaign documents, content calendars |
| memory-manager.md | agency:memory-manager | Cross-session memory — outcome tracking, pattern recall with decay |
| milestone-tracker.md | agency:milestone-tracker | Milestone management — definition, completion with metrics, archiving |
| phase-decomposer.md | agency:phase-decomposer | Decomposes roadmap phases into wave-structured plans with agent recommendations |
| portfolio-manager.md | agency:portfolio-manager | Multi-project portfolio management — registry, state aggregation, dependencies |
| questioning-flow.md | agency:questioning-flow | Adaptive project initialization questioning that captures vision, requirements |
| review-loop.md | agency:review-loop | Dev-QA loop engine with structured feedback, fix routing, and user escalation |
| wave-executor.md | agency:wave-executor | Executes wave-structured plans with parallel personality-injected agents via Teams |
| workflow-common.md | agency:workflow-common | Shared workflow patterns and conventions for The Agency plugin |

### Supporting Files to Co-locate

The `.planning/templates/` directory contains 3 template files used by the questioning-flow skill:
- `project-template.md` — Schema for generating PROJECT.md
- `roadmap-template.md` — Schema for generating ROADMAP.md
- `state-template.md` — Schema for generating STATE.md

These are plugin-level assets needed for `/agency:start` to function. They must be bundled with the plugin, not left in `.planning/` (which is project-specific state).

### Target Structure

```
skills/
  agent-creator/SKILL.md
  agent-registry/SKILL.md
  codebase-mapper/SKILL.md
  design-workflows/SKILL.md
  execution-tracker/SKILL.md
  github-sync/SKILL.md
  marketing-workflows/SKILL.md
  memory-manager/SKILL.md
  milestone-tracker/SKILL.md
  phase-decomposer/SKILL.md
  portfolio-manager/SKILL.md
  questioning-flow/
    SKILL.md
    templates/
      project-template.md
      roadmap-template.md
      state-template.md
  review-loop/SKILL.md
  wave-executor/SKILL.md
  workflow-common/SKILL.md
```

### Frontmatter Mapping

Current skills already have `name` and `description` fields. The `name` field uses `agency:{skill-name}` format which serves as the slash command name. No frontmatter changes needed — existing format already matches the Claude Code skill schema.

### Dependencies

- Phase 15 (Plugin Scaffold) — complete. `skills/` directory exists with `.gitkeep`
- Phase 16 (Agent Migration) — complete. `agents/` directory populated
- Phase 18 (Command Migration) — depends on this phase completing. Commands will need paths updated to reference `skills/{name}/SKILL.md`

## Decisions

- **Template co-location**: Move `.planning/templates/` to `skills/questioning-flow/templates/` and update the path reference in `workflow-common` from `.planning/templates/` to `skills/questioning-flow/templates/`
- **Frontmatter preservation**: Keep existing `name: agency:{skill-name}` format — it's the slash command identifier
- **No content changes**: Skill body content migrates verbatim. Path updates are Phase 18's job
- **Remove .gitkeep**: Delete `skills/.gitkeep` once directories are populated
