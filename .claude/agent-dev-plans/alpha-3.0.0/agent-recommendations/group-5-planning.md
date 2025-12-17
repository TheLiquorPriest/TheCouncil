# Group 5 Planning: Curation System - Working Alpha

**Created**: 2025-12-17
**Status**: PLANNING
**Philosophy**: Agent-driven discovery, not pre-scripted tasks

---

## Scope

**Primary Focus**: Curation System
**Always-Present Concerns**: Kernel, Orchestration System, Prompt Builder System

| System | Group 5 Focus |
|--------|---------------|
| **Curation System** | Full functionality - stores, CRUD/RAG pipelines, topologists |
| **Kernel** | Event bus, state, modals, presets (as they support Curation) |
| **Orchestration** | Injection mode (Curation's primary orchestration mode) |
| **Prompt Builder** | Token resolution, transforms (as used in Curation prompts) |

**Deferred**:
- Response Pipeline Builder → Group 6
- Character System → Group 7

---

## Key Principles

1. **Discovery-driven**: Agents use `/definitions` docs to identify what's broken
2. **Real execution**: Pipelines must actually run, not just "load without errors"
3. **No workarounds**: If browser tools unavailable, task FAILS
4. **Dynamic fixes**: Block 5.5 populated by what's actually found
5. **Hard gate**: No sign-off until everything works

---

## Block 5.1: Known Critical Bugs (P0)

*Issues already identified that must be fixed first*

| ID | Task | Description | Agent |
|----|------|-------------|-------|
| 5.1.1 | prompt-builder-drag-drop-duplicates | Drag-and-drop adds multiple copies (2 on first drag, escalates) | dev-sonnet |
| 5.1.2 | modal-color-readability | Unreadable button text, poor color contrast in modals | dev-sonnet |
| 5.1.3 | curation-pipeline-builder-typeerror | TypeError on `operation.toUpperCase()` in curation-pipeline-builder.js:509 | dev-haiku |

---

## Block 5.2: Curation Visual/UI Audit (P0)

*Agents use VIEWS.md + UI_BEHAVIOR.md as spec, test in browser, report ALL visual issues*

| ID | Task | Scope | Agent | Status |
|----|------|-------|-------|--------|
| 5.2.1 | curation-modal-visual-audit | All Curation Modal tabs: Stores, CRUD Pipelines, RAG Pipelines | ui-feature-verification-test-opus | ✅ COMPLETE - No visual issues found |
| 5.2.2 | nav-modal-curation-audit | Nav Modal Curation-related controls (Run, Status) | ui-feature-verification-test-opus | PENDING |
| 5.2.3 | injection-modal-visual-audit | Injection Modal (Curation's output mode) | ui-feature-verification-test-opus | PENDING |

**Spec Source**: `VIEWS.md`, `UI_BEHAVIOR.md`
**Deliverable**: Issue list with screenshots, locations, severity ratings

### 5.2.1 Results (2025-12-17)
- **All 5 tabs passed**: Overview, Stores, Search, Team, Pipelines
- **No color/readability issues found** in Curation Modal
- **Visual observations**: Clean design, good color coding, proper form indicators
- **Screenshots captured**: 9 screenshots documenting UI state

---

## Block 5.3: Curation Functional Audit (P0)

*Agents use SYSTEM_DEFINITIONS.md as spec, test each capability against actual behavior*

| ID | Task | Scope | Agent |
|----|------|-------|-------|
| 5.3.1 | curation-stores-functional-audit | Topological data stores CRUD, data persistence | ui-feature-verification-test-opus |
| 5.3.2 | curation-crud-pipelines-audit | All 17 CRUD pipelines - load, configure, execute | ui-feature-verification-test-opus |
| 5.3.3 | curation-rag-pipelines-audit | All 19 RAG pipelines - load, configure, execute | ui-feature-verification-test-opus |
| 5.3.4 | prompt-builder-curation-audit | Token picker, transforms, macros in Curation context | ui-feature-verification-test-sonnet |

**Spec Source**: `SYSTEM_DEFINITIONS.md`
**Deliverable**: Issue list with reproduction steps, expected vs actual, severity

---

## Block 5.4: Curation Pipeline Execution (P0)

*Actually run the pipelines - no mocking, no code review, real execution*

| ID | Task | Scope | Agent |
|----|------|-------|-------|
| 5.4.1 | injection-mode-execution | Injection mode works end-to-end | ui-feature-verification-test-opus |
| 5.4.2 | crud-pipeline-execution | At least 1 CRUD pipeline executes successfully | ui-feature-verification-test-opus |
| 5.4.3 | rag-pipeline-execution | At least 1 RAG pipeline executes successfully | ui-feature-verification-test-opus |

**Requirement**: Real execution with LLM calls. If mock mode needed, must be explicitly implemented first.

---

## Block 5.5: Discovery Fixes (P0/P1)

*Tasks created dynamically based on 5.2 and 5.3 findings*

| ID | Task | Description | Agent |
|----|------|-------------|-------|
| 5.5.x | TBD | Created from audit findings | TBD |

**Process**:
1. Audits in 5.2/5.3 produce issue lists
2. Issues triaged by severity
3. Fix tasks created here with appropriate agent assignment
4. P0 issues block sign-off, P1+ can be deferred if justified

---

## Block 5.6: Curation Alpha Verification (P0)

| ID | Task | Scope | Agent |
|----|------|-------|-------|
| 5.6.1 | curation-final-verification | Complete Curation System works end-to-end | ui-feature-verification-test-opus |
| 5.6.2 | group5-sign-off | All Curation criteria met, ready for Group 6 | project-manager-opus |

---

## Task Count Summary

| Block | Tasks | Focus |
|-------|-------|-------|
| 5.1 | 3 | Known bugs |
| 5.2 | 3 | Visual audit |
| 5.3 | 4 | Functional audit |
| 5.4 | 3 | Execution |
| 5.5 | TBD | Fixes |
| 5.6 | 2 | Verification |
| **Total** | **15 + TBD** | |

---

## Dependencies

```
Block 5.1 (Known Bugs)
    ↓
Block 5.2 (Visual Audit) ──┬──→ Block 5.5 (Fixes)
Block 5.3 (Functional Audit) ┘        ↓
    ↓                              Block 5.6 (Verification)
Block 5.4 (Execution) ─────────────────┘
```

---

## Future Groups Preview

| Group | Primary Focus | Always-Present |
|-------|---------------|----------------|
| **5** | Curation System | Kernel, Orchestration, Prompt Builder |
| **6** | Response Pipeline Builder | Kernel, Orchestration, Prompt Builder |
| **7** | Character System | Kernel, Orchestration, Prompt Builder |

---

## User-Reported Issues (Pre-Audit)

These are known issues reported by the user before formal audits:

1. **Drag-and-drop duplicates** (Prompt Builder)
   - First drag adds 2 copies
   - Subsequent drags add more
   - Never intentional single-item add

2. **Color/readability issues** (Multiple modals)
   - Button text hard to read
   - Poor color contrast
   - Specific modals TBD by audit

3. **TypeError in curation-pipeline-builder.js** (Line 509)
   - `operation.toUpperCase()` fails
   - Root cause: JSON files use `operations` (plural object) not `operation` (singular string)

---

## Notes

- ✅ `/ui-test curation` completed (2025-12-17) - results integrated above
- Additional issues discovered during audits will be added to Block 5.5
- Sign-off requires ALL P0 issues resolved
- User-reported color/readability issues NOT found in Curation Modal - test other modals

---

*Last Updated: 2025-12-17 (UI test results added)*
