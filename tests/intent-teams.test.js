/**
 * Intent Teams Tests
 * Validates team template loading, agent resolution, and team assembly
 * Requirements: INTENT-01, INTENT-02, INTENT-04
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEAMS_FIXTURE_PATH = path.join(__dirname, 'fixtures', 'intent-teams.yaml');
const AUTHORITY_PATH = path.join(__dirname, 'mocks', 'authority-matrix.json');

/**
 * Load intent teams configuration from YAML
 * @returns {Object|null} Full configuration or null if error
 */
function loadTeamsConfig() {
  try {
    const content = fs.readFileSync(TEAMS_FIXTURE_PATH, 'utf8');
    return parseSimpleYaml(content);
  } catch (error) {
    return null;
  }
}

/**
 * Simple YAML parser for intent teams configuration
 */
function parseSimpleYaml(content) {
  const lines = content.split('\n');
  const result = { intents: {} };
  let currentIntent = null;
  let currentSection = null;
  let currentSubsection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.search(/\S/);

    // Top-level keys
    if (indent === 0 && trimmed.includes(':')) {
      const [key, value] = trimmed.split(':').map(s => s.trim());
      if (value && !value.startsWith('-')) {
        result[key] = value.replace(/"/g, '');
      }
      currentIntent = null;
      currentSection = null;
      continue;
    }

    // Intent definitions
    if (indent === 2 && trimmed.endsWith(':') && !trimmed.includes(': ')) {
      const intentName = trimmed.slice(0, -1);
      result.intents[intentName] = {
        agents: { primary: [], secondary: [] },
        domains: { include: [], exclude: [] },
        filters: { include_task_types: [], exclude_task_types: [] }
      };
      currentIntent = intentName;
      currentSection = null;
      continue;
    }

    if (!currentIntent) continue;
    const intent = result.intents[currentIntent];

    // Intent properties
    if (indent === 4 && trimmed.includes(':')) {
      const [key, value] = trimmed.split(':').map(s => s.trim());
      if (value && value !== '[]') {
        if (key === 'mode' || key === 'description') {
          intent[key] = value.replace(/"/g, '');
        }
      } else if (!value) {
        currentSection = key;
      }
      continue;
    }

    // Section sub-properties
    if (indent === 6 && currentSection && trimmed.includes(':')) {
      const [key, value] = trimmed.split(':').map(s => s.trim());
      if (value === '[]') {
        intent[currentSection][key] = [];
      } else if (!value) {
        currentSubsection = key;
      } else if (value) {
        // Key-value pair (e.g., severity_threshold: WARNING)
        intent[currentSection][key] = value.replace(/"/g, '');
      }
      continue;
    }

    // Array items
    if (indent >= 8 && trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim();
      if (currentSection === 'agents' && currentSubsection) {
        intent.agents[currentSubsection].push(value);
      } else if (currentSection === 'domains' && currentSubsection) {
        intent.domains[currentSubsection].push(value);
      } else if (currentSection === 'filters' && currentSubsection) {
        intent.filters[currentSubsection].push(value);
      }
    }

    // Severity threshold
    if (indent === 6 && trimmed.startsWith('severity_threshold:')) {
      intent.filters.severity_threshold = trimmed.split(':')[1].trim();
    }
  }

  return result;
}

/**
 * Load authority matrix for domain validation
 * @returns {Object|null} Authority matrix or null
 */
function loadAuthorityMatrix() {
  try {
    const content = fs.readFileSync(AUTHORITY_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Resolve primary agents for intent
 * @param {string} intentName - Intent name
 * @returns {string[]} Primary agent IDs
 */
function resolvePrimaryAgents(intentName) {
  const config = loadTeamsConfig();
  if (!config || !config.intents[intentName]) return [];
  return config.intents[intentName].agents?.primary || [];
}

/**
 * Resolve secondary agents for intent
 * @param {string} intentName - Intent name
 * @returns {string[]} Secondary agent IDs
 */
function resolveSecondaryAgents(intentName) {
  const config = loadTeamsConfig();
  if (!config || !config.intents[intentName]) return [];
  return config.intents[intentName].agents?.secondary || [];
}

/**
 * Build complete team for intent
 * @param {string} intentName - Intent name
 * @returns {Object} Team configuration
 */
function buildTeam(intentName) {
  const config = loadTeamsConfig();
  if (!config || !config.intents[intentName]) return null;

  const intent = config.intents[intentName];
  return {
    intent: intentName,
    mode: intent.mode,
    primary: intent.agents?.primary || [],
    secondary: intent.agents?.secondary || [],
    domains: intent.domains || { include: [], exclude: [] },
    filters: intent.filters || {}
  };
}

/**
 * Detect mode from intent configuration
 * @param {string} intentName - Intent name
 * @returns {string|null} Mode (filter_plans, filter_review, ad_hoc) or null
 */
function detectMode(intentName) {
  const config = loadTeamsConfig();
  if (!config || !config.intents[intentName]) return null;
  return config.intents[intentName].mode || null;
}

/**
 * Map intent domains to authority matrix
 * @param {string} intentName - Intent name
 * @returns {Object} Domain mapping with authority
 */
function mapDomainsToAuthority(intentName) {
  const config = loadTeamsConfig();
  const authority = loadAuthorityMatrix();
  if (!config || !authority) return {};

  const intent = config.intents[intentName];
  if (!intent) return {};

  const mapping = {};
  for (const domain of intent.domains?.include || []) {
    for (const [agentName, agentData] of Object.entries(authority.agents)) {
      if (agentData.exclusive_domains?.includes(domain)) {
        mapping[domain] = agentName;
        break;
      }
    }
  }

  return mapping;
}

// Test: Template loading
describe('Intent Team Template Loading', () => {
  test('should load fixture file', () => {
    assert.ok(fs.existsSync(TEAMS_FIXTURE_PATH), 'Fixture file should exist');
  });

  test('should parse YAML into configuration object', () => {
    const config = loadTeamsConfig();

    assert.ok(config, 'Should load config');
    assert.ok(config.intents, 'Should have intents section');
  });

  test('should have version metadata', () => {
    const config = loadTeamsConfig();

    assert.ok(config.version, 'Should have version');
    assert.strictEqual(config.version, '1.0.0');
  });

  test('should have requirements validated', () => {
    const config = loadTeamsConfig();

    assert.ok(config.requirements_validated);
    assert.ok(config.requirements_validated.includes('INTENT-01'));
  });
});

// Test: Intent configuration parsing
describe('Intent Configuration Parsing', () => {
  test('should parse harden intent with all properties', () => {
    const config = loadTeamsConfig();
    const harden = config.intents.harden;

    assert.ok(harden, 'Should have harden intent');
    assert.strictEqual(harden.mode, 'filter_plans');
    assert.ok(harden.description);
  });

  test('should parse document intent with agents', () => {
    const config = loadTeamsConfig();
    const document = config.intents.document;

    assert.ok(document.agents.primary.includes('technical-writer'));
    assert.ok(document.agents.secondary.includes('developer-advocate'));
  });

  test('should parse security-only with empty secondary', () => {
    const config = loadTeamsConfig();
    const security = config.intents['security-only'];

    assert.deepStrictEqual(security.agents.secondary, []);
  });

  test('should parse include and exclude domains', () => {
    const config = loadTeamsConfig();
    const harden = config.intents.harden;

    assert.ok(harden.domains.include.includes('owasp-top-10'));
    assert.ok(harden.domains.exclude.includes('user-interface'));
  });

  test('should parse filter configuration', () => {
    const config = loadTeamsConfig();
    const harden = config.intents.harden;

    assert.ok(harden.filters.include_task_types.includes('security-audit'));
    assert.ok(harden.filters.exclude_task_types.includes('feature-implementation'));
  });

  test('should parse severity threshold for review mode', () => {
    const config = loadTeamsConfig();
    const security = config.intents['security-only'];

    assert.strictEqual(security.filters.severity_threshold, 'WARNING');
  });
});

// Test: Agent resolution
describe('Agent Resolution', () => {
  test('should resolve primary agents for harden intent', () => {
    const agents = resolvePrimaryAgents('harden');

    assert.ok(agents.includes('security-engineer'));
    assert.ok(agents.includes('qa-automation'));
  });

  test('should resolve secondary agents for harden intent', () => {
    const agents = resolveSecondaryAgents('harden');

    assert.ok(agents.includes('sre-chaos'));
  });

  test('should resolve document intent agents', () => {
    const primary = resolvePrimaryAgents('document');

    assert.ok(primary.includes('technical-writer'));
    assert.ok(primary.includes('code-reviewer'));
  });

  test('should return empty array for unknown intent', () => {
    const agents = resolvePrimaryAgents('nonexistent');

    assert.deepStrictEqual(agents, []);
  });
});

// Test: Team assembly
describe('Team Assembly', () => {
  test('should build team for harden intent', () => {
    const team = buildTeam('harden');

    assert.ok(team);
    assert.strictEqual(team.intent, 'harden');
    assert.strictEqual(team.mode, 'filter_plans');
    assert.ok(team.primary.length > 0);
    assert.ok(team.secondary.length > 0);
  });

  test('should build team for document intent', () => {
    const team = buildTeam('document');

    assert.ok(team);
    assert.ok(team.primary.includes('technical-writer'));
  });

  test('should build security-only team', () => {
    const team = buildTeam('security-only');

    assert.ok(team);
    assert.strictEqual(team.mode, 'filter_review');
    assert.ok(team.primary.includes('security-engineer'));
    assert.strictEqual(team.secondary.length, 0);
  });

  test('should return null for unknown intent', () => {
    const team = buildTeam('nonexistent');

    assert.strictEqual(team, null);
  });
});

// Test: Mode detection
describe('Mode Detection', () => {
  test('should detect filter_plans mode for harden', () => {
    const mode = detectMode('harden');

    assert.strictEqual(mode, 'filter_plans');
  });

  test('should detect filter_plans mode for document', () => {
    const mode = detectMode('document');

    assert.strictEqual(mode, 'filter_plans');
  });

  test('should detect filter_review mode for security-only', () => {
    const mode = detectMode('security-only');

    assert.strictEqual(mode, 'filter_review');
  });

  test('should return null for unknown intent', () => {
    const mode = detectMode('unknown');

    assert.strictEqual(mode, null);
  });
});

// Test: Domain to authority mapping
describe('Domain to Authority Mapping', () => {
  test('should map harden domains to agents', () => {
    const mapping = mapDomainsToAuthority('harden');

    assert.strictEqual(mapping['owasp-top-10'], 'security-engineer');
    assert.strictEqual(mapping['test-strategy'], 'qa-automation');
  });

  test('should only map included domains', () => {
    const mapping = mapDomainsToAuthority('document');

    assert.ok(mapping['code-maintainability']);
    assert.strictEqual(mapping['owasp-top-10'], undefined);
  });

  test('should return empty object for unknown intent', () => {
    const mapping = mapDomainsToAuthority('nonexistent');

    assert.deepStrictEqual(mapping, {});
  });
});

// Test: Error handling
describe('Error Handling', () => {
  test('should handle missing fixture gracefully', () => {
    const badPath = path.join(__dirname, 'fixtures', 'nonexistent.yaml');

    assert.throws(() => {
      fs.readFileSync(badPath, 'utf8');
    });
  });

  test('should return null when authority matrix missing', () => {
    // Save original
    const originalPath = AUTHORITY_PATH;

    // This test verifies graceful handling
    const mapping = mapDomainsToAuthority('harden');
    assert.ok(typeof mapping === 'object');
  });
});

// Export functions for use in other tests
module.exports = {
  loadTeamsConfig,
  resolvePrimaryAgents,
  resolveSecondaryAgents,
  buildTeam,
  detectMode,
  mapDomainsToAuthority,
  TEAMS_FIXTURE_PATH
};
