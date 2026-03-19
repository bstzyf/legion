# Board of Directors & Cross-CLI Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Board of Directors governance system and cross-CLI dispatch infrastructure to Legion, enabling Claude Code to route assessments and work to Gemini CLI and Codex CLI.

**Architecture:** Three layered subsystems — (1) a dispatch skill reads capability metadata from adapter frontmatter to route work to external CLIs via Bash invocation with file-based result handoff, (2) a Board of Directors skill assembles dynamic agent panels for 5-phase deliberation with voting, and (3) enhanced review evaluators add multi-pass analysis and anti-sycophancy rules. All are markdown-only skills (no runtime code) following Legion's existing patterns.

**Tech Stack:** Markdown skills, YAML frontmatter, Node.js test runner (`node:test`), JSON Schema

**Spec:** `docs/superpowers/specs/2026-03-19-board-and-dispatch-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `skills/cli-dispatch/SKILL.md` | Dispatch layer: capability matching, prompt building, invocation engine, result collection, error recovery |
| `skills/board-of-directors/SKILL.md` | Board: dynamic composition, 5-phase deliberation protocol, voting, resolution formula, persistence |
| `skills/review-evaluators/SKILL.md` | Multi-pass evaluator definitions (Code Quality, UI/UX, Integration, Business Logic) |
| `commands/board.md` | `/legion:board` command entry point with `meet` and `review` modes |
| `tests/dispatch-conformance.test.js` | Tests for dispatch frontmatter in adapters + settings schema additions |

### Modified Files

| File | Change |
|------|--------|
| `settings.json` | Add `board` and `dispatch` top-level objects; extend `review` with `evaluator_depth` and `coverage_thresholds` |
| `docs/settings.schema.json` | Add JSON Schema definitions for new settings |
| `adapters/gemini-cli.md` | Add `## Dispatch Configuration` markdown body section (NOT in YAML frontmatter — the existing frontmatter parser can't handle nested objects with arrays; dispatch config lives in the body as a fenced YAML block) |
| `adapters/codex-cli.md` | Add `## Dispatch Configuration` markdown body section |
| `adapters/copilot-cli.md` | Add `## Dispatch Configuration` markdown body section |
| `skills/review-panel/SKILL.md` | Add "Review Conduct" anti-sycophancy section |
| `skills/review-loop/SKILL.md` | Add structured review request auto-population |
| `commands/review.md` | Add `evaluator_depth` option to mode selection |
| `commands/status.md` | Add board decisions section to dashboard |
| `skills/workflow-common-core/SKILL.md` | Add `/legion:board` to command-to-skill mapping table |
| `CLAUDE.md` | Add `/legion:board` to command table |
| `CHANGELOG.md` | Add v7.0.0 entry |

---

## Task 1: Settings & Schema Foundation

**Files:**
- Modify: `settings.json`
- Modify: `docs/settings.schema.json`
- Create: `tests/dispatch-conformance.test.js`

- [ ] **Step 1: Write the settings schema test**

Create `tests/dispatch-conformance.test.js` with tests that validate the new settings properties. These tests will fail until we update the files.

```javascript
'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

describe('Settings Schema: New Properties', () => {
  const schema = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs/settings.schema.json'), 'utf8')
  );
  const settings = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'settings.json'), 'utf8')
  );

  test('schema defines board property', () => {
    assert.ok(schema.properties.board, 'schema must define board property');
    assert.equal(schema.properties.board.type, 'object');
  });

  test('schema defines dispatch property', () => {
    assert.ok(schema.properties.dispatch, 'schema must define dispatch property');
    assert.equal(schema.properties.dispatch.type, 'object');
  });

  test('schema defines review.evaluator_depth', () => {
    assert.ok(
      schema.properties.review.properties.evaluator_depth,
      'schema must define review.evaluator_depth'
    );
  });

  test('schema defines review.coverage_thresholds', () => {
    assert.ok(
      schema.properties.review.properties.coverage_thresholds,
      'schema must define review.coverage_thresholds'
    );
  });

  test('settings.json has board section', () => {
    assert.ok(settings.board, 'settings.json must have board section');
    assert.equal(settings.board.default_size, 5);
    assert.equal(settings.board.min_size, 3);
    assert.equal(settings.board.discussion_rounds, 2);
    assert.equal(settings.board.assessment_timeout_ms, 300000);
    assert.equal(settings.board.persist_artifacts, true);
  });

  test('settings.json has dispatch section', () => {
    assert.ok(settings.dispatch, 'settings.json must have dispatch section');
    assert.equal(settings.dispatch.enabled, true);
    assert.equal(settings.dispatch.fallback_to_internal, true);
    assert.equal(settings.dispatch.timeout_ms, 300000);
    assert.equal(settings.dispatch.max_retries, 1);
  });

  test('settings.json has review.evaluator_depth', () => {
    assert.equal(settings.review.evaluator_depth, 'multi-pass');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/dasbl/Documents/legion && node --test tests/dispatch-conformance.test.js`
Expected: FAIL — `schema must define board property` and similar

- [ ] **Step 3: Update settings.json**

Add `board`, `dispatch` top-level objects and extend `review`:

In `settings.json`, after the existing `review` block (line 22), add new properties. The final file should be:

```json
{
  "$schema": "./docs/settings.schema.json",
  "control_mode": "guarded",
  "models": {
    "planning": "adapter_default",
    "execution": "adapter_default",
    "check": "adapter_default"
  },
  "planning": {
    "max_tasks_per_plan": 3,
    "architecture_proposals_default": "prompt",
    "spec_pipeline_default": "prompt"
  },
  "execution": {
    "auto_commit": true,
    "commit_prefix": "legion",
    "agent_personality_verbosity": "full"
  },
  "review": {
    "default_mode": "panel",
    "max_cycles": 3,
    "evaluator_depth": "multi-pass",
    "coverage_thresholds": {
      "overall": 70,
      "business_logic": 90,
      "api_routes": 80
    }
  },
  "board": {
    "default_size": 5,
    "min_size": 3,
    "discussion_rounds": 2,
    "assessment_timeout_ms": 300000,
    "persist_artifacts": true
  },
  "dispatch": {
    "enabled": true,
    "fallback_to_internal": true,
    "timeout_ms": 300000,
    "max_retries": 1
  },
  "memory": {
    "enabled": true,
    "project_scoped_only": true
  },
  "integrations": {
    "github": "prompt"
  }
}
```

- [ ] **Step 4: Update docs/settings.schema.json**

Add `board`, `dispatch` schemas and extend `review`. In `docs/settings.schema.json`:

After the existing `review` property definition (line 52), add `board` and `dispatch`. Also extend `review.properties` with `evaluator_depth` and `coverage_thresholds`.

The `review` section becomes:
```json
"review": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "default_mode": { "type": "string", "enum": ["classic", "panel"] },
    "max_cycles": { "type": "integer", "minimum": 1, "maximum": 5 },
    "evaluator_depth": { "type": "string", "enum": ["single", "multi-pass"], "default": "multi-pass" },
    "coverage_thresholds": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "overall": { "type": "integer", "minimum": 0, "maximum": 100 },
        "business_logic": { "type": "integer", "minimum": 0, "maximum": 100 },
        "api_routes": { "type": "integer", "minimum": 0, "maximum": 100 }
      }
    }
  },
  "required": ["default_mode", "max_cycles"]
}
```

Add new top-level properties:
```json
"board": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "default_size": { "type": "integer", "minimum": 2, "maximum": 7 },
    "min_size": { "type": "integer", "minimum": 2, "maximum": 5 },
    "discussion_rounds": { "type": "integer", "minimum": 1, "maximum": 5 },
    "assessment_timeout_ms": { "type": "integer", "minimum": 30000 },
    "persist_artifacts": { "type": "boolean" }
  },
  "required": ["default_size", "min_size", "discussion_rounds", "assessment_timeout_ms", "persist_artifacts"]
},
"dispatch": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "enabled": { "type": "boolean" },
    "fallback_to_internal": { "type": "boolean" },
    "timeout_ms": { "type": "integer", "minimum": 10000 },
    "max_retries": { "type": "integer", "minimum": 0, "maximum": 3 }
  },
  "required": ["enabled", "fallback_to_internal", "timeout_ms", "max_retries"]
}
```

The top-level `required` array stays as-is (board and dispatch are optional top-level keys — they have defaults).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd C:/Users/dasbl/Documents/legion && node --test tests/dispatch-conformance.test.js`
Expected: All 7 tests PASS

- [ ] **Step 6: Run full existing test suite to verify no regressions**

Run: `cd C:/Users/dasbl/Documents/legion && npm test`
Expected: All existing tests PASS (settings.json validates against updated schema)

- [ ] **Step 7: Commit**

```bash
git add settings.json docs/settings.schema.json tests/dispatch-conformance.test.js
git commit -m "feat(settings): add board, dispatch, and enhanced review settings"
```

---

## Task 2: Adapter Dispatch Frontmatter

**Files:**
- Modify: `adapters/gemini-cli.md`
- Modify: `adapters/codex-cli.md`
- Modify: `adapters/copilot-cli.md`
- Modify: `tests/dispatch-conformance.test.js`
- Modify: `tests/adapter-conformance.test.js`

- [ ] **Step 1: Add dispatch frontmatter tests to dispatch-conformance.test.js**

Append to `tests/dispatch-conformance.test.js`:

```javascript
// --- Adapter dispatch frontmatter tests ---

const ADAPTERS_DIR = path.join(ROOT, 'adapters');

const DISPATCH_ADAPTERS = ['gemini-cli.md', 'codex-cli.md', 'copilot-cli.md'];

const VALID_CAPABILITIES = [
  'code_implementation', 'code_review', 'testing', 'refactoring',
  'bug_fixing', 'ui_design', 'ux_research', 'web_search',
  'large_analysis', 'security_audit', 'performance_analysis', 'documentation',
];

const VALID_PROMPT_DELIVERY = ['file_path', 'stdin_pipe', 'content_flag'];

function parseDispatchSection(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  // Look for dispatch: section in the markdown body (not frontmatter)
  // It appears as a fenced code block with yaml after "## Dispatch Configuration"
  const dispatchMatch = text.match(/## Dispatch Configuration\s*\n```yaml\n([\s\S]*?)```/);
  if (!dispatchMatch) return null;

  const yaml = dispatchMatch[1];
  const result = {};

  // Simple YAML parser for flat + array fields
  const lines = yaml.split(/\r?\n/);
  let currentArray = null;

  for (const line of lines) {
    if (currentArray && /^ {2}-/.test(line)) {
      result[currentArray].push(line.trim().slice(2).trim().replace(/^"|"$/g, ''));
      continue;
    }
    currentArray = null;

    const kv = line.match(/^([a-z][a-z0-9_]*):?\s*(.*)/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();

    if (val.startsWith('[') && val.endsWith(']')) {
      result[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    } else if (val === 'true') {
      result[key] = true;
    } else if (val === 'false') {
      result[key] = false;
    } else if (val === 'null') {
      result[key] = null;
    } else if (/^\d+$/.test(val)) {
      result[key] = parseInt(val, 10);
    } else if (val === '' || val === undefined) {
      currentArray = key;
      result[key] = [];
    } else {
      result[key] = val.replace(/^"|"$/g, '');
    }
  }

  return result;
}

describe('Adapter Dispatch: Frontmatter Presence', () => {
  for (const file of DISPATCH_ADAPTERS) {
    test(`${file} has Dispatch Configuration section`, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const text = fs.readFileSync(filePath, 'utf8');
      assert.match(text, /## Dispatch Configuration/,
        `${file}: missing "## Dispatch Configuration" section`);
    });
  }
});

describe('Adapter Dispatch: Required Fields', () => {
  for (const file of DISPATCH_ADAPTERS) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const dispatch = parseDispatchSection(filePath);

      test('has available field (boolean true)', () => {
        assert.equal(dispatch?.available, true, 'dispatch.available must be true');
      });

      test('has capabilities array with valid entries', () => {
        assert.ok(Array.isArray(dispatch?.capabilities), 'capabilities must be an array');
        assert.ok(dispatch.capabilities.length > 0, 'capabilities must not be empty');
        for (const cap of dispatch.capabilities) {
          assert.ok(VALID_CAPABILITIES.includes(cap),
            `Unknown capability "${cap}". Valid: ${VALID_CAPABILITIES.join(', ')}`);
        }
      });

      test('has invoke_command (non-empty string)', () => {
        assert.ok(dispatch?.invoke_command?.length > 0, 'invoke_command must be non-empty');
      });

      test('has valid prompt_delivery method', () => {
        assert.ok(VALID_PROMPT_DELIVERY.includes(dispatch?.prompt_delivery),
          `prompt_delivery must be one of ${VALID_PROMPT_DELIVERY.join(', ')}`);
      });

      test('has timeout_ms (positive integer)', () => {
        assert.ok(Number.isInteger(dispatch?.timeout_ms) && dispatch.timeout_ms > 0,
          'timeout_ms must be a positive integer');
      });

      test('has detection_command (non-empty string)', () => {
        assert.ok(dispatch?.detection_command?.length > 0, 'detection_command must be non-empty');
      });
    });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd C:/Users/dasbl/Documents/legion && node --test tests/dispatch-conformance.test.js`
Expected: FAIL — "missing Dispatch Configuration section" for all three adapters

- [ ] **Step 3: Add dispatch section to gemini-cli.md**

Append at the end of `adapters/gemini-cli.md`:

```markdown

## Dispatch Configuration

When Claude Code is the orchestrator, Gemini CLI can be dispatched to for UI/UX evaluation, web research, and large codebase analysis. Gemini's 1M token context window makes it ideal for comprehensive analysis tasks.

```yaml
available: true
capabilities: [web_search, ui_design, ux_research, large_analysis, code_review]
invoke_command: "gemini"
invoke_flags: ["--sandbox"]
prompt_delivery: stdin_pipe
prompt_flag: null
result_mode: file
result_path: ".planning/dispatch/{task-id}-RESULT.md"
result_instruction: "Write your complete output to {result_path} using the format specified below."
max_concurrent: 3
timeout_ms: 300000
detection_command: "gemini --version"
prerequisites:
  - "Gemini CLI settings.json must have experimental.enableAgents set to true"
```
```

- [ ] **Step 4: Add dispatch section to codex-cli.md**

Append at the end of `adapters/codex-cli.md`:

```markdown

## Dispatch Configuration

When Claude Code is the orchestrator, Codex CLI can be dispatched to for code implementation, testing, refactoring, and bug fixing. Codex runs in full-auto approval mode for non-interactive execution.

```yaml
available: true
capabilities: [code_implementation, testing, refactoring, bug_fixing, code_review]
invoke_command: "codex"
invoke_flags: ["--approval-mode", "full-auto", "--quiet"]
prompt_delivery: content_flag
prompt_flag: "-p"
result_mode: file
result_path: ".planning/dispatch/{task-id}-RESULT.md"
result_instruction: "Write your complete output to {result_path} using the format specified below."
max_concurrent: 1
timeout_ms: 600000
detection_command: "codex --version"
prerequisites: []
```
```

- [ ] **Step 5: Add dispatch section to copilot-cli.md**

Append at the end of `adapters/copilot-cli.md`:

```markdown

## Dispatch Configuration

When Claude Code is the orchestrator, Copilot CLI can be dispatched to for code review and implementation tasks. Copilot uses Claude Sonnet via GitHub's infrastructure.

```yaml
available: true
capabilities: [code_implementation, code_review, bug_fixing, testing]
invoke_command: "copilot"
invoke_flags: ["--allow-all-paths", "--allow-all-tools"]
prompt_delivery: content_flag
prompt_flag: "-p"
result_mode: file
result_path: ".planning/dispatch/{task-id}-RESULT.md"
result_instruction: "Write your complete output to {result_path} using the format specified below."
max_concurrent: 1
timeout_ms: 300000
detection_command: "copilot --version"
prerequisites: []
```
```

- [ ] **Step 6: Update adapter-conformance.test.js to handle dispatch section**

In `tests/adapter-conformance.test.js`, the `parseAdapterFrontmatter` function (line 122) needs to recognize `dispatch` as a nested object. Edit line 122:

Change:
```javascript
if (key === 'capabilities' || key === 'detection') {
```
To:
```javascript
if (key === 'capabilities' || key === 'detection' || key === 'dispatch') {
```

This prevents the parser from choking on `dispatch:` in frontmatter if adapters later move dispatch to frontmatter.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd C:/Users/dasbl/Documents/legion && node --test tests/dispatch-conformance.test.js`
Expected: All dispatch tests PASS

Run: `cd C:/Users/dasbl/Documents/legion && npm test`
Expected: All existing tests still PASS

- [ ] **Step 8: Commit**

```bash
git add adapters/gemini-cli.md adapters/codex-cli.md adapters/copilot-cli.md tests/dispatch-conformance.test.js tests/adapter-conformance.test.js
git commit -m "feat(adapters): add dispatch configuration sections to Gemini, Codex, and Copilot adapters"
```

---

## Task 3: CLI Dispatch Skill

**Files:**
- Create: `skills/cli-dispatch/SKILL.md`

- [ ] **Step 1: Create the dispatch skill**

Create `skills/cli-dispatch/SKILL.md` with the full dispatch layer specification. This is a markdown-native skill that instructs the AI agent how to route work to external CLIs.

The skill must cover all 7 components from the spec:
1. CLI Registry (reading dispatch configs from adapters)
2. Capability Matcher (scoring CLIs by task type overlap)
3. Prompt Builder (personality + task + result contract + control mode)
4. Invocation Engine (Bash tool, prompt delivery methods, timeout)
5. Result Collector (exit code, file reading, validation)
6. Control Mode Interactions (per-mode dispatch behavior)
7. Error Recovery (detection failure, timeout, retries)

The skill frontmatter must follow the existing pattern:
```yaml
---
name: legion:cli-dispatch
description: Cross-CLI dispatch infrastructure for routing work to external CLIs
triggers: [dispatch, gemini, codex, copilot, external, cli, cross-cli]
token_cost: medium
summary: "Routes tasks to external CLIs (Gemini, Codex, Copilot) via capability matching, with file-based result handoff and control-mode-aware permissions."
---
```

Content sections must include:
- Section 1: CLI Discovery (read adapter files, parse dispatch configs, check detection_command)
- Section 2: Capability Matching Algorithm (exact match > category match > internal fallback)
- Section 3: Prompt Construction Template (with `{personality}`, `{task}`, `{result_contract}`, `{control_mode_scope}` placeholders)
- Section 4: Invocation Protocol (per-delivery-method command templates, timeout handling)
- Section 5: Result Collection (read result file, validate structure, stdout fallback)
- Section 6: Control Mode Behavior Table (autonomous/guarded/surgical/advisory)
- Section 7: Error Recovery (detection failure → internal fallback, timeout → kill + partial, retry logic)
- Section 8: Cleanup (archive PROMPT/RESULT files after successful collection)

**Implementation guidance:** This is a large skill file (~250-350 lines). Use the spec Section 1 as the authoritative source for all field definitions, capability vocabulary, prompt delivery methods, and control mode behavior. The existing `skills/wave-executor/SKILL.md` is the closest pattern reference for how orchestration-layer skills are structured.

- [ ] **Step 2: Validate skill structure**

Run: `cd C:/Users/dasbl/Documents/legion && node -e "const fs = require('fs'); const text = fs.readFileSync('skills/cli-dispatch/SKILL.md', 'utf8'); const m = text.match(/^---\n([\s\S]*?)\n---/); console.log(m ? 'Frontmatter OK' : 'MISSING FRONTMATTER'); console.log('Sections:', (text.match(/^## /gm) || []).length);"`
Expected: `Frontmatter OK` and `Sections: 8` (or more)

- [ ] **Step 3: Commit**

```bash
git add skills/cli-dispatch/SKILL.md
git commit -m "feat(skills): add cli-dispatch skill for cross-CLI orchestration"
```

---

## Task 4: Board of Directors Skill

**Files:**
- Create: `skills/board-of-directors/SKILL.md`

- [ ] **Step 1: Create the board skill**

Create `skills/board-of-directors/SKILL.md` with the full deliberation protocol. This is a markdown-native skill.

Frontmatter:
```yaml
---
name: legion:board-of-directors
description: Governance escalation tier with dynamic agent panels, deliberation, voting, and audit persistence
triggers: [board, directors, governance, deliberation, vote, escalation]
token_cost: high
summary: "Assembles dynamic board from 53 agents, runs 5-phase deliberation (assess → discuss → vote → resolve → persist), produces auditable governance decisions."
---
```

Content sections must include:

- Section 1: Board Composition (using agent-registry scoring, domain signal extraction from topic, 3-5 members, user confirmation with hybrid selection)
- Section 2: Phase 1 — Independent Assessment (parallel dispatch via cli-dispatch, assessment output format template with Verdict/Score/Evaluation/Red Flags/Concerns/Recommendations/Questions, timeout handling with proceed-without rule)
- Section 3: Phase 2 — Discussion (2 rounds, internal agents, message types CHALLENGE/AGREE/QUESTION/CLARIFY/SHIFT, model_planning tier)
- Section 4: Phase 3 — Final Vote (CONCERNS → vote mapping, verdict + confidence + conditions format, model_check tier)
- Section 5: Phase 4 — Resolution (general formula: `>= ceil(2*N/3)` = APPROVED, `> floor(N/2)` = APPROVED WITH CONDITIONS, `= N/2` = ESCALATE, otherwise = REJECTED. First-match-wins. Under-population handling with N=2 floor)
- Section 6: Phase 5 — Persistence (directory structure, MEETING.md template, assessments/, discussion.md, votes.md, resolution.md)
- Section 7: Quick Review Mode (Phase 1 only, no deliberation, summary output)
- Section 8: Model Tier Table (assessment=model_execution, discussion=model_planning, vote=model_check)
- Section 9: Settings Reference (board.default_size, board.min_size, board.discussion_rounds, board.assessment_timeout_ms, board.persist_artifacts)
- Section 10: Memory Integration (after resolution, write decision summary to `.planning/memory/OUTCOMES.md` with `task_type: "board_decision"` — follows existing memory-manager patterns)

**Implementation guidance:** This is a large skill file (~300-400 lines). Use the spec Section 2 as the authoritative source for all formats, formulas, and protocol details. The existing `skills/review-panel/SKILL.md` and `skills/review-loop/SKILL.md` are the best pattern references for how Legion skills are structured. Copy the section/subsection organization style from those files.

- [ ] **Step 2: Validate skill structure**

Run: `cd C:/Users/dasbl/Documents/legion && node -e "const fs = require('fs'); const text = fs.readFileSync('skills/board-of-directors/SKILL.md', 'utf8'); const m = text.match(/^---\n([\s\S]*?)\n---/); console.log(m ? 'Frontmatter OK' : 'MISSING FRONTMATTER'); console.log('Sections:', (text.match(/^## /gm) || []).length);"`
Expected: `Frontmatter OK` and `Sections: 9` (or more)

- [ ] **Step 3: Commit**

```bash
git add skills/board-of-directors/SKILL.md
git commit -m "feat(skills): add board-of-directors skill with 5-phase deliberation protocol"
```

---

## Task 5: Board Command

**Depends on:** Tasks 3 and 4 must be completed first (the board command's `execution_context` references `board-of-directors` and `cli-dispatch` skills, which must exist for cross-reference validation tests to pass).

**Files:**
- Create: `commands/board.md`
- Modify: `skills/workflow-common-core/SKILL.md`

- [ ] **Step 1: Create the board command**

Create `commands/board.md` following the exact pattern of existing commands (e.g., `commands/review.md`). It must have:

Frontmatter:
```yaml
---
name: legion:board
description: Convene a board of directors for governance decisions
argument-hint: |
  /legion:board meet <topic>   — Full deliberation on a proposal
  /legion:board review         — Quick parallel assessments of current phase
allowed-tools:
  - Agent
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
  - TaskCreate
  - TaskUpdate
  - TaskList
---
```

Content must include (using the same `<objective>`, `<execution_context>`, `<context>`, `<process>` structure as other commands):

- `<objective>`: Convene governance board for high-stakes decisions
- `<execution_context>`: Load workflow-common-core, agent-registry, board-of-directors, cli-dispatch, workflow-common-memory (conditional)
- `<context>`: Import STATE.md, ROADMAP.md, PROJECT.md, recent board decisions from .planning/board/
- `<process>`:
  - Step 0: Parse mode (meet vs review) and topic from arguments
  - Step 1: Validate project state (must have active project)
  - Step 2: Board Composition (use agent-registry, present candidates, user confirms via AskUserQuestion)
  - Step 3: Dispatch to Phase 1 (assessment) — route to board-of-directors skill Phase 1
  - Step 4: If meet mode, continue to Phases 2-5 via board-of-directors skill
  - Step 4b: If review mode, aggregate Phase 1 assessments and display summary
  - Step 5: Display resolution and next actions

- [ ] **Step 2: Add board to workflow-common-core skill mapping**

In `skills/workflow-common-core/SKILL.md`, find the command-to-skill mapping table. Add a new row:

```
| `/legion:board`     | workflow-common-core, agent-registry, board-of-directors, cli-dispatch | workflow-common-memory, workflow-common-github |
```

- [ ] **Step 3: Validate command structure**

Run: `cd C:/Users/dasbl/Documents/legion && node -e "const fs = require('fs'); const text = fs.readFileSync('commands/board.md', 'utf8'); const m = text.match(/^---\n([\s\S]*?)\n---/); console.log(m ? 'Frontmatter OK' : 'MISSING FRONTMATTER'); console.log('Has objective:', text.includes('<objective>')); console.log('Has process:', text.includes('<process>'));"`
Expected: `Frontmatter OK`, `Has objective: true`, `Has process: true`

- [ ] **Step 4: Run full test suite (critical checkpoint)**

Run: `cd C:/Users/dasbl/Documents/legion && npm test`
Expected: All tests PASS — this is the first point where cross-reference validation sees the new command file.

- [ ] **Step 5: Commit**

```bash
git add commands/board.md skills/workflow-common-core/SKILL.md
git commit -m "feat(commands): add /legion:board command with meet and review modes"
```

---

## Task 6: Review Evaluators Skill

**Files:**
- Create: `skills/review-evaluators/SKILL.md`

- [ ] **Step 1: Create the review evaluators skill**

Create `skills/review-evaluators/SKILL.md` with multi-pass evaluator definitions.

Frontmatter:
```yaml
---
name: legion:review-evaluators
description: Multi-pass specialized evaluators for deep code quality, UI/UX, integration, and business logic review
triggers: [evaluator, multi-pass, deep-review, code-quality, ui-ux, integration, business-logic]
token_cost: high
summary: "Four evaluator types with domain-specific pass lists. Each runs as a single agent invocation with multiple evaluation criteria."
---
```

Content sections:

- Section 1: Evaluator Selection (automatic based on phase type and files modified; multi-type phases run multiple evaluators)
- Section 2: Code Quality Evaluator (6 passes: Build integrity, Type safety, Code patterns, Error handling, Dead code, Test coverage — default dispatch: Codex)
- Section 3: UI/UX Evaluator (7 passes: Design system adherence, Visual consistency, Layout, Responsive behavior, Component states, Accessibility WCAG 2.1 AA, Usability — default dispatch: Gemini)
- Section 4: Integration Evaluator (6 passes: API contracts, Auth flow, Data persistence, Error recovery, Environment config, E2E flow — internal)
- Section 5: Business Logic Evaluator (6 passes: Product rules, Feature correctness, Edge cases, State transitions, Data flow, User journey — internal)
- Section 6: Execution Model (single agent invocation per evaluator, passes are sequential criteria sections within one rubric, NOT separate invocations)
- Section 7: Finding Deduplication (cross-pass dedup before presentation, existing review-panel dedup logic applies)
- Section 8: Dispatch Integration (how evaluators use cli-dispatch for external CLI routing)

**Implementation guidance:** Use the spec Section 3 as the authoritative source for evaluator types, pass lists, and dispatch targets. The existing `skills/review-panel/SKILL.md` Domain Rubric Registry (lines 171-328) is the closest pattern reference for how evaluation criteria are structured. Each evaluator section should include a complete rubric template with one subsection per pass.

- [ ] **Step 2: Validate skill structure**

Run: `cd C:/Users/dasbl/Documents/legion && node -e "const fs = require('fs'); const text = fs.readFileSync('skills/review-evaluators/SKILL.md', 'utf8'); const m = text.match(/^---\n([\s\S]*?)\n---/); console.log(m ? 'Frontmatter OK' : 'MISSING FRONTMATTER'); console.log('Sections:', (text.match(/^## /gm) || []).length);"`
Expected: `Frontmatter OK` and `Sections: 8`

- [ ] **Step 3: Commit**

```bash
git add skills/review-evaluators/SKILL.md
git commit -m "feat(skills): add review-evaluators skill with 4 multi-pass evaluator types"
```

---

## Task 7: Review Enhancements

**Files:**
- Modify: `skills/review-panel/SKILL.md`
- Modify: `skills/review-loop/SKILL.md`
- Modify: `commands/review.md`

- [ ] **Step 1: Add anti-sycophancy rules to review-panel**

In `skills/review-panel/SKILL.md`, add a new section "## Review Conduct Rules" after the existing Panel Composition Algorithm section and before the Domain Rubric Registry section. This section gets injected into every review agent's prompt context.

Content:
```markdown
## Review Conduct Rules

These rules are injected into every review agent's prompt to ensure rigorous, actionable feedback.

### Mandatory Conduct

1. **Verify before implementing** — Confirm feedback is technically correct for THIS codebase before acting on it. Grep for the function, read the file, check the dependency.
2. **Pushback is expected** — Reviewers MUST challenge when: suggestion would break existing functionality, reviewer lacks context for the change, recommendation violates YAGNI, feedback is technically incorrect for the runtime/framework in use, or suggestion conflicts with prior architectural decisions.
3. **No performative agreement** — Do NOT use phrases like "great point!", "you're absolutely right!", "excellent suggestion!". State agreement factually: "Confirmed: the null check is missing."
4. **Specificity required** — Every finding MUST include: file path and line number, what is wrong, why it matters, and how to fix it. Findings without all four elements are rejected.
5. **Severity accuracy** — Do NOT mark nitpicks (formatting, naming preferences) as BLOCKER. BLOCKER is reserved for: crashes, data loss, security vulnerabilities, broken builds. WARNING is for logic errors, missing edge cases, performance issues. INFO is for style, conventions, suggestions.
6. **Clear verdict mandatory** — Every review MUST end with an explicit verdict: "Ready to merge? Yes / No / With fixes". No ambiguous conclusions.
```

- [ ] **Step 2: Add structured review request format to review-loop**

In `skills/review-loop/SKILL.md`, in Section 3 (Review Prompt Construction), add a new subsection "### Structured Review Request" before the "Required Feedback Format" subsection. This auto-populates context from SUMMARY.md files.

Content:
```markdown
### Structured Review Request

When the review-loop is invoked after a build phase, it auto-constructs a structured review request from the phase's SUMMARY.md files. This gives reviewers complete context without manual assembly.

**Auto-population sources:**
- **Scope**: Git diff range from SUMMARY.md "Files Modified" sections
- **Requirements**: REQ-* references from the plan's YAML frontmatter
- **Implementation summary**: "Completed Tasks" sections from all SUMMARY.md files in the phase
- **Known risks**: "Open Questions" or escalation blocks from SUMMARY.md handoff context
- **Verification results**: Output of `verification_commands` from the plan (captured during build)

**Injected into reviewer prompt as:**
```
## Review Context (auto-populated)
- **Scope**: {file list from SUMMARY.md Files Modified sections}
- **Requirements addressed**: {REQ-* list from plan frontmatter}
- **What was built**: {merged Completed Tasks from SUMMARY.md files}
- **Known risks**: {Open Questions and unresolved escalations}
- **Verification**: {verification command outputs, PASS/FAIL for each}
```

If SUMMARY.md files are not available (e.g., manual review without a prior build phase), skip auto-population and rely on the reviewer's own file discovery.
```

- [ ] **Step 3: Add evaluator_depth option to review command**

In `commands/review.md`, in the "SELECT REVIEW AGENTS" step where the user chooses between dynamic panel and classic reviewer selection, add `evaluator_depth` as a third dimension.

After the existing mode selection (dynamic panel vs classic), add:

```markdown
#### Evaluator Depth

Read `settings.review.evaluator_depth` (default: `"multi-pass"`).

If `"multi-pass"`:
- Load the `review-evaluators` skill
- After panel composition, determine which evaluator types apply based on phase type
- Each selected evaluator runs its full pass list as a single rubric
- Findings from evaluators are merged with panel findings and deduplicated

If `"single"`:
- Standard single-pass review per agent (existing behavior)
- review-evaluators skill is NOT loaded
```

Also add `review-evaluators` to the execution_context conditional skills list.

- [ ] **Step 4: Run full test suite**

Run: `cd C:/Users/dasbl/Documents/legion && npm test`
Expected: All tests PASS (markdown modifications don't break structural tests)

- [ ] **Step 5: Commit**

```bash
git add skills/review-panel/SKILL.md skills/review-loop/SKILL.md commands/review.md
git commit -m "feat(review): add anti-sycophancy rules, structured requests, and evaluator_depth option"
```

---

## Task 8: Integration — Status, CLAUDE.md, Changelog

**Files:**
- Modify: `commands/status.md`
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add board decisions section to status dashboard**

In `commands/status.md`, in the "DISPLAY DASHBOARD" step, add a new conditional section after the Memory section and before GitHub. This section reads `.planning/board/` for recent board decisions.

Content to add:
```markdown
#### Board Decisions (conditional: .planning/board/ exists)

If `.planning/board/` directory exists and contains meeting directories:

```
## Board Decisions
| Date | Topic | Verdict | Conditions | Board Size |
|------|-------|---------|------------|------------|
| {date} | {topic from dir name} | {verdict from resolution.md} | {conditions count} | {N members} |
```

Show the 5 most recent meetings, sorted by date descending. If any meeting has pending conditions (APPROVED WITH CONDITIONS where conditions have not been verified), flag with ⚠️.
```

- [ ] **Step 2: Add /legion:board to CLAUDE.md command table**

In `CLAUDE.md`, find the "## Available Commands" table and add:

```
| `/legion:board` | Convene board of directors for governance decisions |
```

Also update the "## Agent Divisions" count reference if it says "53" to say "53" (no change needed — agent count is unchanged).

Also add to the "## Workflow" section a note:

```
Advisory: `/legion:board meet <topic>` — governance escalation for high-stakes decisions
Advisory: `/legion:board review` — quick strategic assessments
```

- [ ] **Step 3: Add CHANGELOG entry**

In `CHANGELOG.md`, add a new entry at the top:

```markdown
## [Unreleased]

### Added
- **Board of Directors** (`/legion:board`) — governance escalation tier with dynamic agent composition, 5-phase deliberation (assess → discuss → vote → resolve → persist), and audit trail persistence
- **Cross-CLI Dispatch** — infrastructure for routing work to external CLIs (Gemini, Codex, Copilot) via capability-based matching with file-based result handoff
- **Multi-pass review evaluators** — four specialized evaluator types (Code Quality, UI/UX, Integration, Business Logic) with domain-specific pass lists
- **Anti-sycophancy review rules** — injected into all review agent prompts to ensure rigorous, specific, actionable feedback
- **Structured review requests** — auto-populated review context from SUMMARY.md files
- Dispatch configuration sections in Gemini, Codex, and Copilot adapters
- Board and dispatch settings in settings.json with JSON Schema validation

### Changed
- `review` settings extended with `evaluator_depth` and `coverage_thresholds`
- Status dashboard shows recent board decisions and pending conditions
- Workflow-common-core skill mapping includes `/legion:board` command
```

Note: Use `[Unreleased]` rather than a version number. The version bump (6.0.4 → 7.0.0) in `package.json` and `package-lock.json` should happen as a separate release commit when all features are validated.

- [ ] **Step 4: Regenerate checksums**

New files in `skills/` and `commands/` are included in the npm package (per `package.json` `files` array). The checksum manifest must be regenerated to include them, or `npm test` will fail on the checksum-manifest test.

Run: `cd C:/Users/dasbl/Documents/legion && npm run checksums:generate`

- [ ] **Step 5: Run full test suite**

Run: `cd C:/Users/dasbl/Documents/legion && npm test`
Expected: All tests PASS (including checksum-manifest validation)

- [ ] **Step 6: Commit**

```bash
git add commands/status.md CLAUDE.md CHANGELOG.md checksums.sha256
git commit -m "feat(integration): add board to status dashboard, CLAUDE.md, and changelog"
```

---

## Verification Checklist

After all 8 tasks are complete, verify:

- [ ] `npm test` passes (all existing + new tests)
- [ ] `settings.json` validates against `docs/settings.schema.json`
- [ ] All 4 new files exist: `skills/cli-dispatch/SKILL.md`, `skills/board-of-directors/SKILL.md`, `skills/review-evaluators/SKILL.md`, `commands/board.md`
- [ ] All 3 adapters have `## Dispatch Configuration` section
- [ ] `/legion:board` appears in CLAUDE.md command table
- [ ] `workflow-common-core` skill mapping includes `/legion:board`
- [ ] CHANGELOG.md has `[Unreleased]` entry with all new features listed
- [ ] `checksums.sha256` regenerated to include new files
- [ ] `npm run validate` passes (if available)
