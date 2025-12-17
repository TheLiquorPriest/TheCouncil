# Group 5.7: CRUD Pipeline Execution Implementation

**Priority**: P0 (Critical - Core functionality is non-functional)
**Status**: PENDING
**Created**: 2025-12-17
**Depends On**: Group 5.1 (Known Critical Bugs)

## Problem Statement

The CRUD pipeline execution system is **completely non-functional**. Both `_executeCRUDPipeline` and `_executeCRUDPipelinePreview` in `curation-system.js` are stubs that return empty results without executing any pipeline steps.

**Evidence from code:**

```javascript
// Line 3197-3218 in curation-system.js
async _executeCRUDPipeline(pipeline, input, options = {}) {
  const { preview = false } = options;

  // For now, simple implementation
  // Future: implement full action execution with agents  <-- STUB!

  const result = {
    operation: pipeline.operation,
    storeId: pipeline.storeId,
    affectedRecords: [],
    changes: {},
    message: `CRUD pipeline executed: ${pipeline.name}`
  };

  if (preview) {
    result.message += ' (preview mode - no changes made)';
    result.preview = true;
  }

  return result;  // Returns NOTHING useful
}
```

**User Impact**: Users configure pipelines with steps, agents, and prompts, but clicking "Preview" or "Run" produces no meaningful output.

## Scope

Implement complete CRUD pipeline execution including:

1. **Step Execution Engine** - Execute pipeline steps in sequence
2. **Prompt Resolution** - Resolve tokens in step prompts using PromptBuilder
3. **Agent Integration** - Use curation agents for LLM calls
4. **Context Management** - Pass data between steps
5. **Store Integration** - Write results to Curation stores
6. **Preview Mode** - Show what would happen without executing
7. **Progress Reporting** - Emit events for UI feedback
8. **Error Handling** - Graceful failure and recovery

## Architecture Overview

```
Pipeline Execution Flow
=======================

1. User clicks "Run" or "Preview"
      ↓
2. CurationModal._runPipeline() / _previewPipeline()
      ↓
3. CurationSystem.executePipeline() / executePipelinePreview()
      ↓
4. _executeCRUDPipeline(pipeline, input, options)
      ↓
5. For each step in pipeline.steps:
   ├── Resolve agent (getCurationAgent)
   ├── Build context (input, previous outputs, store data)
   ├── Resolve prompt (PromptBuilder.buildPrompt with context)
   ├── Call LLM (ApiClient.generate with agent config)
   ├── Parse response (JSON for store operations)
   ├── Handle output (next_step, store, variable)
   └── Emit progress event
      ↓
6. Final store write (if not preview mode)
      ↓
7. Return execution result
```

## Data Structures

### Pipeline Step (from UI builder)
```javascript
{
  id: "step_0",
  name: "Generate Character Details",
  agentId: "character_topologist",
  inputSource: "pipeline_input" | "previous_step" | "step_input",
  outputTarget: "next_step" | "store" | "variable",
  promptTemplate: "Analyze this character: {{input}}...",
  promptConfig: {
    mode: "custom" | "preset" | "tokens",
    customPrompt: "...",
    presetName: null,
    tokens: [{ id: "char", type: "st" }, ...]
  },
  variableName: "" // if outputTarget is "variable"
}
```

### Execution Context
```javascript
{
  // Pipeline-level
  pipeline: { id, name, storeId, operation },
  pipelineInput: { ... },  // Original input to pipeline

  // Step tracking
  currentStepIndex: 0,
  steps: [...],

  // Data flow
  previousStepOutput: null | string,
  variables: {},  // Named variables from steps

  // Store access
  targetStore: Map | Object,
  storeSchema: { ... },

  // Results
  stepResults: [],
  errors: [],
}
```

### Curation Agent
```javascript
{
  id: "character_topologist",
  name: "Character Topologist Agent",
  systemPrompt: {
    source: "custom",
    customText: "You are a character analysis specialist..."
  },
  apiConfig: {
    useCurrentConnection: true,
    temperature: 0.7,
    maxTokens: 2048
  }
}
```

## Key Files to Modify

| File | Changes |
|------|---------|
| `core/curation-system.js` | Implement `_executeCRUDPipeline`, `_executeCRUDPipelinePreview`, add context management |
| `core/prompt-builder-system.js` | May need token resolution helpers for curation context |
| `ui/curation-modal.js` | Update UI to show execution progress and results |
| `ui/components/execution-monitor.js` | May need updates for step-by-step display |

## Success Criteria

1. Pipeline steps execute in sequence
2. Each step's prompt is resolved with context
3. LLM is called with agent's system prompt
4. Response is parsed and passed to next step
5. Final result is written to target store
6. Preview mode shows detailed what-would-happen
7. Progress events update UI in real-time
8. Errors are handled gracefully with clear messages

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM call failures | High | Retry logic, clear error messages |
| JSON parse failures | Medium | Robust parsing, validation |
| Token resolution failures | Medium | Fallback to raw text, logging |
| Store write conflicts | Low | Validation before write |
| Performance (large pipelines) | Medium | Progress events, timeout handling |

## Block/Task Breakdown

| ID | Task | Priority | Agent | File |
|----|------|----------|-------|------|
| 5.7.1 | Execution Context & Step Runner | P0 | dev-opus | [task-5.7.1.md](task-5.7.1.md) |
| 5.7.2 | Prompt Resolution Integration | P0 | dev-opus | [task-5.7.2.md](task-5.7.2.md) |
| 5.7.3 | Agent & LLM Call Integration | P0 | dev-opus | [task-5.7.3.md](task-5.7.3.md) |
| 5.7.4 | Output Handling & Store Integration | P0 | dev-opus | [task-5.7.4.md](task-5.7.4.md) |
| 5.7.5 | Preview Mode Implementation | P0 | dev-opus | [task-5.7.5.md](task-5.7.5.md) |
| 5.7.6 | Progress Events & UI Updates | P1 | dev-sonnet | [task-5.7.6.md](task-5.7.6.md) |
| 5.7.7 | Error Handling & Recovery | P1 | dev-sonnet | [task-5.7.7.md](task-5.7.7.md) |
| 5.7.8 | Pipeline Execution Testing | P0 | ui-feature-verification-test-opus | [task-5.7.8.md](task-5.7.8.md) |

## Task Dependencies

```
5.7.1 (context/runner)
  → 5.7.2 (prompt resolution)
    → 5.7.3 (agent/LLM)
      → 5.7.4 (output/store)
        → 5.7.5 (preview mode)
          → 5.7.6 (progress events) ─┬─→ 5.7.8 (testing)
          → 5.7.7 (error handling) ──┘
```
