# Task 1.2.1: nav-modal-auto-reappear

## Status
✅ COMPLETE

## Metadata
| Field | Value |
|-------|-------|
| ID | 1.2.1 |
| Name | nav-modal-auto-reappear |
| Priority | P1 (High) |
| Agent | dev-sonnet |
| Browser Test | Yes |
| Dependencies | None |

## Description
Navigation Modal doesn't reappear after closing other modals. Need to add event listener for `modal:hidden` events.

## Files
- `ui/nav-modal.js`

## Implementation
```javascript
// In NavModal.init()
this._kernel.on('modal:hidden', (modalId) => {
  if (['curation', 'character', 'pipeline', 'injection'].includes(modalId)) {
    this.show();
  }
});
```

## Acceptance Criteria
- [x] Nav Modal appears after closing Curation Modal
- [x] Nav Modal appears after closing Character Modal
- [x] Nav Modal appears after closing Pipeline Modal
- [x] Nav Modal appears after closing Injection Modal

## Notes
- Source: UI Test Report
- Estimated: 0.5 hours
