# Phase 12: Brownfield Support - Research

**Researched:** 2026-03-01
**Domain:** Static codebase analysis, pattern detection, technical debt assessment — implemented as a Claude Code skill using built-in Read/Bash/Glob/Grep tools
**Confidence:** HIGH

---

## Summary

Phase 12 adds brownfield awareness to The Agency Workflows: before planning phases on an existing codebase, the system analyzes what is already there. The deliverable is a new `codebase-mapper` skill (analogous to `github-sync`, `memory-manager`, and other skills) plus integration into the planning flow so detected patterns and risks inform agent instructions.

The implementation is entirely Claude Code primitive-based — no Node.js scripts, no external tools, no new dependencies. The mapper uses Read, Bash (find, wc, ls), Glob, and Grep to build a structured map and produces a single Markdown artifact: `.planning/CODEBASE.md`. This file is consumed by `/agency:plan` (via `phase-decomposer`) to inject codebase context into agent tasks, and checked at `/agency:start` to trigger the brownfield flow for existing codebases.

The structural model is `github-sync`: a self-contained skill with numbered sections, a prerequisite/detection step, graceful degradation, constants, and an explicit integration pattern that callers follow. The state artifact (`CODEBASE.md`) follows the same human-readable markdown convention as `OUTCOMES.md`, `STATE.md`, and all other Agency state files.

**Primary recommendation:** Build one new skill (`codebase-mapper`) and one new state file (`.planning/CODEBASE.md`), then wire it into `/agency:start` (brownfield detection branch) and `/agency:plan` (context injection).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BROWN-01 | Codebase mapping — analyze existing codebase before planning phases | codebase-mapper skill Section 2 (Map Generation): file tree, entry points, language distribution, module structure |
| BROWN-02 | Dependency detection — identify existing patterns, frameworks, conventions | codebase-mapper skill Section 3 (Pattern Detection): framework fingerprinting via file presence + content grep, package.json/Gemfile/pyproject.toml analysis, convention detection |
| BROWN-03 | Risk assessment — flag areas of complexity or technical debt before agent work | codebase-mapper skill Section 4 (Risk Assessment): complexity scoring, debt indicators, hotspot identification |
</phase_requirements>

---

## Standard Stack

### Core (all already available as Claude Code primitives)

| Tool | Purpose | Why Standard |
|------|---------|--------------|
| Glob | File discovery, extension counting, structure enumeration | Already used throughout all Agency skills |
| Grep | Pattern detection in source files (framework markers, import patterns) | Already used throughout all Agency skills |
| Bash | wc -l (file size), ls (directory inventory), find (depth-limited traversal) | Already used throughout all Agency skills |
| Read | Reading config files (package.json, requirements.txt, Gemfile, etc.) | Already used throughout all Agency skills |
| Write | Producing `.planning/CODEBASE.md` | Already used throughout all Agency skills |

### No New Dependencies

This phase requires zero new npm packages, external tools, or MCP servers. The analysis is performed by Claude reading and reasoning over files — the same approach used in all prior phases.

### State File Added

| File | Path | Purpose | Lifecycle |
|------|------|---------|-----------|
| CODEBASE.md | `.planning/CODEBASE.md` | Structured map of existing architecture, patterns, and risks | Created on first brownfield analysis; updated on re-analysis; absent for greenfield projects |

---

## Architecture Patterns

### Recommended File Layout (Phase 12 deliverables)

```
.claude/skills/agency/
  codebase-mapper.md          — NEW: brownfield analysis engine (Sections 1-6)

.claude/commands/agency/
  start.md                    — UPDATED: brownfield detection branch in pre-flight
  plan.md                     — UPDATED: inject CODEBASE.md into phase context

.planning/
  CODEBASE.md                 — PRODUCED AT RUNTIME: the structured codebase map

.claude/skills/agency/
  workflow-common.md          — UPDATED: Brownfield Conventions section + CODEBASE.md path

.planning/REQUIREMENTS.md     — UPDATED: BROWN-01/02/03 checked
.CLAUDE.md                    — UPDATED: brownfield support documented
```

**Total deliverables:** 2 files created (skill + CODEBASE.md template/example), 4 files updated.

### Pattern 1: Codebase Mapper Skill Structure (mirrors github-sync)

```
## Section 1: Principles & Detection
  - When to run (existing codebase present, user opts in)
  - Graceful degradation (absent = greenfield, proceed normally)
  - Output path constant: CODEBASE_MAP_PATH = '.planning/CODEBASE.md'

## Section 2: Map Generation (BROWN-01)
  - File tree summary (depth-limited, ignore noise)
  - Language distribution (file extension counts)
  - Entry points detection
  - Module/package boundary detection
  - Directory structure narrative

## Section 3: Pattern Detection (BROWN-02)
  - Framework fingerprinting (file presence + grep heuristics)
  - Dependency manifest reading (package.json, Gemfile, pyproject.toml, etc.)
  - Convention detection (naming patterns, test file locations, config patterns)
  - Architecture style inference (MVC, flat, domain-driven, etc.)

## Section 4: Risk Assessment (BROWN-03)
  - Complexity indicators (file size, function density, nesting)
  - Technical debt markers (TODO/FIXME counts, commented-out code)
  - Hotspot detection (files modified most — via git log if available)
  - Dependency risk (outdated manifests, missing lockfiles)
  - Conflict zones (areas agents should avoid or approach carefully)

## Section 5: CODEBASE.md Format
  - Full format spec for the output artifact
  - Structured markdown sections the planner can reference

## Section 6: Integration Patterns
  - How /agency:start calls this skill (brownfield branch)
  - How /agency:plan injects CODEBASE.md context into agent tasks
  - Graceful degradation rule (identical to Memory Conventions)
```

### Pattern 2: CODEBASE.md Format

The output artifact follows the same human-readable markdown convention as all other Agency state files.

```markdown
# Codebase Map

**Analyzed:** {YYYY-MM-DD}
**Root:** {absolute_path}
**Confidence:** HIGH | MEDIUM | LOW

## Architecture Overview
{2-3 paragraph narrative summary}

## Language Distribution
| Extension | File Count | % of Codebase |
|-----------|-----------|---------------|
| .ts       | 47        | 38%           |
| .md       | 23        | 19%           |
| ...       | ...       | ...           |

## Detected Stack
| Layer       | Technology | Evidence |
|-------------|-----------|----------|
| Runtime     | Node.js   | package.json present |
| Framework   | None      | No express/fastify/next detected |
| Language    | TypeScript | tsconfig.json, .ts files |
| Test        | None detected | No jest.config, vitest.config, etc. |

## Conventions Detected
- **File naming**: kebab-case for files, PascalCase for classes
- **Module structure**: flat skill files, no subdirectories within skill categories
- **Config location**: .claude/ for plugin config, .planning/ for state
- **No detected test suite** — agents should not assume test infrastructure exists

## Entry Points
| Type    | Path |
|---------|------|
| Plugin  | .claude/commands/agency/ |
| Skills  | .claude/skills/agency/ |
| Agents  | agency-agents/{division}/ |

## Risk Areas
| Area | Risk Level | Why | Recommendation |
|------|-----------|-----|----------------|
| workflow-common.md | HIGH | Every skill references it; changes break all workflows | Edit carefully; update all referencing skills in same plan |
| agent-registry.md  | MEDIUM | Custom agents section must stay valid Markdown table | Use Edit not Write; validate table syntax after changes |
| ROADMAP.md | MEDIUM | Phase progress table drives all status logic | Never reorder phases; only update completed counts |

## Technical Debt Signals
- TODO count: {N} across {M} files
- FIXME count: {N} across {M} files
- Large files (>300 lines): {list}
- Commented-out code blocks: {N} instances

## Agent Guidance
{Distilled advice for agents working on this codebase}
- Preferred: {patterns agents should follow}
- Avoid: {patterns agents should not introduce}
- Touch with care: {specific files or areas}
```

### Pattern 3: /agency:start Brownfield Branch

Brownfield detection triggers after the pre-flight check, before the questioning flow.

```
After existing .planning/ check (Step 1), add:

BROWNFIELD DETECTION (new sub-step 1b):
  Check for non-Agency files in current directory:
  - Any source files outside .planning/ and .claude/?
  - Any package.json, Gemfile, pyproject.toml, Makefile at root?
  - Any src/, app/, lib/, components/ directories?

  If existing source detected:
    Use AskUserQuestion:
      "I see an existing codebase. Should I map it before we plan?"
      Option 1: "Yes, analyze the codebase first" — run codebase-mapper, then proceed to questioning
      Option 2: "No, skip the analysis" — proceed directly to questioning (greenfield mode)
      Option 3: "I'll run /agency:plan directly" — abort start, let user plan manually

  If no existing source detected:
    Skip brownfield flow entirely (pure greenfield)
```

### Pattern 4: /agency:plan Context Injection

When CODEBASE.md exists, plan.md injects it as context for the phase-decomposer.

```
In plan.md step 3 (READ PHASE DETAILS), add:

BROWNFIELD CONTEXT (optional):
  Check if .planning/CODEBASE.md exists
  If yes:
    - Read .planning/CODEBASE.md
    - Include Risk Areas and Agent Guidance sections in the phase-decomposer prompt
    - When generating plan tasks, note risk areas that tasks touch
    - Add "Codebase Conventions" note to task action instructions
  If no:
    - Skip silently (greenfield project)
```

### Pattern 5: workflow-common.md Brownfield Conventions Section

Following the established convention (Memory Conventions, GitHub Conventions sections):

```markdown
## Brownfield Conventions

### Brownfield Purpose
Pre-planning codebase analysis that maps existing architecture, detects patterns and frameworks, and flags risk areas before agents begin work. All operations are opt-in and degrade gracefully.

### Brownfield Lifecycle
Absent → Analyzed (CODEBASE.md created) → Stale (>30 days old, re-analysis recommended)

### Brownfield Paths
| Artifact | Path | When Created |
|----------|------|-------------|
| Codebase map | `.planning/CODEBASE.md` | After brownfield analysis during /agency:start |

### Brownfield Integration Points
| Workflow | Operation | When |
|----------|-----------|------|
| /agency:start | Detect + analyze | After pre-flight, before questioning (if existing codebase found) |
| /agency:plan | Inject risk areas into context | During phase decomposition (if CODEBASE.md exists) |

### Graceful Degradation Rule
1. Check if .planning/CODEBASE.md exists
2. If yes: inject relevant sections into planning context
3. If no: skip silently — greenfield project, proceed normally
4. Never error, never block, never require brownfield analysis for workflow completion
```

### Anti-Patterns to Avoid

- **Do not LSP-analyze at runtime**: The lsp-index-engineer agent is designed for a specific graphd system, not for general brownfield analysis. Use file-based heuristics (file presence, grep) instead.
- **Do not block start.md**: If the user declines brownfield analysis, proceed immediately. Never make it mandatory.
- **Do not produce overly large CODEBASE.md**: The file should be a focused summary, not a full file listing. Depth-limit the tree, summarize counts rather than enumerating every file.
- **Do not make CODEBASE.md a blocker**: It is context enrichment, not a prerequisite. All workflows degrade gracefully to their pre-Phase-12 behavior when CODEBASE.md is absent.
- **Do not re-invent pattern detection with complex scripts**: Use Grep with framework-specific marker strings (e.g., grep for "express" in package.json dependencies). Keep it simple and readable.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Language detection | Custom file parser | Glob by extension + count | File extension is sufficient for Agency's needs |
| Dependency parsing | JSON/YAML parser | Read package.json + Grep for key fields | Claude can read and reason about package.json directly |
| Git history analysis | Custom git log parser | `git log --follow -p --since=90days -- {file}` via Bash | Simple Bash command returns what's needed |
| Test framework detection | Complex config scanning | Grep for jest/vitest/pytest config filenames | File presence is a reliable signal |
| Architecture classification | ML classifier | Heuristic rules based on directory names | Simple if/else on observed patterns is sufficient and auditable |

**Key insight:** The Agency is Claude Code orchestrating Claude's own reading and reasoning. The "analysis engine" IS Claude — the skill just gives it a structured protocol to follow. No external tooling is needed or appropriate given the project's no-custom-tooling constraint.

---

## Common Pitfalls

### Pitfall 1: Analysis Scope Creep
**What goes wrong:** The mapper tries to read every file in a large codebase, consuming the context window and making the command slow.
**Why it happens:** Unconstrained Glob patterns on large repos return thousands of files.
**How to avoid:** Always depth-limit (max 3 directory levels for tree), work with counts and samples rather than full enumeration. For large codebases (>500 files), analyze by category (src/, test/, config/) rather than exhaustively.
**Warning signs:** Task instructions that say "read all files in the codebase" — always replace with "sample representative files from each directory."

### Pitfall 2: False Positive Framework Detection
**What goes wrong:** The mapper reports "Rails detected" based on a Gemfile that only has unrelated gems.
**Why it happens:** File presence alone (Gemfile exists = Rails) without content verification.
**How to avoid:** Two-stage detection: file presence check THEN grep for the specific framework marker within that file. Example: Gemfile exists AND grep finds "gem 'rails'" in Gemfile = Rails detected.
**Warning signs:** Evidence column in the Detected Stack table contains only "file exists" with no content verification.

### Pitfall 3: Risk Scores Without Calibration
**What goes wrong:** The risk assessment flags everything as HIGH, making the report useless noise.
**Why it happens:** No calibration relative to project size — 50 TODOs in a 5-file project is different from 50 TODOs in a 500-file project.
**How to avoid:** Risk levels should be relative (per-file rates, not absolute counts). Calculate TODO/file ratio, not raw TODO count. Use LOW/MEDIUM/HIGH with specific thresholds documented in the skill.
**Warning signs:** Multiple HIGH risk entries that all say "TODOs found" without per-file rates.

### Pitfall 4: Stale Maps Used in Planning
**What goes wrong:** A CODEBASE.md from 3 months ago is injected into plan context for a codebase that has significantly changed.
**Why it happens:** No staleness check; the file just exists and gets used.
**How to avoid:** plan.md should check the "Analyzed" date in CODEBASE.md. If >30 days, warn the user and offer to re-analyze before planning. Do not auto-re-analyze (could be slow); present the warning and let the user decide.
**Warning signs:** The CODEBASE.md Analyzed date is significantly older than STATE.md's Last Activity date.

### Pitfall 5: Blocking the Workflow for Non-Code Projects
**What goes wrong:** The brownfield flow triggers and runs analysis on a marketing project directory that just has some markdown files — analysis produces meaningless output and wastes time.
**Why it happens:** The brownfield detection heuristic is too broad.
**How to avoid:** Only trigger brownfield analysis when there are actual source code signals (package.json, .py files, src/ directory, etc.). Markdown-only directories and pure content projects should skip the brownfield flow silently.
**Warning signs:** CODEBASE.md for a project where "Language Distribution" shows only .md files.

---

## Code Examples

### Framework Detection Heuristic (for the skill)

```markdown
## Framework Detection Protocol

For each framework category, check in order:
1. Does the indicator file/directory exist? (Glob check)
2. Does the indicator file contain the expected marker? (Grep check)
3. If both: mark as detected with evidence

### Node.js / JavaScript Ecosystem
Indicator file: package.json
Detection: Glob("package.json") exists
Read package.json:
  - "express" in dependencies → Express.js
  - "fastify" in dependencies → Fastify
  - "next" in dependencies → Next.js
  - "react" in dependencies → React
  - "vue" in dependencies → Vue.js
  - "@angular/core" in dependencies → Angular
  - No framework deps → vanilla Node.js

### Python Ecosystem
Indicator files: requirements.txt, pyproject.toml, setup.py, Pipfile
Read requirements/pyproject:
  - "django" → Django
  - "flask" → Flask
  - "fastapi" → FastAPI
  - "pytest" in dev deps → pytest test suite

### Ruby Ecosystem
Indicator file: Gemfile
Read Gemfile:
  - gem 'rails' → Ruby on Rails
  - gem 'sinatra' → Sinatra

### Unknown / Custom
If none of the above match:
  - Report "Custom / Unknown" with file extensions as evidence
  - Do not guess
```

### File Tree Generation (Bash approach)

```bash
# Depth-limited tree summary (max 2 levels, ignore noise)
find . -maxdepth 2 \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  -not -path './.planning/*' \
  -not -path './.claude/*' \
  -not -name '*.lock' \
  -not -name '.DS_Store' \
  | sort
```

### File Size Hotspot Detection (Bash approach)

```bash
# Find files over 300 lines (high complexity signal)
find . -name '*.ts' -o -name '*.js' -o -name '*.py' -o -name '*.rb' \
  | xargs wc -l 2>/dev/null \
  | sort -rn \
  | head -20
```

### Technical Debt Signal Detection (Grep approach)

```bash
# Count TODO markers across source files
grep -r --include="*.ts" --include="*.js" --include="*.py" \
  -c "TODO\|FIXME\|HACK\|XXX" . 2>/dev/null \
  | grep -v ":0" \
  | sort -t: -k2 -rn \
  | head -10
```

### Git Hotspot Detection (when git is available)

```bash
# Files changed most in the last 90 days (commit frequency = complexity risk)
git log --since="90 days ago" --name-only --format="" \
  | sort | uniq -c | sort -rn | head -10
```

---

## Integration Design: Two Plans

Based on the pattern established by github-sync (Phase 11), brownfield support maps cleanly to a 2-plan structure:

**Plan 12-01 (Wave 1): codebase-mapper skill**
- Build `.claude/skills/agency/codebase-mapper.md` with 6 sections
- Add Brownfield Conventions to `workflow-common.md`
- Add CODEBASE.md path to workflow-common State File Locations table
- Deliverables: 1 skill created, 1 skill updated

**Plan 12-02 (Wave 2): Workflow integration**
- Update `start.md` — brownfield detection branch (Step 1b)
- Update `plan.md` — CODEBASE.md context injection (Step 3 extension)
- Update `REQUIREMENTS.md` — check BROWN-01/02/03
- Update `CLAUDE.md` — document brownfield support
- Deliverables: 4 files updated

This matches the github-sync model exactly (skill first, integration second).

---

## Agent Selection

| Plan | Recommended Agent | Rationale |
|------|------------------|-----------|
| 12-01 (codebase-mapper skill) | `engineering-backend-architect` | Pattern detection, dependency analysis, and technical risk assessment are backend architecture skills; this agent understands the full-stack context needed to write good detection heuristics |
| 12-02 (workflow integration) | `agents-orchestrator` | Wiring a new skill into multiple existing commands is orchestration work — this agent specializes in pipeline management and workflow integration |

Alternative for Plan 12-01: `engineering-senior-developer` is also appropriate (strong file/pattern analysis skills). The backend architect is preferred because BROWN-03 (risk assessment) requires architectural judgment, not just coding skill.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Greenfield-only planning | Brownfield-aware planning | Agents receive context about existing conventions; don't fight the codebase |
| Manual codebase orientation | Automated pre-flight mapping | Planner knows risk areas before assigning tasks |
| Generic agent instructions | Convention-informed instructions | Agents produce code that fits the existing style |

**What other tools do (for context):** Tools like Sourcegraph and GitHub Copilot's workspace analysis use LSP and AST-level analysis. The Agency's approach is intentionally lighter — heuristic-based using file inspection, appropriate for Claude Code's tool set and the no-custom-tooling constraint. LSP-level analysis (lsp-index-engineer) is available as an agent but would be overkill for planning-time orientation.

---

## Open Questions

1. **Re-analysis trigger**
   - What we know: CODEBASE.md has an "Analyzed" date
   - What's unclear: Should `/agency:plan` automatically re-analyze if the map is stale, or just warn?
   - Recommendation: Warn only (don't auto-analyze). Re-analysis could be slow on large codebases; let the user decide. Present: "CODEBASE.md is 45 days old — run `/agency:start` to refresh the map, or continue with existing analysis."

2. **Brownfield analysis for mid-project Agency starts**
   - What we know: `/agency:start` is also used when joining an existing Agency project (reinitialize flow)
   - What's unclear: Should brownfield analysis re-run if .planning/ already exists with CODEBASE.md?
   - Recommendation: If CODEBASE.md exists and is <30 days old, skip re-analysis and inform the user. If >30 days or missing, offer analysis.

3. **Confidence scoring for detected patterns**
   - What we know: Some detections are certain (package.json with "express"), some are guesses (directory structure implies MVC)
   - What's unclear: How to represent uncertainty in the map without making it cluttered
   - Recommendation: Use the Evidence column in Detected Stack table — when evidence is strong, note the specific file/line; when evidence is heuristic, note "(inferred from directory structure)". No explicit confidence score needed; the evidence speaks for itself.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `/c/Users/dasbl/Documents/agency-agents/.claude/skills/agency/` — all existing skill structures (github-sync, memory-manager, workflow-common) analyzed directly
- Direct inspection of `/c/Users/dasbl/Documents/agency-agents/.claude/commands/agency/` — start.md and plan.md integration points verified
- Direct reading of REQUIREMENTS.md, ROADMAP.md, STATE.md — requirements and project decisions confirmed

### Secondary (MEDIUM confidence)
- PROJECT.md no-custom-tooling constraint confirmed — shapes all technology choices
- Agent registry inspection — confirmed `engineering-backend-architect` and `agents-orchestrator` as appropriate agents for the two plans

### Tertiary (LOW confidence)
- None — all findings based on direct file inspection of the target codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed by PROJECT.md constraint (no custom tooling) and direct inspection showing all tools available
- Architecture patterns: HIGH — directly derived from github-sync (Phase 11) which established the exact structural model to follow
- Pitfalls: HIGH — derived from direct analysis of how similar skills (memory-manager, github-sync) handle degradation and edge cases
- Agent selection: MEDIUM — based on task type matching against agent-registry; user confirmation gate in plan.md will allow override

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable — no external dependencies, project structure changes slowly)
