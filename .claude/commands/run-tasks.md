# Sequential Task Runner

Run multiple tasks in sequence, spawning a new Sonnet agent for each.

## Usage
`/run-tasks 0.1 0.2 0.3` or `/run-tasks 0.1-0.3`

## Instructions

You will orchestrate running tasks **$ARGUMENTS** sequentially.

For each task:

1. **Spawn a Sonnet agent** using the Task tool with `subagent_type: "general-purpose"` and `model: "sonnet"`
2. **Provide the task prompt** from below
3. **Wait for completion** and check the handoff file
4. **Review the result** - if BLOCKED, stop and report to user
5. **Continue to next task** if COMPLETE or PARTIAL

## Task Prompt Template

For each task ID, send this prompt to the spawned agent:

```
You are implementing Task [TASK_ID] from The Council project.

## Required Reading (in order)
1. CLAUDE.md - Project overview and conventions
2. docs/SYSTEM_DEFINITIONS.md - System definitions
3. docs/DEVELOPMENT_PLAN.md - Find Task [TASK_ID] for specific deliverables

## Your Mission
1. Read the task's "Context docs to load"
2. Implement all deliverables listed
3. Test against success criteria
4. At 70% context, write handoff to .claude/handoffs/task-[TASK_ID].md

## Constraints
- Kernel pattern: init(kernel), use kernel.getModule()
- Events via Kernel: kernel.emit('namespace:event', data)
- Follow CLAUDE.md conventions

Begin by reading docs/DEVELOPMENT_PLAN.md and finding Task [TASK_ID].
```

## After Each Task

1. Read `.claude/handoffs/task-[ID].md`
2. If status is BLOCKED: Stop and report to user
3. If status is COMPLETE/PARTIAL: Commit changes with message "Task [ID]: [brief description]"
4. Proceed to next task

## Final Report

After all tasks complete, summarize:
- Tasks completed
- Tasks partial (what remains)
- Any blockers encountered
- Recommended next steps
