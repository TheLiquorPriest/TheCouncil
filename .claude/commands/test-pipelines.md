# Test Pipelines Command

## Overview
Manual slash command to run curation pipeline tests in the browser console.

## Usage

Run all pipeline tests:
```
/test-pipelines
```

## What It Tests

### CRUD Pipeline Tests (14 pipelines)
- **Structure Validation**: Ensures all required fields exist
- **Operation Validation**: Verifies create, read, update, delete operations
- **Type Checking**: Validates singleton vs collection pipeline structure
- **Registration**: Confirms all 14 CRUD pipelines are registered

CRUD Pipelines tested:
1. `crud-storyDraft` (singleton)
2. `crud-storyOutline` (singleton)
3. `crud-storySynopsis` (singleton)
4. `crud-plotLines` (collection)
5. `crud-scenes` (collection)
6. `crud-dialogueHistory` (collection)
7. `crud-characterSheets` (collection)
8. `crud-characterDevelopment` (collection)
9. `crud-characterInventory` (collection)
10. `crud-characterPositions` (collection)
11. `crud-factionSheets` (collection)
12. `crud-locationSheets` (collection)
13. `crud-currentSituation` (singleton)
14. `crud-agentCommentary` (collection)

### RAG Pipeline Tests (14 pipelines)
- **Structure Validation**: Ensures all required fields exist
- **Actions Validation**: Verifies action structure and templates
- **Schema Validation**: Validates input/output schema definitions
- **Registration**: Confirms all 14 RAG pipelines are registered

RAG Pipelines tested:
1. `rag-storyDraft`
2. `rag-storyOutline`
3. `rag-storySynopsis`
4. `rag-plotLines`
5. `rag-scenes`
6. `rag-dialogueHistory`
7. `rag-characterSheets`
8. `rag-characterDevelopment`
9. `rag-characterInventory`
10. `rag-characterPositions`
11. `rag-factionSheets`
12. `rag-locationSheets`
13. `rag-currentSituation`
14. `rag-agentCommentary`

## Running Tests Manually

If the slash command is not available, run directly in browser console:

```javascript
// Open browser DevTools (F12)
// Paste into console:
window.TheCouncil.runCurationPipelineTests()
```

## Expected Output

```
[CurationPipelineTests][INFO] ============================================================
[CurationPipelineTests][INFO] TheCouncil Curation Pipelines Test Suite
[CurationPipelineTests][INFO] ============================================================
[CurationPipelineTests][INFO] Running: Test Infrastructure Setup
[CurationPipelineTests][PASS] PASS: Test Infrastructure Setup (2ms)
[CurationPipelineTests][INFO] Running: CRUD Pipelines Registration
[CurationPipelineTests][INFO]   ✓ crud-storyDraft
[CurationPipelineTests][INFO]   ✓ crud-storyOutline
...
[CurationPipelineTests][PASS] PASS: CRUD Pipelines Registration (5ms)
...
[CurationPipelineTests][INFO] Test Summary
[CurationPipelineTests][INFO] Total Tests: 9
[CurationPipelineTests][PASS] Passed: 9
[CurationPipelineTests][INFO] Duration: 45ms
```

## Success Criteria

- All 14 CRUD pipelines pass validation
- All 14 RAG pipelines pass validation
- Test suite completes with 0 failures
- Results logged to browser console

## Implementation Notes

- Tests follow the pattern established in `tests/integration-test.js`
- Tests are non-destructive (no data modification)
- Tests are synchronous and complete quickly
- Tests validate structure, not execution behavior
- All 28 pipelines must be registered via CurationSystem

## Related Files

- `tests/curation-pipelines-test.js` - Test implementation
- `core/curation-system.js` - Pipeline registration
- `data/pipelines/crud/*.json` - CRUD pipeline definitions (Task 2.3.1)
- `data/pipelines/rag/*.json` - RAG pipeline definitions (Task 2.3.2)

## Task Reference

**Task:** 2.3.3 - pipeline-testing-integration
**Phase:** 2 - Curation System Enhancements
**Priority:** P1
**Dependencies:** Tasks 2.3.1, 2.3.2
