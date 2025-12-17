# Task 5.1.3: curation-pipeline-builder-typeerror

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | 5.1.3 |
| Name | curation-pipeline-builder-typeerror |
| Priority | P0 |
| Agent | dev-haiku |
| Browser Test | Yes |
| Dependencies | None |

## Description
Fix TypeError on `operation.toUpperCase()` in curation-pipeline-builder.js:509.

**Current Behavior:**
- Console error: `TypeError: Cannot read properties of undefined (reading 'toUpperCase')`
- Error occurs when loading Pipelines tab in Curation Modal
- UI still renders but error is logged

**Root Cause:**
- CRUD pipeline JSON files define `operations` (plural, object with read/update/create/delete keys)
- `curation-pipeline-builder.js` expects `operation` (singular string like 'crud' or 'update')
- Line 509: `pipeline.operation.toUpperCase()` fails for 14 JSON-loaded pipelines
- The 3 programmatically-created character pipelines have `operation` field set correctly

## Files
- `ui/components/curation-pipeline-builder.js:509` - Primary fix location

## Fix Options
1. Update all 14 CRUD JSON files in `data/pipelines/crud/` to include `operation` field
2. Update `curation-pipeline-builder.js` to derive operation from `operations` keys
3. Add null-safe check: `(pipeline.operation || 'crud').toUpperCase()`

## Acceptance Criteria
- [ ] No TypeError in console when loading Curation Pipelines tab
- [ ] All 17 CRUD pipelines display correctly
- [ ] Pipeline cards show correct operation type badge

## Notes
Created: 2025-12-17
Source: Block 4.1-4.2 verification, confirmed by UI test
