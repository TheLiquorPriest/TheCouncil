# Task 5.7.8: Pipeline Execution Testing & Verification

**ID**: 5.7.8
**Name**: pipeline-execution-testing
**Priority**: P0
**Agent**: ui-feature-verification-test-opus
**Status**: PENDING
**Depends On**: 5.7.6, 5.7.7

## Problem Statement

After implementing CRUD pipeline execution (5.7.1-5.7.7), we need comprehensive testing to verify:
1. All execution flows work correctly
2. UI updates properly during execution
3. Error handling works as expected
4. Preview mode is accurate
5. Store operations are correct

## Objective

Perform end-to-end testing of pipeline execution including:
1. Browser-based UI verification
2. Console verification of execution flow
3. Store state verification
4. Error scenario testing
5. Preview vs actual execution comparison

## Test Plan

### Test 1: Basic Pipeline Execution

**Setup**:
1. Create a simple CRUD pipeline with 1 step
2. Configure step with Character Topologist Agent
3. Set output target to "store"

**Steps**:
1. Navigate to Curation modal → Pipelines tab
2. Select the test pipeline
3. Click "Run" button
4. Observe execution progress

**Expected Results**:
- [ ] Progress bar appears
- [ ] Step counter updates (1/1)
- [ ] Phase labels change (Resolving prompt → Calling LLM → Parsing output)
- [ ] Completion message appears
- [ ] Store receives new record
- [ ] Toast notification shows success

**Verification Commands**:
```javascript
// Check store
console.log(TheCouncil.curationSystem.getStore('your_store_id'));

// Check events fired
// (Set up listener before running)
TheCouncil.kernel.on('pipeline:execution:complete', (d) => console.log('Complete:', d));
```

### Test 2: Multi-Step Pipeline

**Setup**:
1. Create pipeline with 3 steps
2. Step 1: output to next_step
3. Step 2: output to variable
4. Step 3: output to store (uses variable from step 2)

**Steps**:
1. Run the pipeline
2. Monitor each step's execution

**Expected Results**:
- [ ] All 3 steps execute in sequence
- [ ] Progress shows 33% → 66% → 100%
- [ ] Data flows correctly between steps
- [ ] Variable is accessible in step 3
- [ ] Final store write includes correct data

**Verification**:
```javascript
// Monitor data flow
TheCouncil.kernel.on('pipeline:step:complete', (d) => {
  console.log(`Step ${d.stepIndex} complete:`, d);
});
```

### Test 3: Preview Mode

**Setup**:
1. Use same pipeline from Test 2
2. Note current store state

**Steps**:
1. Click "Preview" instead of "Run"
2. Review preview output

**Expected Results**:
- [ ] Preview shows all 3 steps
- [ ] Each step shows resolved prompt
- [ ] Each step shows agent config
- [ ] Data flow is simulated
- [ ] Store changes section shows what WOULD happen
- [ ] Token estimate is provided
- [ ] Cost estimate is provided
- [ ] **Store is NOT modified**

**Verification**:
```javascript
// Store should be unchanged
const storeBefore = JSON.stringify(TheCouncil.curationSystem.getStore('test_store'));
// Run preview
// ...
const storeAfter = JSON.stringify(TheCouncil.curationSystem.getStore('test_store'));
console.log('Store unchanged:', storeBefore === storeAfter); // Should be true
```

### Test 4: Error Handling - Missing Agent

**Setup**:
1. Create pipeline with step referencing non-existent agent

**Steps**:
1. Run the pipeline
2. Observe error handling

**Expected Results**:
- [ ] Error is caught
- [ ] Clear error message displayed
- [ ] Error type is "agent"
- [ ] Pipeline stops execution
- [ ] No partial store writes

**Verification**:
```javascript
// Check error in result
const result = await TheCouncil.curationSystem.executePipeline('test_pipeline', {});
console.log('Errors:', result.errors);
console.log('First error type:', result.errors[0]?.type); // Should be 'agent'
```

### Test 5: Error Handling - LLM Failure

**Setup**:
1. Temporarily break API connection or use invalid config

**Steps**:
1. Run pipeline
2. Observe LLM error handling

**Expected Results**:
- [ ] Error is caught
- [ ] Error type is "llm"
- [ ] Retry attempts are made (if configured)
- [ ] Clear error message to user
- [ ] Execution stops gracefully

### Test 6: Error Handling - Continue on Error

**Setup**:
1. Pipeline with 3 steps
2. Step 2 configured to fail (e.g., missing agent)
3. Enable continueOnError option

**Steps**:
1. Run pipeline with continueOnError: true

**Expected Results**:
- [ ] Step 1 completes
- [ ] Step 2 fails but records error
- [ ] Step 3 executes (with null input from step 2)
- [ ] Result shows 2 completed, 1 error
- [ ] Error is marked as recoverable

**Verification**:
```javascript
const result = await TheCouncil.curationSystem.executePipeline('test_pipeline', {
  _options: { continueOnError: true }
});
console.log('Steps completed:', result.stepResults.length);
console.log('Errors:', result.errors);
```

### Test 7: Store Operations

**Test 7a: Create**
- [ ] New record is created
- [ ] Key is generated if not provided
- [ ] _meta fields are added (createdAt, version)
- [ ] Record appears in store

**Test 7b: Update**
- [ ] Existing record is found
- [ ] Fields are merged correctly
- [ ] _meta.updatedAt is set
- [ ] Version is incremented

**Test 7c: Delete**
- [ ] Record is removed
- [ ] Confirmation of deletion

**Test 7d: Upsert**
- [ ] Creates if not exists
- [ ] Updates if exists
- [ ] Correct operation recorded

### Test 8: Prompt Resolution

**Setup**:
1. Pipeline with step using "tokens" mode
2. Add various token types to stack

**Steps**:
1. Run preview
2. Check resolved prompt

**Expected Results**:
- [ ] ST tokens resolve ({{char}}, {{user}}, etc.)
- [ ] Council tokens resolve
- [ ] Custom tokens resolve
- [ ] Context variables resolve ({{input}}, {{previousOutput}})
- [ ] Missing tokens handled gracefully

### Test 9: Progress Events

**Setup**:
1. Set up event listeners for all progress events

**Steps**:
1. Run a 2-step pipeline
2. Log all events

**Expected Events (in order)**:
- [ ] `pipeline:execution:start`
- [ ] `pipeline:step:start` (step 0)
- [ ] `pipeline:progress` (prompt_resolving)
- [ ] `pipeline:llm:start`
- [ ] `pipeline:progress` (llm_calling)
- [ ] `pipeline:llm:complete`
- [ ] `pipeline:progress` (output_parsing)
- [ ] `pipeline:step:complete` (step 0)
- [ ] `pipeline:step:start` (step 1)
- [ ] ... (repeat for step 1)
- [ ] `pipeline:execution:complete`

### Test 10: Cancellation

**Setup**:
1. Pipeline with slow execution (multiple steps)

**Steps**:
1. Start pipeline execution
2. Click cancel button mid-execution

**Expected Results**:
- [ ] Execution stops
- [ ] `pipeline:execution:cancelled` event fires
- [ ] Partial results are returned
- [ ] Store is not left in inconsistent state
- [ ] UI shows cancelled status

## Browser Automation Commands

```javascript
// Navigate to Curation modal
mcp__playwright__browser_navigate({ url: 'http://127.0.0.1:8000/' });

// Open nav modal
mcp__playwright__browser_click({ element: 'Council button', ref: 'council-btn-ref' });

// Go to Curation
mcp__playwright__browser_click({ element: 'Curation nav item', ref: 'curation-nav-ref' });

// Select Pipelines tab
mcp__playwright__browser_click({ element: 'Pipelines tab', ref: 'pipelines-tab-ref' });

// Run pipeline
mcp__playwright__browser_click({ element: 'Run button', ref: 'run-btn-ref' });

// Check progress display
mcp__playwright__browser_snapshot(); // Look for .pipeline-execution-progress element
```

## Console Verification Script

```javascript
// Comprehensive test script
async function testPipelineExecution() {
  const cs = window.TheCouncil.curationSystem;
  const results = { passed: 0, failed: 0, tests: [] };

  function test(name, fn) {
    try {
      const result = fn();
      results.tests.push({ name, passed: true, result });
      results.passed++;
    } catch (e) {
      results.tests.push({ name, passed: false, error: e.message });
      results.failed++;
    }
  }

  // Test 1: Pipeline exists
  test('Pipeline retrieval', () => {
    const pipeline = cs.getCurationPipeline('test_pipeline_id');
    if (!pipeline) throw new Error('Pipeline not found');
    return pipeline.name;
  });

  // Test 2: Preview works
  test('Preview execution', async () => {
    const result = await cs.executePipelinePreview('test_pipeline_id', {});
    if (!result.preview) throw new Error('Not a preview result');
    if (!result.steps) throw new Error('No steps in preview');
    return `${result.steps.length} steps previewed`;
  });

  // Add more tests...

  console.log('Test Results:', results);
  return results;
}

testPipelineExecution();
```

## Acceptance Criteria

1. [ ] All 10 test scenarios pass
2. [ ] No console errors during execution
3. [ ] UI updates correctly in all scenarios
4. [ ] Store state is correct after operations
5. [ ] Preview accurately represents execution
6. [ ] Errors are handled gracefully
7. [ ] Events fire in correct order
8. [ ] Performance is acceptable (< 30s for 3-step pipeline)

## Files to Review

| File | Verification Focus |
|------|-------------------|
| `core/curation-system.js` | Execution logic, store operations |
| `ui/curation-modal.js` | UI updates, progress display |
| `styles/main.css` | Progress bar styling |

## Notes

- Tests should be run with real SillyTavern connection
- Some tests may require mock API responses
- Document any bugs found for 5.5.x tasks
- Create regression tests for future changes
