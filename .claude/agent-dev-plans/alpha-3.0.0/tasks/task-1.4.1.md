# Task 1.4.1: update-injection-docs

## Status
✅ COMPLETE

## Metadata
| Field | Value |
|-------|-------|
| ID | 1.4.1 |
| Name | update-injection-docs |
| Priority | P3 (Low) |
| Agent | dev-haiku |
| Browser Test | No |
| Dependencies | None |

## Description
Quick Add buttons documentation doesn't match implementation. Need to update Section 5.4 in UI_BEHAVIOR.md.

## Files
- `docs/UI_BEHAVIOR.md` (Section 5.4)

## Implementation
Update Section 5.4 Quick Add Buttons to reflect actual 12 tokens:
- `{{char}}`, `{{user}}`, `{{scenario}}`, `{{personality}}`, `{{persona}}`
- `{{description}}`, `{{world_info}}`, `{{system}}`, `{{jailbreak}}`
- `{{chat}}`, `{{example_dialogue}}`, `{{first_message}}`

## Acceptance Criteria
- [x] Documentation matches actual implementation
- [x] All 12 tokens documented

## Notes
- Source: UI Test Report
- Estimated: 0.25 hours
