# Task Runner

Run tasks for a group/block or a single task, with branch management, browser verification, audit gates, and context persistence.

## Usage

```
/tasks 1          # Run all Group 1 tasks
/tasks 2.1        # Run all Block 2.1 tasks
/tasks 1.1.1      # Run single task 1.1.1
/tasks 2.3.1      # Run single task 2.3.1
```

## Instructions

You are running **$ARGUMENTS**.

---

## MANDATORY: Session Initialization

**ALWAYS start with memory-keeper:**

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

---

## MANDATORY: Tool Preferences

### Code Analysis

**Use ast-grep FIRST** for any code exploration:

```bash
# Find system structure
ast-grep run --pattern 'const $NAME = { VERSION: $V, $$$REST }' --lang javascript core/

# Find event emissions
ast-grep run --pattern 'this._kernel.emit($EVENT, $DATA)' --lang javascript .

# Find method definitions
ast-grep run --pattern '$METHOD($$$ARGS) { $$$BODY }' --lang javascript .
```

### Browser Testing

**For parallel verification, USE concurrent-browser:**
```javascript
mcp__concurrent-browser__browser_create_instance({ instanceId: "task-verify" })
mcp__concurrent-browser__browser_navigate({ instanceId: "task-verify", url: "http://127.0.0.1:8000/" })
mcp__concurrent-browser__browser_close_instance({ instanceId: "task-verify" })
```

**For sequential testing, playwright is acceptable:**
```javascript
mcp__playwright__browser_navigate({ url: "http://127.0.0.1:8000/" })
```

---

## Step 0: Read Development Plan

Read the current development plan from `.claude/agent-dev-plans/`:

1. Find the active plan directory (e.g., `alpha-3.0.0/`)
2. Read `index.md` for plan overview
3. Read `task-list.md` for all tasks
4. Find the specific task(s) for $ARGUMENTS
5. Read `assignments.md` for model assignments

**Store these values:**
- `PLAN_VERSION` = version (e.g., "alpha-3.0.0")
- `TARGET_BRANCH` = target branch (e.g., "alpha-3.0.0")
- `TASK_HIERARCHY` = group.block.task structure

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

## Step 2: Check for Completed Tasks

Before running any task, check:
1. `.claude/agent-dev-plans/{version}/tasks/task-X.X.X.md` for status
2. `.claude/handoffs/task-X.X.X.md` for handoff

If status is `COMPLETE`, **skip that task** and report:
```
Task X.X.X: Already complete (see handoff)
```

**Save skip to memory:**
```javascript
mcp__memory-keeper__context_save({
  key: "task-skip-X.X.X",
  value: "Task already complete, skipping",
  category: "progress",
  priority: "normal"
})
```

Continue to the next task (or exit if single task mode).

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

## Step 4: Run Task(s)

For each task, spawn an agent using the Task tool with the model specified in assignments.md.

**Task Agent Instructions (include in prompt):**

```
You are implementing Task [TASK_ID] for The Council project.

## MANDATORY: Session Initialization

ALWAYS start with memory-keeper:

mcp__memory-keeper__context_session_start({
  name: "TheCouncil-Task-[TASK_ID]",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})

Retrieve relevant context:
mcp__memory-keeper__context_search({ query: "[TASK_ID]" })
mcp__memory-keeper__context_get({ category: "decision" })

## MANDATORY: Tool Preferences

**Use ast-grep FIRST** for code exploration:
ast-grep run --pattern '$PATTERN' --lang javascript [path]

Use Grep only for simple text searches when ast-grep is insufficient.

## Agent Info
Model: [MODEL_USED]
Task Complexity: [opus=architectural | sonnet=standard | haiku=simple]

## Branch
You are working on branch: [BRANCH_NAME]

## Required Reading
1. CLAUDE.md
2. .claude/agent-dev-plans/{version}/tasks/task-[TASK_ID].md

## Your Mission
1. Read the task definition
2. Implement ALL deliverables
3. Test against acceptance criteria
4. Save progress to memory-keeper
5. Write handoff to .claude/handoffs/task-[TASK_ID].md

## Context Saving

Save progress as you work:
mcp__memory-keeper__context_save({
  key: "task-[TASK_ID]-progress",
  value: "Completed: [what]",
  category: "progress",
  priority: "normal"
})

Save decisions:
mcp__memory-keeper__context_save({
  key: "task-[TASK_ID]-decision-{topic}",
  value: "[decision and rationale]",
  category: "decision",
  priority: "high"
})

Save issues:
mcp__memory-keeper__context_save({
  key: "task-[TASK_ID]-issue",
  value: "[issue description]",
  category: "error",
  priority: "high"
})

## Handoff Format
Your handoff file MUST include:
- Status: COMPLETE | PARTIAL | BLOCKED
- Model Used: [MODEL_USED]
- What Was Implemented
- Files Modified
- Acceptance Criteria Results (checklist with pass/fail)
- Memory Keys Saved: [list keys saved to memory-keeper]
- Issues Encountered
- Browser Test Required: [YES/NO based on task]

## On Completion
Commit your changes with message:
"Task [TASK_ID]: [brief description]

Do NOT push. Do NOT merge.

## Context Budget
Stop at 70% context and write your handoff summary.

Begin now.
```

### After Each Task Implementation

1. Check `.claude/handoffs/task-[ID].md` for status
2. If **BLOCKED**: Stop immediately, save to memory, report to user
3. If **COMPLETE** or **PARTIAL**: Proceed to Browser Verification

---

## Step 5: Browser Test Verification

**Skip this step ONLY if the task explicitly declares `browserTest: false`.**

After each task completes, spawn a verification agent.

**Browser Verification Agent Instructions:**

```
You are verifying Task [TASK_ID] implementation for The Council project.

## MANDATORY: Session Initialization

mcp__memory-keeper__context_session_start({
  name: "TheCouncil-Verify-[TASK_ID]",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})

Retrieve task context:
mcp__memory-keeper__context_search({ query: "task-[TASK_ID]" })

## Your Role
Browser Test Verification Agent

## Browser Tools

For this sequential verification, use playwright:
mcp__playwright__browser_navigate({ url: "http://127.0.0.1:8000/" })
mcp__playwright__browser_snapshot()
mcp__playwright__browser_click({ element: "...", ref: "..." })
mcp__playwright__browser_console_messages()
mcp__playwright__browser_take_screenshot()

## Required Reading
1. .claude/agent-dev-plans/{version}/tasks/task-[TASK_ID].md - Acceptance criteria
2. docs/VIEWS.md - UI navigation reference
3. .claude/handoffs/task-[TASK_ID].md - What was implemented

## Your Mission

1. Navigate to SillyTavern: http://127.0.0.1:8000/
2. Open The Council extension
3. Navigate to the relevant UI
4. Test each acceptance criterion
5. Check console for errors
6. Document findings

## Save Results to Memory

mcp__memory-keeper__context_save({
  key: "verify-[TASK_ID]-result",
  value: "Result: [PASS/FAIL]\\nTests: [N] pass, [M] fail\\nIssues: [list]",
  category: "progress",
  priority: "normal"
})

## Test Report Format

Create `.claude/handoffs/task-[TASK_ID]-verification.md`:

# Task [TASK_ID] Browser Verification

## Test Date: [timestamp]
## Tester: Verification Agent

## Acceptance Criteria Tests

| Criterion | Test Action | Expected | Actual | Status |
|-----------|-------------|----------|--------|--------|
| [criterion] | [action] | [expected] | [actual] | ✅ PASS / ❌ FAIL |

## Console Errors
[any errors observed, or "None"]

## Memory Keys Saved
[list keys saved]

## Overall Result: PASS / FAIL

## Issues Found
[list issues]

## On Failure
Document exactly what failed. Set Overall Result to FAIL.

## On Success
Set Overall Result to PASS. Commit the verification report.

Do NOT fix code yourself. Only test and report.
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

After ALL tasks in the group are complete and verified, spawn an **Opus Audit Agent**.

**Group Audit Agent Instructions:**

```
You are the Group Completion Auditor for The Council project.

## MANDATORY: Session Initialization

mcp__memory-keeper__context_session_start({
  name: "TheCouncil-Audit-Group-[GROUP_NUMBER]",
  projectDir: "D:/LLM/ST/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/TheCouncil"
})

Retrieve all group context:
mcp__memory-keeper__context_search({ query: "group-[GROUP_NUMBER]" })
mcp__memory-keeper__context_search({ query: "task-[GROUP_NUMBER]" })
mcp__memory-keeper__context_get({ category: "error" })

## MANDATORY: Tool Preferences

**Use ast-grep FIRST** for code review:
ast-grep run --pattern 'console.log($$$)' --lang javascript .
ast-grep run --pattern 'try { $$$BODY } catch ($E) { $$$HANDLER }' --lang javascript .

## Your Role
Opus Auditor - Final gate before group merge

## Context
Group [GROUP_NUMBER] implementation is complete. All tasks report COMPLETE status.
You must verify the group is truly ready to merge.

## Required Reading
1. .claude/agent-dev-plans/{version}/task-list.md - Group [GROUP_NUMBER] tasks
2. All handoff files: .claude/handoffs/task-[GROUP_NUMBER].*
3. All verification reports: .claude/handoffs/task-[GROUP_NUMBER].*-verification.md
4. Git diff: git diff [TARGET_BRANCH]..[BRANCH_NAME]

## Audit Checklist

### 1. Handoff Review
For each task:
- [ ] Handoff file exists
- [ ] Status is COMPLETE
- [ ] All acceptance criteria passed
- [ ] Memory keys documented

### 2. Browser Verification Review
For each task with browser tests:
- [ ] Verification report exists
- [ ] Overall Result is PASS
- [ ] No unresolved console errors

### 3. Code Review (use ast-grep)
- [ ] Changes are scoped to task requirements
- [ ] No obvious bugs or regressions
- [ ] No debug code or console.logs
- [ ] Code follows project conventions

### 4. Integration Check
- [ ] All modified files committed
- [ ] No merge conflicts with target
- [ ] Changes don't break other systems

## Save Audit Results

mcp__memory-keeper__context_save({
  key: "audit-group-[GROUP_NUMBER]",
  value: "Result: [APPROVED/REVISION]\\nTasks: [N]\\nIssues: [list]",
  category: "progress",
  priority: "high"
})

## Audit Report Format

Create `.claude/handoffs/group-[GROUP_NUMBER]-audit.md`:

# Group [GROUP_NUMBER] Completion Audit

## Audit Date: [timestamp]
## Auditor: Opus Audit Agent

## Summary
- Tasks in Group: [count]
- Tasks Complete: [count]
- Browser Tests Passed: [count]

## Task-by-Task Review

### Task X.X.X: [name]
- Handoff: ✅ Complete
- Verification: ✅ Passed
- Code Review: ✅ Acceptable
- Notes: [observations]

## ast-grep Analysis
[Patterns found, issues identified]

## Integration Assessment
[How changes work together]

## Issues Found
[List or "None"]

## Memory Keys Referenced
[Keys retrieved from memory-keeper]

## Final Verdict: APPROVED / REVISION REQUIRED

## Recommendation
[MERGE / REVISE with guidance]
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
  value: "Tasks: [list]\\nResult: [APPROVED/NEEDS_REVISION]\\nBranch: [BRANCH_NAME]",
  category: "progress",
  priority: "high"
})
```

**Report to user:**

```markdown
## [GROUP/BLOCK/TASK] Complete

### Branch: [BRANCH_NAME]
### Target: [TARGET_BRANCH]

### Tasks Completed:
- Task X.X.X: [status] - [summary] - Browser: [PASS/FAIL/SKIPPED]

### Audit Result: [APPROVED/REVISION REQUIRED]

### Memory Context Saved:
- [list key memory keys]

### Files Changed:
[key files modified]

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
| Memory Init | ✅ | ✅ | ✅ |
| Branch Setup | ✅ | ✅ | ✅ |
| Run Tasks | All in group | All in block | Just one |
| Browser Verify | Each task | Each task | The task |
| Group Audit | ✅ (Opus) | ❌ Skip | ❌ Skip |
| Review Gate | ✅ | ✅ | ✅ |
| Save to Memory | ✅ | ✅ | ✅ |
