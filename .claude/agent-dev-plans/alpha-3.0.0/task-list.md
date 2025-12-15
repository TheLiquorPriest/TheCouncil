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

## Summary

| Status | Count |
|--------|-------|
| ✅ COMPLETE | 14 |
| 🔄 IN_PROGRESS | 0 |
| ⏳ PENDING | 0 |
| 🚫 BLOCKED | 0 |
| **Total** | **14** |
