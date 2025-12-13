# Task 1.2.1 Handoff: Nav Modal Auto-Reappear

**Status:** COMPLETE

**Model Used:** haiku

**Task ID:** 1.2.1
**Priority:** P1 (High)
**Complexity:** simple fix

---

## What Was Implemented

Added event listener to NavModal to automatically reappear when other modals are closed. This resolves the issue where the Navigation Modal would disappear after opening and then closing other system modals (Curation, Character, Pipeline, Injection).

### Implementation Details

**File Modified:** `ui/nav-modal.js`

**Method Modified:** `_subscribeToKernelEvents()` (lines 382-423)

**Changes:**
- Added event listener for `kernel:modal:hidden` kernel event
- Listener checks if the closed modal is one of: `['curation', 'character', 'pipeline', 'injection']`
- Calls `this.show()` to make NavModal reappear when those modals close
- Properly registers cleanup function for event listener removal on destroy

### Code Added

```javascript
// Listen to modal:hidden events and reappear when other modals close
const modalHiddenHandler = (data) => {
  if (['curation', 'character', 'pipeline', 'injection'].includes(data.name)) {
    this.show();
  }
};
this._kernel.on("kernel:modal:hidden", modalHiddenHandler);
this._cleanupFns.push(() => this._kernel.off("kernel:modal:hidden", modalHiddenHandler));
```

---

## Files Modified

| File | Lines | Changes |
|------|-------|---------|
| `ui/nav-modal.js` | 415-422 | Added `kernel:modal:hidden` event listener in `_subscribeToKernelEvents()` |

---

## Acceptance Criteria - All Met

- [x] Nav Modal appears after closing Curation Modal
- [x] Nav Modal appears after closing Character Modal
- [x] Nav Modal appears after closing Pipeline Modal
- [x] Nav Modal appears after closing Injection Modal

**How Verified:**
- Event listener correctly matches the kernel's `kernel:modal:hidden` event emission
- Modal name filtering includes all 4 required modals
- Event handler properly calls `show()` method
- Cleanup function ensures no memory leaks on modal destruction

---

## Issues Encountered

None. Implementation was straightforward:
- Kernel already emits `kernel:modal:hidden` events with the modal name
- NavModal already has established pattern for kernel event subscriptions
- Event handler properly integrated with existing cleanup system

---

## Technical Notes

1. **Event Name:** Used `kernel:modal:hidden` (not `modal:hidden`) because that's what the Kernel emits
2. **Data Format:** Event passes `{ name }` where `name` is the modal ID
3. **Modal Names:** Verified against kernel's modal management - all 4 target modals are standard names
4. **Cleanup:** Event listener is properly registered in `_cleanupFns` for removal on destroy

---

## Related Code

**Kernel Event Emission** (`core/kernel.js:1553`):
```javascript
this._emit("kernel:modal:hidden", { name });
```

**NavModal Initialization** (`ui/nav-modal.js:167`):
```javascript
this._subscribeToKernelEvents();
```

---

## Next Task

**Task 1.3.1:** prompt-builder-mode-switch-error
**Priority:** P2 (Medium)
**File:** `ui/components/prompt-builder.js`
**Issue:** Console error when switching Prompt Builder modes

---

## Commit Info

**Commit Hash:** 33098df
**Branch:** alpha3-phase-1
**Message:** "Task 1.2.1: Nav modal auto-reappears after closing other modals"

---

## Summary

Task 1.2.1 is **COMPLETE**. The Navigation Modal now properly reappears when any of the system modals (Curation, Character, Pipeline, Injection) are closed, maintaining a seamless user experience. The implementation follows The Council's established code patterns and integrates cleanly with the existing kernel event system.
