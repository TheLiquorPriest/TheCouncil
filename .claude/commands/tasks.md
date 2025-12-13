# Task Runner

Run tasks for a phase or a single task, with branch management, browser verification, and audit gates.

## Usage

```
/tasks 1          # Run all Phase 1 tasks
/tasks 2          # Run all Phase 2 tasks
/tasks 1.1.1      # Run single task 1.1.1
/tasks 2.3.1      # Run single task 2.3.1
```

## Instructions

You are running **$ARGUMENTS**.

---

## Step 0: Read Development Plan

Read `docs/DEVELOPMENT_PLAN.md` to get:

1. **Version** - Extract the alpha version number (e.g., "3" from "Alpha 3" or "3-alpha")
2. **Target Branch** - The branch to merge into (e.g., `alpha-3.0.0`)
3. **Phase/Task Info** - Find the phase or specific task for $ARGUMENTS
4. **Model Assignments** - Check the Quick Reference table for each task's assigned model

**Store these values:**
- `ALPHA_VERSION` = version number (e.g., "3")
- `TARGET_BRANCH` = target branch from plan (e.g., "alpha-3.0.0")

---

## Step 1: Determine Run Mode

Parse `$ARGUMENTS`:

- If matches pattern `X` (single digit): **Phase Mode** - run all tasks in Phase X
- If matches pattern `X.Y.Z` (dotted): **Single Task Mode** - run only that task

```
PHASE_NUMBER = extracted phase (1, 2, 3, etc.)
TASK_ID = full task ID if single task mode (e.g., "1.1.1")
```

---

## Step 2: Check for Completed Tasks

Before running any task, check if a handoff file already exists:
`.claude/handoffs/task-X.X.X.md`

If the handoff exists and shows `Status: COMPLETE`, **skip that task** and report:
```
Task X.X.X: Already complete (see .claude/handoffs/task-X.X.X.md)
```

Continue to the next task (or exit if single task mode).

---

## Step 3: Branch Setup

Base phase branches off of TARGET_BRANCH.

```bash
# Branch naming convention: alpha{VERSION}-phase-{PHASE}
BRANCH_NAME="alpha${ALPHA_VERSION}-phase-${PHASE_NUMBER}"

# Check if branch exists
git branch --list $BRANCH_NAME

# If branch doesn't exist, create from TARGET_BRANCH
git checkout $TARGET_BRANCH
git checkout -b $BRANCH_NAME

# If branch exists, switch to it
git checkout $BRANCH_NAME
```

**Important:** Always derive branch name from the development plan's version, not hardcoded values.

---

## Step 4: Run Task(s)

For each task, spawn an agent using the Task tool with the model specified in the Quick Reference table:

```
subagent_type: "general-purpose"
model: [MODEL FROM QUICK REFERENCE TABLE - opus/sonnet/haiku]
```

**Prompt for each task agent:**

```
You are implementing Task [TASK_ID] for The Council project.

## Agent Info
Model: [MODEL_USED]
Task Complexity: [opus=architectural | sonnet=standard | haiku=simple]

## Branch
You are working on branch: [BRANCH_NAME]

## Required Reading
1. CLAUDE.md
2. docs/SYSTEM_DEFINITIONS.md
3. docs/DEVELOPMENT_PLAN.md - Find Task [TASK_ID]

## Your Mission
1. Read the task description in DEVELOPMENT_PLAN.md
2. Implement ALL deliverables
3. Test against acceptance criteria
4. Write handoff to .claude/handoffs/task-[TASK_ID].md

## Handoff Format
Your handoff file MUST include:
- Status: COMPLETE | PARTIAL | BLOCKED
- Model Used: [MODEL_USED]
- What Was Implemented
- Files Modified
- Acceptance Criteria Results (checklist with pass/fail)
- Issues Encountered
- Browser Test Required: [YES/NO based on task]

## On Completion
Commit your changes with message:
"Task [TASK_ID]: [brief description of what was done]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

Do NOT push. Do NOT merge.

## Context Budget
Stop at 70% context and write your handoff summary.

Begin now.
```

### After Each Task Implementation

1. Check `.claude/handoffs/task-[ID].md` for status
2. If **BLOCKED**: Stop immediately, report to user
3. If **COMPLETE** or **PARTIAL**: Proceed to Browser Verification

---

## Step 5: Browser Test Verification

**Skip this step ONLY if the task explicitly declares `browserTest: false` in the development plan.**

After each task completes, spawn an **Opus agent** to verify the implementation via browser testing:

```
subagent_type: "general-purpose"
model: opus
```

**Browser Verification Agent Prompt:**

```
You are verifying Task [TASK_ID] implementation for The Council project.

## Your Role
Browser Test Verification Agent (Opus)

## Context
Task [TASK_ID] has been implemented. You must verify it works correctly in the browser.

## Required Reading
1. docs/DEVELOPMENT_PLAN.md - Find Task [TASK_ID] acceptance criteria
2. docs/VIEWS.md - UI navigation reference
3. docs/UI_TESTING.md - MCP browser tools reference
4. .claude/handoffs/task-[TASK_ID].md - What was implemented

## Your Mission

1. **Navigate to SillyTavern**: Use mcp__playwright__browser_navigate to go to http://127.0.0.1:8000/
2. **Open The Council**: Click the Council button/icon to open the extension
3. **Navigate to the relevant UI**: Based on the task, navigate to the correct modal/tab
4. **Test each acceptance criterion**:
   - Perform the user action described
   - Verify the expected behavior occurs
   - Check console for errors: mcp__playwright__browser_console_messages
   - Take screenshots as evidence: mcp__playwright__browser_take_screenshot

## Test Report Format

Create/update `.claude/handoffs/task-[TASK_ID]-verification.md`:

```markdown
# Task [TASK_ID] Browser Verification

## Test Date: [timestamp]
## Tester: Opus Verification Agent

## Acceptance Criteria Tests

| Criterion | Test Action | Expected | Actual | Status |
|-----------|-------------|----------|--------|--------|
| [criterion 1] | [what you did] | [expected] | [actual] | ✅ PASS / ❌ FAIL |
| [criterion 2] | [what you did] | [expected] | [actual] | ✅ PASS / ❌ FAIL |

## Console Errors
[any errors observed, or "None"]

## Screenshots
[list of screenshot files taken]

## Overall Result: PASS / FAIL

## Issues Found
[list any issues that need fixing]
```

## On Failure

If ANY test fails:
1. Document exactly what failed and why
2. Set Overall Result to FAIL
3. The task will be sent back for revision

## On Success

If ALL tests pass:
1. Set Overall Result to PASS
2. Commit the verification report

Do NOT fix code yourself. Only test and report.
```

### After Browser Verification

1. Read the verification report
2. If **PASS**: Continue to next task (or audit if phase complete)
3. If **FAIL**:
   - Report failure to the orchestrating agent
   - Re-run the task implementation agent with the failure details
   - Loop until PASS or max 2 retry attempts

---

## Step 6: Phase Completion Audit (Phase Mode Only)

**Skip this step in Single Task Mode.**

After ALL tasks in the phase are complete and verified, spawn an **Opus Audit Agent**:

```
subagent_type: "general-purpose"
model: opus
```

**Phase Audit Agent Prompt:**

```
You are the Phase Completion Auditor for The Council project.

## Your Role
Single Opus Auditor - Final gate before phase merge

## Context
Phase [PHASE_NUMBER] implementation is complete. All tasks report COMPLETE status.
You must verify the phase is truly ready to merge.

## Required Reading
1. docs/DEVELOPMENT_PLAN.md - Phase [PHASE_NUMBER] section with ALL tasks and acceptance criteria
2. All handoff files: .claude/handoffs/task-[PHASE].*
3. All verification reports: .claude/handoffs/task-[PHASE].*-verification.md
4. Git diff of all changes: git diff [TARGET_BRANCH]..[BRANCH_NAME]

## Audit Checklist

### 1. Handoff Review
For each task in the phase:
- [ ] Handoff file exists
- [ ] Status is COMPLETE (not PARTIAL or BLOCKED)
- [ ] All acceptance criteria marked as passed
- [ ] Files modified list matches expected scope

### 2. Browser Verification Review
For each task with browser tests:
- [ ] Verification report exists
- [ ] Overall Result is PASS
- [ ] No unresolved console errors
- [ ] Screenshots confirm expected behavior

### 3. Code Review
- [ ] Changes are scoped to the task requirements (no scope creep)
- [ ] No obvious bugs or regressions introduced
- [ ] Code follows project conventions (check CLAUDE.md)
- [ ] No debug code or console.logs left in

### 4. Integration Check
- [ ] All modified files are committed
- [ ] No merge conflicts with target branch
- [ ] Changes don't break other systems (review imports/dependencies)

## Audit Report Format

Create `.claude/handoffs/phase-[PHASE]-audit.md`:

```markdown
# Phase [PHASE_NUMBER] Completion Audit

## Audit Date: [timestamp]
## Auditor: Opus Audit Agent

## Summary
- Tasks in Phase: [count]
- Tasks Complete: [count]
- Tasks with Browser Tests: [count]
- Browser Tests Passed: [count]

## Task-by-Task Review

### Task X.X.X: [name]
- Handoff: ✅ Complete
- Verification: ✅ Passed
- Code Review: ✅ Acceptable
- Notes: [any observations]

[repeat for each task]

## Integration Assessment
[assessment of how changes work together]

## Issues Found
[list any issues, or "None"]

## Revision Tasks Required
[if issues found, list specific tasks to add to development plan]

## Final Verdict: APPROVED / REVISION REQUIRED

## Recommendation
[MERGE / REVISE with specific guidance]
```

## On APPROVED

Report to orchestrator that phase is ready for merge.

## On REVISION REQUIRED

1. Document specific issues
2. Create revision task entries formatted for DEVELOPMENT_PLAN.md:

```markdown
### [PHASE].R1: [Revision Task Name]

**Priority:** P0
**File:** [primary file]
**Issue:** [what needs fixing]

**Implementation:**
[specific steps]

**Acceptance Criteria:**
- [ ] [criterion 1]
- [ ] [criterion 2]
```

3. Report to orchestrator that revisions are needed
4. Orchestrator will insert revision tasks and re-run
```

### After Audit

1. Read the audit report
2. If **APPROVED**: Proceed to Review Gate
3. If **REVISION REQUIRED**:
   - Insert revision tasks into the development plan (or report them)
   - Re-run the revision tasks
   - Re-run audit after revisions complete

---

## Step 7: Review Gate

**Report to user:**

```markdown
## Phase [PHASE_NUMBER] Complete

### Branch: [BRANCH_NAME]
### Target: [TARGET_BRANCH]

### Tasks Completed:
- Task X.X.X: [status] - [summary] - Browser: [PASS/FAIL/SKIPPED]
- Task X.X.X: [status] - [summary] - Browser: [PASS/FAIL/SKIPPED]
- ...

### Audit Result: [APPROVED/REVISION REQUIRED]

### Files Changed:
[list key files modified]

### Ready for Review

Please review the changes:

\`\`\`bash
git diff [TARGET_BRANCH]..[BRANCH_NAME]
\`\`\`

**Merge to [TARGET_BRANCH]?**
- Reply "merge" to merge and continue
- Reply "changes needed" to describe what needs fixing
```

**Wait for user response before proceeding.**

If user says "merge":
```bash
git checkout [TARGET_BRANCH]
git merge [BRANCH_NAME] -m "Merge [BRANCH_NAME]: Phase [PHASE_NUMBER] complete"
```

---

## Error Handling

- If a task is BLOCKED, stop and report immediately
- If browser tests fail after 2 retries, escalate to user
- If audit finds issues, report revision tasks needed
- If git operations fail, report the error
- Always leave the repo in a clean state (no uncommitted changes)

---

## Single Task Mode Summary

When running a single task (e.g., `/tasks 1.1.1`):

1. Read development plan
2. Setup branch (same naming convention)
3. Check if already complete
4. Run the single task agent
5. Run browser verification (unless browserTest: false)
6. Report result to user (no audit step)
7. User decides to merge or not

---

## Quick Reference

| Step | Phase Mode | Single Task Mode |
|------|------------|------------------|
| Branch Setup | ✅ | ✅ |
| Run Tasks | All in phase | Just one |
| Browser Verify | Each task | The task |
| Phase Audit | ✅ (Opus) | ❌ Skip |
| Review Gate | ✅ | ✅ (simplified) |
