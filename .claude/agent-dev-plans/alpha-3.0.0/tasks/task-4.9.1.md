# Task 4.9.1: end-to-end-workflow-verification

## Status
⏳ PENDING

## Metadata
| Field | Value |
|-------|-------|
| ID | 4.9.1 |
| Name | end-to-end-workflow-verification |
| Priority | P0 (Critical) |
| Agent | ui-feature-verification-test-opus |
| Browser Test | Yes |
| Dependencies | 4.8.1 |

## Description
Verify complete end-to-end workflows through the entire Council system. Test that users can complete full use cases from start to finish.

## Files
- All core system files
- All UI modal files

## Verification Points

| ID | Feature | Method | Pass Criteria |
|----|---------|--------|---------------|
| E2E1 | Synthesis Flow | Full pipeline to ST chat | Response appears in chat |
| E2E2 | Compilation Flow | Full pipeline to optimized prompt | Prompt generated correctly |
| E2E3 | Injection Flow | Enable injection, ST generation | Tokens replaced in final prompt |
| E2E4 | Curation Flow | Create → add data → RAG → results | Complete data lifecycle |
| E2E5 | Character Flow | Sync → avatar → pipeline use | Character participates |
| E2E6 | Preset Flow | Load → run → save new | Configuration round-trip |

## End-to-End Workflows

### E2E1: Synthesis Flow
1. Open Pipeline Modal
2. Load a synthesis pipeline preset
3. Click Run
4. Observe execution progress
5. Handle any gavel interventions
6. Verify response appears in ST chat

### E2E2: Compilation Flow
1. Open Pipeline Modal
2. Configure compilation mode
3. Create/load compilation pipeline
4. Run pipeline
5. Verify optimized prompt generated
6. Verify prompt used for next ST generation

### E2E3: Injection Flow
1. Open Injection Modal
2. Enable injection
3. Map tokens (e.g., {{char}} → RAG pipeline)
4. Close modal
5. Trigger ST generation
6. Verify mapped tokens replaced

### E2E4: Curation Flow
1. Open Curation Modal
2. Create new data store entry
3. Add content to entry
4. Create RAG pipeline targeting store
5. Run RAG pipeline
6. Verify results contain added data

### E2E5: Character Flow
1. Ensure ST has characters loaded
2. Open Character Modal
3. Click Sync Characters
4. Create avatar for a character
5. Open Pipeline Modal
6. Add avatar to team
7. Run pipeline
8. Verify avatar agent participates

### E2E6: Preset Flow
1. Start with default state
2. Load "comprehensive" preset
3. Verify all systems configured
4. Make a modification
5. Save as new preset
6. Reset to defaults
7. Load saved preset
8. Verify modification preserved

## Acceptance Criteria
- [ ] Synthesis flow produces response in ST chat
- [ ] Compilation flow generates optimized prompt
- [ ] Injection flow replaces tokens during generation
- [ ] Curation flow completes full data lifecycle
- [ ] Character flow enables avatar participation
- [ ] Preset flow round-trips configuration
- [ ] No console errors during any flow
- [ ] All UI states consistent throughout
- [ ] Progress indicators accurate
- [ ] Error handling works if issues occur

## Notes
Created: 2025-12-15
Source: Group 4 Comprehensive Verification Plan
This is the final verification task - confirms complete system functionality.
