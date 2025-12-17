# Task 5.7.5: Preview Mode Implementation

**ID**: 5.7.5
**Name**: preview-mode-implementation
**Priority**: P0
**Agent**: dev-opus
**Status**: PENDING
**Depends On**: 5.7.4

## Problem Statement

The `_executeCRUDPipelinePreview` method is a stub that doesn't show what a pipeline would actually do. Users need to see:
1. What prompts would be sent
2. What agents would be used
3. What store operations would occur
4. What the data flow looks like

Without actually executing LLM calls or modifying stores.

## Objective

Implement a comprehensive preview mode that:
1. Simulates pipeline execution without LLM calls
2. Shows resolved prompts for each step
3. Shows data flow between steps
4. Shows what store operations would occur
5. Provides clear, useful output for debugging pipelines

## Technical Requirements

### 1. Preview Execution Context Flag

Ensure preview flag is passed through execution:

```javascript
// Location: curation-system.js

async executePipelinePreview(pipelineId, input = {}) {
  return this.executePipeline(pipelineId, {
    ...input,
    _options: {
      preview: true,
      verbose: true
    }
  });
}
```

### 2. Generate Preview Result for Steps

Create detailed preview instead of calling LLM:

```javascript
// Location: curation-system.js, new method

_generatePreviewResult(step, agent, resolvedPrompt, promptContext) {
  const systemPrompt = this._buildAgentSystemPrompt ?
    '(System prompt would be built from agent config)' : '';

  return {
    preview: true,
    step: {
      id: step.id,
      name: step.name,
      inputSource: step.inputSource,
      outputTarget: step.outputTarget
    },
    agent: agent ? {
      id: agent.id,
      name: agent.name,
      hasSystemPrompt: !!agent.systemPrompt?.customText || !!agent.systemPrompt?.presetName,
      apiConfig: {
        useCurrentConnection: agent.apiConfig?.useCurrentConnection,
        temperature: agent.apiConfig?.temperature,
        maxTokens: agent.apiConfig?.maxTokens
      }
    } : null,
    prompts: {
      systemPromptSource: agent?.systemPrompt?.source || 'none',
      systemPromptPreview: this._truncateForPreview(
        agent?.systemPrompt?.customText ||
        `(Would load preset: ${agent?.systemPrompt?.presetName})` ||
        '(No system prompt)',
        500
      ),
      userPrompt: resolvedPrompt,
      userPromptLength: resolvedPrompt.length,
      tokenCount: this._estimateTokenCount(resolvedPrompt)
    },
    context: {
      inputPreview: this._truncateForPreview(JSON.stringify(promptContext.input), 300),
      previousOutputAvailable: !!promptContext.previousOutput,
      variablesAvailable: Object.keys(promptContext.variables || {}),
      storeDataAvailable: !!promptContext.store
    },
    expectedOutput: {
      target: step.outputTarget,
      variableName: step.variableName || null,
      wouldWriteToStore: step.outputTarget === 'store',
      expectedFormat: step.outputTarget === 'store' ? 'JSON' : 'text'
    },
    simulatedResponse: this._generateSimulatedResponse(step, promptContext)
  };
}

_truncateForPreview(text, maxLength = 200) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + `... (${text.length - maxLength} more chars)`;
}

_estimateTokenCount(text) {
  // Rough estimate: ~4 chars per token for English
  return Math.ceil((text || '').length / 4);
}

_generateSimulatedResponse(step, context) {
  // Generate a simulated response structure based on output target
  if (step.outputTarget === 'store') {
    return {
      type: 'json',
      sampleStructure: {
        key: '(would be generated)',
        fields: '(based on store schema)',
        _meta: {
          createdAt: '(timestamp)',
          createdBy: '(pipeline id)'
        }
      }
    };
  }

  return {
    type: 'text',
    description: 'LLM would generate response based on prompt'
  };
}
```

### 3. Preview-Specific Step Execution

Modify step execution for preview:

```javascript
// Location: curation-system.js, update _executeStep

async _executeStep(step, executionContext) {
  const stepInput = this._resolveStepInput(step, executionContext);

  // Resolve and validate agent
  const agent = this.getCurationAgent(step.agentId);
  const validation = this._validateAgentForExecution(agent, step);

  // In preview mode, warn but don't fail on missing agent
  if (!validation.valid) {
    if (executionContext.preview) {
      executionContext.warnings = executionContext.warnings || [];
      executionContext.warnings.push({
        stepId: step.id,
        message: `Agent validation issues: ${validation.errors.join(', ')}`
      });
    } else {
      throw new Error(`Agent validation failed: ${validation.errors.join(', ')}`);
    }
  }

  // Build prompt context
  const promptContext = this._buildStepPromptContext(step, stepInput, executionContext);

  // Resolve user prompt
  const resolvedPrompt = await this._resolveStepPrompt(step, promptContext);

  // If preview mode, generate preview result
  if (executionContext.preview) {
    const previewResult = this._generatePreviewResult(step, agent, resolvedPrompt, promptContext);

    // Simulate output for next step
    previewResult.output = {
      raw: '(Preview: LLM response would appear here)',
      parsed: { preview: true, stepId: step.id },
      type: 'preview'
    };

    return previewResult;
  }

  // Normal execution continues...
  const llmResponse = await this._callAgentLLM(agent, resolvedPrompt, executionContext);
  const parsedOutput = this._parseStepOutput(step, llmResponse);

  return {
    input: stepInput,
    agent: { id: agent.id, name: agent.name },
    prompt: resolvedPrompt,
    rawResponse: llmResponse,
    output: parsedOutput
  };
}
```

### 4. Preview Output Routing

Handle output routing in preview mode:

```javascript
// Location: curation-system.js, update _routeStepOutput

async _routeStepOutput(step, stepResult, executionContext) {
  const { outputTarget, variableName } = step;

  // In preview mode, track what would happen
  if (executionContext.preview) {
    executionContext.previewFlow = executionContext.previewFlow || [];

    const flowEntry = {
      stepId: step.id,
      stepName: step.name,
      outputTarget,
      variableName: variableName || null
    };

    if (outputTarget === 'store') {
      flowEntry.storeId = executionContext.pipeline.storeId;
      flowEntry.operation = executionContext.pipeline.operation;
      flowEntry.wouldWrite = true;
    }

    executionContext.previewFlow.push(flowEntry);

    // Still pass simulated output to next step for context building
    executionContext.previousStepOutput = `(Simulated output from step: ${step.name})`;

    if (outputTarget === 'variable' && variableName) {
      executionContext.variables[variableName] = `(Variable '${variableName}' would be set)`;
    }

    return;
  }

  // Normal routing continues...
  // ... (existing code from 5.7.4)
}
```

### 5. Assemble Preview Result

Create comprehensive preview summary:

```javascript
// Location: curation-system.js, new method

_assemblePreviewResult(executionContext) {
  const { pipeline, stepResults, warnings, previewFlow } = executionContext;

  return {
    success: true,
    preview: true,
    pipeline: {
      id: pipeline.id,
      name: pipeline.name,
      operation: pipeline.operation,
      storeId: pipeline.storeId,
      totalSteps: executionContext.totalSteps
    },
    summary: this._generatePreviewSummary(executionContext),
    steps: stepResults.map((result, index) => ({
      index,
      ...result
    })),
    dataFlow: previewFlow || [],
    storeChanges: this._summarizePreviewStoreChanges(previewFlow, pipeline),
    warnings: warnings?.length > 0 ? warnings : undefined,
    tokenEstimate: this._calculateTotalTokenEstimate(stepResults),
    estimatedCost: this._estimateCost(stepResults)
  };
}

_generatePreviewSummary(executionContext) {
  const { totalSteps, pipeline, previewFlow } = executionContext;

  const storeWrites = (previewFlow || []).filter(f => f.outputTarget === 'store').length;
  const variableSets = (previewFlow || []).filter(f => f.outputTarget === 'variable').length;

  return {
    description: `Pipeline "${pipeline.name}" would execute ${totalSteps} step(s)`,
    operation: pipeline.operation,
    storeWrites,
    variableSets,
    llmCallsRequired: totalSteps  // Each step makes one LLM call
  };
}

_summarizePreviewStoreChanges(previewFlow, pipeline) {
  const storeTargeted = (previewFlow || []).filter(f => f.outputTarget === 'store');

  if (storeTargeted.length === 0) {
    return {
      wouldModifyStore: false,
      message: 'No store modifications would occur'
    };
  }

  return {
    wouldModifyStore: true,
    storeId: pipeline.storeId,
    operation: pipeline.operation,
    stepsWritingToStore: storeTargeted.map(s => s.stepName),
    message: `${storeTargeted.length} step(s) would write to store "${pipeline.storeId}" using "${pipeline.operation}" operation`
  };
}

_calculateTotalTokenEstimate(stepResults) {
  let totalInput = 0;
  let totalOutput = 0;

  for (const result of stepResults) {
    if (result.prompts) {
      totalInput += result.prompts.tokenCount || 0;
      totalOutput += 500; // Estimate average response
    }
  }

  return {
    estimatedInputTokens: totalInput,
    estimatedOutputTokens: totalOutput,
    total: totalInput + totalOutput
  };
}

_estimateCost(stepResults) {
  const tokens = this._calculateTotalTokenEstimate(stepResults);

  // Very rough estimate based on typical API pricing
  const inputCostPer1k = 0.003;  // $3 per million
  const outputCostPer1k = 0.015; // $15 per million

  const inputCost = (tokens.estimatedInputTokens / 1000) * inputCostPer1k;
  const outputCost = (tokens.estimatedOutputTokens / 1000) * outputCostPer1k;

  return {
    estimated: true,
    note: 'Costs vary by model and provider',
    inputCost: `$${inputCost.toFixed(4)}`,
    outputCost: `$${outputCost.toFixed(4)}`,
    totalCost: `$${(inputCost + outputCost).toFixed(4)}`
  };
}
```

### 6. Update Main Execution to Handle Preview

```javascript
// Location: curation-system.js, update _executeCRUDPipeline end

// After step loop completes:
if (executionContext.preview) {
  return this._assemblePreviewResult(executionContext);
} else {
  return this._assembleFinalResult(executionContext);
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `core/curation-system.js` | Add preview generation, update step execution, add preview result assembly |

## UI Integration (for curation-modal.js)

The preview result should be displayed in the UI. The modal already has preview display code that can be enhanced:

```javascript
// Preview result structure makes it easy to display:
{
  preview: true,
  summary: { description, operation, storeWrites, llmCallsRequired },
  steps: [...],
  dataFlow: [...],
  storeChanges: { wouldModifyStore, message },
  tokenEstimate: { total },
  estimatedCost: { totalCost }
}
```

## Acceptance Criteria

1. [ ] Preview mode doesn't call LLM
2. [ ] Preview mode doesn't modify stores
3. [ ] Resolved prompts are shown for each step
4. [ ] Agent configuration is shown for each step
5. [ ] Data flow between steps is tracked
6. [ ] Store changes summary is provided
7. [ ] Token estimate is calculated
8. [ ] Cost estimate is provided
9. [ ] Warnings are collected for validation issues
10. [ ] Preview result is comprehensive and useful

## Testing

```javascript
// Test preview mode
const previewResult = await curationSystem.executePipelinePreview(pipelineId, {});
console.log('Preview Result:', JSON.stringify(previewResult, null, 2));

// Verify no store changes
const storeBefore = curationSystem.getStore(storeId);
await curationSystem.executePipelinePreview(pipelineId, {});
const storeAfter = curationSystem.getStore(storeId);
console.log('Store unchanged:', JSON.stringify(storeBefore) === JSON.stringify(storeAfter));
```

## Notes

- Preview is essential for debugging pipeline configuration
- Token estimates help users understand costs before running
- Simulated outputs maintain context flow for multi-step previews
- Preview results should be displayed nicely in the UI (5.7.6 can enhance this)
