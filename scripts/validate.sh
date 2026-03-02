#!/usr/bin/env bash
# validate.sh — Health check for the Agency Workflows codebase
# Usage: bash scripts/validate.sh
# Exit 0 if all checks pass, 1 if any fail.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$REPO_ROOT/agents"
SKILLS_DIR="$REPO_ROOT/skills"
COMMANDS_DIR="$REPO_ROOT/commands"
REGISTRY="$SKILLS_DIR/agent-registry/CATALOG.md"

PASS=0
FAIL=0
WARN=0

# ── helpers ──────────────────────────────────────────────────────────────────

pass()  { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail()  { echo "  FAIL  $1"; FAIL=$((FAIL + 1)); }
warn()  { echo "  WARN  $1"; WARN=$((WARN + 1)); }
header(){ echo ""; echo "=== $1 ==="; }

# Extract the value of a YAML frontmatter field (case-insensitive key match).
# Usage: frontmatter_field <file> <field>
frontmatter_field() {
  local file="$1" field="$2"
  awk -v field="$field" '
    /^---$/ { if (NR==1) { in_fm=1; next } else { in_fm=0 } }
    in_fm && tolower($0) ~ "^" tolower(field) ":" {
      sub(/^[^:]+:[[:space:]]*/, ""); print; exit
    }
  ' "$file"
}

# ── Check 1: Agent frontmatter schema ────────────────────────────────────────

header "CHECK 1 — Agent frontmatter schema"

VALID_COLORS="red green blue purple cyan orange yellow pink"
VALID_DIVISIONS="engineering design marketing product project-management testing support spatial-computing specialized custom"

for f in "$AGENTS_DIR"/*.md; do
  base="$(basename "$f")"
  errors=()

  name=$(frontmatter_field "$f" "name")
  desc=$(frontmatter_field "$f" "description")
  div=$(frontmatter_field "$f" "division")
  color=$(frontmatter_field "$f" "color")

  [[ -z "$name"  ]] && errors+=("missing 'name'")
  [[ -z "$desc"  ]] && errors+=("missing 'description'")
  [[ -z "$div"   ]] && errors+=("missing 'division'")
  [[ -z "$color" ]] && errors+=("missing 'color'")

  if [[ -n "$color" ]]; then
    lcolor=$(echo "$color" | tr '[:upper:]' '[:lower:]')
    valid=0
    for c in $VALID_COLORS; do [[ "$lcolor" == "$c" ]] && valid=1 && break; done
    [[ $valid -eq 0 ]] && errors+=("invalid color '$color'")
  fi

  if [[ -n "$div" ]]; then
    ldiv=$(echo "$div" | tr '[:upper:]' '[:lower:]')
    valid=0
    for d in $VALID_DIVISIONS; do [[ "$ldiv" == "$d" ]] && valid=1 && break; done
    [[ $valid -eq 0 ]] && errors+=("invalid division '$div'")
  fi

  if [[ ${#errors[@]} -eq 0 ]]; then
    pass "$base"
  else
    fail "$base — $(IFS=', '; echo "${errors[*]}")"
  fi
done

# ── Check 2: Agent-registry sync ─────────────────────────────────────────────

header "CHECK 2 — Agent-registry sync"

# Every agents/ file must appear in registry
for f in "$AGENTS_DIR"/*.md; do
  base="$(basename "$f" .md)"
  if grep -q "$base" "$REGISTRY" 2>/dev/null; then
    pass "$base — found in registry"
  else
    fail "$base — NOT found in registry"
  fi
done

# Every agents/ path mentioned in registry must resolve to an actual file
while IFS= read -r line; do
  # Match table rows containing agents/ paths like `agents/foo.md`
  if [[ "$line" =~ agents/([a-zA-Z0-9_-]+\.md) ]]; then
    agent_file="${BASH_REMATCH[1]}"
    if [[ -f "$AGENTS_DIR/$agent_file" ]]; then
      pass "registry → $agent_file exists"
    else
      fail "registry → $agent_file MISSING on disk"
    fi
  fi
done < "$REGISTRY"

# ── Check 3: Heading format (🧠 Identity + 🎯 Mission) ───────────────────────

header "CHECK 3 — Required emoji headings (🧠 Identity, 🎯 Mission)"

for f in "$AGENTS_DIR"/*.md; do
  base="$(basename "$f")"
  errors=()

  # Use grep with -P for Unicode; fall back to plain grep if not available
  if ! grep -qP '##.*🧠' "$f" 2>/dev/null; then
    if ! grep -q '## .*🧠\|##.*🧠' "$f" 2>/dev/null; then
      errors+=("missing 🧠 heading")
    fi
  fi

  if ! grep -qP '##.*🎯' "$f" 2>/dev/null; then
    if ! grep -q '## .*🎯\|##.*🎯' "$f" 2>/dev/null; then
      errors+=("missing 🎯 heading")
    fi
  fi

  if [[ ${#errors[@]} -eq 0 ]]; then
    pass "$base"
  else
    fail "$base — $(IFS=', '; echo "${errors[*]}")"
  fi
done

# ── Check 4: Skill path resolution ───────────────────────────────────────────

header "CHECK 4 — Skill path resolution in <execution_context> blocks"

for cmd in "$COMMANDS_DIR"/*.md; do
  cmdbase="$(basename "$cmd")"
  in_block=0

  while IFS= read -r line; do
    if [[ "$line" == "<execution_context>" ]]; then
      in_block=1
      continue
    fi
    if [[ "$line" == "</execution_context>" ]]; then
      in_block=0
      continue
    fi
    if [[ $in_block -eq 1 && -n "$line" ]]; then
      # line is like: skills/foo/SKILL.md
      full_path="$REPO_ROOT/$line"
      if [[ -f "$full_path" ]]; then
        pass "$cmdbase → $line"
      else
        fail "$cmdbase → $line MISSING"
      fi
    fi
  done < "$cmd"
done

# ── Check 5: Minimum agent size (80 lines) ───────────────────────────────────

header "CHECK 5 — Minimum agent size (warning if < 80 lines)"

for f in "$AGENTS_DIR"/*.md; do
  base="$(basename "$f")"
  lines=$(wc -l < "$f")
  if [[ $lines -lt 80 ]]; then
    warn "$base — only $lines lines (thin agent)"
  else
    pass "$base — $lines lines"
  fi
done

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════"
echo "  SUMMARY"
echo "  PASS: $PASS   FAIL: $FAIL   WARN: $WARN"
echo "════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  echo "  Result: FAILED ($FAIL issue(s) require attention)"
  exit 1
else
  echo "  Result: ALL CHECKS PASSED"
  exit 0
fi
