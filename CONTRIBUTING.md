# Contributing to Legion

## Development Setup

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed

### Local Testing

Clone the repository and load it as a local plugin:

```bash
git clone https://github.com/9thLevelSoftware/legion.git
cd legion
claude --plugin-dir .
```

As you make changes, restart Claude Code to pick up updates. You can test:
- Commands with `/legion:start`, `/legion:plan 1`, etc.
- Skills are loaded automatically from `skills/{name}/SKILL.md`
- Agents appear in the registry via `skills/agent-registry/SKILL.md`

### Loading Multiple Plugins

If you're developing alongside other plugins:

```bash
claude --plugin-dir ./legion --plugin-dir ./other-plugin
```

## Plugin Structure

```
commands/           11 command entry points (/legion:*)
skills/             18 workflow skills (SKILL.md format)
agents/             51 agent personality files (.md)
scripts/            Validation and maintenance scripts
.claude-plugin/     Plugin manifest + marketplace entry
settings.json       Plugin settings
CLAUDE.md           Project-level instructions
```

### Commands (`commands/`)

Each command is a `.md` file that serves as an entry point for a `/legion:*` slash command. Commands orchestrate skills and spawn agents — they don't contain business logic directly.

### Skills (`skills/{name}/SKILL.md`)

Skills are reusable workflow components. Each skill lives in a directory with a `SKILL.md` file and optional supporting files (templates, references). Skills use frontmatter with `name`, `description`, `triggers`, `token_cost`, and `summary`.

### Agents (`agents/{name}.md`)

Agent personality files define how each AI specialist behaves when spawned. Each file has YAML frontmatter (`name`, `description`, `division`, `color`) followed by the full personality in **Format A** — emoji section headings with "Your" pronouns. See `skills/agent-creator/SKILL.md` for the canonical format specification.

## Adding a New Agent

The easiest way is `/legion:agent` — it guides you through creation and handles validation + registry updates. To add one manually:

1. Create `agents/{division}-{name}.md` with frontmatter:
   ```yaml
   ---
   name: Your Agent Name
   description: One-line description of what this agent does
   division: engineering
   color: blue
   ---
   ```
   - `color` must be one of: red, green, blue, purple, cyan, orange, yellow, pink
   - `division` must be one of: engineering, design, marketing, product, project-management, testing, support, spatial-computing, specialized, custom
2. Write the personality using Format A emoji headings (target 80-350 lines, hard minimum 80 lines). Required sections: `## 🧠 Your Identity & Memory`, `## 🎯 Your Core Mission`, `## 🚨 Critical Rules You Must Follow`, `## 🛠️ Your Technical Deliverables`, `## 🔄 Your Workflow Process`, `## 💭 Your Communication Style`, `## 🔄 Learning & Memory`, `## 🎯 Your Success Metrics`
3. Add the agent to the catalog in `skills/agent-registry/CATALOG.md`
4. Run `bash scripts/validate.sh` to verify schema compliance
5. Test with `/legion:quick "task for your agent"`

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

- **Markdown only** — no custom tooling, no build steps (validation script is the exception)
- **Format A for agents** — emoji headings, "Your" pronouns, target 80-350 line range (hard minimum 80)
- **Named colors only** — red, green, blue, purple, cyan, orange, yellow, pink
- **Kebab-case divisions** — spatial-computing, project-management, not Title Case
- **Default max 3 tasks per plan (configurable)** — keeps work focused and reviewable
- **Full personality injection** — agent files are complete, not fragments
- **Human-readable state** — `.planning/` files are plain markdown

## Validation

Run the validation script to check codebase health:

```bash
bash scripts/validate.sh
node scripts/release-check.js
node --test
```

This checks: version/changelog sync, agent schema + registry sync, heading format, execution-context paths, agent size contract, README metrics sync, and release consistency checks.




