# Task 5.3.4: prompt-builder-curation-audit

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | 5.3.4 |
| Name | prompt-builder-curation-audit |
| Priority | P0 |
| Agent | ui-feature-verification-test-sonnet |
| Browser Test | Yes |
| Dependencies | 5.1.1 |

## Description
Functional audit of Prompt Builder in Curation context - token picker, transforms, macros.

**Test Scope:**
- Token picker functionality
- Token categories (8 categories)
- Transform pipeline syntax
- Macro resolution
- Curation-specific tokens

## Files
- `.claude/definitions/SYSTEM_DEFINITIONS.md` - System specification
- `ui/components/prompt-builder.js`
- `ui/components/token-picker.js`

## Acceptance Criteria
- [ ] Token picker displays all categories
- [ ] Token insertion works correctly
- [ ] Transform syntax recognized
- [ ] Macros resolve properly
- [ ] Curation tokens available and functional
- [ ] Issue list with reproduction steps

## Notes
Created: 2025-12-17
Source: Group 5 planning - Block 5.3 Functional Audit
Depends on: 5.1.1 (drag-drop fix)
