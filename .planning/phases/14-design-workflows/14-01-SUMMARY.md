# Plan 14-01 Summary: Design Workflows Skill

**Status:** Complete
**Wave:** 1
**Requirements:** DSN-01, DSN-02, DSN-03

## What Was Done

### Task 1: Created design-workflows.md (706 lines)
- **Section 1**: Principles & Design Domain Detection — 6 principles, 3-signal detection heuristic (DSN-* IDs, keywords, agent signal), constants, discipline-agent mapping, graceful degradation
- **Section 2**: Design System Workflow (DSN-01) — design brief questioning (Q1-Q5), document generation, team assembly, token taxonomy (3-tier), atomic design components, lifecycle
- **Section 3**: UX Research Workflow (DSN-02) — research planning, 8 methodologies, deliverables (personas, journey maps, recommendations), report generation, research-to-design handoff
- **Section 4**: Design Review Cycle (DSN-03) — three-lens review (brand/accessibility/usability), 7 finding categories, 3 review checklists (22 items total), review-loop integration, cross-discipline consistency
- **Section 5**: Design Document Formats — design system template, UX research report template, status values, multiple documents
- **Section 6**: Integration Patterns — plan/build/review integration, 6-rule caller contract, references table

### Task 2: Updated workflow-common.md
- Added `Design Documents` row to State File Locations table
- Added `## Design Workflow Conventions` section with lifecycle, paths, wave pattern, integration points, and graceful degradation rule

## Verification (8/8 passing)
- design-workflows.md: 706 lines, 6 sections, YAML frontmatter, DESIGN_DIR constant, graceful degradation, discipline mapping, three-lens review
- workflow-common.md: Design Workflow Conventions section, 4 designs/ references, Design Documents row

## Files Created/Modified
- **Created:** `.claude/skills/agency/design-workflows.md` (706 lines)
- **Modified:** `.claude/skills/agency/workflow-common.md` (+2 additions)
