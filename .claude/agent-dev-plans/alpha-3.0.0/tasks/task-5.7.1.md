# Task 5.7.1: Execution Context & Step Runner

**ID**: 5.7.1
**Name**: execution-context-step-runner
**Priority**: P0
**Agent**: dev-opus
**Status**: COMPLETE
**Completed**: 2025-12-17
**Commit**: 3e553c0
**Depends On**: Block 5.1 completion

## Problem Statement

The `_executeCRUDPipeline` method in `curation-system.js` (line ~3197) is a stub that doesn't execute pipeline steps. It returns empty results regardless of the pipeline's configured steps.

## Objective

Implement the core execution context and step runner infrastructure that:
1. Creates an execution context with all necessary state
2. Iterates through pipeline steps in sequence
3. Passes data between steps correctly
4. Tracks execution state and results

## Technical Requirements

### 1. Execution Context Structure

Create an execution context object that tracks all pipeline execution state:

```javascript
// Location: curation-system.js, inside _executeCRUDPipeline

const executionContext = {
  // Pipeline metadata
  pipeline: {
    id: pipeline.id,
    name: pipeline.name,
    storeId: pipeline.storeId,
    operation: pipeline.operation
  },

  // Original input to pipeline
  pipelineInput: input,

  // Step tracking
  currentStepIndex: 0,
  totalSteps: pipeline.steps?.length || 0,
  steps: pipeline.steps || [],

  // Data flow between steps
  previousStepOutput: null,
  variables: {},  // Named variables from steps with outputTarget: "variable"

  // Store references
  targetStore: this._stores.get(pipeline.storeId),
  targetStoreSchema: this._storeSchemas.get(pipeline.storeId),

  // Execution results
  stepResults: [],
  errors: [],
  warnings: [],

  // Options
  preview: options.preview || false,
  verbose: options.verbose || false,

  // Timing
  startTime: Date.now(),
  stepTimings: []
};
```

### 2. Step Runner Loop

Implement the step iteration logic:

```javascript
// Location: curation-system.js, inside _executeCRUDPipeline

for (let i = 0; i < executionContext.steps.length; i++) {
  executionContext.currentStepIndex = i;
  const step = executionContext.steps[i];

  const stepStartTime = Date.now();

  try {
    // Emit progress event (implemented in 5.7.6)
    this._emit('pipeline:step:start', {
      pipelineId: pipeline.id,
      stepIndex: i,
      stepName: step.name,
      totalSteps: executionContext.totalSteps
    });

    // Execute the step (calls methods from 5.7.2, 5.7.3, 5.7.4)
    const stepResult = await this._executeStep(step, executionContext);

    // Record result
    executionContext.stepResults.push({
      stepId: step.id,
      stepName: step.name,
      success: true,
      output: stepResult.output,
      duration: Date.now() - stepStartTime
    });

    // Handle output routing (implemented in 5.7.4)
    await this._routeStepOutput(step, stepResult, executionContext);

    // Emit progress event
    this._emit('pipeline:step:complete', {
      pipelineId: pipeline.id,
      stepIndex: i,
      stepName: step.name,
      success: true
    });

  } catch (error) {
    // Error handling (implemented in 5.7.7)
    executionContext.errors.push({
      stepIndex: i,
      stepId: step.id,
      stepName: step.name,
      error: error.message,
      stack: error.stack
    });

    this._emit('pipeline:step:error', {
      pipelineId: pipeline.id,
      stepIndex: i,
      stepName: step.name,
      error: error.message
    });

    // Decide whether to continue or abort
    if (!options.continueOnError) {
      break;
    }
  }

  executionContext.stepTimings.push(Date.now() - stepStartTime);
}
```

### 3. Step Input Resolution

Determine what input to provide to each step based on `inputSource`:

```javascript
// Location: curation-system.js, new method

_resolveStepInput(step, executionContext) {
  switch (step.inputSource) {
    case 'pipeline_input':
      return executionContext.pipelineInput;

    case 'previous_step':
      return executionContext.previousStepOutput;

    case 'step_input':
      // Step has its own defined input (from promptConfig)
      return step.customInput || {};

    default:
      this._logger.warn(`Unknown inputSource: ${step.inputSource}, using pipeline_input`);
      return executionContext.pipelineInput;
  }
}
```

### 4. Skeleton for _executeStep

Create the skeleton method that will be filled in by subsequent tasks:

```javascript
// Location: curation-system.js, new method

async _executeStep(step, executionContext) {
  const stepInput = this._resolveStepInput(step, executionContext);

  // 1. Resolve agent (5.7.3)
  const agent = this.getCurationAgent(step.agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${step.agentId}`);
  }

  // 2. Build prompt context (5.7.2)
  const promptContext = this._buildStepPromptContext(step, stepInput, executionContext);

  // 3. Resolve prompt (5.7.2)
  const resolvedPrompt = await this._resolveStepPrompt(step, promptContext);

  // 4. If preview mode, don't call LLM (5.7.5)
  if (executionContext.preview) {
    return this._generatePreviewResult(step, resolvedPrompt, promptContext);
  }

  // 5. Call LLM (5.7.3)
  const llmResponse = await this._callAgentLLM(agent, resolvedPrompt, executionContext);

  // 6. Parse response (5.7.4)
  const parsedOutput = this._parseStepOutput(step, llmResponse);

  return {
    input: stepInput,
    prompt: resolvedPrompt,
    rawResponse: llmResponse,
    output: parsedOutput
  };
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `core/curation-system.js` | Replace `_executeCRUDPipeline` stub, add `_executeStep`, `_resolveStepInput` |

## Acceptance Criteria

1. [x] `_executeCRUDPipeline` creates proper execution context
2. [x] Step runner iterates through all steps in sequence
3. [x] Step input is resolved correctly based on `inputSource`
4. [x] Execution context tracks step results
5. [x] Execution context tracks timing information
6. [x] Events are emitted for step start/complete/error
7. [x] Errors are caught and recorded in context
8. [x] All skeleton methods are in place for subsequent tasks

## Testing

```javascript
// Manual test - check context creation
const context = curationSystem._createExecutionContext(pipeline, input, options);
console.log('Context:', context);

// Manual test - step iteration (will fail on missing methods, but should iterate)
const result = await curationSystem.executePipeline(pipelineId, {});
console.log('Result:', result);
```

## Notes

- This task creates infrastructure; actual functionality comes from 5.7.2-5.7.5
- Keep skeleton methods that throw "Not implemented" errors for clarity
- Events should be defined even if UI handling is in 5.7.6
