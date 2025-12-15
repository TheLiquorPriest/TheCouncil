# Task 2.3.3: pipeline-testing-integration

## Metadata

- **Group**: 2 - Curation Enhancements
- **Block**: 3 - Default Pipelines
- **Priority**: P1
- **Complexity**: simple
- **Agent**: dev-haiku
- **Status**: PENDING

## Description

Create automated tests for the default CRUD and RAG pipelines. Tests should validate pipeline structure, execution, and results.

## Files

- `tests/curation-pipelines-test.js` - Test file
- `.claude/commands/test-pipelines.md` - Slash command (update)

## Dependencies

- Task 2.3.1: create-default-crud-pipelines
- Task 2.3.2: create-default-rag-pipelines

## Acceptance Criteria

- [ ] Test file validates all 28 pipelines
- [ ] Tests check JSON structure validity
- [ ] Tests verify pipeline registration
- [ ] Slash command runs tests
- [ ] Test results logged to console

## Implementation Notes

### Test File Structure

```javascript
// tests/curation-pipelines-test.js

const CurationPipelineTests = {

  async runAll() {
    console.log('[PipelineTests] Starting pipeline tests...');

    const results = {
      passed: 0,
      failed: 0,
      errors: []
    };

    // Test CRUD pipelines
    await this._testCRUDPipelines(results);

    // Test RAG pipelines
    await this._testRAGPipelines(results);

    console.log(`[PipelineTests] Complete: ${results.passed} passed, ${results.failed} failed`);
    return results;
  },

  async _testCRUDPipelines(results) {
    const crudPipelines = window.CurationSystem.getCRUDPipelines();

    for (const [id, pipeline] of crudPipelines) {
      try {
        this._validatePipelineStructure(pipeline, 'crud');
        results.passed++;
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }
  },

  async _testRAGPipelines(results) {
    const ragPipelines = window.CurationSystem.getRAGPipelines();

    for (const [id, pipeline] of ragPipelines) {
      try {
        this._validatePipelineStructure(pipeline, 'rag');
        results.passed++;
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }
  },

  _validatePipelineStructure(pipeline, type) {
    if (!pipeline.id) throw new Error('Missing id');
    if (!pipeline.name) throw new Error('Missing name');
    if (!pipeline.actions || !Array.isArray(pipeline.actions)) {
      throw new Error('Missing or invalid actions');
    }

    for (const action of pipeline.actions) {
      if (!action.id) throw new Error(`Action missing id`);
      if (!action.promptTemplate) throw new Error(`Action ${action.id} missing promptTemplate`);
    }
  }
};

// Export for browser console
window.CurationPipelineTests = CurationPipelineTests;
```

### Slash Command Update

Update `.claude/commands/test-pipelines.md`:

```markdown
# Test Pipelines

Run curation pipeline tests.

## Usage

```javascript
// In browser console:
await window.CurationPipelineTests.runAll()
```

## Expected Output

```
[PipelineTests] Starting pipeline tests...
[PipelineTests] Testing CRUD pipelines...
[PipelineTests] Testing RAG pipelines...
[PipelineTests] Complete: 28 passed, 0 failed
```
```

### Integration with TheCouncil

Add to window.TheCouncil:

```javascript
runPipelineTests: () => CurationPipelineTests.runAll()
```

## Testing

1. Run `window.CurationPipelineTests.runAll()` in console
2. Verify all 28 pipelines pass validation
3. Check error messages for any failures
4. Verify test results are clear and actionable
