# Phase 15: Plugin Scaffold — Context

## Phase Goal
The plugin has a valid manifest and settings file that Claude Code can read, establishing the root-level directory structure all other phases populate.

## Requirements Covered
- PLUG-01: Plugin has `.claude-plugin/plugin.json` manifest with name, version, description, author, keywords, repository
- PLUG-05: Plugin has `settings.json` with default configuration when enabled

## What Already Exists

### Current Project Structure
- `.claude/commands/agency/` — 9 command entry points (start, plan, build, review, status, quick, portfolio, milestone, agent)
- `.claude/skills/agency/` — 15 reusable workflow skills
- `agency-agents/` — 51 agent personality `.md` files organized into 9 divisions
- `.planning/` — Project state (PROJECT.md, ROADMAP.md, STATE.md, REQUIREMENTS.md, config.json)
- `CLAUDE.md` — Project-level instructions
- `README.md` — Documentation

### What Does NOT Exist Yet
- `.claude-plugin/` directory — no plugin manifest
- `settings.json` — no plugin settings
- `commands/` at root — commands currently live at `.claude/commands/agency/`
- `skills/` at root — skills currently live at `.claude/skills/agency/`
- `agents/` at root — agents currently live at `agency-agents/{division}/`

## Key Design Decisions

- **Plugin name**: `agency-workflows` — kebab-case, descriptive, used as skill namespace prefix (`/agency-workflows:skill-name`)
- **Version**: `2.0.0` — this is the v2.0 milestone, starting fresh with plugin format
- **Empty directories only**: Phase 15 creates the scaffold; Phases 16-18 populate with migrated files
- **settings.json is minimal**: Agency is a multi-agent orchestration system, not a single-agent tool. The `agent` key (the only supported settings key) doesn't apply. Settings file exists as `{}` to satisfy PLUG-05 and serve as the future config anchor.
- **No marketplace.json yet**: Phase 20 (Distribution) handles marketplace artifacts
- **plugin.json in `.claude-plugin/`**: Standard location per Claude Code plugin docs. The directory holds ONLY this file.

## Corrections to Roadmap Assumptions

1. **`claude plugin add --plugin-dir .`** is not a valid command. The correct test is `claude --plugin-dir .` (passes plugin directory as a CLI flag, not a plugin subcommand).
2. **`settings.json` only supports the `agent` key** currently. Unknown keys are silently ignored. For Agency, the file should be `{}` since we don't want to activate a single agent as the main thread.

## Plan Structure
- **Plan 15-01 (Wave 1)**: Create plugin manifest, settings, and directory structure — all three are independent tasks with no external dependencies
