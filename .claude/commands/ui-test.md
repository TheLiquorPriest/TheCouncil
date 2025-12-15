# UI Behavior Testing Pipeline

Comprehensive UI testing workflow with memory persistence and parallel browser support.

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

---

## MANDATORY: Session Initialization

**ALWAYS start with memory-keeper:**

```javascript
mcp__memory-keeper__context_session_start({
  name: "TheCouncil-UITest",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})
```

**Retrieve previous test context:**

```javascript
mcp__memory-keeper__context_search({ query: "ui-test" })
mcp__memory-keeper__context_search({ query: "modal" })
mcp__memory-keeper__context_get({ category: "error" })
```

---

## MANDATORY: Tool Preferences

### Code Analysis (when needed)

**Use ast-grep FIRST:**

```bash
# Find UI elements
ast-grep run --pattern 'document.createElement($TAG)' --lang javascript ui/

# Find event handlers
ast-grep run --pattern 'addEventListener($EVENT, $HANDLER)' --lang javascript ui/

# Find modal methods
ast-grep run --pattern 'show() { $$$BODY }' --lang javascript ui/
```

### Browser Automation

**For parallel modal testing, USE concurrent-browser:**

```javascript
// Create instances for parallel testing
mcp__concurrent-browser__browser_create_instance({ instanceId: "ui-test-1" })
mcp__concurrent-browser__browser_create_instance({ instanceId: "ui-test-2" })
mcp__concurrent-browser__browser_navigate({ instanceId: "ui-test-1", url: "http://127.0.0.1:8000/" })
mcp__concurrent-browser__browser_snapshot({ instanceId: "ui-test-1" })
mcp__concurrent-browser__browser_close_all_instances()
```

**For sequential testing, playwright is acceptable:**

```javascript
mcp__playwright__browser_navigate({ url: "http://127.0.0.1:8000/" })
mcp__playwright__browser_snapshot()
```

---

## MANDATORY: Definition Loading

**Read the definitions index first:**

```javascript
// Read .claude/definitions/index.md to discover required definitions
// Load the definitions listed there dynamically
// DO NOT hardcode definition paths - always check the index
```

---

## Prerequisites

1. **Verify browser automation is available:**
```bash
claude mcp list
```
Expected: `playwright: ✓ Connected` AND `concurrent-browser: ✓ Connected`

2. **SillyTavern must be running at:** `http://127.0.0.1:8000/`

3. **Initialize the report file:**
Create `docs/UI_BEHAVIOR_REPORT.md` with header:
```markdown
# The Council - UI Behavior Test Report

**Generated:** [TIMESTAMP]
**Version:** 2.1.0-alpha

---
```

4. **Save initialization to memory:**
```javascript
mcp__memory-keeper__context_save({
  key: "ui-test-init",
  value: "UI Test started: [timestamp]\\nTarget: $ARGUMENTS",
  category: "progress",
  priority: "normal"
})
```

---

## Phase 1: Create/Update Expected Behavior Spec (Opus)

**First, spawn an Opus agent to create or update the behavior specification:**

```
subagent_type: "general-purpose"
model: "opus"
prompt: |
  You are creating the authoritative UI behavior specification for The Council extension.

  ## MANDATORY: Session Initialization

  mcp__memory-keeper__context_session_start({
    name: "TheCouncil-UISpec",
    projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
  })

  ## MANDATORY: Definition Loading

  Read `.claude/definitions/index.md` first to discover which definitions to load.
  Load ALL definitions listed in the index - these are your ground truth.

  ## MANDATORY: Tool Preferences

  **Use ast-grep** to analyze UI code structure:
  ast-grep run --pattern 'show() { $$$BODY }' --lang javascript ui/
  ast-grep run --pattern 'addEventListener($EVENT, $HANDLER)' --lang javascript ui/

  ## Your Task
  Create or update `docs/UI_BEHAVIOR.md` with comprehensive expected behavior.

  ## Required Reading (from definitions index)
  1. CLAUDE.md - Project overview
  2. All definitions from .claude/definitions/index.md
  3. docs/VIEWS.md - UI element inventory

  ## Context Saving

  Save key findings:
  mcp__memory-keeper__context_save({
    key: "ui-spec-update",
    value: "Updated sections: [list]",
    category: "progress",
    priority: "normal"
  })

  ## Output Format
  [Full UI_BEHAVIOR.md structure - see VIEWS.md for reference]

  Do NOT use browser automation tools (you're just reading and writing docs).

  When complete, report: "UI_BEHAVIOR.md created/updated with [N] modal definitions"
```

**Wait for this agent to complete before proceeding to Phase 2.**

---

## Phase 2: Parallel Modal Testing (6 Agents)

**IMPORTANT: Use concurrent-browser MCP to enable parallel testing without conflicts.**

After Phase 1 completes, spawn all 6 testing agents in parallel. Each agent gets its own browser instance.

### Testing Agent Template

Each agent follows the same pattern with different modal assignments:

```
subagent_type: "general-purpose"
model: "sonnet"
prompt: |
  You are testing [MODAL_NAME] for The Council extension.

  ## MANDATORY: Session Initialization

  mcp__memory-keeper__context_session_start({
    name: "TheCouncil-UITest-[MODAL_NAME]",
    projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
  })

  Retrieve previous context:
  mcp__memory-keeper__context_search({ query: "[MODAL_NAME]" })

  ## MANDATORY: Definition Loading

  Read `.claude/definitions/index.md` to discover required definitions.
  Load ALL listed definitions for ground truth.

  ## MANDATORY: Browser Tools (concurrent-browser)

  Use concurrent-browser with your assigned instance ID:

  mcp__concurrent-browser__browser_create_instance({ instanceId: "[INSTANCE_ID]" })
  mcp__concurrent-browser__browser_navigate({ instanceId: "[INSTANCE_ID]", url: "http://127.0.0.1:8000/" })
  mcp__concurrent-browser__browser_snapshot({ instanceId: "[INSTANCE_ID]" })
  mcp__concurrent-browser__browser_click({ instanceId: "[INSTANCE_ID]", element: "...", ref: "..." })
  mcp__concurrent-browser__browser_console_logs({ instanceId: "[INSTANCE_ID]" })
  mcp__concurrent-browser__browser_screenshot({ instanceId: "[INSTANCE_ID]" })
  mcp__concurrent-browser__browser_close_instance({ instanceId: "[INSTANCE_ID]" })

  ## Required Reading
  1. docs/UI_BEHAVIOR.md - Expected behavior (Section [N])
  2. docs/VIEWS.md - Element reference (Section [N])
  3. docs/UI_TESTING.md - Browser tools reference

  ## Your Assignment
  Modal: **[MODAL_NAME]**
  Instance ID: **[INSTANCE_ID]**

  ## Testing Workflow

  1. **Create browser instance** with your assigned ID
  2. **Navigate to SillyTavern** at http://127.0.0.1:8000/
  3. **Get snapshot** to find elements
  4. **Open the modal** (if not Navigation Modal)
  5. **Test each state and interaction** defined in UI_BEHAVIOR.md
  6. **Document findings** for each test:
     - ✅ PASS: Behavior matches expected
     - ⚠️ PARTIAL: Behavior differs slightly (describe)
     - ❌ FAIL: Behavior missing or broken (describe)
     - 🔍 UNTESTABLE: Cannot test (explain why)
  7. **Close browser instance** when done

  ## Context Saving

  Save test results to memory:
  mcp__memory-keeper__context_save({
    key: "ui-test-[MODAL_NAME]-result",
    value: "Pass: [N], Fail: [M], Issues: [list]",
    category: "progress",
    priority: "normal"
  })

  Save any issues found:
  mcp__memory-keeper__context_save({
    key: "ui-test-[MODAL_NAME]-issue-{N}",
    value: "[issue description]",
    category: "error",
    priority: "high"
  })

  ## Output

  Append your findings to `docs/UI_BEHAVIOR_REPORT.md`:

  ## [MODAL_NAME] Test Results

  **Tested By:** Sonnet Agent
  **Instance ID:** [INSTANCE_ID]
  **Timestamp:** [ISO timestamp]

  ### Summary
  - Total Tests: [N]
  - Passed: [N]
  - Partial: [N]
  - Failed: [N]
  - Untestable: [N]

  ### Detailed Results
  [Results tables...]

  ### Issues Found
  [Numbered list with reproduction steps...]

  ### Console Errors
  [From browser console logs]

  ### Memory Keys Saved
  [List of keys saved to memory-keeper]

  ---

  Report when done: "[MODAL_NAME] testing complete: [X] passed, [Y] issues found"
```

### Agent Assignments (Run in Parallel)

| Agent | Modal | Instance ID | Section |
|-------|-------|-------------|---------|
| 1 | Navigation | `ui-nav` | 1 |
| 2 | Curation | `ui-curation` | 2 |
| 3 | Character | `ui-character` | 3 |
| 4 | Pipeline | `ui-pipeline` | 4 |
| 5 | Injection | `ui-injection` | 5 |
| 6 | Gavel + Components | `ui-gavel` | 6 & 7 |

**Spawn all 6 agents simultaneously using the Task tool with `run_in_background: true`.**

---

## Phase 3: Review and Task Generation (Opus)

**After all 6 testing agents complete, spawn an Opus agent to review and generate tasks:**

```
subagent_type: "general-purpose"
model: "opus"
prompt: |
  You are reviewing UI test results and generating development tasks.

  ## MANDATORY: Session Initialization

  mcp__memory-keeper__context_session_start({
    name: "TheCouncil-UIReview",
    projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
  })

  Retrieve all test results:
  mcp__memory-keeper__context_search({ query: "ui-test" })
  mcp__memory-keeper__context_get({ category: "error" })

  ## MANDATORY: Definition Loading

  Read `.claude/definitions/index.md` to discover required definitions.
  Load ALL listed definitions for context.

  ## MANDATORY: ast-grep Analysis

  Use ast-grep to correlate issues with code:
  ast-grep run --pattern 'show() { $$$BODY }' --lang javascript ui/
  ast-grep run --pattern '_handle$NAME($$$) { $$$BODY }' --lang javascript ui/

  ## Required Reading
  1. docs/UI_BEHAVIOR.md - Expected behavior
  2. docs/UI_BEHAVIOR_REPORT.md - Test results from 6 agents

  ## Your Tasks

  ### Task 1: Generate Test Summary Report

  Create `docs/testing/UI_REPORT-[YYYYMMDD-HHMM].md`:

  # UI Test Report

  **Date:** [timestamp]
  **Tested By:** 6 Parallel Sonnet Agents (concurrent-browser)
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

  ## ast-grep Code Analysis
  [Patterns found that relate to issues]

  ## Memory Context Retrieved
  [Keys retrieved from memory-keeper]

  ## Critical Issues (P0)
  [Issues that break core functionality]

  ## High Priority Issues (P1)
  [Issues that impact user experience significantly]

  ## Medium Priority Issues (P2)
  [Issues that should be fixed but aren't blockers]

  ## Low Priority Issues (P3)
  [Polish, edge cases, nice-to-haves]

  ## Patterns Observed
  [Common issues across modals]

  ## Recommendations
  [High-level suggestions]

  ### Task 2: Generate Development Tasks

  Create or update `docs/tasks/alpha3/CURRENT_SUGGESTED_TASKS.md`:

  # Alpha 3 Suggested Tasks

  Generated from UI testing on [date].
  Memory context from: [list memory keys used]

  ## Task Format

  ### Task: [short-name]
  **Priority:** P0/P1/P2/P3
  **Source:** UI Test - [Modal Name]
  **Issue:** [Description]
  **Expected:** [What should happen]
  **Actual:** [What actually happens]
  **Files:** [Likely files - use ast-grep to identify]
  **Complexity:** simple/moderate/complex

  ---

  ## Context Saving

  Save review results:
  mcp__memory-keeper__context_save({
    key: "ui-test-review-[date]",
    value: "Total: [N] tests, Pass: [M], Fail: [K]\\nTasks generated: [X]",
    category: "progress",
    priority: "high"
  })

  Report when done: "Review complete. Generated [N] tasks. See docs/testing/UI_REPORT-[timestamp].md"
```

---

## Handling Single Modal Testing

If `$ARGUMENTS` is provided (e.g., `/ui-test nav`):

1. Skip Phase 1 (assume UI_BEHAVIOR.md exists)
2. Spawn only the relevant agent from Phase 2 (sequential with playwright is acceptable for single modal)
3. Run Phase 3 for review

| Argument | Modal | Instance ID |
|----------|-------|-------------|
| `nav` | Navigation | `ui-nav` |
| `curation` | Curation | `ui-curation` |
| `character` | Character | `ui-character` |
| `pipeline` | Pipeline | `ui-pipeline` |
| `injection` | Injection | `ui-injection` |
| `gavel` | Gavel + Components | `ui-gavel` |

**For single modal tests, playwright is acceptable:**
```javascript
mcp__playwright__browser_navigate({ url: "http://127.0.0.1:8000/" })
```

---

## Final Output

When complete, save summary and report to user:

```javascript
mcp__memory-keeper__context_save({
  key: "ui-test-complete-[date]",
  value: "Full test run complete\\nModals: 6\\nIssues: [N]\\nTasks: [M]",
  category: "progress",
  priority: "high"
})
```

```markdown
## UI Testing Complete

### Phase 1: Behavior Spec
- docs/UI_BEHAVIOR.md: [created/updated]

### Phase 2: Modal Testing (Parallel via concurrent-browser)
| Modal | Instance | Result |
|-------|----------|--------|
| Navigation | ui-nav | [X pass, Y issues] |
| Curation | ui-curation | [X pass, Y issues] |
| Character | ui-character | [X pass, Y issues] |
| Pipeline | ui-pipeline | [X pass, Y issues] |
| Injection | ui-injection | [X pass, Y issues] |
| Gavel + Components | ui-gavel | [X pass, Y issues] |

### Phase 3: Review
- Report: docs/testing/UI_REPORT-[timestamp].md
- Tasks: docs/tasks/alpha3/CURRENT_SUGGESTED_TASKS.md

### Memory Context
- Keys saved: [list]
- Session: TheCouncil-UITest

### Next Steps
1. Review the test report
2. Run `/task [task-name]` to fix issues
3. Re-run `/ui-test` to verify fixes
```

---

## Troubleshooting

### concurrent-browser Not Connected
```bash
claude mcp add concurrent-browser -s user -- [installation command]
# Restart Claude Code session
```

### SillyTavern Not Running
Testing agents will report this and exit. Start ST at port 8000.

### Browser Instance Conflicts
concurrent-browser handles this automatically with instance IDs. If issues persist:
```javascript
mcp__concurrent-browser__browser_close_all_instances()
```

### Memory Context Issues
```javascript
mcp__memory-keeper__context_summarize()
mcp__memory-keeper__context_get({ category: "error" })
```
