'use strict';

/**
 * Adapter Schema Conformance Tests
 *
 * Validates all 9 adapter .md files against the ADAPTER.md specification.
 * Checks: CLI identity, capabilities, detection, max_prompt_size,
 * known_quirks, required markdown sections, and tool mappings completeness.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ADAPTERS_DIR = path.join(ROOT, 'adapters');

const VALID_SUPPORT_TIERS = ['certified', 'beta', 'experimental'];

const CAPABILITY_FLAGS = [
  'parallel_execution',
  'agent_spawning',
  'structured_messaging',
  'native_task_tracking',
  'read_only_agents',
];

const REQUIRED_TOOL_CONCEPTS = [
  'spawn_agent_personality',
  'spawn_agent_autonomous',
  'spawn_agent_readonly',
  'coordinate_parallel',
  'collect_results',
  'ask_user',
  'model_planning',
  'model_execution',
  'model_check',
];

// --- Adapter file discovery ---

function listAdapterFiles() {
  return fs
    .readdirSync(ADAPTERS_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'ADAPTER.md')
    .sort();
}

// --- YAML frontmatter parser (regex-based, no external dependencies) ---

function parseAdapterFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  // Find frontmatter between --- delimiters
  let start = -1;
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (start === -1) start = i;
      else {
        end = i;
        break;
      }
    }
  }
  if (start === -1 || end === -1) {
    throw new Error(`No YAML frontmatter found in ${filePath}`);
  }

  const fm = {};
  let currentNested = null;
  let quirksArray = null;

  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    // Handle indented items for capabilities/detection
    if (currentNested && /^ {2}/.test(line)) {
      const kv = line.trim().match(/^([a-z_]+):\s*(.*)/);
      if (kv) {
        let val = kv[2].trim().replace(/^"|"$/g, '');
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        fm[currentNested][kv[1]] = val;
      }
      continue;
    }

    // Handle known_quirks array items
    if (quirksArray !== null && /^ {2}-/.test(line)) {
      quirksArray.push(
        line
          .trim()
          .slice(2)
          .trim()
          .replace(/^"|"$/g, '')
      );
      continue;
    }

    // Flush quirks if we hit a non-indented line
    if (quirksArray !== null) {
      fm.known_quirks = quirksArray;
      quirksArray = null;
    }
    currentNested = null;

    // Top-level key
    const topMatch = line.match(/^([a-z_]+):\s*(.*)/);
    if (topMatch) {
      const key = topMatch[1];
      const val = topMatch[2].trim();
      if (key === 'capabilities' || key === 'detection') {
        currentNested = key;
        fm[key] = {};
      } else if (key === 'known_quirks') {
        if (val === '[]') {
          fm.known_quirks = [];
        } else {
          quirksArray = [];
        }
      } else if (key === 'max_prompt_size') {
        fm[key] = parseInt(val, 10);
      } else {
        fm[key] = val.replace(/^"|"$/g, '');
      }
    }
  }

  // Flush any trailing quirks array
  if (quirksArray !== null) fm.known_quirks = quirksArray;

  return fm;
}

// --- Get markdown body (after frontmatter) ---

function getMarkdownBody(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const parts = text.split(/^---\s*$/m);
  // parts[0] is before first ---, parts[1] is frontmatter, parts[2+] is body
  if (parts.length < 3) return '';
  return parts.slice(2).join('---');
}

// --- Tests ---

const adapterFiles = listAdapterFiles();

describe('Adapter Conformance: YAML Frontmatter - CLI Identity', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const fm = parseAdapterFrontmatter(filePath);

      test('cli is a non-empty string', () => {
        assert.equal(typeof fm.cli, 'string', `${file}: cli must be a string`);
        assert.ok(fm.cli.length > 0, `${file}: cli must be non-empty`);
      });

      test('cli_display_name is a non-empty string', () => {
        assert.equal(
          typeof fm.cli_display_name,
          'string',
          `${file}: cli_display_name must be a string`
        );
        assert.ok(
          fm.cli_display_name.length > 0,
          `${file}: cli_display_name must be non-empty`
        );
      });

      test('version is a non-empty string', () => {
        assert.equal(typeof fm.version, 'string', `${file}: version must be a string`);
        assert.ok(fm.version.length > 0, `${file}: version must be non-empty`);
      });

      test('support_tier is one of certified, beta, experimental', () => {
        assert.ok(
          VALID_SUPPORT_TIERS.includes(fm.support_tier),
          `${file}: support_tier "${fm.support_tier}" must be one of ${VALID_SUPPORT_TIERS.join(', ')}`
        );
      });
    });
  }
});

describe('Adapter Conformance: YAML Frontmatter - Capabilities', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const fm = parseAdapterFrontmatter(filePath);

      for (const flag of CAPABILITY_FLAGS) {
        test(`capabilities.${flag} is a boolean`, () => {
          assert.ok(
            fm.capabilities && typeof fm.capabilities[flag] === 'boolean',
            `${file}: capabilities.${flag} must be a boolean (got ${fm.capabilities?.[flag]})`
          );
        });
      }
    });
  }
});

describe('Adapter Conformance: YAML Frontmatter - Detection', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const fm = parseAdapterFrontmatter(filePath);

      test('detection.primary is a non-empty string', () => {
        assert.ok(
          fm.detection && typeof fm.detection.primary === 'string' && fm.detection.primary.length > 0,
          `${file}: detection.primary must be a non-empty string`
        );
      });

      test('detection.secondary is a non-empty string', () => {
        assert.ok(
          fm.detection &&
            typeof fm.detection.secondary === 'string' &&
            fm.detection.secondary.length > 0,
          `${file}: detection.secondary must be a non-empty string`
        );
      });
    });
  }
});

describe('Adapter Conformance: YAML Frontmatter - Limits & Quirks', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const fm = parseAdapterFrontmatter(filePath);

      test('max_prompt_size is a positive integer', () => {
        assert.equal(
          typeof fm.max_prompt_size,
          'number',
          `${file}: max_prompt_size must be a number`
        );
        assert.ok(
          Number.isInteger(fm.max_prompt_size) && fm.max_prompt_size > 0,
          `${file}: max_prompt_size must be a positive integer (got ${fm.max_prompt_size})`
        );
      });

      test('known_quirks is an array', () => {
        assert.ok(
          Array.isArray(fm.known_quirks),
          `${file}: known_quirks must be an array (got ${typeof fm.known_quirks})`
        );
      });

      test('known_quirks entries are lowercase-hyphenated strings', () => {
        const quirks = fm.known_quirks || [];
        for (const q of quirks) {
          assert.equal(typeof q, 'string', `${file}: known_quirks entry must be a string`);
          assert.ok(q.length > 0, `${file}: known_quirks entry must be non-empty`);
          assert.match(
            q,
            /^[a-z0-9-]+$/,
            `${file}: known_quirks entry "${q}" must match lowercase-hyphenated format`
          );
        }
      });
    });
  }
});

describe('Adapter Conformance: Required Markdown Sections', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const body = getMarkdownBody(filePath);

      test('contains Tool Mappings heading', () => {
        assert.match(
          body,
          /^#+\s+.*Tool Mappings/im,
          `${file}: missing "Tool Mappings" heading`
        );
      });

      test('contains Interaction Protocol heading', () => {
        assert.match(
          body,
          /^#+\s+.*Interaction Protocol/im,
          `${file}: missing "Interaction Protocol" heading`
        );
      });

      test('contains Execution Protocol heading', () => {
        assert.match(
          body,
          /^#+\s+.*Execution Protocol/im,
          `${file}: missing "Execution Protocol" heading`
        );
      });
    });
  }
});

describe('Adapter Conformance: Tool Mappings Completeness', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const body = getMarkdownBody(filePath);

      for (const concept of REQUIRED_TOOL_CONCEPTS) {
        test(`contains tool mapping for ${concept}`, () => {
          assert.ok(
            body.includes(concept),
            `${file}: missing tool mapping for "${concept}"`
          );
        });
      }
    });
  }
});

describe('Adapter Conformance: Cross-adapter Consistency', () => {
  test('exactly 9 adapter files exist (excluding ADAPTER.md)', () => {
    assert.equal(
      adapterFiles.length,
      9,
      `Expected 9 adapter files, found ${adapterFiles.length}: ${adapterFiles.join(', ')}`
    );
  });

  test('all adapter cli values are unique', () => {
    const cliValues = [];
    for (const file of adapterFiles) {
      const fm = parseAdapterFrontmatter(path.join(ADAPTERS_DIR, file));
      cliValues.push(fm.cli);
    }
    const unique = new Set(cliValues);
    assert.equal(
      unique.size,
      cliValues.length,
      `Duplicate cli values found: ${cliValues.join(', ')}`
    );
  });
});
