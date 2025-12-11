# Phase Task Runner

Run all tasks for a phase, with branch management and review gates.

## Usage
`/tasks 0` - Run all Phase 0 tasks (0.1, 0.2, 0.3)
`/tasks 1` - Run all Phase 1 tasks (1.1, 1.2)

## Phase Definitions

Based on docs/DEVELOPMENT_PLAN.md:

- **Phase 0**: Tasks 0.1, 0.2, 0.3 (Kernel Foundation)
- **Phase 1**: Tasks 1.1, 1.2 (Curation Refactor)
- **Phase 2**: Tasks 2.1 (Character Refactor)
- **Phase 3**: Tasks 3.1, 3.2 (Prompt Builder)
- **Phase 4**: Tasks 4.1, 4.2, 4.3 (Pipeline Builder)
- **Phase 5**: Tasks 5.1, 5.2, 5.3, 5.4 (Orchestration)
- **Phase 6**: Tasks 6.1, 6.2, 6.3 (Integration)
- **Phase 7**: Tasks 7.1 (Documentation)

## Model Tiers

Select model based on task complexity to optimize cost/capability:

| Model | Use When | Tasks |
|-------|----------|-------|
| **opus** | New system architecture, complex integration, multi-file refactors | 0.1, 3.1, 4.1, 5.1, 5.3, 6.1 |
| **sonnet** | Standard implementation, moderate complexity, existing patterns | 0.2, 1.1, 2.1, 4.2, 5.2, 5.4 |
| **haiku** | Simple refactors, UI updates, cleanup, documentation | 0.3, 1.2, 3.2, 4.3, 6.2, 6.3, 7.1 |

### Task → Model Mapping

```
OPUS (complex/architectural):
  0.1 - Kernel Core (new architecture)
  3.1 - PromptBuilder Core (new system)
  4.1 - Pipeline Builder Core (major consolidation)
  5.1 - Orchestration Core (new system)
  5.3 - Mode 3 Injection (ST API integration)
  6.1 - Integration Test (cross-system validation)

SONNET (standard implementation):
  0.2 - Kernel Storage & Presets
  1.1 - Curation Kernel Integration
  2.1 - Character Kernel Integration
  4.2 - Pipeline Threads/Context
  5.2 - Orchestration Modes 1&2
  5.4 - Gavel Integration

HAIKU (simple/mechanical):
  0.3 - Kernel UI Infrastructure
  1.2 - Curation Agents Isolation
  3.2 - PromptBuilder UI Integration
  4.3 - Pipeline Builder UI Updates
  6.2 - Cleanup & Deprecation Removal
  6.3 - Default Preset Validation
  7.1 - Update Documentation
```

## Instructions

You are running **Phase $ARGUMENTS** tasks.

### Step 0: Check for Completed Tasks

Before running any task, check if a handoff file already exists:
`.claude/handoffs/task-X.X.md`

If the handoff exists and shows `Status: COMPLETE`, **skip that task** and report:
```
Task X.X: Already complete (see .claude/handoffs/task-X.X.md)
```

Continue to the next task in the phase.

### Step 1: Branch Setup

```bash
# Branch naming convention
BRANCH_NAME="phase-$ARGUMENTS"

# Check if branch exists, create if not
git checkout -b $BRANCH_NAME 2>/dev/null || git checkout $BRANCH_NAME
```

Create or checkout the branch:
- Phase 0 → `phase-0`
- Phase 1 → `phase-1`
- etc.

### Step 2: Determine Tasks

Read `docs/DEVELOPMENT_PLAN.md` and identify all tasks for Phase $ARGUMENTS.

For example, if $ARGUMENTS is "0", the tasks are:
- Task 0.1: Create Kernel Core
- Task 0.2: Kernel Storage & Presets
- Task 0.3: Kernel UI Infrastructure

### Step 3: Run Each Task

For each task in the phase, spawn an agent using the Task tool with the appropriate model from the Model Tiers section above:

```
subagent_type: "general-purpose"
model: [LOOKUP FROM MODEL MAPPING - opus/sonnet/haiku]
```

**Prompt for each agent:**

```
You are implementing Task [TASK_ID] for The Council project.

## Agent Info
Model: [MODEL_USED]
Task Complexity: [opus=architectural | sonnet=standard | haiku=simple]

## Branch
You are working on branch: phase-[PHASE_NUM]

## Required Reading
1. CLAUDE.md
2. docs/SYSTEM_DEFINITIONS.md
3. docs/DEVELOPMENT_PLAN.md - Find Task [TASK_ID]

## Your Mission
1. Read the task's "Context docs to load"
2. Implement ALL deliverables
3. Test against success criteria
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

### Branch: phase-$ARGUMENTS

### Tasks Completed:
- Task X.1: [status] - [summary]
- Task X.2: [status] - [summary]
- ...

### Files Changed:
[list key files modified]

### Ready for Review

Please review the changes on branch `phase-$ARGUMENTS`:

\`\`\`bash
git diff main..phase-$ARGUMENTS
\`\`\`

**Merge to main?**
- Reply "merge" to merge and continue
- Reply "changes needed" to describe what needs fixing
```

**Wait for user response before proceeding.**

If user says "merge":
```bash
git checkout main
git merge phase-$ARGUMENTS -m "Merge phase-$ARGUMENTS: [Phase Name]"
```

---

## Error Handling

- If a task is BLOCKED, stop and report immediately
- If git operations fail, report the error
- Always leave the repo in a clean state (no uncommitted changes)
