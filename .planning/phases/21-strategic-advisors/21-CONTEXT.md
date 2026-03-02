# Phase 21: Strategic Advisors — Context

## Phase Goal

Users can type `/agency:advise architecture` (or UX, business, marketing, etc.) and get a read-only consultation session with the most relevant agent from the 51-agent pool, without risk of code modification.

## Requirements Covered

- **ADV-01**: `/agency:advise` command spawns read-only consultation agents from the 51 agent pool based on topic (architecture, UX, business, marketing, etc.)
- **ADV-02**: Advisory agents operate in explicit read-only mode — can explore codebase and read files but cannot modify anything

## Success Criteria

1. `/agency:advise` command exists and accepts a topic argument (architecture, UX, business, marketing, testing, etc.)
2. The command uses agent-registry recommendation to select the most relevant agent for the given topic
3. The selected agent is spawned with its full personality but restricted to read-only tools (Read, Glob, Grep, WebSearch, WebFetch — no Write, Edit, Bash)
4. Advisory session is interactive — agent can ask clarifying questions and explore the codebase to inform recommendations

## Existing Assets

### Already Correct
- `skills/agent-registry/SKILL.md` — Full catalog of 51 agents with task-type tags and recommendation algorithm (Section 3)
- `skills/workflow-common/SKILL.md` — Personality injection pattern, cost profile conventions, state file locations
- `agents/` — All 51 agent `.md` files with valid frontmatter (name, description, division)
- `commands/quick.md` — Closest command pattern: lightweight, single-agent, personality-injected

### Dependencies
- Phase 19 (Registry Integration) — completed 2026-03-02. Agent-registry correctly resolves all 51 agent paths.

## Design Decisions

### Command Structure
Model after `/agency:quick` — lightweight, single-agent, no phase state modification. Key differences:
- **Read-only tool set**: `allowed-tools: [Read, Grep, Glob, Agent, AskUserQuestion]` (no Write, Edit, Bash)
- **Explore subagent**: Use `subagent_type: "Explore"` instead of `"general-purpose"` — Explore agents cannot Write or Edit, enforcing read-only at the tool level
- **No commit step**: Advisory sessions produce no file changes
- **Interactive follow-up**: After initial advice, offer to continue the conversation or switch topics

### Agent Selection
Use agent-registry Section 3 (Recommendation Algorithm) with topic-as-task-description:
- Parse topic argument as the "task description"
- Match against task-type tags in agent catalog
- Recommend top 1-2 candidates (single advisor, not team)
- User confirms or overrides via AskUserQuestion

### Read-Only Enforcement (ADV-02)
Three-layer enforcement:
1. **Command level**: `allowed-tools` excludes Write, Edit, Bash — the orchestrating command cannot modify files
2. **Subagent level**: `subagent_type: "Explore"` removes Write, Edit from the spawned agent's available tools
3. **Prompt level**: Advisory prompt explicitly states "You are in READ-ONLY advisory mode. Do not attempt to modify files."

### Cost Profile
- **Sonnet** for the advisory agent — advisory consultation is substantive enough to warrant Sonnet quality, not heavy enough for Opus

### Topic Categories
Not hardcoded — the recommendation algorithm handles arbitrary topics. But the command's help text will list common examples:
- architecture, backend, frontend, API design
- UX, design, branding, accessibility
- business, strategy, executive summary
- marketing, content, social media, growth
- testing, QA, performance, security
- product, trends, feedback
- DevOps, infrastructure, deployment
- mobile, spatial computing, XR

## Plan Structure

- **Plan 21-01** (Wave 1, 2 tasks): Create advise command file, update project state
