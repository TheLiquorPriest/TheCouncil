# Task 5.7.6: Progress Events & UI Updates

**ID**: 5.7.6
**Name**: progress-events-ui-updates
**Priority**: P1
**Agent**: dev-sonnet
**Status**: PENDING
**Depends On**: 5.7.5

## Problem Statement

Users have no visibility into pipeline execution progress. When a pipeline runs:
1. There's no indication which step is executing
2. There's no progress bar or percentage
3. There's no way to see intermediate results
4. There's no feedback during long LLM calls

## Objective

Implement progress events and UI updates that:
1. Emit events at key execution points
2. Update the UI with progress information
3. Show which step is currently executing
4. Display intermediate results as they complete

## Technical Requirements

### 1. Event Definitions

Events already being emitted (from previous tasks):
- `pipeline:step:start` - Step begins
- `pipeline:step:complete` - Step finished successfully
- `pipeline:step:error` - Step failed
- `pipeline:llm:start` - LLM call begins
- `pipeline:llm:complete` - LLM call finished
- `pipeline:llm:error` - LLM call failed
- `pipeline:store:write:start` - Store write begins
- `pipeline:store:write:complete` - Store write finished
- `pipeline:store:write:error` - Store write failed

Add pipeline-level events:

```javascript
// Location: curation-system.js, in _executeCRUDPipeline

// At pipeline start
this._emit('pipeline:execution:start', {
  pipelineId: pipeline.id,
  pipelineName: pipeline.name,
  totalSteps: executionContext.totalSteps,
  preview: executionContext.preview
});

// At pipeline end
this._emit('pipeline:execution:complete', {
  pipelineId: pipeline.id,
  pipelineName: pipeline.name,
  success: executionContext.errors.length === 0,
  duration: Date.now() - executionContext.startTime,
  stepsCompleted: executionContext.stepResults.length,
  totalSteps: executionContext.totalSteps
});

// On pipeline error (if aborted)
this._emit('pipeline:execution:error', {
  pipelineId: pipeline.id,
  pipelineName: pipeline.name,
  error: executionContext.errors[0]?.error,
  stepsCompleted: executionContext.stepResults.length,
  totalSteps: executionContext.totalSteps
});
```

### 2. Progress Event with Percentage

Add detailed progress event:

```javascript
// Location: curation-system.js, new method

_emitProgress(executionContext, phase, details = {}) {
  const { currentStepIndex, totalSteps, pipeline } = executionContext;

  // Calculate progress percentage
  // Each step has phases: prompt resolution (10%), LLM call (70%), output handling (20%)
  let baseProgress = (currentStepIndex / totalSteps) * 100;
  let phaseProgress = 0;

  switch (phase) {
    case 'prompt_resolving':
      phaseProgress = 5;
      break;
    case 'llm_calling':
      phaseProgress = 10;
      break;
    case 'llm_streaming':
      phaseProgress = 10 + (details.streamProgress || 0) * 60;
      break;
    case 'output_parsing':
      phaseProgress = 80;
      break;
    case 'store_writing':
      phaseProgress = 90;
      break;
    case 'step_complete':
      phaseProgress = 100;
      break;
  }

  const stepProgress = phaseProgress / 100;
  const totalProgress = baseProgress + (stepProgress * (100 / totalSteps));

  this._emit('pipeline:progress', {
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    currentStep: currentStepIndex + 1,
    totalSteps,
    currentStepName: executionContext.steps[currentStepIndex]?.name,
    phase,
    phaseLabel: this._getPhaseLabel(phase),
    progress: Math.min(Math.round(totalProgress), 100),
    details
  });
}

_getPhaseLabel(phase) {
  const labels = {
    'prompt_resolving': 'Resolving prompt...',
    'llm_calling': 'Calling LLM...',
    'llm_streaming': 'Receiving response...',
    'output_parsing': 'Parsing output...',
    'store_writing': 'Writing to store...',
    'step_complete': 'Step complete'
  };
  return labels[phase] || phase;
}
```

### 3. Integrate Progress into Step Execution

Update _executeStep to emit progress:

```javascript
// Location: curation-system.js, update _executeStep

async _executeStep(step, executionContext) {
  const stepInput = this._resolveStepInput(step, executionContext);

  // Agent resolution
  const agent = this.getCurationAgent(step.agentId);
  // ... validation ...

  // Emit prompt resolution progress
  this._emitProgress(executionContext, 'prompt_resolving');

  const promptContext = this._buildStepPromptContext(step, stepInput, executionContext);
  const resolvedPrompt = await this._resolveStepPrompt(step, promptContext);

  if (executionContext.preview) {
    return this._generatePreviewResult(step, agent, resolvedPrompt, promptContext);
  }

  // Emit LLM call progress
  this._emitProgress(executionContext, 'llm_calling', { agentName: agent.name });

  const llmResponse = await this._callAgentLLM(agent, resolvedPrompt, executionContext);

  // Emit output parsing progress
  this._emitProgress(executionContext, 'output_parsing');

  const parsedOutput = this._parseStepOutput(step, llmResponse);

  // Emit step complete progress
  this._emitProgress(executionContext, 'step_complete');

  return {
    input: stepInput,
    agent: { id: agent.id, name: agent.name },
    prompt: resolvedPrompt,
    rawResponse: llmResponse,
    output: parsedOutput
  };
}
```

### 4. UI: Progress Display Component

Create/update execution progress display in curation-modal.js:

```javascript
// Location: ui/curation-modal.js, new methods

_initExecutionProgress() {
  // Subscribe to execution events
  this._kernel.on('pipeline:execution:start', this._onPipelineStart.bind(this));
  this._kernel.on('pipeline:progress', this._onPipelineProgress.bind(this));
  this._kernel.on('pipeline:execution:complete', this._onPipelineComplete.bind(this));
  this._kernel.on('pipeline:execution:error', this._onPipelineError.bind(this));
  this._kernel.on('pipeline:step:complete', this._onStepComplete.bind(this));
}

_onPipelineStart(data) {
  // Show execution modal/overlay
  this._showExecutionProgress({
    pipelineId: data.pipelineId,
    pipelineName: data.pipelineName,
    totalSteps: data.totalSteps,
    preview: data.preview
  });
}

_onPipelineProgress(data) {
  // Update progress bar and status
  this._updateExecutionProgress({
    progress: data.progress,
    currentStep: data.currentStep,
    totalSteps: data.totalSteps,
    currentStepName: data.currentStepName,
    phaseLabel: data.phaseLabel
  });
}

_onStepComplete(data) {
  // Add completed step to list
  this._addCompletedStep({
    stepIndex: data.stepIndex,
    stepName: data.stepName,
    success: data.success
  });
}

_onPipelineComplete(data) {
  // Show completion status
  this._showExecutionComplete({
    success: data.success,
    duration: data.duration,
    stepsCompleted: data.stepsCompleted
  });
}

_onPipelineError(data) {
  // Show error status
  this._showExecutionError({
    error: data.error,
    stepsCompleted: data.stepsCompleted,
    totalSteps: data.totalSteps
  });
}
```

### 5. UI: Progress HTML Template

```javascript
// Location: ui/curation-modal.js, add to _renderExecutionProgress or similar

_renderExecutionProgressHTML(data) {
  return `
    <div class="pipeline-execution-progress" data-pipeline-id="${data.pipelineId}">
      <div class="pep-header">
        <h4>${data.preview ? 'Preview: ' : ''}${data.pipelineName}</h4>
        <span class="pep-status">Running...</span>
      </div>

      <div class="pep-progress-bar">
        <div class="pep-progress-fill" style="width: 0%"></div>
      </div>

      <div class="pep-progress-text">
        <span class="pep-step-counter">Step 0/${data.totalSteps}</span>
        <span class="pep-percentage">0%</span>
      </div>

      <div class="pep-current-step">
        <span class="pep-phase-label">Initializing...</span>
      </div>

      <div class="pep-steps-list">
        <!-- Completed steps will be added here -->
      </div>

      <div class="pep-actions">
        <button class="pep-cancel-btn" data-action="cancel-execution">Cancel</button>
      </div>
    </div>
  `;
}

_updateProgressUI(data) {
  const container = this.modal.querySelector('.pipeline-execution-progress');
  if (!container) return;

  // Update progress bar
  const fill = container.querySelector('.pep-progress-fill');
  if (fill) fill.style.width = `${data.progress}%`;

  // Update step counter
  const counter = container.querySelector('.pep-step-counter');
  if (counter) counter.textContent = `Step ${data.currentStep}/${data.totalSteps}`;

  // Update percentage
  const percentage = container.querySelector('.pep-percentage');
  if (percentage) percentage.textContent = `${data.progress}%`;

  // Update phase label
  const phaseLabel = container.querySelector('.pep-phase-label');
  if (phaseLabel) {
    phaseLabel.textContent = data.currentStepName
      ? `${data.currentStepName}: ${data.phaseLabel}`
      : data.phaseLabel;
  }
}

_addCompletedStepUI(data) {
  const list = this.modal.querySelector('.pep-steps-list');
  if (!list) return;

  const stepEl = document.createElement('div');
  stepEl.className = `pep-step-item ${data.success ? 'success' : 'error'}`;
  stepEl.innerHTML = `
    <span class="pep-step-icon">${data.success ? '✓' : '✗'}</span>
    <span class="pep-step-name">${data.stepName}</span>
  `;
  list.appendChild(stepEl);
}
```

### 6. CSS for Progress Display

```css
/* Location: styles/main.css */

.pipeline-execution-progress {
  padding: 16px;
  background: var(--SmartThemeChatBG, #1a1a1a);
  border-radius: 8px;
  margin: 16px 0;
}

.pep-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.pep-header h4 {
  margin: 0;
  color: var(--SmartThemeColor, #fff);
}

.pep-status {
  font-size: 12px;
  color: var(--SmartThemeMutedColor, #888);
}

.pep-progress-bar {
  height: 8px;
  background: var(--SmartThemeBorderColor, #333);
  border-radius: 4px;
  overflow: hidden;
}

.pep-progress-fill {
  height: 100%;
  background: var(--SmartThemeAccent, #4a9eff);
  transition: width 0.3s ease;
}

.pep-progress-text {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: var(--SmartThemeMutedColor, #888);
}

.pep-current-step {
  margin-top: 12px;
  padding: 8px;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
}

.pep-phase-label {
  font-size: 13px;
  color: var(--SmartThemeColor, #fff);
}

.pep-steps-list {
  margin-top: 12px;
  max-height: 150px;
  overflow-y: auto;
}

.pep-step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 12px;
}

.pep-step-item.success .pep-step-icon {
  color: #4caf50;
}

.pep-step-item.error .pep-step-icon {
  color: #f44336;
}

.pep-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.pep-cancel-btn {
  padding: 6px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pep-cancel-btn:hover {
  background: #c82333;
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `core/curation-system.js` | Add `_emitProgress`, integrate progress events into execution |
| `ui/curation-modal.js` | Add event handlers, progress display methods |
| `styles/main.css` | Add progress display styles |

## Acceptance Criteria

1. [ ] Pipeline start event is emitted
2. [ ] Progress events are emitted at each phase
3. [ ] Progress percentage is calculated correctly
4. [ ] Step complete events are emitted
5. [ ] Pipeline complete/error events are emitted
6. [ ] UI shows progress bar
7. [ ] UI shows current step name and phase
8. [ ] UI shows completed steps list
9. [ ] Progress updates smoothly during execution
10. [ ] Cancel button is visible (actual cancellation can be future work)

## Testing

```javascript
// Test events
curationSystem._kernel.on('pipeline:progress', (data) => {
  console.log('Progress:', data.progress, data.phaseLabel);
});

// Run pipeline and watch console
await curationSystem.executePipeline(pipelineId, {});

// Verify UI updates
// - Progress bar should fill
// - Step counter should update
// - Steps should appear in list
```

## Notes

- Progress events enable future features like streaming updates
- Cancel functionality would require execution context to be interruptible
- Consider adding estimated time remaining based on step durations
