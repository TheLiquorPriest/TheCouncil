/**
 * Orchestration Modes - Test & Example Usage
 *
 * This file demonstrates how to use the three orchestration modes:
 * - Mode 1: Synthesis (multi-agent response generation)
 * - Mode 2: Compilation (prompt building for ST's LLM)
 * - Mode 3: Injection (token replacement with RAG results)
 */

// ===== MODE 1: SYNTHESIS =====
// Execute a pipeline that produces a final response and delivers it to chat

async function testMode1Synthesis() {
  console.log("=== Testing Mode 1: Synthesis ===");

  // Get orchestration system
  const orch = window.TheCouncil.getSystem("orchestration");
  if (!orch) {
    console.error("OrchestrationSystem not available");
    return;
  }

  // Set mode to synthesis
  orch.setMode("synthesis");
  console.log("Mode set to:", orch.getMode());

  // Start a pipeline run
  // The pipeline will execute all phases and actions
  // Final output will be delivered directly to ST chat
  try {
    const result = await orch.startRun("quick-pipeline", {
      userInput: "Tell me a short story about a dragon",
    });

    console.log("Pipeline completed!");
    console.log("Status:", result.status);
    console.log("Output:", result.output);
    console.log("Response was delivered to ST chat automatically");

  } catch (error) {
    console.error("Pipeline failed:", error);
  }
}

// ===== MODE 2: COMPILATION =====
// Execute a pipeline that builds an optimized prompt for ST's configured LLM

async function testMode2Compilation() {
  console.log("=== Testing Mode 2: Compilation ===");

  const orch = window.TheCouncil.getSystem("orchestration");
  if (!orch) {
    console.error("OrchestrationSystem not available");
    return;
  }

  // Set mode to compilation
  orch.setMode("compilation");
  console.log("Mode set to:", orch.getMode());

  // Start a pipeline run
  // The pipeline will analyze, plan, and compile an optimized prompt
  // This prompt will be made available to ST instead of the default prompt
  try {
    const result = await orch.startRun("standard-pipeline", {
      userInput: "Write a detailed character description for a space pirate",
    });

    console.log("Pipeline completed!");
    console.log("Status:", result.status);
    console.log("Compiled prompt length:", result.output?.length || 0);
    console.log("Prompt preview:", result.output?.substring(0, 200) + "...");
    console.log("Prompt is now available in window.councilCompiledPrompt");
    console.log("ST should use this prompt instead of default");

  } catch (error) {
    console.error("Pipeline failed:", error);
  }
}

// ===== MODE 3: INJECTION =====
// Configure token mappings and execute RAG for injection into ST's prompt

async function testMode3Injection() {
  console.log("=== Testing Mode 3: Injection ===");

  const orch = window.TheCouncil.getSystem("orchestration");
  if (!orch) {
    console.error("OrchestrationSystem not available");
    return;
  }

  // Set mode to injection
  orch.setMode("injection");
  console.log("Mode set to:", orch.getMode());

  // Configure token mappings
  // Map ST tokens to RAG pipeline IDs
  orch.configureInjectionMappings({
    "chat": "relevant_chat_history",      // {{chat}} -> RAG pipeline
    "persona": "character_context",       // {{persona}} -> RAG pipeline
    "scenario": "current_situation",      // {{scenario}} -> RAG pipeline
  });

  console.log("Injection mappings configured:");
  console.log(orch.getInjectionMappings());

  // Execute RAG pipelines to get results
  // This would typically be called before ST builds its prompt
  try {
    const ragResults = await orch.executeInjectionRAG({
      userInput: "What did we discuss about magic systems?",
    });

    console.log("RAG execution complete!");
    console.log("Results available for injection:");
    Object.keys(ragResults).forEach(pipelineId => {
      console.log(`- ${pipelineId}: ${ragResults[pipelineId]?.length || 0} chars`);
    });

    // The results are now cached and will be used to replace tokens
    // when ST builds its prompt

  } catch (error) {
    console.error("RAG execution failed:", error);
  }
}

// ===== MODE SWITCHING =====
// Demonstrate switching between modes

function demonstrateModeSwitch() {
  console.log("=== Demonstrating Mode Switching ===");

  const orch = window.TheCouncil.getSystem("orchestration");
  if (!orch) {
    console.error("OrchestrationSystem not available");
    return;
  }

  // Check current mode
  console.log("Current mode:", orch.getMode());

  // Switch to synthesis
  orch.setMode("synthesis");
  console.log("Switched to:", orch.getMode());

  // Switch to compilation
  orch.setMode("compilation");
  console.log("Switched to:", orch.getMode());

  // Switch to injection
  orch.setMode("injection");
  console.log("Switched to:", orch.getMode());

  // Note: Cannot switch mode during an active run
  console.log("Mode can only be switched when no pipeline is running");
}

// ===== CONVENIENCE API VIA KERNEL =====
// Access orchestration through the Kernel API

function demonstrateKernelAPI() {
  console.log("=== Demonstrating Kernel API ===");

  // Set mode via Kernel
  window.TheCouncil.setOrchestrationMode("synthesis");
  console.log("Mode via Kernel:", window.TheCouncil.getOrchestrationMode());

  // Run pipeline via Kernel
  window.TheCouncil.runPipeline("quick-pipeline", {
    userInput: "Hello from Kernel API",
  }).then(result => {
    console.log("Pipeline completed via Kernel API");
    console.log("Output:", result.output);
  }).catch(error => {
    console.error("Pipeline failed:", error);
  });

  // Abort via Kernel
  // window.TheCouncil.abortRun();

  // Check run state via Kernel
  const runState = window.TheCouncil.getRunState();
  console.log("Current run state:", runState);
}

// ===== USAGE EXAMPLES FOR DEVELOPERS =====

// Example 1: Quick Synthesis Response
async function quickSynthesis(userInput) {
  const orch = window.TheCouncil.getSystem("orchestration");
  orch.setMode("synthesis");
  return await orch.startRun("quick-pipeline", { userInput });
}

// Example 2: Build Optimized Prompt
async function buildOptimizedPrompt(userInput) {
  const orch = window.TheCouncil.getSystem("orchestration");
  orch.setMode("compilation");
  const result = await orch.startRun("standard-pipeline", { userInput });
  return window.councilCompiledPrompt?.prompt || result.output;
}

// Example 3: Setup RAG Injection
async function setupRAGInjection(tokenMappings) {
  const orch = window.TheCouncil.getSystem("orchestration");
  orch.setMode("injection");
  orch.configureInjectionMappings(tokenMappings);
  return true;
}

// ===== RUN ALL TESTS =====

async function runAllTests() {
  console.log("=================================================");
  console.log("  The Council - Orchestration Modes Test Suite  ");
  console.log("=================================================\n");

  // Only run if The Council is initialized
  if (!window.TheCouncil || !window.TheCouncil.isInitialized()) {
    console.error("The Council is not initialized!");
    return;
  }

  try {
    // Test mode switching
    demonstrateModeSwitch();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test Kernel API
    demonstrateKernelAPI();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Note: The following tests would execute actual pipelines
    // Uncomment to test (requires pipeline definitions and API access)

    // await testMode1Synthesis();
    // await new Promise(resolve => setTimeout(resolve, 2000));

    // await testMode2Compilation();
    // await new Promise(resolve => setTimeout(resolve, 2000));

    // await testMode3Injection();

    console.log("\n=================================================");
    console.log("  All tests completed!                           ");
    console.log("=================================================");

  } catch (error) {
    console.error("Test suite error:", error);
  }
}

// Export for use
if (typeof window !== "undefined") {
  window.CouncilModeTests = {
    testMode1Synthesis,
    testMode2Compilation,
    testMode3Injection,
    demonstrateModeSwitch,
    demonstrateKernelAPI,
    quickSynthesis,
    buildOptimizedPrompt,
    setupRAGInjection,
    runAllTests,
  };

  console.log("Council Mode Tests loaded. Run: window.CouncilModeTests.runAllTests()");
}
