# Task 5.1.1 Handoff: Fix Prompt Builder Drag-Drop Duplicates

## Status: FIXED (Requires Browser Testing)

## Issue Identified

**Root Cause:** Duplicate event listener registration on `stackList` element.

**Problem Flow:**
1. `_initDragDrop()` attaches event listeners to the `.prompt-builder-stack-list` element
2. When a token is dropped, `_addTokenToStack()` or `_insertTokenAtIndex()` is called
3. These methods trigger `_refreshStackDisplay()` (line 1872)
4. `_refreshStackDisplay()` calls `_initDragDrop()` again (line 1883)
5. `_initDragDrop()` attaches NEW listeners to the SAME stackList element (the element itself is not recreated, only its innerHTML)
6. Now there are 2 listeners on the stackList drop event
7. Next drag-drop triggers both listeners = 2 items added
8. This compounds with each drop

**Why Items Were Duplicated:**
- Lines 2343-2367: `stackList.addEventListener("drop", ...)` calls `this._addTokenToStack()` (line 2357)
- Every call to `_initDragDrop()` added another listener without removing the old one
- First drag: 1 listener = 1 item
- After refresh: 2 listeners = 2 items added
- After second refresh: 3 listeners = 3 items added
- And so on...

## Solution Implemented

Added a guard flag to prevent duplicate listener registration in `_initDragDrop()`:

```javascript
// Lines 2209-2216
// Prevent duplicate listener registration
// Check if listeners are already attached to stackList
if (stackList.dataset.dragListenersAttached === "true") {
  return;
}

// Mark that listeners have been attached
stackList.dataset.dragListenersAttached = "true";
```

**How It Works:**
1. Uses a data attribute on the stackList element to track if listeners are attached
2. First call to `_initDragDrop()`: flag is undefined, proceeds to attach listeners, sets flag to "true"
3. Subsequent calls: flag is "true", returns early, no duplicate listeners added
4. When the prompt builder is destroyed/recreated, new stackList element has no flag, so listeners are attached normally

**Why This Solution:**
- Simple and effective
- Uses the DOM element itself as state storage
- No need to track state separately
- Works across multiple instances
- Persists correctly when stackList.innerHTML is changed (data attributes stay on the element)

## Files Modified

- `ui/components/prompt-builder.js` (lines 2209-2216)

## Testing Required

### Browser Testing Steps:
1. Navigate to http://127.0.0.1:8000/
2. Open SillyTavern
3. Open The Council extension
4. Navigate to a prompt builder interface (Pipeline modal > any phase/action with prompt config)
5. Drag a token from the available tokens list to the stack
6. Verify EXACTLY 1 item is added
7. Drag another token
8. Verify EXACTLY 1 item is added (not 2)
9. Drag several more times
10. Verify each drag adds EXACTLY 1 item

### Expected Behavior:
- First drag: 1 item added
- Second drag: 1 item added
- Third drag: 1 item added
- Every subsequent drag: 1 item added

### Console Verification:
Check browser console for any errors during drag-drop operations.

## Acceptance Criteria

- [x] Root cause identified (duplicate listener registration)
- [x] Fix implemented (guard flag added)
- [ ] Browser test confirms first drag adds exactly 1 item
- [ ] Browser test confirms subsequent drags each add exactly 1 item
- [ ] No console errors during drag-drop operations
- [ ] Fix committed to repository

## Notes

- The fix is minimal and non-invasive
- No changes to drag-drop logic itself, only prevents duplicate registration
- Item event listeners (on individual stack items) are fine because the items are recreated with each render
- Only the stackList element persists, which is why its listeners were accumulating

## Next Steps

1. Perform browser testing to verify fix
2. If successful, commit with message: "Task 5.1.1: Fix prompt builder drag-drop duplicates"
3. Mark task as complete

## Technical Details

**Key Code Locations:**
- `_initDragDrop()`: Line 2205 (where fix was applied)
- `_refreshStackDisplay()`: Line 1872 (calls _initDragDrop repeatedly)
- stackList drop handler: Lines 2343-2367 (where _addTokenToStack is called)
- `_addTokenToStack()`: Triggers _refreshStackDisplay

**Other Drag-Drop Methods (not affected):**
- `_initAvailableTokenDrag()`: Line 1076 - Only called once during setup, not affected
- Item-level event listeners: Lines 2220-2316 - These are fine because items are recreated each render
