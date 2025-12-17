# Task 5.7.3: Agent & LLM Call Integration

**ID**: 5.7.3
**Name**: agent-llm-call-integration
**Priority**: P0
**Agent**: dev-opus
**Status**: COMPLETE
**Completed**: 2025-12-17
**Commit**: 0e31495
**Depends On**: 5.7.2

## Problem Statement

Pipeline steps specify an `agentId` for a curation agent, but there's no implementation to:
1. Retrieve the agent configuration
2. Build the system prompt from agent's settings
3. Call the LLM with proper configuration
4. Handle the response

## Objective

Implement agent and LLM integration that:
1. Retrieves curation agent by ID
2. Builds system prompt from agent's `systemPrompt` config
3. Calls LLM via ApiClient with agent's `apiConfig`
4. Returns raw LLM response for parsing

## Technical Requirements

### 1. Agent Retrieval (Already Exists)

The `getCurationAgent(id)` method already exists. Ensure it works:

```javascript
// Location: curation-system.js, line ~714 (existing method)

getCurationAgent(agentId) {
  return this._curationAgents.get(agentId);
}
```

### 2. Build Agent System Prompt

Create system prompt from agent configuration:

```javascript
// Location: curation-system.js, new method

async _buildAgentSystemPrompt(agent, context) {
  const promptBuilder = this._kernel.getModule('promptBuilder');
  const { systemPrompt } = agent;

  if (!systemPrompt) {
    return '';
  }

  switch (systemPrompt.source) {
    case 'custom':
      // Custom text - resolve any embedded tokens
      return this._resolveCustomPrompt(
        systemPrompt.customText || '',
        context,
        promptBuilder
      );

    case 'preset':
      // Load from preset
      return this._resolvePresetPrompt(
        systemPrompt.presetName,
        context,
        promptBuilder
      );

    case 'tokens':
      // Build from token stack
      return this._resolveTokenStackPrompt(
        systemPrompt.tokens || [],
        context,
        promptBuilder
      );

    default:
      // Fallback to customText if available
      return systemPrompt.customText || '';
  }
}
```

### 3. Build LLM Configuration

Convert agent's apiConfig to ApiClient format:

```javascript
// Location: curation-system.js, new method

_buildLLMConfig(agent, executionContext) {
  const { apiConfig } = agent;

  // Base configuration
  const config = {
    // Use current ST connection or custom
    useCurrentConnection: apiConfig?.useCurrentConnection !== false,

    // Generation parameters
    temperature: apiConfig?.temperature ?? 0.7,
    maxTokens: apiConfig?.maxTokens ?? 2048,
    topP: apiConfig?.topP,
    topK: apiConfig?.topK,
    frequencyPenalty: apiConfig?.frequencyPenalty,
    presencePenalty: apiConfig?.presencePenalty,

    // Stop sequences
    stopSequences: apiConfig?.stopSequences || [],

    // Custom API settings (if not using current connection)
    ...(apiConfig?.useCurrentConnection === false && {
      apiType: apiConfig.apiType,
      apiUrl: apiConfig.apiUrl,
      apiKey: apiConfig.apiKey,
      model: apiConfig.model
    })
  };

  // Add execution context metadata for logging
  config._metadata = {
    pipelineId: executionContext.pipeline.id,
    stepIndex: executionContext.currentStepIndex,
    agentId: agent.id
  };

  return config;
}
```

### 4. Call Agent LLM

Main method to invoke LLM:

```javascript
// Location: curation-system.js, new method

async _callAgentLLM(agent, userPrompt, executionContext) {
  const apiClient = this._kernel.getModule('apiClient');

  if (!apiClient) {
    throw new Error('ApiClient module not available');
  }

  // Build system prompt
  const systemPrompt = await this._buildAgentSystemPrompt(agent, {
    ...executionContext,
    // Add any agent-specific context
    agent: {
      id: agent.id,
      name: agent.name
    }
  });

  // Build LLM configuration
  const llmConfig = this._buildLLMConfig(agent, executionContext);

  this._logger.debug(`Calling LLM for agent ${agent.id}:`, {
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length,
    config: {
      temperature: llmConfig.temperature,
      maxTokens: llmConfig.maxTokens,
      useCurrentConnection: llmConfig.useCurrentConnection
    }
  });

  // Emit LLM call start event
  this._emit('pipeline:llm:start', {
    pipelineId: executionContext.pipeline.id,
    stepIndex: executionContext.currentStepIndex,
    agentId: agent.id,
    agentName: agent.name
  });

  const startTime = Date.now();

  try {
    // Call LLM via ApiClient
    const response = await apiClient.generate({
      systemPrompt,
      userPrompt,
      apiConfig: llmConfig,
      generationConfig: {
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens,
        topP: llmConfig.topP,
        topK: llmConfig.topK,
        frequencyPenalty: llmConfig.frequencyPenalty,
        presencePenalty: llmConfig.presencePenalty,
        stopSequences: llmConfig.stopSequences
      }
    });

    const duration = Date.now() - startTime;

    // Emit LLM call complete event
    this._emit('pipeline:llm:complete', {
      pipelineId: executionContext.pipeline.id,
      stepIndex: executionContext.currentStepIndex,
      agentId: agent.id,
      duration,
      promptTokens: response.promptTokens,
      responseTokens: response.responseTokens,
      success: response.success
    });

    if (!response.success) {
      throw new Error(response.error || 'LLM call failed');
    }

    this._logger.debug(`LLM response received in ${duration}ms:`, {
      contentLength: response.content?.length,
      tokens: { prompt: response.promptTokens, response: response.responseTokens }
    });

    return {
      content: response.content,
      model: response.model,
      promptTokens: response.promptTokens,
      responseTokens: response.responseTokens,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    // Emit LLM call error event
    this._emit('pipeline:llm:error', {
      pipelineId: executionContext.pipeline.id,
      stepIndex: executionContext.currentStepIndex,
      agentId: agent.id,
      error: error.message,
      duration
    });

    this._logger.error(`LLM call failed for agent ${agent.id}:`, error);
    throw error;
  }
}
```

### 5. Validate Agent Before Execution

Add validation to catch issues early:

```javascript
// Location: curation-system.js, new method

_validateAgentForExecution(agent, step) {
  const errors = [];

  if (!agent) {
    errors.push(`Agent not found: ${step.agentId}`);
    return { valid: false, errors };
  }

  if (!agent.systemPrompt) {
    // Warning but not error - can have empty system prompt
    this._logger.warn(`Agent ${agent.id} has no system prompt configured`);
  }

  if (agent.apiConfig?.useCurrentConnection === false) {
    // Custom API - validate required fields
    if (!agent.apiConfig.apiUrl) {
      errors.push(`Agent ${agent.id} has custom API but no apiUrl`);
    }
    if (!agent.apiConfig.model) {
      errors.push(`Agent ${agent.id} has custom API but no model`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}
```

### 6. Update _executeStep to Use Agent

Modify `_executeStep` (from 5.7.1) to integrate agent calls:

```javascript
// Location: curation-system.js, update _executeStep

async _executeStep(step, executionContext) {
  const stepInput = this._resolveStepInput(step, executionContext);

  // 1. Resolve and validate agent
  const agent = this.getCurationAgent(step.agentId);
  const validation = this._validateAgentForExecution(agent, step);

  if (!validation.valid) {
    throw new Error(`Agent validation failed: ${validation.errors.join(', ')}`);
  }

  // 2. Build prompt context
  const promptContext = this._buildStepPromptContext(step, stepInput, executionContext);

  // 3. Resolve user prompt
  const resolvedPrompt = await this._resolveStepPrompt(step, promptContext);

  // 4. If preview mode, don't call LLM
  if (executionContext.preview) {
    return this._generatePreviewResult(step, agent, resolvedPrompt, promptContext);
  }

  // 5. Call LLM
  const llmResponse = await this._callAgentLLM(agent, resolvedPrompt, executionContext);

  // 6. Parse response (implemented in 5.7.4)
  const parsedOutput = this._parseStepOutput(step, llmResponse);

  return {
    input: stepInput,
    agent: { id: agent.id, name: agent.name },
    prompt: resolvedPrompt,
    systemPrompt: await this._buildAgentSystemPrompt(agent, promptContext),
    rawResponse: llmResponse,
    output: parsedOutput
  };
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `core/curation-system.js` | Add `_buildAgentSystemPrompt`, `_buildLLMConfig`, `_callAgentLLM`, `_validateAgentForExecution`; update `_executeStep` |

## Integration Points

### ApiClient (utils/api-client.js)

The ApiClient provides:
```javascript
async generate({
  systemPrompt,
  userPrompt,
  apiConfig,
  generationConfig
}) {
  // Returns:
  return {
    success: true/false,
    content: string,
    promptTokens: number,
    responseTokens: number,
    duration: number,
    model: string,
    error?: string
  };
}
```

### Curation Agent Structure

```javascript
{
  id: "character_topologist",
  name: "Character Topologist Agent",
  systemPrompt: {
    source: "custom" | "preset" | "tokens",
    customText: "...",
    presetName: null,
    tokens: []
  },
  apiConfig: {
    useCurrentConnection: true,
    temperature: 0.7,
    maxTokens: 2048,
    // ... other params
  }
}
```

## Acceptance Criteria

1. [x] Agent retrieval works correctly
2. [x] System prompt is built from agent's systemPrompt config
3. [x] LLM config is built from agent's apiConfig
4. [x] ApiClient.generate is called with correct parameters
5. [x] LLM response is returned properly
6. [x] Events are emitted for LLM start/complete/error
7. [x] Agent validation catches configuration errors
8. [x] Logging provides useful debugging information

## Testing

```javascript
// Test agent retrieval
const agent = curationSystem.getCurationAgent('character_topologist');
console.log('Agent:', agent);

// Test system prompt building
const systemPrompt = await curationSystem._buildAgentSystemPrompt(agent, context);
console.log('System Prompt:', systemPrompt);

// Test full LLM call (requires running ST)
const response = await curationSystem._callAgentLLM(agent, 'Test prompt', execContext);
console.log('Response:', response);
```

## Notes

- ApiClient handles retries internally
- Consider adding timeout configuration
- System prompt resolution uses same methods as user prompt (from 5.7.2)
- Events enable UI progress tracking (5.7.6)
