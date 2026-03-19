/**
 * Dispatch Conformance Tests
 * Validates board, dispatch, and enhanced review settings in schema and settings.json
 */

const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT, 'docs', 'settings.schema.json');
const SETTINGS_PATH = path.join(ROOT, 'settings.json');

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// 1. Schema — board property
describe('Schema: board property', () => {
  let schema;

  before(() => {
    schema = loadJSON(SCHEMA_PATH);
  });

  test('schema defines board property (type object)', () => {
    assert.ok(schema.properties.board, 'schema should define board property');
    assert.strictEqual(schema.properties.board.type, 'object');
  });
});

// 2. Schema — dispatch property
describe('Schema: dispatch property', () => {
  let schema;

  before(() => {
    schema = loadJSON(SCHEMA_PATH);
  });

  test('schema defines dispatch property (type object)', () => {
    assert.ok(schema.properties.dispatch, 'schema should define dispatch property');
    assert.strictEqual(schema.properties.dispatch.type, 'object');
  });
});

// 3. Schema — review.evaluator_depth
describe('Schema: review.evaluator_depth', () => {
  let schema;

  before(() => {
    schema = loadJSON(SCHEMA_PATH);
  });

  test('schema defines review.evaluator_depth', () => {
    const reviewProps = schema.properties.review.properties;
    assert.ok(reviewProps.evaluator_depth, 'schema.review should define evaluator_depth');
    assert.strictEqual(reviewProps.evaluator_depth.type, 'string');
    assert.deepStrictEqual(reviewProps.evaluator_depth.enum, ['single', 'multi-pass']);
  });
});

// 4. Schema — review.coverage_thresholds
describe('Schema: review.coverage_thresholds', () => {
  let schema;

  before(() => {
    schema = loadJSON(SCHEMA_PATH);
  });

  test('schema defines review.coverage_thresholds', () => {
    const reviewProps = schema.properties.review.properties;
    assert.ok(reviewProps.coverage_thresholds, 'schema.review should define coverage_thresholds');
    assert.strictEqual(reviewProps.coverage_thresholds.type, 'object');
  });
});

// 5. Settings — board defaults
describe('Settings: board defaults', () => {
  let settings;

  before(() => {
    settings = loadJSON(SETTINGS_PATH);
  });

  test('settings.json has board section with default_size: 5', () => {
    assert.ok(settings.board, 'settings.json should have board section');
    assert.strictEqual(settings.board.default_size, 5);
  });

  test('settings.json board has min_size: 3', () => {
    assert.strictEqual(settings.board.min_size, 3);
  });

  test('settings.json board has discussion_rounds: 2', () => {
    assert.strictEqual(settings.board.discussion_rounds, 2);
  });

  test('settings.json board has assessment_timeout_ms: 300000', () => {
    assert.strictEqual(settings.board.assessment_timeout_ms, 300000);
  });

  test('settings.json board has persist_artifacts: true', () => {
    assert.strictEqual(settings.board.persist_artifacts, true);
  });
});

// 6. Settings — dispatch defaults
describe('Settings: dispatch defaults', () => {
  let settings;

  before(() => {
    settings = loadJSON(SETTINGS_PATH);
  });

  test('settings.json has dispatch section with enabled: true', () => {
    assert.ok(settings.dispatch, 'settings.json should have dispatch section');
    assert.strictEqual(settings.dispatch.enabled, true);
  });

  test('settings.json dispatch has fallback_to_internal: true', () => {
    assert.strictEqual(settings.dispatch.fallback_to_internal, true);
  });

  test('settings.json dispatch has timeout_ms: 300000', () => {
    assert.strictEqual(settings.dispatch.timeout_ms, 300000);
  });

  test('settings.json dispatch has max_retries: 1', () => {
    assert.strictEqual(settings.dispatch.max_retries, 1);
  });
});

// 7. Settings — review.evaluator_depth
describe('Settings: review.evaluator_depth', () => {
  let settings;

  before(() => {
    settings = loadJSON(SETTINGS_PATH);
  });

  test('settings.json has review.evaluator_depth = "multi-pass"', () => {
    assert.ok(settings.review, 'settings.json should have review section');
    assert.strictEqual(settings.review.evaluator_depth, 'multi-pass');
  });
});

// 8. Settings — review.coverage_thresholds values
describe('Settings: review.coverage_thresholds', () => {
  let settings;

  before(() => {
    settings = loadJSON(SETTINGS_PATH);
  });

  test('settings.json has coverage_thresholds.overall = 70', () => {
    assert.ok(settings.review.coverage_thresholds, 'settings.json should have coverage_thresholds');
    assert.strictEqual(settings.review.coverage_thresholds.overall, 70);
  });

  test('settings.json has coverage_thresholds.business_logic = 90', () => {
    assert.strictEqual(settings.review.coverage_thresholds.business_logic, 90);
  });

  test('settings.json has coverage_thresholds.api_routes = 80', () => {
    assert.strictEqual(settings.review.coverage_thresholds.api_routes, 80);
  });
});
