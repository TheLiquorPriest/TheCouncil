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

## Notes

All verification points in Blocks 4.1-4.2 passed. The Kernel infrastructure, Curation stores, pipelines, and team management are fully functional. The bug noted above is cosmetic and does not block functionality.
