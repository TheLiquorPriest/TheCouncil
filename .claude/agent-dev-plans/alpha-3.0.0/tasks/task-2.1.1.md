# Task 2.1.1: curation-pipeline-run-button

## Metadata

- **Group**: 2 - Curation Enhancements
- **Block**: 1 - Pipeline Triggering
- **Priority**: P0
- **Complexity**: moderate
- **Agent**: dev-sonnet
- **Status**: PENDING

## Description

Add a "Run" button to manually trigger curation pipelines from the UI. Users should be able to execute any configured pipeline on-demand with visual feedback.

## Files

- `ui/curation-modal.js` - Add run button and execution UI
- `core/curation-system.js` - Add/verify executePipeline method

## Dependencies

None - first task in Group 2

## Acceptance Criteria

- [ ] Run button appears next to each pipeline in the list
- [ ] Clicking Run executes the pipeline
- [ ] Progress indicator shows during execution
- [ ] Results/errors displayed after completion
- [ ] Console logs: `[CurationSystem] Pipeline executed: {id}`

## Implementation Notes

### UI Changes (curation-modal.js)

1. In `_renderPipelinesTab()`, add run button to each pipeline row:
```javascript
const runButton = document.createElement('button');
runButton.className = 'council-btn council-btn-primary council-btn-sm';
runButton.innerHTML = '▶ Run';
runButton.onclick = () => this._runPipeline(pipeline.id);
```

2. Add `_runPipeline(pipelineId)` method:
```javascript
async _runPipeline(pipelineId) {
  const pipeline = this._curationSystem.getPipeline(pipelineId);
  if (!pipeline) return;

  this._showPipelineExecution(pipeline);

  try {
    const result = await this._curationSystem.executePipeline(pipelineId, {
      source: 'manual',
      preview: false
    });
    this._showPipelineResult(result);
  } catch (error) {
    this._showPipelineError(error);
  }
}
```

3. Add execution UI helpers:
   - `_showPipelineExecution(pipeline)` - Show loading state
   - `_showPipelineResult(result)` - Show success with details
   - `_showPipelineError(error)` - Show error with retry option

### System Changes (curation-system.js)

Verify `executePipeline()` exists and handles manual execution. If not, implement:

```javascript
async executePipeline(pipelineId, options = {}) {
  const pipeline = this.getPipeline(pipelineId);
  if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);

  this._logger.log('info', `Executing pipeline: ${pipelineId}`);
  this._emit('pipeline:executing', { pipelineId });

  const result = await this._executePipelineInternal(pipeline, options);

  this._emit('pipeline:executed', { pipelineId, result });
  return result;
}
```

## Testing

1. Open Curation Modal > Pipelines tab
2. Verify Run button appears for each pipeline
3. Click Run - verify execution feedback
4. Check console for execution logs
5. Verify result/error display
