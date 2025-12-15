# Group 5 Task Suggestions

**Source**: Block 4.1-4.2 Verification (Tasks 4.1.1, 4.2.1, 4.2.2)
**Date**: 2025-12-15
**Author**: Task Runner Agent

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

## Enhancements (Optional)

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
