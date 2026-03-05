/**
 * Intent Flag Parsing Tests
 * Validates intent flag detection and parsing for /legion:build and /legion:review
 * Requirements: INTENT-01, INTENT-02, INTENT-03, INTENT-04, INTENT-05, INTENT-06
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEAMS_FIXTURE_PATH = path.join(__dirname, 'fixtures', 'intent-teams.yaml');

/**
 * Parse command line arguments to extract intent flags
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed intent flags
 */
function parseIntentFlags(args) {
  const flags = {
    intent: null,
    skipPatterns: [],
    filters: {}
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Single intent flags
    if (arg === '--just-harden') {
      flags.intent = 'harden';
    } else if (arg === '--just-document') {
      flags.intent = 'document';
    } else if (arg === '--just-security') {
      flags.intent = 'security-only';
    }
    
    // Skip flags
    else if (arg === '--skip-frontend') {
      flags.skipPatterns.push('*.tsx', '*.jsx', '*.css', 'frontend/**');
      flags.filters.skipFrontend = true;
    } else if (arg === '--skip-backend') {
      flags.skipPatterns.push('*.py', '*.java', 'api/**', 'server/**');
      flags.filters.skipBackend = true;
    }
    
    // Pattern flags with values
    else if (arg.startsWith('--skip-pattern=')) {
      const pattern = arg.split('=')[1];
      if (pattern) {
        flags.skipPatterns.push(pattern.replace(/"/g, ''));
      }
    }
    
    // Flag with space separator (e.g., --skip-pattern "*.test.js")
    else if (arg === '--skip-pattern' && i + 1 < args.length) {
      flags.skipPatterns.push(args[++i].replace(/"/g, ''));
    }
  }
  
  return flags;
}

/**
 * Simple YAML parser for intent teams configuration
 * Parses the specific YAML format used in intent-teams.yaml
 * @param {string} content - YAML content
 * @returns {Object} Parsed configuration
 */
function parseSimpleYaml(content) {
  const lines = content.split('\n');
  const result = { intents: {} };
  let currentIntent = null;
  let currentSection = null;
  let currentSubsection = null;
  let indentStack = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const indent = line.search(/\S/);
    
    // Top-level keys (version, last_updated, etc.)
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
    
    // Section sub-properties (agents, domains, filters)
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
    
    // Severity threshold (special case)
    if (indent === 6 && trimmed.startsWith('severity_threshold:')) {
      intent.filters.severity_threshold = trimmed.split(':')[1].trim();
    }
  }
  
  return result;
}

/**
 * Load intent teams configuration from YAML
 * @param {string} intentName - Name of the intent to load
 * @returns {Object|null} Intent configuration or null if not found
 */
function loadIntentConfig(intentName) {
  try {
    const content = fs.readFileSync(TEAMS_FIXTURE_PATH, 'utf8');
    const config = parseSimpleYaml(content);
    return config.intents[intentName] || null;
  } catch (error) {
    return null;
  }
}

// Test: Basic flag detection
describe('Intent Flag Detection', () => {
  test('should detect --just-harden flag', () => {
    const args = ['node', 'script.js', '--just-harden'];
    const result = parseIntentFlags(args);
    
    assert.strictEqual(result.intent, 'harden');
  });
  
  test('should detect --just-document flag', () => {
    const args = ['node', 'script.js', '--just-document'];
    const result = parseIntentFlags(args);
    
    assert.strictEqual(result.intent, 'document');
  });
  
  test('should detect --just-security flag', () => {
    const args = ['node', 'script.js', '--just-security'];
    const result = parseIntentFlags(args);
    
    assert.strictEqual(result.intent, 'security-only');
  });
  
  test('should detect --skip-frontend flag', () => {
    const args = ['node', 'script.js', '--skip-frontend'];
    const result = parseIntentFlags(args);
    
    assert.ok(result.filters.skipFrontend);
    assert.ok(result.skipPatterns.includes('*.tsx'));
    assert.ok(result.skipPatterns.includes('*.jsx'));
  });
  
  test('should detect --skip-backend flag', () => {
    const args = ['node', 'script.js', '--skip-backend'];
    const result = parseIntentFlags(args);
    
    assert.ok(result.filters.skipBackend);
    assert.ok(result.skipPatterns.includes('*.py'));
    assert.ok(result.skipPatterns.includes('api/**'));
  });
});

// Test: Flag combination parsing
describe('Flag Combination Parsing', () => {
  test('should parse multiple flags in single command', () => {
    const args = ['node', 'script.js', '--just-harden', '--skip-frontend'];
    const result = parseIntentFlags(args);
    
    assert.strictEqual(result.intent, 'harden');
    assert.ok(result.filters.skipFrontend);
  });
  
  test('should parse flags in any order', () => {
    const args1 = ['node', 'script.js', '--skip-frontend', '--just-harden'];
    const args2 = ['node', 'script.js', '--just-harden', '--skip-frontend'];
    
    const result1 = parseIntentFlags(args1);
    const result2 = parseIntentFlags(args2);
    
    assert.strictEqual(result1.intent, result2.intent);
    assert.strictEqual(result1.filters.skipFrontend, result2.filters.skipFrontend);
  });
  
  test('should handle flags with equals syntax', () => {
    const args = ['node', 'script.js', '--skip-pattern=*.test.js'];
    const result = parseIntentFlags(args);
    
    assert.ok(result.skipPatterns.includes('*.test.js'));
  });
  
  test('should handle flags with space separator', () => {
    const args = ['node', 'script.js', '--skip-pattern', '*.test.js'];
    const result = parseIntentFlags(args);
    
    assert.ok(result.skipPatterns.includes('*.test.js'));
  });
  
  test('should handle multiple skip patterns', () => {
    const args = ['node', 'script.js', 
      '--skip-pattern', '*.test.js',
      '--skip-pattern', '*.spec.ts',
      '--skip-pattern=*.md'
    ];
    const result = parseIntentFlags(args);
    
    assert.ok(result.skipPatterns.includes('*.test.js'));
    assert.ok(result.skipPatterns.includes('*.spec.ts'));
    assert.ok(result.skipPatterns.includes('*.md'));
    assert.strictEqual(result.skipPatterns.length, 3);
  });
  
  test('should strip quotes from pattern values', () => {
    const args = ['node', 'script.js', '--skip-pattern="*.test.js"'];
    const result = parseIntentFlags(args);
    
    assert.ok(result.skipPatterns.includes('*.test.js'));
    assert.ok(!result.skipPatterns.includes('"*.test.js"'));
  });
});

// Test: Edge cases
describe('Edge Cases and Error Handling', () => {
  test('should return null intent when no intent flags provided', () => {
    const args = ['node', 'script.js'];
    const result = parseIntentFlags(args);
    
    assert.strictEqual(result.intent, null);
  });
  
  test('should handle empty arguments', () => {
    const args = [];
    const result = parseIntentFlags(args);
    
    assert.strictEqual(result.intent, null);
    assert.deepStrictEqual(result.skipPatterns, []);
  });
  
  test('should ignore unknown flags gracefully', () => {
    const args = ['node', 'script.js', '--just-harden', '--unknown-flag'];
    const result = parseIntentFlags(args);
    
    assert.strictEqual(result.intent, 'harden');
  });
  
  test('should be case sensitive for flags', () => {
    const args = ['node', 'script.js', '--JUST-HARDEN'];
    const result = parseIntentFlags(args);
    
    assert.strictEqual(result.intent, null);
  });
  
  test('should handle flags with underscores instead of dashes', () => {
    const args = ['node', 'script.js', '--just_harden'];
    const result = parseIntentFlags(args);
    
    // Should not recognize underscore version
    assert.strictEqual(result.intent, null);
  });
  
  test('should handle missing pattern value gracefully', () => {
    const args = ['node', 'script.js', '--skip-pattern'];
    const result = parseIntentFlags(args);
    
    assert.deepStrictEqual(result.skipPatterns, []);
  });
  
  test('should handle empty pattern value', () => {
    const args = ['node', 'script.js', '--skip-pattern='];
    const result = parseIntentFlags(args);
    
    // Empty string might be added, but should be handled
    assert.ok(result.skipPatterns.length <= 1);
  });
});

// Test: Intent configuration loading
describe('Intent Configuration Loading', () => {
  test('should load fixture file', () => {
    assert.ok(fs.existsSync(TEAMS_FIXTURE_PATH), 'Fixture file should exist');
  });
  
  test('should load harden intent configuration', () => {
    const config = loadIntentConfig('harden');
    
    assert.ok(config, 'Should load harden intent');
    assert.strictEqual(config.mode, 'filter_plans');
    assert.ok(config.agents.primary.includes('security-engineer'));
    assert.ok(config.agents.primary.includes('qa-automation'));
  });
  
  test('should load document intent configuration', () => {
    const config = loadIntentConfig('document');
    
    assert.ok(config, 'Should load document intent');
    assert.strictEqual(config.mode, 'filter_plans');
    assert.ok(config.agents.primary.includes('technical-writer'));
  });
  
  test('should load security-only intent configuration', () => {
    const config = loadIntentConfig('security-only');
    
    assert.ok(config, 'Should load security-only intent');
    assert.strictEqual(config.mode, 'filter_review');
    assert.ok(config.agents.primary.includes('security-engineer'));
    assert.deepStrictEqual(config.agents.secondary, []);
  });
  
  test('should return null for unknown intent', () => {
    const config = loadIntentConfig('nonexistent-intent');
    
    assert.strictEqual(config, null);
  });
  
  test('should have valid domains in harden intent', () => {
    const config = loadIntentConfig('harden');
    
    assert.ok(config.domains.include.includes('owasp-top-10'));
    assert.ok(config.domains.include.includes('test-strategy'));
    assert.ok(config.domains.exclude.includes('user-interface'));
  });
  
  test('should have filter configuration', () => {
    const config = loadIntentConfig('harden');
    
    assert.ok(config.filters.include_task_types);
    assert.ok(config.filters.include_task_types.includes('security-audit'));
    assert.ok(config.filters.exclude_task_types.includes('feature-implementation'));
  });
});

// Test: Flag to intent mapping
describe('Flag to Intent Mapping', () => {
  test('--just-harden maps to harden intent', () => {
    const args = ['--just-harden'];
    const result = parseIntentFlags(args);
    const config = loadIntentConfig(result.intent);
    
    assert.strictEqual(result.intent, 'harden');
    assert.ok(config.agents.primary.includes('security-engineer'));
  });
  
  test('--just-document maps to document intent', () => {
    const args = ['--just-document'];
    const result = parseIntentFlags(args);
    const config = loadIntentConfig(result.intent);
    
    assert.strictEqual(result.intent, 'document');
    assert.ok(config.agents.primary.includes('technical-writer'));
  });
  
  test('--just-security maps to security-only intent', () => {
    const args = ['--just-security'];
    const result = parseIntentFlags(args);
    const config = loadIntentConfig(result.intent);
    
    assert.strictEqual(result.intent, 'security-only');
    assert.strictEqual(config.mode, 'filter_review');
  });
});

// Export functions for use in other tests
module.exports = {
  parseIntentFlags,
  loadIntentConfig,
  TEAMS_FIXTURE_PATH
};
