# Task 4.8.1: cross-system-integration-verification

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | 4.8.1 |
| Name | cross-system-integration-verification |
| Priority | P0 (Critical) |
| Agent | ui-feature-verification-test-opus |
| Browser Test | Yes |
| Dependencies | 4.6.2, 4.7.4 |

## Description
Verify cross-system integration and data flow between all Council systems. Test that systems communicate correctly via events and public APIs.

## Files
- `core/kernel.js`
- `core/curation-system.js`
- `core/character-system.js`
- `core/prompt-builder-system.js`
- `core/pipeline-builder-system.js`
- `core/orchestration-system.js`

## Verification Points

| ID | Feature | Method | Pass Criteria |
|----|---------|--------|---------------|
| INT1 | Curation → Character | Sync characters from stores | Data flows correctly |
| INT2 | Curation → Pipeline | RAG results in pipeline action | Data available in context |
| INT3 | Character → Pipeline | Avatar in pipeline team | Character agent participates |
| INT4 | Prompt Builder → All | Tokens resolve in all contexts | Resolution works everywhere |
| INT5 | Pipeline → Orchestration | Run defined pipeline | Execution follows definition |
| INT6 | Injection → ST | Generate with injection | Tokens replaced in ST prompt |
| INT7 | Events Cross-System | Emit from one, receive in another | Event propagates |
| INT8 | Preset → All Systems | Load preset, verify all systems | All systems configured |

## Integration Flows to Test

### Curation → Character
1. Add character data to Curation store
2. Trigger Character sync
3. Verify character appears in Character system

### Curation → Pipeline
1. Create RAG pipeline in Curation
2. Reference RAG output in Pipeline action
3. Run pipeline, verify RAG data available

### Character → Pipeline
1. Create character avatar
2. Add avatar to pipeline team
3. Run pipeline, verify avatar participates

### Prompt Builder → All Systems
1. Create token in Prompt Builder
2. Use token in Curation agent prompt
3. Use token in Character director prompt
4. Use token in Pipeline agent prompt
5. Verify token resolves in all contexts

### Pipeline → Orchestration
1. Define pipeline with phases and actions
2. Start run via Orchestration
3. Verify execution follows pipeline definition

### Injection → ST
1. Enable injection mode
2. Map token to RAG output
3. Trigger ST generation
4. Verify token replaced in final prompt

### Events Cross-System
1. Subscribe to event in System A
2. Emit event from System B
3. Verify callback fires in System A

### Preset → All Systems
1. Load comprehensive preset
2. Verify Curation configured
3. Verify Character configured
4. Verify Pipeline configured
5. Verify Orchestration mode set

## Acceptance Criteria
- [ ] Curation data flows to Character system
- [ ] RAG outputs available in pipeline context
- [ ] Character avatars participate in pipelines
- [ ] Tokens resolve in Curation prompts
- [ ] Tokens resolve in Character prompts
- [ ] Tokens resolve in Pipeline prompts
- [ ] Pipeline definitions execute correctly
- [ ] Injection mode replaces ST tokens
- [ ] Events propagate between systems
- [ ] Presets configure all systems

## Notes
Created: 2025-12-15
Source: Group 4 Comprehensive Verification Plan
