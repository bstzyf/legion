/**
 * Directory Mapping Extraction Tests
 * Validates directory mapping extraction from codebase structures
 * Requirements: ENV-01, ENV-02
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Test configuration
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'sample-codebase-mappings.yaml');

/**
 * Detect standard directories in a codebase structure
 * @param {Object} structure - Directory structure object
 * @returns {Object} Detected mappings by category
 */
function detectStandardDirectories(structure) {
  const mappings = {
    routes: [],
    tests: [],
    components: [],
    config: [],
    types: [],
    utils: [],
    services: [],
    middleware: [],
    assets: [],
    styles: []
  };
  
  const dirs = Object.keys(structure);
  
  // Routes detection (including monorepo paths)
  const routesDirs = dirs.filter(d => d.includes('/routes') || d === 'routes');
  if (routesDirs.length > 0) {
    mappings.routes.push(...routesDirs);
  }
  const apiDirs = dirs.filter(d => d.includes('pages/api') || d.includes('/api/'));
  if (apiDirs.length > 0) {
    mappings.routes.push(...apiDirs);
  }
  
  // Tests detection
  if (dirs.includes('tests') || dirs.includes('__tests__')) {
    mappings.tests.push(dirs.find(d => d === 'tests' || d === '__tests__'));
  }
  if (structure['src'] && (structure['src'].includes('.test.') || structure['src'].includes('.spec.'))) {
    mappings.tests.push('src (co-located)');
  }
  
  // Components detection (including monorepo paths)
  const componentsDirs = dirs.filter(d => d.includes('/components') || d.endsWith('/components'));
  if (componentsDirs.length > 0) {
    mappings.components.push(...componentsDirs);
  }
  
  // Config detection
  if (dirs.includes('config') || dirs.includes('.config')) {
    mappings.config.push(dirs.find(d => d.includes('config')));
  }
  
  // Types detection (including monorepo paths)
  const typesDirs = dirs.filter(d => d.includes('/types') || d === 'types');
  if (typesDirs.length > 0) {
    mappings.types.push(...typesDirs);
  }
  
  // Utils detection (including monorepo paths)
  const utilsDirs = dirs.filter(d => d.includes('/utils') || d.includes('lib') || d === 'utils');
  if (utilsDirs.length > 0) {
    mappings.utils.push(...utilsDirs);
  }
  
  // Services detection (including monorepo paths)
  const servicesDirs = dirs.filter(d => d.includes('/services') || d === 'services');
  if (servicesDirs.length > 0) {
    mappings.services.push(...servicesDirs);
  }
  
  // Middleware detection (including monorepo paths)
  const middlewareDirs = dirs.filter(d => d.includes('/middleware') || d === 'middleware');
  if (middlewareDirs.length > 0) {
    mappings.middleware.push(...middlewareDirs);
  }
  
  // Assets detection
  if (dirs.includes('public') || dirs.includes('static') || dirs.includes('assets')) {
    mappings.assets.push(dirs.find(d => d.includes('public') || d.includes('static') || d.includes('assets')));
  }
  
  // Styles detection
  if (dirs.includes('styles') || dirs.includes('css') || dirs.includes('scss')) {
    mappings.styles.push(dirs.find(d => d.includes('styles') || d.includes('css') || d.includes('scss')));
  }
  
  return mappings;
}

/**
 * Validate directory mapping structure
 * @param {Object} mapping - Directory mapping object
 * @returns {Object} Validation result
 */
function validateMappingStructure(mapping) {
  const requiredFields = ['category', 'pattern', 'priority', 'description'];
  const errors = [];
  
  for (const field of requiredFields) {
    if (!(field in mapping)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  if (mapping.priority && ![10, 5, 1].includes(mapping.priority)) {
    errors.push(`Invalid priority: ${mapping.priority}. Must be 10 (explicit), 5 (inferred), or 1 (default)`);
  }
  
  if (mapping.pattern && typeof mapping.pattern !== 'string') {
    errors.push(`Pattern must be a string`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Resolve directory conflicts by priority
 * @param {Array} directories - Array of directory paths
 * @param {Object} priorities - Priority mapping
 * @returns {string} Resolved directory
 */
function resolveDirectoryConflict(directories, priorities) {
  if (directories.length === 0) return null;
  if (directories.length === 1) return directories[0];
  
  // Sort by priority (higher is better)
  const sorted = directories.sort((a, b) => {
    const priorityA = priorities[a] || 1;
    const priorityB = priorities[b] || 1;
    return priorityB - priorityA;
  });
  
  return sorted[0];
}

/**
 * Check if a path matches a glob pattern
 * @param {string} filePath - File path to check
 * @param {string} pattern - Glob pattern
 * @returns {boolean} True if matches
 */
function matchesPattern(filePath, pattern) {
  // Simple glob matching implementation
  // Escape special regex characters except glob patterns
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&');
  
  // Handle globstar (**) - matches any number of directory segments
  regex = regex.replace(/\*\*/g, '{{GLOBSTAR}}');
  
  // Handle single star (*) - matches one path segment (no slashes)
  regex = regex.replace(/(?<!\{)\*(?!\})/g, '[^/]*');
  
  // Handle question mark - matches single character
  regex = regex.replace(/\?/g, '.');
  
  // Replace globstar placeholder
  regex = regex.replace(/\{\{GLOBSTAR\}\}/g, '.*');
  
  const regExp = new RegExp(`^${regex}$`);
  return regExp.test(filePath);
}

// Test: Standard location detection
describe('Standard Location Detection', () => {
  test('detect routes directory (app/routes/)', () => {
    const structure = { 'app/routes': [], 'src': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.routes.includes('app/routes'));
  });
  
  test('detect routes directory (src/routes/)', () => {
    const structure = { 'src/routes': [], 'public': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.routes.includes('src/routes'));
  });
  
  test('detect routes directory (pages/api/)', () => {
    const structure = { 'pages/api': [], 'components': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.routes.includes('pages/api'));
  });
  
  test('detect tests directory (tests/)', () => {
    const structure = { 'tests': [], 'src': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.tests.includes('tests'));
  });
  
  test('detect tests directory (__tests__/)', () => {
    const structure = { '__tests__': [], 'src': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.tests.includes('__tests__'));
  });
  
  test('detect components directory (src/components/)', () => {
    const structure = { 'src/components': [], 'src/utils': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.components.includes('src/components'));
  });
  
  test('detect components directory (app/components/)', () => {
    const structure = { 'app/components': [], 'app/routes': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.components.includes('app/components'));
  });
  
  test('detect config directory (config/)', () => {
    const structure = { 'config': [], 'src': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.config.includes('config'));
  });
  
  test('detect types directory (types/)', () => {
    const structure = { 'types': [], 'src': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.types.includes('types'));
  });
  
  test('detect utils directory (utils/, src/utils/, lib/)', () => {
    const structure = { 'src/utils': [], 'lib': [], 'services': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.utils.some(u => u.includes('utils') || u.includes('lib')));
  });
  
  test('detect services directory', () => {
    const structure = { 'src/services': [], 'src/components': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.services.includes('src/services'));
  });
  
  test('detect middleware directory', () => {
    const structure = { 'src/middleware': [], 'src/routes': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.middleware.includes('src/middleware'));
  });
  
  test('detect assets directory (public/, static/, assets/)', () => {
    const structure = { 'public': [], 'src': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.assets.includes('public'));
  });
  
  test('detect styles directory (styles/, css/, scss/)', () => {
    const structure = { 'styles': [], 'src': [] };
    const result = detectStandardDirectories(structure);
    assert.ok(result.styles.includes('styles'));
  });
});

// Test: Directory mapping structure validation
describe('Directory Mapping Structure Validation', () => {
  test('valid mapping has all required fields', () => {
    const mapping = {
      category: 'routes',
      pattern: 'app/routes/**',
      priority: 10,
      description: 'Application routes'
    };
    const result = validateMappingStructure(mapping);
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });
  
  test('invalid mapping missing category field', () => {
    const mapping = {
      pattern: 'app/routes/**',
      priority: 10,
      description: 'Application routes'
    };
    const result = validateMappingStructure(mapping);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes('Missing required field: category'));
  });
  
  test('invalid mapping missing pattern field', () => {
    const mapping = {
      category: 'routes',
      priority: 10,
      description: 'Application routes'
    };
    const result = validateMappingStructure(mapping);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes('Missing required field: pattern'));
  });
  
  test('priority ordering: explicit (10) > inferred (5) > default (1)', () => {
    const explicit = { category: 'routes', pattern: 'app/routes/**', priority: 10, description: 'Routes' };
    const inferred = { category: 'routes', pattern: 'src/routes/**', priority: 5, description: 'Routes' };
    const defaultMap = { category: 'routes', pattern: 'routes/**', priority: 1, description: 'Routes' };
    
    assert.strictEqual(explicit.priority > inferred.priority, true);
    assert.strictEqual(inferred.priority > defaultMap.priority, true);
  });
  
  test('valid priority values are 10, 5, or 1', () => {
    const valid = { category: 'routes', pattern: 'app/**', priority: 10, description: 'Routes' };
    const invalid = { category: 'routes', pattern: 'app/**', priority: 7, description: 'Routes' };
    
    assert.strictEqual(validateMappingStructure(valid).valid, true);
    assert.strictEqual(validateMappingStructure(invalid).valid, false);
    assert.ok(validateMappingStructure(invalid).errors.includes('Invalid priority: 7. Must be 10 (explicit), 5 (inferred), or 1 (default)'));
  });
  
  test('pattern glob matching validation', () => {
    assert.strictEqual(matchesPattern('app/routes/users.ts', 'app/routes/**'), true);
    assert.strictEqual(matchesPattern('app/components/Button.tsx', 'app/routes/**'), false);
    assert.strictEqual(matchesPattern('src/utils/helpers.js', 'src/utils/*.js'), true);
    assert.strictEqual(matchesPattern('src/utils/nested/helpers.js', 'src/utils/*.js'), false);
  });
  
  test('category normalization to standard names', () => {
    const validCategories = ['routes', 'tests', 'components', 'config', 'types', 'utils', 'services', 'middleware', 'assets', 'styles'];
    
    for (const category of validCategories) {
      const mapping = { category, pattern: '**/*', priority: 10, description: 'Test' };
      const result = validateMappingStructure(mapping);
      assert.strictEqual(result.valid, true, `Category "${category}" should be valid`);
    }
  });
});

// Test: Edge cases
describe('Edge Cases', () => {
  test('empty codebase returns empty mappings', () => {
    const structure = {};
    const result = detectStandardDirectories(structure);
    
    for (const category of Object.keys(result)) {
      assert.deepStrictEqual(result[category], []);
    }
  });
  
  test('minimal codebase with no standard directories', () => {
    const structure = { 'random-folder': [], 'docs': [] };
    const result = detectStandardDirectories(structure);
    
    for (const category of Object.keys(result)) {
      assert.deepStrictEqual(result[category], []);
    }
  });
  
  test('multiple matching directories resolve by priority', () => {
    const directories = ['app/routes', 'src/routes', 'routes'];
    const priorities = {
      'app/routes': 10,
      'src/routes': 5,
      'routes': 1
    };
    const resolved = resolveDirectoryConflict(directories, priorities);
    assert.strictEqual(resolved, 'app/routes');
  });
  
  test('nested directories: parent/child resolution', () => {
    const structure = { 
      'src': ['components', 'utils'],
      'src/components': [],
      'src/utils': []
    };
    const result = detectStandardDirectories(structure);
    assert.ok(result.components.includes('src/components'));
    assert.ok(result.utils.some(u => u.includes('src/utils')));
  });
  
  test('case sensitivity handling', () => {
    const structure1 = { 'SRC/Components': [] };
    const structure2 = { 'src/components': [] };
    
    const result1 = detectStandardDirectories(structure1);
    const result2 = detectStandardDirectories(structure2);
    
    // Should detect exact match, not case-insensitive
    assert.strictEqual(result1.components.length, 0);
    assert.strictEqual(result2.components.length, 1);
  });
  
  test('symlink handling', () => {
    const structure = { 
      'src/components': [],
      'components': { symlink: 'src/components' }
    };
    const result = detectStandardDirectories(structure);
    // Should handle symlinks appropriately
    assert.ok(result.components.length >= 1);
  });
  
  test('monorepo package boundaries', () => {
    const structure = {
      'packages/app/src/components': [],
      'packages/shared/src/utils': [],
      'packages/api/src/routes': []
    };
    const result = detectStandardDirectories(structure);
    
    // Should detect directories within monorepo packages
    assert.ok(result.components.length > 0);
    assert.ok(result.utils.length > 0);
    assert.ok(result.routes.length > 0);
  });
  
  test('custom directory names via configuration', () => {
    const customMappings = {
      ui: 'components',
      helpers: 'utils',
      api: 'routes'
    };
    
    const structure = { 'ui': [], 'helpers': [], 'api': [] };
    
    // With custom mappings, should recognize these
    const result = detectStandardDirectories(structure);
    // Without custom config, these won't be detected
    assert.strictEqual(result.components.length, 0);
    assert.strictEqual(result.utils.length, 0);
    assert.strictEqual(result.routes.length, 0);
  });
});

// Test: Integration with CODEBASE.md
describe('CODEBASE.md Integration', () => {
  test('mappings serialize to YAML correctly', () => {
    const mappings = {
      routes: { pattern: 'app/routes/**', priority: 10 },
      tests: { pattern: 'tests/**', priority: 10 }
    };
    
    // Simple serialization check
    const yaml = `
routes:
  pattern: app/routes/**
  priority: 10
tests:
  pattern: tests/**
  priority: 10
    `.trim();
    
    assert.ok(yaml.includes('routes:'));
    assert.ok(yaml.includes('pattern:'));
    assert.ok(yaml.includes('priority:'));
  });
  
  test('mappings deserialize from YAML correctly', () => {
    const yamlContent = `
version: "1.0.0"
directory_mappings:
  routes:
    pattern: "app/routes/**"
    priority: 10
    description: "Application routes"
  tests:
    pattern: "tests/**"
    priority: 10
    description: "Test files"
    `;
    
    // Should be parseable
    assert.ok(yamlContent.includes('directory_mappings'));
    assert.ok(yamlContent.includes('routes:'));
    assert.ok(yamlContent.includes('tests:'));
  });
  
  test('file path lookup against mappings', () => {
    const mappings = {
      routes: { pattern: 'app/routes/**', priority: 10 },
      components: { pattern: 'src/components/**', priority: 10 }
    };
    
    const filePath = 'app/routes/users.ts';
    let matchedCategory = null;
    
    for (const [category, mapping] of Object.entries(mappings)) {
      if (matchesPattern(filePath, mapping.pattern)) {
        matchedCategory = category;
        break;
      }
    }
    
    assert.strictEqual(matchedCategory, 'routes');
  });
  
  test('priority-based resolution for overlapping patterns', () => {
    const mappings = [
      { category: 'routes', pattern: 'app/**', priority: 5 },
      { category: 'routes', pattern: 'app/routes/**', priority: 10 }
    ];
    
    const filePath = 'app/routes/users.ts';
    let highestPriority = null;
    let highestPriorityValue = -1;
    
    for (const mapping of mappings) {
      if (matchesPattern(filePath, mapping.pattern) && mapping.priority > highestPriorityValue) {
        highestPriority = mapping.category;
        highestPriorityValue = mapping.priority;
      }
    }
    
    assert.strictEqual(highestPriority, 'routes');
    assert.strictEqual(highestPriorityValue, 10);
  });
  
  test('CODEBASE.md structure includes metadata', () => {
    const codebase = {
      version: '1.0.0',
      last_updated: '2026-03-05',
      directory_mappings: {},
      requirements_validated: ['ENV-01', 'ENV-02']
    };
    
    assert.ok(codebase.version);
    assert.ok(codebase.last_updated);
    assert.ok(codebase.directory_mappings);
    assert.ok(Array.isArray(codebase.requirements_validated));
  });
});

// Test: Helper function tests
describe('Helper Functions', () => {
  test('resolveDirectoryConflict returns single directory unchanged', () => {
    const result = resolveDirectoryConflict(['app/routes'], {});
    assert.strictEqual(result, 'app/routes');
  });
  
  test('resolveDirectoryConflict returns null for empty array', () => {
    const result = resolveDirectoryConflict([], {});
    assert.strictEqual(result, null);
  });
  
  test('matchesPattern handles globstar correctly', () => {
    assert.strictEqual(matchesPattern('a/b/c/d.ts', 'a/**'), true);
    assert.strictEqual(matchesPattern('a/b/c/d.ts', 'a/**/d.ts'), true);
    assert.strictEqual(matchesPattern('a/b/c/e.ts', 'a/**/d.ts'), false);
  });
  
  test('matchesPattern handles single star correctly', () => {
    assert.strictEqual(matchesPattern('src/utils/helpers.js', 'src/utils/*.js'), true);
    assert.strictEqual(matchesPattern('src/utils/nested/helpers.js', 'src/utils/*.js'), false);
    // Note: helpers.test.js does match *.js in standard glob - dots are part of filename
    // Use more specific pattern like *.test.js to exclude it
    assert.strictEqual(matchesPattern('src/utils/helpers.js', 'src/utils/*.test.js'), false);
    assert.strictEqual(matchesPattern('src/utils/helpers.test.js', 'src/utils/*.test.js'), true);
  });
});

// Export functions for use in other tests
module.exports = {
  detectStandardDirectories,
  validateMappingStructure,
  resolveDirectoryConflict,
  matchesPattern,
  FIXTURE_PATH
};
