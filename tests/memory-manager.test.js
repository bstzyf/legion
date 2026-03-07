'use strict';

/*
 * Memory Manager Spec Validation (Phase 6: Recommendation Engine v2, Plan 06-02)
 *
 * Validates that the memory-manager SKILL.md specification contains required
 * sections, rules, and schema definitions for task_type validation and
 * archetype grouping. The memory-manager is a markdown specification, NOT
 * executable code — these tests parse the document structure.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILL_PATH = path.join(ROOT, 'skills', 'memory-manager', 'SKILL.md');

const skillText = fs.readFileSync(SKILL_PATH, 'utf8');

test('schema_has_task_type_column: OUTCOMES.md schema includes Task Type column', () => {
  // The schema definition line in Section 2 must contain Task Type as a column
  const schemaLine = /\|\s*ID\s*\|.*\|\s*Task Type\s*\|/i;
  assert.match(skillText, schemaLine, 'OUTCOMES.md schema must include Task Type column');

  // Field definitions table must document Task Type
  const fieldDef = /\|\s*Task Type\s*\|/;
  assert.match(skillText, fieldDef, 'Field definitions must document Task Type');
});

test('store_has_task_type_validation: Store operation contains task_type validation rules', () => {
  // Section 3 must contain task_type validation step
  assert.match(
    skillText,
    /task_type MUST be populated/i,
    'Store operation must require task_type population'
  );

  // Must document fallback to "general"
  assert.match(
    skillText,
    /fallback.*"general"|"general".*fallback/i,
    'Store operation must document "general" as fallback task_type'
  );

  // Must reference CATALOG.md for valid task types
  assert.match(
    skillText,
    /CATALOG\.md/,
    'Store operation must reference CATALOG.md for valid task types'
  );
});

test('store_inference_chain_complete: task_type inference chain is fully documented', () => {
  // Must document the three-level inference chain:
  // 1. execution-tracker provides task_type
  // 2. agent's CATALOG.md entry (first Task Type)
  // 3. "general" fallback

  assert.match(
    skillText,
    /execution-tracker/i,
    'Inference chain must reference execution-tracker as primary source'
  );

  assert.match(
    skillText,
    /CATALOG\.md.*Task Type|agent.*CATALOG/i,
    'Inference chain must reference agent CATALOG.md lookup as fallback'
  );

  assert.match(
    skillText,
    /Fallback 2|fallback.*"general"/i,
    'Inference chain must document "general" as final fallback'
  );

  // Verify the chain is ordered (Primary before Fallback 1 before Fallback 2)
  const primaryIdx = skillText.indexOf('Primary: use the task_type passed by the execution-tracker');
  const fallback1Idx = skillText.indexOf('Fallback 1:');
  const fallback2Idx = skillText.indexOf('Fallback 2:');
  assert.ok(primaryIdx > 0, 'Primary inference step must exist');
  assert.ok(fallback1Idx > primaryIdx, 'Fallback 1 must come after Primary');
  assert.ok(fallback2Idx > fallback1Idx, 'Fallback 2 must come after Fallback 1');
});

test('recall_has_archetype_grouping: Recall operation documents archetypeScores', () => {
  // Must contain archetypeScores structure documentation
  assert.match(
    skillText,
    /archetypeScores/,
    'Recall operation must document archetypeScores'
  );

  // Must document required fields in the archetype structure
  const requiredFields = ['agents', 'successRate', 'totalOutcomes', 'avgImportance', 'topAgent'];
  for (const field of requiredFields) {
    assert.match(
      skillText,
      new RegExp(field),
      `archetypeScores must include ${field} field`
    );
  }

  // Must document grouping by Task Type
  assert.match(
    skillText,
    /[Gg]roup.*[Bb]y.*Task Type|Group by Task Type/,
    'archetypeScores must be grouped by Task Type'
  );

  // Must document that archetypeScores is returned alongside memoryScores
  assert.match(
    skillText,
    /alongside.*memoryScores|memoryScores/i,
    'archetypeScores must be documented as returned alongside memoryScores'
  );
});

test('recall_recency_decay_documented: Recency decay rules are present in recall', () => {
  // Section 4 or Section 5 must contain the decay formula
  assert.match(
    skillText,
    /recency_weight/,
    'Recall operation must reference recency_weight'
  );

  // Must document the four decay tiers
  assert.match(skillText, /days_old\s*<=\s*7.*1\.0/s, 'Must document 7-day tier with weight 1.0');
  assert.match(skillText, /days_old\s*<=\s*30.*0\.7/s, 'Must document 30-day tier with weight 0.7');
  assert.match(skillText, /days_old\s*<=\s*90.*0\.4/s, 'Must document 90-day tier with weight 0.4');
  assert.match(skillText, /days_old\s*>\s*90.*0\.1/s, 'Must document 90+ day tier with weight 0.1');

  // Must document decay_score formula
  assert.match(
    skillText,
    /decay_score\s*=\s*importance.*recency_weight/,
    'Must document decay_score = importance * recency_weight'
  );
});
