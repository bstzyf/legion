---
cli: opencode
cli_display_name: "OpenCode"
version: "1.0"
support_tier: "beta"
capabilities:
  parallel_execution: false
  agent_spawning: true
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: true
detection:
  primary: ".opencode/command/legion-start.md exists in CWD or ~/.config/opencode/command/legion-start.md exists"
  secondary: ".opencode/agent/legion-orchestrator.md exists in CWD or ~/.config/opencode/agent/legion-orchestrator.md exists"
max_prompt_size: 128000
known_quirks:
  - "terminal-ui-only"
  - "sequential-task-tool"
---

# OpenCode Adapter

OpenCode supports native custom commands, custom agents, and read-only exploration. Subagent spawning via the Task tool is available but executes synchronously (blocking) — multiple Task calls in one LLM response run sequentially, not concurrently. Legion installs flat command entry points such as `/legion-start` plus a `legion-orchestrator` subagent. Coordination still happens through `.planning/` artifacts rather than runtime mailboxes.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | Invoke the installed `legion-orchestrator` agent and load the matching Legion workflow from `.legion/commands/legion/`. |
| `spawn_agent_autonomous` | Run the matching installed OpenCode command directly. |
| `spawn_agent_readonly` | Use the built-in Explore agent (`@explore`) — cannot modify files, enforced at the platform level. Provide personality + task in the prompt. |
| `coordinate_parallel` | Not available natively — Task tool executes subagents sequentially (blocking). Execute plans one at a time within each wave. |
| `collect_results` | Each agent writes its structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`. The coordinator reads these files after each wave. |
| `shutdown_agents` | No-op — subagents complete and return naturally. |
| `cleanup_coordination` | No-op — no team infrastructure to clean up. |
| `ask_user` | Print numbered choices in plain text and wait for user input. |
| `model_planning` | User-configured model (e.g., `claude-opus-4-6`, `o3`) |
| `model_execution` | User-configured model (e.g., `claude-sonnet-4-6`, `gpt-5.3-codex`) |
| `model_check` | User-configured model (e.g., `claude-haiku-4-5`, `o3-mini`) |
| `global_config_dir` | `~/.config/opencode/command/` plus `~/.config/opencode/agent/` |
| `plugin_discovery_glob` | `.opencode/command/legion-start.md` and `.opencode/agent/legion-orchestrator.md`, or the matching paths under `~/.config/opencode/` |
| `commit_signature` | `Co-Authored-By: OpenCode <noreply@opencode.ai>` |

## Interaction Protocol

Print numbered choices in plain text and wait for user response:

```
Please choose:
1) Option A — description
2) Option B — description

Enter a number:
```

Parse the integer from the user's response. Re-prompt on invalid input (max 2 retries).

## Execution Protocol

### Phase Initialization

Write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md` for tracking. OpenCode's native task tracking can also be used for visibility.

### Wave Execution

Plans execute sequentially (Task tool is blocking):
1. For each plan in the wave, spawn a subagent via the Task tool
2. Wait for subagent completion before spawning the next
3. Each subagent writes its result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
4. After all plans in the wave complete, parse results and build wave summary

### Read-Only Agents

The built-in Explore agent (`@explore`) enforces read-only at the platform level — it cannot modify files. Use this for `/legion:advise` advisory sessions and plan critique.

### Custom Agent Integration

Legion installs a native `legion-orchestrator` OpenCode agent in `~/.config/opencode/agent/` or `.opencode/agent/`, and flat commands such as `/legion-start` in the matching command directory.

### Result Collection

Read `.planning/phases/{NN}/{NN}-{PP}-RESULT.md` for each plan. Parse Status field. Build wave summary.

### Phase Cleanup

No cleanup needed — subagents complete naturally. Update WAVE-CHECKLIST.md to mark phase as Finalized.

