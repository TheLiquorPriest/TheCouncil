# UI Behavior Testing Pipeline

Comprehensive UI testing workflow that spawns parallel agents to assess each modal against expected behavior.

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

3. **Navigate to SillyTavern and open The Council:**
```
mcp__playwright__browser_navigate(url: "http://127.0.0.1:8000/")
mcp__playwright__browser_snapshot()
```

### Phase 1: Create/Update Expected Behavior Spec (Opus)

**First, spawn an Opus agent to create or update the behavior specification:**

```
subagent_type: "general-purpose"
model: "opus"
prompt: |
  You are creating the authoritative UI behavior specification for The Council extension.

  ## Your Task
  Create or update `/docs/UI_BEHAVIOR.md` with comprehensive expected behavior for every UI element.

  ## Required Reading (in order)
  1. `CLAUDE.md` - Project overview
  2. `docs/SYSTEM_DEFINITIONS.md` - System architecture
  3. `docs/VIEWS.md` - UI element inventory

  ## Output Format

  Create `/docs/UI_BEHAVIOR.md` with this structure:

  ```markdown
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
  ```

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

### Phase 2: Parallel Modal Testing (6 Sonnet Agents)

**After Phase 1 completes, spawn 6 Sonnet agents IN PARALLEL (single message with 6 Task tool calls):**

Each agent will:
1. Navigate to SillyTavern
2. Open their assigned modal
3. Test each element against UI_BEHAVIOR.md
4. Append findings to UI_BEHAVIOR_REPORT.md

**CRITICAL**: All 6 agents must be spawned in a SINGLE message to run in parallel.

#### Agent 1: Navigation Modal

```
subagent_type: "general-purpose"
model: "sonnet"
prompt: |
  You are testing the Navigation Modal for The Council extension.

  ## Required Reading
  1. `docs/UI_BEHAVIOR.md` - Expected behavior (Section 1: Navigation Modal)
  2. `docs/VIEWS.md` - Element reference (Section 1)
  3. `docs/UI_TESTING.md` - MCP tools reference

  ## Your Assignment
  Modal: **Navigation Modal**

  ## Testing Workflow

  1. **Navigate to SillyTavern:**
     ```
     mcp__playwright__browser_navigate(url: "http://127.0.0.1:8000/")
     mcp__playwright__browser_snapshot()
     ```

  2. **Locate and verify The Council nav element**

  3. **Test each state and interaction** defined in UI_BEHAVIOR.md Section 1:
     - Initial state (expanded)
     - Each button click
     - Collapse/expand toggle
     - Status bar display

  4. **Document findings** for each test:
     - ✅ PASS: Behavior matches expected
     - ⚠️ PARTIAL: Behavior differs slightly (describe)
     - ❌ FAIL: Behavior missing or broken (describe)
     - 🔍 UNTESTABLE: Cannot test (explain why)

  ## Output

  Append your findings to `docs/UI_BEHAVIOR_REPORT.md` in this format:

  ```markdown
  ## Navigation Modal Test Results

  **Tested By:** Sonnet Agent
  **Timestamp:** [ISO timestamp]
  **SillyTavern URL:** http://127.0.0.1:8000/

  ### Summary
  - Total Tests: [N]
  - Passed: [N]
  - Partial: [N]
  - Failed: [N]
  - Untestable: [N]

  ### Detailed Results

  #### 1.1 Initial State
  | Check | Expected | Actual | Status |
  |-------|----------|--------|--------|
  | Location | Bottom-right | [observed] | ✅/⚠️/❌ |
  | Default state | Expanded | [observed] | ✅/⚠️/❌ |

  #### 1.2 Button Behaviors
  [Continue for each section...]

  ### Issues Found
  1. [Issue description with reproduction steps]
  2. ...

  ### Console Errors
  [Any JavaScript errors from browser_console_messages]

  ---
  ```

  ## Important Notes
  - Take a screenshot if you find a visual issue
  - Check console for errors after each major interaction
  - If modal doesn't open, that's a FAIL - document and move on
  - If SillyTavern isn't running, report and exit

  Report when done: "Navigation Modal testing complete: [X] passed, [Y] issues found"
```

#### Agent 2: Curation Modal

```
subagent_type: "general-purpose"
model: "sonnet"
prompt: |
  You are testing the Curation Modal for The Council extension.

  ## Required Reading
  1. `docs/UI_BEHAVIOR.md` - Expected behavior (Section 2: Curation Modal)
  2. `docs/VIEWS.md` - Element reference (Section 2)
  3. `docs/UI_TESTING.md` - MCP tools reference

  ## Your Assignment
  Modal: **Curation Modal** (all 5 tabs: Overview, Stores, Search, Team, Pipelines)

  ## Testing Workflow

  1. **Navigate to SillyTavern:**
     ```
     mcp__playwright__browser_navigate(url: "http://127.0.0.1:8000/")
     mcp__playwright__browser_snapshot()
     ```

  2. **Open Curation Modal:**
     - Find and click "📚 Curation" button in nav
     - Verify modal opens

  3. **Test each tab:**
     - Overview: Verify all store statistics display
     - Stores: Test View, +Add functionality
     - Search: Test search input and execution
     - Team: Test position cards, agent cards, reassign, create agent
     - Pipelines: Test CRUD and RAG sub-tabs

  4. **Document findings** using the format below

  ## Output

  Append your findings to `docs/UI_BEHAVIOR_REPORT.md`:

  ```markdown
  ## Curation Modal Test Results

  **Tested By:** Sonnet Agent
  **Timestamp:** [ISO timestamp]

  ### Summary
  - Total Tests: [N]
  - Passed: [N]
  - Partial: [N]
  - Failed: [N]
  - Untestable: [N]

  ### Tab: Overview
  [Results table...]

  ### Tab: Stores
  [Results table...]

  ### Tab: Search
  [Results table...]

  ### Tab: Team
  [Results table...]

  ### Tab: Pipelines
  [Results table...]

  ### Issues Found
  [Numbered list...]

  ### Console Errors
  [Any errors...]

  ---
  ```

  Report when done: "Curation Modal testing complete: [X] passed, [Y] issues found"
```

#### Agent 3: Character Modal

```
subagent_type: "general-purpose"
model: "sonnet"
prompt: |
  You are testing the Character Modal for The Council extension.

  ## Required Reading
  1. `docs/UI_BEHAVIOR.md` - Expected behavior (Section 3: Character Modal)
  2. `docs/VIEWS.md` - Element reference (Section 3)
  3. `docs/UI_TESTING.md` - MCP tools reference

  ## Your Assignment
  Modal: **Character Modal** (all 3 tabs: Characters, Director, Settings)

  ## Testing Workflow

  1. **Navigate to SillyTavern:**
     ```
     mcp__playwright__browser_navigate(url: "http://127.0.0.1:8000/")
     mcp__playwright__browser_snapshot()
     ```

  2. **Open Character Modal:**
     - Find and click "👥 Characters" button in nav
     - Verify modal opens

  3. **Test each tab:**
     - Characters: Search, filters, character cards, Create Agent, View
     - Director: Configuration form, API settings, Prompt Builder
     - Settings: Status display, action buttons, danger zone

  4. **Document findings**

  ## Output

  Append to `docs/UI_BEHAVIOR_REPORT.md`:

  ```markdown
  ## Character Modal Test Results

  **Tested By:** Sonnet Agent
  **Timestamp:** [ISO timestamp]

  ### Summary
  [Stats...]

  ### Tab: Characters
  [Results...]

  ### Tab: Director
  [Results...]

  ### Tab: Settings
  [Results...]

  ### Issues Found
  [List...]

  ### Console Errors
  [Errors...]

  ---
  ```

  Report when done: "Character Modal testing complete: [X] passed, [Y] issues found"
```

#### Agent 4: Pipeline Modal

```
subagent_type: "general-purpose"
model: "sonnet"
prompt: |
  You are testing the Pipeline Modal for The Council extension.

  ## Required Reading
  1. `docs/UI_BEHAVIOR.md` - Expected behavior (Section 4: Pipeline Modal)
  2. `docs/VIEWS.md` - Element reference (Section 4)
  3. `docs/UI_TESTING.md` - MCP tools reference

  ## Your Assignment
  Modal: **Pipeline Modal** (all 10 tabs)

  This is the largest modal. Prioritize testing:
  1. Tab navigation (all 10 tabs accessible)
  2. Presets tab (critical for saving/loading)
  3. Agents and Positions tabs (core configuration)
  4. Execution tab (pipeline running)

  ## Testing Workflow

  1. Navigate and open Pipeline Modal ("🔧 Pipeline" button)

  2. Test each tab:
     - Presets: Load, save, import, export
     - Agents: Create, edit, duplicate, delete
     - Positions: Create, edit, reassign
     - Teams: Create, edit, members
     - Pipelines: Create, edit, phases
     - Phases: Create, edit, actions
     - Actions: Create, edit, prompt builder
     - Execution: Start, pause, stop, log
     - Threads: Create, view, archive
     - Outputs: View, copy, export

  3. Document findings

  ## Output

  Append to `docs/UI_BEHAVIOR_REPORT.md`:

  ```markdown
  ## Pipeline Modal Test Results

  **Tested By:** Sonnet Agent
  **Timestamp:** [ISO timestamp]

  ### Summary
  [Stats...]

  ### Tab: Presets
  [Results...]

  ### Tab: Agents
  [Results...]

  [Continue for all 10 tabs...]

  ### Issues Found
  [List...]

  ### Console Errors
  [Errors...]

  ---
  ```

  Report when done: "Pipeline Modal testing complete: [X] passed, [Y] issues found"
```

#### Agent 5: Injection Modal

```
subagent_type: "general-purpose"
model: "sonnet"
prompt: |
  You are testing the Injection Modal for The Council extension.

  ## Required Reading
  1. `docs/UI_BEHAVIOR.md` - Expected behavior (Section 5: Injection Modal)
  2. `docs/VIEWS.md` - Element reference (Section 5)
  3. `docs/UI_TESTING.md` - MCP tools reference

  ## Your Assignment
  Modal: **Injection Modal**

  ## Testing Workflow

  1. Navigate and open Injection Modal ("💉 Injection" button)

  2. Test:
     - Enable/disable toggle
     - Quick add buttons (all 12 ST tokens)
     - Add custom mapping (Pipeline source)
     - Add custom mapping (Store source)
     - Add custom mapping (Static source)
     - Edit mapping
     - Delete mapping

  3. Document findings

  ## Output

  Append to `docs/UI_BEHAVIOR_REPORT.md`:

  ```markdown
  ## Injection Modal Test Results

  **Tested By:** Sonnet Agent
  **Timestamp:** [ISO timestamp]

  ### Summary
  [Stats...]

  ### Enable Toggle
  [Results...]

  ### Quick Add Buttons
  [Results for each of 12 buttons...]

  ### Mapping CRUD
  [Results...]

  ### Issues Found
  [List...]

  ### Console Errors
  [Errors...]

  ---
  ```

  Report when done: "Injection Modal testing complete: [X] passed, [Y] issues found"
```

#### Agent 6: Gavel Modal + Shared Components

```
subagent_type: "general-purpose"
model: "sonnet"
prompt: |
  You are testing the Gavel Modal and Shared Components for The Council extension.

  ## Required Reading
  1. `docs/UI_BEHAVIOR.md` - Expected behavior (Sections 6 & 7)
  2. `docs/VIEWS.md` - Element reference (Sections 6 & 7)
  3. `docs/UI_TESTING.md` - MCP tools reference

  ## Your Assignment
  - **Gavel Modal** (may require triggering a pipeline execution)
  - **Shared Components**: Prompt Builder, Token Picker, Participant Selector, Context Config, Execution Monitor

  ## Testing Workflow

  ### Gavel Modal
  Note: This modal only appears during pipeline execution review. You may need to:
  1. Configure a simple pipeline with review enabled
  2. Run it to trigger the Gavel modal
  3. Or document as "untestable" if no review trigger exists

  ### Shared Components
  These appear in various modals. Test them in context:
  1. **Prompt Builder**: Test in Agent edit form (any modal)
     - Custom Prompt mode
     - ST Preset mode
     - Build from Tokens mode
  2. **Token Picker**: Test via "Insert Token" button
  3. **Participant Selector**: Test in Team formation
  4. **Context Config**: Test in action configuration
  5. **Execution Monitor**: Test during pipeline execution

  ## Output

  Append to `docs/UI_BEHAVIOR_REPORT.md`:

  ```markdown
  ## Gavel Modal Test Results

  **Tested By:** Sonnet Agent
  **Timestamp:** [ISO timestamp]

  ### Summary
  [Stats...]

  ### Modal Structure
  [Results...]

  ### Action Buttons
  [Results...]

  ---

  ## Shared Components Test Results

  ### Prompt Builder
  [Results for each mode...]

  ### Token Picker
  [Results...]

  ### Participant Selector
  [Results...]

  ### Context Config
  [Results...]

  ### Execution Monitor
  [Results...]

  ### Issues Found
  [List...]

  ### Console Errors
  [Errors...]

  ---
  ```

  Report when done: "Gavel + Components testing complete: [X] passed, [Y] issues found"
```

---

### Phase 3: Review and Task Generation (Opus)

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

  ```markdown
  # UI Test Report

  **Date:** [timestamp]
  **Tested By:** 6 Parallel Sonnet Agents
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
  ```

  ### Task 2: Generate Development Tasks

  Create or update `docs/tasks/alpha3/CURRENT_SUGGESTED_TASKS.md`:

  ```markdown
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

  If tasks have dependencies, note them:
  - Task A must complete before Task B
  - Tasks C and D can run in parallel

  ---

  ## Estimated Effort Summary

  | Priority | Count | Simple | Moderate | Complex |
  |----------|-------|--------|----------|---------|
  | P0 | ... | ... | ... | ... |
  | P1 | ... | ... | ... | ... |
  | P2 | ... | ... | ... | ... |
  | P3 | ... | ... | ... | ... |
  ```

  ## Important Guidelines

  1. **Be specific**: Each task should be actionable without additional research
  2. **Include file paths**: Point directly to the files that need changes
  3. **Prioritize ruthlessly**: P0 = blocking, P1 = important, P2 = nice, P3 = polish
  4. **Group related tasks**: If 3 issues stem from one root cause, make it one task
  5. **Estimate complexity**: simple = 1 file/30min, moderate = 2-3 files/2hrs, complex = 4+ files/4hrs+

  Report when done: "Review complete. Generated [N] tasks across [M] priority levels. See docs/testing/UI_REPORT-[timestamp].md"
```

---

### Handling Single Modal Testing

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

### Phase 2: Modal Testing
| Agent | Modal | Result |
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

### Parallel Agents Not Starting
Ensure you're spawning all 6 Task tool calls in a SINGLE message.
