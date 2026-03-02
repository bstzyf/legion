# Plan 21-01 Summary: Create /agency:advise command and update project state

**Status**: Complete
**Completed**: 2026-03-02

## What Was Done

### Task 1: Created `commands/advise.md`
- New `/agency:advise` command with read-only advisory sessions
- Three-layer read-only enforcement:
  1. Command `allowed-tools`: `[Read, Grep, Glob, Agent, AskUserQuestion]` — no Write, Edit, Bash
  2. Spawned agent uses `subagent_type: "Explore"` — tool-level read-only (no Write/Edit)
  3. Prompt explicitly states READ-ONLY advisory mode
- Uses agent-registry Section 3 recommendation algorithm for topic-to-agent matching
- Interactive follow-up: continue with same advisor, switch topic, or end session
- Sonnet model for advisory agents (substantive analysis, not heavy enough for Opus)

### Task 2: Updated state files
- **CLAUDE.md**: Added `/agency:advise` to Available Commands table, added advisory workflow line, updated command count to 10
- **ROADMAP.md**: Phase 21 marked Complete with date
- **STATE.md**: Updated position to Phase 21 Complete, progress to 78% (7/9 phases), next steps point to Phase 22
- **REQUIREMENTS.md**: ADV-01 and ADV-02 checked as complete, traceability updated

## Files Changed
- `commands/advise.md` (created)
- `CLAUDE.md` (updated)
- `.planning/ROADMAP.md` (updated)
- `.planning/STATE.md` (updated)
- `.planning/REQUIREMENTS.md` (updated)

## Requirements Satisfied
- **ADV-01**: `/agency:advise` command spawns read-only consultation agents based on topic
- **ADV-02**: Advisory agents operate in explicit read-only mode with three-layer enforcement
