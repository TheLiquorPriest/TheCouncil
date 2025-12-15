# Task 4.4.2: prompt-builder-modes-verification

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | 4.4.2 |
| Name | prompt-builder-modes-verification |
| Priority | P1 (High) |
| Agent | ui-feature-verification-test-sonnet |
| Browser Test | Yes |
| Dependencies | 4.4.1 |

## Description
Verify Prompt Builder System mode functionality through the UI. Test all three editing modes (Custom, ST Preset, Build from Tokens), template validation, prompt presets, and live preview.

## Files
- `core/prompt-builder-system.js`
- `ui/components/prompt-builder.js`

## Verification Points

| ID | Feature | Method | Pass Criteria |
|----|---------|--------|---------------|
| PB7 | Custom Prompt Mode | Edit free-form, insert tokens | Mode functions correctly |
| PB8 | ST Preset Mode | Load ST preset | Preset content shown |
| PB9 | Build from Tokens Mode | Select tokens, reorder | Prompt built from tokens |
| PB10 | Template Validation | Enter invalid template | Error shown |
| PB11 | Prompt Presets | Save/load prompt config | Preset round-trips |
| PB12 | Live Preview | Edit prompt, check preview | Preview updates in real-time |

## Acceptance Criteria
- [ ] Custom mode allows free-form editing
- [ ] Custom mode Insert Token button works
- [ ] Custom mode Insert Macro button works
- [ ] ST Preset dropdown lists presets
- [ ] ST Preset Load button applies preset
- [ ] Build from Tokens shows category accordion
- [ ] Build from Tokens allows checkbox selection
- [ ] Build from Tokens allows drag reorder
- [ ] Build from Tokens Apply builds prompt
- [ ] Invalid templates show validation error
- [ ] Prompt presets can be saved
- [ ] Prompt presets can be loaded
- [ ] Live preview updates as you type

## Notes
Created: 2025-12-15
Source: Group 4 Comprehensive Verification Plan
