---
name: legion:polymath-engine
description: Execution engine for structured exploration workflows — research-first clarification with gap detection and decision support
triggers: [explore, clarify, crystallize, pre-flight, alignment]
token_cost: medium
summary: "Research-first exploration engine: investigates domain, detects knowledge gaps, guides structured choices, produces crystallized output. Implements Polymath agent workflow."
---

# Polymath Engine

Execution engine for pre-flight alignment workflows. Consumed by `/legion:explore` and potentially other exploration contexts. Implements the research-first, structured-choice methodology defined in `agents/polymath.md`.

---

## Section 1: Research Phase (Silent)

**Purpose:** Gather context BEFORE interacting with the user.

**When to run:** Automatically at the start of every exploration session.

**Research checklist:**

1. **Codebase scan** — Does this build on existing code?
   ```bash
   # Search for relevant files based on user's concept keywords
   grep -r "keyword" --include="*.js" --include="*.ts" --include="*.py" --include="*.md" . 2>/dev/null | head -20
   ```
   - Look for: existing implementations, similar features, reusable components
   - Document: what exists, what patterns are established

2. **Documentation scan** — What does Legion already know?
   - Read `.planning/PROJECT.md` if exists (existing project context)
   - Read `.planning/CODEBASE.md` if exists (brownfield mappings)
   - Read relevant skill files matching the domain (grep `triggers:` for keywords)
   - Check `.planning/memory/` for patterns from past projects

3. **External research** — Is this a known domain?
   - If domain-specific (e.g., "OAuth", "WebRTC", "Kubernetes"): use WebSearch or WebFetch
   - If library/framework mentioned: check for best practices
   - Document: standard approaches, common pitfalls

**Research output format:**
```markdown
## Research Findings

**Codebase:**
- Found: [files/patterns]
- Relevant to exploration: [how it relates]

**Documentation:**
- Existing project: [yes/no, summary if yes]
- Relevant skills: [list]
- Past patterns: [from memory if available]

**External:**
- Domain knowledge: [what we know about this space]
- Standard approaches: [common solutions]
- Potential pitfalls: [risks to flag]
```

**Critical rule:** Research must complete in under 2 minutes. If deeper research needed, flag as a gap to explore, don't block the conversation.

---

## Section 2: Structured Choice Protocol

**Purpose:** Every user interaction is a selection, not composition.

**Choice format:**
```markdown
[Brief context — 1-2 sentences]

Which describes your situation?
→ [Option A]: [Clear description]
  [Option B]: [Clear description]
  [Option C]: [Clear description]
  [Option D]: Not sure / None of these
```

**Choice design principles:**

1. **Mutually exclusive** — Options shouldn't overlap
2. **Collectively exhaustive** — Include "Other/Not sure" for gaps
3. **Concrete** — Avoid vague options like "It depends"
4. **Actionable** — Each choice should lead to a clear next step
5. **Research-informed** — Reference findings: "Based on [research result], which applies?"

**Arrow keys + Enter implementation:**
- Use adapter.ask_user with choice list
- Each choice has explicit ID for tracking
- Capture selection in exploration state

**Anti-patterns to reject:**
- Open text fields
- "Tell me more" prompts
- Vague options like "Something else"
- Questions requiring user research (that's Polymath's job)

---

## Section 3: Knowledge Gap Detection

**Purpose:** Identify and categorize what's still unknown.

**Gap categories:**

| Category | Description | Example |
|----------|-------------|---------|
| Technical | Stack/technology unknowns | "Which database?" |
| Scope | Feature boundary unclear | "MVP vs full feature?" |
| Constraint | Limitations undefined | "Timeline? Budget?" |
| Dependency | External requirements | "Need API access?" |
| Risk | Potential blockers | "Compliance requirements?" |

**Gap detection workflow:**

1. **Track stated vs implied**
   - User stated: captured in choices selected
   - User implied: inferred from context
   - What's missing: gaps = (what's needed) - (stated + implied)

2. **Surface gaps explicitly**
   ```markdown
   I've captured:
   - [what we know]
   
   Still unclear:
   - [Gap 1]: [category] — [specific question]
   
   Which describes [Gap 1]?
   → [Option A]
     [Option B]
     [Option C]
   ```

3. **Force resolution or acceptance**
   - Every gap must be either: answered, explicitly deferred, or flagged as blocker
   - No "we'll figure it out later" — that's a deferral decision

**Gap resolution patterns:**
- **Answered:** User selects specific option → documented
- **Deferred:** User selects "Decide later" → added to "Deferred Decisions" list
- **Blocker:** User selects "Don't know yet" → may trigger "Park" recommendation

---

## Section 4: Exchange Management

**Purpose:** Keep exploration bounded and purposeful.

**Exchange limit:** Maximum 7 exchanges (research doesn't count as exchange).

**Exchange tracking:**
```yaml
exchange: 3/7
topic: scope-prioritization
previous_choices:
  - exchange-1: greenfield-vs-brownfield → greenfield
  - exchange-2: domain-type → web-application
  - exchange-3: scope-level → [current]
```

**Exchange types:**

| Exchange # | Purpose | Typical Choices |
|------------|---------|-----------------|
| 1 | Orient | Greenfield/brownfield, domain type |
| 2-3 | Clarify | Scope level, key features, constraints |
| 4-5 | Gap fill | Technical stack, timeline, dependencies |
| 6 | Confirm | Verify understanding, surface any final gaps |
| 7 | Decide | Proceed / Explore more / Park |

**Early exit conditions:**
- User explicitly requests exit (save progress option)
- Crystallization achieved early (offer early decision)
- Blocker discovered (recommend park)

---

## Section 5: Crystallization Output

**Purpose:** Produce clear, actionable summary of exploration.

**Output format:** Exploration Summary Document

**Document structure** (saved to `.planning/exploration-{timestamp}.md`):

```markdown
# Exploration Summary — {timestamp}

## Raw Concept
{User's original input}

## Crystallized Summary
{2-3 sentence clear description of what this project actually is}

## Knowns
- [Confirmed fact 1]
- [Confirmed fact 2]
- ...

## Unknowns / Deferred
- [Gap 1]: [category] — [current status: deferred/pending/blocker]
- ...

## Decisions Made
| Choice | Selection | Rationale |
|--------|-----------|-----------|
| [question] | [answer] | [why] |

## Research Applied
- [What was checked]: [what was found]
- ...

## Recommendation
{Polymath's recommendation: proceed, narrow scope, or park}

## Next Action
{Specific next step based on decision}
```

**Decision outcomes:**

| Outcome | Trigger | Next Action |
|---------|---------|-------------|
| **Proceed** | Clear concept, minimal gaps | Transition to `/legion:start` with crystallized input |
| **Explore More** | Specific area needs deeper dive | Start new exploration with narrowed scope |
| **Park** | Too many unknowns, blockers identified | Save summary, suggest prerequisites |

---

## Section 6: Integration Points

**Consumed by:**
- `/legion:explore` command — primary entry point
- Potentially: `/legion:start` (optional pre-start exploration)

**Consumes:**
- `agents/polymath.md` — personality and voice
- `skills/questioning-flow` — choice structure patterns
- `skills/agent-registry` — for domain-specific agent recommendations

**Produces:**
- `.planning/exploration-{timestamp}.md` — exploration artifacts
- Input to `/legion:start` — crystallized project concept

---

## Section 7: State Management

**Exploration state** (maintained in conversation):

```yaml
exploration:
  started_at: timestamp
  raw_concept: string
  exchange_count: number
  exchanges:
    - number: 1
      topic: string
      choices: [options]
      selected: option_id
  knowns: [list]
  gaps: 
    - category: string
      question: string
      status: open|answered|deferred|blocker
  research_findings: string
  decision: pending|proceed|explore_more|park
```

---

**Usage:**
This skill is not invoked directly. The `/legion:explore` command instantiates this engine and the Polymath agent together.
