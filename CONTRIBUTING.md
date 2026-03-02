# Contributing to The Agency Workflows

## Development Setup

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed

### Local Testing

Clone the repository and load it as a local plugin:

```bash
git clone https://github.com/9thLevelSoftware/agency-agents.git
cd agency-agents
claude --plugin-dir .
```

As you make changes, restart Claude Code to pick up updates. You can test:
- Commands with `/agency:start`, `/agency:plan 1`, etc.
- Skills are loaded automatically from `skills/{name}/SKILL.md`
- Agents appear in the registry via `skills/agent-registry/SKILL.md`

### Loading Multiple Plugins

If you're developing alongside other plugins:

```bash
claude --plugin-dir ./agency-agents --plugin-dir ./other-plugin
```

## Plugin Structure

```
commands/           9 command entry points (/agency:*)
skills/             15 workflow skills (SKILL.md format)
agents/             51 agent personality files (.md)
.claude-plugin/     Plugin manifest + marketplace entry
settings.json       Plugin settings
CLAUDE.md           Project-level instructions
```

### Commands (`commands/`)

Each command is a `.md` file that serves as an entry point for an `/agency:*` slash command. Commands orchestrate skills and spawn agents — they don't contain business logic directly.

### Skills (`skills/{name}/SKILL.md`)

Skills are reusable workflow components. Each skill lives in a directory with a `SKILL.md` file and optional supporting files (templates, references). Skills have `name` and `description` frontmatter.

### Agents (`agents/{name}.md`)

Agent personality files define how each AI specialist behaves when spawned. Each file has YAML frontmatter with `name`, `description`, and `division` fields, followed by the full personality description including expertise, communication style, hard rules, and quirks.

## Adding a New Agent

1. Create `agents/{division}-{name}.md` with frontmatter:
   ```yaml
   ---
   name: Your Agent Name
   description: One-line description of what this agent does
   division: Division Name
   ---
   ```
2. Write the personality (80-120 lines recommended): expertise, style, rules, quirks
3. Add the agent to the catalog in `skills/agent-registry/SKILL.md`
4. Test with `/agency:quick "task for your agent"`

## Adding a New Skill

1. Create `skills/{skill-name}/SKILL.md` with frontmatter:
   ```yaml
   ---
   name: skill-name
   description: What this skill does and when to use it
   ---
   ```
2. Write the skill logic following existing skill patterns
3. Reference from commands via `<execution_context>`

## Adding a New Command

1. Create `commands/{name}.md`
2. Include `<execution_context>` declarations for any skills the command uses
3. Follow the existing command pattern: objective → context → step-by-step process

## Code Style

- **Markdown only** — no custom tooling, no scripts, no build steps
- **Max 3 tasks per plan** — keeps work focused and reviewable
- **Full personality injection** — agent files are complete, not fragments
- **Human-readable state** — `.planning/` files are plain markdown
