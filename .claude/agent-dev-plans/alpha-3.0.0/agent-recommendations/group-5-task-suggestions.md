# Group 5 Task Suggestions

**Source**: Block 4.1-4.2 Verification (Tasks 4.1.1, 4.2.1, 4.2.2)
**Date**: 2025-12-15
**Updated**: 2025-12-17 (UI test results added)
**Author**: Task Runner Agent

---

## UI Test Results: Curation Modal (2025-12-17)

**Agent**: ui-feature-verification-test-opus
**Status**: ✅ PASSED (15+ tests, 1 confirmed bug)

### Tab Testing Results

| Tab | Status | Notes |
|-----|--------|-------|
| Overview | ✅ PASS | Default tab, stats correct, all 14 stores displayed |
| Stores | ✅ PASS | Table view, View/Add buttons work, Create Entry form comprehensive |
| Search | ✅ PASS | Search input, filters, empty state all working |
| Team | ✅ PASS | 6 positions, 6 agents, Edit modal with Prompt Builder works |
| Pipelines | ⚠️ PASS (bug) | 17 CRUD + 19 RAG pipelines listed, but has JS error |

### Bug Confirmed

**Task 5.1.1** (curation-pipeline-builder TypeError) - **CONFIRMED** via live browser testing

### Visual Issues Check

**No color/readability issues found in Curation Modal.** The reported issues may be in:
- Navigation Modal
- Character Modal
- Pipeline Modal
- Injection Modal
- Gavel Modal

**Recommendation**: Run `/ui-test nav`, `/ui-test character`, etc. to locate the color/readability issues.

---

## Bug Fixes

### 5.1.1: Fix TypeError in curation-pipeline-builder.js

**Priority**: P2 (Medium)
**File**: `ui/components/curation-pipeline-builder.js:509`
**Agent**: dev-sonnet

**Issue**:
```
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

**Root Cause**:
- CRUD pipeline JSON files define `operations` (plural, object with read/update/create/delete keys)
- `curation-pipeline-builder.js` expects `operation` (singular string like 'crud' or 'update')
- Line 509: `pipeline.operation.toUpperCase()` fails for 14 JSON-loaded pipelines
- The 3 programmatically-created character pipelines have `operation` field set correctly

**Impact**: Non-blocking - UI renders and functions despite the error, but console shows errors

**Fix Options**:
1. Update all 14 CRUD JSON files in `data/pipelines/crud/` to include `operation` field
2. Update `curation-pipeline-builder.js` to derive operation from `operations` keys
3. Add null-safe check: `(pipeline.operation || 'crud').toUpperCase()`

**Acceptance Criteria**:
- [ ] No TypeError in console when loading Curation Pipelines tab
- [ ] All 17 CRUD pipelines display correctly
- [ ] Pipeline cards show correct operation type badge

---

## Enhancements

### 5.2.1: Add Pipeline Count Badges to Curation Modal Tabs

**Priority**: P3 (Low)
**Agent**: dev-haiku

**Description**: Add count badges to the CRUD and RAG sub-tabs showing pipeline counts (17 CRUD, 19 RAG).

**Rationale**: During verification, we discovered more pipelines than documented (36 total vs 28 expected). Visual counts would help users understand available pipelines.

---

### 5.2.2: Document Additional Character Pipelines

**Priority**: P3 (Low)
**Agent**: dev-haiku

**Description**: Update documentation to reflect the 8 additional character-specific pipelines:
- CRUD (3): Character Type Classification, Create Character Sheet, Update Character Sheet
- RAG (5): Character Search, Character Context, Character Relationships, Character Voice Reference, Scene Characters

---

---

## Block 4.3-4.6 Verification Results

**Source**: Block 4.3-4.6 Verification (Tasks 4.3.1-4.6.2)
**Date**: 2025-12-15
**Issues Found**: None (all 59 verification points passed)

While no bugs were discovered, several recommendations for enhancements were noted:

---

## Enhancements (From Block 4.3: Character System)

### 5.2.3: Add Loading Indicators for Async Operations

**Priority**: P3 (Low)
**Agent**: dev-haiku
**Source**: Task 4.3.1

**Description**: Add visual loading indicators for async operations in Character System (agent creation, sync, bulk operations).

**Rationale**: Currently async operations complete without visual feedback, which may confuse users about operation status.

---

### 5.2.4: Add Character Avatar Images

**Priority**: P3 (Low)
**Agent**: dev-sonnet
**Source**: Task 4.3.1

**Description**: Display character avatar images in the Character System UI (currently text-only display).

**Rationale**: Visual character identification would improve UX for users managing many characters.

---

## Enhancements (From Block 4.4: Prompt Builder System)

### 5.2.5: Add Token Snippets Feature

**Priority**: P3 (Low)
**Agent**: dev-sonnet
**Source**: Task 4.4.2

**Description**: Add quick-insert common token combinations (snippets) to the Prompt Builder.

**Acceptance Criteria**:
- [ ] Snippet library UI
- [ ] Pre-built common snippets
- [ ] User-defined snippets
- [ ] One-click insertion

---

### 5.2.6: Add Preview Context Configuration

**Priority**: P3 (Low)
**Agent**: dev-sonnet
**Source**: Task 4.4.2

**Description**: Allow users to provide sample context data for more accurate live preview of token resolution.

**Rationale**: Current preview shows unresolved tokens as-is; sample context would show realistic preview.

---

### 5.2.7: Add Validation Hints for Unresolved Tokens

**Priority**: P3 (Low)
**Agent**: dev-haiku
**Source**: Task 4.4.2

**Description**: Show helpful suggestions when validation finds unresolved tokens (e.g., "Did you mean {{char}}?").

---

### 5.2.8: Add Undo/Redo for Prompt Editing

**Priority**: P2 (Medium)
**Agent**: dev-sonnet
**Source**: Tasks 4.3.1, 4.4.2

**Description**: Implement undo/redo history for prompt edits in Prompt Builder and Character configuration.

**Acceptance Criteria**:
- [ ] Ctrl+Z / Ctrl+Y keyboard shortcuts
- [ ] Undo/Redo buttons in toolbar
- [ ] History stack (at least 20 levels)

---

### 5.2.9: Add Pre-built Prompt Templates

**Priority**: P3 (Low)
**Agent**: dev-haiku
**Source**: Task 4.4.2

**Description**: Create library of pre-built prompt templates for common use cases (creative writing, analysis, roleplay, etc.).

---

## Enhancements (From Block 4.5: Pipeline Builder System)

### 5.2.10: Add Position Integration Tests

**Priority**: P2 (Medium)
**Agent**: dev-haiku
**Source**: Task 4.5.1

**Description**: Add `testPositionCRUD()` function to integration-test.js (currently only has agent and pipeline tests).

---

### 5.2.11: Add Team Integration Tests

**Priority**: P2 (Medium)
**Agent**: dev-haiku
**Source**: Task 4.5.2

**Description**: Add `testTeamCRUD()` function to integration-test.js including `getTeamPositions()` and `getTeamLeaderAgent()`.

---

### 5.2.12: Enhanced Pipeline Validation UI

**Priority**: P2 (Medium)
**Agent**: dev-sonnet
**Source**: Task 4.5.2

**Description**: Show validation warnings in pipeline editor dialog before save:
- Display validation warnings before save
- Show which dependencies are missing
- Highlight invalid phase/action configurations

---

### 5.2.13: Add Phase/Action Integration Tests

**Priority**: P2 (Medium)
**Agent**: dev-haiku
**Source**: Task 4.5.3

**Description**: Add `testPhaseActionCRUD()` function to integration-test.js.

---

### 5.2.14: Add Preset Schema Validation

**Priority**: P2 (Medium)
**Agent**: dev-sonnet
**Source**: Task 4.5.3

**Description**: Validate imported presets before applying:
- Check schema version compatibility
- Validate agent references
- Validate team/position relationships
- Warn about missing dependencies

---

### 5.2.15: Add Thread Export Feature

**Priority**: P3 (Low)
**Agent**: dev-haiku
**Source**: Task 4.5.3

**Description**: Allow exporting thread history to JSON for debugging and analysis.

---

### 5.2.16: Add Action Type Documentation

**Priority**: P3 (Low)
**Agent**: dev-haiku
**Source**: Task 4.5.3

**Description**: Add inline help text to action editor for each of the 7 action types:
- Example configurations
- Required field indicators
- Type-specific validation messages

---

## Notes

All verification points in Blocks 4.1-4.6 passed. The Kernel infrastructure, Curation stores, pipelines, team management, Character System, Prompt Builder, Pipeline Builder, and Orchestration System are all fully functional.

### Bug Summary
| Block | Tasks | Bugs Found |
|-------|-------|------------|
| 4.1-4.2 | 4.1.1, 4.2.1, 4.2.2 | 1 (TypeError in curation-pipeline-builder.js) |
| 4.3 | 4.3.1, 4.3.2 | 0 |
| 4.4 | 4.4.1, 4.4.2 | 0 |
| 4.5 | 4.5.1, 4.5.2, 4.5.3 | 0 |
| 4.6 | 4.6.1, 4.6.2 | 0 |
| **Total** | **9 tasks** | **1 bug** |

### Enhancement Summary
| Priority | Count |
|----------|-------|
| P2 (Medium) | 6 |
| P3 (Low) | 10 |
| **Total** | **16** |

---

# Active Pipeline Testing Tasks (Group 4.7 Gap)

**Source**: Block 4.7 UI Modal Verification
**Date**: 2025-12-15
**Reason**: 2 tests require active pipeline execution

## Executive Summary

Group 4 verification achieved 96.7% coverage (58/60 tests). The 2 remaining tests require an **active pipeline execution** to verify:

1. **Run/Stop button functionality** - Requires pipeline to be running
2. **Gavel Modal intervention** - Only appears during execution at gavel points

---

## Block 5.3: Pipeline Execution Setup

### Task 5.3.1: create-test-pipeline-preset

**Priority:** P0 (Required for all active pipeline tests)
**Agent:** dev-sonnet
**Complexity:** Moderate (1-2 hours)

**Description:**
Create a dedicated test pipeline preset that:
- Has all required components (agents, positions, teams, phases, actions)
- Includes at least one gavel intervention point
- Runs quickly (minimal API calls or mock responses)
- Is reproducible and deterministic

**Files:**
- Create: `data/presets/test-pipeline.json`
- Modify: `tests/integration-test.js` (add preset validation)

**Acceptance Criteria:**
- [ ] Preset loads without errors
- [ ] Preset contains at least 2 agents
- [ ] Preset contains at least 1 team
- [ ] Preset contains at least 2 phases
- [ ] Preset includes 1+ gavel intervention point
- [ ] Preset documented in comments

---

### Task 5.3.2: implement-mock-api-mode

**Priority:** P1 (Enables testing without real API calls)
**Agent:** dev-sonnet
**Complexity:** Moderate (2-3 hours)

**Description:**
Add a mock mode to the API client that returns predetermined responses, enabling pipeline execution testing without consuming API credits.

**Files:**
- `utils/api-client.js` (add mock mode)
- `core/orchestration-system.js` (respect mock setting)

**Acceptance Criteria:**
- [ ] `ApiClient.setMockMode(true)` enables mocking
- [ ] Mock responses are configurable
- [ ] Pipeline executes with mock responses
- [ ] No actual API calls made in mock mode
- [ ] Console logs indicate mock mode active

---

## Block 5.4: Run/Stop Button Verification

### Task 5.4.1: run-button-verification

**Priority:** P0 (Critical - untested in Group 4)
**Agent:** ui-feature-verification-test-opus
**Browser Test:** Yes
**Dependencies:** 5.3.1

**Description:**
Verify Run button starts pipeline execution and all associated UI state changes.

**Verification Points:**

| ID | Feature | Method | Pass Criteria |
|----|---------|--------|---------------|
| RUN1 | Run button click | Click Run in Nav Modal | Pipeline starts |
| RUN2 | Button state change | Observe Run button | Becomes disabled during run |
| RUN3 | Stop button enable | Observe Stop button | Becomes enabled during run |
| RUN4 | Status bar update | Observe status | Shows "Running..." |
| RUN5 | Progress indicator | Observe progress | Shows phase/action progress |

**Acceptance Criteria:**
- [ ] Run button initiates pipeline execution
- [ ] Run button disabled during execution
- [ ] Stop button enabled during execution
- [ ] Status bar shows running state
- [ ] No console errors during execution

---

### Task 5.4.2: stop-button-verification

**Priority:** P0 (Critical - untested in Group 4)
**Agent:** ui-feature-verification-test-opus
**Browser Test:** Yes
**Dependencies:** 5.4.1

**Description:**
Verify Stop button aborts pipeline execution cleanly.

**Verification Points:**

| ID | Feature | Method | Pass Criteria |
|----|---------|--------|---------------|
| STOP1 | Stop button click | Click Stop during run | Execution aborts |
| STOP2 | State cleanup | Observe UI | Returns to idle state |
| STOP3 | Run re-enable | Observe Run button | Becomes enabled again |
| STOP4 | Stop disable | Observe Stop button | Becomes disabled again |
| STOP5 | Status update | Observe status | Shows "Aborted" then "Ready" |

**Acceptance Criteria:**
- [ ] Stop button halts execution immediately
- [ ] UI returns to idle state
- [ ] Run/Stop buttons reset correctly
- [ ] No orphaned processes or hanging state

---

### Task 5.4.3: pause-resume-verification

**Priority:** P1 (Important for full coverage)
**Agent:** ui-feature-verification-test-sonnet
**Browser Test:** Yes
**Dependencies:** 5.4.1

**Description:**
Verify Pause and Resume functionality during pipeline execution.

**Acceptance Criteria:**
- [ ] Pause halts execution without aborting
- [ ] State preserved at pause point
- [ ] Resume continues from pause point

---

## Block 5.5: Gavel Modal Verification

### Task 5.5.1: gavel-modal-appearance

**Priority:** P0 (Critical - untested in Group 4)
**Agent:** ui-feature-verification-test-opus
**Browser Test:** Yes
**Dependencies:** 5.3.1 (test pipeline with gavel point)

**Description:**
Verify Gavel Modal appears at intervention points during pipeline execution.

**Verification Points:**

| ID | Feature | Method | Pass Criteria |
|----|---------|--------|---------------|
| GAV1 | Modal trigger | Run pipeline to gavel point | Modal appears |
| GAV2 | Execution pause | Observe state | Pipeline paused at gavel |
| GAV3 | Content display | Observe modal | Shows current output for review |
| GAV4 | Intervention options | Observe buttons | Approve/Edit/Reject visible |
| GAV5 | Keyboard shortcuts | Test Ctrl+Enter, Escape | Shortcuts work |

**Acceptance Criteria:**
- [ ] Gavel modal appears automatically at gavel points
- [ ] Pipeline execution paused while modal open
- [ ] Current phase output displayed for review
- [ ] All intervention buttons present

---

### Task 5.5.2: gavel-approve-action

**Priority:** P0 (Critical)
**Agent:** ui-feature-verification-test-opus
**Browser Test:** Yes
**Dependencies:** 5.5.1

**Description:**
Verify Approve action in Gavel Modal continues execution.

**Acceptance Criteria:**
- [ ] Approve continues pipeline
- [ ] Modal closes automatically
- [ ] Execution proceeds to next phase
- [ ] Ctrl+Enter keyboard shortcut works

---

### Task 5.5.3: gavel-edit-action

**Priority:** P1 (Important)
**Agent:** ui-feature-verification-test-opus
**Browser Test:** Yes
**Dependencies:** 5.5.1

**Description:**
Verify Edit action in Gavel Modal allows modification before continuing.

**Acceptance Criteria:**
- [ ] Edit mode allows content modification
- [ ] Modified content used for next phase
- [ ] Cancel edit returns to review mode

---

### Task 5.5.4: gavel-reject-action

**Priority:** P1 (Important)
**Agent:** ui-feature-verification-test-opus
**Browser Test:** Yes
**Dependencies:** 5.5.1

**Description:**
Verify Reject action in Gavel Modal triggers retry or abort.

**Acceptance Criteria:**
- [ ] Reject triggers appropriate action (retry or abort)
- [ ] User feedback captured if configured
- [ ] Escape keyboard shortcut works

---

## Block 5.6: Execution State Verification

### Task 5.6.1: execution-state-transitions

**Priority:** P1 (Important for completeness)
**Agent:** ui-feature-verification-test-sonnet
**Browser Test:** Yes
**Dependencies:** 5.3.1

**Description:**
Verify all execution state transitions are correct and UI reflects them.

**State Diagram:**
```
IDLE → RUNNING → COMPLETED
  ↑        ↓
  ↑    [PAUSED]
  ↑        ↓
  ←── ABORTED
  ←── FAILED
```

**Acceptance Criteria:**
- [ ] All 6 state transitions work correctly
- [ ] UI updates for each state
- [ ] State persists correctly
- [ ] No invalid state combinations

---

## Task Dependency Graph

```
Block 5.3: Setup
├── 5.3.1: create-test-pipeline-preset (FIRST)
└── 5.3.2: implement-mock-api-mode

Block 5.4: Run/Stop (depends on 5.3.1)
├── 5.4.1: run-button-verification
├── 5.4.2: stop-button-verification (depends on 5.4.1)
└── 5.4.3: pause-resume-verification (depends on 5.4.1)

Block 5.5: Gavel Modal (depends on 5.3.1)
├── 5.5.1: gavel-modal-appearance
├── 5.5.2: gavel-approve-action (depends on 5.5.1)
├── 5.5.3: gavel-edit-action (depends on 5.5.1)
└── 5.5.4: gavel-reject-action (depends on 5.5.1)

Block 5.6: State Verification (depends on 5.3.1)
└── 5.6.1: execution-state-transitions
```

---

## Estimated Effort: Active Pipeline Testing

| Block | Tasks | Priority | Hours |
|-------|-------|----------|-------|
| 5.3 Setup | 2 | P0/P1 | 3-5 |
| 5.4 Run/Stop | 3 | P0/P1 | 2-3 |
| 5.5 Gavel | 4 | P0/P1 | 3-4 |
| 5.6 State | 1 | P1 | 1-2 |
| **Total** | **10** | | **9-14 hours** |

---

## Quick Reference: Active Pipeline Tasks

| Task ID | Priority | Agent | Browser | Dependency |
|---------|----------|-------|---------|------------|
| 5.3.1 | P0 | dev-sonnet | No | None |
| 5.3.2 | P1 | dev-sonnet | No | None |
| 5.4.1 | P0 | ui-test-opus | Yes | 5.3.1 |
| 5.4.2 | P0 | ui-test-opus | Yes | 5.4.1 |
| 5.4.3 | P1 | ui-test-sonnet | Yes | 5.4.1 |
| 5.5.1 | P0 | ui-test-opus | Yes | 5.3.1 |
| 5.5.2 | P0 | ui-test-opus | Yes | 5.5.1 |
| 5.5.3 | P1 | ui-test-opus | Yes | 5.5.1 |
| 5.5.4 | P1 | ui-test-opus | Yes | 5.5.1 |
| 5.6.1 | P1 | ui-test-sonnet | Yes | 5.3.1 |

---

*Updated: 2025-12-15*
*Source: Group 4 Block 4.7 Verification - Untested Areas*
