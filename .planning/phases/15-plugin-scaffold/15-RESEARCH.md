# Phase 15: Plugin Scaffold — Research

## Claude Code Plugin Format (March 2026)

### Manifest: `.claude-plugin/plugin.json`

**Location**: `.claude-plugin/plugin.json` — the `.claude-plugin/` subdirectory holds ONLY this file. All other directories go at the plugin root.

**The manifest is optional.** If absent, Claude Code auto-discovers components by convention. We include it for metadata and marketplace compatibility.

**Required fields**: Only `name` (kebab-case, no spaces) — also used as the skill namespace prefix.

**Full schema**:

```json
{
  "name": "plugin-name",
  "version": "1.2.0",
  "description": "Brief plugin description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://github.com/author"
  },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "commands": ["./custom/commands/special.md"],
  "agents": "./custom/agents/",
  "skills": "./custom/skills/",
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json",
  "outputStyles": "./styles/",
  "lspServers": "./.lsp.json"
}
```

Component path fields (`commands`, `agents`, `skills`, etc.) accept string, array, or object. Custom paths **supplement** defaults. All paths must be relative and start with `./`.

### Settings: `settings.json`

**Location**: `settings.json` at plugin root (NOT inside `.claude-plugin/`).

**Only the `agent` key is currently supported**:

```json
{
  "agent": "agent-name"
}
```

This activates one of the plugin's agents as the main thread when the plugin is enabled. Settings in `settings.json` take priority over `settings` in `plugin.json`. Unknown keys are silently ignored.

**For Agency**: The `agent` key makes a single agent the main thread. Agency is a multi-agent orchestration system accessed through commands/skills, not a single-agent tool. The `settings.json` should be present but minimal — an empty object `{}` or with just metadata comments, since activating a single agent would contradict the multi-agent design.

### Expected Directory Structure

```
my-plugin/
├── .claude-plugin/           # Metadata directory (optional)
│   └── plugin.json           # Plugin manifest — ONLY file here
├── commands/                 # Slash commands (.md files)
│   └── status.md
├── agents/                   # Subagent definitions (.md files)
│   └── security-reviewer.md
├── skills/                   # Skills (subdirectory format)
│   ├── code-reviewer/
│   │   └── SKILL.md
│   └── pdf-processor/
│       ├── SKILL.md
│       └── scripts/
├── settings.json             # Default settings
└── ...
```

Key naming rules:
- Skills: `skills/<name>/SKILL.md` — directory name = skill name
- Plugin skills are namespaced: `/plugin-name:skill-name`
- Agents use markdown frontmatter with `name:` and `description:` fields
- Commands in `commands/` produce slash commands

### Testing and Installation

**Local development**: `claude --plugin-dir ./my-plugin` (loads plugin for session without installing)

**Installation CLI**:
```bash
claude plugin install formatter@my-marketplace --scope project
```

**REPL commands**:
```
/plugin marketplace add owner/repo
/plugin install plugin-name@marketplace-name
```

**Important corrections from roadmap**:
- The roadmap says `claude plugin add --plugin-dir .` — the actual command is `claude --plugin-dir .`
- There is no `claude plugin add` CLI command — installation uses `claude plugin install`
- The `github:user/repo` syntax is not official — use `owner/repo` with `/plugin marketplace add`

### Marketplace Distribution

A `marketplace.json` can optionally live alongside `plugin.json` for distributable marketplaces, but a single plugin distributed via GitHub doesn't need one — users add the repo as a marketplace or use `--plugin-dir`.

## Implications for Phase 15

1. **plugin.json** — Include all metadata fields (name, version, description, author, keywords, repository) per PLUG-01. Only `name` is technically required, but full metadata helps discoverability.

2. **settings.json** — Create with empty object `{}`. Agency doesn't use the `agent` key since it's not a single-agent plugin. The file must exist per PLUG-05 to serve as the default config anchor.

3. **Directory structure** — Create `commands/`, `skills/`, `agents/` at plugin root. These are empty placeholders for Phases 16-18 to populate.

4. **Validation** — Test with `claude --plugin-dir .` to verify manifest loads without errors.
