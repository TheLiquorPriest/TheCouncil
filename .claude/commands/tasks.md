# Task Runner

Run tasks for a group/block or a single task, with branch management, browser verification, audit gates, and context persistence.

## Usage

```
/tasks 1          # Run all Group 1 tasks
/tasks 1 async block   # Run all Group 1 tasks asynchronously in parallel by block with each task within each block sequentially but blocks in parallel
/tasks 1 async block async task   # Run all Group 1 tasks asynchronously in parallel by block with each task within each block asynchronously in parallel
/tasks 2.1        # Run all Block 2.1 tasks
/tasks 2.1 async  # Run all Block 2.1 tasks asynchronously in parallel
/tasks 1.1.1      # Run single task 1.1.1
/tasks 2.3.1      # Run single task 2.3.1
/tasks 4.1:4.3    # Run all tasks Group 4 Block 4.1 through 4.3 tasks
/tasks 4.1:4.3 async block   # Run all tasks Group 4 Block 4.1 through 4.3 tasks asynchronously in parallel by block with each task within each block sequentially but blocks in parallel
/tasks 4.1:4.3 async block async task   # Run all tasks Group 4 Block 4.1 through 4.3 tasks asynchronously in parallel by block with each task within each block asynchronously in parallel
/tasks 4.5 - 4.8  # Run all tasks Group 4 Block 4.5 to 4.8 tasks
/tasks 4.5 - 4.8 async block   # Run all tasks Group 4 Block 4.5 to 4.8 tasks asynchronously in parallel by block with each task within each block sequentially but blocks in parallel
/tasks 4.5 - 4.8 async block async task   # Run all tasks Group 4 Block 4.5 to 4.8 tasks asynchronously in parallel by block with each task within each block asynchronously in parallel
```

## Instructions

You are running **$ARGUMENTS**.

### ⚠️ CRITICAL: ALWAYS RUN FRESH - NO SKIPPING

**When the user invokes `/tasks`, ALWAYS run ALL requested tasks from scratch.**

- **NEVER** skip tasks because they were "already completed"
- **NEVER** check handoffs to decide whether to run
- **NEVER** assume previous work is valid
- **ALWAYS** execute every task in the requested scope
- **ALWAYS** overwrite existing handoffs with new results

If `/tasks 4` is invoked → Run ALL Group 4 tasks, no exceptions.
If `/tasks 4.1` is invoked → Run ALL Block 4.1 tasks, no exceptions.
If `/tasks 4.1.1` is invoked → Run task 4.1.1, no exceptions.

---

## OBSERVABILITY CHECKPOINT #0: Read the Bible

**MANDATORY: Read PROCESS_README.md FIRST.**

```javascript
Read(".claude/PROCESS_README.md")  // The authoritative process document
```

This document defines ALL paths, conventions, and requirements. Follow it exactly.

---

## ⛔ OBSERVABILITY CHECKPOINT #0.5: MCP TOOL VERIFICATION GATE

**MANDATORY: Verify MCP tools are available BEFORE any work.**

### NO WORKAROUNDS POLICY

**Reports like this are COMPLETELY UNACCEPTABLE:**
> "Due to browser automation tools being unavailable in this session, verification was conducted through detailed code review..."

**CODE REVIEW IS NOT A SUBSTITUTE FOR BROWSER TESTING. This is a HARD FAILURE.**

### Tool Verification Process

```javascript
// VERIFY THAT AGENTS CAN USE MCP TOOLS FIRST - BEFORE ANYTHING ELSE
// 
// SPAWN A dev-haiku agent to test

// Test 1: Memory-keeper (REQUIRED for ALL tasks and agents)
mcp__memory-keeper__context_session_start({
  name: "TheCouncil-TaskRunner-ToolVerify",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})
// IF THIS FAILS → ABORT TASK IMMEDIATELY

// Test 2: Browser automation (check which is available)
// Try playwright:
mcp__playwright__browser_navigate({ url: "about:blank" })
// OR try concurrent-browser:
mcp__concurrent-browser__browser_create_instance({ instanceId: "verify-test" })
// CLOSE TEST INSTANCE IF CREATED
mcp__concurrent-browser__browser_close_instance({ instanceId: "verify-test" })
```

### Confirmation Report #0.5 (MANDATORY)

**You MUST output this confirmation BEFORE proceeding:**

```markdown
## ⛔ MCP TOOL VERIFICATION GATE

| Tool | Required | Status | Evidence |
|------|----------|--------|----------|
| memory-keeper | YES | ✅ PASS / ❌ FAIL | [session ID or error] |
| playwright | FOR VERIFICATION | ✅ PASS / ❌ FAIL | [result or error] |
| concurrent-browser | FOR PARALLEL | ✅ PASS / ❌ FAIL | [result or error] |
| ast-grep | FOR CODE SEARCH | ✅ PASS / ❌ FAIL | [version or error] |

### GATE RESULT: PASS / FAIL

If FAIL: STOP. Output failure report. Do not proceed.
```

### On Failure: ABORT IMMEDIATELY

**If ANY required tool is unavailable:**

```markdown
## ⛔ TASK ABORTED: MCP TOOLS UNAVAILABLE

### Missing Tools
- [tool]: [error message]

### Task Cannot Proceed
The /tasks command requires MCP tools for:
- Memory persistence (memory-keeper)
- Browser verification (playwright/concurrent-browser)
- Code exploration (ast-grep)

### Resolution Required
1. Run `claude mcp list` to check server status
2. Restart Claude Code session if needed
3. Re-run `/tasks $ARGUMENTS` when tools are available

### WORKAROUNDS NOT ATTEMPTED
Code review is NOT a substitute for browser testing.
Static analysis is NOT a substitute for runtime verification.

**STATUS: FAILED - TOOLS UNAVAILABLE**
```

**DO NOT PROCEED PAST THIS POINT IF GATE FAILS.**

---

## OBSERVABILITY CHECKPOINT #1: Session Initialization

**MANDATORY: Initialize memory-keeper and CONFIRM:**

```javascript
mcp__memory-keeper__context_session_start({
  name: "TheCouncil-TaskRunner",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})
```

**Retrieve task context:**

```javascript
mcp__memory-keeper__context_search({ query: "task $ARGUMENTS" })
mcp__memory-keeper__context_get({ category: "progress" })
mcp__memory-keeper__context_get({ category: "error" })
```

### Confirmation Report #1

**You MUST output this confirmation before proceeding:**

```markdown
## Initialization Confirmed

- [ ] PROCESS_README.md read: YES
- [ ] Memory-keeper session started: [session ID]
- [ ] Previous context retrieved: [count] items found
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
- [ ] Context-specific definitions listed: [list filenames]

### Agents Index (`.claude/agents/index.md`)
- [ ] File read: YES
- [ ] Development agents available: [list names]
- [ ] QA agents available: [list names]
- [ ] Expert agents available: [list names]

### Workflows Index (`.claude/agent-workflows/index.md`)
- [ ] File read: YES
- [ ] Agent registry found: YES
- [ ] Task lifecycle documented: YES
```

---

## OBSERVABILITY CHECKPOINT #3: Load Required Definitions

**MANDATORY: Load definitions dynamically from the index.**

Based on `.claude/definitions/index.md`, load:

```javascript
// Core Definitions (ALWAYS load):
Read(".claude/definitions/SYSTEM_DEFINITIONS.md")
Read(".claude/definitions/VIEWS.md")

// Context-Specific (load if relevant to task):
// - DEFAULT_PIPELINE.md if working on pipelines
// - UI_BEHAVIOR.md if doing UI testing
```

### Confirmation Report #3

**You MUST output this confirmation before proceeding:**

```markdown
## Definitions Loaded

| Definition | Loaded | Relevant Sections |
|------------|--------|-------------------|
| SYSTEM_DEFINITIONS.md | YES/NO | [list sections read] |
| VIEWS.md | YES/NO | [list sections read] |
| DEFAULT_PIPELINE.md | YES/NO/N/A | [list sections read] |
| UI_BEHAVIOR.md | YES/NO/N/A | [list sections read] |
```

---

## OBSERVABILITY CHECKPOINT #4: Development Plan Discovery

**MANDATORY: Discover and load the active development plan.**

```javascript
// Step 1: Find active plan
Read(".claude/agent-dev-plans/state.md")  // Global state points to active plan

// Step 2: Load plan files
const PLAN_DIR = ".claude/agent-dev-plans/{version}/"
Read(PLAN_DIR + "index.md")        // Plan overview
Read(PLAN_DIR + "task-list.md")    // All tasks
Read(PLAN_DIR + "status.md")       // Current status
Read(PLAN_DIR + "assignments.md")  // CRITICAL: Agent assignments
```

### Confirmation Report #4

**You MUST output this confirmation before proceeding:**

```markdown
## Development Plan Loaded

- [ ] Active plan version: [version]
- [ ] Target branch: [branch name]
- [ ] Plan index read: YES
- [ ] Task list read: YES (total tasks: [count])
- [ ] Status read: YES (completed: [X], pending: [Y], blocked: [Z])
- [ ] **Assignments read: YES** (CRITICAL)

### Tasks for $ARGUMENTS

| Task ID | Name | Priority | Assigned Agent | Status |
|---------|------|----------|----------------|--------|
| X.X.X | [name] | P0-P3 | [agent name] | [status] |
```

---

## OBSERVABILITY CHECKPOINT #5: Agent Resolution

**MANDATORY: For EACH task, resolve the assigned agent.**

### Agent Resolution Process

1. **Read `assignments.md`** to get the agent name for the task
2. **Read `.claude/agents/index.md`** to find the agent file
3. **Read the agent definition file** from `.claude/agents/{agent-name}.md`
4. **Extract model** from frontmatter
5. **Extract full instructions** from the agent definition

### Confirmation Report #5

**For EACH task, you MUST output this confirmation:**

```markdown
## Agent Resolution for Task [X.X.X]

- [ ] Assignment lookup: Agent `[agent-name]` assigned in assignments.md
- [ ] Agent index lookup: Found in `.claude/agents/index.md`: YES
- [ ] Agent definition read: `.claude/agents/[agent-name].md`
- [ ] Model extracted: [opus/sonnet/haiku]
- [ ] MANDATORY sections found:
  - [ ] Session Initialization: YES
  - [ ] Tool Preferences: YES
  - [ ] Context Saving: YES
- [ ] Full instructions captured: [line count] lines

### Agent Summary
| Field | Value |
|-------|-------|
| Agent Name | [name] |
| Model | [opus/sonnet/haiku] |
| Definition File | `.claude/agents/[name].md` |
| Instruction Length | [X] lines |
```

---

## Step 1: Determine Run Mode

Parse `$ARGUMENTS`:

- If matches pattern `X` (single digit): **Group Mode** - run all tasks in Group X
- If matches pattern `X.Y` (two parts): **Block Mode** - run all tasks in Block X.Y
- If matches pattern `X.Y.Z` (three parts): **Single Task Mode** - run only that task

```
GROUP_NUMBER = first digit (1, 2, 3, etc.)
BLOCK_ID = first two parts if present (e.g., "1.1")
TASK_ID = full task ID if single task mode (e.g., "1.1.1")
```

---

## Step 2: Always Run Fresh (NO SKIPPING)

**ALWAYS run tasks fresh. NEVER skip based on previous completion status.**

When `/tasks` is invoked:
- **DO NOT** check if tasks were previously completed
- **DO NOT** skip tasks based on handoff files
- **DO NOT** assume previous work is still valid
- **ALWAYS** run every requested task from scratch

```markdown
## Task Execution Policy

| Scenario | Action |
|----------|--------|
| Task has existing handoff | RUN IT ANYWAY |
| Task marked COMPLETE in status | RUN IT ANYWAY |
| Task was run in previous session | RUN IT ANYWAY |
| User says `/tasks 4` | RUN ALL GROUP 4 TASKS |
```

**Log fresh run to memory:**
```javascript
mcp__memory-keeper__context_save({
  key: "task-run-X.X.X-fresh",
  value: "Running task fresh (ignoring previous completion status)",
  category: "progress",
  priority: "normal"
})
```

**Overwrite existing handoffs** - new runs produce new handoffs.

---

## Step 3: Branch Setup

Base branches off of TARGET_BRANCH.

```bash
# Branch naming convention: {version}-group-{GROUP}
BRANCH_NAME="${PLAN_VERSION}-group-${GROUP_NUMBER}"

# Check if branch exists
git branch --list $BRANCH_NAME

# If branch doesn't exist, create from TARGET_BRANCH
git checkout $TARGET_BRANCH
git checkout -b $BRANCH_NAME

# If branch exists, switch to it
git checkout $BRANCH_NAME
```

**Important:** Always derive branch name from the development plan's version.

---

## Step 4: Run Task(s) - SPAWNING CUSTOM AGENTS

### CRITICAL: Agent Spawn Process

For each task, you have completed Observability Checkpoint #5 and have:
- The agent name from `assignments.md`
- The full agent instructions from `.claude/agents/{agent-name}.md`
- The model from the agent frontmatter

### Task Tool Invocation

```javascript
Task({
  description: "Task [TASK_ID]: [task-name]",
  subagent_type: "general-purpose",  // REQUIRED: Built-in type
  model: "[MODEL]",                   // FROM agent frontmatter: opus/sonnet/haiku
  prompt: `
## ⛔ MCP TOOL VERIFICATION (MANDATORY FIRST STEP)

**BEFORE ANY OTHER WORK**, verify MCP tools are available:

1. Call mcp__memory-keeper__context_session_start() - MUST SUCCEED
2. If this is a UI/verification task, call a browser tool - MUST SUCCEED
3. Output the Tool Verification Gate confirmation

### NO WORKAROUNDS POLICY

**If ANY required tool is unavailable:**
- DO NOT proceed with the task
- DO NOT substitute code review for browser testing
- DO NOT substitute static analysis for runtime verification
- Output: "⛔ TASK ABORTED: MCP TOOLS UNAVAILABLE"
- List which tools failed and why
- STOP IMMEDIATELY

**The following is COMPLETELY UNACCEPTABLE:**
> "Due to browser automation tools being unavailable, verification was conducted through code review..."

This is a TASK FAILURE, not a workaround.

### Tool Verification Output (REQUIRED)

\`\`\`markdown
## ⛔ MCP TOOL VERIFICATION GATE

| Tool | Required | Status | Evidence |
|------|----------|--------|----------|
| memory-keeper | YES | ✅/❌ | [session ID or error] |
| browser tools | [YES/NO] | ✅/❌/N/A | [result or error] |

### GATE RESULT: PASS / FAIL
\`\`\`

**If GATE FAILS, stop here. Do not proceed.**

---

## Agent Instructions

[PASTE FULL CONTENTS OF .claude/agents/{AGENT_NAME}.md HERE]
[Include ALL MANDATORY sections from the agent definition]

---

## Task-Specific Context

You are implementing Task [TASK_ID] for The Council project.

### Branch
You are working on branch: [BRANCH_NAME]

### Task Definition
[PASTE CONTENTS OF .claude/agent-dev-plans/{version}/tasks/task-[TASK_ID].md HERE]

### Required Definitions (from index)
You MUST read these definitions before implementing:
1. .claude/definitions/SYSTEM_DEFINITIONS.md - Architecture reference
2. [Any task-specific definitions based on task type]

### Required Actions
1. **FIRST: Complete MCP Tool Verification Gate** (above)
2. Follow ALL MANDATORY sections from agent instructions above
3. Initialize memory-keeper session (already done in verification)
4. Read the task definition completely
5. Read required definitions from the index
6. Implement ALL deliverables
7. Test against acceptance criteria (USE BROWSER TOOLS, NOT CODE REVIEW)
8. Save progress to memory-keeper
9. Write handoff to .claude/agent-dev-plans/{version}/handoffs/task-[TASK_ID].md

### Handoff Format
Your handoff file MUST include:
- Status: COMPLETE | PARTIAL | BLOCKED | **FAILED_TOOLS_UNAVAILABLE**
- Agent Used: [AGENT_NAME]
- Model Used: [MODEL]
- MCP Tools Verified: YES (list tools) / **NO (TASK ABORTED)**
- What Was Implemented
- Files Modified
- Acceptance Criteria Results (checklist with pass/fail)
- Memory Keys Saved: [list keys saved to memory-keeper]
- Issues Encountered
- Browser Test Required: [YES/NO based on task]
- **Browser Test Completed: YES/NO** (code review does NOT count)

### On Completion
Commit your changes with message:
"Task [TASK_ID]: [brief description]"

Do NOT push. Do NOT merge.

### Context Budget
Stop at 70% context and write your handoff summary.

Begin now.
`
})
```

### Spawn Confirmation

**For EACH spawned task, output this confirmation:**

```markdown
## Task Spawn Confirmation

| Field | Value |
|-------|-------|
| Task ID | [X.X.X] |
| Agent Name | [from assignments.md] |
| Model | [from agent frontmatter] |
| Agent Definition | `.claude/agents/[name].md` |
| Instructions Included | [X] lines |
| MANDATORY Sections | [list sections included] |
```

### After Each Task Implementation

1. Check `.claude/agent-dev-plans/{version}/handoffs/task-[ID].md` for status
2. If **BLOCKED**: Stop immediately, save to memory, report to user
3. If **COMPLETE** or **PARTIAL**: Proceed to Browser Verification

---

## Step 5: Browser Test Verification

**Skip this step ONLY if the task explicitly declares `browserTest: false`.**

After each task completes, spawn a verification agent.

### Agent Selection for Verification

1. Read `.claude/agents/index.md` for verification agents
2. For standard verification: `ui-feature-verification-test-sonnet`
3. For complex verification: `ui-feature-verification-test-opus`

### Verification Task Spawn

```javascript
Task({
  description: "Verify Task [TASK_ID]",
  subagent_type: "general-purpose",
  model: "sonnet",  // or "opus" for complex
  prompt: `
## Agent Instructions

[PASTE FULL CONTENTS OF .claude/agents/ui-feature-verification-test-sonnet.md HERE]

---

## Verification Context

You are verifying Task [TASK_ID] implementation for The Council project.

### Required Reading (from definitions index)
1. .claude/definitions/VIEWS.md - UI navigation reference
2. .claude/definitions/UI_BEHAVIOR.md - Expected behavior
3. .claude/agent-dev-plans/{version}/handoffs/task-[TASK_ID].md - What was implemented
4. .claude/agent-dev-plans/{version}/tasks/task-[TASK_ID].md - Acceptance criteria

### Your Mission
1. Initialize memory-keeper session
2. Navigate to SillyTavern: http://127.0.0.1:8000/
3. Open The Council extension
4. Navigate to the relevant UI
5. Test each acceptance criterion
6. Check console for errors
7. Document findings
8. Save results to memory-keeper

### Test Report
Create .claude/agent-dev-plans/{version}/handoffs/task-[TASK_ID]-verification.md with results.

Begin verification now.
`
})
```

### After Browser Verification

1. Read the verification report
2. If **PASS**: Continue to next task (or audit if group complete)
3. If **FAIL**:
   - Save failure to memory
   - Re-run the task implementation agent with the failure details
   - Loop until PASS or max 2 retry attempts

---

## Step 6: Group Completion Audit (Group Mode Only)

**Skip this step in Single Task Mode or Block Mode.**

After ALL tasks in the group are complete and verified, spawn the `code-audit-opus` agent.

### Audit Agent Resolution

```javascript
// Read agent from index
Read(".claude/agents/index.md")  // Find code-audit-opus
Read(".claude/agents/code-audit-opus.md")  // Get full instructions
```

### Audit Task Spawn

```javascript
Task({
  description: "Audit Group [GROUP_NUMBER]",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: `
## Agent Instructions

[PASTE FULL CONTENTS OF .claude/agents/code-audit-opus.md HERE]

---

## Audit Context

You are auditing Group [GROUP_NUMBER] for The Council project.

### Context
Group [GROUP_NUMBER] implementation is complete. All tasks report COMPLETE status.
You must verify the group is truly ready to merge.

### Required Reading (from definitions index)
1. .claude/definitions/SYSTEM_DEFINITIONS.md - Architecture reference
2. .claude/agent-dev-plans/{version}/task-list.md - Group [GROUP_NUMBER] tasks
3. All handoff files: .claude/agent-dev-plans/{version}/handoffs/task-[GROUP_NUMBER].*
4. All verification reports: .claude/agent-dev-plans/{version}/handoffs/task-[GROUP_NUMBER].*-verification.md

### Audit Actions
1. Initialize memory-keeper session
2. Review git diff: git diff [TARGET_BRANCH]..[BRANCH_NAME]
3. Review all handoffs
4. Verify code quality
5. Check for regressions
6. Save findings to memory-keeper

### Audit Report
Create .claude/agent-dev-plans/{version}/code-audits/group-[GROUP_NUMBER]-audit.md with results.

Begin audit now.
`
})
```

### After Audit

1. Read the audit report
2. If **APPROVED**: Proceed to Review Gate
3. If **REVISION REQUIRED**:
   - Save revision tasks to memory
   - Report to orchestrator
   - Re-run after revisions

---

## Step 7: Review Gate

**Save final status to memory:**

```javascript
mcp__memory-keeper__context_save({
  key: "run-$ARGUMENTS-complete",
  value: "Tasks: [list]\nResult: [APPROVED/NEEDS_REVISION]\nBranch: [BRANCH_NAME]",
  category: "progress",
  priority: "high"
})
```

---

## OBSERVABILITY CHECKPOINT #6: Final Report

**MANDATORY: Output final report to user:**

```markdown
## Task Run Complete: $ARGUMENTS

### Observability Summary

| Checkpoint | Status |
|------------|--------|
| #0 PROCESS_README.md | READ |
| #1 Session Init | CONFIRMED |
| #2 Dynamic Discovery | CONFIRMED |
| #3 Definitions Loaded | CONFIRMED |
| #4 Dev Plan Loaded | CONFIRMED |
| #5 Agents Resolved | CONFIRMED |
| #6 Final Report | THIS |

### Branch: [BRANCH_NAME]
### Target: [TARGET_BRANCH]

### Tasks Executed (ALL RUN FRESH)

| Task | Agent | Model | Agent Def | Status | Browser |
|------|-------|-------|-----------|--------|---------|
| X.X.X | [name] | [model] | `.claude/agents/[name].md` | [status] | [PASS/FAIL/N/A] |

**Note:** All tasks were run fresh. No tasks were skipped based on previous completion status.

### Definitions Used
- [list all definitions that were loaded]

### Memory Keys Saved
- [list all keys saved to memory-keeper]

### Files Changed
[key files modified]

### Audit Result: [APPROVED/REVISION REQUIRED/N/A]

### Ready for Review

Please review the changes:

```bash
git diff [TARGET_BRANCH]..[BRANCH_NAME]
```

**Merge to [TARGET_BRANCH]?**
- Reply "merge" to merge and continue
- Reply "changes needed" to describe what needs fixing
```

**Wait for user response before proceeding.**

If user says "merge":
```bash
git checkout [TARGET_BRANCH]
git merge [BRANCH_NAME] -m "Merge [BRANCH_NAME]: [GROUP/BLOCK/TASK] complete"
```

---

## Error Handling

- If a task is BLOCKED, stop and report immediately
- If browser tests fail after 2 retries, escalate to user
- If audit finds issues, report revision tasks needed
- If git operations fail, report the error
- Always leave the repo in a clean state
- **Always save errors to memory-keeper:**

```javascript
mcp__memory-keeper__context_save({
  key: "error-$ARGUMENTS",
  value: "[error description]",
  category: "error",
  priority: "high"
})
```

---

## Quick Reference

| Step | Group Mode | Block Mode | Single Task Mode |
|------|------------|------------|------------------|
| Observability #1-5 | REQUIRED | REQUIRED | REQUIRED |
| Branch Setup | YES | YES | YES |
| Run Tasks | All in group | All in block | Just one |
| Browser Verify | Each task | Each task | The task |
| Group Audit | YES (code-audit-opus) | NO | NO |
| Observability #6 | REQUIRED | REQUIRED | REQUIRED |

---

## Troubleshooting

### ⛔ MCP Tools Not Available (CRITICAL - HARD FAILURE)

**THIS IS NOT A WORKAROUND SCENARIO. THIS IS A TASK FAILURE.**

If spawned agent reports MCP tools unavailable:

1. **ABORT THE TASK IMMEDIATELY**
2. **DO NOT restructure to work around missing tools**
3. **DO NOT substitute code review for browser testing**
4. **DO NOT substitute static analysis for runtime verification**
5. Output: "⛔ TASK ABORTED: MCP TOOLS UNAVAILABLE"
6. User must restart Claude Code session
7. Re-run task only after tools are confirmed available

**The following is COMPLETELY UNACCEPTABLE:**
> "Due to browser automation tools being unavailable, verification was conducted through code review..."

**This is a FAILURE, not a creative solution.**

**Resolution:**
```bash
claude mcp list
# Verify all required servers show ✓ Connected
# Restart Claude Code if any are missing
# Re-run /tasks command
```

### Agent Not Found
If `assignments.md` references an agent not in `.claude/agents/index.md`:
1. Check for typos in agent name
2. Verify agent file exists in `.claude/agents/`
3. Add agent to index if missing
4. Report to user if unresolvable

### Definition Not Found
If a definition file from the index doesn't exist:
1. Check `.claude/definitions/index.md` for correct path
2. Create the definition if it should exist
3. Update index if path is wrong
4. Report to user if unresolvable
