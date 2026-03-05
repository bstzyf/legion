# Changelog

All notable changes to the Legion plugin are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.2] - 2026-03-04

### Fixed
- **Critical**: Fixed `plugin_discovery_glob` in all 9 adapters — agent auto-discovery was broken on every runtime.
- **Critical**: Removed circular self-dependency in `package.json`.
- **Critical**: Removed dead file path references in 3 agent personalities (`design-ux-architect`, `testing-evidence-collector`, `testing-reality-checker`).
- **Critical**: Removed orphan `</output>` XML tags from all 11 command files.
- **Critical**: Fixed `settings.schema.json` to allow `$schema` property.
- Fixed corrupted markdown headings in `engineering-mobile-app-builder`, `engineering-rapid-prototyper`, and `marketing-app-store-optimizer` (4 headings with encoding artifacts).
- Fixed `agent.md` git add target (`SKILL.md` → `CATALOG.md`) and removed dead `workflow-common.md` reference.
- Fixed hard-coded review cycle limit in `review.md` — now reads `{max_cycles}` from settings.
- Fixed hard-coded project name in `review.md` completion message.
- Fixed `portfolio.md` casing inconsistency (`PORTFOLIO.md` → `{adapter.global_config_dir}/portfolio.md`).
- Made `github-sync` conditional in `milestone.md` (only loads when `gh` is authenticated).
- Added `design-workflows` conditional load to `plan.md` for DSN-* requirements.
- Fixed `Step 4.5` → `Step 6` references in `phase-decomposer` and `review-panel` skills.
- Fixed `agent-creator` validation threshold (50 → 80 lines) and Section 4 heading format.
- Fixed `workflow-common-core` skill mapping for `/legion:start` (added `portfolio-manager`, moved `codebase-mapper` to always-loads).
- Fixed `review-loop` escalation trigger to include WARNINGs alongside BLOCKERs.
- Fixed `wave-executor` agent extraction to use frontmatter only (removed body-search fallback).
- Removed duplicated command-to-skill mapping table from `workflow-common` shim.
- Fixed Engineering division count (`7` → `8` agents) in `portfolio-manager`.
- Fixed recommendation engine agent eviction to replace lowest-ranked (last) instead of highest-ranked (first).
- Added 10-second timeout to `fetchNpmLatest` in installer to prevent hanging on unresponsive registry.
- Updated agent count from 51 to 52 across project state files.

## [3.0.1] - 2026-03-04

### Changed
- Synced package versioning with CHANGELOG and added release consistency checks.
- Added runtime support tiers and clearer installer/runtime diagnostics.
- Updated README metrics and support disclosures to match the repository state.
- Promoted minimum agent size enforcement to a hard validation failure (80-line floor).

### Added
- Installer integrity verification with `--verify` using `checksums.sha256`.
- New release guardrails (`scripts/release-check.js`) for docs/version/skill-map consistency.
- Default `settings.json` configuration and JSON schema.
- Baseline CI and smoke tests for installer workflows.
## [3.0.0] - 2026-03-02

### Changed
- **Project identity**: Rebranded from "The Agency Workflows" to "Legion" — *"My name is Legion, for we are many."*
- All 10 commands renamed from `/agency:*` to `/legion:*` namespace
- Plugin name changed from `agency-workflows` to `legion` — install via `claude plugin install legion`
- Plugin version bumped to 3.0.0 across plugin.json and marketplace.json
- All 17 skill files updated with `/legion:` command references
- workflow-common shared constants updated to Legion namespace
- README.md, CLAUDE.md, CONTRIBUTING.md rewritten with Legion branding
- Commit message prefixes updated from `feat(agency):` to `feat(legion):`

### Added
- Shoulders of Giants attribution entry crediting msitarzewski/agency-agents as origin of the 51 agent personalities

### Unchanged
- 51 agent personality files (contain zero "agency" references — no changes needed)
- All features, workflows, and capabilities remain identical

### Repository
- GitHub repository renamed from `9thLevelSoftware/agency-agents` to `9thLevelSoftware/legion`

## [2.0.0] - 2026-03-02

### Changed
- Converted from `.claude/` directory config to proper Claude Code plugin format
- Moved 9 commands from `.claude/commands/agency/` to `commands/` at plugin root
- Converted 15 skills to `skills/{name}/SKILL.md` directory structure with co-located templates
- Migrated 51 agent files from `agency-agents/{division}/` to flat `agents/` directory
- Updated all internal path references to plugin-relative format
- Agent frontmatter now includes `name`, `description`, and `division` fields

### Added
- `/agency:advise` command — read-only expert consultation (10 commands total)
- `skills/review-panel/SKILL.md` — dynamic multi-reviewer composition with domain-weighted rubrics
- `skills/plan-critique/SKILL.md` — pre-mortem analysis and assumption hunting
- Optional plan critique step in `/agency:plan` workflow (step 8.5)
- Dynamic review panel mode in `/agency:review`
- `.claude-plugin/plugin.json` — plugin manifest for Claude Code recognition
- `.claude-plugin/marketplace.json` — marketplace entry for `claude plugin marketplace add`
- `settings.json` — plugin settings file (empty — multi-agent system, not single-agent)
- Agent registry updated with plugin-relative paths for all 51 agents
- Installation via `claude plugin marketplace add 9thLevelSoftware/agency-agents` + `claude plugin install agency-workflows@agency-workflows`
- Local development testing via `claude --plugin-dir .`

### Removed
- `.claude/commands/agency/` directory (commands migrated to `commands/`)
- `.claude/skills/agency/` directory (skills migrated to `skills/`)
- `agency-agents/` directory (agents migrated to `agents/`)
- `.planning/templates/` directory (templates co-located with questioning-flow skill)

## [1.0.0] - 2026-03-01

### Added
- **9 commands**: `/agency:start`, `/agency:plan`, `/agency:build`, `/agency:review`, `/agency:status`, `/agency:quick`, `/agency:portfolio`, `/agency:milestone`, `/agency:agent`
- **15 skills** (9,196 lines): workflow-common, agent-registry, questioning-flow, phase-decomposer, wave-executor, execution-tracker, review-loop, portfolio-manager, milestone-tracker, memory-manager, agent-creator, github-sync, codebase-mapper, marketing-workflows, design-workflows
- **51 agent personalities** across 9 divisions: Engineering (7), Design (6), Marketing (8), Testing (7), Product (3), Project Management (5), Support (6), Spatial Computing (6), Specialized (3)
- Full personality injection — agents spawned with complete .md as system instructions
- Wave-based parallel execution with max 3 tasks per plan
- Hybrid agent selection — workflow recommends, user confirms
- Dev-QA review loop with max 3 cycles before escalation
- Cross-session memory with importance scoring and time-based decay
- GitHub integration (issues, PRs, milestones) — opt-in, graceful degradation
- Brownfield codebase analysis — architecture mapping before planning
- Marketing workflows — campaign planning, content calendars, channel coordination
- Design workflows — design systems, UX research, three-lens review (brand, accessibility, usability)
- Multi-project portfolio management
- Milestone tracking and archiving

