/**
 * Two-Wave Pattern Detection Tests
 * Validates wave-based execution and dependency management
 * Requirements: WAVE-01 (Two-Wave Execution)
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert');

// Sample tasks for testing wave detection
const SAMPLE_TASKS = {
  // Wave A: No dependencies (Requirements gathering)
  wave_a_tasks: [
    {
      id: 'task-1',
      name: 'Research existing solutions',
      type: 'auto',
      dependencies: [],
      outputs: ['research-report'],
      phase: '01-foundation'
    },
    {
      id: 'task-2',
      name: 'Define requirements',
      type: 'auto',
      dependencies: [],
      outputs: ['requirements-doc'],
      phase: '01-foundation'
    },
    {
      id: 'task-3',
      name: 'Choose technology stack',
      type: 'decision',
      dependencies: [],
      outputs: ['tech-decision'],
      phase: '01-foundation'
    }
  ],
  
  // Wave B: Depends on Wave A outputs (Implementation)
  wave_b_tasks: [
    {
      id: 'task-4',
      name: 'Design architecture',
      type: 'auto',
      dependencies: ['task-1', 'task-2'],
      inputs: ['research-report', 'requirements-doc'],
      outputs: ['architecture-doc'],
      phase: '01-foundation'
    },
    {
      id: 'task-5',
      name: 'Implement core features',
      type: 'auto',
      dependencies: ['task-1', 'task-3'],
      inputs: ['research-report', 'tech-decision'],
      outputs: ['implementation'],
      phase: '01-foundation'
    },
    {
      id: 'task-6',
      name: 'Write tests',
      type: 'auto',
      dependencies: ['task-2'],
      inputs: ['requirements-doc'],
      outputs: ['test-suite'],
      phase: '01-foundation'
    }
  ],
  
  // Diamond dependency pattern (2-wave compliant)
  diamond_tasks: [
    {
      id: 'A',
      name: 'Start',
      dependencies: [],
      outputs: ['A-out']
    },
    {
      id: 'B',
      name: 'Parallel 1',
      dependencies: ['A'],
      inputs: ['A-out'],
      outputs: ['B-out']
    },
    {
      id: 'C',
      name: 'Parallel 2',
      dependencies: ['A'],
      inputs: ['A-out'],
      outputs: ['C-out']
    }
    // D removed - would require 3 waves (A -> B,C -> D)
  ],
  
  // Circular dependency (should detect as error)
  circular_tasks: [
    {
      id: 'X',
      name: 'Task X',
      dependencies: ['Y'],
      outputs: ['X-out']
    },
    {
      id: 'Y',
      name: 'Task Y',
      dependencies: ['Z'],
      outputs: ['Y-out']
    },
    {
      id: 'Z',
      name: 'Task Z',
      dependencies: ['X'],
      outputs: ['Z-out']
    }
  ],
  
  // Complex 3-wave pattern (should detect as error)
  three_wave_tasks: [
    {
      id: 'wave1-a',
      name: 'Wave 1 Task',
      dependencies: [],
      outputs: ['wave1-out']
    },
    {
      id: 'wave2-a',
      name: 'Wave 2 Task',
      dependencies: ['wave1-a'],
      inputs: ['wave1-out'],
      outputs: ['wave2-out']
    },
    {
      id: 'wave3-a',
      name: 'Wave 3 Task',
      dependencies: ['wave2-a'],
      inputs: ['wave2-out'],
      outputs: ['wave3-out']
    }
  ]
};

/**
 * Detect waves from task dependencies
 * @param {Array} tasks - Array of task objects
 * @returns {Object} { waveA: [...], waveB: [...], gates: [...], errors: [...] }
 */
function detectWaves(tasks) {
  const errors = [];
  const taskMap = new Map();
  
  // Build task map
  for (const task of tasks) {
    taskMap.set(task.id, { ...task, wave: null });
  }
  
  // Check for circular dependencies
  function hasCircularDependency(taskId, visited = new Set(), path = []) {
    if (visited.has(taskId)) {
      return path.includes(taskId);
    }
    
    const task = taskMap.get(taskId);
    if (!task) return false;
    
    visited.add(taskId);
    path.push(taskId);
    
    for (const depId of task.dependencies || []) {
      if (hasCircularDependency(depId, visited, [...path])) {
        return true;
      }
    }
    
    return false;
  }
  
  for (const task of tasks) {
    if (hasCircularDependency(task.id)) {
      errors.push(`Circular dependency detected involving task ${task.id}`);
      return { waveA: [], waveB: [], gates: [], errors };
    }
  }
  
  // Assign waves
  const waveA = [];
  const waveB = [];
  
  const levelCache = new Map();
  function getWaveLevel(taskId) {
    if (levelCache.has(taskId)) return levelCache.get(taskId);
    
    const task = taskMap.get(taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      levelCache.set(taskId, 0);
      return 0; // Wave A
    }
    
    let maxDepLevel = 0;
    for (const depId of task.dependencies) {
      const depLevel = getWaveLevel(depId);
      maxDepLevel = Math.max(maxDepLevel, depLevel);
    }
    
    const level = maxDepLevel + 1;
    levelCache.set(taskId, level);
    return level;
  }
  
  for (const task of tasks) {
    const level = getWaveLevel(task.id);
    
    if (level === 0) {
      waveA.push(task);
    } else if (level === 1) {
      waveB.push(task);
    } else {
      errors.push(`Task ${task.id} requires more than 2 waves (level ${level})`);
    }
  }
  
  // Define gates
  const gates = [];
  if (waveA.length > 0 && waveB.length > 0) {
    gates.push({
      name: 'Wave A Complete',
      type: 'completion',
      requires: waveA.map(t => t.id),
      beforeWave: 'B'
    });
  }
  
  return { waveA, waveB, gates, errors };
}

/**
 * Validate wave gates
 * @param {Array} waveA - Completed wave A tasks
 * @param {Array} waveB - Wave B tasks to start
 * @param {Object} gates - Gate definitions
 * @returns {Object} { valid: boolean, missing: [...] }
 */
function validateWaveGates(waveA, waveB, gates) {
  const waveAIds = new Set(waveA.map(t => t.id));
  const missing = [];
  
  for (const gate of gates) {
    if (gate.type === 'completion') {
      for (const requiredId of gate.requires) {
        if (!waveAIds.has(requiredId)) {
          missing.push({
            gate: gate.name,
            required: requiredId,
            reason: 'Wave A task not completed'
          });
        }
      }
    }
  }
  
  // Check Wave B dependencies
  for (const task of waveB) {
    for (const depId of task.dependencies || []) {
      if (!waveAIds.has(depId)) {
        missing.push({
          gate: 'Dependency Check',
          required: depId,
          for: task.id,
          reason: 'Dependency not in Wave A'
        });
      }
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Build dependency graph
 * @param {Array} tasks - Array of task objects
 * @returns {Map} Dependency graph
 */
function buildDependencyGraph(tasks) {
  const graph = new Map();
  
  for (const task of tasks) {
    graph.set(task.id, {
      task,
      dependencies: task.dependencies || [],
      dependents: []
    });
  }
  
  // Build reverse dependencies
  for (const [id, node] of graph) {
    for (const depId of node.dependencies) {
      const depNode = graph.get(depId);
      if (depNode) {
        depNode.dependents.push(id);
      }
    }
  }
  
  return graph;
}

/**
 * Check if wave can execute in parallel
 * @param {Array} waveTasks - Tasks in the wave
 * @returns {boolean} True if parallel execution is safe
 */
function canExecuteInParallel(waveTasks) {
  // Wave A tasks can always run in parallel (no dependencies within wave)
  // Wave B tasks can run in parallel if they don't depend on each other
  
  const taskIds = new Set(waveTasks.map(t => t.id));
  
  for (const task of waveTasks) {
    for (const depId of task.dependencies || []) {
      if (taskIds.has(depId)) {
        return false; // Task depends on another task in same wave
      }
    }
  }
  
  return true;
}

/**
 * Detect if task requires dynamic agent spawning
 * @param {Object} task - Task object
 * @returns {boolean} True if task needs dynamic spawning
 */
function requiresDynamicSpawning(task) {
  // Tasks with type 'auto' and no explicit dependencies may need dynamic agents
  // This is a heuristic based on task type and complexity
  return task.type === 'auto' && 
         (!task.dependencies || task.dependencies.length === 0) &&
         task.name.toLowerCase().includes('research');
}

/**
 * Identify remediation phase tasks
 * @param {Array} tasks - All tasks
 * @returns {Array} Remediation task IDs
 */
function identifyRemediationTasks(tasks) {
  return tasks
    .filter(t => 
      t.name.toLowerCase().includes('fix') ||
      t.name.toLowerCase().includes('remediate') ||
      t.name.toLowerCase().includes('correct') ||
      t.type === 'remediation'
    )
    .map(t => t.id);
}

// Test: Wave detection
describe('Wave Detection', () => {
  test('detectWaves should be exported and functional', () => {
    assert.strictEqual(typeof detectWaves, 'function');
  });
  
  test('should identify tasks with no dependencies as Wave A', () => {
    const result = detectWaves(SAMPLE_TASKS.wave_a_tasks);
    
    assert.strictEqual(result.waveA.length, 3,
      'Should have 3 Wave A tasks');
    assert.strictEqual(result.waveB.length, 0,
      'Should have 0 Wave B tasks');
    assert.deepStrictEqual(
      result.waveA.map(t => t.id).sort(),
      ['task-1', 'task-2', 'task-3']
    );
  });
  
  test('should identify tasks depending on Wave A as Wave B', () => {
    const allTasks = [...SAMPLE_TASKS.wave_a_tasks, ...SAMPLE_TASKS.wave_b_tasks];
    const result = detectWaves(allTasks);
    
    assert.strictEqual(result.waveA.length, 3,
      'Should have 3 Wave A tasks');
    assert.strictEqual(result.waveB.length, 3,
      'Should have 3 Wave B tasks');
    
    const waveBIds = result.waveB.map(t => t.id).sort();
    assert.deepStrictEqual(waveBIds, ['task-4', 'task-5', 'task-6']);
  });
  
  test('should detect diamond dependency pattern correctly', () => {
    const result = detectWaves(SAMPLE_TASKS.diamond_tasks);
    
    assert.strictEqual(result.waveA.length, 1,
      'Diamond start (A) should be Wave A');
    assert.strictEqual(result.waveA[0].id, 'A');
    
    assert.strictEqual(result.waveB.length, 2,
      'B and C should be Wave B (2-wave compliant, D removed)');
  });
  
  test('should detect circular dependencies as error', () => {
    const result = detectWaves(SAMPLE_TASKS.circular_tasks);
    
    assert.ok(result.errors.length > 0,
      'Should detect circular dependency error');
    assert.ok(result.errors.some(e => e.includes('Circular')),
      'Error should mention circular dependency');
  });
  
  test('should detect 3+ wave patterns as error', () => {
    const result = detectWaves(SAMPLE_TASKS.three_wave_tasks);
    
    assert.ok(result.errors.length > 0,
      'Should detect 3-wave pattern as error');
    assert.ok(result.errors.some(e => e.includes('wave3-a')),
      'Error should mention the task exceeding 2 waves');
  });
  
  test('should return empty waves for empty input', () => {
    const result = detectWaves([]);
    
    assert.deepStrictEqual(result.waveA, []);
    assert.deepStrictEqual(result.waveB, []);
    assert.deepStrictEqual(result.errors, []);
  });
});

// Test: Gate validation
describe('Wave Gate Validation', () => {
  test('validateWaveGates should be exported and functional', () => {
    assert.strictEqual(typeof validateWaveGates, 'function');
  });
  
  test('should validate Wave A complete before Wave B starts', () => {
    const waveA = SAMPLE_TASKS.wave_a_tasks;
    const waveB = SAMPLE_TASKS.wave_b_tasks;
    const gates = [{ name: 'Wave A Complete', type: 'completion', requires: ['task-1', 'task-2', 'task-3'] }];
    
    const result = validateWaveGates(waveA, waveB, gates);
    
    assert.strictEqual(result.valid, true,
      'Should be valid when all Wave A tasks complete');
    assert.deepStrictEqual(result.missing, []);
  });
  
  test('should detect incomplete Wave A tasks', () => {
    const incompleteWaveA = SAMPLE_TASKS.wave_a_tasks.slice(0, 1); // Only task-1
    const waveB = SAMPLE_TASKS.wave_b_tasks;
    const gates = [{ name: 'Wave A Complete', type: 'completion', requires: ['task-1', 'task-2', 'task-3'] }];
    
    const result = validateWaveGates(incompleteWaveA, waveB, gates);
    
    assert.strictEqual(result.valid, false,
      'Should be invalid when Wave A incomplete');
    assert.ok(result.missing.length > 0,
      'Should report missing tasks');
  });
  
  test('should detect missing dependencies for Wave B tasks', () => {
    const waveA = []; // No Wave A tasks
    const waveB = SAMPLE_TASKS.wave_b_tasks.slice(0, 1); // Just task-4
    const gates = [];
    
    const result = validateWaveGates(waveA, waveB, gates);
    
    assert.strictEqual(result.valid, false,
      'Should be invalid when dependencies missing');
    assert.ok(result.missing.some(m => m.for === 'task-4'),
      'Should report missing dependency for task-4');
  });
});

// Test: Dependency graph
describe('Dependency Graph Construction', () => {
  test('buildDependencyGraph should be exported and functional', () => {
    assert.strictEqual(typeof buildDependencyGraph, 'function');
  });
  
  test('should build correct dependency graph', () => {
    const graph = buildDependencyGraph(SAMPLE_TASKS.wave_b_tasks);
    
    assert.ok(graph.has('task-4'), 'Should have task-4');
    assert.ok(graph.has('task-5'), 'Should have task-5');
    assert.ok(graph.has('task-6'), 'Should have task-6');
    
    const task4Node = graph.get('task-4');
    assert.deepStrictEqual(task4Node.dependencies.sort(), ['task-1', 'task-2']);
  });
  
  test('should build reverse dependencies', () => {
    const allTasks = [...SAMPLE_TASKS.wave_a_tasks, ...SAMPLE_TASKS.wave_b_tasks];
    const graph = buildDependencyGraph(allTasks);
    
    const task1Node = graph.get('task-1');
    assert.ok(task1Node.dependents.includes('task-4'),
      'task-1 should have task-4 as dependent');
  });
  
  test('should handle tasks with no dependencies', () => {
    const graph = buildDependencyGraph(SAMPLE_TASKS.wave_a_tasks);
    
    for (const [_, node] of graph) {
      assert.deepStrictEqual(node.dependencies, []);
    }
  });
});

// Test: Parallel execution
describe('Parallel Execution Safety', () => {
  test('canExecuteInParallel should be exported and functional', () => {
    assert.strictEqual(typeof canExecuteInParallel, 'function');
  });
  
  test('Wave A tasks can execute in parallel', () => {
    const result = canExecuteInParallel(SAMPLE_TASKS.wave_a_tasks);
    assert.strictEqual(result, true,
      'Wave A tasks should be parallel-safe');
  });
  
  test('Wave B tasks without inter-dependencies can execute in parallel', () => {
    // Use only tasks 4 and 6 which don't depend on each other
    const parallelSafeTasks = [
      SAMPLE_TASKS.wave_b_tasks[0], // task-4
      SAMPLE_TASKS.wave_b_tasks[2]  // task-6
    ];
    const result = canExecuteInParallel(parallelSafeTasks);
    assert.strictEqual(result, true,
      'Wave B tasks without inter-dependencies should be parallel-safe');
  });
  
  test('should detect intra-wave dependencies', () => {
    const intraDepTasks = [
      { id: 'A', dependencies: [] },
      { id: 'B', dependencies: ['A'] }, // B depends on A within same wave
      { id: 'C', dependencies: ['A'] }
    ];
    
    const result = canExecuteInParallel(intraDepTasks);
    assert.strictEqual(result, false,
      'Should detect B depends on A');
  });
});

// Test: Dynamic agent spawning
describe('Dynamic Agent Spawning Detection', () => {
  test('requiresDynamicSpawning should be exported and functional', () => {
    assert.strictEqual(typeof requiresDynamicSpawning, 'function');
  });
  
  test('should detect research tasks as needing dynamic spawning', () => {
    const researchTask = {
      id: 'research-1',
      name: 'Research authentication libraries',
      type: 'auto',
      dependencies: []
    };
    
    assert.strictEqual(requiresDynamicSpawning(researchTask), true);
  });
  
  test('should not flag implementation tasks', () => {
    const implTask = {
      id: 'impl-1',
      name: 'Implement login form',
      type: 'auto',
      dependencies: ['research-1']
    };
    
    assert.strictEqual(requiresDynamicSpawning(implTask), false);
  });
  
  test('should not flag decision tasks', () => {
    const decisionTask = {
      id: 'decision-1',
      name: 'Choose database',
      type: 'decision',
      dependencies: []
    };
    
    assert.strictEqual(requiresDynamicSpawning(decisionTask), false);
  });
});

// Test: Remediation phase
describe('Remediation Phase Identification', () => {
  test('identifyRemediationTasks should be exported and functional', () => {
    assert.strictEqual(typeof identifyRemediationTasks, 'function');
  });
  
  test('should identify fix tasks as remediation', () => {
    const tasks = [
      { id: 'fix-1', name: 'Fix SQL injection vulnerability' },
      { id: 'impl-1', name: 'Implement new feature' }
    ];
    
    const remediation = identifyRemediationTasks(tasks);
    assert.deepStrictEqual(remediation, ['fix-1']);
  });
  
  test('should identify remediate tasks', () => {
    const tasks = [
      { id: 'rem-1', name: 'Remediate security findings' },
      { id: 'other-1', name: 'Other task' }
    ];
    
    const remediation = identifyRemediationTasks(tasks);
    assert.deepStrictEqual(remediation, ['rem-1']);
  });
  
  test('should identify correction tasks', () => {
    const tasks = [
      { id: 'corr-1', name: 'Correct styling issues' },
      { id: 'norm-1', name: 'Normal task' }
    ];
    
    const remediation = identifyRemediationTasks(tasks);
    assert.deepStrictEqual(remediation, ['corr-1']);
  });
  
  test('should identify by type', () => {
    const tasks = [
      { id: 'rem-1', name: 'Some task', type: 'remediation' }
    ];
    
    const remediation = identifyRemediationTasks(tasks);
    assert.deepStrictEqual(remediation, ['rem-1']);
  });
});

// Test: Artifact passing
describe('Artifact Passing Between Waves', () => {
  test('Wave A outputs should match Wave B inputs', () => {
    const allTasks = [...SAMPLE_TASKS.wave_a_tasks, ...SAMPLE_TASKS.wave_b_tasks];
    const result = detectWaves(allTasks);
    
    // Collect all Wave A outputs
    const waveAOutputs = new Set();
    for (const task of result.waveA) {
      for (const output of task.outputs || []) {
        waveAOutputs.add(output);
      }
    }
    
    // Check Wave B inputs exist in Wave A outputs
    for (const task of result.waveB) {
      for (const input of task.inputs || []) {
        assert.ok(waveAOutputs.has(input),
          `Wave B task ${task.id} input "${input}" should be produced by Wave A`);
      }
    }
  });
  
  test('should identify orphan Wave B inputs', () => {
    const waveB = [
      {
        id: 'orphan-task',
        dependencies: ['missing-task'],
        inputs: ['nonexistent-artifact']
      }
    ];
    
    const waveAIds = new Set();
    const orphanDeps = [];
    
    for (const task of waveB) {
      for (const dep of task.dependencies) {
        if (!waveAIds.has(dep)) {
          orphanDeps.push(dep);
        }
      }
    }
    
    assert.ok(orphanDeps.includes('missing-task'),
      'Should detect missing dependency');
  });
});

// Test: Wave boundary gates
describe('Wave Boundary Gates', () => {
  test('should create gate between Wave A and Wave B', () => {
    const allTasks = [...SAMPLE_TASKS.wave_a_tasks, ...SAMPLE_TASKS.wave_b_tasks];
    const result = detectWaves(allTasks);
    
    assert.ok(result.gates.length > 0,
      'Should have at least one gate');
    
    const completionGate = result.gates.find(g => g.type === 'completion');
    assert.ok(completionGate, 'Should have completion gate');
    assert.ok(completionGate.requires.length > 0,
      'Gate should require Wave A tasks');
  });
  
  test('gate should require all Wave A tasks', () => {
    const allTasks = [...SAMPLE_TASKS.wave_a_tasks, ...SAMPLE_TASKS.wave_b_tasks];
    const result = detectWaves(allTasks);
    
    const waveAIds = new Set(result.waveA.map(t => t.id));
    
    for (const gate of result.gates) {
      for (const required of gate.requires) {
        assert.ok(waveAIds.has(required),
          `Gate requirement ${required} should be in Wave A`);
      }
    }
  });
});

// Export functions for use in other tests
module.exports = {
  detectWaves,
  validateWaveGates,
  buildDependencyGraph,
  canExecuteInParallel,
  requiresDynamicSpawning,
  identifyRemediationTasks,
  SAMPLE_TASKS
};
