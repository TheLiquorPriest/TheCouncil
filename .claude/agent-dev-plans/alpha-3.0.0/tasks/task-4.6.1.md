# Task 4.6.1: orchestration-modes-verification

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | 4.6.1 |
| Name | orchestration-modes-verification |
| Priority | P0 (Critical) |
| Agent | ui-feature-verification-test-opus |
| Browser Test | Yes |
| Dependencies | 4.5.3 |

## Description
Verify Orchestration System mode functionality through the UI. Test all three operating modes (Synthesis, Compilation, Injection) and mode switching.

## Files
- `core/orchestration-system.js`
- `ui/pipeline-modal.js`
- `ui/injection-modal.js`

## Verification Points

| ID | Feature | Method | Pass Criteria |
|----|---------|--------|---------------|
| OR1 | Mode: Synthesis | Run synthesis pipeline | Final response generated |
| OR2 | Mode: Compilation | Run compilation pipeline | Optimized prompt generated |
| OR3 | Mode: Injection | Enable injection, generate | Tokens replaced correctly |
| OR4 | Mode Switching | Switch modes between runs | Mode changes apply |

## Mode Descriptions

### Synthesis Mode
- Multi-agent workflow produces final chat response
- Multiple agents contribute, deliberate, refine
- Final response delivered to ST chat

### Compilation Mode
- Workflow produces optimized prompt for ST's LLM
- Agents analyze, plan, structure
- Compiled prompt replaces ST's prompt

### Injection Mode
- Replace ST tokens with Curation RAG outputs
- No pipeline required
- Token mappings applied during ST generation

## Acceptance Criteria
- [ ] Synthesis mode runs complete pipeline
- [ ] Synthesis mode produces response
- [ ] Synthesis mode delivers to ST chat
- [ ] Compilation mode runs complete pipeline
- [ ] Compilation mode produces optimized prompt
- [ ] Compilation mode replaces ST prompt
- [ ] Injection mode toggle works
- [ ] Injection mode replaces mapped tokens
- [ ] Mode can be switched between runs
- [ ] Mode cannot be switched during run

## Notes
Created: 2025-12-15
Source: Group 4 Comprehensive Verification Plan
