# Task 4.4.1: prompt-builder-tokens-verification

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | 4.4.1 |
| Name | prompt-builder-tokens-verification |
| Priority | P1 (High) |
| Agent | ui-feature-verification-test-sonnet |
| Browser Test | Yes |
| Dependencies | 4.1.1 |

## Description
Verify Prompt Builder System token functionality through the UI. Test token registry, token picker, macro system, conditional blocks, transform pipelines, and nested token resolution.

## Files
- `core/prompt-builder-system.js`
- `ui/components/prompt-builder.js`
- `ui/components/token-picker.js`

## Verification Points

| ID | Feature | Method | Pass Criteria |
|----|---------|--------|---------------|
| PB1 | Token Registry | View all 8 categories | All categories present with tokens |
| PB2 | Token Picker | Search and insert token | Token inserted at cursor |
| PB3 | Macro System | Create and expand macro | Macro expands with params |
| PB4 | Conditional Blocks | Test if/unless/else | Conditionals evaluate correctly |
| PB5 | Transform Pipelines | Apply transforms | Transforms execute in order |
| PB6 | Nested Tokens | Use `{{store.{{var}}}}` | Nested resolution works |

## Token Categories to Verify
1. Character (char, user, persona, description, personality)
2. Context (scenario, mesExamples, chat, worldInfo)
3. System (system, jailbreak, main, nsfw)
4. Custom (user-defined tokens)
5. Curation (store-sourced tokens)
6. Pipeline (pipeline output tokens)
7. Transform (transform functions)
8. Conditional (conditional blocks)

## Acceptance Criteria
- [ ] All 8 token categories visible
- [ ] Token picker search works
- [ ] Token insertion works at cursor
- [ ] Macros expand with parameters
- [ ] `{{#if}}` conditionals work
- [ ] `{{#unless}}` conditionals work
- [ ] `{{else}}` blocks work
- [ ] `| uppercase` transform works
- [ ] `| truncate:N` transform works
- [ ] Nested tokens resolve correctly

## Notes
Created: 2025-12-15
Source: Group 4 Comprehensive Verification Plan
