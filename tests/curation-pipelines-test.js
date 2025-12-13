/**
 * TheCouncil - Curation Pipelines Test Suite
 *
 * Automated testing for all default CRUD and RAG pipelines
 * Validates pipeline structure, operations, and schema compliance
 *
 * To run these tests:
 * 1. Load TheCouncil extension in SillyTavern
 * 2. Open browser console (F12)
 * 3. Run: window.TheCouncil.runCurationPipelineTests()
 *
 * Test Coverage:
 * - All 14 CRUD pipelines (structure, operations validation)
 * - All 14 RAG pipelines (structure, schema validation)
 * - Pipeline registration and retrieval
 * - Input/output schema validation
 *
 * @version 2.0.0
 */

const CurationPipelineTests = {
  VERSION: "1.0.0",

  // ===== STATE =====
  _results: [],
  _currentTest: null,
  _startTime: 0,

  // CRUD and RAG Pipeline IDs (from Tasks 2.3.1 & 2.3.2)
  CRUD_PIPELINES: [
    "crud-storyDraft",
    "crud-storyOutline",
    "crud-storySynopsis",
    "crud-plotLines",
    "crud-scenes",
    "crud-dialogueHistory",
    "crud-characterSheets",
    "crud-characterDevelopment",
    "crud-characterInventory",
    "crud-characterPositions",
    "crud-factionSheets",
    "crud-locationSheets",
    "crud-currentSituation",
    "crud-agentCommentary",
  ],

  RAG_PIPELINES: [
    "rag-storyDraft",
    "rag-storyOutline",
    "rag-storySynopsis",
    "rag-plotLines",
    "rag-scenes",
    "rag-dialogueHistory",
    "rag-characterSheets",
    "rag-characterDevelopment",
    "rag-characterInventory",
    "rag-characterPositions",
    "rag-factionSheets",
    "rag-locationSheets",
    "rag-currentSituation",
    "rag-agentCommentary",
  ],

  // ===== LOGGING =====

  log(level, msg, ...args) {
    const prefix = `[CurationPipelineTests][${level.toUpperCase()}]`;
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
    this.info("TheCouncil Curation Pipelines Test Suite");
    this.info("=".repeat(60));

    const tests = [
      { name: "Test Infrastructure Setup", fn: this.testSetup },
      { name: "CRUD Pipelines Registration", fn: this.testCRUDPipelinesExist },
      { name: "RAG Pipelines Registration", fn: this.testRAGPipelinesExist },
      { name: "CRUD Pipeline Structures", fn: this.testCRUDStructures },
      { name: "RAG Pipeline Structures", fn: this.testRAGStructures },
      { name: "CRUD Operations Validation", fn: this.testCRUDOperations },
      { name: "RAG Schema Validation", fn: this.testRAGSchemas },
      { name: "Pipeline Retrieval", fn: this.testPipelineRetrieval },
      { name: "CRUD Singleton vs Collection", fn: this.testCRUDTypes },
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

  assertArray(value, message) {
    if (!Array.isArray(value)) {
      throw new Error(message || `Expected array, got ${typeof value}`);
    }
  },

  // ===== HELPERS =====

  getKernel() {
    const kernel = window.TheCouncil;
    this.assertExists(kernel, "TheCouncil (Kernel) not found on window");
    return kernel;
  },

  getCurationSystem() {
    const kernel = this.getKernel();
    const system = kernel.getSystem("curation");
    this.assertExists(system, "CurationSystem not found");
    return system;
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  // ===== TEST IMPLEMENTATIONS =====

  /**
   * Test 1: Test Infrastructure Setup
   * Verifies kernel and curation system are available
   */
  async testSetup() {
    const kernel = this.getKernel();
    this.assertExists(kernel, "Kernel should be available");

    const curation = this.getCurationSystem();
    this.assertExists(curation, "CurationSystem should be available");

    this.assertType(curation.getPipeline, "function", "getPipeline method should exist");
    this.assertType(
      curation.getAllPipelines,
      "function",
      "getAllPipelines method should exist",
    );
  },

  /**
   * Test 2: CRUD Pipelines Registration
   * Verifies all 14 CRUD pipelines are registered
   */
  async testCRUDPipelinesExist() {
    const curation = this.getCurationSystem();

    let foundCount = 0;
    const missing = [];

    for (const pipelineId of this.CRUD_PIPELINES) {
      const pipeline = curation.getPipeline(pipelineId);
      if (pipeline) {
        foundCount++;
        this.info(`  ✓ ${pipelineId}`);
      } else {
        missing.push(pipelineId);
        this.info(`  ✗ ${pipelineId} (NOT FOUND)`);
      }
    }

    this.info(`Found ${foundCount}/${this.CRUD_PIPELINES.length} CRUD pipelines`);
    this.assertEqual(
      foundCount,
      this.CRUD_PIPELINES.length,
      `Should have all ${this.CRUD_PIPELINES.length} CRUD pipelines registered`,
    );
  },

  /**
   * Test 3: RAG Pipelines Registration
   * Verifies all 14 RAG pipelines are registered
   */
  async testRAGPipelinesExist() {
    const curation = this.getCurationSystem();

    let foundCount = 0;
    const missing = [];

    for (const pipelineId of this.RAG_PIPELINES) {
      const pipeline = curation.getPipeline(pipelineId);
      if (pipeline) {
        foundCount++;
        this.info(`  ✓ ${pipelineId}`);
      } else {
        missing.push(pipelineId);
        this.info(`  ✗ ${pipelineId} (NOT FOUND)`);
      }
    }

    this.info(`Found ${foundCount}/${this.RAG_PIPELINES.length} RAG pipelines`);
    this.assertEqual(
      foundCount,
      this.RAG_PIPELINES.length,
      `Should have all ${this.RAG_PIPELINES.length} RAG pipelines registered`,
    );
  },

  /**
   * Test 4: CRUD Pipeline Structures
   * Validates structure of all CRUD pipelines
   */
  async testCRUDStructures() {
    const curation = this.getCurationSystem();

    for (const pipelineId of this.CRUD_PIPELINES) {
      const pipeline = curation.getPipeline(pipelineId);
      if (!pipeline) continue;

      // Check required properties
      this.assertExists(pipeline.id, `${pipelineId}: should have id`);
      this.assertExists(pipeline.name, `${pipelineId}: should have name`);
      this.assertExists(pipeline.description, `${pipelineId}: should have description`);
      this.assertExists(pipeline.storeId, `${pipelineId}: should have storeId`);
      this.assertExists(pipeline.operations, `${pipelineId}: should have operations`);

      // Check operations structure
      const ops = pipeline.operations;
      this.assertExists(ops.read, `${pipelineId}: should have read operation`);
      this.assertExists(ops.update, `${pipelineId}: should have update operation`);

      // Determine if singleton or collection
      const isSingleton =
        pipelineId.includes("storyDraft") ||
        pipelineId.includes("storyOutline") ||
        pipelineId.includes("storySynopsis") ||
        pipelineId.includes("currentSituation");

      if (isSingleton) {
        // Singletons should NOT have create/delete
        this.assert(!ops.create, `${pipelineId}: singleton should not have create`);
        this.assert(!ops.delete, `${pipelineId}: singleton should not have delete`);
      } else {
        // Collections should have all four operations
        this.assertExists(ops.create, `${pipelineId}: should have create operation`);
        this.assertExists(ops.delete, `${pipelineId}: should have delete operation`);
      }

      this.info(`  ✓ ${pipelineId} (structure valid)`);
    }
  },

  /**
   * Test 5: RAG Pipeline Structures
   * Validates structure of all RAG pipelines
   */
  async testRAGStructures() {
    const curation = this.getCurationSystem();

    for (const pipelineId of this.RAG_PIPELINES) {
      const pipeline = curation.getPipeline(pipelineId);
      if (!pipeline) continue;

      // Check required properties
      this.assertExists(pipeline.id, `${pipelineId}: should have id`);
      this.assertExists(pipeline.name, `${pipelineId}: should have name`);
      this.assertExists(pipeline.description, `${pipelineId}: should have description`);
      this.assertExists(pipeline.targetStores, `${pipelineId}: should have targetStores`);
      this.assertArray(pipeline.targetStores, `${pipelineId}: targetStores should be array`);
      this.assert(
        pipeline.targetStores.length > 0,
        `${pipelineId}: targetStores should not be empty`,
      );

      // Check actions array
      this.assertExists(pipeline.actions, `${pipelineId}: should have actions`);
      this.assertArray(pipeline.actions, `${pipelineId}: actions should be array`);
      this.assert(
        pipeline.actions.length > 0,
        `${pipelineId}: should have at least one action`,
      );

      // Check action structure
      for (const action of pipeline.actions) {
        this.assertExists(action.id, `${pipelineId}: action should have id`);
        this.assertExists(action.name, `${pipelineId}: action should have name`);
        this.assertExists(
          action.positionId,
          `${pipelineId}: action should have positionId`,
        );
        this.assertExists(
          action.promptTemplate,
          `${pipelineId}: action should have promptTemplate`,
        );
      }

      // Check schemas
      this.assertExists(
        pipeline.inputSchema,
        `${pipelineId}: should have inputSchema`,
      );
      this.assertExists(
        pipeline.outputSchema,
        `${pipelineId}: should have outputSchema`,
      );

      this.info(`  ✓ ${pipelineId} (structure valid)`);
    }
  },

  /**
   * Test 6: CRUD Operations Validation
   * Validates that CRUD operations have proper action structure
   */
  async testCRUDOperations() {
    const curation = this.getCurationSystem();
    const expectedOperations = ["read", "update"];

    for (const pipelineId of this.CRUD_PIPELINES) {
      const pipeline = curation.getPipeline(pipelineId);
      if (!pipeline) continue;

      const ops = pipeline.operations;

      for (const opName of expectedOperations) {
        const operation = ops[opName];
        this.assertExists(
          operation,
          `${pipelineId}: operation ${opName} should exist`,
        );
        this.assertExists(
          operation.actions,
          `${pipelineId}: operation ${opName} should have actions`,
        );
        this.assertArray(
          operation.actions,
          `${pipelineId}: operation ${opName} actions should be array`,
        );

        for (const action of operation.actions) {
          this.assertExists(
            action.id,
            `${pipelineId}/${opName}: action should have id`,
          );
          this.assertExists(
            action.name,
            `${pipelineId}/${opName}: action should have name`,
          );
          this.assertExists(
            action.positionId,
            `${pipelineId}/${opName}: action should have positionId`,
          );
          this.assertExists(
            action.promptTemplate,
            `${pipelineId}/${opName}: action should have promptTemplate`,
          );
        }
      }

      this.info(`  ✓ ${pipelineId} (operations valid)`);
    }
  },

  /**
   * Test 7: RAG Schema Validation
   * Validates input/output schemas for RAG pipelines
   */
  async testRAGSchemas() {
    const curation = this.getCurationSystem();

    for (const pipelineId of this.RAG_PIPELINES) {
      const pipeline = curation.getPipeline(pipelineId);
      if (!pipeline) continue;

      const inputSchema = pipeline.inputSchema;
      const outputSchema = pipeline.outputSchema;

      // Input schema validation
      this.assertExists(
        inputSchema.query,
        `${pipelineId}: inputSchema should have query field`,
      );
      this.assertEqual(
        inputSchema.query.type,
        "string",
        `${pipelineId}: query field should be string type`,
      );
      this.assertEqual(
        inputSchema.query.required,
        true,
        `${pipelineId}: query field should be required`,
      );

      // Output schema validation
      this.assertExists(
        outputSchema.results,
        `${pipelineId}: outputSchema should have results field`,
      );
      this.assertEqual(
        outputSchema.results.type,
        "array",
        `${pipelineId}: results field should be array type`,
      );
      this.assertExists(
        outputSchema.formatted,
        `${pipelineId}: outputSchema should have formatted field`,
      );
      this.assertEqual(
        outputSchema.formatted.type,
        "string",
        `${pipelineId}: formatted field should be string type`,
      );

      this.info(`  ✓ ${pipelineId} (schemas valid)`);
    }
  },

  /**
   * Test 8: Pipeline Retrieval
   * Verifies pipelines can be retrieved and match registration
   */
  async testPipelineRetrieval() {
    const curation = this.getCurationSystem();
    const allPipelines = curation.getAllPipelines();

    this.assertExists(allPipelines, "getAllPipelines should return result");
    this.assertArray(allPipelines, "getAllPipelines should return array");

    const expectedTotal = this.CRUD_PIPELINES.length + this.RAG_PIPELINES.length;
    this.info(
      `Total pipelines registered: ${allPipelines.length} (expected at least ${expectedTotal})`,
    );
    this.assert(
      allPipelines.length >= expectedTotal,
      `Should have at least ${expectedTotal} pipelines (CRUD + RAG)`,
    );

    // Verify both CRUD and RAG are in all pipelines
    const crudCount = allPipelines.filter((p) => p.id.startsWith("crud-")).length;
    const ragCount = allPipelines.filter((p) => p.id.startsWith("rag-")).length;

    this.info(`CRUD pipelines in all: ${crudCount}/${this.CRUD_PIPELINES.length}`);
    this.info(`RAG pipelines in all: ${ragCount}/${this.RAG_PIPELINES.length}`);

    this.assertEqual(
      crudCount,
      this.CRUD_PIPELINES.length,
      "All CRUD pipelines should be in getAllPipelines",
    );
    this.assertEqual(
      ragCount,
      this.RAG_PIPELINES.length,
      "All RAG pipelines should be in getAllPipelines",
    );
  },

  /**
   * Test 9: CRUD Singleton vs Collection Types
   * Verifies correct operation structure for singletons vs collections
   */
  async testCRUDTypes() {
    const curation = this.getCurationSystem();

    const singletonStores = [
      "storyDraft",
      "storyOutline",
      "storySynopsis",
      "currentSituation",
    ];
    const collectionStores = [
      "plotLines",
      "scenes",
      "dialogueHistory",
      "characterSheets",
      "characterDevelopment",
      "characterInventory",
      "characterPositions",
      "factionSheets",
      "locationSheets",
      "agentCommentary",
    ];

    // Test singletons
    for (const storeName of singletonStores) {
      const pipelineId = `crud-${storeName}`;
      const pipeline = curation.getPipeline(pipelineId);
      if (!pipeline) continue;

      const ops = pipeline.operations;
      this.assert(!ops.create, `${pipelineId}: singleton should not have create`);
      this.assert(!ops.delete, `${pipelineId}: singleton should not have delete`);
      this.assertExists(ops.read, `${pipelineId}: singleton should have read`);
      this.assertExists(ops.update, `${pipelineId}: singleton should have update`);

      this.info(`  ✓ ${pipelineId} (singleton type correct)`);
    }

    // Test collections
    for (const storeName of collectionStores) {
      const pipelineId = `crud-${storeName}`;
      const pipeline = curation.getPipeline(pipelineId);
      if (!pipeline) continue;

      const ops = pipeline.operations;
      this.assertExists(ops.create, `${pipelineId}: collection should have create`);
      this.assertExists(ops.read, `${pipelineId}: collection should have read`);
      this.assertExists(ops.update, `${pipelineId}: collection should have update`);
      this.assertExists(ops.delete, `${pipelineId}: collection should have delete`);

      this.info(`  ✓ ${pipelineId} (collection type correct)`);
    }
  },
};

// Register with window.TheCouncil for easy access
if (typeof window !== "undefined") {
  const registerTests = () => {
    if (window.TheCouncil) {
      window.TheCouncil.runCurationPipelineTests = () =>
        CurationPipelineTests.runAll();
      window.TheCouncil.CurationPipelineTests = CurationPipelineTests;
      console.log(
        "[CurationPipelineTests] Tests registered. Run: window.TheCouncil.runCurationPipelineTests()",
      );
    } else {
      setTimeout(registerTests, 100);
    }
  };
  registerTests();
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = CurationPipelineTests;
}
