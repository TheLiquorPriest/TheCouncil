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

## OBSERVABILITY CHECKPOINT #0: Read the Bible

**MANDATORY: Read PROCESS_README.md FIRST.**

```javascript
Read(".claude/PROCESS_README.md")  // The authoritative process document
```

This document defines ALL paths, conventions, and requirements. Follow it exactly.

---

## ⛔ OBSERVABILITY CHECKPOINT #0.5: MCP TOOL VERIFICATION GATE

**MANDATORY: Verify MCP tools BEFORE any work. UI testing REQUIRES browser automation.**

### NO WORKAROUNDS POLICY - ABSOLUTELY ENFORCED

**Reports like this are COMPLETELY UNACCEPTABLE and constitute TASK FAILURE:**
> "Due to browser automation tools being unavailable in this session, verification was conducted through detailed code review of modal implementations..."

**CODE REVIEW IS NOT A SUBSTITUTE FOR BROWSER TESTING.**
**THIS IS A UI TESTING COMMAND. BROWSER TOOLS ARE MANDATORY.**

### Tool Verification Process

```javascript
// VERIFY MCP TOOLS FIRST - BEFORE ANYTHING ELSE

// Test 1: Memory-keeper (REQUIRED)
mcp__memory-keeper__context_session_start({
  name: "TheCouncil-UITest-ToolVerify",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})
// IF THIS FAILS → ABORT IMMEDIATELY

// Test 2: Browser automation (REQUIRED FOR UI TESTING)
// For parallel testing (full run):
mcp__concurrent-browser__browser_create_instance({ instanceId: "verify-test" })
mcp__concurrent-browser__browser_close_instance({ instanceId: "verify-test" })
// OR for sequential testing (single modal):
mcp__playwright__browser_navigate({ url: "about:blank" })
// IF THIS FAILS → ABORT IMMEDIATELY (NO CODE REVIEW SUBSTITUTE)
```

### Confirmation Report #0.5 (MANDATORY)

**You MUST output this confirmation BEFORE proceeding:**

```markdown
## ⛔ MCP TOOL VERIFICATION GATE

| Tool | Required | Status | Evidence |
|------|----------|--------|----------|
| memory-keeper | YES | ✅ PASS / ❌ FAIL | [session ID or error] |
| playwright | YES (sequential) | ✅ PASS / ❌ FAIL | [result or error] |
| concurrent-browser | YES (parallel) | ✅ PASS / ❌ FAIL | [result or error] |

### GATE RESULT: PASS / FAIL

If FAIL: STOP. Output failure report. Do not proceed.
```

### On Failure: ABORT IMMEDIATELY

**If browser tools are unavailable:**

```markdown
## ⛔ UI TEST ABORTED: BROWSER TOOLS UNAVAILABLE

### Missing Tools
- [tool]: [error message]

### UI Testing REQUIRES Browser Automation
The /ui-test command performs ACTUAL BROWSER TESTING, not code review.
Without browser tools, this command cannot function.

### Resolution Required
1. Run `claude mcp list` to check server status
2. Verify playwright and/or concurrent-browser are connected
3. Restart Claude Code session if needed
4. Re-run `/ui-test` when browser tools are available

### WORKAROUNDS NOT ATTEMPTED
- Code review is NOT a substitute for UI testing
- Static analysis is NOT a substitute for browser verification
- Reading modal code is NOT equivalent to testing modal behavior

**STATUS: FAILED - BROWSER TOOLS UNAVAILABLE**
```

**DO NOT PROCEED PAST THIS POINT IF GATE FAILS.**
**CODE REVIEW IS NOT AN ACCEPTABLE ALTERNATIVE.**

---

## OBSERVABILITY CHECKPOINT #1: Session Initialization

**MANDATORY: Initialize memory-keeper and CONFIRM:**

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

### Confirmation Report #1

**You MUST output this confirmation before proceeding:**

```markdown
## Initialization Confirmed

- [ ] PROCESS_README.md read: YES
- [ ] Memory-keeper session started: [session ID]
- [ ] Previous UI test context retrieved: [count] items found
- [ ] Previous modal tests found: [count] items
- [ ] Errors from previous runs: [count or "none"]
```

---

## OBSERVABILITY CHECKPOINT #2: Dynamic Discovery - Index Files

**MANDATORY: Read ALL index files for dynamic discovery. DO NOT HARDCODE PATHS.**

### Required Index Files

```javascript
// Read these files IN ORDER:
1. Read(".claude/definitions/index.md")     // Definition discovery
2. Read(".claude/agents/index.md")          // Agent discovery
3. Read(".claude/agent-workflows/index.md") // Workflow discovery
```

### Confirmation Report #2

**You MUST output this confirmation before proceeding:**

```markdown
## Dynamic Discovery Confirmed

### Definitions Index (`.claude/definitions/index.md`)
- [ ] File read: YES
- [ ] Core definitions listed: [list filenames]
- [ ] UI-specific definitions: VIEWS.md, UI_BEHAVIOR.md

### Agents Index (`.claude/agents/index.md`)
- [ ] File read: YES
- [ ] UI testing agents available: [list names]
- [ ] Expert agents available: [list names]

### Workflows Index (`.claude/agent-workflows/index.md`)
- [ ] File read: YES
- [ ] UI testing workflow documented: YES
```

---

## OBSERVABILITY CHECKPOINT #3: Load Required Definitions

**MANDATORY: Load definitions dynamically from the index.**

For UI testing, these definitions are REQUIRED:

```javascript
// From definitions index - REQUIRED for UI testing:
Read(".claude/definitions/VIEWS.md")        // UI element inventory
Read(".claude/definitions/UI_BEHAVIOR.md")  // Expected behavior spec
Read(".claude/definitions/SYSTEM_DEFINITIONS.md")  // Architecture context
```

### Confirmation Report #3

**You MUST output this confirmation before proceeding:**

```markdown
## Definitions Loaded

| Definition | Loaded | Relevant Sections |
|------------|--------|-------------------|
| VIEWS.md | YES | [list modal sections] |
| UI_BEHAVIOR.md | YES | [list modal sections] |
| SYSTEM_DEFINITIONS.md | YES | [list system sections] |

### UI Inventory Confirmed
- Total modals documented: [count]
- Total UI elements documented: [count]
- Total expected behaviors documented: [count]
```

---

## OBSERVABILITY CHECKPOINT #4: Agent Resolution

**MANDATORY: Resolve ALL agents needed for the testing pipeline.**

### Agents Required for UI Testing

Based on `.claude/agents/index.md`, resolve these agents:

| Phase | Agent | Purpose |
|-------|-------|---------|
| Phase 1 (Spec) | `uiux-expert-opus` | Create/update UI_BEHAVIOR.md |
| Phase 2 (Test) | `ui-feature-verification-test-sonnet` | Test each modal |
| Phase 3 (Review) | `code-audit-opus` | Review results, generate tasks |

### Agent Resolution Process

For EACH agent:
1. **Read `.claude/agents/index.md`** to find the agent
2. **Read the agent definition file** from `.claude/agents/{agent-name}.md`
3. **Extract model** from frontmatter
4. **Extract full instructions** from the agent definition

### Confirmation Report #4

**You MUST output this confirmation for EACH agent:**

```markdown
## Agent Resolution Summary

### uiux-expert-opus (Phase 1)
- [ ] Found in agents index: YES
- [ ] Definition read: `.claude/agents/uiux-expert-opus.md`
- [ ] Model: opus
- [ ] MANDATORY sections present: [list]
- [ ] Instructions captured: [line count] lines

### ui-feature-verification-test-sonnet (Phase 2)
- [ ] Found in agents index: YES
- [ ] Definition read: `.claude/agents/ui-feature-verification-test-sonnet.md`
- [ ] Model: sonnet
- [ ] MANDATORY sections present: [list]
- [ ] Instructions captured: [line count] lines

### code-audit-opus (Phase 3)
- [ ] Found in agents index: YES
- [ ] Definition read: `.claude/agents/code-audit-opus.md`
- [ ] Model: opus
- [ ] MANDATORY sections present: [list]
- [ ] Instructions captured: [line count] lines
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
  value: "UI Test started: [timestamp]\nTarget: $ARGUMENTS",
  category: "progress",
  priority: "normal"
})
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

## Phase 1: Create/Update Expected Behavior Spec (uiux-expert-opus)

**First, spawn the uiux-expert-opus agent to create or update the behavior specification.**

### Spawn Confirmation for Phase 1

**Output this confirmation before spawning:**

```markdown
## Phase 1 Spawn Confirmation

| Field | Value |
|-------|-------|
| Agent | uiux-expert-opus |
| Model | opus |
| Definition | `.claude/agents/uiux-expert-opus.md` |
| Instructions | [X] lines included |
| Task | Create/update UI_BEHAVIOR.md |
```

### Phase 1 Task Spawn

```javascript
Task({
  description: "Create UI Behavior Spec",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: `
## Agent Instructions

[PASTE FULL CONTENTS OF .claude/agents/uiux-expert-opus.md HERE]

---

## Task-Specific Context

You are creating the authoritative UI behavior specification for The Council extension.

### Required Reading (from definitions index)
1. .claude/definitions/SYSTEM_DEFINITIONS.md - System architecture
2. .claude/definitions/VIEWS.md - UI element inventory

### Your Task
Create or update .claude/definitions/UI_BEHAVIOR.md with comprehensive expected behavior.

### Output
When complete, report: "UI_BEHAVIOR.md created/updated with [N] modal definitions"

Do NOT use browser automation tools (you're just reading and writing docs).
`
})
```

**Wait for this agent to complete before proceeding to Phase 2.**

---

## Phase 2: Parallel Modal Testing (6 Agents)

**IMPORTANT: Use concurrent-browser MCP to enable parallel testing without conflicts.**

After Phase 1 completes, spawn all 6 testing agents in parallel.

### Spawn Confirmation for Phase 2

**Output this confirmation for EACH agent before spawning:**

```markdown
## Phase 2 Spawn Confirmation - [MODAL_NAME]

| Field | Value |
|-------|-------|
| Agent | ui-feature-verification-test-sonnet |
| Model | sonnet |
| Definition | `.claude/agents/ui-feature-verification-test-sonnet.md` |
| Instructions | [X] lines included |
| Modal | [MODAL_NAME] |
| Instance ID | [ui-XXX] |
| UI_BEHAVIOR.md Section | [N] |
| VIEWS.md Section | [N] |
```

### Testing Agent Spawn Template

```javascript
Task({
  description: "Test [MODAL_NAME] Modal",
  subagent_type: "general-purpose",
  model: "sonnet",
  prompt: `
## ⛔ MCP TOOL VERIFICATION (MANDATORY FIRST STEP)

**BEFORE ANY OTHER WORK**, verify browser tools are available:

1. Call mcp__memory-keeper__context_session_start() - MUST SUCCEED
2. Call mcp__concurrent-browser__browser_create_instance() or mcp__playwright__browser_navigate() - MUST SUCCEED
3. Output the Tool Verification Gate confirmation

### NO WORKAROUNDS POLICY

**If browser tools are unavailable:**
- DO NOT proceed with testing
- DO NOT substitute code review for browser testing
- DO NOT report "verification through code analysis"
- Output: "⛔ TASK ABORTED: BROWSER TOOLS UNAVAILABLE"
- STOP IMMEDIATELY

**The following is COMPLETELY UNACCEPTABLE:**
> "Due to browser automation tools being unavailable, verification was conducted through code review..."

**THIS IS A UI TESTING TASK. CODE REVIEW DOES NOT COUNT.**

### Tool Verification Output (REQUIRED)

\`\`\`markdown
## ⛔ MCP TOOL VERIFICATION GATE

| Tool | Required | Status | Evidence |
|------|----------|--------|----------|
| memory-keeper | YES | ✅/❌ | [session ID or error] |
| browser tool | YES | ✅/❌ | [instance ID or navigate result] |

### GATE RESULT: PASS / FAIL
\`\`\`

**If GATE FAILS, stop here. Report failure. Do not proceed.**

---

## Agent Instructions

[PASTE FULL CONTENTS OF .claude/agents/ui-feature-verification-test-sonnet.md HERE]

---

## Test Assignment

You are testing **[MODAL_NAME]** for The Council extension.

### Your Assignment
- Modal: **[MODAL_NAME]**
- Instance ID: **[INSTANCE_ID]**
- UI_BEHAVIOR.md Section: **[N]**
- VIEWS.md Section: **[N]**

### Required Reading (from definitions index)
1. .claude/definitions/UI_BEHAVIOR.md - Expected behavior (Section [N])
2. .claude/definitions/VIEWS.md - Element reference (Section [N])

### Testing Workflow (REQUIRES BROWSER TOOLS)

1. **FIRST: Complete MCP Tool Verification Gate** (above)
2. **Create browser instance** with your assigned ID
3. **Navigate to SillyTavern** at http://127.0.0.1:8000/
4. **Get snapshot** to find elements
5. **Open the modal** (if not Navigation Modal)
6. **Test each state and interaction** defined in UI_BEHAVIOR.md
7. **Document findings** for each test:
   - ✅ PASS: Behavior matches expected (VERIFIED IN BROWSER)
   - ⚠️ PARTIAL: Behavior differs slightly (describe)
   - ❌ FAIL: Behavior missing or broken (describe)
   - 🚫 TOOLS_UNAVAILABLE: Browser tools not available (TASK FAILS)
8. **Close browser instance** when done

### Output

Append your findings to docs/UI_BEHAVIOR_REPORT.md with the format from your agent instructions.

Report when done: "[MODAL_NAME] testing complete: [X] passed, [Y] issues found"

**If browser tools unavailable, report: "⛔ TASK ABORTED: BROWSER TOOLS UNAVAILABLE"**
`
})
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

## Phase 3: Review and Task Generation (code-audit-opus)

**After all 6 testing agents complete, spawn the code-audit-opus agent to review and generate tasks.**

### Spawn Confirmation for Phase 3

**Output this confirmation before spawning:**

```markdown
## Phase 3 Spawn Confirmation

| Field | Value |
|-------|-------|
| Agent | code-audit-opus |
| Model | opus |
| Definition | `.claude/agents/code-audit-opus.md` |
| Instructions | [X] lines included |
| Task | Review results, generate tasks |
```

### Phase 3 Task Spawn

```javascript
Task({
  description: "Review UI Test Results",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: `
## Agent Instructions

[PASTE FULL CONTENTS OF .claude/agents/code-audit-opus.md HERE]

---

## Review Context

You are reviewing UI test results and generating development tasks.

### Required Reading (from definitions index)
1. .claude/definitions/UI_BEHAVIOR.md - Expected behavior
2. docs/UI_BEHAVIOR_REPORT.md - Test results from 6 agents

### Your Tasks

#### Task 1: Generate Test Summary Report

Create docs/testing/UI_REPORT-[YYYYMMDD-HHMM].md with:
- Executive summary table (Modal | Tests | Pass | Partial | Fail | Untestable)
- Overall health score percentage
- ast-grep code analysis (patterns found that relate to issues)
- Memory context retrieved
- Issues by priority (P0, P1, P2, P3)
- Patterns observed across modals
- Recommendations

#### Task 2: Generate Development Tasks

Create or update the development plan with suggested tasks based on findings.

### Output
Report when done: "Review complete. Generated [N] tasks. See docs/testing/UI_REPORT-[timestamp].md"
`
})
```

---

## Handling Single Modal Testing

If `$ARGUMENTS` is provided (e.g., `/ui-test nav`):

1. Skip Phase 1 (assume UI_BEHAVIOR.md exists)
2. Spawn only the relevant testing agent from Phase 2 (sequential with playwright is acceptable)
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

## OBSERVABILITY CHECKPOINT #5: Final Report

**MANDATORY: Output final report when complete:**

```markdown
## UI Testing Complete

### Observability Summary

| Checkpoint | Status |
|------------|--------|
| #0 PROCESS_README.md | READ |
| #1 Session Init | CONFIRMED |
| #2 Dynamic Discovery | CONFIRMED |
| #3 Definitions Loaded | CONFIRMED |
| #4 Agents Resolved | CONFIRMED |
| #5 Final Report | THIS |

### Phase 1: Behavior Spec
- Agent: uiux-expert-opus
- Definition: `.claude/agents/uiux-expert-opus.md`
- .claude/definitions/UI_BEHAVIOR.md: [created/updated]

### Phase 2: Modal Testing (Parallel via concurrent-browser)
- Agent: ui-feature-verification-test-sonnet (x6)
- Definition: `.claude/agents/ui-feature-verification-test-sonnet.md`

| Modal | Instance | Agent Confirmed | Result |
|-------|----------|-----------------|--------|
| Navigation | ui-nav | YES | [X pass, Y issues] |
| Curation | ui-curation | YES | [X pass, Y issues] |
| Character | ui-character | YES | [X pass, Y issues] |
| Pipeline | ui-pipeline | YES | [X pass, Y issues] |
| Injection | ui-injection | YES | [X pass, Y issues] |
| Gavel + Components | ui-gavel | YES | [X pass, Y issues] |

### Phase 3: Review
- Agent: code-audit-opus
- Definition: `.claude/agents/code-audit-opus.md`
- Report: docs/testing/UI_REPORT-[timestamp].md
- Tasks: [generated task list location]

### Definitions Used
- .claude/definitions/VIEWS.md
- .claude/definitions/UI_BEHAVIOR.md
- .claude/definitions/SYSTEM_DEFINITIONS.md

### Memory Context
- Keys saved: [list]
- Session: TheCouncil-UITest

### Next Steps
1. Review the test report
2. Run `/tasks [task-id]` to fix issues
3. Re-run `/ui-test` to verify fixes
```

**Save final status to memory:**

```javascript
mcp__memory-keeper__context_save({
  key: "ui-test-complete-[date]",
  value: "Full test run complete\nModals: 6\nIssues: [N]\nTasks: [M]",
  category: "progress",
  priority: "high"
})
```

---

## Troubleshooting

### ⛔ Browser Tools Not Available (CRITICAL - HARD FAILURE)

**THIS IS A UI TESTING COMMAND. BROWSER TOOLS ARE MANDATORY.**

If browser tools are unavailable:

1. **ABORT THE TEST IMMEDIATELY**
2. **DO NOT substitute code review for browser testing**
3. **DO NOT restructure to work around missing tools**
4. Output: "⛔ UI TEST ABORTED: BROWSER TOOLS UNAVAILABLE"
5. User must restart Claude Code session
6. Re-run `/ui-test` only after browser tools are confirmed available

**The following is COMPLETELY UNACCEPTABLE:**
> "Due to browser automation tools being unavailable, verification was conducted through code review..."

**This is a FAILURE, not a creative solution. Code review is NOT UI testing.**

**Resolution:**
```bash
claude mcp list
# Verify both playwright and concurrent-browser show ✓ Connected
# Restart Claude Code if any are missing
# Re-run /ui-test command
```

### concurrent-browser Not Connected
**This is a BLOCKING failure for parallel UI testing.**
```bash
claude mcp add concurrent-browser -s user -- [installation command]
# Restart Claude Code session
# DO NOT attempt workarounds
```

### playwright Not Connected
**This is a BLOCKING failure for sequential UI testing.**
```bash
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest
# Restart Claude Code session
# DO NOT attempt workarounds
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

### Agent Not Found
If an agent isn't found in `.claude/agents/index.md`:
1. Check for typos in agent name
2. Verify agent file exists in `.claude/agents/`
3. Add agent to index if missing
4. Report to user if unresolvable

### ⛔ MCP Tools Not Available to Subagents (HARD FAILURE)

**If spawned agents report they don't have MCP tools:**

1. **THIS IS A TASK FAILURE - NOT A WORKAROUND SCENARIO**
2. **ABORT the test immediately**
3. **DO NOT have subagents do "code review" instead**
4. **DO NOT restructure tasks to avoid MCP usage**
5. Output: "⛔ UI TEST ABORTED: SUBAGENT MCP TOOLS UNAVAILABLE"
6. User must restart Claude Code session
7. Re-run only after all MCP tools are verified

**Code review is NOT equivalent to UI testing. Period.**
