# Task 5.7.7: Error Handling & Recovery

**ID**: 5.7.7
**Name**: error-handling-recovery
**Priority**: P1
**Agent**: dev-sonnet
**Status**: PENDING
**Depends On**: 5.7.5

## Problem Statement

Pipeline execution needs robust error handling for:
1. Missing or invalid agents
2. Prompt resolution failures
3. LLM call failures (timeout, rate limit, API errors)
4. JSON parse failures for store operations
5. Store write failures
6. User cancellation

Without proper handling, failures can leave the system in inconsistent states or provide unhelpful error messages.

## Objective

Implement comprehensive error handling that:
1. Catches and categorizes all error types
2. Provides clear, actionable error messages
3. Supports continue-on-error mode for non-critical steps
4. Implements retry logic for transient failures
5. Supports execution cancellation
6. Maintains consistent state on failure

## Technical Requirements

### 1. Error Types and Classification

Define error categories:

```javascript
// Location: curation-system.js, new section

const PipelineErrorTypes = {
  VALIDATION: 'validation',      // Config/input validation errors
  AGENT: 'agent',                // Agent not found or invalid
  PROMPT: 'prompt',              // Prompt resolution failed
  LLM: 'llm',                    // LLM call failed
  PARSE: 'parse',                // Response parsing failed
  STORE: 'store',                // Store operation failed
  TIMEOUT: 'timeout',            // Operation timed out
  CANCELLED: 'cancelled',        // User cancelled
  UNKNOWN: 'unknown'             // Unexpected error
};

class PipelineError extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.name = 'PipelineError';
    this.type = type;
    this.details = details;
    this.recoverable = this._isRecoverable(type);
    this.retryable = this._isRetryable(type);
  }

  _isRecoverable(type) {
    // Errors that allow pipeline to continue if continueOnError is true
    return [
      PipelineErrorTypes.PROMPT,
      PipelineErrorTypes.LLM,
      PipelineErrorTypes.PARSE
    ].includes(type);
  }

  _isRetryable(type) {
    // Errors that might succeed on retry
    return [
      PipelineErrorTypes.LLM,
      PipelineErrorTypes.TIMEOUT
    ].includes(type);
  }
}
```

### 2. Enhanced Error Handling in Step Execution

Wrap step execution with comprehensive error handling:

```javascript
// Location: curation-system.js, update step loop in _executeCRUDPipeline

for (let i = 0; i < executionContext.steps.length; i++) {
  // Check for cancellation
  if (executionContext.cancelled) {
    executionContext.errors.push({
      stepIndex: i,
      type: PipelineErrorTypes.CANCELLED,
      message: 'Execution cancelled by user'
    });
    break;
  }

  executionContext.currentStepIndex = i;
  const step = executionContext.steps[i];
  const stepStartTime = Date.now();

  try {
    this._emit('pipeline:step:start', { /* ... */ });

    const stepResult = await this._executeStepWithRetry(step, executionContext);

    executionContext.stepResults.push({
      stepId: step.id,
      stepName: step.name,
      success: true,
      output: stepResult.output,
      duration: Date.now() - stepStartTime
    });

    await this._routeStepOutput(step, stepResult, executionContext);

    this._emit('pipeline:step:complete', { /* ... */ });

  } catch (error) {
    const pipelineError = this._normalizeError(error, step, i);

    executionContext.errors.push({
      stepIndex: i,
      stepId: step.id,
      stepName: step.name,
      type: pipelineError.type,
      message: pipelineError.message,
      details: pipelineError.details,
      recoverable: pipelineError.recoverable,
      stack: error.stack
    });

    this._emit('pipeline:step:error', {
      pipelineId: executionContext.pipeline.id,
      stepIndex: i,
      stepName: step.name,
      errorType: pipelineError.type,
      error: pipelineError.message
    });

    // Decide whether to continue
    if (!this._shouldContinueAfterError(pipelineError, executionContext)) {
      this._logger.error(`Pipeline aborted at step ${i}: ${pipelineError.message}`);
      break;
    }

    this._logger.warn(`Step ${i} failed but continuing: ${pipelineError.message}`);

    // Set fallback output for next step
    executionContext.previousStepOutput = null;
  }

  executionContext.stepTimings.push(Date.now() - stepStartTime);
}
```

### 3. Error Normalization

Convert various error types to PipelineError:

```javascript
// Location: curation-system.js, new method

_normalizeError(error, step, stepIndex) {
  // Already a PipelineError
  if (error instanceof PipelineError) {
    return error;
  }

  // Detect error type from message/name
  const message = error.message || String(error);

  // Agent errors
  if (message.includes('Agent not found') || message.includes('Agent validation')) {
    return new PipelineError(PipelineErrorTypes.AGENT, message, {
      agentId: step.agentId,
      stepId: step.id
    });
  }

  // LLM errors
  if (message.includes('LLM call failed') ||
      message.includes('API error') ||
      message.includes('rate limit') ||
      message.includes('timeout')) {
    return new PipelineError(PipelineErrorTypes.LLM, message, {
      stepId: step.id,
      agentId: step.agentId
    });
  }

  // Parse errors
  if (message.includes('JSON') || message.includes('parse')) {
    return new PipelineError(PipelineErrorTypes.PARSE, message, {
      stepId: step.id
    });
  }

  // Store errors
  if (message.includes('store') || message.includes('Record')) {
    return new PipelineError(PipelineErrorTypes.STORE, message, {
      stepId: step.id,
      storeId: step.storeId
    });
  }

  // Unknown
  return new PipelineError(PipelineErrorTypes.UNKNOWN, message, {
    originalError: error.name,
    stepId: step.id
  });
}
```

### 4. Retry Logic

Implement retry for transient failures:

```javascript
// Location: curation-system.js, new method

async _executeStepWithRetry(step, executionContext) {
  const maxRetries = executionContext.options?.maxRetries ?? 2;
  const retryDelay = executionContext.options?.retryDelay ?? 1000;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check for cancellation before each attempt
      if (executionContext.cancelled) {
        throw new PipelineError(PipelineErrorTypes.CANCELLED, 'Execution cancelled');
      }

      if (attempt > 0) {
        this._logger.debug(`Retry attempt ${attempt} for step ${step.id}`);
        this._emit('pipeline:step:retry', {
          pipelineId: executionContext.pipeline.id,
          stepIndex: executionContext.currentStepIndex,
          stepName: step.name,
          attempt
        });

        // Wait before retry
        await this._sleep(retryDelay * attempt);
      }

      return await this._executeStep(step, executionContext);

    } catch (error) {
      lastError = this._normalizeError(error, step, executionContext.currentStepIndex);

      // Only retry if error is retryable
      if (!lastError.retryable || attempt >= maxRetries) {
        throw lastError;
      }

      this._logger.warn(`Step ${step.id} failed (attempt ${attempt + 1}): ${lastError.message}`);
    }
  }

  throw lastError;
}

_sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 5. Continue-on-Error Logic

Determine whether to continue after error:

```javascript
// Location: curation-system.js, new method

_shouldContinueAfterError(error, executionContext) {
  // Never continue on cancelled
  if (error.type === PipelineErrorTypes.CANCELLED) {
    return false;
  }

  // Check user preference
  const continueOnError = executionContext.options?.continueOnError ?? false;

  if (!continueOnError) {
    return false;
  }

  // Only continue if error is recoverable
  return error.recoverable;
}
```

### 6. Cancellation Support

Add cancellation mechanism:

```javascript
// Location: curation-system.js, new methods

// Store active executions for cancellation
_activeExecutions = new Map();

async _executeCRUDPipeline(pipeline, input, options = {}) {
  const executionId = `${pipeline.id}_${Date.now()}`;

  const executionContext = {
    // ... existing context setup ...
    executionId,
    cancelled: false
  };

  // Register for cancellation
  this._activeExecutions.set(executionId, executionContext);

  try {
    // ... execution logic ...
  } finally {
    // Cleanup
    this._activeExecutions.delete(executionId);
  }
}

cancelExecution(executionId) {
  const context = this._activeExecutions.get(executionId);
  if (context) {
    context.cancelled = true;
    this._emit('pipeline:execution:cancelled', {
      executionId,
      pipelineId: context.pipeline.id
    });
    return true;
  }
  return false;
}

// Cancel all active executions for a pipeline
cancelPipelineExecutions(pipelineId) {
  let cancelled = 0;
  for (const [id, context] of this._activeExecutions) {
    if (context.pipeline.id === pipelineId) {
      context.cancelled = true;
      cancelled++;
    }
  }
  return cancelled;
}
```

### 7. Error Result Formatting

Format errors for display:

```javascript
// Location: curation-system.js, update _assembleFinalResult

_assembleFinalResult(executionContext) {
  const result = {
    // ... existing fields ...
    success: executionContext.errors.length === 0,
  };

  if (executionContext.errors.length > 0) {
    result.errors = executionContext.errors.map(err => ({
      stepIndex: err.stepIndex,
      stepName: err.stepName,
      type: err.type,
      message: err.message,
      recoverable: err.recoverable,
      // User-friendly message
      userMessage: this._formatErrorForUser(err)
    }));

    result.errorSummary = this._summarizeErrors(executionContext.errors);
  }

  return result;
}

_formatErrorForUser(error) {
  const messages = {
    [PipelineErrorTypes.AGENT]: `The agent "${error.details?.agentId}" could not be found or is invalid. Please check the pipeline configuration.`,
    [PipelineErrorTypes.PROMPT]: `Failed to build the prompt for this step. Check that all tokens are valid.`,
    [PipelineErrorTypes.LLM]: `The AI service returned an error. This might be temporary - try again later.`,
    [PipelineErrorTypes.PARSE]: `The AI response couldn't be parsed as expected. The step might need clearer instructions.`,
    [PipelineErrorTypes.STORE]: `Failed to save data to the store. The data might not match the expected format.`,
    [PipelineErrorTypes.TIMEOUT]: `The operation took too long and was cancelled. Try with simpler prompts.`,
    [PipelineErrorTypes.CANCELLED]: `Execution was cancelled.`,
    [PipelineErrorTypes.UNKNOWN]: `An unexpected error occurred: ${error.message}`
  };

  return messages[error.type] || error.message;
}

_summarizeErrors(errors) {
  const byType = {};
  for (const err of errors) {
    byType[err.type] = (byType[err.type] || 0) + 1;
  }

  return {
    total: errors.length,
    byType,
    firstError: errors[0]?.message,
    allRecoverable: errors.every(e => e.recoverable)
  };
}
```

### 8. UI: Error Display

Update UI to show errors clearly:

```javascript
// Location: ui/curation-modal.js, add method

_displayExecutionErrors(errors) {
  if (!errors || errors.length === 0) return '';

  return `
    <div class="pipeline-errors">
      <h5>Errors (${errors.length})</h5>
      <ul class="error-list">
        ${errors.map(err => `
          <li class="error-item error-type-${err.type}">
            <span class="error-step">${err.stepName || `Step ${err.stepIndex + 1}`}:</span>
            <span class="error-message">${err.userMessage}</span>
            ${err.recoverable ? '<span class="error-badge">recoverable</span>' : ''}
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `core/curation-system.js` | Add PipelineError class, error handling, retry logic, cancellation |
| `ui/curation-modal.js` | Add error display, connect cancel button |
| `styles/main.css` | Add error styling |

## Acceptance Criteria

1. [ ] PipelineError class categorizes errors correctly
2. [ ] All error types are caught and normalized
3. [ ] Retry logic works for transient failures
4. [ ] Continue-on-error mode works when enabled
5. [ ] Cancellation stops execution cleanly
6. [ ] Error messages are user-friendly
7. [ ] Errors are displayed clearly in UI
8. [ ] Stack traces are available for debugging
9. [ ] Pipeline state is consistent after errors
10. [ ] Events are emitted for error tracking

## Testing

```javascript
// Test error classification
try {
  throw new Error('Agent not found: test_agent');
} catch (e) {
  const normalized = curationSystem._normalizeError(e, step, 0);
  console.log('Type:', normalized.type); // Should be 'agent'
}

// Test retry
const result = await curationSystem.executePipeline(pipelineId, {
  _options: { maxRetries: 3 }
});

// Test cancellation
const execId = await curationSystem.executePipelineAsync(pipelineId, {});
setTimeout(() => curationSystem.cancelExecution(execId), 1000);

// Test continue-on-error
const result = await curationSystem.executePipeline(pipelineId, {
  _options: { continueOnError: true }
});
console.log('Completed steps:', result.stepResults.length);
console.log('Errors:', result.errors);
```

## Notes

- Retry delays use exponential backoff (delay * attempt)
- Cancellation is cooperative - steps check at safe points
- User-friendly messages help non-technical users
- Error details preserved for debugging
