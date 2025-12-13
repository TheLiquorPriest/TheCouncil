# UI Behavior Testing Pipeline

Comprehensive UI testing workflow that assesses each modal against expected behavior.

## Usage
`/ui-test` - Run full UI testing pipeline
`/ui-test nav` - Test only Navigation Modal
`/ui-test curation` - Test only Curation Modal
`/ui-test character` - Test only Character Modal
`/ui-test pipeline` - Test only Pipeline Modal
`/ui-test injection` - Test only Injection Modal
`/ui-test gavel` - Test only Gavel Modal

## Instructions

You are orchestrating a UI testing pipeline for The Council extension.

### Prerequisites

1. **Verify browser automation is available:**
```bash
claude mcp list
```
Expected: `playwright: ✓ Connected` or `browsermcp: ✓ Connected`

2. **SillyTavern must be running at:** `http://127.0.0.1:8000/`

3. **Initialize the report file:**
Create `docs/UI_BEHAVIOR_REPORT.md` with header:
```markdown
# The Council - UI Behavior Test Report

**Generated:** [TIMESTAMP]
**Version:** 2.1.0-alpha

---
```

---

## Phase 1: Create/Update Expected Behavior Spec (Opus)

**First, spawn an Opus agent to create or update the behavior specification:**

```
subagent_type: "general-purpose"
model: "opus"
prompt: |
  You are creating the authoritative UI behavior specification for The Council extension.

  ## Your Task
  Create or update `docs/UI_BEHAVIOR.md` with comprehensive expected behavior for every UI element.

  ## Required Reading (in order)
  1. `CLAUDE.md` - Project overview
  2. `docs/SYSTEM_DEFINITIONS.md` - System architecture
  3. `docs/VIEWS.md` - UI element inventory

  ## Output Format

  Create `docs/UI_BEHAVIOR.md` with this structure:

  # The Council - Expected UI Behavior

  Version: 2.1.0-alpha
  Last Updated: [TODAY'S DATE]

  ## Overview
  This document defines the expected behavior for every UI element in The Council.
  Use this as the ground truth for testing and validation.

  ---

  ## 1. Navigation Modal

  ### 1.1 Initial State
  - **Location**: Bottom-right corner of SillyTavern
  - **Default State**: Expanded
  - **Elements Visible**: Header, 6 action buttons, status bar

  ### 1.2 Button Behaviors

  | Button | Click Action | Expected Result |
  |--------|--------------|-----------------|
  | 📚 Curation | Opens modal | Curation Modal appears, Overview tab active |
  | 👥 Characters | Opens modal | Character Modal appears, Characters tab active |
  | ... | ... | ... |

  ### 1.3 State Transitions
  - Collapsed → Expanded: Click expand button (▶)
  - Expanded → Collapsed: Click collapse button (▼)
  - Idle → Running: Click Run button
  - Running → Idle: Click Stop button OR pipeline completes

  ### 1.4 Error States
  - API Error: Status bar shows error message in red
  - No pipeline loaded: Run button disabled, tooltip shows "No pipeline configured"

  ---

  ## 2. Curation Modal
  [Continue for all 6 modals with same level of detail]

  ---

  ## 7. Shared Components
  [Document Prompt Builder, Token Picker, etc.]

  ## Key Requirements

  1. **Be Specific**: Don't just say "button opens modal" - say which modal, which tab is active
  2. **Include Edge Cases**: What happens when no data? When API fails? When user cancels?
  3. **Define Visual States**: What color/style indicates active? disabled? error?
  4. **Document Validation**: What input validation exists? What error messages?
  5. **Cross-Reference Systems**: Link behaviors to SYSTEM_DEFINITIONS.md where relevant

  ## Do NOT
  - Use browser automation tools (you're just reading and writing docs)
  - Create the report file (that's for testing agents)
  - Run any tests (just define expected behavior)

  When complete, report: "UI_BEHAVIOR.md created/updated with [N] modal definitions and [M] component definitions"
```

**Wait for this agent to complete before proceeding to Phase 2.**

---

## Phase 2: Sequential Modal Testing (6 Sonnet Agents)

**IMPORTANT: Browser automation shares a single context. Run these agents SEQUENTIALLY, not in parallel.**

After Phase 1 completes, spawn each Sonnet agent one at a time, waiting for completion before starting the next.

### Testing Agent Template

Each agent follows the same pattern with different modal assignments:

```
subagent_type: "general-purpose"
model: "sonnet"
prompt: |
  You are testing [MODAL_NAME] for The Council extension.

  ## Required Reading
  1. `docs/UI_BEHAVIOR.md` - Expected behavior (Section [N])
  2. `docs/VIEWS.md` - Element reference (Section [N])
  3. `docs/UI_TESTING.md` - MCP tools reference

  ## Your Assignment
  Modal: **[MODAL_NAME]**

  ## Testing Workflow

  1. **Navigate to SillyTavern:**
     mcp__playwright__browser_navigate(url: "http://127.0.0.1:8000/")
     mcp__playwright__browser_snapshot()

  2. **Open the modal** (if not Navigation Modal)

  3. **Test each state and interaction** defined in UI_BEHAVIOR.md

  4. **Document findings** for each test:
     - ✅ PASS: Behavior matches expected
     - ⚠️ PARTIAL: Behavior differs slightly (describe)
     - ❌ FAIL: Behavior missing or broken (describe)
     - 🔍 UNTESTABLE: Cannot test (explain why)

  5. **Close the modal** when done (return to clean state for next agent)

  ## Output

  Append your findings to `docs/UI_BEHAVIOR_REPORT.md`:

  ## [MODAL_NAME] Test Results

  **Tested By:** Sonnet Agent
  **Timestamp:** [ISO timestamp]

  ### Summary
  - Total Tests: [N]
  - Passed: [N]
  - Partial: [N]
  - Failed: [N]
  - Untestable: [N]

  ### Detailed Results
  [Results tables for each section...]

  ### Issues Found
  [Numbered list with reproduction steps...]

  ### Console Errors
  [From browser_console_messages]

  ---

  ## Important Notes
  - Check console for errors after each major interaction
  - Take a screenshot if you find a visual issue
  - CLOSE THE MODAL when done to leave clean state
  - If SillyTavern isn't running, report and exit

  Report when done: "[MODAL_NAME] testing complete: [X] passed, [Y] issues found"
```

### Agent Execution Order

Run these **sequentially** (wait for each to complete):

#### Agent 1: Navigation Modal
- Section: 1
- Tests: Initial state, button clicks, collapse/expand, status bar

#### Agent 2: Curation Modal
- Section: 2
- Tests: All 5 tabs (Overview, Stores, Search, Team, Pipelines)

#### Agent 3: Character Modal
- Section: 3
- Tests: All 3 tabs (Characters, Director, Settings)

#### Agent 4: Pipeline Modal
- Section: 4
- Tests: All 10 tabs (Presets, Agents, Positions, Teams, Pipelines, Phases, Actions, Execution, Threads, Outputs)

#### Agent 5: Injection Modal
- Section: 5
- Tests: Toggle, quick add buttons, mapping CRUD

#### Agent 6: Gavel Modal + Shared Components
- Sections: 6 & 7
- Tests: Gavel (may need pipeline trigger), Prompt Builder, Token Picker, etc.

---

## Phase 3: Review and Task Generation (Opus)

**After all 6 testing agents complete, spawn an Opus agent to review and generate tasks:**

```
subagent_type: "general-purpose"
model: "opus"
prompt: |
  You are reviewing UI test results and generating development tasks.

  ## Required Reading
  1. `docs/UI_BEHAVIOR.md` - Expected behavior
  2. `docs/UI_BEHAVIOR_REPORT.md` - Test results from 6 agents

  ## Your Tasks

  ### Task 1: Generate Test Summary Report

  Create `docs/testing/UI_REPORT-[YYYYMMDD-HHMM].md`:

  # UI Test Report

  **Date:** [timestamp]
  **Tested By:** 6 Sequential Sonnet Agents
  **Version:** 2.1.0-alpha

  ## Executive Summary

  | Modal | Tests | Pass | Partial | Fail | Untestable |
  |-------|-------|------|---------|------|------------|
  | Navigation | ... | ... | ... | ... | ... |
  | Curation | ... | ... | ... | ... | ... |
  | Character | ... | ... | ... | ... | ... |
  | Pipeline | ... | ... | ... | ... | ... |
  | Injection | ... | ... | ... | ... | ... |
  | Gavel | ... | ... | ... | ... | ... |
  | **Total** | **...** | **...** | **...** | **...** | **...** |

  ## Overall Health Score: [X]%

  ## Critical Issues (P0)
  [Issues that break core functionality]

  ## High Priority Issues (P1)
  [Issues that impact user experience significantly]

  ## Medium Priority Issues (P2)
  [Issues that should be fixed but aren't blockers]

  ## Low Priority Issues (P3)
  [Polish, edge cases, nice-to-haves]

  ## Patterns Observed
  [Common issues across modals, systemic problems]

  ## Recommendations
  [High-level suggestions for improvement]

  ### Task 2: Generate Development Tasks

  Create or update `docs/tasks/alpha3/CURRENT_SUGGESTED_TASKS.md`:

  # Alpha 3 Suggested Tasks

  Generated from UI testing on [date].

  ## How to Use
  These tasks are formatted for use with the `/task` slash command.

  ---

  ## Critical (P0) - Fix Immediately

  ### Task: [short-name]
  **Priority:** P0
  **Source:** UI Test - [Modal Name]
  **Issue:** [Description of the issue]
  **Expected:** [What should happen]
  **Actual:** [What actually happens]
  **Files:** [Likely files to modify]
  **Estimated Complexity:** [simple/moderate/complex]

  ---

  ## High Priority (P1)
  [Continue pattern...]

  ---

  ## Medium Priority (P2)
  [Continue pattern...]

  ---

  ## Low Priority (P3)
  [Continue pattern...]

  ---

  ## Task Dependency Graph
  [Note any dependencies between tasks]

  ---

  ## Estimated Effort Summary

  | Priority | Count | Simple | Moderate | Complex |
  |----------|-------|--------|----------|---------|
  | P0 | ... | ... | ... | ... |
  | P1 | ... | ... | ... | ... |
  | P2 | ... | ... | ... | ... |
  | P3 | ... | ... | ... | ... |

  ## Important Guidelines

  1. **Be specific**: Each task should be actionable without additional research
  2. **Include file paths**: Point directly to the files that need changes
  3. **Prioritize ruthlessly**: P0 = blocking, P1 = important, P2 = nice, P3 = polish
  4. **Group related tasks**: If 3 issues stem from one root cause, make it one task
  5. **Estimate complexity**: simple = 1 file/30min, moderate = 2-3 files/2hrs, complex = 4+ files/4hrs+

  Report when done: "Review complete. Generated [N] tasks across [M] priority levels. See docs/testing/UI_REPORT-[timestamp].md"
```

---

## Handling Single Modal Testing

If `$ARGUMENTS` is provided (e.g., `/ui-test nav`), skip Phase 1 (assume UI_BEHAVIOR.md exists) and spawn only the relevant agent from Phase 2.

| Argument | Agent to Spawn |
|----------|----------------|
| `nav` | Agent 1 (Navigation) |
| `curation` | Agent 2 (Curation) |
| `character` | Agent 3 (Character) |
| `pipeline` | Agent 4 (Pipeline) |
| `injection` | Agent 5 (Injection) |
| `gavel` | Agent 6 (Gavel + Components) |

After the single agent completes, still run Phase 3 for review.

---

## Output

When complete, report to user:

```
## UI Testing Complete

### Phase 1: Behavior Spec
- docs/UI_BEHAVIOR.md: [created/updated]

### Phase 2: Modal Testing (Sequential)
| Order | Modal | Result |
|-------|-------|--------|
| 1 | Navigation | [X pass, Y issues] |
| 2 | Curation | [X pass, Y issues] |
| 3 | Character | [X pass, Y issues] |
| 4 | Pipeline | [X pass, Y issues] |
| 5 | Injection | [X pass, Y issues] |
| 6 | Gavel + Components | [X pass, Y issues] |

### Phase 3: Review
- Report: docs/testing/UI_REPORT-[timestamp].md
- Tasks: docs/tasks/alpha3/CURRENT_SUGGESTED_TASKS.md

### Next Steps
1. Review the test report
2. Run `/task [task-name]` to fix issues
3. Re-run `/ui-test` to verify fixes
```

---

## Troubleshooting

### MCP Not Connected
```bash
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest
# Restart Claude Code session
```

### SillyTavern Not Running
The testing agents will report this and exit. Start ST at port 8000.

### Modal Not Opening
Check console for JavaScript errors. May indicate extension loading issue.

### Browser State Issues
Each agent should close modals when done. If state is dirty, navigate fresh:
```
mcp__playwright__browser_navigate(url: "http://127.0.0.1:8000/")
```
