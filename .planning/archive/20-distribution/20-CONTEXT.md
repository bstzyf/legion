# Phase 20: Distribution — Context

## Phase Goal

The plugin has all artifacts needed for installation via `claude plugin marketplace add dasbl/agency-agents` followed by `claude plugin install agency-workflows@agency-workflows`, discovery via a marketplace entry, and local development testing via `--plugin-dir`.

## Requirements Covered

- **DIST-01**: `marketplace.json` entry for GitHub-based installation
- **DIST-02**: README.md with installation instructions, prerequisites, and getting started guide
- **DIST-03**: CHANGELOG.md with v1.0 and v2.0 version history
- **DIST-04**: Development docs for testing with `--plugin-dir`

## Success Criteria

1. `.claude-plugin/marketplace.json` exists with the correct entry format for GitHub-based marketplace discovery
2. `README.md` contains installation instructions (both `plugin marketplace add` + `plugin install` and `--plugin-dir`), prerequisites, and a getting started guide covering the core workflow
3. `CHANGELOG.md` documents v1.0 accomplishments and v2.0 changes in a standard format
4. A developer doc (e.g., `CONTRIBUTING.md`) explains how to test changes locally with `--plugin-dir`

## Existing Assets

### Already Correct
- `.claude-plugin/plugin.json` — valid manifest with name, version, description, author, keywords, repository
- `settings.json` — valid empty object `{}`
- `commands/` — 9 command `.md` files (start, plan, build, review, status, quick, portfolio, milestone, agent)
- `skills/` — 15 skills in `{name}/SKILL.md` format with co-located templates
- `agents/` — 51 agent `.md` files with valid frontmatter (name, description, division)
- `CLAUDE.md` — up-to-date project instructions referencing plugin structure

### Needs Attention

- `README.md` — **exists but is outdated**. References old v1.0 directory structure (`.claude/commands/agency/`, `agency-agents/{division}/`, `.planning/templates/`). Quick Start says "Copy this repository" instead of plugin installation. Architecture diagram shows old layout. Contributing link points to `agency-agents/CONTRIBUTING.md` (no longer exists).
- `marketplace.json` — does not exist yet. Required at `.claude-plugin/marketplace.json` for `claude plugin marketplace add dasbl/agency-agents` to discover the plugin.
- `CHANGELOG.md` — does not exist. v1.0 shipped 2026-03-01 (14 phases, 30 plans, 54 requirements). v2.0 is in progress (9 phases, 26 requirements, 5/9 phases complete so far).
- No developer testing documentation exists.

## Research: marketplace.json Format

From the official Anthropic plugin repositories (`anthropics/claude-plugins-official`, `anthropics/claude-code`):

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "marketplace-name",
  "description": "...",
  "owner": {
    "name": "Owner Name",
    "email": "optional@email.com"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "description": "...",
      "version": "1.0.0",
      "author": { "name": "Author" },
      "source": ".",
      "category": "development"
    }
  ]
}
```

**Key facts:**
- `marketplace.json` goes in `.claude-plugin/` alongside `plugin.json`
- For a single-plugin repo, `source: "."` points to the repo root
- Categories: `development`, `productivity`, `security`, `testing`, `design`, `deployment`, `monitoring`, `learning`
- Optional fields: `homepage`, `tags`, `strict`
- Installation is two-step: `claude plugin marketplace add user/repo` adds the marketplace, then `claude plugin install plugin-name@marketplace-name` installs the plugin
- Inside the TUI: `/plugin marketplace add user/repo` then `/plugin install plugin-name@marketplace-name`
- `claude plugin validate .` validates a plugin or marketplace directory
- Local testing: `claude --plugin-dir ./path-to-plugin`
- Skills are accessed as `/plugin-name:skill-name` after installation

## Key Decisions

- **marketplace.json category**: `productivity` — Agency is a workflow orchestration tool, not a development tool per se. Closest match from available categories.
- **README rewrite vs. update**: Full rewrite. The existing README has 211 lines but most reference outdated paths. The "Standing on Shoulders" section (lines 44-129) is valuable content worth preserving. The architecture, quick start, and contributing sections need complete replacement.
- **CHANGELOG format**: Keep Changes format with `## [version]` headers. Document v1.0 as initial release, v2.0 as plugin conversion.
- **Dev testing doc location**: `CONTRIBUTING.md` at project root (not `docs/dev-testing.md`) — standard location, referenced from README. Combines plugin development testing with contribution guidelines.

## Plan Structure

- **Plan 20-01** (Wave 1, 3 tasks): Create marketplace.json, rewrite README.md, create CHANGELOG.md + CONTRIBUTING.md
