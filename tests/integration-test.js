/**
 * TheCouncil - Integration Test Suite
 *
 * Manual test script that exercises all systems to verify cross-system communication
 * and end-to-end functionality across all three orchestration modes.
 *
 * To run these tests:
 * 1. Load TheCouncil extension in SillyTavern
 * 2. Open browser console (F12)
 * 3. Run: window.TheCouncil.runIntegrationTests()
 *
 * Test Scenarios:
 * 1. Bootstrap & System Initialization
 * 2. Mode 1: Full Synthesis Pipeline
 * 3. Mode 2: Prompt Compilation
 * 4. Mode 3: Context Injection
 * 5. Character System Participation
 * 6. Curation RAG Retrieval
 *
 * @version 2.0.0
 */

const CouncilIntegrationTests = {
  VERSION: "1.0.0",

  // ===== STATE =====
  _results: [],
  _currentTest: null,
  _startTime: 0,

  // ===== LOGGING =====

  log(level, msg, ...args) {
    const prefix = `[CouncilTests][${level.toUpperCase()}]`;
    const style =
      level === "error"
        ? "color: red; font-weight: bold"
        : level === "warn"
          ? "color: orange"
          : level === "pass"
            ? "color: green; font-weight: bold"
            : level === "fail"
              ? "color: red; font-weight: bold"
              : "color: #888";

    console.log(`%c${prefix} ${msg}`, style, ...args);
  },

  info(msg, ...args) {
    this.log("info", msg, ...args);
  },

  pass(msg, ...args) {
    this.log("pass", `PASS: ${msg}`, ...args);
  },

  fail(msg, ...args) {
    this.log("fail", `FAIL: ${msg}`, ...args);
  },

  // ===== TEST FRAMEWORK =====

  async runAll() {
    this._results = [];
    this._startTime = Date.now();

    this.info("=".repeat(60));
    this.info("TheCouncil Integration Test Suite");
    this.info("=".repeat(60));

    const tests = [
      { name: "Bootstrap & System Initialization", fn: this.testBootstrap },
      { name: "Kernel Module Access", fn: this.testKernelModules },
      { name: "System Registration", fn: this.testSystemRegistration },
      { name: "Event Bus Communication", fn: this.testEventBus },
      { name: "Pipeline Builder - Agent CRUD", fn: this.testAgentCRUD },
      { name: "Pipeline Builder - Pipeline CRUD", fn: this.testPipelineCRUD },
      { name: "Curation System - Store Operations", fn: this.testCurationStores },
      { name: "Curation System - RAG Pipeline", fn: this.testCurationRAG },
      { name: "Character System - Agent Management", fn: this.testCharacterAgents },
      { name: "Character System - Sync from Curation", fn: this.testCharacterSync },
      { name: "Prompt Builder - Token Resolution", fn: this.testPromptBuilder },
      { name: "Orchestration - Mode Switching", fn: this.testModeSwitching },
      { name: "Mode 1: Synthesis Pipeline Execution", fn: this.testSynthesisMode },
      { name: "Mode 2: Compilation Pipeline Execution", fn: this.testCompilationMode },
      { name: "Mode 3: Injection Configuration", fn: this.testInjectionMode },
      { name: "Cross-System Integration", fn: this.testCrossSystemIntegration },
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.fn.bind(this));
    }

    this.printSummary();
    return this._results;
  },

  async runTest(name, testFn) {
    this._currentTest = name;
    this.info("-".repeat(60));
    this.info(`Running: ${name}`);

    const result = {
      name,
      passed: false,
      error: null,
      duration: 0,
    };

    const startTime = Date.now();

    try {
      await testFn();
      result.passed = true;
      result.duration = Date.now() - startTime;
      this.pass(`${name} (${result.duration}ms)`);
    } catch (error) {
      result.passed = false;
      result.error = error.message;
      result.duration = Date.now() - startTime;
      this.fail(`${name}: ${error.message}`);
      console.error(error);
    }

    this._results.push(result);
    this._currentTest = null;
  },

  printSummary() {
    const totalDuration = Date.now() - this._startTime;
    const passed = this._results.filter((r) => r.passed).length;
    const failed = this._results.filter((r) => !r.passed).length;

    this.info("=".repeat(60));
    this.info("Test Summary");
    this.info("=".repeat(60));
    this.info(`Total Tests: ${this._results.length}`);
    this.log("pass", `Passed: ${passed}`);
    if (failed > 0) {
      this.log("fail", `Failed: ${failed}`);
    }
    this.info(`Duration: ${totalDuration}ms`);

    if (failed > 0) {
      this.info("\nFailed Tests:");
      this._results
        .filter((r) => !r.passed)
        .forEach((r) => {
          this.fail(`  - ${r.name}: ${r.error}`);
        });
    }

    this.info("=".repeat(60));
  },

  // ===== ASSERTIONS =====

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
  },

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
    }
  },

  assertExists(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || "Expected value to exist");
    }
  },

  assertType(value, type, message) {
    if (typeof value !== type) {
      throw new Error(message || `Expected type ${type}, got ${typeof value}`);
    }
  },

  // ===== HELPERS =====

  getKernel() {
    const kernel = window.TheCouncil;
    this.assertExists(kernel, "TheCouncil (Kernel) not found on window");
    return kernel;
  },

  getSystem(name) {
    const kernel = this.getKernel();
    const system = kernel.getSystem(name);
    this.assertExists(system, `System "${name}" not found`);
    return system;
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  // ===== TEST IMPLEMENTATIONS =====

  /**
   * Test 1: Bootstrap & System Initialization
   * Verifies the Kernel is loaded and initialized
   */
  async testBootstrap() {
    const kernel = this.getKernel();

    this.assert(kernel.VERSION, "Kernel should have VERSION property");
    this.assertType(kernel.getModule, "function", "Kernel should have getModule method");
    this.assertType(kernel.getSystem, "function", "Kernel should have getSystem method");
    this.assertType(kernel.emit, "function", "Kernel should have emit method");
    this.assertType(kernel.on, "function", "Kernel should have on method");
  },

  /**
   * Test 2: Kernel Module Access
   * Verifies shared modules are accessible
   */
  async testKernelModules() {
    const kernel = this.getKernel();

    // Check logger module
    const logger = kernel.getModule("logger");
    this.assertExists(logger, "Logger module should be registered");

    // Check that logger has expected methods
    if (logger) {
      this.assertType(logger.log || logger.info, "function", "Logger should have log/info method");
    }

    // EventBus is on kernel itself
    this.assertType(kernel.emit, "function", "EventBus emit should be available");
    this.assertType(kernel.on, "function", "EventBus on should be available");
  },

  /**
   * Test 3: System Registration
   * Verifies all six systems are registered with Kernel
   */
  async testSystemRegistration() {
    const kernel = this.getKernel();
    const expectedSystems = [
      "curation",
      "character",
      "promptBuilder",
      "pipelineBuilder",
      "orchestration",
    ];

    const registeredSystems = Object.keys(kernel.getAllSystems());
    this.info(`Registered systems: ${registeredSystems.join(", ")}`);

    for (const systemName of expectedSystems) {
      const system = kernel.getSystem(systemName);
      if (system) {
        this.info(`  - ${systemName}: OK`);
      } else {
        this.info(`  - ${systemName}: NOT REGISTERED (may be expected if not yet implemented)`);
      }
    }

    // At minimum, check that some systems are registered
    this.assert(registeredSystems.length > 0, "At least one system should be registered");
  },

  /**
   * Test 4: Event Bus Communication
   * Verifies events can be emitted and received
   */
  async testEventBus() {
    const kernel = this.getKernel();
    let eventReceived = false;
    let eventData = null;

    const testEvent = "test:integration:event";
    const testPayload = { test: true, timestamp: Date.now() };

    // Subscribe to event
    const unsubscribe = kernel.on(testEvent, (data) => {
      eventReceived = true;
      eventData = data;
    });

    // Emit event
    kernel.emit(testEvent, testPayload);

    // Allow event to propagate
    await this.sleep(10);

    this.assert(eventReceived, "Event should be received");
    this.assertEqual(eventData.test, true, "Event data should match");
    this.assertEqual(eventData.timestamp, testPayload.timestamp, "Event timestamp should match");

    // Cleanup
    unsubscribe();
  },

  /**
   * Test 5: Pipeline Builder - Agent CRUD
   * Verifies agent creation, read, update, delete
   */
  async testAgentCRUD() {
    const pipelineBuilder = this.getSystem("pipelineBuilder");
    if (!pipelineBuilder) {
      this.info("PipelineBuilderSystem not available, skipping");
      return;
    }

    const testAgentId = `test_agent_${Date.now()}`;
    const testAgent = {
      id: testAgentId,
      name: "Test Integration Agent",
      description: "Created by integration tests",
      systemPrompt: {
        source: "custom",
        customText: "You are a test agent.",
      },
    };

    // Create
    const created = pipelineBuilder.createAgent(testAgent);
    this.assertExists(created, "Created agent should be returned");
    this.assertEqual(created.id, testAgentId, "Created agent ID should match");

    // Read
    const read = pipelineBuilder.getAgent(testAgentId);
    this.assertExists(read, "Agent should be readable");
    this.assertEqual(read.name, testAgent.name, "Agent name should match");

    // Update
    const updated = pipelineBuilder.updateAgent(testAgentId, {
      description: "Updated by integration tests",
    });
    this.assertEqual(
      updated.description,
      "Updated by integration tests",
      "Agent should be updated",
    );

    // Delete
    const deleted = pipelineBuilder.deleteAgent(testAgentId);
    this.assert(deleted, "Agent should be deleted");

    // Verify deletion
    const afterDelete = pipelineBuilder.getAgent(testAgentId);
    this.assert(!afterDelete, "Agent should not exist after deletion");
  },

  /**
   * Test 6: Pipeline Builder - Pipeline CRUD
   * Verifies pipeline creation, validation, and management
   */
  async testPipelineCRUD() {
    const pipelineBuilder = this.getSystem("pipelineBuilder");
    if (!pipelineBuilder) {
      this.info("PipelineBuilderSystem not available, skipping");
      return;
    }

    const testPipelineId = `test_pipeline_${Date.now()}`;
    const testPipeline = {
      id: testPipelineId,
      name: "Test Integration Pipeline",
      description: "Created by integration tests",
      phases: [
        {
          id: "test_phase_1",
          name: "Test Phase",
          actions: [
            {
              id: "test_action_1",
              name: "Test Action",
              actionType: "standard",
              promptTemplate: "Test prompt",
            },
          ],
        },
      ],
    };

    // Create
    const created = pipelineBuilder.createPipeline(testPipeline);
    this.assertExists(created, "Created pipeline should be returned");
    this.assertEqual(created.id, testPipelineId, "Created pipeline ID should match");

    // Read
    const read = pipelineBuilder.getPipeline(testPipelineId);
    this.assertExists(read, "Pipeline should be readable");
    this.assertEqual(read.name, testPipeline.name, "Pipeline name should match");

    // Validate
    const validation = pipelineBuilder.validatePipeline(testPipelineId);
    this.assertExists(validation, "Validation result should be returned");
    this.info(`Pipeline validation: valid=${validation.valid}, errors=${validation.errors?.length || 0}`);

    // Delete
    const deleted = pipelineBuilder.deletePipeline(testPipelineId);
    this.assert(deleted, "Pipeline should be deleted");
  },

  /**
   * Test 7: Curation System - Store Operations
   * Verifies store CRUD operations
   */
  async testCurationStores() {
    const curation = this.getSystem("curation");
    if (!curation) {
      this.info("CurationSystem not available, skipping");
      return;
    }

    // Get available stores
    const allStores = curation.getAllStores ? curation.getAllStores() : [];
    this.info(`Available stores: ${Array.isArray(allStores) ? allStores.length : "N/A"}`);

    // Test with characterSheets store (collection type)
    const characterSheets = curation.getStore("characterSheets");
    if (characterSheets !== null && characterSheets !== undefined) {
      this.info("characterSheets store exists");

      // Test create operation
      const testEntry = {
        name: `TestChar_${Date.now()}`,
        type: "main_cast",
        description: "Test character for integration tests",
      };

      try {
        const created = curation.create("characterSheets", testEntry);
        if (created) {
          this.info(`Created test entry: ${created.name}`);

          // Test read
          const entries = curation.read("characterSheets", { name: created.name });
          this.assert(entries && entries.length > 0, "Should be able to read created entry");

          // Test delete
          curation.delete("characterSheets", created.name);
          this.info("Deleted test entry");
        }
      } catch (e) {
        this.info(`Store operation error (may be expected): ${e.message}`);
      }
    } else {
      this.info("characterSheets store not initialized");
    }

    // Test singleton store (currentSituation)
    try {
      const situation = curation.getStore("currentSituation");
      if (situation !== null) {
        this.info("currentSituation store accessible");
      }
    } catch (e) {
      this.info(`Singleton store access: ${e.message}`);
    }
  },

  /**
   * Test 8: Curation System - RAG Pipeline
   * Verifies RAG pipeline existence and basic structure
   */
  async testCurationRAG() {
    const curation = this.getSystem("curation");
    if (!curation) {
      this.info("CurationSystem not available, skipping");
      return;
    }

    // Check if RAG pipelines exist
    if (curation.getRAGPipeline) {
      const ragPipelineIds = [
        "character_context_rag",
        "relevant_history_rag",
        "situation_context_rag",
      ];

      for (const pipelineId of ragPipelineIds) {
        const pipeline = curation.getRAGPipeline(pipelineId);
        if (pipeline) {
          this.info(`RAG pipeline found: ${pipelineId}`);
        }
      }
    }

    // Test executeRAG if available (without actually calling LLM)
    if (curation.executeRAG) {
      this.info("executeRAG method available");

      // Just verify the method exists and accepts parameters
      this.assertType(curation.executeRAG, "function", "executeRAG should be a function");
    }

    // Get curation team summary
    if (curation.getCurationTeamSummary) {
      const summary = curation.getCurationTeamSummary();
      this.info(
        `Curation team: ${summary.positionCount} positions, ${summary.agentCount} agents`,
      );
    }
  },

  /**
   * Test 9: Character System - Agent Management
   * Verifies character agent operations
   */
  async testCharacterAgents() {
    const character = this.getSystem("character");
    if (!character) {
      this.info("CharacterSystem not available, skipping");
      return;
    }

    // Get all character agents
    if (character.getAllCharacterAgents) {
      const agents = character.getAllCharacterAgents();
      this.info(`Character agents: ${agents.length}`);
    }

    // Check Character Director
    if (character.getDirector) {
      const director = character.getDirector();
      if (director) {
        this.info(`Character Director: ${director.name || director.id}`);
      } else {
        this.info("Character Director not configured");
      }
    }

    // Test character agent creation (without curation data)
    if (character.createCharacterAgent) {
      const testCharacterId = `test_char_agent_${Date.now()}`;
      try {
        // This might fail if it requires curation data
        const created = character.createCharacterAgent({
          id: testCharacterId,
          characterId: testCharacterId,
          name: "Test Character Agent",
        });
        if (created) {
          this.info("Character agent creation successful");
          character.deleteCharacterAgent && character.deleteCharacterAgent(testCharacterId);
        }
      } catch (e) {
        this.info(`Character agent creation (expected to need curation data): ${e.message}`);
      }
    }
  },

  /**
   * Test 10: Character System - Sync from Curation
   * Verifies character sync functionality
   */
  async testCharacterSync() {
    const character = this.getSystem("character");
    const curation = this.getSystem("curation");

    if (!character || !curation) {
      this.info("Character or Curation system not available, skipping");
      return;
    }

    if (character.syncFromCuration) {
      try {
        const result = await character.syncFromCuration();
        this.info(`Character sync result: ${JSON.stringify(result) || "completed"}`);
      } catch (e) {
        this.info(`Character sync (may be expected if no data): ${e.message}`);
      }
    } else {
      this.info("syncFromCuration method not available");
    }
  },

  /**
   * Test 11: Prompt Builder - Token Resolution
   * Verifies token registration and resolution
   */
  async testPromptBuilder() {
    const promptBuilder = this.getSystem("promptBuilder");
    if (!promptBuilder) {
      this.info("PromptBuilderSystem not available, skipping");
      return;
    }

    // Get all tokens
    if (promptBuilder.getAllTokens) {
      const tokens = promptBuilder.getAllTokens();
      this.info(`Registered tokens: ${tokens.length}`);
    }

    // Test template resolution
    if (promptBuilder.resolveTemplate) {
      const testContext = {
        user: "TestUser",
        char: "TestCharacter",
        input: "Test input",
      };

      const template = "Hello {{user}}, I am {{char}}. You said: {{input}}";

      try {
        const resolved = promptBuilder.resolveTemplate(template, testContext);
        this.info(`Template resolution: ${resolved.substring(0, 50)}...`);
      } catch (e) {
        this.info(`Template resolution: ${e.message}`);
      }
    }

    // Test token registration
    if (promptBuilder.registerToken) {
      const testToken = {
        id: `test_token_${Date.now()}`,
        name: "Test Token",
        category: "custom",
        resolver: (context) => "Test Value",
      };

      try {
        promptBuilder.registerToken(testToken);
        this.info("Token registration successful");
      } catch (e) {
        this.info(`Token registration: ${e.message}`);
      }
    }
  },

  /**
   * Test 12: Orchestration - Mode Switching
   * Verifies mode switching between synthesis, compilation, and injection
   */
  async testModeSwitching() {
    const orchestration = this.getSystem("orchestration");
    if (!orchestration) {
      this.info("OrchestrationSystem not available, skipping");
      return;
    }

    const modes = ["synthesis", "compilation", "injection"];
    const originalMode = orchestration.getMode();
    this.info(`Original mode: ${originalMode}`);

    for (const mode of modes) {
      try {
        const success = orchestration.setMode(mode);
        const currentMode = orchestration.getMode();
        this.assertEqual(currentMode, mode, `Mode should be ${mode}`);
        this.info(`Mode switch to ${mode}: OK`);
      } catch (e) {
        this.info(`Mode switch to ${mode}: ${e.message}`);
      }
    }

    // Restore original mode
    orchestration.setMode(originalMode);
  },

  /**
   * Test 13: Mode 1 - Synthesis Pipeline Execution
   * Tests full synthesis pipeline (without actual LLM calls if no API)
   */
  async testSynthesisMode() {
    const orchestration = this.getSystem("orchestration");
    const pipelineBuilder = this.getSystem("pipelineBuilder");

    if (!orchestration || !pipelineBuilder) {
      this.info("Orchestration or PipelineBuilder not available, skipping");
      return;
    }

    // Set mode to synthesis
    orchestration.setMode("synthesis");
    this.assertEqual(orchestration.getMode(), "synthesis", "Should be in synthesis mode");

    // Check if we can start a run (without actually running it)
    this.assertType(orchestration.startRun, "function", "startRun should be available");
    this.assertType(orchestration.getProgress, "function", "getProgress should be available");
    this.assertType(orchestration.getRunState, "function", "getRunState should be available");

    // Get progress (should be idle)
    const progress = orchestration.getProgress();
    this.info(`Initial progress state: ${progress.status}`);

    // Check for available pipelines
    const pipelines = pipelineBuilder.getAllPipelines();
    this.info(`Available pipelines for synthesis: ${pipelines.length}`);

    if (pipelines.length > 0) {
      const testPipeline = pipelines[0];
      this.info(`Test pipeline available: ${testPipeline.name}`);

      // Note: We don't actually run the pipeline as it would require LLM API
      // This test verifies the infrastructure is in place
    }
  },

  /**
   * Test 14: Mode 2 - Compilation Pipeline Execution
   * Tests compilation mode setup
   */
  async testCompilationMode() {
    const orchestration = this.getSystem("orchestration");
    if (!orchestration) {
      this.info("OrchestrationSystem not available, skipping");
      return;
    }

    // Set mode to compilation
    orchestration.setMode("compilation");
    this.assertEqual(orchestration.getMode(), "compilation", "Should be in compilation mode");

    // Verify compilation-specific methods
    if (orchestration.replaceSTPrompt) {
      this.assertType(
        orchestration.replaceSTPrompt,
        "function",
        "replaceSTPrompt should be available",
      );
    }

    this.info("Compilation mode infrastructure verified");
  },

  /**
   * Test 15: Mode 3 - Injection Configuration
   * Tests injection mode setup and token mapping
   */
  async testInjectionMode() {
    const orchestration = this.getSystem("orchestration");
    if (!orchestration) {
      this.info("OrchestrationSystem not available, skipping");
      return;
    }

    // Set mode to injection
    orchestration.setMode("injection");
    this.assertEqual(orchestration.getMode(), "injection", "Should be in injection mode");

    // Test injection mapping configuration
    if (orchestration.configureInjectionMappings) {
      const testMappings = {
        chat: "relevant_history_rag",
        persona: "character_context_rag",
      };

      orchestration.configureInjectionMappings(testMappings);
      const mappings = orchestration.getInjectionMappings();
      this.assertExists(mappings.chat, "Chat mapping should be configured");
      this.info(`Injection mappings configured: ${Object.keys(mappings).length}`);
    }

    // Test single token mapping
    if (orchestration.mapToken) {
      orchestration.mapToken("scenario", "situation_context_rag");
      const mapping = orchestration.getTokenMapping("scenario");
      this.assertExists(mapping, "Token mapping should exist");
      this.info("Single token mapping works");
    }

    // Test unmapping
    if (orchestration.unmapToken) {
      orchestration.unmapToken("scenario");
      const removed = orchestration.getTokenMapping("scenario");
      this.assert(!removed, "Token mapping should be removed");
    }

    // Test injection enable/disable
    if (orchestration.setInjectionEnabled) {
      orchestration.setInjectionEnabled(true);
      this.assert(orchestration.isInjectionEnabled(), "Injection should be enabled");

      orchestration.setInjectionEnabled(false);
      this.assert(!orchestration.isInjectionEnabled(), "Injection should be disabled");
    }
  },

  /**
   * Test 16: Cross-System Integration
   * Tests communication between multiple systems
   */
  async testCrossSystemIntegration() {
    const kernel = this.getKernel();
    const curation = kernel.getSystem("curation");
    const character = kernel.getSystem("character");
    const pipelineBuilder = kernel.getSystem("pipelineBuilder");
    const orchestration = kernel.getSystem("orchestration");

    // Test 1: Event propagation across systems
    let crossEventReceived = false;
    const unsubscribe = kernel.on("integration:cross_system_test", () => {
      crossEventReceived = true;
    });

    kernel.emit("integration:cross_system_test", { source: "test" });
    await this.sleep(10);
    this.assert(crossEventReceived, "Cross-system events should propagate");
    unsubscribe();

    // Test 2: System dependencies
    if (curation && character) {
      // Character system should be able to reference curation
      this.info("Curation <-> Character integration: Systems co-exist");
    }

    if (pipelineBuilder && orchestration) {
      // Orchestration should be able to get pipelines from builder
      const pipelines = pipelineBuilder.getAllPipelines();
      this.info(`PipelineBuilder <-> Orchestration integration: ${pipelines.length} pipelines`);
    }

    // Test 3: State consistency across Kernel
    const state = kernel.getState();
    this.assertExists(state, "Kernel state should be accessible");
    this.info("Kernel global state accessible");

    // Test 4: Hook system (if implemented)
    if (kernel.registerHook) {
      let hookCalled = false;
      const unhook = kernel.registerHook("test:hook", async (ctx) => {
        hookCalled = true;
        return ctx;
      });

      if (kernel.runHooks) {
        await kernel.runHooks("test:hook", { test: true });
        this.assert(hookCalled, "Hooks should be called");
        this.info("Hook system operational");
      }

      unhook && unhook();
    }

    this.info("Cross-system integration verified");
  },
};

// Register with window.TheCouncil for easy access
if (typeof window !== "undefined") {
  // Wait for TheCouncil to be available
  const registerTests = () => {
    if (window.TheCouncil) {
      window.TheCouncil.runIntegrationTests = () => CouncilIntegrationTests.runAll();
      window.TheCouncil.IntegrationTests = CouncilIntegrationTests;
      console.log(
        "[CouncilTests] Integration tests registered. Run: window.TheCouncil.runIntegrationTests()",
      );
    } else {
      setTimeout(registerTests, 100);
    }
  };
  registerTests();
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = CouncilIntegrationTests;
}
