# Alpha 3 Suggested Tasks

Generated from UI testing on 2025-12-13.

## How to Use

These tasks are formatted for use with the `/task` slash command.

**Priority Levels:**
- **P0 Critical:** Fix immediately - breaks core functionality
- **P1 High:** Fix before beta - significant UX impact
- **P2 Medium:** Fix during beta - code quality/polish
- **P3 Low:** Nice to have - documentation/assets

---

## Critical (P0) - Fix Immediately

### Task: injection-edit-functionality

**Priority:** P0
**Source:** UI Test - Injection Modal
**Issue:** Edit button for token mappings deletes instead of opening edit form
**Expected:** Clicking edit button opens form pre-filled with current mapping values, allowing modification
**Actual:** First button (pencil icon) immediately deletes the mapping without confirmation

**Files:**
- `ui/injection-modal.js` (primary)
- `core/orchestration-system.js` (if edit API needed)

**Estimated Complexity:** Moderate (2-3 hours)

**Implementation Notes:**
1. Add `editMapping(token)` method that:
   - Finds existing mapping by token
   - Opens Add Mapping form
   - Pre-fills all fields (token, source type, source value, max results, format)
   - Changes form title to "Edit Mapping"
   - Changes button text to "Save Changes"
2. Update button click handler to call `editMapping()` instead of `deleteMapping()`
3. Add delete confirmation dialog:
   ```javascript
   if (!confirm(`Remove mapping for {{${token}}}?`)) return;
   ```

**Acceptance Criteria:**
- [ ] Edit button opens form with pre-filled values
- [ ] User can modify and save mapping
- [ ] Delete button shows confirmation dialog
- [ ] Console logs `Token mapping updated: {{token}}` on edit

---

## High Priority (P1) - Fix Before Beta

### Task: nav-modal-auto-reappear

**Priority:** P1
**Source:** UI Test - Navigation Modal
**Issue:** Navigation Modal does not reappear after closing other modals
**Expected:** After closing Curation/Character/Pipeline/Injection modal, Nav Modal auto-shows
**Actual:** Nav Modal remains hidden; user must call `window.NavModal.show()` or use keyboard shortcut

**Files:**
- `ui/nav-modal.js` (primary)

**Estimated Complexity:** Simple (30 minutes)

**Implementation Notes:**
1. In `init()` method, add Kernel event listener:
   ```javascript
   this._kernel.on('modal:hidden', (modalId) => {
     if (['curation', 'character', 'pipeline', 'injection'].includes(modalId)) {
       this.show();
     }
   });
   ```
2. Ensure each modal emits `modal:hidden` event with its ID when closing (verify in base-modal.js)

**Acceptance Criteria:**
- [ ] Nav Modal appears after closing Curation Modal
- [ ] Nav Modal appears after closing Character Modal
- [ ] Nav Modal appears after closing Pipeline Modal
- [ ] Nav Modal appears after closing Injection Modal
- [ ] Console logs `[NavModal] Navigation Modal shown` after each

---

## Medium Priority (P2) - Fix During Beta

### Task: prompt-builder-mode-switch-error

**Priority:** P2
**Source:** UI Test - Shared Components
**Issue:** Console error when switching Prompt Builder modes
**Expected:** Mode switch occurs silently without errors
**Actual:** Error logged: `TypeError: Cannot read properties of undefined`

**Files:**
- `ui/components/prompt-builder.js` (primary)

**Estimated Complexity:** Moderate (1-2 hours)

**Implementation Notes:**
1. Add defensive null checks in `_renderModeContent()`:
   ```javascript
   if (!this._config) return;
   if (!this._container) return;
   ```
2. Check that `this._tokenCategories`, `this._presets`, etc. are initialized before access
3. Verify initialization order in `init()` method
4. Consider moving mode content rendering to after all dependencies loaded

**Debugging Steps:**
1. Open Pipeline Modal > Agents Tab > + New Agent
2. Open browser DevTools console
3. Click "ST Preset" tab - observe error
4. Check stack trace for specific line number

**Acceptance Criteria:**
- [ ] No console errors when switching Custom -> Preset
- [ ] No console errors when switching Preset -> Tokens
- [ ] No console errors when switching Tokens -> Custom
- [ ] All mode content renders correctly

---

### Task: injection-delete-confirmation

**Priority:** P2
**Source:** UI Test - Injection Modal (related to P0-1)
**Issue:** Delete button removes mapping without confirmation
**Expected:** Confirmation dialog: "Are you sure you want to remove this mapping?"
**Actual:** Mapping deleted immediately on click

**Files:**
- `ui/injection-modal.js`

**Estimated Complexity:** Simple (15 minutes)

**Implementation Notes:**
```javascript
_handleDeleteMapping(token) {
  if (!confirm(`Remove mapping for {{${token}}}?`)) {
    return;
  }
  // existing delete logic
}
```

**Note:** This may be addressed as part of `injection-edit-functionality` task.

**Acceptance Criteria:**
- [ ] Confirmation dialog appears on delete click
- [ ] Clicking Cancel keeps mapping
- [ ] Clicking OK deletes mapping
- [ ] Console logs `Token mapping removed: {{token}}` only after confirmation

---

## Low Priority (P3) - Nice to Have

### Task: update-injection-docs

**Priority:** P3
**Source:** UI Test - Injection Modal
**Issue:** Quick Add buttons in documentation don't match implementation
**Expected:** Documentation reflects actual implementation
**Actual:** 3 documented tokens missing, 3 extra tokens present, 1 naming difference

**Files:**
- `docs/UI_BEHAVIOR.md` (Section 5.4)

**Estimated Complexity:** Simple (15 minutes)

**Implementation Notes:**
Update Section 5.4 Quick Add Buttons table to:

| Button | Token Added | Default Source |
|--------|-------------|----------------|
| `{{char}}` | char | RAG: Character Search |
| `{{user}}` | user | RAG: Character Search |
| `{{scenario}}` | scenario | RAG: Character Context |
| `{{personality}}` | personality | RAG: Character Search |
| `{{persona}}` | persona | RAG: Character Search |
| `{{description}}` | description | RAG: Character Search |
| `{{world_info}}` | world_info | RAG: Character Context |
| `{{system}}` | system | Static |
| `{{jailbreak}}` | jailbreak | Static |
| `{{chat}}` | chat | RAG: Character Context |
| `{{example_dialogue}}` | example_dialogue | RAG: Character Voice Reference |
| `{{first_message}}` | first_message | RAG: Character Search |

**Acceptance Criteria:**
- [ ] Section 5.4 lists all 12 actual tokens
- [ ] No mention of `{{mesExamples}}`, `{{main}}`, `{{nsfw}}`
- [ ] Uses `{{world_info}}` (underscore) not `{{worldInfo}}`

---

### Task: add-missing-svg

**Priority:** P3
**Source:** UI Test - Console Errors
**Issue:** Missing SVG asset causes 404 error
**Expected:** SVG file exists at path
**Actual:** 404 for `/img/council_pipeline.svg`

**Files:**
- Create: `img/council_pipeline.svg` (or update reference)

**Estimated Complexity:** Simple (30 minutes)

**Implementation Notes:**
1. Either create a pipeline-themed SVG icon
2. Or find the code referencing this path and update to use existing icon
3. Search codebase: `grep -r "council_pipeline.svg" .`

**Acceptance Criteria:**
- [ ] No 404 error for council_pipeline.svg
- [ ] Icon displays correctly where used

---

## Future Tasks (Backlog)

### Task: test-pipeline-execution

**Priority:** Backlog
**Source:** UI Test - Untested Areas
**Issue:** Pipeline execution flow not tested (requires configured pipeline)
**Expected:** Full test of Run/Stop buttons, state transitions, progress indicators

**Files:** N/A (testing task)

**Estimated Complexity:** Complex (4+ hours)

**Notes:**
- Requires setting up a complete pipeline with agents, positions, teams, phases, actions
- Test state transitions: Idle -> Running -> Completed/Failed/Aborted
- Test progress bar updates
- Test log streaming
- Test Pause/Resume functionality

---

### Task: test-keyboard-shortcuts

**Priority:** Backlog
**Source:** UI Test - Untested Areas
**Issue:** Keyboard shortcuts not tested

**Expected Shortcuts:**
- `Ctrl+Shift+C` / `Cmd+Shift+C`: Toggle nav visibility
- `Escape`: Close modals / Skip in Gavel
- `Ctrl+Enter`: Approve in Gavel

**Files:** N/A (testing task)

**Estimated Complexity:** Simple (1 hour)

---

### Task: test-drag-drop

**Priority:** Backlog
**Source:** UI Test - Untested Areas
**Issue:** Drag-and-drop functionality not tested

**Areas:**
- Nav Modal positioning
- Token reordering in Prompt Builder
- Phase reordering in Pipeline
- Action reordering in Phases

**Files:** N/A (testing task)

**Estimated Complexity:** Moderate (2 hours)

---

## Task Dependency Graph

```
P0: injection-edit-functionality
    └── (includes P2: injection-delete-confirmation)

P1: nav-modal-auto-reappear
    └── (standalone)

P2: prompt-builder-mode-switch-error
    └── (standalone)

P3: update-injection-docs
    └── (depends on P0: injection-edit-functionality being finalized)

P3: add-missing-svg
    └── (standalone)
```

---

## Estimated Effort Summary

| Priority | Count | Simple | Moderate | Complex |
|----------|-------|--------|----------|---------|
| P0 | 1 | 0 | 1 | 0 |
| P1 | 1 | 1 | 0 | 0 |
| P2 | 2 | 1 | 1 | 0 |
| P3 | 2 | 2 | 0 | 0 |
| Backlog | 3 | 1 | 1 | 1 |
| **Total** | **9** | **5** | **3** | **1** |

**Estimated Total Time:**
- P0: ~2-3 hours
- P1: ~30 minutes
- P2: ~2 hours
- P3: ~45 minutes
- **Total Active Tasks: ~5-6 hours**

---

## Quick Reference

| Task ID | Priority | Complexity | Primary File |
|---------|----------|------------|--------------|
| injection-edit-functionality | P0 | Moderate | `ui/injection-modal.js` |
| nav-modal-auto-reappear | P1 | Simple | `ui/nav-modal.js` |
| prompt-builder-mode-switch-error | P2 | Moderate | `ui/components/prompt-builder.js` |
| injection-delete-confirmation | P2 | Simple | `ui/injection-modal.js` |
| update-injection-docs | P3 | Simple | `docs/UI_BEHAVIOR.md` |
| add-missing-svg | P3 | Simple | `img/council_pipeline.svg` |

---

**Generated:** 2025-12-13
**Source:** UI Test Report (`docs/testing/UI_REPORT-20251213.md`)
**Spec Reference:** `docs/UI_BEHAVIOR.md`
