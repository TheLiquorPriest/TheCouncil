# Task 2.2.1: curation-pipeline-preview

## Metadata

- **Group**: 2 - Curation Enhancements
- **Block**: 2 - Preview Mode
- **Priority**: P1
- **Complexity**: complex
- **Agent**: dev-opus
- **Status**: PENDING

## Description

Add preview mode for curation pipelines that allows testing without modifying actual data. Uses in-memory store clones and shows a diff of changes before applying.

## Files

- `core/curation-system.js` - Add preview execution logic
- `ui/curation-modal.js` - Add preview button and diff display

## Dependencies

- Task 2.1.1: curation-pipeline-run-button (preview builds on run)

## Acceptance Criteria

- [ ] Preview button appears next to Run button
- [ ] Preview executes without modifying actual stores
- [ ] Preview shows "before" and "after" comparison
- [ ] User can apply or discard preview changes
- [ ] Console logs: `[CurationSystem] Pipeline preview: {id}`

## Implementation Notes

### System Changes (curation-system.js)

1. Add `executePipelinePreview()` method:
```javascript
async executePipelinePreview(pipelineId, options = {}) {
  const pipeline = this.getPipeline(pipelineId);
  if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);

  this._logger.log('info', `Preview pipeline: ${pipelineId}`);

  // Create temporary store clones
  const previewStores = new Map();
  const targetStores = pipeline.targetStores || [pipeline.storeId];

  for (const storeId of targetStores) {
    const originalData = this._stores.get(storeId);
    previewStores.set(storeId, this._deepClone(originalData));
  }

  // Execute with preview stores
  const result = await this._executePipelineInternal(pipeline, {
    ...options,
    stores: previewStores,
    preview: true
  });

  // Calculate diff
  const changes = this._calculateDiff(targetStores, previewStores);

  return {
    ...result,
    preview: true,
    changes,
    applyChanges: () => this._applyPreviewChanges(targetStores, previewStores)
  };
}
```

2. Add helper methods:
```javascript
_deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

_calculateDiff(storeIds, previewStores) {
  const diff = {};
  for (const storeId of storeIds) {
    const original = this._stores.get(storeId);
    const preview = previewStores.get(storeId);
    diff[storeId] = {
      added: [],    // entries in preview not in original
      modified: [], // entries changed
      deleted: []   // entries in original not in preview
    };
    // ... implement diff logic
  }
  return diff;
}

_applyPreviewChanges(storeIds, previewStores) {
  for (const storeId of storeIds) {
    this._stores.set(storeId, previewStores.get(storeId));
  }
  this._emit('stores:updated', { storeIds });
}
```

### UI Changes (curation-modal.js)

1. Add preview button next to run button:
```javascript
const previewButton = document.createElement('button');
previewButton.className = 'council-btn council-btn-secondary council-btn-sm';
previewButton.innerHTML = '👁 Preview';
previewButton.onclick = () => this._previewPipeline(pipeline.id);
```

2. Add `_previewPipeline()` method:
```javascript
async _previewPipeline(pipelineId) {
  try {
    const result = await this._curationSystem.executePipelinePreview(pipelineId);
    this._showPreviewResult(result);
  } catch (error) {
    this._showPipelineError(error);
  }
}
```

3. Add preview result modal/panel:
   - Show diff with added/modified/deleted entries
   - "Apply Changes" button calls `result.applyChanges()`
   - "Discard" button closes preview

## Testing

1. Open Curation Modal > Pipelines tab
2. Click Preview on a pipeline
3. Verify no actual data changed
4. Verify diff display is accurate
5. Test Apply Changes → verify data updated
6. Test Discard → verify data unchanged
