# Phase Task Runner

Run all tasks for a phase, with branch management and review gates.

## Usage
`/tasks 1` - Run all Phase 1 tasks (Bug Fixes)
`/tasks 2` - Run all Phase 2 tasks (Curation)
`/tasks 3` - Run all Phase 3 tasks (Presets)

## Instructions

You are running **Phase $ARGUMENTS** tasks.

### Step 0: Read Development Plan

Read `docs/DEVELOPMENT_PLAN.md` to get:

2. **Phase Tasks** - Find all tasks for Phase $ARGUMENTS
3. **Model Assignments** - Check the Quick Reference table for each task's assigned model

### Step 1: Check for Completed Tasks

Before running any task, check if a handoff file already exists:
`.claude/handoffs/task-X.X.X.md`

If the handoff exists and shows `Status: COMPLETE`, **skip that task** and report:
```
Task X.X.X: Already complete (see .claude/handoffs/task-X.X.X.md)
```

Continue to the next task in the phase.

### Step 2: Branch Setup

```bash
# Branch naming convention
BRANCH_NAME="phase-$ARGUMENTS"

# Check if branch exists, create if not
git checkout -b $BRANCH_NAME 2>/dev/null || git checkout $BRANCH_NAME
```

### Step 3: Run Each Task

For each task in the phase, spawn an agent using the Task tool with the model specified in the Quick Reference table:

```
subagent_type: "general-purpose"
model: [MODEL FROM QUICK REFERENCE TABLE - opus/sonnet/haiku]
```

**Prompt for each agent:**

```
You are implementing Task [TASK_ID] for The Council project.

## Agent Info
Model: [MODEL_USED]
Task Complexity: [opus=architectural | sonnet=standard | haiku=simple]

## Branch
You are working on branch: [TARGET_BRANCH]

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
- Issues Encountered
- Next Task

## On Completion
Commit your changes with message:
"Task [TASK_ID]: [brief description of what was done]"

Do NOT push. Do NOT merge.

## Context Budget
Stop at 70% context and write your handoff summary.

Begin now.
```

### Step 4: After Each Task

1. Check `.claude/handoffs/task-[ID].md` for status
2. If **BLOCKED**: Stop immediately, report to user
3. If **COMPLETE** or **PARTIAL**: Continue to next task

### Step 5: Phase Complete - Review Gate

After ALL tasks in the phase are done:

**Report to user:**

```
## Phase $ARGUMENTS Complete

### Branch: [TARGET_BRANCH]

### Tasks Completed:
- Task X.X.X: [status] - [summary]
- Task X.X.X: [status] - [summary]
- ...

### Files Changed:
[list key files modified]

### Ready for Review

Please review the changes on branch `[TARGET_BRANCH]`:

\`\`\`bash
git diff main..[TARGET_BRANCH]
\`\`\`

**Merge to main?**
- Reply "merge" to merge and continue
- Reply "changes needed" to describe what needs fixing
```

**Wait for user response before proceeding.**

If user says "merge":
```bash
git checkout main
git merge [TARGET_BRANCH] -m "Merge [TARGET_BRANCH]: Phase $ARGUMENTS complete"
```

---

## Error Handling

- If a task is BLOCKED, stop and report immediately
- If git operations fail, report the error
- Always leave the repo in a clean state (no uncommitted changes)
