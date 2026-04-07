#!/usr/bin/env node
'use strict';

/**
 * generate-knowledge-index.js
 *
 * Scans agents/ and skills/ directories to produce the compressed Dynamic
 * Knowledge Index block used in AGENTS.md and CLAUDE.md.
 *
 * Based on Vercel's Context Engineering research:
 * https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
 *
 * Usage:
 *   node scripts/generate-knowledge-index.js          # prints to stdout
 *   node scripts/generate-knowledge-index.js --patch   # patches AGENTS.md and CLAUDE.md in-place
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');
const SKILLS_DIR = path.join(ROOT, 'skills');

// --- Division detection from filename prefix ---

const DIVISION_MAP = {
  'engineering-': 'engineering',
  'design-': 'design',
  'marketing-': 'marketing',
  'product-': 'product',
  'testing-': 'testing',
  'project-management-': 'project-management',
  'project-manager-': 'project-management',
  'support-': 'support',
  'macos-': 'spatial',
  'terminal-': 'spatial',
  'visionos-': 'spatial',
  'xr-': 'spatial',
  'agents-': 'specialized',
  'data-': 'specialized',
  'lsp-': 'specialized',
  'polymath': 'specialized',
};

// --- Skill category detection ---

const SKILL_CATEGORIES = {
  core: /^workflow-common/,
  planning: /^(phase-decomposer|plan-critique|spec-pipeline)$/,
  execution: /^(wave-executor|execution-tracker|cli-dispatch)$/,
  review: /^(review-loop|review-panel|review-evaluators|security-review)$/,
  agents: /^(agent-registry|agent-creator|authority-enforcer)$/,
  integration: /^(github-sync|hooks-integration)$/,
  intelligence: /^(codebase-mapper|intent-router|polymath-engine)$/,
  tracking: /^(memory-manager|milestone-tracker|portfolio-manager)$/,
  domain: /^(design-workflows|marketing-workflows)$/,
  governance: /^board-of-directors$/,
  deployment: /^ship-pipeline$/,
  onboarding: /^questioning-flow$/,
};

function classifyAgent(filename) {
  const name = filename.replace(/\.md$/, '');
  for (const [prefix, division] of Object.entries(DIVISION_MAP)) {
    if (name.startsWith(prefix) || name === prefix.replace(/-$/, '')) {
      return division;
    }
  }
  return 'uncategorized';
}

function classifySkill(dirname) {
  for (const [category, pattern] of Object.entries(SKILL_CATEGORIES)) {
    if (pattern.test(dirname)) return category;
  }
  return 'uncategorized';
}

function scanAgents() {
  const files = fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  const divisions = {};
  for (const file of files) {
    const div = classifyAgent(file);
    if (!divisions[div]) divisions[div] = [];
    divisions[div].push(file);
  }
  return divisions;
}

function scanSkills() {
  const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  const categories = {};
  for (const dir of dirs) {
    const skillFile = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const cat = classifySkill(dir);
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(`${dir}/SKILL.md`);
  }
  return categories;
}

function buildIndex() {
  const agents = scanAgents();
  const skills = scanSkills();
  const totalAgents = Object.values(agents).reduce((sum, arr) => sum + arr.length, 0);
  const totalSkills = Object.values(skills).reduce((sum, arr) => sum + arr.length, 0);

  const lines = [];

  lines.push('## Dynamic Knowledge Index');
  lines.push('');
  lines.push('IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for Agent Personas, Skills, and Workflows. When assigned a specific agent persona (e.g., during `/legion:build`, `/legion:review`, `/legion:quick`, or `/legion:advise`), or when a workflow skill is loaded, use the `Read` tool to read their exact markdown file from the index below before generating any code, plans, or reviews. Do NOT rely on pre-trained knowledge about what an agent does \u2014 the personality file IS the source of truth.');
  lines.push('');
  lines.push('```');

  // Agents index
  lines.push('[Legion Agents Index]|root: {AGENTS_DIR} (resolve via workflow-common-core Agent Path Resolution)');
  const divisionOrder = [
    'engineering', 'design', 'marketing', 'product', 'testing',
    'project-management', 'support', 'spatial', 'specialized',
  ];
  for (const div of divisionOrder) {
    const files = agents[div];
    if (!files || files.length === 0) continue;
    lines.push(`|${div}:{${files.join(',')}}`);
  }

  // Uncategorized agents (safety net)
  if (agents.uncategorized && agents.uncategorized.length > 0) {
    lines.push(`|uncategorized:{${agents.uncategorized.join(',')}}`);
    console.error(`WARNING: ${agents.uncategorized.length} uncategorized agent(s): ${agents.uncategorized.join(', ')}`);
  }

  lines.push('');

  // Skills index
  lines.push('[Legion Skills Index]|root: ./skills');
  const categoryOrder = [
    'core', 'planning', 'execution', 'review', 'agents',
    'integration', 'intelligence', 'tracking', 'domain',
    'governance', 'deployment', 'onboarding',
  ];
  for (const cat of categoryOrder) {
    const files = skills[cat];
    if (!files || files.length === 0) continue;
    lines.push(`|${cat}:{${files.join(',')}}`);
  }

  // Uncategorized skills (safety net)
  if (skills.uncategorized && skills.uncategorized.length > 0) {
    lines.push(`|uncategorized:{${skills.uncategorized.join(',')}}`);
    console.error(`WARNING: ${skills.uncategorized.length} uncategorized skill(s): ${skills.uncategorized.join(', ')}`);
  }

  lines.push('```');

  console.error(`Index generated: ${totalAgents} agents across ${divisionOrder.filter(d => agents[d]?.length).length} divisions, ${totalSkills} skills across ${categoryOrder.filter(c => skills[c]?.length).length} categories`);

  return lines.join('\n');
}

function patchFile(filePath, indexBlock) {
  const content = fs.readFileSync(filePath, 'utf8');
  const startMarker = '## Dynamic Knowledge Index';
  const endMarker = '## Workflow';

  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.error(`Could not find index markers in ${filePath}. Add the section manually first.`);
    return false;
  }

  const before = content.substring(0, startIdx);
  const after = content.substring(endIdx);
  const patched = before + indexBlock + '\n\n' + after;

  fs.writeFileSync(filePath, patched, 'utf8');
  console.error(`Patched: ${filePath}`);
  return true;
}

// --- Main ---

const indexBlock = buildIndex();

if (process.argv.includes('--patch')) {
  const agentsMd = path.join(ROOT, 'AGENTS.md');
  const claudeMd = path.join(ROOT, 'CLAUDE.md');

  let ok = true;
  if (fs.existsSync(agentsMd)) ok = patchFile(agentsMd, indexBlock) && ok;
  if (fs.existsSync(claudeMd)) ok = patchFile(claudeMd, indexBlock) && ok;

  if (ok) {
    console.error('All files patched successfully.');
  } else {
    console.error('Some files could not be patched — check errors above.');
    process.exit(1);
  }
} else {
  console.log(indexBlock);
}
