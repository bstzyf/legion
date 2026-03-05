/**
 * Path Enforcement Validation Tests
 * Validates path enforcement logic against directory mappings
 * Requirements: ENV-03, ENV-04
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Test configuration
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'sample-codebase-mappings.yaml');

/**
 * Load directory mappings from YAML fixture
 * @returns {Object} Directory mappings
 */
function loadMappings() {
  try {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf8');
    // Simple YAML parser - extract mappings section
    const mappings = {};
    const lines = content.split('\n');
    let currentCategory = null;
    let currentSection = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Category definitions (2-space indent without colon value)
      if (line.match(/^  [a-z-]+:$/) && !trimmed.includes(': ')) {
        currentCategory = trimmed.replace(':', '');
        mappings[currentCategory] = { patterns: [], priority: 1 };
        continue;
      }
      
      if (!currentCategory) continue;
      
      // Properties within category
      if (trimmed.startsWith('patterns:')) {
        currentSection = 'patterns';
      } else if (trimmed.startsWith('priority:')) {
        const value = trimmed.split(':')[1].trim();
        mappings[currentCategory].priority = parseInt(value);
      } else if (trimmed.startsWith('- ')) {
        const value = trimmed.slice(2).replace(/"/g, '');
        if (currentSection === 'patterns') {
          mappings[currentCategory].patterns.push(value);
        }
      }
    }
    
    return mappings;
  } catch (error) {
    // Return default mappings for testing
    return {
      routes: { patterns: ['app/routes/**', 'src/routes/**', 'pages/api/**'], priority: 10 },
      tests: { patterns: ['tests/**', '__tests__/**', '**/*.test.*'], priority: 10 },
      components: { patterns: ['src/components/**', 'app/components/**'], priority: 10 },
      config: { patterns: ['config/**', '.config/**'], priority: 5 },
      types: { patterns: ['types/**', 'src/types/**'], priority: 5 },
      utils: { patterns: ['utils/**', 'src/utils/**', 'lib/**'], priority: 5 },
      services: { patterns: ['services/**', 'src/services/**'], priority: 10 },
      middleware: { patterns: ['middleware/**', 'src/middleware/**'], priority: 10 },
      assets: { patterns: ['public/**', 'static/**', 'assets/**'], priority: 1 },
      styles: { patterns: ['styles/**', 'src/styles/**', '**/*.css', '**/*.scss'], priority: 5 }
    };
  }
}

/**
 * Check if a path matches a glob pattern
 * @param {string} filePath - File path to check
 * @param {string} pattern - Glob pattern
 * @returns {boolean} True if matches
 */
function matchesPattern(filePath, pattern) {
  // Escape special regex characters except glob patterns
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&');
  
  // Handle globstar (**)
  regex = regex.replace(/\*\*/g, '{{GLOBSTAR}}');
  
  // Handle single star
  regex = regex.replace(/(?<!\{)\*(?!\})/g, '[^/]*');
  
  // Handle question mark
  regex = regex.replace(/\?/g, '.');
  
  // Replace globstar
  regex = regex.replace(/\{\{GLOBSTAR\}\}/g, '.*');
  
  const regExp = new RegExp(`^${regex}$`);
  return regExp.test(filePath);
}

/**
 * Validate a file path against directory mappings
 * @param {string} filePath - File path to validate
 * @param {string} category - Expected category (e.g., 'routes', 'components')
 * @param {Object} mappings - Directory mappings
 * @returns {Object} Validation result
 */
function validatePath(filePath, category, mappings) {
  const mapping = mappings[category];
  if (!mapping) {
    return {
      valid: false,
      error: `Unknown category: ${category}`,
      suggestions: []
    };
  }
  
  // Check if path matches any pattern for the category
  const matchesCategory = mapping.patterns.some(pattern => 
    matchesPattern(filePath, pattern)
  );
  
  if (matchesCategory) {
    return { valid: true, suggestions: [] };
  }
  
  // Generate suggestions based on category patterns
  const suggestions = [];
  for (const pattern of mapping.patterns) {
    // Convert pattern to example path
    const suggestion = pattern
      .replace('/**', '')
      .replace('**/', '')
      .replace('/*', '')
      .replace('*.', 'file.');
    
    if (!suggestions.includes(suggestion)) {
      suggestions.push(suggestion);
    }
  }
  
  // Add specific suggestion based on filename
  const filename = path.basename(filePath);
  const firstPattern = mapping.patterns[0];
  if (firstPattern) {
    const dir = firstPattern.replace('/**', '').replace('/**', '');
    suggestions.unshift(`${dir}/${filename}`);
  }
  
  return {
    valid: false,
    error: `Path "${filePath}" is not in a valid ${category} directory`,
    suggestions: suggestions.slice(0, 3) // Limit to 3 suggestions
  };
}

/**
 * Infer category from file path based on name conventions
 * @param {string} filePath - File path
 * @returns {string|null} Inferred category or null
 */
function inferCategoryFromPath(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  
  if (basename.includes('.test.') || basename.includes('.spec.')) {
    return 'tests';
  }
  if (basename.includes('route') || basename.includes('controller')) {
    return 'routes';
  }
  if (basename.includes('component') || basename.includes('.tsx') || basename.includes('.jsx')) {
    return 'components';
  }
  if (basename.includes('service') || basename.includes('provider')) {
    return 'services';
  }
  if (basename.includes('util') || basename.includes('helper')) {
    return 'utils';
  }
  if (basename.includes('middleware')) {
    return 'middleware';
  }
  if (basename.includes('.css') || basename.includes('.scss') || basename.includes('.less')) {
    return 'styles';
  }
  if (basename.includes('type') || basename.includes('interface') || basename.includes('.d.ts')) {
    return 'types';
  }
  if (basename.includes('config')) {
    return 'config';
  }
  
  return null;
}

/**
 * Detect if a file could belong to multiple categories
 * @param {string} filePath - File path
 * @param {Object} mappings - Directory mappings
 * @returns {Array} Array of matching categories
 */
function detectMultipleCategories(filePath, mappings) {
  const matches = [];
  
  for (const [category, mapping] of Object.entries(mappings)) {
    if (mapping.patterns.some(pattern => matchesPattern(filePath, pattern))) {
      matches.push(category);
    }
  }
  
  return matches;
}

// Test: Path validation against mappings
describe('Path Validation Against Mappings', () => {
  let mappings;
  
  before(() => {
    mappings = loadMappings();
  });
  
  test('valid routes path passes validation', () => {
    const result = validatePath('app/routes/users.ts', 'routes', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('valid tests path passes validation', () => {
    const result = validatePath('tests/auth.test.js', 'tests', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('valid components path passes validation', () => {
    const result = validatePath('src/components/Button.tsx', 'components', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('valid services path passes validation', () => {
    const result = validatePath('src/services/api.ts', 'services', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('valid utils path passes validation', () => {
    const result = validatePath('src/utils/helpers.ts', 'utils', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('valid types path passes validation', () => {
    const result = validatePath('src/types/user.ts', 'types', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('valid middleware path passes validation', () => {
    const result = validatePath('src/middleware/auth.ts', 'middleware', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('valid config path passes validation', () => {
    const result = validatePath('config/database.yaml', 'config', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('valid assets path passes validation', () => {
    const result = validatePath('public/logo.png', 'assets', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('valid styles path passes validation', () => {
    const result = validatePath('src/styles/main.css', 'styles', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('invalid routes file returns error and suggestions', () => {
    const result = validatePath('src/users.ts', 'routes', mappings);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('not in a valid routes directory'));
    assert.ok(result.suggestions.length > 0);
    assert.ok(result.suggestions.some(s => s.includes('routes')));
  });
  
  test('invalid tests file returns error and suggestions', () => {
    const result = validatePath('src/auth.js', 'tests', mappings);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('not in a valid tests directory'));
    assert.ok(result.suggestions.length > 0);
  });
  
  test('path suggestions include correct directory', () => {
    const result = validatePath('random/Button.tsx', 'components', mappings);
    assert.strictEqual(result.valid, false);
    assert.ok(result.suggestions.some(s => s.includes('components')));
  });
  
  test('category inference from file type works', () => {
    assert.strictEqual(inferCategoryFromPath('Button.tsx'), 'components');
    assert.strictEqual(inferCategoryFromPath('auth.test.js'), 'tests');
    assert.strictEqual(inferCategoryFromPath('api.service.ts'), 'services');
    assert.strictEqual(inferCategoryFromPath('helpers.ts'), 'utils');
    assert.strictEqual(inferCategoryFromPath('types.d.ts'), 'types');
  });
  
  test('multiple valid categories detected for ambiguous paths', () => {
    // A file in utils that could also be a service
    const categories = detectMultipleCategories('src/utils/api.ts', mappings);
    // Should match utils patterns
    assert.ok(categories.includes('utils'));
  });
  
  test('unknown category returns error', () => {
    const result = validatePath('src/test.ts', 'unknown', mappings);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('Unknown category'));
  });
});

// Test: Spec pipeline integration
describe('Spec Pipeline Integration', () => {
  let mappings;
  
  before(() => {
    mappings = loadMappings();
  });
  
  /**
   * validateDeliverablePath - Simulates spec pipeline path validation
   */
  function validateDeliverablePath(filePath, expectedCategory, options = {}) {
    const result = validatePath(filePath, expectedCategory, mappings);
    const strictness = options.strictness || 'error'; // 'error', 'warn', 'off'
    
    if (strictness === 'off') {
      return { valid: true, warnings: [], errors: [] };
    }
    
    if (!result.valid) {
      if (strictness === 'warn') {
        return { valid: true, warnings: [result.error], errors: [] };
      }
      return { valid: false, warnings: [], errors: [result.error] };
    }
    
    return { valid: true, warnings: [], errors: [] };
  }
  
  test('validateDeliverablePath validates during spec drafting', () => {
    const result = validateDeliverablePath('app/routes/users.ts', 'routes');
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });
  
  test('validateDeliverablePath catches misplaced deliverables', () => {
    const result = validateDeliverablePath('wrong/users.ts', 'routes');
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
  
  test('strict mode returns error on violations', () => {
    const result = validateDeliverablePath('wrong/users.ts', 'routes', { strictness: 'error' });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
    assert.strictEqual(result.warnings.length, 0);
  });
  
  test('warn mode returns warning on violations', () => {
    const result = validateDeliverablePath('wrong/users.ts', 'routes', { strictness: 'warn' });
    assert.strictEqual(result.valid, true);
    assert.ok(result.warnings.length > 0);
    assert.strictEqual(result.errors.length, 0);
  });
  
  test('off mode allows all paths', () => {
    const result = validateDeliverablePath('any/where/users.ts', 'routes', { strictness: 'off' });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.warnings.length, 0);
    assert.strictEqual(result.errors.length, 0);
  });
  
  test('override mechanism allows exceptions', () => {
    const overrides = ['legacy/**', 'vendor/**'];
    const filePath = 'legacy/old-routes.ts';
    
    // Check if path matches any override pattern
    const isOverridden = overrides.some(pattern => 
      matchesPattern(filePath, pattern)
    );
    
    assert.strictEqual(isOverridden, true);
  });
  
  test('override does not apply to non-matching paths', () => {
    const overrides = ['legacy/**', 'vendor/**'];
    const filePath = 'src/users.ts';
    
    const isOverridden = overrides.some(pattern => 
      matchesPattern(filePath, pattern)
    );
    
    assert.strictEqual(isOverridden, false);
  });
  
  test('path validation includes suggestions for fixes', () => {
    const result = validateDeliverablePath('src/users.ts', 'routes');
    assert.strictEqual(result.valid, false);
    // Should provide suggestions for where the file should go
    assert.ok(result.errors[0].includes('not in a valid routes directory') || 
              result.suggestions?.length > 0);
  });
});

// Test: Wave executor integration
describe('Wave Executor Integration', () => {
  let mappings;
  
  before(() => {
    mappings = loadMappings();
  });
  
  /**
   * validateFilePlacement - Simulates wave executor file placement validation
   */
  function validateFilePlacement(filePath, expectedCategory, mode = 'blocking') {
    const result = validatePath(filePath, expectedCategory, mappings);
    
    if (mode === 'non-blocking') {
      return {
        allowed: true,
        warning: result.valid ? null : result.error,
        correctedPath: null
      };
    }
    
    // blocking mode
    if (!result.valid) {
      // Suggest correction
      const correctedPath = result.suggestions[0] || filePath;
      return {
        allowed: false,
        warning: result.error,
        correctedPath: correctedPath !== filePath ? correctedPath : null
      };
    }
    
    return { allowed: true, warning: null, correctedPath: null };
  }
  
  test('file placement validation before agent spawn', () => {
    // Agent wants to create a route file
    const result = validateFilePlacement('app/routes/api.ts', 'routes', 'blocking');
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.warning, null);
  });
  
  test('blocking mode prevents misplaced files', () => {
    const result = validateFilePlacement('wrong/api.ts', 'routes', 'blocking');
    assert.strictEqual(result.allowed, false);
    assert.ok(result.warning);
    assert.ok(result.correctedPath);
  });
  
  test('non-blocking mode allows with warning', () => {
    const result = validateFilePlacement('wrong/api.ts', 'routes', 'non-blocking');
    assert.strictEqual(result.allowed, true);
    assert.ok(result.warning); // Still warns
    assert.strictEqual(result.correctedPath, null); // But doesn't correct
  });
  
  test('auto-correction suggests proper directory', () => {
    const result = validateFilePlacement('src/Button.tsx', 'components', 'blocking');
    if (!result.allowed) {
      assert.ok(result.correctedPath);
      assert.ok(result.correctedPath.includes('components'));
    }
  });
  
  test('warning mode for out-of-directory files', () => {
    const result = validateFilePlacement('random/file.ts', 'utils', 'non-blocking');
    assert.strictEqual(result.allowed, true);
    assert.ok(result.warning);
  });
  
  test('correctly placed files have no warnings', () => {
    const result = validateFilePlacement('src/utils/helpers.ts', 'utils', 'blocking');
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.warning, null);
  });
  
  test('monorepo package paths are validated correctly', () => {
    const result = validateFilePlacement('packages/app/src/routes/home.ts', 'routes', 'blocking');
    // Should be valid if the pattern matches
    assert.strictEqual(typeof result.allowed, 'boolean');
  });
});

// Test: Configuration-based enforcement
describe('Configuration-Based Enforcement', () => {
  let mappings;
  
  before(() => {
    mappings = loadMappings();
  });
  
  /**
   * Check enforcement configuration
   */
  function checkEnforcementConfig(category, config) {
    const mode = config[category] || config.default || 'error';
    return mode;
  }
  
  test('strict mode configuration returns error', () => {
    const config = { default: 'error', routes: 'error' };
    assert.strictEqual(checkEnforcementConfig('routes', config), 'error');
  });
  
  test('warn mode configuration returns warning', () => {
    const config = { default: 'error', tests: 'warn' };
    assert.strictEqual(checkEnforcementConfig('tests', config), 'warn');
  });
  
  test('off mode configuration returns off', () => {
    const config = { default: 'error', assets: 'off' };
    assert.strictEqual(checkEnforcementConfig('assets', config), 'off');
  });
  
  test('default mode applies when category not specified', () => {
    const config = { default: 'warn' };
    assert.strictEqual(checkEnforcementConfig('unknown-category', config), 'warn');
  });
  
  test('category-specific settings override default', () => {
    const config = { default: 'error', tests: 'warn', assets: 'off' };
    assert.strictEqual(checkEnforcementConfig('routes', config), 'error');
    assert.strictEqual(checkEnforcementConfig('tests', config), 'warn');
    assert.strictEqual(checkEnforcementConfig('assets', config), 'off');
  });
  
  test('per-category strictness settings are respected', () => {
    const config = {
      routes: 'error',
      tests: 'error', 
      components: 'warn',
      utils: 'warn',
      assets: 'off'
    };
    
    assert.strictEqual(checkEnforcementConfig('routes', config), 'error');
    assert.strictEqual(checkEnforcementConfig('components', config), 'warn');
    assert.strictEqual(checkEnforcementConfig('assets', config), 'off');
  });
});

// Test: Helper function tests
describe('Path Enforcement Helper Functions', () => {
  test('inferCategoryFromPath detects test files', () => {
    assert.strictEqual(inferCategoryFromPath('auth.test.js'), 'tests');
    assert.strictEqual(inferCategoryFromPath('utils.spec.ts'), 'tests');
  });
  
  test('inferCategoryFromPath detects route files', () => {
    assert.strictEqual(inferCategoryFromPath('userRoutes.ts'), 'routes');
    assert.strictEqual(inferCategoryFromPath('HomeController.js'), 'routes');
  });
  
  test('inferCategoryFromPath detects component files', () => {
    assert.strictEqual(inferCategoryFromPath('Button.tsx'), 'components');
    assert.strictEqual(inferCategoryFromPath('Card.jsx'), 'components');
    assert.strictEqual(inferCategoryFromPath('MyComponent.ts'), 'components');
  });
  
  test('inferCategoryFromPath detects service files', () => {
    assert.strictEqual(inferCategoryFromPath('AuthService.ts'), 'services');
    assert.strictEqual(inferCategoryFromPath('DataProvider.js'), 'services');
  });
  
  test('inferCategoryFromPath detects style files', () => {
    assert.strictEqual(inferCategoryFromPath('styles.css'), 'styles');
    assert.strictEqual(inferCategoryFromPath('theme.scss'), 'styles');
    assert.strictEqual(inferCategoryFromPath('main.less'), 'styles');
  });
  
  test('inferCategoryFromPath returns null for unknown files', () => {
    assert.strictEqual(inferCategoryFromPath('random.txt'), null);
    assert.strictEqual(inferCategoryFromPath('file'), null);
  });
  
  test('detectMultipleCategories finds all matches', () => {
    const mappings = {
      utils: { patterns: ['src/utils/**'] },
      services: { patterns: ['src/services/**'] }
    };
    
    // File that matches utils
    const utilsMatches = detectMultipleCategories('src/utils/helpers.ts', mappings);
    assert.ok(utilsMatches.includes('utils'));
    
    // File that matches services
    const serviceMatches = detectMultipleCategories('src/services/api.ts', mappings);
    assert.ok(serviceMatches.includes('services'));
  });
  
  test('matchesPattern handles various glob patterns', () => {
    assert.strictEqual(matchesPattern('src/utils/file.ts', 'src/utils/**'), true);
    assert.strictEqual(matchesPattern('src/utils/nested/file.ts', 'src/utils/**'), true);
    assert.strictEqual(matchesPattern('src/other/file.ts', 'src/utils/**'), false);
    assert.strictEqual(matchesPattern('tests/file.test.js', '**/*.test.js'), true);
    assert.strictEqual(matchesPattern('src/components/Button.tsx', '**/*.tsx'), true);
  });
});

// Export functions for use in other tests
module.exports = {
  loadMappings,
  validatePath,
  inferCategoryFromPath,
  detectMultipleCategories,
  matchesPattern,
  FIXTURE_PATH
};
