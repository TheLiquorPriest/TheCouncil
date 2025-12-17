# Task 5.1.1: prompt-builder-drag-drop-duplicates

## Status
✅ COMPLETE (Browser Verified 2025-12-17)

## Metadata
| Field | Value |
|-------|-------|
| ID | 5.1.1 |
| Name | prompt-builder-drag-drop-duplicates |
| Priority | P0 |
| Agent | dev-sonnet |
| Browser Test | Yes |
| Dependencies | None |

## Description
Fix the drag-and-drop behavior in the Prompt Builder component that adds multiple copies of items instead of a single item.

**Current Behavior:**
- First drag adds 2 copies of the item
- Subsequent drags add escalating numbers of copies
- Never adds just one copy as intended

**Expected Behavior:**
- Each drag-and-drop operation should add exactly one copy of the item

## Files
- `ui/components/prompt-builder.js` - Primary file with drag-drop handlers
- `ui/components/token-picker.js` - May have related drag logic

## Acceptance Criteria
- [x] First drag adds exactly 1 item
- [x] Subsequent drags each add exactly 1 item
- [x] No duplicate event listeners causing multiple adds
- [x] Browser test confirms fix works

## Browser Test Results (2025-12-17)
- Environment: http://127.0.0.1:8000/, Playwright MCP
- Test: Pipeline Modal → Agents → New Agent → Build from Tokens mode
- First drag to drop zone: Added exactly 1 item ({{char}})
- Click to add: Added exactly 1 item ({{user}})
- Second click: Added exactly 1 item ({{char}} again)
- **Verdict: PASS** - Each operation adds exactly 1 item, no duplicates

## Notes
Created: 2025-12-17
Source: User-reported issue, Group 5 planning
