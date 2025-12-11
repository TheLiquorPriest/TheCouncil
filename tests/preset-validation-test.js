/**
 * Preset Validation Test for Task 6.3
 *
 * Tests that all three default presets can be loaded and executed
 * without errors.
 *
 * @version 1.0
 */

// Mock logger for testing
const TestLogger = {
  info: (msg, ...args) => console.log('[INFO]', msg, ...args),
  warn: (msg, ...args) => console.warn('[WARN]', msg, ...args),
  error: (msg, ...args) => console.error('[ERROR]', msg, ...args),
  debug: (msg, ...args) => console.debug('[DEBUG]', msg, ...args),
  log: (msg, ...args) => console.log('[LOG]', msg, ...args),
};

// Mock Kernel for testing
const MockKernel = {
  _listeners: new Map(),
  _modules: new Map(),
  _systems: new Map(),

  registerModule(name, module) {
    this._modules.set(name, module);
    return true;
  },

  getModule(name) {
    return this._modules.get(name) || null;
  },

  registerSystem(name, system) {
    this._systems.set(name, system);
    return true;
  },

  getSystem(name) {
    return this._systems.get(name) || null;
  },

  emit(event, data) {
    // Silent event handling for testing
  },

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(handler);
  },

  off(event, handler) {
    if (this._listeners.has(event)) {
      const handlers = this._listeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  },

  saveData: async (key, data, options) => Promise.resolve(true),
  loadData: async (key, options) => Promise.resolve(null),
};

/**
 * Test Suite: Preset Loading and Validation
 */
const PresetValidationTest = {
  VERSION: '1.0',
  _results: [],
  _presets: {},

  /**
   * Initialize test environment
   */
  async init() {
    console.log('====== PRESET VALIDATION TEST SUITE ======\n');

    // Register logger with mock kernel
    MockKernel.registerModule('logger', TestLogger);

    // Load presets
    await this._loadPresets();

    return this;
  },

  /**
   * Load all preset files
   */
  async _loadPresets() {
    console.log('Loading preset files...\n');

    // In a real browser environment, these would be loaded from files
    // For now, we need to define them or mock-load them
    const presetIds = ['default-pipeline', 'standard-pipeline', 'quick-pipeline'];

    for (const id of presetIds) {
      try {
        // In actual testing, fetch from /data/presets/{id}.json
        const response = await fetch(`/scripts/extensions/third-party/TheCouncil/data/presets/${id}.json`);
        if (!response.ok) {
          console.error(`Failed to load preset ${id}: ${response.statusText}`);
          continue;
        }
        const data = await response.json();
        this._presets[id] = data;
        console.log(`✓ Loaded preset: ${id}`);
      } catch (error) {
        console.error(`Error loading preset ${id}:`, error);
      }
    }

    console.log('\n');
  },

  /**
   * Run all tests
   */
  async run() {
    await this.init();

    console.log('====== RUNNING TESTS ======\n');

    // Test 1: Validate each preset loads without errors
    await this._testPresetLoad();

    // Test 2: Verify agents/teams/phases created
    await this._testPresetStructure();

    // Test 3: Validate pipelines
    await this._testPipelineValidation();

    console.log('\n====== TEST RESULTS ======\n');
    this._printResults();

    return this._results;
  },

  /**
   * Test 1: Load presets into system
   */
  async _testPresetLoad() {
    console.log('TEST 1: Loading presets into PipelineBuilderSystem\n');

    const presetIds = Object.keys(this._presets);

    for (const presetId of presetIds) {
      const preset = this._presets[presetId];
      const testName = `Load preset: ${presetId}`;

      try {
        // Create a fresh system for each preset
        const system = Object.create(PipelineBuilderSystem);
        system.init(MockKernel);

        // Apply preset using applyPreset
        const result = system.applyPreset(preset, { merge: false });

        if (!result) {
          throw new Error('applyPreset returned false');
        }

        // Get summary to verify load
        const summary = system.getSummary();
        console.log(`  ${presetId}:`);
        console.log(`    - Agents: ${summary.counts.agents}`);
        console.log(`    - Teams: ${summary.counts.teams}`);
        console.log(`    - Positions: ${summary.counts.positions}`);
        console.log(`    - Pipelines: ${summary.counts.pipelines}`);

        this._addResult(testName, true, 'Preset loaded successfully');
      } catch (error) {
        this._addResult(testName, false, `Error: ${error.message}`);
      }
    }

    console.log('');
  },

  /**
   * Test 2: Verify preset structure (agents, teams, phases)
   */
  async _testPresetStructure() {
    console.log('TEST 2: Verifying preset structure\n');

    const presetIds = Object.keys(this._presets);

    for (const presetId of presetIds) {
      const preset = this._presets[presetId];
      const testName = `Structure check: ${presetId}`;

      try {
        const errors = [];

        // Check agents
        if (!preset.agents || Object.keys(preset.agents).length === 0) {
          errors.push('No agents defined');
        } else {
          const agentCount = Object.keys(preset.agents).reduce(
            (sum, team) => sum + (preset.agents[team]?.length || 0),
            0
          );
          console.log(`  ${presetId}: ${agentCount} agents defined`);
        }

        // Check teams
        if (!preset.teams || preset.teams.length === 0) {
          errors.push('No teams defined');
        } else {
          console.log(`  ${presetId}: ${preset.teams.length} teams defined`);
        }

        // Check phases
        if (!preset.phases || preset.phases.length === 0) {
          errors.push('No phases defined');
        } else {
          console.log(`  ${presetId}: ${preset.phases.length} phases defined`);
        }

        if (errors.length > 0) {
          throw new Error(errors.join('; '));
        }

        this._addResult(testName, true, 'Structure valid');
      } catch (error) {
        this._addResult(testName, false, `Error: ${error.message}`);
      }
    }

    console.log('');
  },

  /**
   * Test 3: Validate pipeline configurations
   */
  async _testPipelineValidation() {
    console.log('TEST 3: Validating pipeline definitions\n');

    const presetIds = Object.keys(this._presets);

    for (const presetId of presetIds) {
      const preset = this._presets[presetId];
      const testName = `Pipeline validation: ${presetId}`;

      try {
        // Create system and load preset
        const system = Object.create(PipelineBuilderSystem);
        system.init(MockKernel);
        system.applyPreset(preset, { merge: false });

        // Get all pipelines and validate each
        const pipelines = system.getAllPipelines();

        if (pipelines.length === 0) {
          throw new Error('No pipelines found in preset');
        }

        let allValid = true;
        const validations = [];

        for (const pipeline of pipelines) {
          const validation = system.validatePipeline(pipeline.id);
          validations.push({
            pipelineId: pipeline.id,
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
          });

          if (!validation.valid) {
            allValid = false;
          }
        }

        // Print detailed results
        console.log(`  ${presetId}:`);
        for (const v of validations) {
          const status = v.valid ? '✓' : '✗';
          console.log(`    ${status} ${v.pipelineId}`);
          if (v.errors.length > 0) {
            console.log(`      Errors: ${v.errors.join('; ')}`);
          }
          if (v.warnings.length > 0) {
            console.log(`      Warnings: ${v.warnings.join('; ')}`);
          }
        }

        if (!allValid) {
          throw new Error('One or more pipelines failed validation');
        }

        this._addResult(testName, true, `${pipelines.length} pipelines validated`);
      } catch (error) {
        this._addResult(testName, false, `Error: ${error.message}`);
      }
    }

    console.log('');
  },

  /**
   * Add a test result
   */
  _addResult(testName, passed, message) {
    this._results.push({
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Print all test results
   */
  _printResults() {
    let passed = 0;
    let failed = 0;

    for (const result of this._results) {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${status}: ${result.test}`);
      console.log(`     ${result.message}`);

      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    }

    console.log(`\nTotal: ${passed} passed, ${failed} failed\n`);

    if (failed === 0) {
      console.log('====== ALL TESTS PASSED ======\n');
    } else {
      console.log(`====== ${failed} TEST(S) FAILED ======\n`);
    }
  },
};

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PresetValidationTest;
}

if (typeof window !== 'undefined') {
  window.PresetValidationTest = PresetValidationTest;
}
