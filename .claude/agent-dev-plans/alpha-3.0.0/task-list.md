# Alpha 3.0.0 Task List

All tasks for this development plan, organized by group and block.

## Group 1: Bug Fixes & Polish ✅ COMPLETE

### Block 1.1: Critical (P0)

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 1.1.1 | injection-edit-functionality | P0 | dev-sonnet | ✅ COMPLETE |

### Block 1.2: High Priority (P1)

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 1.2.1 | nav-modal-auto-reappear | P1 | dev-sonnet | ✅ COMPLETE |

### Block 1.3: Medium Priority (P2)

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 1.3.1 | prompt-builder-mode-switch-error | P2 | dev-sonnet | ✅ COMPLETE |

### Block 1.4: Low Priority (P3)

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 1.4.1 | update-injection-docs | P3 | dev-haiku | ✅ COMPLETE |
| 1.4.2 | add-missing-svg | P3 | dev-haiku | ✅ COMPLETE |

---

## Group 2: Curation Enhancements ✅ COMPLETE

### Block 2.1: Pipeline Triggering

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 2.1.1 | curation-pipeline-run-button | P0 | dev-sonnet | ✅ COMPLETE |

### Block 2.2: Preview Mode

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 2.2.1 | curation-pipeline-preview | P1 | dev-opus | ✅ COMPLETE |

### Block 2.3: Default Pipelines

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 2.3.1 | create-default-crud-pipelines | P0 | dev-sonnet | ✅ COMPLETE |
| 2.3.2 | create-default-rag-pipelines | P0 | dev-sonnet | ✅ COMPLETE |
| 2.3.3 | pipeline-testing-integration | P1 | dev-haiku | ✅ COMPLETE |

---

## Group 3: Kernel Preset System ✅ COMPLETE

### Block 3.1: Architecture (Design Only)

No tasks - design documented in reference.md

### Block 3.2: Config Schemas

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 3.2.1 | define-system-config-schemas | P0 | dev-opus | ✅ COMPLETE |
| 3.2.2 | kernel-config-manager | P0 | dev-opus | ✅ COMPLETE |

### Block 3.3: Preset Migration

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 3.3.1 | migrate-existing-presets | P1 | dev-sonnet | ✅ COMPLETE |

### Block 3.4: Tiered Presets

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 3.4.1 | create-tiered-presets | P1 | dev-opus | ✅ COMPLETE |

---

## Task Dependencies

```
Group 1: All independent (can run in parallel)

Group 2:
  2.1.1 → 2.2.1 (preview depends on run)
  2.3.1 ┬→ 2.3.3 (testing depends on pipelines)
  2.3.2 ┘

Group 3:
  3.2.1 → 3.2.2 → 3.3.1 → 3.4.1 (sequential)
```

## Group 4: Comprehensive System Verification ⏳ PENDING

### Block 4.1: Kernel Infrastructure

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 4.1.1 | kernel-infrastructure-verification | P0 | ui-feature-verification-test-opus | ⏳ PENDING |

### Block 4.2: Curation System

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 4.2.1 | curation-stores-verification | P0 | ui-feature-verification-test-opus | ⏳ PENDING |
| 4.2.2 | curation-pipelines-team-verification | P0 | ui-feature-verification-test-opus | ⏳ PENDING |

### Block 4.3: Character System

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 4.3.1 | character-avatars-verification | P1 | ui-feature-verification-test-sonnet | ⏳ PENDING |
| 4.3.2 | character-director-settings-verification | P1 | ui-feature-verification-test-sonnet | ⏳ PENDING |

### Block 4.4: Prompt Builder System

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 4.4.1 | prompt-builder-tokens-verification | P1 | ui-feature-verification-test-sonnet | ⏳ PENDING |
| 4.4.2 | prompt-builder-modes-verification | P1 | ui-feature-verification-test-sonnet | ⏳ PENDING |

### Block 4.5: Pipeline Builder System

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 4.5.1 | pipeline-agents-positions-verification | P1 | ui-feature-verification-test-sonnet | ⏳ PENDING |
| 4.5.2 | pipeline-teams-pipelines-verification | P1 | ui-feature-verification-test-sonnet | ⏳ PENDING |
| 4.5.3 | pipeline-phases-actions-threads-verification | P1 | ui-feature-verification-test-opus | ⏳ PENDING |

### Block 4.6: Orchestration System

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 4.6.1 | orchestration-modes-verification | P0 | ui-feature-verification-test-opus | ⏳ PENDING |
| 4.6.2 | orchestration-execution-gavel-verification | P0 | ui-feature-verification-test-opus | ⏳ PENDING |

### Block 4.7: UI Modal Verification

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 4.7.1 | nav-curation-modal-verification | P1 | ui-feature-verification-test-sonnet | ⏳ PENDING |
| 4.7.2 | curation-character-modal-tabs-verification | P1 | ui-feature-verification-test-sonnet | ⏳ PENDING |
| 4.7.3 | pipeline-modal-entity-tabs-verification | P1 | ui-feature-verification-test-sonnet | ⏳ PENDING |
| 4.7.4 | pipeline-execution-injection-gavel-modal-verification | P1 | ui-feature-verification-test-sonnet | ⏳ PENDING |

### Block 4.8: Integration

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 4.8.1 | cross-system-integration-verification | P0 | ui-feature-verification-test-opus | ⏳ PENDING |

### Block 4.9: End-to-End

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| 4.9.1 | end-to-end-workflow-verification | P0 | ui-feature-verification-test-opus | ⏳ PENDING |

---

## Task Dependencies

```
Group 1: All independent (can run in parallel)

Group 2:
  2.1.1 → 2.2.1 (preview depends on run)
  2.3.1 ┬→ 2.3.3 (testing depends on pipelines)
  2.3.2 ┘

Group 3:
  3.2.1 → 3.2.2 → 3.3.1 → 3.4.1 (sequential)

Group 4:
  4.1.1 → 4.2.1 → 4.2.2
       → 4.3.1 → 4.3.2
       → 4.4.1 → 4.4.2
       → 4.5.1 → 4.5.2 → 4.5.3
       → 4.6.1 → 4.6.2
       → 4.7.1 → 4.7.2 → 4.7.3 → 4.7.4
  All above → 4.8.1 → 4.9.1
```

## Summary

| Status | Count |
|--------|-------|
| ✅ COMPLETE | 14 |
| 🔄 IN_PROGRESS | 0 |
| ⏳ PENDING | 18 |
| 🚫 BLOCKED | 0 |
| **Total** | **32** |
