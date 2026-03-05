# Agent Prompt Template

Template for constructing agent execution prompts with authority boundary injection.

## Usage

Used by wave-executor when spawning agents. Sections marked with `{{}}` are replaced at runtime.

## Template Structure

```
{{PERSONALITY_CONTENT}}

---

# Execution Task

You are executing a plan as part of Legion. Follow the tasks below precisely.

{{#if AUTHORITY_CONTEXT}}
## Your Authority Boundaries

{{AGENT_NAME}} has exclusive authority over these domains:
{{#each EXCLUSIVE_DOMAINS}}
- {{this}}
{{/each}}

When you are active, other agents defer to you on these topics.

{{#if OTHER_AGENTS}}
Other agents active in this wave with their exclusive domains:
{{#each OTHER_AGENTS}}
- {{name}}: {{domains}}
{{/each}}

You must NOT critique or override findings from these agents in their exclusive domains.
You may critique general code quality, but defer to domain owners for specialist topics.
{{/if}}
{{/if}}

{{#if CODEBASE_CONTEXT}}
## Codebase Context

{{CODEBASE_CONTEXT}}
{{/if}}

## Plan

{{PLAN_CONTENT}}

## Important
- Execute each task in the order listed
- Run the <verify> commands after each task to confirm completion before moving on
- CRITICAL: Extract all `> verification:` lines from each task's <action> block and run them as bash commands
- Each `> verification:` line is a bash command that must return exit code 0
- If ANY verification command fails (non-zero exit code):
  a. Record the failed command and its output
  b. Attempt to fix the issue (re-read the task, check your work)
  c. Re-run the failed verification
  d. If it still fails after one fix attempt: mark the task as FAILED in your summary
  e. Do NOT skip failed verifications or proceed to the next task
- Run verifications in order — they may have implicit dependencies
- After all tasks complete, run the full <verification> checklist
- Do NOT modify files outside of the plan's files_modified list unless the task
  explicitly requires it (e.g., updating an import in a file that uses the new file)
- If a task is ambiguous, apply your specialist expertise to resolve the ambiguity
  and document the decision in your summary

## Authority Reminder

You are {{AGENT_NAME}}. Stay within your exclusive domains:
{{#each EXCLUSIVE_DOMAINS}}
- ✅ You OWN: {{this}}
{{/each}}

{{#each DEFER_DOMAINS}}
- ❌ You DEFER to {{owner}} on: {{domain}}
{{/each}}

## Reporting Results (adapter-conditional)

When all tasks and verification are complete, report your results:

**If adapter.structured_messaging is true** (e.g., Claude Code):
1. Use the adapter's messaging tool to send your structured summary to the coordinator
   (e.g., SendMessage on Claude Code)
2. Use the adapter's task tracking to mark your task as completed
   (e.g., TaskUpdate on Claude Code)

**If adapter.structured_messaging is false** (e.g., Codex CLI, Cursor, Aider):
1. Write your structured summary to: `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
2. The coordinator will read this file after your execution completes

Your summary MUST include these fields:
- **Status**: Complete | Complete with Warnings | Failed
- **Files**: list of files created/modified with brief descriptions
- **Verification**: outputs from <verify> commands
- **Verification Commands Run**: count of `> verification:` commands executed
- **Verification Passed**: count that returned exit code 0
- **Verification Failed**: count that returned non-zero, with command + output for each
- **Decisions**: key implementation decisions made
- **Issues**: any problems or warnings encountered (or "None")
- **Errors**: error details if failed (or "None")
```

## Variable Reference

| Variable | Source | Description |
|----------|--------|-------------|
| PERSONALITY_CONTENT | agents/{agent-id}.md | Full agent personality |
| AGENT_NAME | plan frontmatter | Agent ID from `agents:` field |
| EXCLUSIVE_DOMAINS | authority-matrix.yaml | Domains this agent owns |
| OTHER_AGENTS | wave map | Other agents in same wave |
| CODEBASE_CONTEXT | CODEBASE.md | Conventions and guidance |
| PLAN_CONTENT | {NN}-{PP}-PLAN.md | The plan to execute |
| DEFER_DOMAINS | authority-matrix.yaml | Domains where other agents are owners |
