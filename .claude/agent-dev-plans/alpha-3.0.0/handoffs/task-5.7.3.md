# Task 5.7.3 Handoff: Agent & LLM Call Integration

**Status**: COMPLETE
**Date**: 2024-12-17
**Agent**: dev-opus

## Summary

Implemented full agent and LLM call integration for pipeline step execution. The implementation replaces the skeleton `_callAgentLLM` method with a complete solution that validates agents, builds system prompts, constructs LLM configurations, and makes API calls via `ApiClient`.

## Changes Made

### File: `core/curation-system.js`

#### 1. New Method: `_validateAgentForExecution(agent, step)` (Lines ~3918-3975)

Validates agent configuration before making LLM calls:
- Checks if step requires an agent and validates it exists
- Validates `apiConfig` presence
- Validates `systemPrompt` configuration for each source type:
  - `custom`: Checks for `customText`
  - `preset`: Checks for `presetName`
  - `tokens`: Checks for non-empty `tokens` array
- Validates custom endpoint requirements when `useCurrentConnection` is false
- Returns `{ valid: boolean, errors: string[], warnings: string[] }`

#### 2. New Method: `_buildAgentSystemPrompt(agent, context)` (Lines ~3978-4024)

Builds system prompt from agent's `systemPrompt` configuration:
- Supports three source modes: `custom`, `preset`, `tokens`
- Reuses existing prompt resolution methods from Task 5.7.2:
  - `_resolvePresetPrompt()` for preset mode
  - `_resolveTokenStackPrompt()` for tokens mode
  - `_resolveCustomPrompt()` for custom mode
- Falls back to raw `customText` on error

#### 3. New Method: `_buildLLMConfig(agent, executionContext)` (Lines ~4027-4091)

Builds LLM configuration from agent's `apiConfig`:
- Creates `apiConfig` object: `useCurrentConnection`, `endpoint`, `apiKey`, `model`
- Creates `generationConfig` object: `temperature`, `maxTokens`, `topP`, `topK`, `frequencyPenalty`, `presencePenalty`
- Includes `metadata` for debugging: `agentId`, `agentName`, `pipelineId`, `pipelineName`
- Returns default configuration when no agent is provided

#### 4. Replaced Method: `_callAgentLLM(agent, userPrompt, step, executionContext)` (Lines ~4094-4231)

Full implementation replacing the skeleton:
- Validates agent via `_validateAgentForExecution()`
- Builds system prompt via `_buildAgentSystemPrompt()`
- Builds LLM config via `_buildLLMConfig()`
- Calls `ApiClient.generate()` with proper parameters
- Emits events for monitoring:
  - `curation:pipeline:llm:start` - Before LLM call
  - `curation:pipeline:llm:complete` - On success
  - `curation:pipeline:llm:error` - On failure
- Tracks LLM calls in `executionContext.llmCalls[]` array
- Returns response content string

#### 5. Updated Method: `_executeStep(step, executionContext)` (Lines ~3406-3449)

Minor updates:
- Updated comments to reflect completed implementations (5.7.1, 5.7.2, 5.7.3)
- Added agent info to result object (`agent.id`, `agent.name`, `agent.positionId`)

## Event Schema

### `curation:pipeline:llm:start`
```javascript
{
  stepId: string,
  stepName: string,
  agentId: string | null,
  pipelineId: string,
  promptLength: number
}
```

### `curation:pipeline:llm:complete`
```javascript
{
  stepId: string,
  stepName: string,
  agentId: string | null,
  pipelineId: string,
  model: string,
  promptTokens: number,
  responseTokens: number,
  duration: number
}
```

### `curation:pipeline:llm:error`
```javascript
{
  stepId: string,
  stepName: string,
  agentId: string | null,
  pipelineId: string,
  error: string,
  duration: number
}
```

## Dependencies

- **Task 5.7.1**: Execution context and step runner - Uses `_resolveStepInput()`
- **Task 5.7.2**: Prompt resolution - Uses `_resolveCustomPrompt()`, `_resolvePresetPrompt()`, `_resolveTokenStackPrompt()`
- **ApiClient**: `utils/api-client.js` - Uses `generate()` method

## Next Steps

### Task 5.7.4: Response Parsing & Store Operations
The `_parseStepOutput()` method is still a skeleton. It needs implementation to:
- Parse LLM responses based on expected format (JSON, text, structured)
- Extract specific fields from responses
- Route outputs to stores via `_routeStepOutput()`

### Task 5.7.5: Preview Mode
The `_generatePreviewResult()` method needs enhancement to provide better preview information without making actual LLM calls.

## Testing Notes

To test this implementation:
1. Create a CRUD pipeline with steps that have `agentId` assigned
2. Execute the pipeline with valid input
3. Verify events are emitted correctly
4. Check `executionContext.llmCalls` for tracking data
5. Test validation by providing invalid agent IDs or configurations

## Code Quality

- All methods follow existing patterns in `curation-system.js`
- Comprehensive logging via `_log()`
- Events emitted via `_emit()` with proper namespacing
- Error handling with meaningful messages
- JSDoc comments for all new methods
