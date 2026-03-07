'use strict';

/*
 * Lint Commands Tests (Phase 7: Structural Integrity)
 *
 * Validates structural correctness of all command .md files:
 * YAML frontmatter fields, required XML sections, and name consistency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(ROOT, 'commands');

function listCommandFiles() {
  return fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.md')).sort();
}

function parseFrontmatter(text) {
  const parts = text.split(/^---\s*$/m);
  if (parts.length < 3) return null;
  return parts[1];
}

function getField(block, fieldName) {
  const match = block.match(new RegExp(`^${fieldName}:\\s*(.*)`, 'm'));
  return match ? match[1].trim() : null;
}

test.describe('Lint commands: required YAML frontmatter fields', () => {
  const commandFiles = listCommandFiles();

  for (const file of commandFiles) {
    test(`${file} has valid frontmatter`, () => {
      const text = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf8');
      const block = parseFrontmatter(text);

      assert.ok(block !== null, `${file} must have YAML frontmatter between --- delimiters`);

      // name: must exist and match legion:{something}
      const name = getField(block, 'name');
      assert.ok(name !== null, `${file} must have a "name" field`);
      assert.match(name, /^legion:[a-z]+$/, `${file} name "${name}" must match "legion:{command}" pattern`);

      // description: must exist and be non-empty
      const description = getField(block, 'description');
      assert.ok(description !== null, `${file} must have a "description" field`);
      assert.ok(description.length > 0, `${file} description must be non-empty`);

      // allowed-tools: must exist
      const allowedTools = getField(block, 'allowed-tools');
      assert.ok(allowedTools !== null, `${file} must have an "allowed-tools" field`);
      assert.match(allowedTools, /^\[.+\]$/, `${file} allowed-tools must be in inline array format [...]`);
    });
  }
});

test.describe('Lint commands: required XML sections', () => {
  const commandFiles = listCommandFiles();

  for (const file of commandFiles) {
    test(`${file} has required XML sections`, () => {
      const text = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf8');

      // <objective> and </objective> must both be present
      assert.ok(text.includes('<objective>'), `${file} must contain <objective> tag`);
      assert.ok(text.includes('</objective>'), `${file} must contain </objective> tag`);

      // <process> and </process> must both be present
      assert.ok(text.includes('<process>'), `${file} must contain <process> tag`);
      assert.ok(text.includes('</process>'), `${file} must contain </process> tag`);

      // <context> and </context> must both be present
      assert.ok(text.includes('<context>'), `${file} must contain <context> tag`);
      assert.ok(text.includes('</context>'), `${file} must contain </context> tag`);
    });
  }
});

test.describe('Lint commands: name consistency with filename', () => {
  const commandFiles = listCommandFiles();

  for (const file of commandFiles) {
    test(`${file} name field matches filename`, () => {
      const text = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf8');
      const block = parseFrontmatter(text);
      assert.ok(block !== null, `${file} must have frontmatter`);

      const name = getField(block, 'name');
      assert.ok(name !== null, `${file} must have a name field`);

      const expectedName = 'legion:' + file.replace(/\.md$/, '');
      assert.equal(name, expectedName,
        `${file} name "${name}" should match filename-derived "${expectedName}"`);
    });
  }
});

test.describe('Lint commands: no orphan closing tags', () => {
  const commandFiles = listCommandFiles();

  for (const file of commandFiles) {
    test(`${file} has no orphan closing tags`, () => {
      const text = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf8');

      // </objective> without <objective> is orphan
      if (text.includes('</objective>')) {
        assert.ok(text.includes('<objective>'),
          `${file} has </objective> without matching <objective>`);
        // Opening tag must come before closing tag
        assert.ok(text.indexOf('<objective>') < text.indexOf('</objective>'),
          `${file} has <objective> after </objective>`);
      }

      // </process> without <process> is orphan
      if (text.includes('</process>')) {
        assert.ok(text.includes('<process>'),
          `${file} has </process> without matching <process>`);
        assert.ok(text.indexOf('<process>') < text.indexOf('</process>'),
          `${file} has <process> after </process>`);
      }

      // </context> without <context> is orphan
      if (text.includes('</context>')) {
        assert.ok(text.includes('<context>'),
          `${file} has </context> without matching <context>`);
        assert.ok(text.indexOf('<context>') < text.indexOf('</context>'),
          `${file} has <context> after </context>`);
      }
    });
  }
});
