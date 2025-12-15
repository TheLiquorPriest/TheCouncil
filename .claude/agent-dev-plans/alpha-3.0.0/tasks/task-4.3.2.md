# Task 4.3.2: character-director-settings-verification

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | 4.3.2 |
| Name | character-director-settings-verification |
| Priority | P1 (High) |
| Agent | ui-feature-verification-test-sonnet |
| Browser Test | Yes |
| Dependencies | 4.3.1 |

## Description
Verify Character System Director and Settings functionality through the UI. Test director configuration, Prompt Builder integration, sync operations, and reset functionality.

## Files
- `core/character-system.js`
- `ui/character-modal.js`
- `ui/components/prompt-builder.js`

## Verification Points

| ID | Feature | Method | Pass Criteria |
|----|---------|--------|---------------|
| CH7 | Character Director | Edit director config | Changes save |
| CH8 | Prompt Builder (Director) | Test all 3 modes | All modes work |
| CH9 | Sync with ST | Click Sync Characters | Latest data pulled |
| CH10 | Despawn All | Click Despawn All | All avatars removed |
| CH11 | Export/Import Config | Export, modify, import | Config round-trips |
| CH12 | Reset All | Click Reset All | Factory reset completes |

## Acceptance Criteria
- [ ] Director name and description editable
- [ ] Director API configuration works
- [ ] Prompt Builder Custom mode works
- [ ] Prompt Builder ST Preset mode works
- [ ] Prompt Builder Build from Tokens mode works
- [ ] Sync pulls latest ST character data
- [ ] Despawn removes all avatar agents
- [ ] Export downloads config file
- [ ] Import restores config from file
- [ ] Reset clears all configuration

## Notes
Created: 2025-12-15
Source: Group 4 Comprehensive Verification Plan
