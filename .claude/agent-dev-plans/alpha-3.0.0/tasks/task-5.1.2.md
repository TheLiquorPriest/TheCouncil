# Task 5.1.2: modal-color-readability

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | 5.1.2 |
| Name | modal-color-readability |
| Priority | P0 |
| Agent | dev-sonnet |
| Browser Test | Yes |
| Dependencies | None |

## Description
Fix unreadable button text and poor color contrast in modals.

**Current Behavior:**
- Button text is hard to read in some modals
- Poor color contrast makes elements difficult to see
- Specific modals affected: TBD by visual audit

**Expected Behavior:**
- All button text clearly readable
- Color contrast meets WCAG AA standards (minimum 4.5:1 for normal text)
- Consistent visual appearance across all modals

## Files
- `styles/main.css` - Global styles
- `ui/*.js` - Modal-specific inline styles if any

## Acceptance Criteria
- [ ] All button text is clearly readable
- [ ] Color contrast ratio meets WCAG AA (4.5:1 minimum)
- [ ] Visual audit confirms no readability issues
- [ ] Consistent across all affected modals

## Notes
Created: 2025-12-17
Source: User-reported issue, Group 5 planning
Note: Curation Modal passed visual audit - issue likely in other modals
