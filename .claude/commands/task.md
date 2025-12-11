# Single Task Runner

You are implementing **Task $ARGUMENTS** from The Council development plan.

## Instructions

1. **Read the development plan**: `docs/DEVELOPMENT_PLAN.md`
2. **Find your task** by ID (e.g., "Task 0.1", "Task 1.2")
3. **Read the context docs** listed in your task
4. **Implement the deliverables** exactly as specified
5. **Test your work** against the success criteria
6. **Commit your changes** (do NOT push or merge)

## Context Budget

- **0-30%**: Read docs, understand scope
- **30-70%**: Implementation
- **70-80%**: Testing, refinement
- **80%+**: STOP coding, write handoff summary

## Handoff Summary Format

When you reach 70% context, create a file `.claude/handoffs/task-$ARGUMENTS.md` with:

```markdown
# Task $ARGUMENTS Handoff

## Status: [COMPLETE | PARTIAL | BLOCKED]

## What Was Implemented
- [list of completed items]

## Files Modified
- [file paths]

## What Remains (if partial)
- [remaining items]

## Issues Encountered
- [any blockers or concerns]

## Next Task
Task [X.X] - [Name] is ready to start.
```

## On Completion

Commit with message: `Task $ARGUMENTS: [brief description]`

Do NOT push. Do NOT merge. The phase runner handles that.

## Constraints

- Use Kernel pattern: `init(kernel)`, access modules via `kernel.getModule()`
- Emit events via Kernel: `kernel.emit('namespace:event', data)`
- Persist via Kernel storage (when implemented)
- Follow conventions in `CLAUDE.md`

## Begin

Read `docs/DEVELOPMENT_PLAN.md` now and find Task $ARGUMENTS.
